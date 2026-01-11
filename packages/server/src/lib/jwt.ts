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
 * Now uses RS256 asymmetric signing via JWKS for better security.
 * Third-party services can verify tokens using public keys only.
 * 现在使用 RS256 非对称签名，第三方服务只需公钥即可验证。
 * 
 * @param user - User information
 * @param options - Optional token generation options
 */
export async function generateAccessToken(
    user: { id: string; phone?: string | null; email?: string | null } | { id: string },
    options?: TokenOptions
): Promise<string> {
    // Import JWKS signing function
    const { signJWT } = await import('./jwks.js');

    const payload: Record<string, unknown> = {};

    if ('phone' in user && user.phone) payload.phone = user.phone;
    if ('email' in user && user.email) payload.email = user.email;
    if (options?.scope) payload.scope = options.scope;

    // azp (authorized party) for OAuth2 compliance
    if (options?.clientId) {
        payload.azp = options.clientId;
    }

    // Sign with RS256 using JWKS private key
    const accessToken = await signJWT(payload, {
        issuer: ISSUER,
        audience: options?.clientId || 'uniauth',
        subject: user.id,
        expiresIn: env.JWT_ACCESS_TOKEN_EXPIRES_IN,
    });

    return accessToken;
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
 * Options for ID Token generation
 * ID Token 生成选项
 */
export interface IdTokenOptions {
    /** Client ID (audience) for the token */
    clientId: string;
    /** Application ID for fetching custom claims */
    applicationId?: string;
    /** Requested scopes for claim filtering */
    scopes?: string[];
    /** Nonce for replay attack prevention */
    nonce?: string;
    /** Time when authentication occurred */
    authTime?: number;
}

/**
 * Generate ID Token (OIDC)
 * 生成 ID Token（OpenID Connect）
 * 
 * @param user - User information with profile data
 * @param options - ID Token generation options
 */
export async function generateIdToken(
    user: {
        id: string;
        email?: string | null;
        phone?: string | null;
        email_verified?: boolean;
        phone_verified?: boolean;
        name?: string | null;
        avatar_url?: string | null;
    },
    options: IdTokenOptions
): Promise<string> {
    // Import JWKS signing function
    const { signJWT } = await import('./jwks.js');

    const payload: Record<string, unknown> = {};

    // Optional OIDC profile claims
    if (user.email) payload.email = user.email;
    if (user.email_verified !== undefined) payload.email_verified = user.email_verified;
    if (user.phone) payload.phone_number = user.phone;
    if (user.phone_verified !== undefined) payload.phone_verified = user.phone_verified;
    if (user.name) payload.name = user.name;
    if (user.avatar_url) payload.picture = user.avatar_url;

    // Add nonce for replay protection
    if (options.nonce) {
        payload.nonce = options.nonce;
    }

    // Add auth_time if provided
    if (options.authTime) {
        payload.auth_time = options.authTime;
    }

    // Add custom claims if applicationId is provided
    if (options.applicationId) {
        try {
            const { claimsService } = await import('../services/claims.service.js');
            const customClaims = await claimsService.evaluateClaims(
                user as any,
                options.applicationId,
                options.scopes || []
            );
            // Merge custom claims (custom claims can't override standard claims)
            Object.entries(customClaims).forEach(([key, value]) => {
                if (!(key in payload)) {
                    payload[key] = value;
                }
            });
        } catch (error) {
            // Log but don't fail token generation
            console.warn('Failed to load custom claims', error);
        }
    }

    // Sign with RS256 using JWKS private key
    const idToken = await signJWT(payload, {
        issuer: ISSUER,
        audience: options.clientId,
        subject: user.id,
        expiresIn: '24h', // ID tokens are long-lived
    });

    return idToken;
}

/**
 * Verify access token
 * 验证访问令牌
 * 
 * Now uses RS256 asymmetric verification via JWKS public key.
 * 现在使用 RS256 非对称验证，通过 JWKS 公钥验证。
 * 
 * @param token - JWT access token
 * @param expectedAudience - Optional expected audience (client_id) to validate
 */
export async function verifyAccessToken(
    token: string,
    expectedAudience?: string
): Promise<JWTPayload> {
    // Import JWKS verification function
    const { verifyJWT } = await import('./jwks.js');

    const options: jose.JWTVerifyOptions = {};

    if (expectedAudience) {
        options.audience = expectedAudience;
    }

    // Verify with RS256 using JWKS public key
    const { payload } = await verifyJWT(token, options);

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
