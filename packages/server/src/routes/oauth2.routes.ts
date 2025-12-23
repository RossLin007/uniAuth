import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { oauth2Service } from '../services/oauth2.service.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { oauth2Logger as logger } from '../lib/logger.js';
import type { HonoVariables } from '../types/index.js';

const oauth2Router = new Hono<{ Variables: HonoVariables }>();

// ============================================
// Validation Schemas
// ============================================

const validateQuerySchema = z.object({
    client_id: z.string(),
    redirect_uri: z.string().url(),
    scope: z.string().optional(),
    response_type: z.literal('code'),
    state: z.string().optional(),
    // PKCE parameters (optional, required for public clients)
    code_challenge: z.string().min(43).max(128).optional(),
    code_challenge_method: z.enum(['S256', 'plain']).optional(),
});

const authorizeBodySchema = z.object({
    client_id: z.string(),
    redirect_uri: z.string().url(),
    scope: z.string().optional(),
    response_type: z.literal('code'),
    state: z.string().optional(),
    // PKCE parameters
    code_challenge: z.string().min(43).max(128).optional(),
    code_challenge_method: z.enum(['S256', 'plain']).optional(),
});

const tokenFormSchema = z.object({
    grant_type: z.literal('authorization_code'),
    client_id: z.string(),
    client_secret: z.string().optional(), // Optional for public clients using PKCE
    code: z.string(),
    redirect_uri: z.string().url(),
    // PKCE code_verifier
    code_verifier: z.string().min(43).max(128).optional(),
});

const tokenJsonSchema = z.object({
    grant_type: z.literal('authorization_code'),
    client_id: z.string(),
    client_secret: z.string().optional(),
    code: z.string(),
    redirect_uri: z.string().url(),
    code_verifier: z.string().min(43).max(128).optional(),
});

// ============================================
// Routes
// ============================================

/**
 * GET /oauth2/validate
 * Validate client request (used by frontend authorization page)
 * 验证客户端请求（供前端授权页面使用）
 */
oauth2Router.get(
    '/validate',
    zValidator('query', validateQuerySchema),
    async (c) => {
        const query = c.req.valid('query');
        const app = await oauth2Service.validateClient(query.client_id, query.redirect_uri);

        if (!app) {
            logger.warn('Client validation failed', {
                clientId: query.client_id
            });
            return c.json({
                success: false,
                error: {
                    code: 'invalid_client',
                    message: 'Invalid client_id or redirect_uri mismatch / 无效的客户端ID或回调地址不匹配'
                }
            }, 400);
        }

        // Check if public client requires PKCE
        if (app.is_public && !query.code_challenge) {
            return c.json({
                success: false,
                error: {
                    code: 'invalid_request',
                    message: 'Public clients must use PKCE (code_challenge required) / 公共客户端必须使用 PKCE'
                }
            }, 400);
        }

        return c.json({
            success: true,
            data: {
                application: {
                    name: app.name,
                    logo_url: app.logo_url,
                    description: app.description,
                    homepage_url: app.homepage_url,
                    is_trusted: app.is_trusted,
                    is_public: app.is_public,
                },
                scope: query.scope,
                state: query.state,
                pkce_required: app.is_public,
            }
        });
    }
);

/**
 * POST /oauth2/authorize
 * User approves the authorization (must be authenticated)
 * 用户同意授权（需要认证）
 */
oauth2Router.post(
    '/authorize',
    authMiddleware(),
    zValidator('json', authorizeBodySchema),
    async (c) => {
        const body = c.req.valid('json');
        const user = c.get('user');

        // 1. Validate Client again (security)
        const app = await oauth2Service.validateClient(body.client_id, body.redirect_uri);
        if (!app) {
            return c.json({
                success: false,
                error: { code: 'invalid_request', message: 'Invalid application' }
            }, 400);
        }

        // 2. Check PKCE requirement for public clients
        if (app.is_public && !body.code_challenge) {
            return c.json({
                success: false,
                error: {
                    code: 'invalid_request',
                    message: 'Public clients must use PKCE'
                }
            }, 400);
        }

        // 3. Create Authorization Code with optional PKCE
        const code = await oauth2Service.createAuthorizationCode(
            user.id,
            app.client_id,
            body.redirect_uri,
            body.scope,
            body.code_challenge,
            body.code_challenge_method
        );

        // 4. Construct Redirect URL
        const redirectUrl = new URL(body.redirect_uri);
        redirectUrl.searchParams.set('code', code);
        if (body.state) {
            redirectUrl.searchParams.set('state', body.state);
        }

        logger.info('Authorization code issued', {
            clientId: body.client_id,
            userId: user.id,
            hasPKCE: !!body.code_challenge
        });

        return c.json({
            success: true,
            data: {
                redirect_url: redirectUrl.toString()
            }
        });
    }
);

