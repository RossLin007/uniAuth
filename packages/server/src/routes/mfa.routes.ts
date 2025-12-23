/**
 * MFA Routes - Two-Factor Authentication endpoints
 * MFA 路由 - 双因素认证 API
 */
import { Hono } from 'hono';
import { z } from 'zod';
import { mfaService } from '../lib/mfa.js';
import { authMiddleware } from '../middlewares/index.js';
import type { HonoVariables } from '../types/index.js';

const mfaRouter = new Hono<{ Variables: HonoVariables }>();

// All MFA routes require authentication
mfaRouter.use('/*', authMiddleware());

/**
 * GET /mfa/status
 * Get MFA status for current user
 */
mfaRouter.get('/status', async (c) => {
    const user = c.get('user');
    const status = await mfaService.getMFAStatus(user.id);

    return c.json({
        success: true,
        data: status,
    });
});

/**
 * POST /mfa/setup
 * Start MFA setup - generates secret and QR code
 */
mfaRouter.post('/setup', async (c) => {
    const user = c.get('user');
    const result = await mfaService.setupMFA(user.id, user.email || user.phone || user.id);

    if (!result.success) {
        return c.json({
            success: false,
            error: {
                code: 'MFA_SETUP_FAILED',
                message: result.message,
            },
        }, 400);
    }

    return c.json({
        success: true,
        data: {
            secret: result.secret,
            qrCode: result.qrCode,
        },
    });
});

/**
 * POST /mfa/verify-setup
 * Verify MFA setup with first TOTP code
 */
mfaRouter.post('/verify-setup', async (c) => {
    try {
        const user = c.get('user');
        const body = await c.req.json();

        const schema = z.object({
            code: z.string().length(6),
        });

        const parseResult = schema.safeParse(body);
        if (!parseResult.success) {
            return c.json({
                success: false,
                error: {
                    code: 'INVALID_DATA',
                    message: 'Invalid verification code format / 验证码格式错误',
                },
            }, 400);
        }

        const result = await mfaService.verifyMFASetup(user.id, parseResult.data.code);

        if (!result.success) {
            return c.json({
                success: false,
                error: {
                    code: 'MFA_VERIFY_FAILED',
                    message: result.message,
                },
            }, 400);
        }

        return c.json({
            success: true,
            data: {
                recoveryCodes: result.recoveryCodes,
            },
            message: 'MFA enabled successfully / MFA 已启用',
        });
    } catch (error) {
        console.error('MFA verify setup error:', error);
        return c.json({
            success: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Internal server error',
            },
        }, 500);
    }
});

/**
 * POST /mfa/verify
 * Verify MFA code during login
 */
mfaRouter.post('/verify', async (c) => {
    try {
        const user = c.get('user');
        const body = await c.req.json();

        const schema = z.object({
            code: z.string().min(6).max(10),
        });

        const parseResult = schema.safeParse(body);
        if (!parseResult.success) {
            return c.json({
                success: false,
                error: {
                    code: 'INVALID_DATA',
                    message: 'Invalid code format / 验证码格式错误',
                },
            }, 400);
        }

        const code = parseResult.data.code;

        // Try TOTP first, then recovery code
        let result = await mfaService.verifyMFACode(user.id, code);
        if (!result.success && code.length > 6) {
            result = await mfaService.verifyRecoveryCode(user.id, code);
        }

        if (!result.success) {
            return c.json({
                success: false,
                error: {
                    code: 'MFA_VERIFY_FAILED',
                    message: result.message,
                },
            }, 400);
        }

        return c.json({
            success: true,
            message: 'MFA verified / MFA 验证成功',
        });
    } catch (error) {
        console.error('MFA verify error:', error);
        return c.json({
            success: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Internal server error',
            },
        }, 500);
    }
});

/**
 * POST /mfa/disable
 * Disable MFA for current user
 */
mfaRouter.post('/disable', async (c) => {
    try {
        const user = c.get('user');
        const body = await c.req.json();

        const schema = z.object({
            code: z.string().min(6).max(10),
        });

        const parseResult = schema.safeParse(body);
        if (!parseResult.success) {
            return c.json({
                success: false,
                error: {
                    code: 'INVALID_DATA',
                    message: 'Invalid code format / 验证码格式错误',
                },
            }, 400);
        }

        const result = await mfaService.disableMFA(user.id, parseResult.data.code);

        if (!result.success) {
            return c.json({
                success: false,
                error: {
                    code: 'MFA_DISABLE_FAILED',
                    message: result.message,
                },
            }, 400);
        }

        return c.json({
            success: true,
            message: result.message,
        });
    } catch (error) {
        console.error('MFA disable error:', error);
        return c.json({
            success: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Internal server error',
            },
        }, 500);
    }
});

/**
 * POST /mfa/regenerate-recovery
 * Regenerate recovery codes
 */
mfaRouter.post('/regenerate-recovery', async (c) => {
    try {
        const user = c.get('user');
        const body = await c.req.json();

        const schema = z.object({
            code: z.string().length(6),
        });

        const parseResult = schema.safeParse(body);
        if (!parseResult.success) {
            return c.json({
                success: false,
                error: {
                    code: 'INVALID_DATA',
                    message: 'Invalid code format / 验证码格式错误',
                },
            }, 400);
        }

        const result = await mfaService.regenerateRecoveryCodes(user.id, parseResult.data.code);

        if (!result.success) {
            return c.json({
                success: false,
                error: {
                    code: 'REGENERATE_FAILED',
                    message: result.message,
                },
            }, 400);
        }

        return c.json({
            success: true,
            data: {
                recoveryCodes: result.recoveryCodes,
            },
        });
    } catch (error) {
        console.error('MFA regenerate recovery error:', error);
        return c.json({
            success: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Internal server error',
            },
        }, 500);
    }
});

export { mfaRouter };
