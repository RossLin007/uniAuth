/**
 * Client Authentication Middleware
 * 客户端认证中间件
 *
 * Validates client_id and client_secret for Trusted Client API
 * 验证 Trusted Client API 的 client_id 和 client_secret
 */

import { Context, Next, MiddlewareHandler } from 'hono';
import { getSupabase, TABLES } from '../lib/supabase.js';
import { verifyClientSecret } from '../lib/crypto.js';
import type { HonoVariables, Application, ApplicationExtended, GrantType } from '../types/index.js';

// Extended HonoVariables to include application
export interface TrustedClientVariables extends HonoVariables {
    application: ApplicationExtended;
}

/**
 * Client Authentication Middleware
 * 客户端认证中间件
 *
 * Verifies client_id and client_secret from request body or headers
 * 从请求体或请求头验证 client_id 和 client_secret
 */
export function clientAuthMiddleware(
    requiredGrant: GrantType = 'trusted_client'
): MiddlewareHandler<{ Variables: TrustedClientVariables }> {
    return async (c: Context<{ Variables: TrustedClientVariables }>, next: Next) => {
        try {
            // Get credentials from body or headers
            let clientId: string | undefined;
            let clientSecret: string | undefined;

            // Try to get from body first (for POST requests)
            if (c.req.method === 'POST') {
                try {
                    const body = await c.req.json();
                    clientId = body.client_id;
                    clientSecret = body.client_secret;
                } catch {
                    // Body parsing failed, try headers
                }
            }

            // Fall back to headers
            if (!clientId) {
                clientId = c.req.header('X-Client-Id') || c.req.header('x-client-id');
            }
            if (!clientSecret) {
                clientSecret = c.req.header('X-Client-Secret') || c.req.header('x-client-secret');
            }

            // Validate presence
            if (!clientId) {
                return c.json(
                    {
                        success: false,
                        error: {
                            code: 'MISSING_CLIENT_ID',
                            message: 'client_id is required / client_id 是必填项',
                        },
                    },
                    400
                );
            }

            if (!clientSecret) {
                return c.json(
                    {
                        success: false,
                        error: {
                            code: 'MISSING_CLIENT_SECRET',
                            message: 'client_secret is required / client_secret 是必填项',
                        },
                    },
                    400
                );
            }

            // Fetch application from database
            const supabase = getSupabase();
            const { data: app, error } = await supabase
                .from(TABLES.APPLICATIONS)
                .select('*')
                .eq('client_id', clientId)
                .single<ApplicationExtended>();

            if (error || !app) {
                return c.json(
                    {
                        success: false,
                        error: {
                            code: 'INVALID_CLIENT',
                            message: 'Invalid client_id / 无效的 client_id',
                        },
                    },
                    401
                );
            }

            // Check if application is active
            if (app.status !== 'active') {
                return c.json(
                    {
                        success: false,
                        error: {
                            code: 'CLIENT_SUSPENDED',
                            message: 'Application is suspended / 应用已被暂停',
                        },
                    },
                    403
                );
            }

            // Check if application allows the required grant type
            const allowedGrants = app.allowed_grants || ['authorization_code'];
            if (!allowedGrants.includes(requiredGrant)) {
                return c.json(
                    {
                        success: false,
                        error: {
                            code: 'GRANT_NOT_ALLOWED',
                            message: `This application is not authorized for ${requiredGrant} / 此应用未授权使用 ${requiredGrant}`,
                        },
                    },
                    403
                );
            }

            // Verify client_secret
            let isSecretValid = false;

            if (app.client_secret_hash) {
                // Verify against bcrypt hash (preferred)
                isSecretValid = await verifyClientSecret(clientSecret, app.client_secret_hash);
            } else if (app.client_secret) {
                // Legacy: plain text comparison
                isSecretValid = app.client_secret === clientSecret;
            }

            if (!isSecretValid) {
                return c.json(
                    {
                        success: false,
                        error: {
                            code: 'INVALID_CLIENT_SECRET',
                            message: 'Invalid client_secret / 无效的 client_secret',
                        },
                    },
                    401
                );
            }

            // Attach application to context
            c.set('application', app);

            await next();
        } catch (error) {
            console.error('Client auth middleware error:', error);
            return c.json(
                {
                    success: false,
                    error: {
                        code: 'AUTH_ERROR',
                        message: 'Client authentication failed / 客户端认证失败',
                    },
                },
                500
            );
        }
    };
}

/**
 * Get application from context
 * 从上下文获取应用信息
 */
export function getApplication(c: Context<{ Variables: TrustedClientVariables }>): ApplicationExtended {
    return c.get('application');
}
