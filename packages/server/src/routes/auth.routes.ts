import { Hono } from 'hono';
import { z } from 'zod';
import { authService } from '../services/auth.service.js';
import { getClientInfo, authMiddleware } from '../middlewares/index.js';
import { getOAuthAuthUrl, getConfiguredOAuthProviders } from '../lib/index.js';
import { validatePasswordStrength } from '../lib/password.js';
import type { HonoVariables, OAuthProvider } from '../types/index.js';
import { nanoid } from 'nanoid';

const authRouter = new Hono<{ Variables: HonoVariables }>();

/**
 * Validate captcha token
 * 验证人机验证令牌
 * 
 * This is a simple implementation that validates the token format and age.
 * For production, consider integrating with external services like:
 * - Tencent Captcha (腾讯验证码)
 * - Alibaba CAPTCHA (阿里验证码)
 * - reCAPTCHA / hCaptcha
 */
function validateCaptchaToken(token: string): boolean {
    // Token format: captcha_{timestamp}_{random}
    if (!token || typeof token !== 'string') {
        return false;
    }

    const parts = token.split('_');
    if (parts.length !== 3 || parts[0] !== 'captcha') {
        return false;
    }

    const timestamp = parseInt(parts[1], 10);
    if (isNaN(timestamp)) {
        return false;
    }

    // Token must be generated within the last 5 minutes
    const now = Date.now();
    const maxAge = 5 * 60 * 1000; // 5 minutes
    if (now - timestamp > maxAge) {
        return false;
    }

    // Token must not be from the future (with 10 second tolerance)
    if (timestamp > now + 10000) {
        return false;
    }

    return true;
}

/**
 * Phone number validation schema
 * 手机号验证模式
 */
const phoneSchema = z.string().regex(/^\+[1-9]\d{6,14}$/, {
    message: 'Phone number must be in E.164 format (e.g., +8613800138000)',
});

/**
 * Email validation schema
 * 邮箱验证模式
 */
const emailSchema = z.string().email({
    message: 'Invalid email format / 邮箱格式无效',
});

// ============================================
// Phone Authentication Routes / 手机认证路由
// ============================================

/**
 * Send phone verification code
 * 发送手机验证码
 *
 * POST /api/v1/auth/phone/send-code
 */
