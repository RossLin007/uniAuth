/**
 * Trusted Client API Routes
 * 嵌入式登录 API 路由
 *
 * These routes allow third-party applications to authenticate users
 * directly from their own login pages using client_id + client_secret.
 * 
 * 这些路由允许第三方应用使用 client_id + client_secret
 * 在其自己的登录页面中直接认证用户。
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { authService } from '../services/auth.service.js';
import { clientAuthMiddleware, getApplication, type TrustedClientVariables } from '../middlewares/index.js';
import { generateTokenPair } from '../lib/jwt.js';

const trustedAuthRouter = new Hono<{ Variables: TrustedClientVariables }>();

// Apply client authentication middleware to all trusted routes
trustedAuthRouter.use('*', clientAuthMiddleware('trusted_client'));

// ============================================
// Validation Schemas
// ============================================

const phoneSchema = z.string().regex(/^\+[1-9]\d{6,14}$/, {
    message: 'Phone number must be in E.164 format (e.g., +8613800138000)',
});

const emailSchema = z.string().email({
    message: 'Invalid email format / 邮箱格式无效',
});

const codeSchema = z.string().length(6).regex(/^\d+$/, {
    message: 'Verification code must be 6 digits / 验证码必须是6位数字',
});

// ============================================
// Phone Authentication Routes
// ============================================

/**
 * Send phone verification code
 * 发送手机验证码
 * 
 * POST /api/v1/auth/trusted/phone/send-code
 */
trustedAuthRouter.post('/phone/send-code', async (c) => {
    try {
        let body;
        try {
            body = await c.req.json();
        } catch (e) {
            return c.json({
                success: false,
                error: {
                    code: 'INVALID_JSON',
                    message: 'Invalid JSON body / 无效的 JSON 请求体'
                }
            }, 400);
        }
        const app = getApplication(c);

        // Validate phone number
        const phoneResult = phoneSchema.safeParse(body.phone);
        if (!phoneResult.success) {
            return c.json(
                {
                    success: false,
                    error: {
                        code: 'INVALID_PHONE',
                        message: phoneResult.error.errors[0].message,
                    },
                },
                400
            );
        }

        const phone = phoneResult.data;
        const type = body.type || 'login';

        // Send verification code
        const result = await authService.sendPhoneCode(phone, type);

        if (!result.success) {
            return c.json(
                {
                    success: false,
                    error: {
                        code: 'SEND_CODE_FAILED',
                        message: result.message,
                    },
                    data: result.retryAfter ? { retry_after: result.retryAfter } : undefined,
                },
                result.retryAfter ? 429 : 500
            );
        }

        return c.json({
            success: true,
            data: {
                expires_in: result.expiresIn,
                retry_after: result.retryAfter,
            },
            message: result.message,
            _client: app.name, // Include app name for audit
        });
    } catch (error) {
        console.error('Trusted phone send-code error:', error);
        return c.json(
            {
                success: false,
                error: {
                    code: 'INTERNAL_ERROR',
                    message: 'Internal server error / 服务器内部错误',
                },
            },
            500
        );
    }
});

/**
 * Verify phone code and login
 * 验证手机验证码并登录
 * 
 * POST /api/v1/auth/trusted/phone/verify
 */
