/**
 * Request Logger Middleware
 * 请求日志中间件
 * 
 * Logs all incoming requests and responses with timing information
 * 记录所有请求和响应，包含耗时信息
 */

import { Context, Next, MiddlewareHandler } from 'hono';
import { nanoid } from 'nanoid';
import { logger } from '../lib/logger.js';
import type { HonoVariables } from '../types/index.js';

/**
 * Request logger middleware
 * 请求日志中间件
 */
export function requestLogger(): MiddlewareHandler<{ Variables: HonoVariables }> {
    return async (c: Context<{ Variables: HonoVariables }>, next: Next) => {
        // Generate or use existing request ID
        const requestId = c.req.header('X-Request-Id') || nanoid(12);
        const startTime = Date.now();

        // Set request ID in context and response header
        c.set('requestId', requestId);
        c.header('X-Request-Id', requestId);

        // Get client info
        const ip =
            c.req.header('X-Forwarded-For')?.split(',')[0].trim() ||
            c.req.header('X-Real-IP') ||
            c.req.header('CF-Connecting-IP') ||
            'unknown';

        const userAgent = c.req.header('User-Agent') || 'unknown';
        const method = c.req.method;
        const path = c.req.path;

        // Log incoming request
        logger.info('Incoming request', {
            requestId,
            method,
            path,
            ip,
            userAgent: userAgent.substring(0, 100), // Truncate long user agents
        });

        try {
            await next();
        } catch (error) {
            // Log error
            const duration = Date.now() - startTime;
            logger.error('Request error', {
                requestId,
                method,
                path,
                duration,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            throw error;
        }

        // Log response
        const duration = Date.now() - startTime;
        const status = c.res.status;

        const logData = {
            requestId,
            method,
            path,
            status,
            duration,
        };

        if (status >= 500) {
            logger.error('Request completed with error', logData);
        } else if (status >= 400) {
            logger.warn('Request completed with client error', logData);
        } else {
            logger.info('Request completed', logData);
        }
    };
}
