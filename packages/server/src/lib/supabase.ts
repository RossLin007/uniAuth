import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { env } from '../config/index.js';

/**
 * Supabase client instance
 * Supabase 客户端实例
 */
let supabase: SupabaseClient | null = null;

/**
 * Get Supabase client (singleton)
 * 获取 Supabase 客户端（单例）
 */
export function getSupabase(): SupabaseClient {
    if (!supabase) {
        supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
            db: {
                schema: 'public',
            },
            global: {
                fetch: (url, options) => {
                    return fetch(url, {
                        ...options,
                        // Add timeout control
                        signal: AbortSignal.timeout(10000),
                    });
                },
            },
        });
    }
    return supabase;
}

/**
 * Database table names
 * 数据库表名
 */
export const TABLES = {
    USERS: 'users',
    VERIFICATION_CODES: 'verification_codes',
    REFRESH_TOKENS: 'refresh_tokens',
    OAUTH_ACCOUNTS: 'oauth_accounts',
    APPLICATIONS: 'applications',
    OAUTH_AUTHORIZATION_CODES: 'oauth_authorization_codes',
    AUDIT_LOGS: 'audit_logs',
    // New tables for security enhancements
    OAUTH_SCOPES: 'oauth_scopes',
    IP_BLACKLIST: 'ip_blacklist',
    RATE_LIMIT_ENTRIES: 'rate_limit_entries',
} as const;

/**
 * Execute database operation with retry
 * 带重试的数据库操作
 * 
 * @param operation - The database operation to execute
 * @param maxRetries - Maximum number of retries (default: 3)
 * @param baseDelay - Base delay in ms between retries (default: 100)
 */
export async function withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 100
): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            return await operation();
        } catch (error) {
            lastError = error as Error;

            // Don't retry on certain errors
            if (error instanceof Error) {
                const message = error.message.toLowerCase();
                if (message.includes('not found') || message.includes('unauthorized')) {
                    throw error;
                }
            }

            // Exponential backoff
            const delay = baseDelay * Math.pow(2, attempt);
            await new Promise(resolve => setTimeout(resolve, delay));

            console.warn(`Database operation retry ${attempt + 1}/${maxRetries}:`, error);
        }
    }

    throw lastError;
}

