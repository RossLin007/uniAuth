import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { getSupabase, TABLES } from '../lib/supabase.js';
import { logger } from '../lib/logger.js';
import { v4 as uuidv4 } from 'uuid';
import { randomBytes } from 'crypto';
import type { HonoVariables } from '../types/index.js';
import { webhookService } from '../services/webhook.service.js';
import { claimsService } from '../services/claims.service.js';
import * as brandingService from '../services/branding.service.js';

const developerRouter = new Hono<{ Variables: HonoVariables }>();

// ============================================
// Validation Schemas
// ============================================

const createAppSchema = z.object({
    name: z.string().min(2).max(50),
    description: z.string().max(200).optional(),
    app_type: z.enum(['web', 'spa', 'native', 'm2m']).default('web'),
    redirect_uris: z.array(z.string().url()).optional(),
    homepage_url: z.string().url().optional(),
    logo_url: z.string().url().optional(),
});

const updateAppSchema = z.object({
    name: z.string().min(2).max(50).optional(),
    description: z.string().max(200).optional(),
    redirect_uris: z.array(z.string().url()).optional(),
    homepage_url: z.string().url().optional(),
    logo_url: z.string().url().optional(),
});

// Helper to generate credentials
const createWebhookSchema = z.object({
    url: z.string().url(),
    events: z.array(z.string()).min(1),
    secret: z.string().optional(),
    description: z.string().max(255).optional(),
    is_active: z.boolean().default(true)
});

const testWebhookSchema = z.object({
    event: z.string(),
    payload: z.record(z.any()).optional().default({})
});

const createClaimSchema = z.object({
    claim_name: z.string().min(2).max(50),
    claim_source: z.enum(['user_attribute', 'static', 'computed']),
    source_field: z.string().max(255).optional(),
    static_value: z.string().optional(),
    computed_expression: z.string().optional(),
    transform_function: z.enum(['none', 'uppercase', 'lowercase', 'hash_sha256', 'base64_encode', 'json_stringify']).default('none'),
    required_scope: z.string().optional(),
    enabled: z.boolean().default(true)
});

const updateClaimSchema = z.object({
    claim_name: z.string().min(2).max(50).optional(),
    claim_source: z.enum(['user_attribute', 'static', 'computed']).optional(),
    source_field: z.string().max(255).optional(),
    static_value: z.string().optional(),
    computed_expression: z.string().optional(),
    transform_function: z.enum(['none', 'uppercase', 'lowercase', 'hash_sha256', 'base64_encode', 'json_stringify']).optional(),
    required_scope: z.string().optional(),
    enabled: z.boolean().optional()
});

// Helper to generate credentials
function generateCredentials() {
    const clientId = 'ua_' + randomBytes(16).toString('hex');
    const clientSecret = 'sec_' + randomBytes(32).toString('hex');
    return { clientId, clientSecret };
}

// ============================================
// Routes
// ============================================

/**
 * GET /developer/apps
 * List user's applications
 */
developerRouter.get(
    '/apps',
    authMiddleware(),
    async (c) => {
        const user = c.get('user');
        const supabase = getSupabase();

        const { data, error } = await supabase
            .from(TABLES.APPLICATIONS)
            .select('*')
            .eq('owner_id', user.id)
            .order('created_at', { ascending: false });

        if (error) {
            logger.error('Failed to list apps', { userId: user.id, error });
            return c.json({ error: 'Internal server error' }, 500);
        }

        // Mask secrets in list view
        const apps = data.map(app => ({
            ...app,
            client_secret: '********'
        }));

        return c.json({ success: true, data: apps });
    }
);

/**
 * POST /developer/apps
 * Create a new application
 */
developerRouter.post(
    '/apps',
    authMiddleware(),
    zValidator('json', createAppSchema),
    async (c) => {
        const body = c.req.valid('json');
        const user = c.get('user');
        const supabase = getSupabase();

        const { clientId, clientSecret } = generateCredentials();

        // Determine allowed grants based on app type
        let allowedGrants = ['authorization_code'];
        if (body.app_type === 'spa' || body.app_type === 'native') {
            // SPA/Native public clients usually just use auth code + pkce
            // Maybe implicit if needed, but we prefer auth code
        } else if (body.app_type === 'm2m') {
            allowedGrants = ['client_credentials'];
        }

        const newApp = {
            name: body.name,
            description: body.description,
            client_id: clientId,
            client_secret: clientSecret, // Store plain for MVP, preferably hash in prod
            redirect_uris: body.redirect_uris || [],
            app_type: body.app_type,
            allowed_grants: allowedGrants,
            owner_id: user.id,
            homepage_url: body.homepage_url,
            logo_url: body.logo_url,
            is_public: ['spa', 'native'].includes(body.app_type),
            is_trusted: false, // User created apps are untrusted by default
            status: 'active'
        };

        const { data, error } = await supabase
            .from(TABLES.APPLICATIONS)
            .insert(newApp)
            .select()
            .single();

        if (error) {
            logger.error('Failed to create app', { userId: user.id, error });
            return c.json({ error: 'Failed to create application' }, 500);
        }

        logger.info('App created', {
            userId: user.id,
            appId: data.id,
            clientId: data.client_id
        });

        return c.json({ success: true, data });
    }
);