trustedAuthRouter.post('/phone/verify', async (c) => {
    try {
        const body = await c.req.json();
        const app = getApplication(c);

        // Validate phone number
        const phoneResult = phoneSchema.safeParse(body.phone);
        if (!phoneResult.success) {
            return c.json(
                {
                    success: false,
                    error: {
                        code: 'INVALID_PHONE',
                        message: phoneResult.error.errors[0].message,
                    },
                },
                400
            );
        }

        // Validate code
        const codeResult = codeSchema.safeParse(body.code);
        if (!codeResult.success) {
            return c.json(
                {
                    success: false,
                    error: {
                        code: 'INVALID_CODE',
                        message: codeResult.error.errors[0].message,
                    },
                },
                400
            );
        }

        const phone = phoneResult.data;
        const code = codeResult.data;

        // Get device info from headers
        const deviceInfo = {
            user_agent: c.req.header('user-agent'),
            platform: 'API',
            browser: `TrustedClient: ${app.name}`,
        };
        const ipAddress = c.req.header('x-forwarded-for') || c.req.header('x-real-ip');

        // Verify code
        const result = await authService.verifyPhoneCode(phone, code, deviceInfo, ipAddress);

        if (!result.success) {
            return c.json(
                {
                    success: false,
                    error: {
                        code: 'VERIFY_FAILED',
                        message: result.message,
                    },
                },
                401
            );
        }

        // Check if MFA is required
        if (result.mfaRequired) {
            return c.json({
                success: true,
                data: {
                    user: result.user,
                    mfa_required: true,
                    mfa_token: result.mfaToken,
                },
                message: result.message,
            });
        }

        // Generate tokens with client audience
        const tokens = await generateTokenPair(result.user!, {
            clientId: app.client_id,
        });

        // Store refresh token
        await authService.storeRefreshToken(
            result.user!.id,
            tokens.refresh_token,
            deviceInfo,
            ipAddress
        );

        return c.json({
            success: true,
            data: {
                user: result.user,
                access_token: tokens.access_token,
                refresh_token: tokens.refresh_token,
                expires_in: tokens.expires_in,
                is_new_user: result.isNewUser,
            },
            message: result.message,
        });
    } catch (error) {
        console.error('Trusted phone verify error:', error);
        return c.json(
            {
                success: false,
                error: {
                    code: 'INTERNAL_ERROR',
                    message: 'Internal server error / 服务器内部错误',
                },
            },
            500
        );
    }
});

// ============================================
// Email Authentication Routes
// ============================================

/**
 * Send email verification code
 * 发送邮箱验证码
 * 
 * POST /api/v1/auth/trusted/email/send-code
 */
trustedAuthRouter.post('/email/send-code', async (c) => {
    try {
        const body = await c.req.json();
        const app = getApplication(c);

        // Validate email
        const emailResult = emailSchema.safeParse(body.email);
        if (!emailResult.success) {
            return c.json(
                {
                    success: false,
                    error: {
                        code: 'INVALID_EMAIL',
                        message: emailResult.error.errors[0].message,
                    },
                },
                400
            );
        }

        const email = emailResult.data;
        const type = body.type || 'email_verify';
        const ipAddress = c.req.header('x-forwarded-for')?.split(',')[0] || c.req.header('x-real-ip') || 'unknown';

        // Send verification code
        const result = await authService.sendEmailCode(email, type, ipAddress);

        if (!result.success) {
            return c.json(
                {
                    success: false,
                    error: {
                        code: 'SEND_CODE_FAILED',
                        message: result.message,
                    },
                    data: result.retryAfter ? { retry_after: result.retryAfter } : undefined,
                },
                result.retryAfter ? 429 : 500
            );
        }

        return c.json({
            success: true,
            data: {
                expires_in: result.expiresIn,
                retry_after: result.retryAfter,
            },
            message: result.message,
            _client: app.name,
        });
    } catch (error) {
        console.error('Trusted email send-code error:', error);
        return c.json(
            {
                success: false,
                error: {
                    code: 'INTERNAL_ERROR',
                    message: 'Internal server error / 服务器内部错误',
                },
            },
            500
        );
    }
});

/**
 * Verify email code and login (passwordless)
 * 验证邮箱验证码并登录（无密码模式）
 * 
 * POST /api/v1/auth/trusted/email/verify
 */
