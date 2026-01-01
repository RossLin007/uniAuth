import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { prettyJSON } from 'hono/pretty-json';
import { secureHeaders } from 'hono/secure-headers';

import { authRouter } from './routes/auth.routes.js';
import { userRouter } from './routes/user.routes.js';
import { oauth2Router } from './routes/oauth2.routes.js';
import { mfaRouter } from './routes/mfa.routes.js';
import trustedAuthRouter from './routes/trusted-auth.routes.js';
import { developerRouter } from './routes/developer.routes.js';
import { healthRouter } from './routes/health.routes.js';
import { docsRouter } from './routes/docs.routes.js';
import { oidcRouter } from './routes/oidc.routes.js';
import { accountLinkingRouter } from './routes/account-linking.routes.js';
import { passkeyRouter } from './routes/passkey.routes.js';
import { brandingRouter } from './routes/branding.routes.js';
import { env } from './config/index.js';
import { requestLogger } from './middlewares/request-logger.middleware.js';
import { generalRateLimiter } from './middlewares/rate-limit.middleware.js';
import { metricsMiddleware, metricsHandler } from './lib/metrics.js';
import { logger } from './lib/logger.js';
import { isRedisAvailable } from './lib/redis.js';
import type { HonoVariables } from './types/index.js';

// Sentry for error tracking
import * as Sentry from '@sentry/node';

// Initialize Sentry if configured
if (env.SENTRY_DSN) {
    Sentry.init({
        dsn: env.SENTRY_DSN,
        environment: env.NODE_ENV,
        tracesSampleRate: env.NODE_ENV === 'production' ? 0.1 : 1.0,
    });
    logger.info('Sentry error tracking initialized');
}

// Create Hono app
const app = new Hono<{ Variables: HonoVariables }>();

// ============================================
// Global Middlewares
// ============================================

// Request logging (structured JSON logs)
app.use('*', requestLogger());

// Metrics collection
app.use('*', metricsMiddleware());

// Pretty JSON output for development
app.use('*', prettyJSON());

// Security headers (HSTS, CSP, etc.)
app.use(
    '*',
    secureHeaders({
        strictTransportSecurity: env.NODE_ENV === 'production'
            ? 'max-age=31536000; includeSubDomains'
            : undefined,
        xContentTypeOptions: 'nosniff',
        xFrameOptions: env.NODE_ENV === 'production' ? 'DENY' : undefined,
        xXssProtection: '1; mode=block',
        contentSecurityPolicy: env.NODE_ENV === 'production' ? {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"], // Needed for Swagger UI
            styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
            imgSrc: ["'self'", 'data:', 'https:'],
        } : undefined,
    })
);

// CORS configuration
app.use(
    '*',
    cors({
        origin: (origin, c) => {
            // Allow all localhost ports
            if (/^https?:\/\/localhost(:\d+)?$/.test(origin)) {
                return origin;
            }

            const allowedDomains = env.CORS_ORIGINS.split(',').map((o) => o.trim());
            // Allow specified domains and their subdomains
            for (const domain of allowedDomains) {
                if (origin === `https://${domain}` || origin.endsWith(`.${domain}`)) {
                    return origin;
                }
            }

            return undefined;
        },
        allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowHeaders: ['Content-Type', 'Authorization', 'X-App-Key', 'X-Client-Id', 'X-Client-Secret', 'X-UniAuth-Event', 'X-UniAuth-Delivery', 'X-UniAuth-Signature'],
        exposeHeaders: ['Content-Length', 'X-Request-Id', 'X-RateLimit-Limit', 'X-RateLimit-Remaining', 'Retry-After'],
        credentials: true,
        maxAge: 86400,
    })
);

// Rate limiting (only if Redis is configured or in production)
if (env.RATE_LIMIT_ENABLED && (isRedisAvailable() || env.NODE_ENV === 'production')) {
    app.use('/api/*', generalRateLimiter);
    logger.info('Rate limiting enabled');
}

// ============================================
// Health Check & Metrics Routes (no rate limiting)
// ============================================
app.route('/', healthRouter);
app.get('/metrics', metricsHandler);