/**
 * POST /oauth2/token
 * Exchange authorization code for tokens (back-channel)
 * 使用授权码换取令牌（后端通道）
 * 
 * Supports both form-urlencoded (standard) and JSON bodies
 */
oauth2Router.post(
    '/token',
    async (c) => {
        // Try to parse as form or JSON
        let data: z.infer<typeof tokenFormSchema>;

        const contentType = c.req.header('Content-Type') || '';

        if (contentType.includes('application/json')) {
            const body = await c.req.json();
            const result = tokenJsonSchema.safeParse(body);
            if (!result.success) {
                return c.json({
                    error: 'invalid_request',
                    error_description: 'Invalid request parameters'
                }, 400);
            }
            data = result.data;
        } else {
            // Default to form-urlencoded
            const formData = await c.req.parseBody();
            const result = tokenFormSchema.safeParse(formData);
            if (!result.success) {
                return c.json({
                    error: 'invalid_request',
                    error_description: 'Invalid request parameters'
                }, 400);
            }
            data = result.data;
        }

        try {
            const tokenResponse = await oauth2Service.exchangeCode(
                data.client_id,
                data.client_secret || null,
                data.code,
                data.redirect_uri,
                data.code_verifier
            );

            // Return standard OAuth2 token response
            return c.json(tokenResponse);
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'invalid_request';

            logger.warn('Token exchange failed', {
                clientId: data.client_id,
                error: errorMessage
            });

            return c.json({
                error: errorMessage,
                error_description: getErrorDescription(errorMessage)
            }, 400);
        }
    }
);

/**
 * GET /oauth2/userinfo
 * OIDC-compatible userinfo endpoint
 * 符合 OIDC 标准的用户信息端点
 */
oauth2Router.get(
    '/userinfo',
    authMiddleware(),
    async (c) => {
        const user = c.get('user');

        // Return standard OIDC claims
        return c.json({
            sub: user.id,
            name: user.nickname,
            preferred_username: user.nickname,
            email: user.email,
            email_verified: user.email_verified,
            phone_number: user.phone,
            phone_number_verified: user.phone_verified,
            picture: user.avatar_url,
            updated_at: user.updated_at
        });
    }
);

/**
 * POST /oauth2/revoke
 * Revoke tokens for a client (optional endpoint)
 * 撤销客户端令牌（可选端点）
 */
oauth2Router.post(
    '/revoke',
    authMiddleware(),
    zValidator('json', z.object({
        client_id: z.string(),
    })),
    async (c) => {
        const { client_id } = c.req.valid('json');
        const user = c.get('user');

        await oauth2Service.revokeClientTokens(client_id, user.id);

        return c.json({
            success: true,
            message: 'Tokens revoked'
        });
    }
);

// ============================================
// Helper Functions
// ============================================

/**
 * Get human-readable error description
 */
function getErrorDescription(errorCode: string): string {
    const descriptions: Record<string, string> = {
        'invalid_client': 'Client authentication failed / 客户端认证失败',
        'invalid_grant': 'Authorization code is invalid, expired, or has been used / 授权码无效、已过期或已被使用',
        'invalid_request': 'The request is missing a required parameter / 请求缺少必需的参数',
        'unauthorized_client': 'The client is not authorized / 客户端未获授权',
        'access_denied': 'Access denied / 访问被拒绝',
        'user_not_found': 'User not found / 用户不存在',
    };

    return descriptions[errorCode] || 'An error occurred / 发生错误';
}

export { oauth2Router };
