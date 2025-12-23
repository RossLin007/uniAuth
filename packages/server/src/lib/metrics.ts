/**
 * Prometheus Metrics Module
 * Prometheus 指标模块
 * 
 * Provides application metrics for monitoring and alerting
 * 为监控和告警提供应用指标
 */

import { Context, Next, MiddlewareHandler } from 'hono';
import { env } from '../config/env.js';
import type { HonoVariables } from '../types/index.js';

// ============================================
// Metrics Storage (In-memory for simplicity)
// 指标存储（简化版内存存储）
// ============================================

interface MetricData {
    value: number;
    labels: Record<string, string>;
    timestamp: number;
}

interface HistogramData {
    count: number;
    sum: number;
    buckets: Map<number, number>;
}

// Counters
const counters: Map<string, Map<string, number>> = new Map();

// Histograms
const histograms: Map<string, Map<string, HistogramData>> = new Map();

// Gauges
const gauges: Map<string, Map<string, number>> = new Map();

// Default histogram buckets for request duration (in seconds)
const DEFAULT_BUCKETS = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10];

// ============================================
// Metric Helpers
// 指标辅助函数
// ============================================

function labelsToKey(labels: Record<string, string>): string {
    return Object.entries(labels)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => `${k}="${v}"`)
        .join(',');
}

function incrementCounter(name: string, labels: Record<string, string> = {}, value: number = 1): void {
    if (!counters.has(name)) {
        counters.set(name, new Map());
    }
    const key = labelsToKey(labels);
    const counter = counters.get(name)!;
    counter.set(key, (counter.get(key) || 0) + value);
}

function observeHistogram(name: string, labels: Record<string, string>, value: number): void {
    if (!histograms.has(name)) {
        histograms.set(name, new Map());
    }
    const key = labelsToKey(labels);
    const histogram = histograms.get(name)!;

    if (!histogram.has(key)) {
        const buckets = new Map<number, number>();
        DEFAULT_BUCKETS.forEach(b => buckets.set(b, 0));
        histogram.set(key, { count: 0, sum: 0, buckets });
    }

    const data = histogram.get(key)!;
    data.count++;
    data.sum += value;

    for (const bucket of DEFAULT_BUCKETS) {
        if (value <= bucket) {
            data.buckets.set(bucket, (data.buckets.get(bucket) || 0) + 1);
        }
    }
}

function setGauge(name: string, labels: Record<string, string>, value: number): void {
    if (!gauges.has(name)) {
        gauges.set(name, new Map());
    }
    const key = labelsToKey(labels);
    gauges.get(name)!.set(key, value);
}

// ============================================
// Predefined Metrics
// 预定义指标
// ============================================

export const Metrics = {
    // HTTP Request metrics
    httpRequestsTotal: (method: string, path: string, status: number) => {
        incrementCounter('http_requests_total', { method, path, status: String(status) });
    },

    httpRequestDuration: (method: string, path: string, status: number, duration: number) => {
        observeHistogram('http_request_duration_seconds',
            { method, path, status: String(status) },
            duration / 1000 // Convert ms to seconds
        );
    },

    // Authentication metrics
    authLoginAttempts: (method: 'phone' | 'email' | 'oauth', success: boolean) => {
        incrementCounter('auth_login_attempts_total', { method, success: String(success) });
    },

    authCodeSent: (type: 'phone' | 'email') => {
        incrementCounter('auth_verification_codes_sent_total', { type });
    },

    authCodeVerified: (type: 'phone' | 'email', success: boolean) => {
        incrementCounter('auth_verification_attempts_total', { type, success: String(success) });
    },

    // OAuth2 metrics
    oauth2AuthorizationsTotal: (clientId: string, success: boolean) => {
        incrementCounter('oauth2_authorizations_total', { client_id: clientId, success: String(success) });
    },

    oauth2TokenExchanges: (clientId: string, success: boolean) => {
        incrementCounter('oauth2_token_exchanges_total', { client_id: clientId, success: String(success) });
    },

    // Rate limiting metrics
    rateLimitHits: (endpoint: string) => {
        incrementCounter('rate_limit_hits_total', { endpoint });
    },

    // Active sessions gauge
    activeSessions: (count: number) => {
        setGauge('active_sessions', {}, count);
    },

    // Database metrics
    dbQueryDuration: (operation: string, table: string, duration: number) => {
        observeHistogram('db_query_duration_seconds',
            { operation, table },
            duration / 1000
        );
    },

    dbErrors: (operation: string, table: string) => {
        incrementCounter('db_errors_total', { operation, table });
    },

    // Cache metrics
    cacheHits: (cache: string) => {
        incrementCounter('cache_hits_total', { cache });
    },

    cacheMisses: (cache: string) => {
        incrementCounter('cache_misses_total', { cache });
    },
};

