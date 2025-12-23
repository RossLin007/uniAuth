import * as jose from 'jose';
import { createHash, randomBytes } from 'crypto';
import { env, TOKEN } from '../config/index.js';
import type { JWTPayload, TokenPair } from '../types/index.js';

// Encode the secret key
const secret = new TextEncoder().encode(env.JWT_SECRET);

/**
 * Generate access token
 * 生成访问令牌
 */
/**
 * Generate access token
 * 生成访问令牌
 */
export async function generateAccessToken(
    user: { id: string; phone?: string | null; email?: string | null }
): Promise<string> {
    const payload: { phone?: string; email?: string } = {};
    if (user.phone) payload.phone = user.phone;
    if (user.email) payload.email = user.email;

    const jwt = await new jose.SignJWT(payload)
        .setProtectedHeader({ alg: 'HS256' })
        .setSubject(user.id)
        .setIssuedAt()
        .setExpirationTime(env.JWT_ACCESS_TOKEN_EXPIRES_IN)
        .sign(secret);

    return jwt;
}

/**
 * Generate refresh token
 * 生成刷新令牌
 */
export function generateRefreshToken(): string {
    return randomBytes(32).toString('base64url');
}

/**
 * Hash refresh token for storage
 * 对刷新令牌进行哈希处理以便存储
 */
export function hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
}

/**
 * Verify access token
 * 验证访问令牌
 */
export async function verifyAccessToken(token: string): Promise<JWTPayload> {
    const { payload } = await jose.jwtVerify(token, secret);

    return {
        sub: payload.sub as string,
        phone: payload.phone as string,
        iat: payload.iat as number,
        exp: payload.exp as number,
    };
}

/**
 * Generate token pair (access + refresh)
 * 生成令牌对（访问令牌 + 刷新令牌）
 */
export async function generateTokenPair(
    user: { id: string; phone?: string | null; email?: string | null }
): Promise<TokenPair> {
    const accessToken = await generateAccessToken(user);
    const refreshToken = generateRefreshToken();

    return {
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_in: TOKEN.ACCESS_TOKEN_EXPIRES_IN,
    };
}

/**
 * Parse duration string to seconds
 * 将时间字符串解析为秒数
 * 
 * @example
 * parseDuration('1h') // 3600
 * parseDuration('30d') // 2592000
 */
export function parseDuration(duration: string): number {
    const match = duration.match(/^(\d+)([smhd])$/);
    if (!match) {
        throw new Error(`Invalid duration format: ${duration}`);
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
        case 's':
            return value;
        case 'm':
            return value * 60;
        case 'h':
            return value * 60 * 60;
        case 'd':
            return value * 24 * 60 * 60;
        default:
            throw new Error(`Unknown duration unit: ${unit}`);
    }
}