/**
 * GET /developer/apps/:clientId
 * Get application details (reveal secret)
 */
developerRouter.get(
    '/apps/:clientId',
    authMiddleware(),
    async (c) => {
        const clientId = c.req.param('clientId');
        const user = c.get('user');
        const supabase = getSupabase();

        const { data, error } = await supabase
            .from(TABLES.APPLICATIONS)
            .select('*')
            .eq('client_id', clientId)
            .eq('owner_id', user.id)
            .single();

        if (error || !data) {
            return c.json({ error: 'Application not found' }, 404);
        }

        return c.json({ success: true, data });
    }
);

/**
 * PATCH /developer/apps/:clientId
 * Update application details
 */
developerRouter.patch(
    '/apps/:clientId',
    authMiddleware(),
    zValidator('json', updateAppSchema),
    async (c) => {
        const clientId = c.req.param('clientId');
        const body = c.req.valid('json');
        const user = c.get('user');
        const supabase = getSupabase();

        // Check ownership
        const { count } = await supabase
            .from(TABLES.APPLICATIONS)
            .select('id', { count: 'exact', head: true })
            .eq('client_id', clientId)
            .eq('owner_id', user.id);

        if (!count) {
            return c.json({ error: 'Application not found' }, 404);
        }

        const { data, error } = await supabase
            .from(TABLES.APPLICATIONS)
            .update({
                ...body,
                updated_at: new Date().toISOString()
            })
            .eq('client_id', clientId)
            .select()
            .single();

        if (error) {
            logger.error('Failed to update app', { userId: user.id, clientId, error });
            return c.json({ error: 'Failed to update application' }, 500);
        }

        return c.json({ success: true, data });
    }
);

/**
 * POST /developer/apps/:clientId/secret
 * Rotate client secret
 */
developerRouter.post(
    '/apps/:clientId/secret',
    authMiddleware(),
    async (c) => {
        const clientId = c.req.param('clientId');
        const user = c.get('user');
        const supabase = getSupabase();

        // Check ownership
        const { count } = await supabase
            .from(TABLES.APPLICATIONS)
            .select('id', { count: 'exact', head: true })
            .eq('client_id', clientId)
            .eq('owner_id', user.id);

        if (!count) {
            return c.json({ error: 'Application not found' }, 404);
        }

        const { clientSecret } = generateCredentials();

        const { data, error } = await supabase
            .from(TABLES.APPLICATIONS)
            .update({
                client_secret: clientSecret,
                updated_at: new Date().toISOString()
            })
            .eq('client_id', clientId)
            .select()
            .single();

        if (error) {
            logger.error('Failed to rotate secret', { userId: user.id, clientId, error });
            return c.json({ error: 'Failed to rotate secret' }, 500);
        }

        logger.info('App secret rotated', { userId: user.id, clientId });

        return c.json({ success: true, data });
    }
);

/**
 * DELETE /developer/apps/:clientId
 * Delete application
 */
developerRouter.delete(
    '/apps/:clientId',
    authMiddleware(),
    async (c) => {
        const clientId = c.req.param('clientId');
        const user = c.get('user');
        const supabase = getSupabase();

        const { error } = await supabase
            .from(TABLES.APPLICATIONS)
            .delete()
            .eq('client_id', clientId)
            .eq('owner_id', user.id);

        if (error) {
            logger.error('Failed to delete app', { userId: user.id, clientId, error });
            return c.json({ error: 'Failed to delete application' }, 500);
        }

        logger.info('App deleted', { userId: user.id, clientId });

        return c.json({ success: true });
    }
);


// ============================================
// Webhook Routes
// ============================================

/**
 * GET /apps/:clientId/webhooks
 * List webhooks
 */
