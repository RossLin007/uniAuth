import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { getCookie } from 'hono/cookie';
import { oauth2Service } from '../services/oauth2.service.js';
import { ssoSessionService } from '../services/sso.service.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { oauth2Logger as logger } from '../lib/logger.js';
import { env } from '../config/index.js';
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
    nonce: z.string().optional(), // OIDC nonce
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
    nonce: z.string().optional(), // OIDC nonce
    // PKCE parameters
    code_challenge: z.string().min(43).max(128).optional(),
    code_challenge_method: z.enum(['S256', 'plain']).optional(),
});

const tokenRequestSchema = z.discriminatedUnion('grant_type', [
    z.object({
        grant_type: z.literal('authorization_code'),
        client_id: z.string(),
        client_secret: z.string().optional(),
        code: z.string(),
        redirect_uri: z.string().url(),
        code_verifier: z.string().optional(),
    }),
    z.object({
        grant_type: z.literal('client_credentials'),
        client_id: z.string(),
        client_secret: z.string(),
        scope: z.string().optional(),
    }),
    z.object({
        grant_type: z.literal('refresh_token'),
        client_id: z.string(),
        client_secret: z.string().optional(),
        refresh_token: z.string(),
    })
]);

const introspectSchema = z.object({
    token: z.string(),
    token_type_hint: z.enum(['access_token', 'refresh_token']).optional(),
});

// ============================================
// Routes
// ============================================

/**
 * GET /oauth2/authorize
 * OAuth 2.0 Authorization Endpoint with SSO Support
 * OAuth 2.0 授权端点，支持 SSO 静默登录
 * 
 * Flow:
 * 1. Validate client and redirect_uri
 * 2. Check for existing SSO session (via cookie)
 * 3. If SSO session exists + trusted app → Silent auth (auto-redirect with code)
 * 4. If SSO session exists + untrusted app → Show consent page
 * 5. If no SSO session → Redirect to login page
 */
