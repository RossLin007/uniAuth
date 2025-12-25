/**
 * Passkey / WebAuthn API Routes
 * 
 * Endpoints for passwordless authentication using Passkeys
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import * as webauthnService from '../services/webauthn.service.js';
import { userService } from '../services/user.service.js';
import { authService } from '../services/auth.service.js';
import { getSupabase } from '../lib/supabase.js';
import type { HonoVariables } from '../types/index.js';
import type { RegistrationResponseJSON, AuthenticationResponseJSON } from '@simplewebauthn/server';

const passkeyRouter = new Hono<{ Variables: HonoVariables }>();

// ============================================
// Registration Endpoints (require auth)
// ============================================

/**
 * Get registration options
 * POST /register/options
 */
passkeyRouter.post('/register/options', authMiddleware(), async (c) => {
    const jwtPayload = c.get('jwtPayload');
    const userId = jwtPayload?.sub;

    if (!userId) {
        return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    // Get user info
    const user = await userService.getUserById(userId);
    if (!user) {
        return c.json({ success: false, error: 'User not found' }, 404);
    }

    const userName = user.email || user.phone || userId;
    const displayName = user.email?.split('@')[0] || user.phone || 'User';

    try {
        const options = await webauthnService.generatePasskeyRegistrationOptions(
            userId,
            userName,
            displayName
        );

        return c.json({ success: true, data: options });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('Registration options error:', error);
        return c.json({ success: false, error: message }, 500);
    }
});

/**
 * Verify registration response
 * POST /register/verify
 */
const registerVerifySchema = z.object({
    response: z.any(), // RegistrationResponseJSON - complex structure
    deviceName: z.string().optional(),
});

passkeyRouter.post('/register/verify', authMiddleware(), async (c) => {
    const jwtPayload = c.get('jwtPayload');
    const userId = jwtPayload?.sub;

    if (!userId) {
        return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    const body = await c.req.json();
    const parsed = registerVerifySchema.safeParse(body);
    if (!parsed.success) {
        return c.json({ success: false, error: 'Invalid request body' }, 400);
    }

    const { response, deviceName } = parsed.data;

    try {
        const result = await webauthnService.verifyPasskeyRegistration(
            userId,
            response as RegistrationResponseJSON,
            deviceName
        );

        if (!result.success) {
            return c.json({ success: false, error: result.error }, 400);
        }

        return c.json({
            success: true,
            message: 'Passkey registered successfully',
            data: { credentialId: result.credentialId },
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('Registration verify error:', error);
        return c.json({ success: false, error: message }, 500);
    }
});

// ============================================
// Authentication Endpoints (public)
// ============================================

/**
 * Get authentication options
 * POST /login/options
 */
const loginOptionsSchema = z.object({
    email: z.string().email().optional(),
    phone: z.string().optional(),
});

passkeyRouter.post('/login/options', async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const parsed = loginOptionsSchema.safeParse(body);

    let userId: string | undefined;

    // If email/phone provided, look up user
    if (parsed.success && (parsed.data.email || parsed.data.phone)) {
        const supabase = getSupabase();
        if (parsed.data.email) {
            const { data } = await supabase
                .from('users')
                .select('id')
                .eq('email', parsed.data.email)
                .single();
            userId = data?.id;
        } else if (parsed.data.phone) {
            const { data } = await supabase
                .from('users')
                .select('id')
                .eq('phone', parsed.data.phone)
                .single();
            userId = data?.id;
        }
    }

    try {
        const options = await webauthnService.generatePasskeyAuthenticationOptions(userId);

        return c.json({ success: true, data: options });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('Login options error:', error);
        return c.json({ success: false, error: message }, 500);
    }
});

/**
 * Verify authentication response
 * POST /login/verify
 */
const loginVerifySchema = z.object({
    response: z.any(), // AuthenticationResponseJSON
    userId: z.string().optional(),
});

passkeyRouter.post('/login/verify', async (c) => {
    const body = await c.req.json();
    const parsed = loginVerifySchema.safeParse(body);
    if (!parsed.success) {
        return c.json({ success: false, error: 'Invalid request body' }, 400);
    }

    const { response, userId } = parsed.data;

    try {
        const result = await webauthnService.verifyPasskeyAuthentication(
            response as AuthenticationResponseJSON,
            userId
        );

        if (!result.success || !result.userId) {
            return c.json({ success: false, error: result.error || 'Authentication failed' }, 401);
        }

        // Get user and generate tokens using authService
        const user = await userService.getUserById(result.userId);
        if (!user) {
            return c.json({ success: false, error: 'User not found' }, 404);
        }

        // Use refreshToken method to get new tokens (simulate a fresh login)
        // Actually, we need to generate tokens directly
        const { generateTokenPair } = await import('../lib/index.js');
        const tokens = await generateTokenPair(user.id);

        // Store the refresh token
        await authService.storeRefreshToken(user.id, tokens.refresh_token);

        // Get public user info
        const publicUser = await userService.getUserPublic(user.id);

        return c.json({
            success: true,
            message: 'Authentication successful',
            data: {
                user: publicUser,
                access_token: tokens.access_token,
                refresh_token: tokens.refresh_token,
                expires_in: tokens.expires_in,
            },
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('Login verify error:', error);
        return c.json({ success: false, error: message }, 500);
    }
});

// ============================================
// Credential Management (require auth)
// ============================================

/**
 * List user's passkeys
 * GET /credentials
 */
passkeyRouter.get('/credentials', authMiddleware(), async (c) => {
    const jwtPayload = c.get('jwtPayload');
    const userId = jwtPayload?.sub;

    if (!userId) {
        return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    try {
        const credentials = await webauthnService.listUserPasskeys(userId);

        // Remove sensitive fields
        const safeCredentials = credentials.map((cred) => ({
            id: cred.id,
            device_name: cred.device_name,
            device_type: cred.device_type,
            created_at: cred.created_at,
            last_used_at: cred.last_used_at,
        }));

        return c.json({ success: true, data: safeCredentials });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('List credentials error:', error);
        return c.json({ success: false, error: message }, 500);
    }
});

/**
 * Rename a passkey
 * PATCH /credentials/:id
 */
const renameSchema = z.object({
    device_name: z.string().min(1).max(100),
});

passkeyRouter.patch('/credentials/:id', authMiddleware(), async (c) => {
    const jwtPayload = c.get('jwtPayload');
    const userId = jwtPayload?.sub;

    if (!userId) {
        return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    const credentialId = c.req.param('id');

    const body = await c.req.json();
    const parsed = renameSchema.safeParse(body);
    if (!parsed.success) {
        return c.json({ success: false, error: 'Invalid device name' }, 400);
    }

    try {
        const result = await webauthnService.renamePasskey(
            userId,
            credentialId,
            parsed.data.device_name
        );

        if (!result.success) {
            return c.json({ success: false, error: result.error }, 400);
        }

        return c.json({ success: true, message: 'Passkey renamed' });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('Rename credential error:', error);
        return c.json({ success: false, error: message }, 500);
    }
});

/**
 * Delete a passkey
 * DELETE /credentials/:id
 */
passkeyRouter.delete('/credentials/:id', authMiddleware(), async (c) => {
    const jwtPayload = c.get('jwtPayload');
    const userId = jwtPayload?.sub;

    if (!userId) {
        return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    const credentialId = c.req.param('id');

    try {
        const result = await webauthnService.deletePasskey(userId, credentialId);

        if (!result.success) {
            return c.json({ success: false, error: result.error }, 400);
        }

        return c.json({ success: true, message: 'Passkey deleted' });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('Delete credential error:', error);
        return c.json({ success: false, error: message }, 500);
    }
});

export { passkeyRouter };
