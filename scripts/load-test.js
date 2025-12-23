/**
 * UniAuth Load Test Script
 * UniAuth 负载测试脚本
 * 
 * Run with k6:
 *   k6 run scripts/load-test.js
 * 
 * With more virtual users:
 *   k6 run --vus 50 --duration 30s scripts/load-test.js
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

// Configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

// Custom metrics
const healthCheckDuration = new Trend('health_check_duration');
const authCodeSendDuration = new Trend('auth_code_send_duration');
const errorRate = new Rate('error_rate');
const requestCount = new Counter('request_count');

// Test configuration
export const options = {
    // Ramp up pattern
    stages: [
        { duration: '10s', target: 10 },  // Warm up
        { duration: '30s', target: 50 },  // Ramp up
        { duration: '1m', target: 50 },   // Stay at peak
        { duration: '10s', target: 0 },   // Ramp down
    ],

    // Thresholds
    thresholds: {
        http_req_duration: ['p(95)<500', 'p(99)<1000'], // 95% < 500ms, 99% < 1s
        http_req_failed: ['rate<0.01'],                  // Error rate < 1%
        health_check_duration: ['p(95)<100'],            // Health check < 100ms
        error_rate: ['rate<0.05'],                       // Custom error rate < 5%
    },
};

// Test setup
export function setup() {
    // Verify the server is running
    const res = http.get(`${BASE_URL}/health`);
    if (res.status !== 200) {
        throw new Error(`Server not ready. Status: ${res.status}`);
    }

    console.log(`Testing against: ${BASE_URL}`);
    return { baseUrl: BASE_URL };
}

// Main test function
export default function (data) {
    const { baseUrl } = data;

    // ============================================
    // Health Check Tests
    // ============================================
    group('Health Checks', function () {
        // Simple health check
        let res = http.get(`${baseUrl}/health`);
        healthCheckDuration.add(res.timings.duration);
        requestCount.add(1);

        check(res, {
            'health check status is 200': (r) => r.status === 200,
            'health check has ok status': (r) => JSON.parse(r.body).status === 'ok',
        }) || errorRate.add(1);

        // Readiness check
        res = http.get(`${baseUrl}/health/ready`);
        requestCount.add(1);

        check(res, {
            'ready check status is 200 or 503': (r) => [200, 503].includes(r.status),
            'ready check has status field': (r) => JSON.parse(r.body).status !== undefined,
        }) || errorRate.add(1);

        // Version endpoint
        res = http.get(`${baseUrl}/version`);
        requestCount.add(1);

        check(res, {
            'version check status is 200': (r) => r.status === 200,
            'version has name field': (r) => JSON.parse(r.body).name === 'UniAuth API',
        }) || errorRate.add(1);
    });

    sleep(0.5);

    // ============================================
    // API Endpoint Tests
    // ============================================
    group('API Endpoints', function () {
        // 404 handling
        let res = http.get(`${baseUrl}/api/v1/nonexistent`);
        requestCount.add(1);

        check(res, {
            '404 returns correct status': (r) => r.status === 404,
            '404 has error structure': (r) => {
                const body = JSON.parse(r.body);
                return body.success === false && body.error !== undefined;
            },
        }) || errorRate.add(1);

        // User endpoint (without auth - should return 401)
        res = http.get(`${baseUrl}/api/v1/user/me`);
        requestCount.add(1);

        check(res, {
            'protected endpoint returns 401': (r) => r.status === 401,
        }) || errorRate.add(1);
    });

    sleep(0.5);

    // ============================================
    // Rate Limiting Tests
    // ============================================
    group('Rate Limiting', function () {
        // Send multiple requests to test rate limiting
        const responses = [];
        for (let i = 0; i < 5; i++) {
            const res = http.post(
                `${baseUrl}/api/v1/auth/send-code`,
                JSON.stringify({ phone: '+8613800138000' }),
                { headers: { 'Content-Type': 'application/json' } }
            );
            responses.push(res);
            requestCount.add(1);
        }

        // Check that rate limit headers are present
        const lastRes = responses[responses.length - 1];
        check(lastRes, {
            'has rate limit headers': (r) =>
                r.headers['X-Ratelimit-Limit'] !== undefined ||
                r.headers['x-ratelimit-limit'] !== undefined,
        });
    });

    sleep(1);

    // ============================================
    // OAuth2 Validation Tests
    // ============================================
    group('OAuth2 Endpoints', function () {
        // Validate client (with invalid params)
        const res = http.get(
            `${baseUrl}/api/v1/oauth2/validate?client_id=test&redirect_uri=http://invalid.com&response_type=code`
        );
        requestCount.add(1);

        check(res, {
            'oauth2 validate returns 400 for invalid client': (r) => r.status === 400,
        });

        // Userinfo without auth
        const userinfoRes = http.get(`${baseUrl}/api/v1/oauth2/userinfo`);
        requestCount.add(1);

        check(userinfoRes, {
            'userinfo returns 401 without auth': (r) => r.status === 401,
        }) || errorRate.add(1);
    });

    sleep(0.5);
}

// Teardown
export function teardown(data) {
    console.log('Load test completed.');
}

// Handle summary
export function handleSummary(data) {
    return {
        'stdout': textSummary(data, { indent: '  ', enableColors: true }),
        'summary.json': JSON.stringify(data, null, 2),
    };
}

function textSummary(data, opts) {
    const lines = [
        '',
        '╔════════════════════════════════════════════════════════════╗',
        '║                  Load Test Summary                         ║',
        '╚════════════════════════════════════════════════════════════╝',
        '',
    ];

    const metrics = data.metrics;

    if (metrics.http_req_duration) {
        const dur = metrics.http_req_duration.values;
        lines.push(`Request Duration:`);
        lines.push(`  avg:  ${dur.avg.toFixed(2)}ms`);
        lines.push(`  p95:  ${dur['p(95)'].toFixed(2)}ms`);
        lines.push(`  p99:  ${dur['p(99)'].toFixed(2)}ms`);
        lines.push('');
    }

    if (metrics.http_reqs) {
        lines.push(`Total Requests: ${metrics.http_reqs.values.count}`);
        lines.push(`Request Rate: ${metrics.http_reqs.values.rate.toFixed(2)}/s`);
        lines.push('');
    }

    if (metrics.http_req_failed) {
        const failRate = (metrics.http_req_failed.values.rate * 100).toFixed(2);
        lines.push(`Failed Requests: ${failRate}%`);
    }

    return lines.join('\n');
}
