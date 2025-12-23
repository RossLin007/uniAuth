/**
 * HTTP Utilities for UniAuth Client SDK
 * UniAuth 客户端 SDK HTTP 工具
 *
 * Provides robust HTTP request handling with:
 * - Automatic retry with exponential backoff
 * - Timeout handling
 * - Request/response interceptors
 */

/**
 * HTTP fetch options with retry configuration
 */
export interface FetchWithRetryOptions extends RequestInit {
    /** Maximum number of retry attempts (default: 3) */
    maxRetries?: number;
    /** Base delay in ms between retries (default: 500) */
    baseDelay?: number;
    /** Request timeout in ms (default: 30000) */
    timeout?: number;
    /** HTTP status codes that should trigger a retry (default: [408, 429, 500, 502, 503, 504]) */
    retryStatusCodes?: number[];
}

/**
 * Default retry status codes
 * These status codes indicate temporary failures that may succeed on retry
 */
const DEFAULT_RETRY_STATUS_CODES = [
    408, // Request Timeout
    429, // Too Many Requests
    500, // Internal Server Error
    502, // Bad Gateway
    503, // Service Unavailable
    504, // Gateway Timeout
];

/**
 * Fetch with automatic retry and exponential backoff
 * 带自动重试和指数退避的 fetch
 * 
 * @param url - The URL to fetch
 * @param options - Fetch options with retry configuration
 * @returns The fetch response
 * @throws Error if all retries fail
 */
export async function fetchWithRetry(
    url: string,
    options: FetchWithRetryOptions = {}
): Promise<Response> {
    const {
        maxRetries = 3,
        baseDelay = 500,
        timeout = 30000,
        retryStatusCodes = DEFAULT_RETRY_STATUS_CODES,
        ...fetchOptions
    } = options;

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            // Create abort controller for timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeout);

            const response = await fetch(url, {
                ...fetchOptions,
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            // Check if we should retry based on status code
            if (retryStatusCodes.includes(response.status) && attempt < maxRetries) {
                // Check for Retry-After header
                const retryAfter = response.headers.get('Retry-After');
                const delay = retryAfter
                    ? parseRetryAfter(retryAfter)
                    : calculateBackoffDelay(attempt, baseDelay);

                await sleep(delay);
                continue;
            }

            return response;
        } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));

            // Don't retry on abort (intentional cancellation)
            if (lastError.name === 'AbortError' && attempt >= maxRetries) {
                throw new Error(`Request timeout after ${timeout}ms`);
            }

            // Check if we should retry
            if (attempt < maxRetries) {
                const delay = calculateBackoffDelay(attempt, baseDelay);
                await sleep(delay);
            }
        }
    }

    throw lastError || new Error('Request failed after all retries');
}

/**
 * Calculate exponential backoff delay with jitter
 * 计算带抖动的指数退避延迟
 * 
 * @param attempt - Current attempt number (0-indexed)
 * @param baseDelay - Base delay in milliseconds
 * @returns Delay in milliseconds
 */
function calculateBackoffDelay(attempt: number, baseDelay: number): number {
    // Exponential backoff: baseDelay * 2^attempt
    const exponentialDelay = baseDelay * Math.pow(2, attempt);

    // Add random jitter (±25%) to prevent thundering herd
    const jitter = exponentialDelay * 0.25 * (Math.random() * 2 - 1);

    // Cap at 30 seconds
    return Math.min(exponentialDelay + jitter, 30000);
}

/**
 * Parse Retry-After header value
 * 解析 Retry-After 头部值
 * 
 * @param value - Retry-After header value (seconds or HTTP-date)
 * @returns Delay in milliseconds
 */
function parseRetryAfter(value: string): number {
    // If it's a number of seconds
    const seconds = parseInt(value, 10);
    if (!isNaN(seconds)) {
        return seconds * 1000;
    }

    // If it's an HTTP-date
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
        const delay = date.getTime() - Date.now();
        return Math.max(delay, 0);
    }

    // Default to 1 second
    return 1000;
}

/**
 * Sleep for a specified duration
 * 休眠指定时间
 */
function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * PKCE (Proof Key for Code Exchange) utilities
 * PKCE 工具函数
 */

/**
 * Generate a cryptographically random code verifier
 * 生成加密随机的 code_verifier
 */
export function generateCodeVerifier(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return base64UrlEncode(array);
}

/**
 * Generate code challenge from verifier using SHA-256
 * 使用 SHA-256 从 verifier 生成 code_challenge
 */
export async function generateCodeChallenge(verifier: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const digest = await crypto.subtle.digest('SHA-256', data);
    return base64UrlEncode(new Uint8Array(digest));
}

/**
 * Base64 URL encode a Uint8Array
 * Base64 URL 编码
 */
function base64UrlEncode(array: Uint8Array): string {
    let binary = '';
    for (let i = 0; i < array.byteLength; i++) {
        binary += String.fromCharCode(array[i]);
    }
    return btoa(binary)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}

/**
 * Store PKCE code verifier for later use
 * 存储 PKCE code_verifier 以供后续使用
 */
export function storeCodeVerifier(verifier: string, storageKey = 'uniauth_pkce_verifier'): void {
    if (typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem(storageKey, verifier);
    }
}

/**
 * Retrieve and clear stored PKCE code verifier
 * 获取并清除存储的 PKCE code_verifier
 */
export function getAndClearCodeVerifier(storageKey = 'uniauth_pkce_verifier'): string | null {
    if (typeof sessionStorage !== 'undefined') {
        const verifier = sessionStorage.getItem(storageKey);
        sessionStorage.removeItem(storageKey);
        return verifier;
    }
    return null;
}

export {
    DEFAULT_RETRY_STATUS_CODES,
};