authRouter.post('/phone/send-code', async (c) => {
    try {
        const body = await c.req.json();

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

        // Validate captcha token (anti-bot protection)
        const captchaToken = body.captcha_token;
        if (!captchaToken || !validateCaptchaToken(captchaToken)) {
            return c.json(
                {
                    success: false,
                    error: {
                        code: 'CAPTCHA_REQUIRED',
                        message: 'Please complete the captcha verification / 请完成人机验证',
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
        });
    } catch (error) {
        console.error('Send code error:', error);
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
 * Verify phone code and login
 * 验证手机验证码并登录
 *
 * POST /api/v1/auth/phone/verify
 */
authRouter.post('/phone/verify', async (c) => {
    try {
        const body = await c.req.json();

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
        const codeSchema = z.string().length(6).regex(/^\d+$/);
        const codeResult = codeSchema.safeParse(body.code);
        if (!codeResult.success) {
            return c.json(
                {
                    success: false,
                    error: {
                        code: 'INVALID_CODE',
                        message: 'Verification code must be 6 digits',
                    },
                },
                400
            );
        }

        const phone = phoneResult.data;
        const code = codeResult.data;
        const { ipAddress, deviceInfo } = getClientInfo(c);

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

        return c.json({
            success: true,
            data: {
                user: result.user,
                access_token: result.tokens!.access_token,
                refresh_token: result.tokens!.refresh_token,
                expires_in: result.tokens!.expires_in,
                is_new_user: result.isNewUser,
            },
            message: result.message,
        });
    } catch (error) {
        console.error('Verify code error:', error);
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

// Legacy route for backward compatibility
authRouter.post('/send-code', async (c) => {
    // Redirect to phone/send-code
    const body = await c.req.json();
    const newReq = new Request(c.req.url.replace('/send-code', '/phone/send-code'), {
        method: 'POST',
        headers: c.req.raw.headers,
        body: JSON.stringify(body),
    });
    return authRouter.fetch(newReq, c.env);
});

authRouter.post('/verify-code', async (c) => {
    // Redirect to phone/verify
    const body = await c.req.json();
    const newReq = new Request(c.req.url.replace('/verify-code', '/phone/verify'), {
        method: 'POST',
        headers: c.req.raw.headers,
        body: JSON.stringify(body),
    });
    return authRouter.fetch(newReq, c.env);
});

// ============================================
// Email Authentication Routes / 邮箱认证路由
// ============================================

/**
 * Register with email
 * 邮箱注册
 *
 * POST /api/v1/auth/email/register
 */
authRouter.post('/email/register', async (c) => {
    try {
        const body = await c.req.json();

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

        // Validate password
        if (!body.password || typeof body.password !== 'string') {
            return c.json(
                {
                    success: false,
                    error: {
                        code: 'INVALID_PASSWORD',
                        message: 'Password is required / 密码是必填项',
                    },
                },
                400
            );
        }

        const passwordValidation = validatePasswordStrength(body.password);
        if (!passwordValidation.valid) {
            return c.json(
                {
                    success: false,
                    error: {
                        code: 'WEAK_PASSWORD',
                        message: passwordValidation.errors.join('; '),
                    },
                },
                400
            );
        }

        const { ipAddress, deviceInfo } = getClientInfo(c);

        const result = await authService.registerWithEmail(
            emailResult.data,
            body.password,
            body.nickname,
            deviceInfo,
            ipAddress
        );

        if (!result.success) {
            return c.json(
                {
                    success: false,
                    error: {
                        code: 'REGISTER_FAILED',
                        message: result.message,
                    },
                },
                400
            );
        }

        return c.json({
            success: true,
            data: {
                user: result.user,
                access_token: result.tokens!.access_token,
                refresh_token: result.tokens!.refresh_token,
                expires_in: result.tokens!.expires_in,
            },
            message: result.message,
        });
    } catch (error) {
        console.error('Register error:', error);
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
 * Login with email
 * 邮箱登录
 *
 * POST /api/v1/auth/email/login
 */
authRouter.post('/email/login', async (c) => {
    try {
        const body = await c.req.json();

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
                        code: 'INVALID_PASSWORD',
                        message: 'Password is required / 密码是必填项',
                    },
                },
                400
            );
        }

        const { ipAddress, deviceInfo } = getClientInfo(c);

        const result = await authService.loginWithEmail(
            emailResult.data,
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

        return c.json({
            success: true,
            data: {
                user: result.user,
                access_token: result.tokens!.access_token,
                refresh_token: result.tokens!.refresh_token,
                expires_in: result.tokens!.expires_in,
            },
            message: result.message,
        });
    } catch (error) {
        console.error('Login error:', error);
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
 * Send email verification code
 * 发送邮箱验证码
 *
 * POST /api/v1/auth/email/send-code
 */
authRouter.post('/email/send-code', async (c) => {
    try {
        const body = await c.req.json();

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

        const type = body.type || 'email_verify';

        const result = await authService.sendEmailCode(emailResult.data, type);

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
        });
    } catch (error) {
        console.error('Send email code error:', error);
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
 * Verify email code
 * 验证邮箱验证码
 *
 * POST /api/v1/auth/email/verify-code
 */
authRouter.post('/email/verify-code', async (c) => {
    try {
        const body = await c.req.json();

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
        const codeSchema = z.string().length(6).regex(/^\d+$/);
        const codeResult = codeSchema.safeParse(body.code);
        if (!codeResult.success) {
            return c.json(
                {
                    success: false,
                    error: {
                        code: 'INVALID_CODE',
                        message: 'Verification code must be 6 digits / 验证码必须是6位数字',
                    },
                },
                400
            );
        }

        // Optional: get user_id if authenticated
        const userId = body.user_id;

        const result = await authService.verifyEmailCode(
            emailResult.data,
            codeResult.data,
            userId
        );

        if (!result.success) {
            return c.json(
                {
                    success: false,
                    error: {
                        code: 'VERIFY_FAILED',
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
        console.error('Verify email code error:', error);
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
 * Verify email code and login (passwordless)
 * 验证邮箱验证码并登录（无密码模式）
 *
 * POST /api/v1/auth/email/verify
 * 
 * This endpoint verifies the code and logs in the user.
 * If the user doesn't exist, it will be created automatically.
 */
authRouter.post('/email/verify', async (c) => {
    try {
        const body = await c.req.json();

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
        const codeSchema = z.string().length(6).regex(/^\d+$/);
        const codeResult = codeSchema.safeParse(body.code);
        if (!codeResult.success) {
            return c.json(
                {
                    success: false,
                    error: {
                        code: 'INVALID_CODE',
                        message: 'Verification code must be 6 digits / 验证码必须是6位数字',
                    },
                },
                400
            );
        }

        // Get device info
        const deviceInfo = {
            user_agent: c.req.header('user-agent'),
        };
        const ipAddress = c.req.header('x-forwarded-for') || c.req.header('x-real-ip');

        const result = await authService.loginWithEmailCode(
            emailResult.data,
            codeResult.data,
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
                400
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

        return c.json({
            success: true,
            data: {
                user: result.user,
                access_token: result.tokens?.access_token,
                refresh_token: result.tokens?.refresh_token,
            },
            message: result.message,
        });
    } catch (error) {
        console.error('Email verify login error:', error);
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
// MFA Login Verification / MFA 登录验证
// ============================================

/**
 * Verify MFA code during login
 * 登录时验证 MFA 验证码
 *
 * POST /api/v1/auth/mfa/verify-login
 */
authRouter.post('/mfa/verify-login', async (c) => {
    try {
        const body = await c.req.json();

        // Validate mfa_token
        if (!body.mfa_token || typeof body.mfa_token !== 'string') {
            return c.json(
                {
                    success: false,
                    error: {
                        code: 'INVALID_MFA_TOKEN',
                        message: 'MFA token is required / MFA 令牌是必填项',
                    },
                },
                400
            );
        }

        // Validate code (6 digits for TOTP, or longer for recovery code)
        const codeSchema = z.string().min(6).max(10);
        const codeResult = codeSchema.safeParse(body.code);
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

        const { ipAddress, deviceInfo } = getClientInfo(c);

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

        return c.json({
            success: true,
            data: {
                user: result.user,
                access_token: result.tokens!.access_token,
                refresh_token: result.tokens!.refresh_token,
                expires_in: result.tokens!.expires_in,
            },
            message: result.message,
        });
    } catch (error) {
        console.error('MFA verify login error:', error);
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
// OAuth Routes / OAuth 路由
// ============================================

/**
 * Get OAuth providers
 * 获取可用的 OAuth 提供商
 *
 * GET /api/v1/auth/oauth/providers
 */
authRouter.get('/oauth/providers', (c) => {
    const providers = getConfiguredOAuthProviders();
    return c.json({
        success: true,
        data: {
            providers,
        },
    });
});

/**
 * Get OAuth authorization URL
 * 获取 OAuth 授权 URL
 *
 * GET /api/v1/auth/oauth/:provider/authorize
 */
authRouter.get('/oauth/:provider/authorize', (c) => {
    const provider = c.req.param('provider') as OAuthProvider;
    const state = nanoid(32);

    const authUrl = getOAuthAuthUrl(provider, state);

    if (!authUrl) {
        return c.json(
            {
                success: false,
                error: {
                    code: 'PROVIDER_NOT_CONFIGURED',
                    message: `OAuth provider ${provider} is not configured / OAuth 提供商 ${provider} 未配置`,
                },
            },
            400
        );
    }

    return c.json({
        success: true,
        data: {
            auth_url: authUrl,
            state,
        },
    });
});

/**
 * Handle OAuth callback
 * 处理 OAuth 回调
 *
 * POST /api/v1/auth/oauth/:provider/callback
 */
authRouter.post('/oauth/:provider/callback', async (c) => {
    try {
        const provider = c.req.param('provider') as OAuthProvider;
        const body = await c.req.json();

        if (!body.code) {
            return c.json(
                {
                    success: false,
                    error: {
                        code: 'MISSING_CODE',
                        message: 'Authorization code is required / 授权码是必填项',
                    },
                },
                400
            );
        }

        const { ipAddress, deviceInfo } = getClientInfo(c);

        const result = await authService.handleOAuthCallback(
            provider,
            body.code,
            deviceInfo,
            ipAddress
        );

        if (!result.success) {
            return c.json(
                {
                    success: false,
                    error: {
                        code: 'OAUTH_FAILED',
                        message: result.message,
                    },
                },
                401
            );
        }

        return c.json({
            success: true,
            data: {
                user: result.user,
                access_token: result.tokens!.access_token,
                refresh_token: result.tokens!.refresh_token,
                expires_in: result.tokens!.expires_in,
                is_new_user: result.isNewUser,
            },
            message: result.message,
        });
    } catch (error) {
        console.error('OAuth callback error:', error);
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
// Token Management Routes / 令牌管理路由
// ============================================

/**
 * Refresh token
 * 刷新令牌
 *
 * POST /api/v1/auth/refresh
 */
authRouter.post('/refresh', async (c) => {
    try {
        const body = await c.req.json();

        if (!body.refresh_token) {
            return c.json(
                {
                    success: false,
                    error: {
                        code: 'MISSING_TOKEN',
                        message: 'Refresh token is required',
                    },
                },
                400
            );
        }

        const { ipAddress, deviceInfo } = getClientInfo(c);

        const result = await authService.refreshToken(
            body.refresh_token,
            deviceInfo,
            ipAddress
        );

        if (!result.success) {
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

        return c.json({
            success: true,
            data: {
                access_token: result.tokens!.access_token,
                refresh_token: result.tokens!.refresh_token,
                expires_in: result.tokens!.expires_in,
            },
            message: result.message,
        });
    } catch (error) {
        console.error('Refresh token error:', error);
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
 * Logout
 * 登出
 *
 * POST /api/v1/auth/logout
 */
authRouter.post('/logout', authMiddleware(), async (c) => {
    try {
        const body = await c.req.json();
        const user = c.get('user');
        const { ipAddress, userAgent } = getClientInfo(c);

        const result = await authService.logout(
            body.refresh_token || '',
            user.id,
            ipAddress,
            userAgent
        );

        return c.json({
            success: true,
            message: result.message,
        });
    } catch (error) {
        console.error('Logout error:', error);
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
 * Logout from all devices
 * 从所有设备登出
 *
 * POST /api/v1/auth/logout-all
 */
authRouter.post('/logout-all', authMiddleware(), async (c) => {
    try {
        const user = c.get('user');
        const { ipAddress, userAgent } = getClientInfo(c);

        const result = await authService.logoutAll(user.id, ipAddress, userAgent);

        return c.json({
            success: true,
            message: result.message,
        });
    } catch (error) {
        console.error('Logout all error:', error);
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

export { authRouter };
