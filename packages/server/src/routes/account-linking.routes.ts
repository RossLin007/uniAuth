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

export { accountLinkingRouter };