developerRouter.get(
    '/apps/:clientId/webhooks',
    authMiddleware(),
    async (c) => {
        const clientId = c.req.param('clientId');
        const user = c.get('user');
        const supabase = getSupabase();

        // 1. Resolve App ID and verify ownership
        const { data: app, error: appError } = await supabase
            .from(TABLES.APPLICATIONS)
            .select('id')
            .eq('client_id', clientId)
            .eq('owner_id', user.id)
            .single();

        if (appError || !app) {
            return c.json({ error: 'Application not found' }, 404);
        }

        // 2. Fetch webhooks
        const { data: webhooks, error } = await supabase
            .from('webhooks')
            .select('*')
            .eq('app_id', app.id)
            .order('created_at', { ascending: false });

        if (error) {
            logger.error('Failed to list webhooks', { userId: user.id, clientId, error });
            return c.json({ error: 'Failed to list webhooks' }, 500);
        }

        return c.json({ success: true, data: webhooks });
    }
);

/**
 * POST /apps/:clientId/webhooks
 * Create webhook
 */
developerRouter.post(
    '/apps/:clientId/webhooks',
    authMiddleware(),
    zValidator('json', createWebhookSchema),
    async (c) => {
        const clientId = c.req.param('clientId');
        const body = c.req.valid('json');
        const user = c.get('user');
        const supabase = getSupabase();

        // 1. Resolve App ID
        const { data: app, error: appError } = await supabase
            .from(TABLES.APPLICATIONS)
            .select('id')
            .eq('client_id', clientId)
            .eq('owner_id', user.id)
            .single();

        if (appError || !app) {
            return c.json({ error: 'Application not found' }, 404);
        }

        // 2. Create webhook
        const { data, error } = await supabase
            .from('webhooks')
            .insert({
                app_id: app.id,
                url: body.url,
                events: body.events,
                secret: body.secret || randomBytes(32).toString('hex'),
                description: body.description,
                is_active: body.is_active
            })
            .select()
            .single();

        if (error) {
            logger.error('Failed to create webhook', { userId: user.id, clientId, error });
            return c.json({ error: 'Failed to create webhook' }, 500);
        }

        return c.json({ success: true, data });
    }
);

/**
 * DELETE /apps/:clientId/webhooks/:webhookId
 * Delete webhook
 */
developerRouter.delete(
    '/apps/:clientId/webhooks/:webhookId',
    authMiddleware(),
    async (c) => {
        const clientId = c.req.param('clientId');
        const webhookId = c.req.param('webhookId');
        const user = c.get('user');
        const supabase = getSupabase();

        // 1. Resolve App ID
        const { data: app } = await supabase
            .from(TABLES.APPLICATIONS)
            .select('id')
            .eq('client_id', clientId)
            .eq('owner_id', user.id)
            .single();

        if (!app) {
            return c.json({ error: 'Application not found' }, 404);
        }

        // 2. Delete webhook
        const { error } = await supabase
            .from('webhooks')
            .delete()
            .eq('id', webhookId)
            .eq('app_id', app.id);

        if (error) {
            logger.error('Failed to delete webhook', { userId: user.id, webhookId, error });
            return c.json({ error: 'Failed to delete webhook' }, 500);
        }

        return c.json({ success: true });
    }
);

/**
 * POST /apps/:clientId/webhooks/test
 * Trigger a test event
 */
developerRouter.post(
    '/apps/:clientId/webhooks/test',
    authMiddleware(),
    zValidator('json', testWebhookSchema),
    async (c) => {
        const clientId = c.req.param('clientId');
        const body = c.req.valid('json');
        const user = c.get('user');
        const supabase = getSupabase();

        // 1. Resolve App ID
        const { data: app } = await supabase
            .from(TABLES.APPLICATIONS)
            .select('id')
            .eq('client_id', clientId)
            .eq('owner_id', user.id)
            .single();

        if (!app) {
            return c.json({ error: 'Application not found' }, 404);
        }

        // 2. Trigger event
        await webhookService.triggerEvent(app.id, body.event, body.payload);

        return c.json({ success: true, message: 'Event triggered' });
    }
);

/**
 * GET /apps/:clientId/webhooks/deliveries
 * List recent deliveries (optional, for debugging)
 */
