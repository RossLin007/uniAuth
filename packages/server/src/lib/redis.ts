/**
 * Redis Client Module
 * Redis 客户端模块
 * 
 * Provides caching, rate limiting, and session storage
 * 提供缓存、限流和会话存储功能
 */

import { Redis } from '@upstash/redis';
import { env } from '../config/env.js';

let redis: Redis | null = null;

/**
 * Get or create Redis client instance
 * 获取或创建 Redis 客户端实例
 */
export function getRedis(): Redis | null {
    if (!env.UPSTASH_REDIS_URL || !env.UPSTASH_REDIS_TOKEN) {
        return null;
    }

    if (!redis) {
        redis = new Redis({
            url: env.UPSTASH_REDIS_URL,
            token: env.UPSTASH_REDIS_TOKEN,
        });
    }

    return redis;
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
 * 
 * @param key - Cache key
 * @returns The cached value or null
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
    const client = getRedis();
    if (!client) return null;

    try {
        return await client.get(key) as T | null;
    } catch (error) {
        console.warn('Redis cache get failed:', error);
        return null;
    }
}

/**
 * Set a value in cache with TTL
 * 设置缓存值（带过期时间）
 * 
 * @param key - Cache key
 * @param value - Value to cache
 * @param ttlSeconds - Time to live in seconds
 */
export async function cacheSet(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    const client = getRedis();
    if (!client) return;

    try {
        await client.setex(key, ttlSeconds, JSON.stringify(value));
    } catch (error) {
        console.warn('Redis cache set failed:', error);
    }
}

/**
 * Delete a value from cache
 * 从缓存删除值
 * 
 * @param key - Cache key
 */
export async function cacheDelete(key: string): Promise<void> {
    const client = getRedis();
    if (!client) return;

    try {
        await client.del(key);
    } catch (error) {
        console.warn('Redis cache delete failed:', error);
    }
}

/**
 * Increment a counter (for rate limiting)
 * 增加计数器（用于限流）
 * 
 * @param key - Counter key
 * @param ttlSeconds - TTL for the counter
 * @returns The new counter value
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
        console.warn('Redis increment failed:', error);
        return 0;
    }
}

/**
 * Check if a key is locked (rate limit exceeded)
 * 检查键是否被锁定（超出限流）
 * 
 * @param key - Lock key
 * @returns True if locked
 */
export async function isLocked(key: string): Promise<boolean> {
    const client = getRedis();
    if (!client) return false;

    try {
        const value = await client.get(key);
        return value !== null;
    } catch (error) {
        console.warn('Redis lock check failed:', error);
        return false;
    }
}

/**
 * Set a lock with TTL
 * 设置锁定（带过期时间）
 * 
 * @param key - Lock key
 * @param ttlSeconds - Lock duration in seconds
 */
export async function setLock(key: string, ttlSeconds: number): Promise<void> {
    const client = getRedis();
    if (!client) return;

    try {
        await client.setex(key, ttlSeconds, '1');
    } catch (error) {
        console.warn('Redis set lock failed:', error);
    }
}

/**
 * Get remaining TTL for a key
 * 获取键的剩余过期时间
 * 
 * @param key - Cache key
 * @returns TTL in seconds, -1 if no TTL, -2 if key doesn't exist
 */
export async function getTTL(key: string): Promise<number> {
    const client = getRedis();
    if (!client) return -2;

    try {
        return await client.ttl(key);
    } catch (error) {
        console.warn('Redis TTL check failed:', error);
        return -2;
    }
}

/**
 * Store verification code in Redis
 * 在 Redis 中存储验证码
 * 
 * @param phone - Phone number or email
 * @param code - Verification code
 * @param type - Code type
 * @param ttlSeconds - TTL in seconds (default: 300 = 5 minutes)
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
 * 
 * @param identifier - Phone number or email
 * @param type - Code type
 * @returns The stored code data or null
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
 * 
 * @param identifier - Phone number or email
 * @param type - Code type
 * @returns The new attempts count
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
 * 
 * @param identifier - Phone number or email
 * @param type - Code type
 */
export async function deleteVerificationCode(
    identifier: string,
    type: string
): Promise<void> {
    const key = `verify:${type}:${identifier}`;
    await cacheDelete(key);
}
