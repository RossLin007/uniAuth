import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import app from '../../src/index.js';

describe('Health Check API', () => {
    describe('GET /health', () => {
        it('should return ok status', async () => {
            const res = await app.request('/health', {
                method: 'GET',
            });

            expect(res.status).toBe(200);

            const body = await res.json();
            expect(body.status).toBe('ok');
            expect(body.timestamp).toBeDefined();
        });
    });

    describe('GET /health/live', () => {
        it('should return alive status', async () => {
            const res = await app.request('/health/live', {
                method: 'GET',
            });

            expect(res.status).toBe(200);

            const body = await res.json();
            expect(body.status).toBe('alive');
        });
    });

    describe('GET /health/ready', () => {
        it('should return readiness status with checks', async () => {
            const res = await app.request('/health/ready', {
                method: 'GET',
            });

            // May be 200 or 503 depending on database connectivity
            expect([200, 503]).toContain(res.status);

            const body = await res.json();
            expect(['healthy', 'degraded']).toContain(body.status);
            expect(body.checks).toBeDefined();
            expect(body.checks.database).toBeDefined();
            expect(body.version).toBeDefined();
            expect(body.uptime).toBeGreaterThanOrEqual(0);
        });
    });

    describe('GET /version', () => {
        it('should return version info', async () => {
            const res = await app.request('/version', {
                method: 'GET',
            });

            expect(res.status).toBe(200);

            const body = await res.json();
            expect(body.name).toBe('UniAuth API');
            expect(body.version).toBeDefined();
            expect(body.environment).toBeDefined();
            expect(body.nodeVersion).toBeDefined();
        });
    });
});

describe('API Error Handling', () => {
    describe('404 Not Found', () => {
        it('should return 404 for unknown routes', async () => {
            const res = await app.request('/api/v1/unknown-endpoint', {
                method: 'GET',
            });

            expect(res.status).toBe(404);

            const body = await res.json();
            expect(body.success).toBe(false);
            expect(body.error.code).toBe('NOT_FOUND');
        });
    });
});

describe('Security Headers', () => {
    it('should include X-Request-Id header', async () => {
        const res = await app.request('/health', {
            method: 'GET',
        });

        expect(res.headers.get('X-Request-Id')).toBeDefined();
    });

    it('should include security headers', async () => {
        const res = await app.request('/health', {
            method: 'GET',
        });

        expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff');
        expect(res.headers.get('X-Frame-Options')).toBe('DENY');
    });
});

describe('CORS', () => {
    it('should handle OPTIONS preflight requests', async () => {
        const res = await app.request('/api/v1/auth/send-code', {
            method: 'OPTIONS',
            headers: {
                'Origin': 'http://localhost:5173',
                'Access-Control-Request-Method': 'POST',
            },
        });

        expect([200, 204]).toContain(res.status);
    });
});