developerRouter.get(
    '/apps/:clientId/webhooks/deliveries',
    authMiddleware(),
    async (c) => {
        const clientId = c.req.param('clientId');
        const user = c.get('user');
        const supabase = getSupabase();

        const { data: app } = await supabase
            .from(TABLES.APPLICATIONS)
            .select('id')
            .eq('client_id', clientId)
            .eq('owner_id', user.id)
            .single();

        if (!app) {
            return c.json({ error: 'Application not found' }, 404);
        }

        const { data: deliveries, error } = await supabase
            .from('webhook_deliveries')
            .select('*, webhook:webhooks!inner(app_id)')
            .eq('webhook.app_id', app.id)
            .order('created_at', { ascending: false })
            .limit(20);

        if (error) {
            logger.error('Failed to list deliveries', { error });
            return c.json({ error: 'Failed to list deliveries' }, 500);
        }

        return c.json({ success: true, data: deliveries });
    }
);

// ============================================
// Custom Claims Routes
// ============================================

/**
 * GET /apps/:clientId/claims
 * List custom claims
 */
developerRouter.get(
    '/apps/:clientId/claims',
    authMiddleware(),
    async (c) => {
        const clientId = c.req.param('clientId');
        const user = c.get('user');
        const supabase = getSupabase();

        // 1. Resolve App ID and verify ownership
        const { data: app, error: appError } = await supabase
            .from(TABLES.APPLICATIONS)
            .select('id')
            .eq('client_id', clientId)
            .eq('owner_id', user.id)
            .single();

        if (appError || !app) {
            return c.json({ error: 'Application not found' }, 404);
        }

        // 2. Fetch claims
        const claims = await claimsService.getClaimsForApp(app.id);

        return c.json({ success: true, data: claims });
    }
);

/**
 * POST /apps/:clientId/claims
 * Create custom claim
 */
developerRouter.post(
    '/apps/:clientId/claims',
    authMiddleware(),
    zValidator('json', createClaimSchema),
    async (c) => {
        const clientId = c.req.param('clientId');
        const body = c.req.valid('json');
        const user = c.get('user');
        const supabase = getSupabase();

        // 1. Resolve App ID
        const { data: app, error: appError } = await supabase
            .from(TABLES.APPLICATIONS)
            .select('id')
            .eq('client_id', clientId)
            .eq('owner_id', user.id)
            .single();

        if (appError || !app) {
            return c.json({ error: 'Application not found' }, 404);
        }

        // 2. Create claim
        try {
            const claim = await claimsService.createClaim(app.id, body);
            return c.json({ success: true, data: claim });
        } catch (error: any) {
            logger.error('Failed to create claim', { userId: user.id, clientId, error });
            return c.json({ error: error.message || 'Failed to create claim' }, 500);
        }
    }
);

/**
 * PATCH /apps/:clientId/claims/:claimId
 * Update custom claim
 */
developerRouter.patch(
    '/apps/:clientId/claims/:claimId',
    authMiddleware(),
    zValidator('json', updateClaimSchema),
    async (c) => {
        const clientId = c.req.param('clientId');
        const claimId = c.req.param('claimId');
        const body = c.req.valid('json');
        const user = c.get('user');
        const supabase = getSupabase();

        // 1. Resolve App ID & Verify Ownership
        const { data: app } = await supabase
            .from(TABLES.APPLICATIONS)
            .select('id')
            .eq('client_id', clientId)
            .eq('owner_id', user.id)
            .single();

        if (!app) {
            return c.json({ error: 'Application not found' }, 404);
        }

        // 2. Update claim
        try {
            // Verify claim belongs to app (security check)
            const exists = await claimsService.getClaim(claimId);
            if (!exists || exists.application_id !== app.id) {
                return c.json({ error: 'Claim not found for this application' }, 404);
            }

            const claim = await claimsService.updateClaim(claimId, app.id, body);
            return c.json({ success: true, data: claim });
        } catch (error: any) {
            logger.error('Failed to update claim', { userId: user.id, claimId, error });
            return c.json({ error: error.message || 'Failed to update claim' }, 500);
        }
    }
);

/**
 * DELETE /apps/:clientId/claims/:claimId
 * Delete custom claim
 */
