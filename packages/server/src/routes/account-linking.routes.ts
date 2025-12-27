/**
 * Account Linking API Routes
 * Endpoints for managing linked social accounts
 */

import { Hono } from 'hono';
import { accountLinkingService } from '../services/account-linking.service.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { logger } from '../lib/logger.js';
import type { HonoVariables } from '../types/index.js';

const accountLinkingRouter = new Hono<{ Variables: HonoVariables }>();

// All routes require authentication
accountLinkingRouter.use('*', authMiddleware());

/**
 * GET /api/v1/account/linked-accounts
 * Get all linked social accounts for the current user
 */
accountLinkingRouter.get('/linked-accounts', async (c) => {
    const user = c.get('user');
    if (!user) {
        return c.json({ error: 'unauthorized' }, 401);
    }

    const accounts = await accountLinkingService.getLinkedAccounts(user.id);
    const availableProviders = await accountLinkingService.getAvailableProviders(user.id);

    return c.json({
        linked_accounts: accounts.map(a => ({
            provider: a.provider,
            provider_email: a.provider_email,
            linked_at: a.created_at,
        })),
        available_providers: availableProviders,
    });
});

/**
 * POST /api/v1/account/link
 * Link a new social account (requires OAuth callback data)
 */
accountLinkingRouter.post('/link', async (c) => {
    const user = c.get('user');
    if (!user) {
        return c.json({ error: 'unauthorized' }, 401);
    }

    const body = await c.req.json();
    const { provider, provider_user_id, provider_email, provider_data } = body;

    if (!provider || !provider_user_id) {
        return c.json({
            error: 'invalid_request',
            error_description: 'provider and provider_user_id are required',
        }, 400);
    }

    const result = await accountLinkingService.linkAccount(
        user.id,
        provider,
        provider_user_id,
        provider_email,
        provider_data
    );

    if (!result.success) {
        return c.json({
            error: 'link_failed',
            error_description: result.conflict?.message,
            conflict: result.conflict,
        }, 409);
    }

    logger.info('Account linked via API', { userId: user.id, provider });
    return c.json({
        success: true,
        account: {
            provider: result.account?.provider,
            provider_email: result.account?.provider_email,
            linked_at: result.account?.created_at,
        },
    });
});

/**
 * DELETE /api/v1/account/link/:provider
 * Unlink a social account
 */
accountLinkingRouter.delete('/link/:provider', async (c) => {
    const user = c.get('user');
    if (!user) {
        return c.json({ error: 'unauthorized' }, 401);
    }

    const provider = c.req.param('provider');

    const result = await accountLinkingService.unlinkAccount(user.id, provider);

    if (!result.success) {
        return c.json({
            error: 'unlink_failed',
            error_description: result.error,
        }, 400);
    }

    logger.info('Account unlinked via API', { userId: user.id, provider });
    return c.json({ success: true });
});

/**
 * GET /api/v1/account/link/check/:provider
 * Check if a provider account can be linked (no conflicts)
 */
accountLinkingRouter.get('/link/check/:provider', async (c) => {
    const user = c.get('user');
    if (!user) {
        return c.json({ error: 'unauthorized' }, 401);
    }

    const provider = c.req.param('provider');
    const providerUserId = c.req.query('provider_user_id');

    if (!providerUserId) {
        return c.json({
            error: 'invalid_request',
            error_description: 'provider_user_id query parameter is required',
        }, 400);
    }

    const existingLink = await accountLinkingService.findExistingLink(provider, providerUserId);

    if (existingLink) {
        if (existingLink.user_id === user.id) {
            return c.json({ can_link: false, reason: 'already_linked_to_you' });
        }
        return c.json({ can_link: false, reason: 'linked_to_another_user' });
    }

    return c.json({ can_link: true });
});

/**
 * POST /api/v1/account/link-oauth
 * Link a new social account securely (exchanges code server-side)
 */
accountLinkingRouter.post('/link-oauth', async (c) => {
    const user = c.get('user');
    if (!user) {
        return c.json({ error: 'unauthorized' }, 401);
    }

    const body = await c.req.json();
    const { provider, code, redirect_uri } = body;

    if (!provider || !code) {
        return c.json({
            error: 'invalid_request',
            error_description: 'provider and code are required',
        }, 400);
    }

    try {
        // Dynamic import to avoid circular dependencies if any,
        // though strictly not needed if structure is clean.
        // Importing standard services.
        const { exchangeOAuthCode, getOAuthUserInfo } = await import('../lib/oauth.js');
        const { getSupabase } = await import('../lib/supabase.js'); // Ensure we can check for existing accounts here if needed, but service does it.

        // 1. Exchange code for tokens
        const oauthTokens = await exchangeOAuthCode(provider, code, redirect_uri);
        if (!oauthTokens) {
            return c.json({
                error: 'oauth_error',
                error_description: 'Failed to exchange authentication code',
            }, 400);
        }

        // 2. Get user info from provider
        const oauthUserInfo = await getOAuthUserInfo(provider, oauthTokens.accessToken, undefined, oauthTokens.idToken);
        if (!oauthUserInfo) {
            return c.json({
                error: 'oauth_error',
                error_description: 'Failed to get user info from provider',
            }, 400);
        }

        // 3. Link the account using the verified info
        const result = await accountLinkingService.linkAccount(
            user.id,
            provider,
            oauthUserInfo.id,
            oauthUserInfo.email || undefined,
            oauthUserInfo.raw || undefined
        );

        if (!result.success) {
            return c.json({
                error: 'link_failed',
                error_description: result.conflict?.message,
                conflict: result.conflict,
            }, 409);
        }

        logger.info('Account linked via secure OAuth', { userId: user.id, provider });
        return c.json({
            success: true,
            account: {
                provider: result.account?.provider,
                provider_email: result.account?.provider_email,
                linked_at: result.account?.created_at,
            },
        });

    } catch (error) {
        logger.error('Secure account linking failed', { userId: user.id, provider, error });
        return c.json({
            error: 'internal_error',
            error_description: 'An unexpected error occurred during account linking',
        }, 500);
    }
});

export { accountLinkingRouter };
