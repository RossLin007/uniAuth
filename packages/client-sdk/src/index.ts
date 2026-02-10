/**
 * UniAuth Client SDK
 * 统一认证前端 SDK
 *
 * Usage:
 * ```typescript
 * import { UniAuthClient } from '@55387.ai/uniauth-client';
 *
 * const auth = new UniAuthClient({
 *   baseUrl: 'https://auth.example.com',
 *   appKey: 'your-app-key',
 * });
 *
 * // Send verification code
 * await auth.sendCode('+8613800138000');
 *
 * // Login with code
 * const result = await auth.loginWithCode('+8613800138000', '123456');
 *
 * // Get current user
 * const user = await auth.getCurrentUser();
 *
 * // Logout
 * await auth.logout();
 * ```
 */

import {
    fetchWithRetry,
    generateCodeVerifier,
    generateCodeChallenge,
    storeCodeVerifier,
    getAndClearCodeVerifier,
    type FetchWithRetryOptions
} from './http.js';

// Types
export interface UniAuthConfig {
    /** API base URL */
    baseUrl: string;
    /** Application key */
    appKey?: string;
    /** OAuth2 Client ID (for OAuth flows) */
    clientId?: string;
    /** OAuth2 Client Secret (for trusted SPA clients like internal admin consoles) */
    clientSecret?: string;
    /** Storage type for tokens */
    storage?: 'localStorage' | 'sessionStorage' | 'memory';
    /** Callback when tokens are refreshed */
    onTokenRefresh?: (tokens: TokenPair) => void;
    /** Callback when auth error occurs */
    onAuthError?: (error: AuthError) => void;
    /** Enable request retry with exponential backoff */
    enableRetry?: boolean;
    /** Request timeout in milliseconds */
    timeout?: number;
}

export interface UserInfo {
    id: string;
    phone: string | null;
    email: string | null;
    nickname: string | null;
    avatar_url: string | null;
}

export interface TokenPair {
    access_token: string;
    refresh_token: string;
    expires_in: number;
}

export interface LoginResult {
    user: UserInfo;
    access_token: string;
    refresh_token: string;
    expires_in: number;
    is_new_user: boolean;
    /** MFA is required, use mfa_token with verifyMFA() */
    mfa_required?: boolean;
    /** Temporary token for MFA verification */
    mfa_token?: string;
    /** Available MFA methods */
    mfa_methods?: string[];
}

export interface SendCodeResult {
    expires_in: number;
    retry_after: number;
}

export interface AuthError {
    code: string;
    message: string;
}

export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    message?: string;
    error?: AuthError;
}

/**
 * OAuth Provider Information
 * OAuth 提供商信息
 */
export interface OAuthProvider {
    id: string;
    name: string;
    enabled: boolean;
    icon?: string;
}

/**
 * Auth state change callback
 * 认证状态变更回调
 */
export type AuthStateChangeCallback = (user: UserInfo | null, isAuthenticated: boolean) => void;

/**
 * Error codes for UniAuth operations
 * UniAuth 操作错误码
 */
export const AuthErrorCode = {
    // Authentication errors
    SEND_CODE_FAILED: 'SEND_CODE_FAILED',
    VERIFY_FAILED: 'VERIFY_FAILED',
    LOGIN_FAILED: 'LOGIN_FAILED',
    OAUTH_FAILED: 'OAUTH_FAILED',
    MFA_REQUIRED: 'MFA_REQUIRED',
    MFA_FAILED: 'MFA_FAILED',
    REGISTER_FAILED: 'REGISTER_FAILED',

    // Token errors
    NOT_AUTHENTICATED: 'NOT_AUTHENTICATED',
    TOKEN_EXPIRED: 'TOKEN_EXPIRED',
    REFRESH_FAILED: 'REFRESH_FAILED',

    // Configuration errors
    CONFIG_ERROR: 'CONFIG_ERROR',
    SSO_NOT_CONFIGURED: 'SSO_NOT_CONFIGURED',
    INVALID_STATE: 'INVALID_STATE',

    // Network errors
    NETWORK_ERROR: 'NETWORK_ERROR',
    TIMEOUT: 'TIMEOUT',
    INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export type AuthErrorCodeType = typeof AuthErrorCode[keyof typeof AuthErrorCode];

/**
 * Custom error class for UniAuth operations
 * UniAuth 操作自定义错误类
 */
export class UniAuthError extends Error {
    code: AuthErrorCodeType | string;
    statusCode?: number;
    details?: unknown;

    constructor(code: AuthErrorCodeType | string, message: string, statusCode?: number, details?: unknown) {
        super(message);
        this.name = 'UniAuthError';
        this.code = code;
        this.statusCode = statusCode;
        this.details = details;

        // Maintain proper stack trace for where error was thrown
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, UniAuthError);
        }
    }
}


