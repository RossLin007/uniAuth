import { Hono } from 'hono';
import { z } from 'zod';
import { userService } from '../services/user.service.js';
import { authMiddleware, getClientInfo } from '../middlewares/index.js';
import { hashToken } from '../lib/index.js';
import type { HonoVariables } from '../types/index.js';

const userRouter = new Hono<{ Variables: HonoVariables }>();

// All user routes require authentication
userRouter.use('/*', authMiddleware());

/**
 * Get current user info
 * 获取当前用户信息
 *
 * GET /api/v1/user/me
 */
userRouter.get('/me', async (c) => {
    try {
        const user = c.get('user');

        return c.json({
            success: true,
            data: {
                id: user.id,
                phone: user.phone,
                nickname: user.nickname,
                avatar_url: user.avatar_url,
                phone_verified: user.phone_verified,
                created_at: user.created_at,
            },
        });
    } catch (error) {
        console.error('Get user error:', error);
        return c.json(
            {
                success: false,
                error: {
                    code: 'INTERNAL_ERROR',
                    message: 'Internal server error',
                },
            },
            500
        );
    }
});

/**
 * Update current user info
 * 更新当前用户信息
 *
 * PATCH /api/v1/user/me
 */
userRouter.patch('/me', async (c) => {
    try {
        const user = c.get('user');
        const body = await c.req.json();

        // Validate update data
        const updateSchema = z.object({
            nickname: z.string().min(1).max(100).optional().nullable(),
            avatar_url: z.string().url().optional().nullable(),
        });

        const updateResult = updateSchema.safeParse(body);
        if (!updateResult.success) {
            return c.json(
                {
                    success: false,
                    error: {
                        code: 'INVALID_DATA',
                        message: updateResult.error.errors[0].message,
                    },
                },
                400
            );
        }

        const result = await userService.updateUser(user.id, updateResult.data);

        if (!result.success) {
            return c.json(
                {
                    success: false,
                    error: {
                        code: 'UPDATE_FAILED',
                        message: result.message,
                    },
                },
                500
            );
        }

        return c.json({
            success: true,
            data: result.user,
            message: result.message,
        });
    } catch (error) {
        console.error('Update user error:', error);
        return c.json(
            {
                success: false,
                error: {
                    code: 'INTERNAL_ERROR',
                    message: 'Internal server error',
                },
            },
            500
        );
    }
});

/**
 * Get user sessions
 * 获取用户会话列表
 *
 * GET /api/v1/user/sessions
 */
userRouter.get('/sessions', async (c) => {
    try {
        const user = c.get('user');

        // Get current token hash from Authorization header
        const authHeader = c.req.header('Authorization');
        // Note: We can't get the exact token hash here since we only have the access token
        // In a real implementation, you might pass the refresh token or session ID

        const sessions = await userService.getSessions(user.id);

        return c.json({
            success: true,
            data: sessions,
        });
    } catch (error) {
        console.error('Get sessions error:', error);
        return c.json(
            {
                success: false,
                error: {
                    code: 'INTERNAL_ERROR',
                    message: 'Internal server error',
                },
            },
            500
        );
    }
});

/**
 * Revoke a specific session
 * 撤销特定会话
 *
 * DELETE /api/v1/user/sessions/:id
 */
userRouter.delete('/sessions/:id', async (c) => {
    try {
        const user = c.get('user');
        const sessionId = c.req.param('id');

        const result = await userService.revokeSession(user.id, sessionId);

        if (!result.success) {
            return c.json(
                {
                    success: false,
                    error: {
                        code: 'REVOKE_FAILED',
                        message: result.message,
                    },
                },
                500
            );
        }

        return c.json({
            success: true,
            message: result.message,
        });
    } catch (error) {
        console.error('Revoke session error:', error);
        return c.json(
            {
                success: false,
                error: {
                    code: 'INTERNAL_ERROR',
                    message: 'Internal server error',
                },
            },
            500
        );
    }
});

// ============================================
// Account Binding Routes / 账户绑定路由
// ============================================

/**
 * Get user account bindings
 * 获取用户账户绑定信息
 *
 * GET /api/v1/user/bindings
 */
userRouter.get('/bindings', async (c) => {
    try {
        const user = c.get('user');
        const bindings = await userService.getBindings(user.id);

        return c.json({
            success: true,
            data: bindings,
        });
    } catch (error) {
        console.error('Get bindings error:', error);
        return c.json(
            {
                success: false,
                error: {
                    code: 'INTERNAL_ERROR',
                    message: 'Internal server error',
                },
            },
            500
        );
    }
});

/**
 * Unbind OAuth account
 * 解绑 OAuth 账户
 *
 * DELETE /api/v1/user/unbind/:provider
 */
userRouter.delete('/unbind/:provider', async (c) => {
    try {
        const user = c.get('user');
        const provider = c.req.param('provider');

        const result = await userService.unbindOAuth(user.id, provider);

        if (!result.success) {
            return c.json(
                {
                    success: false,
                    error: {
                        code: 'UNBIND_FAILED',
                        message: result.message,
                    },
                },
                400
            );
        }

        return c.json({
            success: true,
            message: result.message,
        });
    } catch (error) {
        console.error('Unbind OAuth error:', error);
        return c.json(
            {
                success: false,
                error: {
                    code: 'INTERNAL_ERROR',
                    message: 'Internal server error',
                },
            },
            500
        );
    }
});

