/**
 * PKCE (Proof Key for Code Exchange) Utilities
 * PKCE 工具函数
 * 
 * Used for secure OAuth 2.0 authorization in SPA applications.
 * 用于 SPA 应用的安全 OAuth 2.0 授权。
 */

const PKCE_VERIFIER_KEY = 'oauth_pkce_verifier';

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
 * Falls back to 'plain' method if crypto.subtle is unavailable (e.g., localhost HTTP)
 */
export async function generateCodeChallenge(verifier: string): Promise<{ challenge: string; method: 'S256' | 'plain' }> {
    // crypto.subtle may not be available on non-HTTPS origins (except localhost in some browsers)
    if (typeof crypto !== 'undefined' && crypto.subtle) {
        try {
            const encoder = new TextEncoder();
            const data = encoder.encode(verifier);
            const digest = await crypto.subtle.digest('SHA-256', data);
            return {
                challenge: base64UrlEncode(new Uint8Array(digest)),
                method: 'S256'
            };
        } catch (e) {
            console.warn('Failed to generate SHA-256 challenge, falling back to plain:', e);
        }
    }

    // Fallback to 'plain' method (less secure but works everywhere)
    return { challenge: verifier, method: 'plain' };
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
export function storeCodeVerifier(verifier: string): void {
    sessionStorage.setItem(PKCE_VERIFIER_KEY, verifier);
}

/**
 * Retrieve and clear stored PKCE code verifier
 * 获取并清除存储的 PKCE code_verifier
 */
export function getAndClearCodeVerifier(): string | null {
    const verifier = sessionStorage.getItem(PKCE_VERIFIER_KEY);
    sessionStorage.removeItem(PKCE_VERIFIER_KEY);
    return verifier;
}
