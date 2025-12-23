import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Metrics, getMetricsOutput, metricsMiddleware } from '../../src/lib/metrics.js';

describe('Metrics', () => {
    describe('Counter Metrics', () => {
        it('should increment HTTP request counter', () => {
            Metrics.httpRequestsTotal('GET', '/test', 200);

            const output = getMetricsOutput();
            expect(output).toContain('http_requests_total');
            expect(output).toContain('method="GET"');
            expect(output).toContain('status="200"');
        });

        it('should increment auth login attempts', () => {
            Metrics.authLoginAttempts('email', true);
            Metrics.authLoginAttempts('email', false);
            Metrics.authLoginAttempts('phone', true);

            const output = getMetricsOutput();
            expect(output).toContain('auth_login_attempts_total');
        });

        it('should track verification codes sent', () => {
            Metrics.authCodeSent('phone');
            Metrics.authCodeSent('email');

            const output = getMetricsOutput();
            expect(output).toContain('auth_verification_codes_sent_total');
        });

        it('should track OAuth2 authorizations', () => {
            Metrics.oauth2AuthorizationsTotal('test-client', true);

            const output = getMetricsOutput();
            expect(output).toContain('oauth2_authorizations_total');
        });

        it('should track rate limit hits', () => {
            Metrics.rateLimitHits('/api/v1/auth/send-code');

            const output = getMetricsOutput();
            expect(output).toContain('rate_limit_hits_total');
        });

        it('should track cache hits and misses', () => {
            Metrics.cacheHits('token');
            Metrics.cacheMisses('token');

            const output = getMetricsOutput();
            expect(output).toContain('cache_hits_total');
            expect(output).toContain('cache_misses_total');
        });
    });

    describe('Histogram Metrics', () => {
        it('should observe HTTP request duration', () => {
            Metrics.httpRequestDuration('GET', '/test', 200, 150);

            const output = getMetricsOutput();
            expect(output).toContain('http_request_duration_seconds');
            expect(output).toContain('_bucket');
            expect(output).toContain('_sum');
            expect(output).toContain('_count');
        });

        it('should observe database query duration', () => {
            Metrics.dbQueryDuration('select', 'users', 50);

            const output = getMetricsOutput();
            expect(output).toContain('db_query_duration_seconds');
        });
    });

    describe('Gauge Metrics', () => {
        it('should set active sessions gauge', () => {
            Metrics.activeSessions(100);

            const output = getMetricsOutput();
            expect(output).toContain('active_sessions');
        });
    });

    describe('Metrics Output Format', () => {
        it('should include HELP comments', () => {
            Metrics.httpRequestsTotal('GET', '/health', 200);

            const output = getMetricsOutput();
            expect(output).toContain('# HELP');
            expect(output).toContain('# TYPE');
        });

        it('should format labels correctly', () => {
            Metrics.httpRequestsTotal('POST', '/api/test', 201);

            const output = getMetricsOutput();
            expect(output).toMatch(/http_requests_total\{.*\}/);
        });
    });

    describe('Metrics Middleware', () => {
        it('should create middleware function', () => {
            const middleware = metricsMiddleware();
            expect(typeof middleware).toBe('function');
        });
    });
});
