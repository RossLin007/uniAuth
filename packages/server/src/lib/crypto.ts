/**
 * Cryptographic Utilities
 * 加密工具模块
 * 
 * Provides secure hashing and verification for sensitive data
 * 提供敏感数据的安全哈希和验证功能
 */

import bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'crypto';

// bcrypt 工作因子 (12 提供良好的安全性和性能平衡)
const BCRYPT_ROUNDS = 12;

/**
 * Hash a client secret using bcrypt
 * 使用 bcrypt 哈希客户端密钥
 * 
 * @param secret - The plain text client secret
 * @returns The hashed secret
 */
export async function hashClientSecret(secret: string): Promise<string> {
    return bcrypt.hash(secret, BCRYPT_ROUNDS);
}

/**
 * Verify a client secret against its hash
 * 验证客户端密钥是否与哈希匹配
 * 
 * @param secret - The plain text secret to verify
 * @param hash - The stored hash to compare against
 * @returns True if the secret matches the hash
 */
export async function verifyClientSecret(secret: string, hash: string): Promise<boolean> {
    return bcrypt.compare(secret, hash);
}

/**
 * Hash a password using bcrypt
 * 使用 bcrypt 哈希密码
 * 
 * @param password - The plain text password
 * @returns The hashed password
 */
export async function hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, BCRYPT_ROUNDS);
}

/**
 * Verify a password against its hash
 * 验证密码是否与哈希匹配
 * 
 * @param password - The plain text password to verify
 * @param hash - The stored hash to compare against
 * @returns True if the password matches the hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
}

/**
 * Generate a secure random token
 * 生成安全随机令牌
 * 
 * @param length - The length of the token in bytes (default: 32)
 * @returns A hex-encoded random token
 */
export function generateSecureToken(length: number = 32): string {
    return randomBytes(length).toString('hex');
}

/**
 * Hash a token using SHA-256 (for storage)
 * 使用 SHA-256 哈希令牌（用于存储）
 * 
 * @param token - The token to hash
 * @returns The SHA-256 hash of the token
 */
export function hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
}

/**
 * Generate a PKCE code verifier
 * 生成 PKCE code_verifier
 * 
 * @returns A 43-128 character random string
 */
export function generateCodeVerifier(): string {
    // Generate 48 random bytes to ensure we get at least 43 characters after filtering
    return randomBytes(48)
        .toString('base64url')
        .substring(0, 64); // Use 64 chars for safety margin
}

/**
 * Generate a PKCE code challenge from a verifier
 * 从 verifier 生成 PKCE code_challenge
 * 
 * @param verifier - The code verifier
 * @param method - The challenge method ('S256' or 'plain')
 * @returns The code challenge
 */
export function generateCodeChallenge(verifier: string, method: 'S256' | 'plain' = 'S256'): string {
    if (method === 'plain') {
        return verifier;
    }

    // S256: BASE64URL(SHA256(verifier))
    return createHash('sha256')
        .update(verifier)
        .digest('base64url');
}

/**
 * Verify a PKCE code challenge
 * 验证 PKCE code_challenge
 * 
 * @param verifier - The code verifier provided by the client
 * @param challenge - The stored code challenge
 * @param method - The challenge method ('S256' or 'plain')
 * @returns True if the verifier matches the challenge
 */
export function verifyCodeChallenge(
    verifier: string,
    challenge: string,
    method: 'S256' | 'plain' = 'S256'
): boolean {
    const computed = generateCodeChallenge(verifier, method);
    return computed === challenge;
}
