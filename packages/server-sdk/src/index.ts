/**
 * UniAuth Server SDK
 * 统一认证后端 SDK
 *
 * Usage:
 * ```typescript
 * import { UniAuthServer } from '@55387.ai/uniauth-server';
 *
 * const auth = new UniAuthServer({
 *   baseUrl: 'https://auth.example.com',
 *   clientId: 'your-client-id',
 *   clientSecret: 'your-client-secret',
 * });
 *
 * // Verify token
 * const payload = await auth.verifyToken(accessToken);
 *
 * // Introspect token (RFC 7662)
 * const introspectResult = await auth.introspectToken(accessToken);
 *
 * // Express middleware
 * app.use('/api/*', auth.middleware());
 *
 * // Hono middleware
 * app.use('/api/*', auth.honoMiddleware());
 * ```
 */

import * as jose from 'jose';

// ============================================
// Types
// ============================================

export interface UniAuthServerConfig {
    /** API base URL */
    baseUrl: string;
    /** OAuth2 Client ID (also used as appKey) */
    clientId: string;
    /** OAuth2 Client Secret (also used as appSecret) */
    clientSecret: string;
    /** JWT public key (optional, for local verification) */
    jwtPublicKey?: string;
    /** @deprecated Use clientId instead */
    appKey?: string;
    /** @deprecated Use clientSecret instead */
    appSecret?: string;
}

export interface TokenPayload {
    /** User ID or Client ID (for M2M) */
    sub: string;
    /** Issuer */
    iss?: string;
    /** Audience */
    aud?: string | string[];
    /** Issued at timestamp */
    iat: number;
    /** Expiration timestamp */
    exp: number;
    /** Scopes */
    scope?: string;
    /** Authorized party (client_id that requested this token) */
    azp?: string;
    /** Phone number (optional) */
    phone?: string;
    /** Email address (optional) */
    email?: string;
}

export interface UserInfo {
    id: string;
    phone?: string | null;
    email?: string | null;
    nickname?: string | null;
    avatar_url?: string | null;
    phone_verified?: boolean;
    email_verified?: boolean;
    created_at?: string;
    updated_at?: string;
}

export interface VerifyResult {
    valid: boolean;
    payload?: TokenPayload;
    error?: string;
}

/**
 * RFC 7662 Token Introspection Response
 * 令牌内省响应
 */
export interface IntrospectionResult {
    /** Whether the token is active */
    active: boolean;
    /** Scopes associated with this token */
    scope?: string;
    /** Client ID that requested the token */
    client_id?: string;
    /** Username or user identifier */
    username?: string;
    /** Token type (usually "Bearer") */
    token_type?: string;
    /** Expiration timestamp */
    exp?: number;
    /** Issued at timestamp */
    iat?: number;
    /** Not before timestamp */
    nbf?: number;
    /** Subject (user ID or client ID) */
    sub?: string;
    /** Audience */
    aud?: string | string[];
    /** Issuer */
    iss?: string;
    /** JWT ID */
    jti?: string;
}

/**
 * Error codes for UniAuth Server SDK
 * UniAuth 服务端 SDK 错误码
 */
export const ServerErrorCode = {
    INVALID_TOKEN: 'INVALID_TOKEN',
    TOKEN_EXPIRED: 'TOKEN_EXPIRED',
    VERIFICATION_FAILED: 'VERIFICATION_FAILED',
    USER_NOT_FOUND: 'USER_NOT_FOUND',
    UNAUTHORIZED: 'UNAUTHORIZED',
    NO_PUBLIC_KEY: 'NO_PUBLIC_KEY',
    NETWORK_ERROR: 'NETWORK_ERROR',
    INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export type ServerErrorCodeType = typeof ServerErrorCode[keyof typeof ServerErrorCode];

/**
 * Custom error class for server SDK
 * 服务端 SDK 自定义错误类
 */
export class ServerAuthError extends Error {
    code: ServerErrorCodeType | string;
    statusCode: number;

    constructor(code: ServerErrorCodeType | string, message: string, statusCode: number = 401) {
        super(message);
        this.name = 'ServerAuthError';
        this.code = code;
        this.statusCode = statusCode;

        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, ServerAuthError);
        }
    }
}

// API Response types
interface ApiErrorResponse {
    success: false;
    error?: {
        code?: string;
        message?: string;
    };
}

interface ApiSuccessResponse<T> {
    success: true;
    data: T;
}

// Express-compatible request/response types
interface ExpressRequest {
    headers: Record<string, string | string[] | undefined>;
    user?: UserInfo;
    authPayload?: TokenPayload;
}

interface ExpressResponse {
    status(code: number): ExpressResponse;
    json(data: unknown): void;
}

type NextFunction = (error?: Error) => void;

// Hono-compatible types
interface HonoContext {
    req: {
        header(name: string): string | undefined;
    };
    set(key: string, value: unknown): void;
    get(key: string): unknown;
    json(data: unknown, status?: number): Response;
}