developerRouter.delete(
    '/apps/:clientId/claims/:claimId',
    authMiddleware(),
    async (c) => {
        const clientId = c.req.param('clientId');
        const claimId = c.req.param('claimId');
        const user = c.get('user');
        const supabase = getSupabase();

        // 1. Resolve App ID & Verify Ownership
        const { data: app } = await supabase
            .from(TABLES.APPLICATIONS)
            .select('id')
            .eq('client_id', clientId)
            .eq('owner_id', user.id)
            .single();

        if (!app) {
            return c.json({ error: 'Application not found' }, 404);
        }

        // 2. Delete claim
        try {
            // Verify claim belongs to app
            const exists = await claimsService.getClaim(claimId);
            if (!exists || exists.application_id !== app.id) {
                return c.json({ error: 'Claim not found' }, 404);
            }

            await claimsService.deleteClaim(claimId, app.id);
            return c.json({ success: true });
        } catch (error: any) {
            logger.error('Failed to delete claim', { userId: user.id, claimId, error });
            return c.json({ error: error.message || 'Failed to delete claim' }, 500);
        }
    }
);


// ============================================
// Branding (White-Label) Routes
// ============================================

const updateBrandingSchema = z.object({
    logo_url: z.string().url().nullable().optional(),
    favicon_url: z.string().url().nullable().optional(),
    background_image_url: z.string().url().nullable().optional(),
    primary_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
    secondary_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
    background_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
    text_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
    card_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
    error_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
    font_family: z.string().max(100).optional(),
    custom_css: z.string().nullable().optional(),
    login_title: z.string().max(100).nullable().optional(),
    login_subtitle: z.string().max(200).nullable().optional(),
    footer_text: z.string().max(200).nullable().optional(),
    show_social_login: z.boolean().optional(),
    show_powered_by: z.boolean().optional(),
    default_locale: z.string().max(10).optional(),
});

/**
 * GET /developer/apps/:clientId/branding
 * Get branding configuration for an app
 */
developerRouter.get(
    '/apps/:clientId/branding',
    authMiddleware(),
    async (c) => {
        const user = c.get('user');
        const clientId = c.req.param('clientId');
        const supabase = getSupabase();

        // Verify ownership
        const { data: app, error: appError } = await supabase
            .from(TABLES.APPLICATIONS)
            .select('id')
            .eq('client_id', clientId)
            .eq('owner_id', user.id)
            .single();

        if (appError || !app) {
            return c.json({ error: 'Application not found' }, 404);
        }

        try {
            const branding = await brandingService.getBrandingWithDefaults(app.id);
            return c.json({ success: true, data: branding });
        } catch (error: any) {
            logger.error('Failed to get branding', { userId: user.id, clientId, error });
            return c.json({ error: error.message || 'Failed to get branding' }, 500);
        }
    }
);

/**
 * PUT /developer/apps/:clientId/branding
 * Update branding configuration for an app
 */
developerRouter.put(
    '/apps/:clientId/branding',
    authMiddleware(),
    zValidator('json', updateBrandingSchema),
    async (c) => {
        const user = c.get('user');
        const clientId = c.req.param('clientId');
        const body = c.req.valid('json');
        const supabase = getSupabase();

        // Verify ownership
        const { data: app, error: appError } = await supabase
            .from(TABLES.APPLICATIONS)
            .select('id')
            .eq('client_id', clientId)
            .eq('owner_id', user.id)
            .single();

        if (appError || !app) {
            return c.json({ error: 'Application not found' }, 404);
        }

        try {
            const result = await brandingService.upsertBranding(app.id, body);
            if (!result.success) {
                return c.json({ error: result.error }, 400);
            }
            return c.json({ success: true, data: result.data });
        } catch (error: any) {
            logger.error('Failed to update branding', { userId: user.id, clientId, error });
            return c.json({ error: error.message || 'Failed to update branding' }, 500);
        }
    }
);

/**
 * DELETE /developer/apps/:clientId/branding
 * Delete branding (revert to defaults)
 */
developerRouter.delete(
    '/apps/:clientId/branding',
    authMiddleware(),
    async (c) => {
        const user = c.get('user');
        const clientId = c.req.param('clientId');
        const supabase = getSupabase();

        // Verify ownership
        const { data: app, error: appError } = await supabase
            .from(TABLES.APPLICATIONS)
            .select('id')
            .eq('client_id', clientId)
            .eq('owner_id', user.id)
            .single();

        if (appError || !app) {
            return c.json({ error: 'Application not found' }, 404);
        }

        try {
            const result = await brandingService.deleteBranding(app.id);
            if (!result.success) {
                return c.json({ error: result.error }, 400);
            }
            return c.json({ success: true, message: 'Branding reset to defaults' });
        } catch (error: any) {
            logger.error('Failed to delete branding', { userId: user.id, clientId, error });
            return c.json({ error: error.message || 'Failed to delete branding' }, 500);
        }
    }
);


export { developerRouter };

