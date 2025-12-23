import { Context, Next, MiddlewareHandler } from 'hono';
import { verifyAccessToken } from '../lib/jwt.js';
import { userService } from '../services/user.service.js';
import { MESSAGES } from '../config/index.js';
import type { HonoVariables } from '../types/index.js';

/**
 * JWT Authentication Middleware
 * JWT 认证中间件
 *
 * Verifies the access token in the Authorization header
 * and attaches the user to the context.
 */
export function authMiddleware(): MiddlewareHandler<{ Variables: HonoVariables }> {
    return async (c: Context<{ Variables: HonoVariables }>, next: Next) => {
        const authHeader = c.req.header('Authorization');

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return c.json(
                {
                    success: false,
                    error: {
                        code: 'UNAUTHORIZED',
                        message: MESSAGES.ERROR.UNAUTHORIZED,
                    },
                },
                401
            );
        }

        const token = authHeader.substring(7);

        try {
            // Verify token
            const payload = await verifyAccessToken(token);

            // Get user from database
            const user = await userService.getUserById(payload.sub);

            if (!user) {
                return c.json(
                    {
                        success: false,
                        error: {
                            code: 'USER_NOT_FOUND',
                            message: MESSAGES.ERROR.USER_NOT_FOUND,
                        },
                    },
                    401
                );
            }

            if (user.status === 'suspended') {
                return c.json(
                    {
                        success: false,
                        error: {
                            code: 'USER_SUSPENDED',
                            message: MESSAGES.ERROR.USER_SUSPENDED,
                        },
                    },
                    403
                );
            }

            // Attach user and payload to context
            c.set('user', user);
            c.set('jwtPayload', payload);

            await next();
        } catch (error) {
            console.error('Auth middleware error:', error);

            // Check if token is expired
            if (error instanceof Error && error.message.includes('expired')) {
                return c.json(
                    {
                        success: false,
                        error: {
                            code: 'TOKEN_EXPIRED',
                            message: MESSAGES.ERROR.TOKEN_EXPIRED,
                        },
                    },
                    401
                );
            }

            return c.json(
                {
                    success: false,
                    error: {
                        code: 'INVALID_TOKEN',
                        message: MESSAGES.ERROR.INVALID_TOKEN,
                    },
                },
                401
            );
        }
    };
}

/**
 * Get client info from request
 * 从请求中获取客户端信息
 */
export function getClientInfo(c: Context): {
    ipAddress: string | undefined;
    userAgent: string | undefined;
    deviceInfo: { user_agent?: string; platform?: string };
} {
    const ipAddress =
        c.req.header('X-Forwarded-For')?.split(',')[0].trim() ||
        c.req.header('X-Real-IP') ||
        undefined;

    const userAgent = c.req.header('User-Agent');

    return {
        ipAddress,
        userAgent,
        deviceInfo: {
            user_agent: userAgent,
        },
    };
}