/**
 * Bind phone number
 * 绑定手机号
 *
 * POST /api/v1/user/bind/phone
 */
userRouter.post('/bind/phone', async (c) => {
    try {
        const user = c.get('user');
        const body = await c.req.json();

        const schema = z.object({
            phone: z.string().min(5).max(20),
            code: z.string().length(6),
        });

        const parseResult = schema.safeParse(body);
        if (!parseResult.success) {
            return c.json(
                {
                    success: false,
                    error: {
                        code: 'INVALID_DATA',
                        message: parseResult.error.errors[0].message,
                    },
                },
                400
            );
        }

        // Verify the code and bind phone
        const result = await userService.bindPhone(user.id, parseResult.data.phone, parseResult.data.code);

        if (!result.success) {
            return c.json(
                {
                    success: false,
                    error: {
                        code: 'BIND_FAILED',
                        message: result.message,
                    },
                },
                400
            );
        }

        return c.json({
            success: true,
            message: result.message,
        });
    } catch (error) {
        console.error('Bind phone error:', error);
        return c.json(
            {
                success: false,
                error: {
                    code: 'INTERNAL_ERROR',
                    message: 'Internal server error',
                },
            },
            500
        );
    }
});

/**
 * Bind email address
 * 绑定邮箱地址
 *
 * POST /api/v1/user/bind/email
 */
userRouter.post('/bind/email', async (c) => {
    try {
        const user = c.get('user');
        const body = await c.req.json();

        const schema = z.object({
            email: z.string().email(),
            code: z.string().length(6),
        });

        const parseResult = schema.safeParse(body);
        if (!parseResult.success) {
            return c.json(
                {
                    success: false,
                    error: {
                        code: 'INVALID_DATA',
                        message: parseResult.error.errors[0].message,
                    },
                },
                400
            );
        }

        // Verify the code and bind email
        const result = await userService.bindEmail(user.id, parseResult.data.email, parseResult.data.code);

        if (!result.success) {
            return c.json(
                {
                    success: false,
                    error: {
                        code: 'BIND_FAILED',
                        message: result.message,
                    },
                },
                400
            );
        }

        return c.json({
            success: true,
            message: result.message,
        });
    } catch (error) {
        console.error('Bind email error:', error);
        return c.json(
            {
                success: false,
                error: {
                    code: 'INTERNAL_ERROR',
                    message: 'Internal server error',
                },
            },
            500
        );
    }
});

/**
 * GET /user/authorized-apps
 * Get list of authorized third-party applications
 * 获取已授权的第三方应用列表
 */
userRouter.get('/authorized-apps', async (c) => {
    const user = c.get('user');
    const result = await userService.getAuthorizedApps(user.id);

    return c.json({
        success: result.success,
        data: result.apps,
    });
});

/**
 * DELETE /user/authorized-apps/:clientId
 * Revoke authorization for an application
 * 撤销应用授权
 */
userRouter.delete('/authorized-apps/:clientId', async (c) => {
    try {
        const user = c.get('user');
        const clientId = c.req.param('clientId');

        if (!clientId) {
            return c.json(
                {
                    success: false,
                    error: {
                        code: 'INVALID_DATA',
                        message: 'Client ID is required',
                    },
                },
                400
            );
        }

        const result = await userService.revokeAppAuthorization(user.id, clientId);

        if (!result.success) {
            return c.json(
                {
                    success: false,
                    error: {
                        code: 'REVOKE_FAILED',
                        message: result.message,
                    },
                },
                400
            );
        }

        return c.json({
            success: true,
            message: result.message,
        });
    } catch (error) {
        console.error('Revoke app authorization error:', error);
        return c.json(
            {
                success: false,
                error: {
                    code: 'INTERNAL_ERROR',
                    message: 'Failed to revoke authorization',
                },
            },
            500
        );
    }
});

/**
 * DELETE /user/account
 * Permanently delete user account
 * 永久删除用户账户
 */
userRouter.delete('/account', async (c) => {
    try {
        const user = c.get('user');
        const body = await c.req.json().catch(() => ({}));

        // Require confirmation text for safety
        const schema = z.object({
            confirm: z.literal('DELETE'),
        });

        const parseResult = schema.safeParse(body);
        if (!parseResult.success) {
            return c.json(
                {
                    success: false,
                    error: {
                        code: 'CONFIRMATION_REQUIRED',
                        message: 'Please type "DELETE" to confirm account deletion',
                    },
                },
                400
            );
        }

        const result = await userService.deleteAccount(user.id);

        if (!result.success) {
            return c.json(
                {
                    success: false,
                    error: {
                        code: 'DELETE_FAILED',
                        message: result.message,
                    },
                },
                400
            );
        }

        return c.json({
            success: true,
            message: result.message,
        });
    } catch (error) {
        console.error('Delete account error:', error);
        return c.json(
            {
                success: false,
                error: {
                    code: 'INTERNAL_ERROR',
                    message: 'Failed to delete account',
                },
            },
            500
        );
    }
});

export { userRouter };


