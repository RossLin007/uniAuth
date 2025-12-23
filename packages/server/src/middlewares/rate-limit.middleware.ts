/**
 * Rate Limiting Middleware
 * 限流中间件
 * 
 * Protects against brute force attacks and API abuse
 * 防止暴力破解攻击和 API 滥用
 */

import { Context, Next, MiddlewareHandler } from 'hono';
import { incrementCounter, isLocked, setLock, getTTL } from '../lib/redis.js';
import { logger } from '../lib/logger.js';
import type { HonoVariables } from '../types/index.js';

/**
 * Rate limit configuration
 */
interface RateLimitConfig {
    /** Window size in seconds */
    windowSeconds: number;
    /** Maximum requests per window */
    maxRequests: number;
    /** Key prefix for Redis */
    keyPrefix: string;
    /** Custom key generator */
    keyGenerator?: (c: Context) => string;
    /** Whether to skip rate limiting (for testing) */
    skip?: (c: Context) => boolean;
}

/**
 * Default key generator - uses IP address
 */
function defaultKeyGenerator(c: Context): string {
    return (
        c.req.header('X-Forwarded-For')?.split(',')[0].trim() ||
        c.req.header('X-Real-IP') ||
        c.req.header('CF-Connecting-IP') ||
        'unknown'
    );
}

/**
 * Create a rate limiter middleware
 * 创建限流中间件
 * 
 * @param config - Rate limit configuration
 */
export function rateLimiter(config: RateLimitConfig): MiddlewareHandler<{ Variables: HonoVariables }> {
    const {
        windowSeconds,
        maxRequests,
        keyPrefix,
        keyGenerator = defaultKeyGenerator,
        skip,
    } = config;

    return async (c: Context<{ Variables: HonoVariables }>, next: Next) => {
        // Check if should skip
        if (skip?.(c)) {
            return next();
        }

        const identifier = keyGenerator(c);
        const key = `ratelimit:${keyPrefix}:${identifier}`;

        // Check current count
        const count = await incrementCounter(key, windowSeconds);

        // Set rate limit headers
        c.header('X-RateLimit-Limit', maxRequests.toString());
        c.header('X-RateLimit-Remaining', Math.max(0, maxRequests - count).toString());

        if (count > maxRequests) {
            const retryAfter = await getTTL(key);
            c.header('X-RateLimit-Reset', retryAfter.toString());
            c.header('Retry-After', retryAfter.toString());

            logger.warn('Rate limit exceeded', {
                ip: identifier,
                path: c.req.path,
                count,
                limit: maxRequests,
            });

            return c.json(
                {
                    success: false,
                    error: {
                        code: 'RATE_LIMIT_EXCEEDED',
                        message: 'Too many requests. Please try again later. / 请求过于频繁，请稍后再试。',
                    },
                    retryAfter,
                },
                429
            );
        }

        return next();
    };
}

/**
 * General API rate limiter
 * 通用 API 限流器
 * 
 * 100 requests per 15 minutes per IP
 */
export const generalRateLimiter = rateLimiter({
    windowSeconds: 15 * 60, // 15 minutes
    maxRequests: 100,
    keyPrefix: 'general',
});

/**
 * Authentication rate limiter (stricter)
 * 认证接口限流器（更严格）
 * 
 * 10 requests per minute per IP
 */
export const authRateLimiter = rateLimiter({
    windowSeconds: 60, // 1 minute
    maxRequests: 10,
    keyPrefix: 'auth',
});

/**
 * Send code rate limiter (very strict)
 * 发送验证码限流器（非常严格）
 * 
 * 3 requests per 5 minutes per phone/email
 */
export const sendCodeRateLimiter = rateLimiter({
    windowSeconds: 5 * 60, // 5 minutes
    maxRequests: 3,
    keyPrefix: 'sendcode',
    keyGenerator: (c) => {
        // Use phone/email + IP for verification code sending
        const ip = defaultKeyGenerator(c);
        // Note: This is called before body is parsed, so we use IP only here
        // The service layer also checks per-phone rate limiting
        return ip;
    },
});

/**
 * Verification code attempt limiter
 * 验证码尝试限流器
 */
const MAX_VERIFY_ATTEMPTS = 5;
const LOCKOUT_DURATION_SECONDS = 15 * 60; // 15 minutes

/**
 * Check if verification attempts are locked
 * 检查验证尝试是否被锁定
 * 
 * @param identifier - Phone number or email
 * @returns Lock info or null if not locked
 */
export async function checkVerificationLock(
    identifier: string
): Promise<{ locked: boolean; retryAfter?: number }> {
    const lockKey = `lockout:verify:${identifier}`;
    const locked = await isLocked(lockKey);

    if (locked) {
        const retryAfter = await getTTL(lockKey);
        return { locked: true, retryAfter: retryAfter > 0 ? retryAfter : undefined };
    }

    return { locked: false };
}

/**
 * Record a failed verification attempt
 * 记录失败的验证尝试
 * 
 * @param identifier - Phone number or email
 * @returns Updated attempt info
 */
export async function recordFailedVerification(
    identifier: string
): Promise<{ attempts: number; locked: boolean; retryAfter?: number }> {
    const attemptKey = `attempts:verify:${identifier}`;
    const lockKey = `lockout:verify:${identifier}`;

    const attempts = await incrementCounter(attemptKey, LOCKOUT_DURATION_SECONDS);

    if (attempts >= MAX_VERIFY_ATTEMPTS) {
        // Lock the identifier
        await setLock(lockKey, LOCKOUT_DURATION_SECONDS);

        logger.warn('Verification locked due to too many attempts', {
            identifier: identifier.substring(0, 4) + '****',
            attempts,
        });

        return {
            attempts,
            locked: true,
            retryAfter: LOCKOUT_DURATION_SECONDS,
        };
    }

    return {
        attempts,
        locked: false,
    };
}

/**
 * Clear verification attempts after successful verification
 * 成功验证后清除尝试记录
 * 
 * @param identifier - Phone number or email
 */
export async function clearVerificationAttempts(identifier: string): Promise<void> {
    const attemptKey = `attempts:verify:${identifier}`;
    const lockKey = `lockout:verify:${identifier}`;

    const { cacheDelete } = await import('../lib/redis.js');
    await Promise.all([
        cacheDelete(attemptKey),
        cacheDelete(lockKey),
    ]);
}
