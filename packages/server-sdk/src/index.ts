/**
 * UniAuth Server SDK
 * 统一认证后端 SDK
 *
 * Usage:
 * ```typescript
 * import { UniAuthServer } from '@uniauth/server-sdk';
 *
 * const auth = new UniAuthServer({
 *   baseUrl: 'https://auth.example.com',
 *   appKey: 'your-app-key',
 *   appSecret: 'your-app-secret',
 * });
 *
 * // Verify token
 * const payload = await auth.verifyToken(accessToken);
 *
 * // Express middleware
 * app.use('/api/*', auth.middleware());
 * ```
 */

import * as jose from 'jose';

// Types
export interface UniAuthServerConfig {
    /** API base URL */
    baseUrl: string;
    /** Application key */
    appKey: string;
    /** Application secret */
    appSecret: string;
    /** JWT public key (optional, for local verification) */
    jwtPublicKey?: string;
}

export interface TokenPayload {
    sub: string; // user id
    phone: string;
    iat: number;
    exp: number;
}

export interface UserInfo {
    id: string;
    phone: string;
    nickname: string | null;
    avatar_url: string | null;
    phone_verified: boolean;
}

export interface VerifyResult {
    valid: boolean;
    payload?: TokenPayload;
    error?: string;
}

export interface AuthError extends Error {
    code: string;
    statusCode: number;
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

/**
 * UniAuth Server SDK
 * 统一认证后端 SDK
 */
export class UniAuthServer {
    private config: UniAuthServerConfig;
    private tokenCache: Map<string, { payload: TokenPayload; expiresAt: number }> = new Map();

    constructor(config: UniAuthServerConfig) {
        this.config = config;
    }

    /**
     * Verify access token
     * 验证访问令牌
     *
     * @param token - JWT access token
     * @returns Token payload if valid
     * @throws AuthError if token is invalid
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
                    'X-App-Key': this.config.appKey,
                    'X-App-Secret': this.config.appSecret,
                },
                body: JSON.stringify({ token }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw this.createError(
                    error.error?.code || 'INVALID_TOKEN',
                    error.error?.message || 'Invalid token',
                    401
                );
            }

            const data = await response.json();
            const payload = data.data as TokenPayload;

            // Cache the result (for 1 minute or until expiry, whichever is sooner)
            const cacheExpiry = Math.min(payload.exp * 1000, Date.now() + 60 * 1000);
            this.tokenCache.set(token, { payload, expiresAt: cacheExpiry });

            return payload;
        } catch (error) {
            if ((error as AuthError).code) {
                throw error;
            }

            // Try local verification as fallback
            if (this.config.jwtPublicKey) {
                return this.verifyTokenLocally(token);
            }

            throw this.createError(
                'VERIFICATION_FAILED',
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
            throw this.createError('NO_PUBLIC_KEY', 'JWT public key not configured', 500);
        }

        try {
            const publicKey = await jose.importSPKI(this.config.jwtPublicKey, 'RS256');
            const { payload } = await jose.jwtVerify(token, publicKey);

            return {
                sub: payload.sub as string,
                phone: payload.phone as string,
                iat: payload.iat as number,
                exp: payload.exp as number,
            };
        } catch (error) {
            throw this.createError(
                'INVALID_TOKEN',
                error instanceof Error ? error.message : 'Invalid token',
                401
            );
        }
    }

    /**
     * Get user info by ID
     * 根据 ID 获取用户信息
     */
    async getUser(userId: string): Promise<UserInfo> {
        const response = await fetch(`${this.config.baseUrl}/api/v1/admin/users/${userId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-App-Key': this.config.appKey,
                'X-App-Secret': this.config.appSecret,
            },
        });

        if (!response.ok) {
            const error = await response.json();
            throw this.createError(
                error.error?.code || 'USER_NOT_FOUND',
                error.error?.message || 'User not found',
                response.status
            );
        }

        const data = await response.json();
        return data.data as UserInfo;
    }

    /**
     * Express/Hono middleware for authentication
     * Express/Hono 认证中间件
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
                        code: 'UNAUTHORIZED',
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
                const authError = error as AuthError;
                res.status(authError.statusCode || 401).json({
                    success: false,
                    error: {
                        code: authError.code || 'UNAUTHORIZED',
                        message: authError.message || 'Authentication failed / 认证失败',
                    },
                });
            }
        };
    }

    /**
     * Create an authentication error
     * 创建认证错误
     */
    private createError(code: string, message: string, statusCode: number): AuthError {
        const error = new Error(message) as AuthError;
        error.code = code;
        error.statusCode = statusCode;
        return error;
    }

    /**
     * Clear token cache
     * 清除令牌缓存
     */
    clearCache(): void {
        this.tokenCache.clear();
    }
}

// Default export
export default UniAuthServer;