trustedAuthRouter.post('/email/verify', async (c) => {
    try {
        const body = await c.req.json();
        const app = getApplication(c);

        // Validate email
        const emailResult = emailSchema.safeParse(body.email);
        if (!emailResult.success) {
            return c.json(
                {
                    success: false,
                    error: {
                        code: 'INVALID_EMAIL',
                        message: emailResult.error.errors[0].message,
                    },
                },
                400
            );
        }

        // Validate code
        const codeResult = codeSchema.safeParse(body.code);
        if (!codeResult.success) {
            return c.json(
                {
                    success: false,
                    error: {
                        code: 'INVALID_CODE',
                        message: codeResult.error.errors[0].message,
                    },
                },
                400
            );
        }

        const email = emailResult.data;
        const code = codeResult.data;

        // Get device info
        const deviceInfo = {
            user_agent: c.req.header('user-agent'),
            platform: 'API',
            browser: `TrustedClient: ${app.name}`,
        };
        const ipAddress = c.req.header('x-forwarded-for') || c.req.header('x-real-ip');

        // Verify code and login
        const result = await authService.loginWithEmailCode(email, code, deviceInfo, ipAddress);

        if (!result.success) {
            return c.json(
                {
                    success: false,
                    error: {
                        code: 'VERIFY_FAILED',
                        message: result.message,
                    },
                },
                401
            );
        }

        // Check if MFA is required
        if (result.mfaRequired) {
            return c.json({
                success: true,
                data: {
                    user: result.user,
                    mfa_required: true,
                    mfa_token: result.mfaToken,
                },
                message: result.message,
            });
        }

        // Generate tokens with client audience
        const tokens = await generateTokenPair(result.user!, {
            clientId: app.client_id,
        });

        // Store refresh token
        await authService.storeRefreshToken(
            result.user!.id,
            tokens.refresh_token,
            deviceInfo,
            ipAddress
        );

        return c.json({
            success: true,
            data: {
                user: result.user,
                access_token: tokens.access_token,
                refresh_token: tokens.refresh_token,
                expires_in: tokens.expires_in,
            },
            message: result.message,
        });
    } catch (error) {
        console.error('Trusted email verify error:', error);
        return c.json(
            {
                success: false,
                error: {
                    code: 'INTERNAL_ERROR',
                    message: 'Internal server error / 服务器内部错误',
                },
            },
            500
        );
    }
});

/**
 * Email password login
 * 邮箱密码登录
 * 
 * POST /api/v1/auth/trusted/email/login
 */
trustedAuthRouter.post('/email/login', async (c) => {
    try {
        const body = await c.req.json();
        const app = getApplication(c);

        // Validate email
        const emailResult = emailSchema.safeParse(body.email);
        if (!emailResult.success) {
            return c.json(
                {
                    success: false,
                    error: {
                        code: 'INVALID_EMAIL',
                        message: emailResult.error.errors[0].message,
                    },
                },
                400
            );
        }

        if (!body.password) {
            return c.json(
                {
                    success: false,
                    error: {
                        code: 'MISSING_PASSWORD',
                        message: 'Password is required / 密码是必填项',
                    },
                },
                400
            );
        }

        const email = emailResult.data;

        // Get device info
        const deviceInfo = {
            user_agent: c.req.header('user-agent'),
            platform: 'API',
            browser: `TrustedClient: ${app.name}`,
        };
        const ipAddress = c.req.header('x-forwarded-for') || c.req.header('x-real-ip');

        // Login with email and password
        const result = await authService.loginWithEmail(
            email,
            body.password,
            deviceInfo,
            ipAddress
        );

        if (!result.success) {
            return c.json(
                {
                    success: false,
                    error: {
                        code: 'LOGIN_FAILED',
                        message: result.message,
                    },
                },
                401
            );
        }

        // Generate tokens with client audience
        const tokens = await generateTokenPair(result.user!, {
            clientId: app.client_id,
        });

        // Store refresh token
        await authService.storeRefreshToken(
            result.user!.id,
            tokens.refresh_token,
            deviceInfo,
            ipAddress
        );

        return c.json({
            success: true,
            data: {
                user: result.user,
                access_token: tokens.access_token,
                refresh_token: tokens.refresh_token,
                expires_in: tokens.expires_in,
            },
            message: result.message,
        });
    } catch (error) {
        console.error('Trusted email login error:', error);
        return c.json(
            {
                success: false,
                error: {
                    code: 'INTERNAL_ERROR',
                    message: 'Internal server error / 服务器内部错误',
                },
            },
            500
        );
    }
});

// ============================================
// MFA Routes
// ============================================

/**
 * Verify MFA code
 * 验证 MFA 验证码
 * 
 * POST /api/v1/auth/trusted/mfa/verify
 */