oauth2Router.get(
    '/authorize',
    zValidator('query', validateQuerySchema),
    async (c) => {
        const query = c.req.valid('query');

        // 1. Validate Client
        const app = await oauth2Service.validateClient(query.client_id, query.redirect_uri);
        if (!app) {
            logger.warn('Authorization failed: invalid client', { clientId: query.client_id });
            // Return error page or redirect with error
            const errorUrl = new URL(query.redirect_uri);
            errorUrl.searchParams.set('error', 'invalid_client');
            errorUrl.searchParams.set('error_description', 'Invalid client_id or redirect_uri');
            if (query.state) errorUrl.searchParams.set('state', query.state);
            return c.redirect(errorUrl.toString());
        }

        // 2. Check PKCE requirement for public clients
        if (app.is_public && !query.code_challenge) {
            const errorUrl = new URL(query.redirect_uri);
            errorUrl.searchParams.set('error', 'invalid_request');
            errorUrl.searchParams.set('error_description', 'Public clients must use PKCE');
            if (query.state) errorUrl.searchParams.set('state', query.state);
            return c.redirect(errorUrl.toString());
        }

        // 3. Check for SSO session cookie
        const sessionToken = getCookie(c, ssoSessionService.getCookieName());

        if (sessionToken) {
            const session = await ssoSessionService.getSessionByToken(sessionToken);

            if (session) {
                logger.info('SSO session found, processing silent auth', {
                    userId: session.user_id,
                    clientId: query.client_id,
                    isTrusted: app.is_trusted
                });

                // User is logged in via SSO!
                // For trusted apps (first-party), perform silent auth
                // For untrusted apps, we could show consent page, but for now we allow it
                // since user explicitly clicked "login" in the client app

                try {
                    // Create authorization code
                    const code = await oauth2Service.createAuthorizationCode(
                        session.user_id,
                        query.client_id,
                        query.redirect_uri,
                        query.scope,
                        query.code_challenge,
                        query.code_challenge_method,
                        query.nonce
                    );

                    // Add this app to the SSO session
                    await ssoSessionService.addAppToSession(session.id, app.id);

                    // Redirect back to client with code
                    const redirectUrl = new URL(query.redirect_uri);
                    redirectUrl.searchParams.set('code', code);
                    if (query.state) redirectUrl.searchParams.set('state', query.state);

                    logger.info('Silent auth successful, redirecting with code', {
                        clientId: query.client_id,
                        userId: session.user_id
                    });

                    return c.redirect(redirectUrl.toString());
                } catch (error) {
                    logger.error('Failed to create authorization code for silent auth', { error });
                    // Fall through to login redirect
                }
            }
        }

        // 4. No SSO session or session invalid → Redirect to login page
        // Pass all OAuth params so they can be preserved through login flow
        const loginUrl = new URL(`${env.SSO_FRONTEND_URL}/login`);
        loginUrl.searchParams.set('client_id', query.client_id);
        loginUrl.searchParams.set('redirect_uri', query.redirect_uri);
        loginUrl.searchParams.set('response_type', query.response_type);
        if (query.scope) loginUrl.searchParams.set('scope', query.scope);
        if (query.state) loginUrl.searchParams.set('state', query.state);
        if (query.nonce) loginUrl.searchParams.set('nonce', query.nonce);
        if (query.code_challenge) loginUrl.searchParams.set('code_challenge', query.code_challenge);
        if (query.code_challenge_method) loginUrl.searchParams.set('code_challenge_method', query.code_challenge_method);

        logger.info('No SSO session, redirecting to login', { clientId: query.client_id });

        return c.redirect(loginUrl.toString());
    }
);

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

        // 3. Create Authorization Code with optional PKCE and nonce
        const code = await oauth2Service.createAuthorizationCode(
            user.id,
            app.client_id,
            body.redirect_uri,
            body.scope,
            body.code_challenge,
            body.code_challenge_method,
            body.nonce
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
        // Handle both JSON and Form Data with the same schema
        let data: z.infer<typeof tokenRequestSchema>;
        try {
            const contentType = c.req.header('Content-Type') || '';

            if (contentType.includes('application/json')) {
                const jsonBody = await c.req.json();
                data = tokenRequestSchema.parse(jsonBody);
            } else {
                const body = await c.req.parseBody();
                data = tokenRequestSchema.parse(body);
            }
        } catch (e) {
            logger.warn('Token request validation failed', { error: e });
            return c.json({
                error: 'invalid_request',
                error_description: 'Invalid request parameters or format / 请求参数或格式无效'
            }, 400);
        }

        try {
            // Handle different grant types
            if (data.grant_type === 'authorization_code') {
                const tokenResponse = await oauth2Service.exchangeCode(
                    data.client_id,
                    data.client_secret || null,
                    data.code,
                    data.redirect_uri,
                    data.code_verifier
                );
                return c.json(tokenResponse);
            } else if (data.grant_type === 'client_credentials') {
                const tokenResponse = await oauth2Service.issueClientCredentialsToken(
                    data.client_id,
                    data.client_secret,
                    data.scope
                );
                return c.json(tokenResponse);
            } else if (data.grant_type === 'refresh_token') {
                // Reuse existing authService for refresh token but validation needed
                // Currently authService.refreshToken only takes token string
                // We should ideally move refresh logic to oauth2Service for third party
                // or just call it here if it supports M2M refresh (usually M2M tokens don't have refresh tokens by default but if they do...)
                // For now, let's stick to M2M implementation as priority.
                return c.json({ error: 'unsupported_grant_type' }, 400);
            }

            return c.json({ error: 'unsupported_grant_type' }, 400);

        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'invalid_request';

            logger.warn('Token exchange failed', {
                clientId: data.client_id,
                grantType: data.grant_type,
                error: errorMessage
            });

            return c.json({
                error: errorMessage,
                error_description: getErrorDescription(errorMessage),
                error_hint: getErrorHint(errorMessage, data.grant_type),
            }, 400);
        }
    }
);

/**
 * POST /oauth2/introspect
 * RFC 7662 Token Introspection
 * 令牌内省（资源服务器验证 Token）
 */