// ============================================
// Documentation Routes
// ============================================
app.route('/', docsRouter);

// ============================================
// API Routes
// ============================================
app.route('/api/v1/auth', authRouter);
app.route('/api/v1/auth/trusted', trustedAuthRouter);
app.route('/api/v1/developer', developerRouter);
app.route('/api/v1/user', userRouter);
app.route('/api/v1/oauth2', oauth2Router);
app.route('/api/v1/oauth2', oidcRouter); // UserInfo endpoint
app.route('/api/v1/mfa', mfaRouter);
app.route('/api/v1/account', accountLinkingRouter); // Account linking
app.route('/api/v1/auth/passkey', passkeyRouter); // Passkey / WebAuthn
app.route('/api/v1/branding', brandingRouter); // Public branding

// ============================================
// OIDC Routes (at root for /.well-known)
// ============================================
app.route('/', oidcRouter); // Discovery document


// ============================================
// 404 Handler
// ============================================
app.notFound((c) => {
    return c.json(
        {
            success: false,
            error: {
                code: 'NOT_FOUND',
                message: 'The requested resource was not found / 请求的资源不存在',
            },
            requestId: c.get('requestId'),
        },
        404
    );
});

// Start Webhook Worker
import { webhookService } from './services/webhook.service.js';
webhookService.startWorker();

// ============================================
// Error Handling
// ============================================
app.onError((err, c) => {
    const requestId = c.get('requestId');

    logger.error('Unhandled error', {
        requestId,
        error: err.message,
        stack: env.NODE_ENV === 'development' ? err.stack : undefined,
        path: c.req.path,
    });

    // Send to Sentry in production
    if (env.SENTRY_DSN) {
        Sentry.captureException(err, {
            extra: { requestId, path: c.req.path },
        });
    }

    return c.json(
        {
            success: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: 'An unexpected error occurred / 发生了意外错误',
            },
            requestId,
        },
        500
    );
});

// ============================================
// Server Startup
// ============================================
const port = env.PORT;

// Graceful shutdown handling
let isShuttingDown = false;

async function gracefulShutdown(signal: string) {
    if (isShuttingDown) return;
    isShuttingDown = true;

    logger.info('Received shutdown signal, starting graceful shutdown', { signal });

    // Give time for ongoing requests to complete
    const timeout = setTimeout(() => {
        logger.warn('Graceful shutdown timeout, forcing exit');
        process.exit(1);
    }, 30000);

    try {
        // Close server and cleanup
        // The serve() function doesn't return a closeable server in @hono/node-server
        // For production, consider using a more feature-rich server setup

        clearTimeout(timeout);
        logger.info('Graceful shutdown completed');
        process.exit(0);
    } catch (error) {
        logger.error('Error during graceful shutdown', { error });
        process.exit(1);
    }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Startup banner and server start (only in non-test environment)
if (env.NODE_ENV !== 'test') {
    const redisStatus = isRedisAvailable() ? '✓ Connected' : '✗ Not configured';
    const rateLimitStatus = env.RATE_LIMIT_ENABLED ? '✓ Enabled' : '✗ Disabled';
    const sentryStatus = env.SENTRY_DSN ? '✓ Enabled' : '✗ Not configured';

    console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   🔐 UniAuth API Server                                    ║
║                                                            ║
║   Version:     1.0.0                                       ║
║   Environment: ${env.NODE_ENV.padEnd(40)}    ║
║   Port:        ${port.toString().padEnd(40)}    ║
║                                                            ║
║   Services:                                                ║
║   • Redis:      ${redisStatus.padEnd(38)}    ║
║   • RateLimit:  ${rateLimitStatus.padEnd(38)}    ║
║   • Sentry:     ${sentryStatus.padEnd(38)}    ║
║                                                            ║
║   Endpoints:                                               ║
║   • Health:    http://localhost:${port}/health               ║
║   • Auth:      http://localhost:${port}/api/v1/auth          ║
║   • User:      http://localhost:${port}/api/v1/user          ║
║   • OAuth2:    http://localhost:${port}/api/v1/oauth2        ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
`);

    serve({
        fetch: app.fetch,
        port,
    });
}

export default app;

