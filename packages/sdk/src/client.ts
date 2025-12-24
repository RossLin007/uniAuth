import axios, { AxiosInstance, AxiosError } from 'axios';
import { UniAuthOptions, AuthResult, SendCodeResult } from './types.js';

export class UniAuthClient {
    private client: AxiosInstance;
    private options: UniAuthOptions;

    constructor(options: UniAuthOptions) {
        this.options = {
            baseUrl: 'https://auth.uniauth.com',
            timeout: 10000,
            ...options,
        };

        this.client = axios.create({
            baseURL: this.options.baseUrl,
            timeout: this.options.timeout,
            headers: {
                'Content-Type': 'application/json',
                'X-Client-Id': this.options.clientId,
                'X-Client-Secret': this.options.clientSecret,
            },
        });
    }

    /**
     * Send phone verification code
     * 发送手机验证码
     */
    async sendPhoneCode(phone: string, type: 'login' | 'register' | 'reset' = 'login'): Promise<SendCodeResult> {
        try {
            const response = await this.client.post('/api/v1/auth/trusted/phone/send-code', {
                phone,
                type,
            });

            return {
                success: true,
                message: response.data.message,
                expires_in: response.data.data?.expires_in,
                retry_after: response.data.data?.retry_after,
            };
        } catch (error) {
            return this.handleError(error);
        }
    }

    /**
     * Login with phone code
     * 手机验证码登录
     */
    async loginWithPhoneCode(phone: string, code: string): Promise<AuthResult> {
        try {
            const response = await this.client.post('/api/v1/auth/trusted/phone/verify', {
                phone,
                code,
            });

            return this.formatAuthResponse(response.data);
        } catch (error) {
            return this.handleError(error);
        }
    }

    /**
     * Send email verification code
     * 发送邮箱验证码
     */
    async sendEmailCode(email: string, type: 'email_verify' | 'reset' = 'email_verify'): Promise<SendCodeResult> {
        try {
            const response = await this.client.post('/api/v1/auth/trusted/email/send-code', {
                email,
                type,
            });

            return {
                success: true,
                message: response.data.message,
                expires_in: response.data.data?.expires_in,
                retry_after: response.data.data?.retry_after,
            };
        } catch (error) {
            return this.handleError(error);
        }
    }

    /**
     * Login with email code (passwordless)
     * 邮箱验证码登录
     */
    async loginWithEmailCode(email: string, code: string): Promise<AuthResult> {
        try {
            const response = await this.client.post('/api/v1/auth/trusted/email/verify', {
                email,
                code,
            });

            return this.formatAuthResponse(response.data);
        } catch (error) {
            return this.handleError(error);
        }
    }

    /**
     * Login with email and password
     * 邮箱密码登录
     */
    async loginWithEmailPassword(email: string, password: string): Promise<AuthResult> {
        try {
            const response = await this.client.post('/api/v1/auth/trusted/email/login', {
                email,
                password,
            });

            return this.formatAuthResponse(response.data);
        } catch (error) {
            return this.handleError(error);
        }
    }

    /**
     * Verify MFA code
     * 验证 MFA 代码
     */
    async verifyMFA(mfaToken: string, code: string): Promise<AuthResult> {
        try {
            const response = await this.client.post('/api/v1/auth/trusted/mfa/verify', {
                mfa_token: mfaToken,
                code,
            });

            return this.formatAuthResponse(response.data);
        } catch (error) {
            return this.handleError(error);
        }
    }

    /**
     * Refresh token
     * 刷新令牌
     */
    async refreshToken(refreshToken: string): Promise<AuthResult> {
        try {
            const response = await this.client.post('/api/v1/auth/trusted/token/refresh', {
                refresh_token: refreshToken,
            });

            return this.formatAuthResponse(response.data);
        } catch (error) {
            return this.handleError(error);
        }
    }

    /**
     * Get OAuth2 authorization URL
     * 获取 OAuth2 授权链接
     */
    getAuthorizeUrl(redirectUri: string, scope: string = 'openid profile email', state?: string): string {
        const params = new URLSearchParams({
            response_type: 'code',
            client_id: this.options.clientId,
            redirect_uri: redirectUri,
            scope,
        });

        if (state) {
            params.append('state', state);
        }

        return `${this.options.baseUrl}/api/v1/oauth2/authorize?${params.toString()}`;
    }

    /**
     * Exchange authorization code for tokens
     * 使用授权码换取令牌
     */
    async exchangeAuthCode(code: string, redirectUri: string): Promise<AuthResult> {
        try {
            const response = await this.client.post('/api/v1/oauth2/token', {
                grant_type: 'authorization_code',
                client_id: this.options.clientId,
                client_secret: this.options.clientSecret,
                code,
                redirect_uri: redirectUri,
            });

            return this.formatAuthResponse({
                message: 'Token exchange successful',
                data: response.data,
            });
        } catch (error) {
            return this.handleError(error);
        }
    }

    /**
     * Login with Client Credentials (M2M)
     * 客户端凭证模式登录 (机器对机器)
     */
    async loginWithClientCredentials(scope?: string): Promise<AuthResult> {
        try {
            const response = await this.client.post('/api/v1/oauth2/token', {
                grant_type: 'client_credentials',
                client_id: this.options.clientId,
                client_secret: this.options.clientSecret,
                scope,
            });

            return this.formatAuthResponse({
                message: 'M2M Authentication successful',
                data: response.data,
            });
        } catch (error) {
            return this.handleError(error);
        }
    }

    /**
     * Introspect Token (RFC 7662)
     * 令牌内省 (验证令牌有效性)
     */
    async introspectToken(token: string, tokenTypeHint?: 'access_token' | 'refresh_token'): Promise<any> {
        try {
            const response = await this.client.post('/api/v1/oauth2/introspect', {
                token,
                token_type_hint: tokenTypeHint,
                // Include client credentials in body for simplicity
                client_id: this.options.clientId,
                client_secret: this.options.clientSecret
            });

            return response.data;
        } catch (error) {
            return this.handleError(error);
        }
    }

    /**
     * Verify ID Token (offline verification)
     * 验证 ID Token (离线验证)
     * Note: This requires the 'jose' library
     */
    async verifyIdToken(idToken: string): Promise<any> {
        // This is a placeholder for fuller implementation using 'jose'
        // In a real implementation, we would fetch JWKS and verify the signature
        // For now, we'll implement a basic online verification via userinfo
        try {
            const response = await this.client.get('/api/v1/oauth2/userinfo', {
                headers: {
                    Authorization: `Bearer ${idToken}`, // Usually access token, but some providers allow id_token
                },
            });
            return response.data;
        } catch (error) {
            return this.handleError(error);
        }
    }

    private formatAuthResponse(data: any): AuthResult {
        return {
            success: true,
            message: data.message,
            user: data.data?.user,
            data: data.data,
            // Convenience properties
            access_token: data.data?.access_token,
            refresh_token: data.data?.refresh_token,
            expires_in: data.data?.expires_in,
        };
    }

    private handleError(error: any): any {
        if (axios.isAxiosError(error)) {
            const axiosError = error as AxiosError<any>;
            if (axiosError.response?.data) {
                return {
                    success: false,
                    message: axiosError.response.data.error?.message || axiosError.message,
                    error: axiosError.response.data.error,
                };
            }
            return {
                success: false,
                message: axiosError.message,
            };
        }
        return {
            success: false,
            message: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}