oauth2Router.post(
    '/introspect',
    async (c) => {
        // Basic Auth or Post Body for Client Auth
        let clientId: string | undefined;
        let clientSecret: string | undefined;

        // 1. Try Basic Auth
        const authHeader = c.req.header('Authorization');
        if (authHeader && authHeader.startsWith('Basic ')) {
            const token = authHeader.split(' ')[1];
            const decoded = Buffer.from(token, 'base64').toString().split(':');
            clientId = decoded[0];
            clientSecret = decoded[1];
        }

        // 2. Parse Body
        let body: any = {};
        try {
            const contentType = c.req.header('Content-Type') || '';
            if (contentType.includes('application/json')) {
                body = await c.req.json();
            } else {
                body = await c.req.parseBody();
            }
        } catch (e) {
            // Ignore parse error, body stays empty
        }

        const data = introspectSchema.safeParse(body);

        if (!data.success) {
            return c.json({ active: false }, 400);
        }

        // 3. Fallback to Body usage for client auth if not in header
        if (!clientId && body['client_id']) clientId = body['client_id'] as string;
        if (!clientSecret && body['client_secret']) clientSecret = body['client_secret'] as string;

        if (!clientId || !clientSecret) {
            return c.json({ active: false, error: 'unauthorized_client' }, 401);
        }

        try {
            // Validate Resource Server Credentials
            // Reusing issueClientCredentialsToken logic parts or creating new validation method
            // For introspection, the caller is a resource server (which is also a client)
            const tokenResponse = await oauth2Service.issueClientCredentialsToken(
                clientId,
                clientSecret
                // No scope needed for validation check itself
            );
            // If this throws, credentials are invalid
        } catch (e) {
            return c.json({ active: false }, 401);
        }

        // Verify the token
        try {
            // Import verifyAccessToken locally to avoid circular dep if any
            const { verifyAccessToken } = await import('../lib/jwt.js');
            const payload = await verifyAccessToken(data.data.token);

            // Return introspection response
            return c.json({
                active: true,
                scope: payload.scope,
                client_id: payload.azp || payload.aud, // azp is authorized party
                username: payload.sub, // for M2M sub is client_id
                token_type: 'Bearer',
                exp: payload.exp,
                iat: payload.iat,
                iss: payload.iss,
                sub: payload.sub,
                aud: payload.aud
            });
        } catch (e) {
            return c.json({ active: false });
        }
    }
);


function getErrorDescription(errorCode: string): string {
    const descriptions: Record<string, string> = {
        'invalid_client': 'Client authentication failed. Check client_id and client_secret / 客户端认证失败，请检查 client_id 和 client_secret',
        'invalid_grant': 'Authorization code is invalid, expired, or has been used / 授权码无效、已过期或已被使用',
        'invalid_request': 'The request is missing a required parameter / 请求缺少必需的参数',
        'unauthorized_client': 'The client is not authorized for this grant type / 客户端未获授权使用此授权类型',
        'access_denied': 'Access denied / 访问被拒绝',
        'user_not_found': 'User not found / 用户不存在',
        'invalid_scope': 'The requested scope is invalid / 请求的权限范围无效',
        'redirect_uri_mismatch': 'Redirect URI does not match registered value / 回调地址与注册值不匹配',
        'unsupported_grant_type': 'The grant type is not supported / 不支持的授权类型',
    };

    return descriptions[errorCode] || 'An error occurred / 发生错误';
}

function getErrorHint(errorCode: string, grantType?: string): string {
    const hints: Record<string, string> = {
        'invalid_client': 'Verify: (1) client_id matches Developer Console, (2) client_secret is correct, (3) for WEB (Confidential) apps, exchange tokens from your backend, not the browser',
        'invalid_grant': 'Authorization codes expire after 10 minutes and are single-use. Request a new code if this one has expired',
        'invalid_request': 'Ensure all required fields are present: grant_type, client_id, code, redirect_uri',
        'unauthorized_client': `This client is not authorized to use grant_type="${grantType || 'unknown'}". Check your app type in the Developer Console`,
        'access_denied': 'The user or server denied the request. Check CORS_ORIGINS on your UniAuth server if calling from a browser',
        'redirect_uri_mismatch': 'redirect_uri must EXACTLY match the registered URI (protocol + domain + port + path). Check the Developer Console',
        'unsupported_grant_type': 'Supported grant types: authorization_code, client_credentials. Check your grant_type parameter',
    };

    return hints[errorCode] || 'Check the API documentation at https://sso.55387.xyz/docs';
}

export { oauth2Router };