export interface OAuth2AuthorizeOptions {
    redirectUri: string;
    scope?: string;
    state?: string;
    /** Use PKCE (recommended for public clients) */
    usePKCE?: boolean;
}

export interface OAuth2TokenResult {
    access_token: string;
    token_type: string;
    expires_in: number;
    refresh_token?: string;
}

/**
 * SSO Configuration
 * SSO 配置
 */
export interface SSOConfig {
    /** SSO service URL (e.g., https://sso.example.com) */
    ssoUrl: string;
    /** OAuth client ID for this application */
    clientId: string;
    /** Redirect URI after SSO login */
    redirectUri: string;
    /** OAuth scope (default: 'openid profile email') */
    scope?: string;
}

/**
 * SSO Login Options
 * SSO 登录选项
 */
export interface SSOLoginOptions {
    /** Use PKCE (recommended, default: true) */
    usePKCE?: boolean;
    /** Custom state parameter */
    state?: string;
    /** Whether to use popup instead of redirect */
    usePopup?: boolean;
}

// Token storage
interface TokenStorage {
    getAccessToken(): string | null;
    setAccessToken(token: string): void;
    getRefreshToken(): string | null;
    setRefreshToken(token: string): void;
    clear(): void;
}

class LocalStorageAdapter implements TokenStorage {
    private accessTokenKey = 'uniauth_access_token';
    private refreshTokenKey = 'uniauth_refresh_token';

    getAccessToken(): string | null {
        if (typeof localStorage === 'undefined') return null;
        return localStorage.getItem(this.accessTokenKey);
    }

    setAccessToken(token: string): void {
        if (typeof localStorage === 'undefined') return;
        localStorage.setItem(this.accessTokenKey, token);
    }

    getRefreshToken(): string | null {
        if (typeof localStorage === 'undefined') return null;
        return localStorage.getItem(this.refreshTokenKey);
    }

    setRefreshToken(token: string): void {
        if (typeof localStorage === 'undefined') return;
        localStorage.setItem(this.refreshTokenKey, token);
    }

    clear(): void {
        if (typeof localStorage === 'undefined') return;
        localStorage.removeItem(this.accessTokenKey);
        localStorage.removeItem(this.refreshTokenKey);
    }
}

class SessionStorageAdapter implements TokenStorage {
    private accessTokenKey = 'uniauth_access_token';
    private refreshTokenKey = 'uniauth_refresh_token';

    getAccessToken(): string | null {
        if (typeof sessionStorage === 'undefined') return null;
        return sessionStorage.getItem(this.accessTokenKey);
    }

    setAccessToken(token: string): void {
        if (typeof sessionStorage === 'undefined') return;
        sessionStorage.setItem(this.accessTokenKey, token);
    }

    getRefreshToken(): string | null {
        if (typeof sessionStorage === 'undefined') return null;
        return sessionStorage.getItem(this.refreshTokenKey);
    }

    setRefreshToken(token: string): void {
        if (typeof sessionStorage === 'undefined') return;
        sessionStorage.setItem(this.refreshTokenKey, token);
    }

    clear(): void {
        if (typeof sessionStorage === 'undefined') return;
        sessionStorage.removeItem(this.accessTokenKey);
        sessionStorage.removeItem(this.refreshTokenKey);
    }
}

class MemoryStorageAdapter implements TokenStorage {
    private accessToken: string | null = null;
    private refreshToken: string | null = null;

    getAccessToken(): string | null {
        return this.accessToken;
    }

    setAccessToken(token: string): void {
        this.accessToken = token;
    }

    getRefreshToken(): string | null {
        return this.refreshToken;
    }

    setRefreshToken(token: string): void {
        this.refreshToken = token;
    }

    clear(): void {
        this.accessToken = null;
        this.refreshToken = null;
    }
}

/**
 * UniAuth Client
 * 统一认证客户端
 */
export class UniAuthClient {
    private config: UniAuthConfig;
    private storage: TokenStorage;
    private refreshPromise: Promise<boolean> | null = null;

    constructor(config: UniAuthConfig) {
        this.config = {
            enableRetry: true,
            timeout: 30000,
            ...config,
        };

        // Initialize storage adapter
        switch (config.storage) {
            case 'sessionStorage':
                this.storage = new SessionStorageAdapter();
                break;
            case 'memory':
                this.storage = new MemoryStorageAdapter();
                break;
            default:
                this.storage = new LocalStorageAdapter();
        }
    }