type HonoMiddlewareHandler = (c: HonoContext, next: () => Promise<void>) => Promise<Response | void>;

/**
 * UniAuth Server SDK
 * 统一认证后端 SDK
 */
export class UniAuthServer {
    private config: UniAuthServerConfig;
    private tokenCache: Map<string, { payload: TokenPayload; expiresAt: number }> = new Map();

    constructor(config: UniAuthServerConfig) {
        // Support both new naming (clientId/clientSecret) and legacy (appKey/appSecret)
        this.config = {
            ...config,
            clientId: config.clientId || config.appKey || '',
            clientSecret: config.clientSecret || config.appSecret || '',
        };
    }

    // ============================================
    // Token Verification
    // ============================================

    /**
     * Verify access token
     * 验证访问令牌
     *
     * @param token - JWT access token
     * @returns Token payload if valid
     * @throws ServerAuthError if token is invalid
     */
    async verifyToken(token: string): Promise<TokenPayload> {
        // Check cache first
        const cached = this.tokenCache.get(token);
        if (cached && cached.expiresAt > Date.now()) {
            return cached.payload;
        }

        try {
            // Verify with remote endpoint
            const response = await fetch(`${this.config.baseUrl}/api/v1/auth/verify`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-App-Key': this.config.clientId,
                    'X-App-Secret': this.config.clientSecret,
                },
                body: JSON.stringify({ token }),
            });

            if (!response.ok) {
                const errorResponse = await response.json() as ApiErrorResponse;
                throw new ServerAuthError(
                    errorResponse.error?.code || ServerErrorCode.INVALID_TOKEN,
                    errorResponse.error?.message || 'Invalid token',
                    401
                );
            }

            const data = await response.json() as ApiSuccessResponse<TokenPayload>;
            const payload = data.data;

            // Cache the result (for 1 minute or until expiry, whichever is sooner)
            const cacheExpiry = Math.min(payload.exp * 1000, Date.now() + 60 * 1000);
            this.tokenCache.set(token, { payload, expiresAt: cacheExpiry });

