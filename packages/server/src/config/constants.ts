/**
 * Application constants
 * 应用常量
 */

// Verification code settings
export const VERIFICATION_CODE = {
    LENGTH: 6,
    EXPIRES_IN_SECONDS: 300, // 5 minutes
    RETRY_AFTER_SECONDS: 60, // 1 minute between sends
    MAX_ATTEMPTS: 5, // Max verification attempts
} as const;

// Rate limiting settings
export const RATE_LIMIT = {
    SEND_CODE_WINDOW_MS: 60 * 1000, // 1 minute
    SEND_CODE_MAX_REQUESTS: 1,
    VERIFY_CODE_WINDOW_MS: 15 * 60 * 1000, // 15 minutes
    VERIFY_CODE_MAX_REQUESTS: 5,
    GLOBAL_WINDOW_MS: 60 * 1000, // 1 minute
    GLOBAL_MAX_REQUESTS: 100,
} as const;

// Token settings
export const TOKEN = {
    ACCESS_TOKEN_EXPIRES_IN: 60 * 60, // 1 hour in seconds
    REFRESH_TOKEN_EXPIRES_IN: 30 * 24 * 60 * 60, // 30 days in seconds
} as const;

// User status
export const USER_STATUS = {
    ACTIVE: 'active',
    SUSPENDED: 'suspended',
    DELETED: 'deleted',
} as const;

// Verification code types
export const CODE_TYPE = {
    LOGIN: 'login',
    REGISTER: 'register',
    RESET: 'reset',
} as const;

// API response messages (bilingual)
export const MESSAGES = {
    SUCCESS: {
        CODE_SENT: '验证码已发送 / Verification code sent',
        LOGIN_SUCCESS: '登录成功 / Login successful',
        LOGOUT_SUCCESS: '登出成功 / Logout successful',
        TOKEN_REFRESHED: '令牌已刷新 / Token refreshed',
        USER_UPDATED: '用户信息已更新 / User info updated',
    },
    ERROR: {
        INVALID_PHONE: '无效的手机号 / Invalid phone number',
        INVALID_CODE: '验证码错误 / Invalid verification code',
        CODE_EXPIRED: '验证码已过期 / Verification code expired',
        CODE_USED: '验证码已使用 / Verification code already used',
        TOO_MANY_ATTEMPTS: '尝试次数过多，请稍后再试 / Too many attempts, please try later',
        RATE_LIMIT_EXCEEDED: '请求过于频繁，请稍后再试 / Rate limit exceeded, please try later',
        USER_SUSPENDED: '账户已被暂停 / Account suspended',
        USER_NOT_FOUND: '用户不存在 / User not found',
        INVALID_TOKEN: '无效的访问令牌 / Invalid access token',
        TOKEN_EXPIRED: '令牌已过期 / Token expired',
        UNAUTHORIZED: '未授权访问 / Unauthorized',
        INTERNAL_ERROR: '服务器内部错误 / Internal server error',
        SMS_SEND_FAILED: '短信发送失败 / Failed to send SMS',
    },
} as const;