    /**
     * Send verification code to phone number
     * 发送验证码到手机号
     * 
     * @param phone - Phone number in E.164 format (e.g., +8613800138000)
     * @param type - Purpose of the verification code
     * @param captchaToken - Captcha verification token from slider captcha
     */
    async sendCode(
        phone: string,
        type: 'login' | 'register' | 'reset' = 'login',
        captchaToken?: string
    ): Promise<SendCodeResult> {
        // Validate phone number format (E.164: +countrycode + number)
        if (!phone || typeof phone !== 'string') {
            throw this.createError('INVALID_PHONE', 'Phone number is required / 请输入手机号');
        }

        // Country-specific validation rules
        const countryValidation: Record<string, { regex: RegExp; example: string; name: string }> = {
            // China: +86 followed by 11 digits starting with 1
            '+86': {
                regex: /^\+861[3-9]\d{9}$/,
                example: '+8613800138000',
                name: '中国'
            },
            // USA/Canada: +1 followed by 10 digits (NPA-NXX-XXXX)
            '+1': {
                regex: /^\+1[2-9]\d{2}[2-9]\d{6}$/,
                example: '+14155552671',
                name: 'USA/Canada'
            },
            // Australia: +61 followed by 9 digits starting with 4 (mobile)
            '+61': {
                regex: /^\+614\d{8}$/,
                example: '+61412345678',
                name: 'Australia'
            },
            // UK: +44 followed by 10 digits starting with 7 (mobile)
            '+44': {
                regex: /^\+447\d{9}$/,
                example: '+447911123456',
                name: 'UK'
            },
            // Japan: +81 followed by 10-11 digits
            '+81': {
                regex: /^\+81[789]0\d{8}$/,
                example: '+818012345678',
                name: 'Japan'
            },
        };

        // Extract country code (try +1, +86, +61, etc.)
        let countryCode = '';
        let validation = null;

        for (const code of Object.keys(countryValidation).sort((a, b) => b.length - a.length)) {
            if (phone.startsWith(code)) {
                countryCode = code;
                validation = countryValidation[code];
                break;
            }
        }

        if (validation) {
            // Country-specific validation
            if (!validation.regex.test(phone)) {
                throw this.createError(
                    'INVALID_PHONE_FORMAT',
                    `Invalid ${validation.name} phone number format. Example: ${validation.example} / ${validation.name}手机号格式错误，示例：${validation.example}`
                );
            }
        } else {
            // Fallback: Generic E.164 validation for other countries
            const e164Regex = /^\+[1-9]\d{6,14}$/;
            if (!e164Regex.test(phone)) {
                throw this.createError(
                    'INVALID_PHONE_FORMAT',
                    'Phone number must be in E.164 format (e.g., +8613800138000) / 手机号格式错误，请使用国际格式（如 +8613800138000）'
                );
            }
        }

        const response = await this.request<SendCodeResult>('/api/v1/auth/phone/send-code', {
            method: 'POST',
            body: JSON.stringify({
                phone,
                type,
                captcha_token: captchaToken
            }),
        });

        if (!response.success || !response.data) {
            throw this.createError(response.error?.code || 'SEND_CODE_FAILED', response.error?.message || 'Failed to send code');
        }

        return response.data;
    }

    /**
     * Send verification code to email
     * 发送验证码到邮箱
     * 
     * @param email - Email address
     * @param type - Purpose of the verification code  
     * @param captchaToken - Captcha verification token from slider captcha
     */
    async sendEmailCode(
        email: string,
        type: 'login' | 'register' | 'reset' | 'email_verify' = 'login',
        captchaToken?: string
    ): Promise<SendCodeResult> {
        const response = await this.request<SendCodeResult>('/api/v1/auth/email/send-code', {
            method: 'POST',
            body: JSON.stringify({ email, type, captcha_token: captchaToken }),
        });

        if (!response.success || !response.data) {
            throw this.createError(response.error?.code || 'SEND_CODE_FAILED', response.error?.message || 'Failed to send code');
        }

        return response.data;
    }

    /**
     * Login with phone verification code
     * 使用手机验证码登录
     */
    async loginWithCode(phone: string, code: string): Promise<LoginResult> {
        const response = await this.request<LoginResult>('/api/v1/auth/phone/verify', {
            method: 'POST',
            body: JSON.stringify({ phone, code }),
        });

        if (!response.success || !response.data) {
            throw this.createError(response.error?.code || 'VERIFY_FAILED', response.error?.message || 'Failed to verify code');
        }

        // Store tokens if not MFA required
        if (!response.data.mfa_required) {
            this.storage.setAccessToken(response.data.access_token);
            this.storage.setRefreshToken(response.data.refresh_token);
            this.notifyAuthStateChange(response.data.user);
        }

        return response.data;
    }