// ============================================
// Metrics Middleware
// 指标中间件
// ============================================

export function metricsMiddleware(): MiddlewareHandler<{ Variables: HonoVariables }> {
    return async (c: Context<{ Variables: HonoVariables }>, next: Next) => {
        const startTime = Date.now();

        await next();

        const duration = Date.now() - startTime;
        const method = c.req.method;
        const path = c.req.path;
        const status = c.res.status;

        Metrics.httpRequestsTotal(method, path, status);
        Metrics.httpRequestDuration(method, path, status, duration);
    };
}

// ============================================
// Metrics Endpoint
// 指标端点
// ============================================

export function getMetricsOutput(): string {
    const lines: string[] = [];

    // Add HELP and TYPE comments for each metric
    const metricInfo: Record<string, { help: string; type: string }> = {
        http_requests_total: { help: 'Total number of HTTP requests', type: 'counter' },
        http_request_duration_seconds: { help: 'HTTP request duration in seconds', type: 'histogram' },
        auth_login_attempts_total: { help: 'Total authentication login attempts', type: 'counter' },
        auth_verification_codes_sent_total: { help: 'Total verification codes sent', type: 'counter' },
        auth_verification_attempts_total: { help: 'Total verification code attempts', type: 'counter' },
        oauth2_authorizations_total: { help: 'Total OAuth2 authorization requests', type: 'counter' },
        oauth2_token_exchanges_total: { help: 'Total OAuth2 token exchanges', type: 'counter' },
        rate_limit_hits_total: { help: 'Total rate limit hits', type: 'counter' },
        active_sessions: { help: 'Current number of active sessions', type: 'gauge' },
        db_query_duration_seconds: { help: 'Database query duration in seconds', type: 'histogram' },
        db_errors_total: { help: 'Total database errors', type: 'counter' },
        cache_hits_total: { help: 'Total cache hits', type: 'counter' },
        cache_misses_total: { help: 'Total cache misses', type: 'counter' },
    };

    // Output counters
    for (const [name, values] of counters) {
        const info = metricInfo[name];
        if (info) {
            lines.push(`# HELP ${name} ${info.help}`);
            lines.push(`# TYPE ${name} ${info.type}`);
        }
        for (const [labels, value] of values) {
            const labelStr = labels ? `{${labels}}` : '';
            lines.push(`${name}${labelStr} ${value}`);
        }
    }

    // Output gauges
    for (const [name, values] of gauges) {
        const info = metricInfo[name];
        if (info) {
            lines.push(`# HELP ${name} ${info.help}`);
            lines.push(`# TYPE ${name} ${info.type}`);
        }
        for (const [labels, value] of values) {
            const labelStr = labels ? `{${labels}}` : '';
            lines.push(`${name}${labelStr} ${value}`);
        }
    }

    // Output histograms
    for (const [name, values] of histograms) {
        const info = metricInfo[name];
        if (info) {
            lines.push(`# HELP ${name} ${info.help}`);
            lines.push(`# TYPE ${name} ${info.type}`);
        }
        for (const [labels, data] of values) {
            const baseLabels = labels ? `${labels},` : '';

            // Output buckets
            let cumulativeCount = 0;
            for (const bucket of DEFAULT_BUCKETS) {
                cumulativeCount += data.buckets.get(bucket) || 0;
                lines.push(`${name}_bucket{${baseLabels}le="${bucket}"} ${cumulativeCount}`);
            }
            lines.push(`${name}_bucket{${baseLabels}le="+Inf"} ${data.count}`);

            // Output sum and count
            const labelStr = labels ? `{${labels}}` : '';
            lines.push(`${name}_sum${labelStr} ${data.sum}`);
            lines.push(`${name}_count${labelStr} ${data.count}`);
        }
    }

    return lines.join('\n');
}

// ============================================
// Metrics Route Handler
// 指标路由处理器
// ============================================

export async function metricsHandler(c: Context): Promise<Response> {
    // Optional: Protect metrics endpoint with token
    const metricsToken = env.METRICS_TOKEN;
    if (metricsToken) {
        const authHeader = c.req.header('Authorization');
        const token = authHeader?.replace('Bearer ', '');

        if (token !== metricsToken) {
            return c.text('Unauthorized', 401);
        }
    }

    const output = getMetricsOutput();

    return new Response(output, {
        headers: {
            'Content-Type': 'text/plain; version=0.0.4; charset=utf-8',
        },
    });
}
