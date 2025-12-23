/**
 * Health Check Routes
 * 健康检查路由
 * 
 * Provides endpoints for load balancers and monitoring systems
 * 为负载均衡器和监控系统提供健康检查端点
 */

import { Hono } from 'hono';
import { getSupabase } from '../lib/supabase.js';
import { getRedis, isRedisAvailable } from '../lib/redis.js';
import { logger } from '../lib/logger.js';

const healthRouter = new Hono();

/**
 * Simple health check (for load balancers)
 * 简单健康检查（用于负载均衡器）
 * 
 * This endpoint should return quickly and only check if the app is running
 */
healthRouter.get('/health', (c) => {
    return c.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
    });
});

/**
 * Liveness probe (for Kubernetes)
 * 存活检测（用于 Kubernetes）
 */
healthRouter.get('/health/live', (c) => {
    return c.json({
        status: 'alive',
        timestamp: new Date().toISOString(),
    });
});

/**
 * Readiness probe (deep health check)
 * 就绪检测（深度健康检查）
 * 
 * Checks all dependencies and reports their status
 */
healthRouter.get('/health/ready', async (c) => {
    const checks: Record<string, { status: string; latency?: number; message?: string }> = {};
    let allHealthy = true;

    // Database check
    const dbStart = Date.now();
    try {
        const supabase = getSupabase();
        const { error } = await supabase.from('users').select('id').limit(1);

        if (error) {
            checks.database = { status: 'unhealthy', message: error.message };
            allHealthy = false;
        } else {
            checks.database = { status: 'healthy', latency: Date.now() - dbStart };
        }
    } catch (error) {
        checks.database = {
            status: 'unhealthy',
            message: error instanceof Error ? error.message : 'Connection failed',
        };
        allHealthy = false;
    }

    // Redis check (optional)
    if (isRedisAvailable()) {
        const redisStart = Date.now();
        try {
            const redis = getRedis();
            if (redis) {
                await redis.ping();
                checks.redis = { status: 'healthy', latency: Date.now() - redisStart };
            }
        } catch (error) {
            checks.redis = {
                status: 'unhealthy',
                message: error instanceof Error ? error.message : 'Connection failed',
            };
            // Redis failure doesn't make the service unhealthy (it's optional)
            logger.warn('Redis health check failed', { error });
        }
    } else {
        checks.redis = { status: 'not_configured' };
    }

    // Memory check
    const memUsage = process.memoryUsage();
    const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
    const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);
    const heapUsagePercent = Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100);

    checks.memory = {
        status: heapUsagePercent > 90 ? 'warning' : 'healthy',
        message: `${heapUsedMB}MB / ${heapTotalMB}MB (${heapUsagePercent}%)`,
    };

    const status = allHealthy ? 'healthy' : 'degraded';
    const httpStatus = allHealthy ? 200 : 503;

    return c.json(
        {
            status,
            checks,
            version: process.env.npm_package_version || '1.0.0',
            uptime: Math.round(process.uptime()),
            timestamp: new Date().toISOString(),
        },
        httpStatus
    );
});

/**
 * Version info endpoint
 * 版本信息端点
 */
healthRouter.get('/version', (c) => {
    return c.json({
        name: 'UniAuth API',
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        nodeVersion: process.version,
    });
});

export { healthRouter };
