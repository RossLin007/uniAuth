import * as jose from 'jose';
import { createHash, randomBytes } from 'crypto';
import { env, TOKEN } from '../config/index.js';
import type { JWTPayload, TokenPair } from '../types/index.js';

// Encode the secret key
const secret = new TextEncoder().encode(env.JWT_SECRET);

// Issuer for JWT tokens (use FRONTEND_URL as the issuer base)
const ISSUER = env.FRONTEND_URL?.replace(/:\d+$/, '') || 'https://auth.uniauth.com';

/**
 * Options for token generation
 * 令牌生成选项
 */
export interface TokenOptions {
    /** Client ID (audience) for the token */
    clientId?: string;
    /** Scopes for the token */
    scope?: string;
}

/**
 * Generate access token
 * 生成访问令牌
 * 
 * @param user - User information
 * @param options - Optional token generation options
 */
export async function generateAccessToken(
    user: { id: string; phone?: string | null; email?: string | null } | { id: string },
    options?: TokenOptions
): Promise<string> {
    const payload: Record<string, unknown> = {};

    if ('phone' in user && user.phone) payload.phone = user.phone;
    if ('email' in user && user.email) payload.email = user.email;
    if (options?.scope) payload.scope = options.scope;

    const builder = new jose.SignJWT(payload)
        .setProtectedHeader({ alg: 'HS256' })
        .setSubject(user.id)
        .setIssuer(ISSUER)
        .setIssuedAt()
        .setExpirationTime(env.JWT_ACCESS_TOKEN_EXPIRES_IN);

    // Add audience if clientId is provided (for third-party apps)
    if (options?.clientId) {
        builder.setAudience(options.clientId);
        // azp (authorized party) is set in payload for OAuth2 compliance
        payload.azp = options.clientId;
    }

    const jwt = await builder.sign(secret);
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
 * 
 * @param token - JWT access token
 * @param expectedAudience - Optional expected audience (client_id) to validate
 */
export async function verifyAccessToken(
    token: string,
    expectedAudience?: string
): Promise<JWTPayload> {
    const options: jose.JWTVerifyOptions = {};

    if (expectedAudience) {
        options.audience = expectedAudience;
    }

    const { payload } = await jose.jwtVerify(token, secret, options);

    return {
        sub: payload.sub as string,
        aud: payload.aud as string | undefined,
        azp: payload.azp as string | undefined,
        iss: payload.iss as string | undefined,
        phone: payload.phone as string | undefined,
        email: payload.email as string | undefined,
        scope: payload.scope as string | undefined,
        iat: payload.iat as number,
        exp: payload.exp as number,
    };
}

/**
 * Generate token pair (access + refresh)
 * 生成令牌对（访问令牌 + 刷新令牌）
 * 
 * @param user - User information
 * @param options - Optional token generation options
 */
export async function generateTokenPair(
    user: { id: string; phone?: string | null; email?: string | null },
    options?: TokenOptions
): Promise<TokenPair> {
    const accessToken = await generateAccessToken(user, options);
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
