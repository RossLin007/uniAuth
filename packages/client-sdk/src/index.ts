/**
 * UniAuth Client SDK
 * 统一认证前端 SDK
 *
 * Usage:
 * ```typescript
 * import { UniAuthClient } from '@uniauth/client';
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
     */
    async sendCode(
        phone: string,
        type: 'login' | 'register' | 'reset' = 'login'
    ): Promise<SendCodeResult> {
        const response = await this.request<SendCodeResult>('/api/v1/auth/send-code', {
            method: 'POST',
            body: JSON.stringify({ phone, type }),
        });

        if (!response.success || !response.data) {
            throw this.createError(response.error?.code || 'SEND_CODE_FAILED', response.error?.message || 'Failed to send code');
        }

        return response.data;
    }

    /**
     * Send verification code to email
     * 发送验证码到邮箱
     */
    async sendEmailCode(
        email: string,
        type: 'login' | 'register' | 'reset' | 'email_verify' = 'login'
    ): Promise<SendCodeResult> {
        const response = await this.request<SendCodeResult>('/api/v1/auth/send-code', {
            method: 'POST',
            body: JSON.stringify({ email, type }),
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
        const response = await this.request<LoginResult>('/api/v1/auth/verify-code', {
            method: 'POST',
            body: JSON.stringify({ phone, code }),
        });

        if (!response.success || !response.data) {
            throw this.createError(response.error?.code || 'VERIFY_FAILED', response.error?.message || 'Failed to verify code');
        }

        // Store tokens
        this.storage.setAccessToken(response.data.access_token);
        this.storage.setRefreshToken(response.data.refresh_token);

        return response.data;
    }

    /**
     * Login with email verification code
     * 使用邮箱验证码登录
     */
    async loginWithEmailCode(email: string, code: string): Promise<LoginResult> {
        const response = await this.request<LoginResult>('/api/v1/auth/verify-code', {
            method: 'POST',
            body: JSON.stringify({ email, code }),
        });

        if (!response.success || !response.data) {
            throw this.createError(response.error?.code || 'VERIFY_FAILED', response.error?.message || 'Failed to verify code');
        }

        // Store tokens
        this.storage.setAccessToken(response.data.access_token);
        this.storage.setRefreshToken(response.data.refresh_token);

        return response.data;
    }

    /**
     * Login with email and password
     * 使用邮箱密码登录
     */
    async loginWithEmail(email: string, password: string): Promise<LoginResult> {
        const response = await this.request<LoginResult>('/api/v1/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
        });

        if (!response.success || !response.data) {
            throw this.createError(response.error?.code || 'LOGIN_FAILED', response.error?.message || 'Failed to login');
        }

        // Store tokens
        this.storage.setAccessToken(response.data.access_token);
        this.storage.setRefreshToken(response.data.refresh_token);

        return response.data;
    }

    /**
     * Handle OAuth callback (for social login)
     * 处理 OAuth 回调（社交登录）
     */
    async handleOAuthCallback(provider: string, code: string): Promise<LoginResult> {
        const response = await this.request<LoginResult>('/api/v1/auth/oauth/callback', {
            method: 'POST',
            body: JSON.stringify({ provider, code }),
        });

        if (!response.success || !response.data) {
            throw this.createError(response.error?.code || 'OAUTH_FAILED', response.error?.message || 'OAuth callback failed');
        }

        // Store tokens
        this.storage.setAccessToken(response.data.access_token);
        this.storage.setRefreshToken(response.data.refresh_token);

        return response.data;
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
    private createError(code: string, message: string): Error {
        const error = new Error(message);
        (error as any).code = code;
        return error;
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