            return payload;
        } catch (error) {
            if (error instanceof ServerAuthError) {
                throw error;
            }

            // Try local verification as fallback
            if (this.config.jwtPublicKey) {
                return this.verifyTokenLocally(token);
            }

            throw new ServerAuthError(
                ServerErrorCode.VERIFICATION_FAILED,
                error instanceof Error ? error.message : 'Token verification failed',
                401
            );
        }
    }

    /**
     * Verify token locally using JWT public key
     * 使用 JWT 公钥本地验证令牌
     */
    private async verifyTokenLocally(token: string): Promise<TokenPayload> {
        if (!this.config.jwtPublicKey) {
            throw new ServerAuthError(ServerErrorCode.NO_PUBLIC_KEY, 'JWT public key not configured', 500);
        }

        try {
            const publicKey = await jose.importSPKI(this.config.jwtPublicKey, 'RS256');
            const { payload } = await jose.jwtVerify(token, publicKey);

            return {
                sub: payload.sub as string,
                iss: payload.iss as string,
                aud: payload.aud as string | string[],
                iat: payload.iat as number,
                exp: payload.exp as number,
                scope: payload.scope as string | undefined,
                azp: payload.azp as string | undefined,
                phone: payload.phone as string | undefined,
                email: payload.email as string | undefined,
            };
        } catch (error) {
            throw new ServerAuthError(
                ServerErrorCode.INVALID_TOKEN,
                error instanceof Error ? error.message : 'Invalid token',
                401
            );
        }
    }

    // ============================================
    // OAuth2 Token Introspection (RFC 7662)
    // ============================================

    /**
     * Introspect a token (RFC 7662)
     * 内省令牌（RFC 7662 标准）
     * 
     * This is the standard way for resource servers to validate tokens.
     * 
     * @param token - The token to introspect
     * @param tokenTypeHint - Optional hint about the token type ('access_token' or 'refresh_token')
     * @returns Introspection result
     * 
     * @example
     * ```typescript
     * const result = await auth.introspectToken(accessToken);
     * if (result.active) {
     *   console.log('Token is valid, user:', result.sub);
     * }
     * ```
     */
    async introspectToken(token: string, tokenTypeHint?: 'access_token' | 'refresh_token'): Promise<IntrospectionResult> {
        try {
            // Use Basic Auth for client authentication
            const credentials = Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString('base64');

            const body: Record<string, string> = { token };
            if (tokenTypeHint) {
                body.token_type_hint = tokenTypeHint;
            }

            const response = await fetch(`${this.config.baseUrl}/api/v1/oauth2/introspect`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Basic ${credentials}`,
                },
                body: JSON.stringify(body),
            });

            const result = await response.json() as IntrospectionResult;
            return result;
        } catch (error) {
            // On network error, return inactive
            return { active: false };
        }
    }

    /**
     * Check if a token is active
     * 检查令牌是否有效
     * 
     * @param token - The token to check
     * @returns true if token is active
     */
    async isTokenActive(token: string): Promise<boolean> {
        const result = await this.introspectToken(token);
        return result.active;
    }

    // ============================================
    // User Management
    // ============================================

    /**
     * Get user info by ID
     * 根据 ID 获取用户信息
     */
    async getUser(userId: string): Promise<UserInfo> {
        const response = await fetch(`${this.config.baseUrl}/api/v1/admin/users/${userId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-App-Key': this.config.clientId,
                'X-App-Secret': this.config.clientSecret,
            },
        });

        if (!response.ok) {
            const errorResponse = await response.json() as ApiErrorResponse;
            throw new ServerAuthError(
                errorResponse.error?.code || ServerErrorCode.USER_NOT_FOUND,
                errorResponse.error?.message || 'User not found',
                response.status
            );
        }

        const data = await response.json() as ApiSuccessResponse<UserInfo>;
        return data.data;
    }

    // ============================================
    // Express/Connect Middleware
    // ============================================

    /**
     * Express/Connect middleware for authentication
     * Express/Connect 认证中间件
     * 
     * @example
     * ```typescript
     * import express from 'express';
     * 
     * const app = express();
     * app.use('/api/*', auth.middleware());
     * 
     * app.get('/api/profile', (req, res) => {
     *   res.json({ user: req.user });
     * });
     * ```
     */
    middleware() {
        return async (
            req: ExpressRequest,
            res: ExpressResponse,
            next: NextFunction
        ): Promise<void> => {
            const authHeader = req.headers['authorization'];

            if (!authHeader || typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
                res.status(401).json({
                    success: false,
                    error: {
                        code: ServerErrorCode.UNAUTHORIZED,
                        message: 'Authorization header is required / 需要授权头',
                    },
                });
                return;
            }

            const token = authHeader.substring(7);

            try {
                const payload = await this.verifyToken(token);

                // Attach payload to request
                req.authPayload = payload;

                // Optionally fetch full user info
                try {
                    req.user = await this.getUser(payload.sub);
                } catch {
                    // User info not required for middleware to pass
                }

                next();
            } catch (error) {
                const authError = error instanceof ServerAuthError ? error : new ServerAuthError(
                    ServerErrorCode.UNAUTHORIZED,
                    'Authentication failed',
                    401
                );
                res.status(authError.statusCode).json({
                    success: false,
                    error: {
                        code: authError.code,
                        message: authError.message,
                    },
                });
            }
        };
    }

    // ============================================
    // Hono Middleware
    // ============================================

    /**
     * Hono middleware for authentication
     * Hono 认证中间件
     * 
     * @example
     * ```typescript
     * import { Hono } from 'hono';
     * 
     * const app = new Hono();
     * app.use('/api/*', auth.honoMiddleware());
     * 
     * app.get('/api/profile', (c) => {
     *   const user = c.get('user');
     *   return c.json({ user });
     * });
     * ```
     */
    honoMiddleware(): HonoMiddlewareHandler {
        return async (c: HonoContext, next: () => Promise<void>): Promise<Response | void> => {
            const authHeader = c.req.header('authorization') || c.req.header('Authorization');

            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return c.json({
                    success: false,
                    error: {
                        code: ServerErrorCode.UNAUTHORIZED,
                        message: 'Authorization header is required / 需要授权头',
                    },
                }, 401);
            }

            const token = authHeader.substring(7);

            try {
                const payload = await this.verifyToken(token);

                // Attach to context
                c.set('authPayload', payload);

                // Optionally fetch full user info
                try {
                    const user = await this.getUser(payload.sub);
                    c.set('user', user);
                } catch {
                    // User info not required for middleware to pass
                }

                await next();
            } catch (error) {
                const authError = error instanceof ServerAuthError ? error : new ServerAuthError(
                    ServerErrorCode.UNAUTHORIZED,
                    'Authentication failed',
                    401
                );
                return c.json({
                    success: false,
                    error: {
                        code: authError.code,
                        message: authError.message,
                    },
                }, authError.statusCode);
            }
        };
    }

    // ============================================
    // Utility Methods
    // ============================================

    /**
     * Clear token cache
     * 清除令牌缓存
     */
    clearCache(): void {
        this.tokenCache.clear();
    }

    /**
     * Get cache statistics
     * 获取缓存统计
     */
    getCacheStats(): { size: number; entries: number } {
        return {
            size: this.tokenCache.size,
            entries: this.tokenCache.size,
        };
    }
}

// ============================================
// Legacy Compatibility
// ============================================

/** @deprecated Use ServerAuthError instead */
export interface AuthError extends Error {
    code: string;
    statusCode: number;
}

// Default export
export default UniAuthServer;