    /**
     * Login with email verification code
     * 使用邮箱验证码登录
     */
    async loginWithEmailCode(email: string, code: string): Promise<LoginResult> {
        const response = await this.request<LoginResult>('/api/v1/auth/email/verify', {
            method: 'POST',
            body: JSON.stringify({ email, code }),
        });

        if (!response.success || !response.data) {
            throw this.createError(response.error?.code || 'VERIFY_FAILED', response.error?.message || 'Failed to verify code');
        }

        // Store tokens if not MFA required
        if (!response.data.mfa_required) {
            this.storage.setAccessToken(response.data.access_token);
            this.storage.setRefreshToken(response.data.refresh_token);
            this.notifyAuthStateChange(response.data.user);
        }

        return response.data;
    }

    /**
     * Login with email and password
     * 使用邮箱密码登录
     */
    async loginWithEmail(email: string, password: string): Promise<LoginResult> {
        const response = await this.request<LoginResult>('/api/v1/auth/email/login', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
        });

        if (!response.success || !response.data) {
            throw this.createError(response.error?.code || 'LOGIN_FAILED', response.error?.message || 'Failed to login');
        }

        // Store tokens if not MFA required
        if (!response.data.mfa_required) {
            this.storage.setAccessToken(response.data.access_token);
            this.storage.setRefreshToken(response.data.refresh_token);
            this.notifyAuthStateChange(response.data.user);
        }

