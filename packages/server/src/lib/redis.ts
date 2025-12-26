/**
 * Redis Client Module
 * Redis 客户端模块
 *
 * Provides caching, rate limiting, and session storage
 * Supports both Upstash (HTTP) and standard Redis (TCP)
 * 提供缓存、限流和会话存储功能
 * 支持 Upstash (HTTP) 和标准 Redis (TCP)
 */

import { Redis as UpstashRedis } from '@upstash/redis';
import IORedis from 'ioredis';
import { env } from '../config/index.js';
import { logger } from './logger.js';

// Unified interface for Redis operations
interface RedisClientInterface {
    get(key: string): Promise<string | null>;
    setex(key: string, seconds: number, value: string): Promise<string | null>;
    del(key: string): Promise<number>;
    incr(key: string): Promise<number>;
    expire(key: string, seconds: number): Promise<number>;
    ttl(key: string): Promise<number>;
}

let redisClient: RedisClientInterface | null = null;
let clientType: 'upstash' | 'ioredis' | null = null;

/**
 * Get or create Redis client instance
 * 获取或创建 Redis 客户端实例
 */
export function getRedis(): RedisClientInterface | null {
    if (redisClient) return redisClient;

    // Priority 1: Upstash Redis (Cloud/Production)
    if (env.UPSTASH_REDIS_URL && env.UPSTASH_REDIS_TOKEN) {
        try {
            const client = new UpstashRedis({
                url: env.UPSTASH_REDIS_URL,
                token: env.UPSTASH_REDIS_TOKEN,
            });
            redisClient = client as unknown as RedisClientInterface; // Upstash client matches interface structure compatible enough for our usage
            clientType = 'upstash';
            logger.info('Initialized Upstash Redis client');
            return redisClient;
        } catch (error) {
            logger.error('Failed to initialize Upstash Redis', error);
        }
    }

    // Priority 2: Standard Redis (Local/Self-hosted)
    if (env.REDIS_URL) {
        try {
            const client = new IORedis(env.REDIS_URL, {
                maxRetriesPerRequest: 3,
                retryStrategy: (times) => {
                    if (times > 3) return null; // Stop retrying after 3 times
                    return Math.min(times * 50, 2000);
                }
            });

            client.on('error', (err) => {
                logger.error('Redis Client Error', err);
            });

            // Wrap IORedis to match our interface if needed, but IORedis mostly matches.
            // However, Upstash returns null for get(), IORedis returns null.
            // Upstash returns 'OK' for setex, IORedis returns 'OK'.
            redisClient = client as unknown as RedisClientInterface;
            clientType = 'ioredis';
            logger.info('Initialized Local/Standard Redis client');
            return redisClient;
        } catch (error) {
            logger.error('Failed to initialize Local Redis', error);
        }
    }

    logger.warn('No Redis configuration found');
    return null;
}

/**
 * Check if Redis is available
 * 检查 Redis 是否可用
 */
export function isRedisAvailable(): boolean {
    return getRedis() !== null;
}

/**
 * Get a value from cache
 * 从缓存获取值
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
    const client = getRedis();
    if (!client) return null;

    try {
        const value = await client.get(key);
        if (!value) return null;
        try {
            return JSON.parse(value) as T;
        } catch {
            return value as unknown as T;
        }
    } catch (error) {
        logger.warn('Redis cache get failed:', error);
        return null;
    }
}

/**
 * Set a value in cache with TTL
 * 设置缓存值（带过期时间）
 */
export async function cacheSet(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    const client = getRedis();
    if (!client) return;

    try {
        const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
        await client.setex(key, ttlSeconds, stringValue);
    } catch (error) {
        logger.warn('Redis cache set failed:', error);
    }
}

/**
 * Delete a value from cache
 * 从缓存删除值
 */
export async function cacheDelete(key: string): Promise<void> {
    const client = getRedis();
    if (!client) return;

    try {
        await client.del(key);
    } catch (error) {
        logger.warn('Redis cache delete failed:', error);
    }
}

/**
 * Increment a counter (for rate limiting)
 * 增加计数器（用于限流）
 */
export async function incrementCounter(key: string, ttlSeconds: number): Promise<number> {
    const client = getRedis();
    if (!client) return 0;

    try {
        const count = await client.incr(key);
        // Set TTL only on first increment
        if (count === 1) {
            await client.expire(key, ttlSeconds);
        }
        return count;
    } catch (error) {
        logger.warn('Redis increment failed:', error);
        return 0;
    }
}

/**
 * Check if a key is locked (rate limit exceeded)
 * 检查键是否被锁定（超出限流）
 */
export async function isLocked(key: string): Promise<boolean> {
    const client = getRedis();
    if (!client) return false;

    try {
        const value = await client.get(key);
        return value !== null;
    } catch (error) {
        logger.warn('Redis lock check failed:', error);
        return false;
    }
}

/**
 * Set a lock with TTL
 * 设置锁定（带过期时间）
 */
export async function setLock(key: string, ttlSeconds: number): Promise<void> {
    const client = getRedis();
    if (!client) return;

    try {
        await client.setex(key, ttlSeconds, '1');
    } catch (error) {
        logger.warn('Redis set lock failed:', error);
    }
}

/**
 * Get remaining TTL for a key
 * 获取键的剩余过期时间
 */
export async function getTTL(key: string): Promise<number> {
    const client = getRedis();
    if (!client) return -2;

    try {
        return await client.ttl(key);
    } catch (error) {
        logger.warn('Redis TTL check failed:', error);
        return -2;
    }
}

/**
 * Store verification code in Redis
 * 在 Redis 中存储验证码
 */
export async function storeVerificationCode(
    identifier: string,
    code: string,
    type: string,
    ttlSeconds: number = 300
): Promise<void> {
    const key = `verify:${type}:${identifier}`;
    await cacheSet(key, { code, attempts: 0, createdAt: Date.now() }, ttlSeconds);
}

/**
 * Get verification code from Redis
 * 从 Redis 获取验证码
 */
export async function getVerificationCode(
    identifier: string,
    type: string
): Promise<{ code: string; attempts: number; createdAt: number } | null> {
    const key = `verify:${type}:${identifier}`;
    return cacheGet(key);
}

/**
 * Increment verification code attempts
 * 增加验证码尝试次数
 */
export async function incrementVerificationAttempts(
    identifier: string,
    type: string
): Promise<number> {
    const key = `verify:${type}:${identifier}`;
    const data = await getVerificationCode(identifier, type);

    if (!data) return 0;

    const newAttempts = data.attempts + 1;
    const client = getRedis();

    if (client) {
        const ttl = await getTTL(key);
        if (ttl > 0) {
            await cacheSet(key, { ...data, attempts: newAttempts }, ttl);
        }
    }

    return newAttempts;
}

/**
 * Delete verification code
 * 删除验证码
 */
export async function deleteVerificationCode(
    identifier: string,
    type: string
): Promise<void> {
    const key = `verify:${type}:${identifier}`;
    await cacheDelete(key);
}