trustedAuthRouter.post('/mfa/verify', async (c) => {
    try {
        const body = await c.req.json();
        const app = getApplication(c);

        if (!body.mfa_token) {
            return c.json(
                {
                    success: false,
                    error: {
                        code: 'MISSING_MFA_TOKEN',
                        message: 'MFA token is required / MFA 令牌是必填项',
                    },
                },
                400
            );
        }

        // Validate code (6 digits for TOTP, or longer for recovery)
        const mfaCodeSchema = z.string().min(6).max(10);
        const codeResult = mfaCodeSchema.safeParse(body.code);
        if (!codeResult.success) {
            return c.json(
                {
                    success: false,
                    error: {
                        code: 'INVALID_CODE',
                        message: 'Invalid MFA code format / MFA 验证码格式错误',
                    },
                },
                400
            );
        }

        // Get device info
        const deviceInfo = {
            user_agent: c.req.header('user-agent'),
            platform: 'API',
            browser: `TrustedClient: ${app.name}`,
        };
        const ipAddress = c.req.header('x-forwarded-for') || c.req.header('x-real-ip');

        // Complete MFA login
        const result = await authService.completeMFALogin(
            body.mfa_token,
            codeResult.data,
            deviceInfo,
            ipAddress
        );

        if (!result.success) {
            return c.json(
                {
                    success: false,
                    error: {
                        code: 'MFA_VERIFY_FAILED',
                        message: result.message,
                    },
                },
                401
            );
        }

        // Generate tokens with client audience
        const tokens = await generateTokenPair(result.user!, {
            clientId: app.client_id,
        });

        // Store refresh token
        await authService.storeRefreshToken(
            result.user!.id,
            tokens.refresh_token,
            deviceInfo,
            ipAddress
        );

        return c.json({
            success: true,
            data: {
                user: result.user,
                access_token: tokens.access_token,
                refresh_token: tokens.refresh_token,
                expires_in: tokens.expires_in,
            },
            message: result.message,
        });
    } catch (error) {
        console.error('Trusted MFA verify error:', error);
        return c.json(
            {
                success: false,
                error: {
                    code: 'INTERNAL_ERROR',
                    message: 'Internal server error / 服务器内部错误',
                },
            },
            500
        );
    }
});

// ============================================
// Token Routes
// ============================================

/**
 * Refresh access token
 * 刷新访问令牌
 * 
 * POST /api/v1/auth/trusted/token/refresh
 */
trustedAuthRouter.post('/token/refresh', async (c) => {
    try {
        const body = await c.req.json();
        const app = getApplication(c);

        if (!body.refresh_token) {
            return c.json(
                {
                    success: false,
                    error: {
                        code: 'MISSING_REFRESH_TOKEN',
                        message: 'Refresh token is required / 刷新令牌是必填项',
                    },
                },
                400
            );
        }

        // Get device info
        const deviceInfo = {
            user_agent: c.req.header('user-agent'),
            platform: 'API',
            browser: `TrustedClient: ${app.name}`,
        };
        const ipAddress = c.req.header('x-forwarded-for') || c.req.header('x-real-ip');

        // Refresh token (authService handles token generation and storage)
        const result = await authService.refreshToken(
            body.refresh_token,
            deviceInfo,
            ipAddress
        );

        if (!result.success || !result.tokens) {
            return c.json(
                {
                    success: false,
                    error: {
                        code: 'REFRESH_FAILED',
                        message: result.message,
                    },
                },
                401
            );
        }

        // Note: The tokens generated by authService.refreshToken() don't include clientId audience.
        // For trusted clients that need audience validation, they should use the standard OAuth2 token endpoint.
        // This endpoint is for convenience and backward compatibility.

        return c.json({
            success: true,
            data: {
                access_token: result.tokens.access_token,
                refresh_token: result.tokens.refresh_token,
                expires_in: result.tokens.expires_in,
            },
            message: 'Token refreshed successfully / 令牌刷新成功',
        });
    } catch (error) {
        console.error('Trusted token refresh error:', error);
        return c.json(
            {
                success: false,
                error: {
                    code: 'INTERNAL_ERROR',
                    message: 'Internal server error / 服务器内部错误',
                },
            },
            500
        );
    }
});

export default trustedAuthRouter;
