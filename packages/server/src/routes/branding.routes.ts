/**
 * Public Branding Routes
 * 
 * Unauthenticated endpoints for fetching app branding on login pages
 */

import { Hono } from 'hono';
import * as brandingService from '../services/branding.service.js';

const brandingRouter = new Hono();

/**
 * GET /branding/:clientId
 * Get branding configuration by client_id (public, no auth required)
 */
brandingRouter.get('/:clientId', async (c) => {
    const clientId = c.req.param('clientId');

    try {
        const branding = await brandingService.getBrandingByClientId(clientId);

        if (!branding) {
            // Return defaults if no custom branding
            const defaults = await brandingService.getBrandingWithDefaults('');
            return c.json({ success: true, data: defaults });
        }

        return c.json({ success: true, data: branding });
    } catch (error: any) {
        console.error('Failed to fetch branding:', error);
        // Return defaults on error
        return c.json({
            success: true,
            data: {
                logo_url: null,
                favicon_url: null,
                primary_color: '#0ea5e9',
                secondary_color: '#8b5cf6',
                background_color: '#0f172a',
                text_color: '#f8fafc',
                card_color: '#ffffff',
                show_social_login: true,
                show_powered_by: true,
            }
        });
    }
});

export { brandingRouter };
