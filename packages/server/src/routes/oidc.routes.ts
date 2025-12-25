import { Hono } from 'hono';
import { verifyAccessToken } from '../lib/jwt.js';
import { getSupabase, TABLES } from '../lib/supabase.js';
import { env } from '../config/index.js';
import { oauth2Logger as logger } from '../lib/logger.js';
import type { HonoVariables } from '../types/index.js';
import { getJWKS } from '../lib/jwks.js';

const oidcRouter = new Hono<{ Variables: HonoVariables }>();

/**
 * GET /.well-known/jwks.json
 * JSON Web Key Set (JWKS) Endpoint
 * Returns public keys for verifying ID tokens
 */
oidcRouter.get('/.well-known/jwks.json', async (c) => {
    try {
        const jwks = await getJWKS();
        logger.info('JWKS endpoint accessed');
        return c.json(jwks);
    } catch (error) {
        logger.error('JWKS endpoint error', { error });
        return c.json({ error: 'Internal server error' }, 500);
    }
});

/**
 * GET /.well-known/openid-configuration
 * OpenID Provider Configuration Information
 * OIDC Discovery Document
 */
oidcRouter.get('/.well-known/openid-configuration', (c) => {
    const issuer = env.FRONTEND_URL?.replace(/:\d+$/, '') || 'https://auth.uniauth.com';
    const apiBase = `${issuer}/api/v1`;

    return c.json({
        issuer,
        authorization_endpoint: `${issuer}/oauth2/authorize`,
        token_endpoint: `${apiBase}/oauth2/token`,
        userinfo_endpoint: `${apiBase}/oauth2/userinfo`,
        jwks_uri: `${issuer}/.well-known/jwks.json`, // JWKS endpoint
        response_types_supported: ['code'],
        response_modes_supported: ['query'],
        grant_types_supported: ['authorization_code', 'client_credentials', 'refresh_token'],
        subject_types_supported: ['public'],
        id_token_signing_alg_values_supported: ['RS256'], // RSA with SHA-256
        scopes_supported: ['openid', 'profile', 'email', 'phone'],
        token_endpoint_auth_methods_supported: ['client_secret_post', 'client_secret_basic', 'none'],
        claims_supported: [
            'sub',
            'iss',
            'aud',
            'exp',
            'iat',
            'auth_time',
            'nonce',
            'email',
            'email_verified',
            'phone_number',
            'phone_verified',
            'name',
            'picture',
        ],
        code_challenge_methods_supported: ['S256', 'plain'],
        service_documentation: `${issuer}/docs`,
    });
});

/**
 * GET /userinfo
 * OIDC UserInfo Endpoint
 * Returns user profile information
 * 
 * Note: This route is mounted under /api/v1/oauth2 in index.ts
 * So full path will be: /api/v1/oauth2/userinfo
 */
oidcRouter.get('/userinfo', async (c) => {
    // Extract Bearer token from Authorization header
    const authHeader = c.req.header('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        logger.warn('Missing or invalid Authorization header');
        return c.json({ error: 'invalid_token' }, 401);
    }

    const token = authHeader.substring(7);

    try {
        // Verify access token
        const payload = await verifyAccessToken(token);

        if (!payload.sub) {
            return c.json({ error: 'invalid_token' }, 401);
        }

        // Fetch full user data from database
        const supabase = getSupabase();
        const { data: user, error } = await supabase
            .from(TABLES.USERS)
            .select('id, email, phone, email_verified, phone_verified, nickname, avatar_url, updated_at')
            .eq('id', payload.sub)
            .single();

        if (error || !user) {
            logger.warn('User not found for valid token', { sub: payload.sub });
            return c.json({ error: 'invalid_token' }, 401);
        }

        // Return standard OIDC UserInfo claims
        const userInfo: Record<string, unknown> = {
            sub: user.id,
        };

        // Add optional claims if present
        if (user.email) userInfo.email = user.email;
        if (user.email_verified !== undefined) userInfo.email_verified = user.email_verified;
        if (user.phone) userInfo.phone_number = user.phone;
        if (user.phone_verified !== undefined) userInfo.phone_verified = user.phone_verified;
        if (user.nickname) userInfo.name = user.nickname;
        if (user.avatar_url) userInfo.picture = user.avatar_url;
        if (user.updated_at) {
            userInfo.updated_at = Math.floor(new Date(user.updated_at).getTime() / 1000);
        }

        logger.info('UserInfo request successful', { sub: user.id, aud: payload.aud });

        return c.json(userInfo);
    } catch (e) {
        logger.warn('Token verification failed', { error: e });
        return c.json({ error: 'invalid_token' }, 401);
    }
});

export { oidcRouter };