        return response.data;
    }

    /**
     * Handle OAuth callback (for social login)
     * 处理 OAuth 回调（社交登录）
     */
    async handleOAuthCallback(provider: string, code: string, redirectUri?: string): Promise<LoginResult> {
        const response = await this.request<LoginResult>(`/api/v1/auth/oauth/${provider}/callback`, {
            method: 'POST',
            body: JSON.stringify({ code, redirect_uri: redirectUri }),
        });

        if (!response.success || !response.data) {
            throw this.createError(response.error?.code || 'OAUTH_FAILED', response.error?.message || 'OAuth callback failed');
        }

        // Store tokens (if not MFA required)
        if (!response.data.mfa_required) {
            this.storage.setAccessToken(response.data.access_token);
            this.storage.setRefreshToken(response.data.refresh_token);
            this.notifyAuthStateChange(response.data.user);
        }

        return response.data;
    }

    // ============================================
    // Email Registration / 邮箱注册
    // ============================================

    /**
     * Register with email and password
     * 使用邮箱密码注册
     */
    async registerWithEmail(email: string, password: string, nickname?: string): Promise<LoginResult> {
        const response = await this.request<LoginResult>('/api/v1/auth/email/register', {
            method: 'POST',
            body: JSON.stringify({ email, password, nickname }),
        });

        if (!response.success || !response.data) {
            throw this.createError(response.error?.code || 'REGISTER_FAILED', response.error?.message || 'Failed to register');
        }

        // Store tokens
        this.storage.setAccessToken(response.data.access_token);
        this.storage.setRefreshToken(response.data.refresh_token);
        this.notifyAuthStateChange(response.data.user);

        return response.data;
    }

    // ============================================
    // MFA (Multi-Factor Authentication) / 多因素认证
    // ============================================

    /**
     * Verify MFA code to complete login
     * 验证 MFA 验证码完成登录
     * 
     * Call this after login returns mfa_required: true
     * 当登录返回 mfa_required: true 时调用此方法
     * 
     * @example
     * ```typescript
     * const result = await auth.loginWithCode(phone, code);
     * if (result.mfa_required) {
     *   const mfaCode = prompt('Enter MFA code:');
     *   const finalResult = await auth.verifyMFA(result.mfa_token!, mfaCode);
     * }
     * ```
     */
    async verifyMFA(mfaToken: string, code: string): Promise<LoginResult> {
        const response = await this.request<LoginResult>('/api/v1/auth/mfa/verify-login', {
            method: 'POST',
            body: JSON.stringify({ mfa_token: mfaToken, code }),
        });

        if (!response.success || !response.data) {
            throw this.createError(response.error?.code || 'MFA_FAILED', response.error?.message || 'MFA verification failed');
        }

        // Store tokens
        this.storage.setAccessToken(response.data.access_token);
        this.storage.setRefreshToken(response.data.refresh_token);
        this.notifyAuthStateChange(response.data.user);

        return response.data;
    }

    // ============================================
    // Social Login / 社交登录
    // ============================================

    /**
     * Get available OAuth providers
     * 获取可用的 OAuth 提供商列表
     */
    async getOAuthProviders(): Promise<OAuthProvider[]> {
        const response = await this.request<{ providers: OAuthProvider[] }>('/api/v1/auth/oauth/providers', {
            method: 'GET',
        });

        if (!response.success || !response.data) {
            return [];
        }

        return response.data.providers || [];
    }

    /**
     * Start social login (redirect to OAuth provider)
     * 开始社交登录（重定向到 OAuth 提供商）
     * 
     * @param provider - OAuth provider ID (e.g., 'google', 'github', 'wechat')
     * @param redirectUri - Where to redirect after OAuth (optional, uses default)
     * 
     * @example
     * ```typescript
     * // Redirect user to Google login
     * auth.startSocialLogin('google');
     * ```
     */
    startSocialLogin(provider: string, redirectUri?: string): void {
        const params = new URLSearchParams();
        if (redirectUri) {
            params.set('redirect_uri', redirectUri);
        }

        const query = params.toString();
        const url = `${this.config.baseUrl}/api/v1/auth/oauth/${provider}/authorize${query ? '?' + query : ''}`;

        if (typeof window !== 'undefined') {
            window.location.href = url;
        }
    }

    // ============================================
    // Auth State Management / 认证状态管理
    // ============================================

    private authStateCallbacks: AuthStateChangeCallback[] = [];
    private currentUser: UserInfo | null = null;

    /**
     * Subscribe to auth state changes
     * 订阅认证状态变更
     * 
     * @returns Unsubscribe function
     * 
     * @example
     * ```typescript
     * const unsubscribe = auth.onAuthStateChange((user, isAuthenticated) => {
     *   if (isAuthenticated) {
     *     console.log('User logged in:', user);
     *   } else {
     *     console.log('User logged out');
     *   }
     * });
     * 
     * // Later, to unsubscribe:
     * unsubscribe();
     * ```
     */
    onAuthStateChange(callback: AuthStateChangeCallback): () => void {
        this.authStateCallbacks.push(callback);

        // Return unsubscribe function
        return () => {
            const index = this.authStateCallbacks.indexOf(callback);
            if (index !== -1) {
                this.authStateCallbacks.splice(index, 1);
            }
        };
    }

    /**
     * Notify all subscribers of auth state change
     * 通知所有订阅者认证状态变更
     */
    private notifyAuthStateChange(user: UserInfo | null): void {
        this.currentUser = user;
        const isAuthenticated = this.isAuthenticated();

        for (const callback of this.authStateCallbacks) {
            try {
                callback(user, isAuthenticated);
            } catch (error) {
                console.error('Auth state callback error:', error);
            }
        }
    }

    /**
     * Get cached current user (sync, may be stale)
     * 获取缓存的当前用户（同步，可能过时）
     */
    getCachedUser(): UserInfo | null {
        return this.currentUser;
    }

    /**
     * Get access token synchronously (without refresh check)
     * 同步获取访问令牌（不检查刷新）
     */
    getAccessTokenSync(): string | null {
        return this.storage.getAccessToken();
    }

    /**
     * Check if current token is valid (not expired)
     * 检查当前令牌是否有效（未过期）
     */
    isTokenValid(): boolean {
        const token = this.storage.getAccessToken();
        if (!token) return false;

        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            const exp = payload.exp * 1000;
            return Date.now() < exp;
        } catch {
            return false;
        }
    }


    /**
     * Get current user info
     * 获取当前用户信息
     */
    async getCurrentUser(): Promise<UserInfo | null> {
        if (!this.isAuthenticated()) {
            return null;
        }

        try {
            const response = await this.authenticatedRequest<UserInfo>('/api/v1/user/me', {
                method: 'GET',
            });

            if (!response.success || !response.data) {
                return null;
            }

            return response.data;
        } catch {
            return null;
        }
    }

    /**
     * Update user profile
     * 更新用户资料
     */
    async updateProfile(updates: Partial<Pick<UserInfo, 'nickname' | 'avatar_url'>>): Promise<UserInfo> {
        const response = await this.authenticatedRequest<UserInfo>('/api/v1/user/me', {
            method: 'PATCH',
            body: JSON.stringify(updates),
        });

        if (!response.success || !response.data) {
            throw this.createError(response.error?.code || 'UPDATE_FAILED', response.error?.message || 'Failed to update profile');
        }

        return response.data;
    }

    /**
     * Get access token (auto-refresh if needed)
     * 获取访问令牌（如需要则自动刷新）
     */
    async getAccessToken(): Promise<string | null> {
        const token = this.storage.getAccessToken();

        if (!token) {
            return null;
        }

        // Check if token is expired (simple check by trying to parse JWT)
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            const exp = payload.exp * 1000;

            // If token expires in less than 5 minutes, refresh it
            if (Date.now() > exp - 5 * 60 * 1000) {
                await this.refreshTokens();
                return this.storage.getAccessToken();
            }
        } catch {
            // If parsing fails, try to use the token anyway
        }

        return token;
    }

    /**
     * Check if user is authenticated
     * 检查用户是否已认证
     */
    isAuthenticated(): boolean {
        return !!this.storage.getAccessToken();
    }

    /**
     * Logout current session
     * 登出当前会话
     */
    async logout(): Promise<void> {
        const refreshToken = this.storage.getRefreshToken();

        try {
            await this.authenticatedRequest('/api/v1/auth/logout', {
                method: 'POST',
                body: JSON.stringify({ refresh_token: refreshToken }),
            });
        } finally {
            this.storage.clear();
            this.notifyAuthStateChange(null);
        }
    }

    /**
     * Logout from all devices
     * 从所有设备登出
     */
    async logoutAll(): Promise<void> {
        try {
            await this.authenticatedRequest('/api/v1/auth/logout-all', {
                method: 'POST',
            });
        } finally {
            this.storage.clear();
            this.notifyAuthStateChange(null);
        }
    }

    // ============================================
    // OAuth2 Client Methods (for integrating with other OAuth providers using UniAuth)
    // OAuth2 客户端方法
    // ============================================

    /**
     * Start OAuth2 authorization flow
     * 开始 OAuth2 授权流程
     */
    async startOAuth2Flow(options: OAuth2AuthorizeOptions): Promise<string> {
        if (!this.config.clientId) {
            throw this.createError('CONFIG_ERROR', 'clientId is required for OAuth2 flow');
        }

        const params = new URLSearchParams({
            client_id: this.config.clientId,
            redirect_uri: options.redirectUri,
            response_type: 'code',
        });

        if (options.scope) {
            params.set('scope', options.scope);
        }

        if (options.state) {
            params.set('state', options.state);
        }

        // PKCE support
        if (options.usePKCE) {
            const verifier = generateCodeVerifier();
            const challenge = await generateCodeChallenge(verifier);

            storeCodeVerifier(verifier);
            params.set('code_challenge', challenge);
            params.set('code_challenge_method', 'S256');
        }

        return `${this.config.baseUrl}/api/v1/oauth2/authorize?${params.toString()}`;
    }

    /**
     * Exchange authorization code for tokens (OAuth2 client flow)
     * 使用授权码换取令牌
     */
    async exchangeOAuth2Code(
        code: string,
        redirectUri: string,
        clientSecret?: string
    ): Promise<OAuth2TokenResult> {
        if (!this.config.clientId) {
            throw this.createError('CONFIG_ERROR', 'clientId is required for OAuth2 flow');
        }

        const body: Record<string, string> = {
            grant_type: 'authorization_code',
            client_id: this.config.clientId,
            code,
            redirect_uri: redirectUri,
        };

        if (clientSecret) {
            body.client_secret = clientSecret;
        }

        // Check for PKCE code_verifier
        const codeVerifier = getAndClearCodeVerifier();
        if (codeVerifier) {
            body.code_verifier = codeVerifier;
        }

        const response = await fetchWithRetry(`${this.config.baseUrl}/api/v1/oauth2/token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
            maxRetries: this.config.enableRetry ? 3 : 0,
            timeout: this.config.timeout,
        });

        const data = await response.json();

        if (data.error) {
            throw this.createError(data.error, data.error_description || 'Token exchange failed');
        }

        return data as OAuth2TokenResult;
    }

    // ============================================
    // SSO Methods (Cross-Domain Single Sign-On)
    // SSO 方法（跨域单点登录）
    // ============================================

    private ssoConfig: SSOConfig | null = null;

    /**
     * Configure SSO settings
     * 配置 SSO 设置
     * 
     * @example
     * ```typescript
     * auth.configureSso({
     *   ssoUrl: 'https://sso.55387.xyz',
     *   clientId: 'my-app',
     *   redirectUri: 'https://my-app.com/auth/callback',
     * });
     * ```
     */
    configureSso(config: SSOConfig): void {
        this.ssoConfig = {
            scope: 'openid profile email',
            ...config,
        };
    }

    /**
     * Start SSO login flow
     * 开始 SSO 登录流程
     * 
     * This will redirect the user to the SSO service.
     * If the user already has an SSO session, they'll be automatically logged in (silent auth).
     * 
     * @example
     * ```typescript
     * // Simple usage - redirects to SSO
     * auth.loginWithSSO();
     * 
     * // With options
     * auth.loginWithSSO({ usePKCE: true });
     * ```
     */
    loginWithSSO(options: SSOLoginOptions = {}): void {
        if (!this.ssoConfig) {
            throw this.createError('SSO_NOT_CONFIGURED', 'SSO is not configured. Call configureSso() first.');
        }

        const { usePKCE = true, state } = options;

        // Generate state for CSRF protection if not provided
        const stateValue = state || this.generateRandomState();
        this.storeState(stateValue);

        // Build authorize URL
        const params = new URLSearchParams({
            client_id: this.ssoConfig.clientId,
            redirect_uri: this.ssoConfig.redirectUri,
            response_type: 'code',
            scope: this.ssoConfig.scope || 'openid profile email',
            state: stateValue,
        });

        // PKCE support
        if (usePKCE) {
            const verifier = generateCodeVerifier();
            storeCodeVerifier(verifier);
            generateCodeChallenge(verifier).then(challenge => {
                params.set('code_challenge', challenge);
                params.set('code_challenge_method', 'S256');

                // Redirect to SSO
                window.location.href = `${this.ssoConfig!.ssoUrl}/api/v1/oauth2/authorize?${params.toString()}`;
            });
        } else {
            // Redirect to SSO without PKCE
            window.location.href = `${this.ssoConfig.ssoUrl}/api/v1/oauth2/authorize?${params.toString()}`;
        }
    }

    /**
     * Check if current URL is an SSO callback
     * 检查当前 URL 是否是 SSO 回调
     * 
     * @example
     * ```typescript
     * if (auth.isSSOCallback()) {
     *   await auth.handleSSOCallback();
     * }
     * ```
     */
    isSSOCallback(): boolean {
        if (typeof window === 'undefined') return false;
        const params = new URLSearchParams(window.location.search);
        return !!(params.get('code') && params.get('state'));
    }

    /**
     * Handle SSO callback and exchange code for tokens
     * 处理 SSO 回调并交换授权码获取令牌
     * 
     * Call this on your callback page after SSO redirects back.
     * 
     * @returns LoginResult or null if callback handling failed
     * 
     * @example
     * ```typescript
     * // In your callback page component
     * useEffect(() => {
     *   if (auth.isSSOCallback()) {
     *     auth.handleSSOCallback()
     *       .then(result => {
     *         if (result) {
     *           navigate('/dashboard');
     *         }
     *       })
     *       .catch(err => console.error('SSO login failed:', err));
     *   }
     * }, []);
     * ```
     */
    async handleSSOCallback(): Promise<LoginResult | null> {
        if (!this.ssoConfig) {
            throw this.createError('SSO_NOT_CONFIGURED', 'SSO is not configured. Call configureSso() first.');
        }

        if (typeof window === 'undefined') {
            return null;
        }

        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');
        const state = params.get('state');
        const error = params.get('error');
        const errorDescription = params.get('error_description');

        // Handle OAuth error
        if (error) {
            throw this.createError(error, errorDescription || 'SSO login failed');
        }

        // Validate state
        const savedState = this.getAndClearState();
        if (state && savedState && state !== savedState) {
            throw this.createError('INVALID_STATE', 'Invalid state parameter. Please try logging in again.');
        }

        if (!code) {
            throw this.createError('NO_CODE', 'No authorization code received.');
        }

        // Exchange code for tokens
        const tokenResult = await this.exchangeSSOCode(code, this.ssoConfig.redirectUri);

        // Store tokens
        this.storage.setAccessToken(tokenResult.access_token);
        if (tokenResult.refresh_token) {
            this.storage.setRefreshToken(tokenResult.refresh_token);
        }

        // Get user info
        const user = await this.getCurrentUser();
        this.notifyAuthStateChange(user);

        // Clean up URL (remove code and state from URL)
        if (typeof window !== 'undefined' && window.history) {
            const cleanUrl = window.location.pathname;
            window.history.replaceState({}, document.title, cleanUrl);
        }

        return {
            user: user || { id: '', phone: null, email: null, nickname: null, avatar_url: null },
            access_token: tokenResult.access_token,
            refresh_token: tokenResult.refresh_token || '',
            expires_in: tokenResult.expires_in,
            is_new_user: false,
        };
    }

    /**
     * Check if user can be silently authenticated via SSO
     * 检查用户是否可以通过 SSO 静默登录
     * 
     * This starts a silent SSO flow using an iframe to check if user has an active SSO session.
     * 
     * @returns Promise that resolves to true if silent auth succeeded
     */
    async checkSSOSession(): Promise<boolean> {
        if (!this.ssoConfig) {
            return false;
        }

        // If already authenticated, no need to check
        if (this.isAuthenticated()) {
            return true;
        }

        // For now, we can't do true silent auth without iframe/popup
        // The simplest approach is to redirect and let SSO handle it
        return false;
    }

    // Helper methods for SSO
    private generateRandomState(): string {
        return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    }

    private storeState(state: string): void {
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem('uniauth_sso_state', state);
        }
    }

    private getAndClearState(): string | null {
        if (typeof localStorage === 'undefined') return null;
        const state = localStorage.getItem('uniauth_sso_state');
        localStorage.removeItem('uniauth_sso_state');
        return state;
    }

    /**
     * Exchange SSO authorization code for tokens
     * This is a private method used internally by handleSSOCallback
     */
    private async exchangeSSOCode(
        code: string,
        redirectUri: string
    ): Promise<OAuth2TokenResult> {
        const baseUrl = this.ssoConfig?.ssoUrl || this.config.baseUrl;
        const clientId = this.ssoConfig?.clientId || this.config.clientId;

        if (!clientId) {
            throw this.createError('CONFIG_ERROR', 'clientId is required for OAuth2 flow');
        }

        const body: Record<string, string> = {
            grant_type: 'authorization_code',
            client_id: clientId,
            code,
            redirect_uri: redirectUri,
        };

        // Check for PKCE code_verifier
        const codeVerifier = getAndClearCodeVerifier();
        if (codeVerifier) {
            body.code_verifier = codeVerifier;
        }

        const response = await fetchWithRetry(`${baseUrl}/api/v1/oauth2/token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
            maxRetries: this.config.enableRetry ? 3 : 0,
            timeout: this.config.timeout,
        });

        const data = await response.json();

        if (data.error) {
            throw this.createError(data.error, data.error_description || 'Token exchange failed');
        }

        return data as OAuth2TokenResult;
    }

    // ============================================
    // Private Methods
    // ============================================

    /**
     * Refresh tokens
     * 刷新令牌
     */
    private async refreshTokens(): Promise<boolean> {
        // Prevent multiple simultaneous refresh requests
        if (this.refreshPromise) {
            return this.refreshPromise;
        }

        this.refreshPromise = this.doRefreshTokens();

        try {
            return await this.refreshPromise;
        } finally {
            this.refreshPromise = null;
        }
    }

    private async doRefreshTokens(): Promise<boolean> {
        const refreshToken = this.storage.getRefreshToken();

        if (!refreshToken) {
            return false;
        }

        try {
            const response = await this.request<TokenPair>('/api/v1/auth/refresh', {
                method: 'POST',
                body: JSON.stringify({ refresh_token: refreshToken }),
            });

            if (!response.success || !response.data) {
                this.storage.clear();
                this.config.onAuthError?.({
                    code: 'REFRESH_FAILED',
                    message: response.error?.message || 'Failed to refresh token',
                });
                return false;
            }

            this.storage.setAccessToken(response.data.access_token);
            this.storage.setRefreshToken(response.data.refresh_token);

            this.config.onTokenRefresh?.(response.data);
            this.notifyAuthStateChange(this.currentUser);

            return true;
        } catch (error) {
            this.storage.clear();
            this.config.onAuthError?.({
                code: 'REFRESH_ERROR',
                message: error instanceof Error ? error.message : 'Unknown error',
            });
            return false;
        }
    }

    /**
     * Make an authenticated request
     * 发起已认证的请求
     */
    private async authenticatedRequest<T>(
        path: string,
        options: RequestInit = {}
    ): Promise<ApiResponse<T>> {
        const token = await this.getAccessToken();

        if (!token) {
            throw this.createError('NOT_AUTHENTICATED', 'Not authenticated');
        }

        return this.request<T>(path, {
            ...options,
            headers: {
                ...options.headers,
                Authorization: `Bearer ${token}`,
            },
        });
    }

    /**
     * Make a request to the API with retry support
     * 向 API 发起请求（支持重试）
     */
    private async request<T>(
        path: string,
        options: RequestInit = {}
    ): Promise<ApiResponse<T>> {
        const url = `${this.config.baseUrl}${path}`;

        const fetchOptions: FetchWithRetryOptions = {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...(this.config.appKey && { 'X-App-Key': this.config.appKey }),
                ...options.headers,
            },
            credentials: 'include', // Required for SSO session cookie handling
            maxRetries: this.config.enableRetry ? 3 : 0,
            timeout: this.config.timeout,
        };

        const response = await fetchWithRetry(url, fetchOptions);
        const data = await response.json();

        return data as ApiResponse<T>;
    }

    /**
     * Create an error object
     * 创建错误对象
     */
    private createError(code: string, message: string, statusCode?: number): UniAuthError {
        return new UniAuthError(code, message, statusCode);
    }
}

// Re-export HTTP utilities for advanced usage
export {
    fetchWithRetry,
    generateCodeVerifier,
    generateCodeChallenge,
    storeCodeVerifier,
    getAndClearCodeVerifier,
} from './http.js';

// Default export
export default UniAuthClient;

