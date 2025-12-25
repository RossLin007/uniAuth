import { env } from '../config/index.js';
import type { OAuthProvider, OAuthUserInfo } from '../types/index.js';

/**
 * OAuth Provider Configuration
 * OAuth 提供商配置
 */
interface OAuthConfig {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
    authUrl: string;
    tokenUrl: string;
    userInfoUrl: string;
    scope: string;
}

/**
 * Get OAuth provider configuration
 * 获取 OAuth 提供商配置
 */
function getProviderConfig(provider: OAuthProvider): OAuthConfig | null {
    switch (provider) {
        case 'google':
            if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) return null;
            return {
                clientId: env.GOOGLE_CLIENT_ID,
                clientSecret: env.GOOGLE_CLIENT_SECRET,
                redirectUri: env.GOOGLE_REDIRECT_URI || `${env.FRONTEND_URL}/auth/callback/google`,
                authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
                tokenUrl: 'https://oauth2.googleapis.com/token',
                userInfoUrl: 'https://www.googleapis.com/oauth2/v2/userinfo',
                scope: 'openid email profile',
            };

        case 'github':
            if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET) return null;
            return {
                clientId: env.GITHUB_CLIENT_ID,
                clientSecret: env.GITHUB_CLIENT_SECRET,
                redirectUri: env.GITHUB_REDIRECT_URI || `${env.FRONTEND_URL}/auth/callback/github`,
                authUrl: 'https://github.com/login/oauth/authorize',
                tokenUrl: 'https://github.com/login/oauth/access_token',
                userInfoUrl: 'https://api.github.com/user',
                scope: 'user:email',
            };

        case 'wechat':
            if (!env.WECHAT_APP_ID || !env.WECHAT_APP_SECRET) return null;
            return {
                clientId: env.WECHAT_APP_ID,
                clientSecret: env.WECHAT_APP_SECRET,
                redirectUri: env.WECHAT_REDIRECT_URI || `${env.FRONTEND_URL}/auth/callback/wechat`,
                authUrl: 'https://open.weixin.qq.com/connect/qrconnect',
                tokenUrl: 'https://api.weixin.qq.com/sns/oauth2/access_token',
                userInfoUrl: 'https://api.weixin.qq.com/sns/userinfo',
                scope: 'snsapi_login',
            };

        case 'apple':
            if (!env.APPLE_CLIENT_ID || !env.APPLE_KEY_ID || !env.APPLE_TEAM_ID || !env.APPLE_PRIVATE_KEY) return null;
            // Client Secret is dynamically generated for Apple
            return {
                clientId: env.APPLE_CLIENT_ID,
                clientSecret: 'DYNAMIC', // Placeholder, handled in exchangeOAuthCode
                redirectUri: env.APPLE_REDIRECT_URI || `${env.FRONTEND_URL}/auth/callback/apple`,
                authUrl: 'https://appleid.apple.com/auth/authorize',
                tokenUrl: 'https://appleid.apple.com/auth/token',
                userInfoUrl: '', // No UserInfo endpoint, data is in ID Token
                scope: 'name email',
            };

        default:
            return null;
    }
}

/**
 * Get OAuth authorization URL
 * 获取 OAuth 授权 URL
 */
export function getOAuthAuthUrl(provider: OAuthProvider, state: string): string | null {
    const config = getProviderConfig(provider);
    if (!config) return null;

    const params = new URLSearchParams({
        client_id: config.clientId,
        redirect_uri: config.redirectUri,
        response_type: 'code',
        scope: config.scope,
        state,
    });

    if (provider === 'apple') {
        // Apple needs response_mode=form_post usually, but 'query' also works for some flows. 
        // UniAuth expects 'code' in query, so 'response_mode=form_post' might break current frontend flow if it expects redirect with params.
        // Try query first. If Apple forces form_post, we need a special handler.
        // Actually Apple defaults to form_post for scope requests.
        params.set('response_mode', 'form_post');
        // Wait, standard OAuth2 service in UniAuth expects query params on callback?
        // If form_post, we need a POST route handler for callback.
        // Let's stick to default behavior or check if 'query' is allowed with 'scope'.
        // Apple requires 'form_post' if requesting 'name' or 'email'.
    }

    // WeChat has different parameter names
    if (provider === 'wechat') {
        params.set('appid', config.clientId);
        params.delete('client_id');
    }

    return `${config.authUrl}?${params.toString()}`;
}

/**
 * Exchange OAuth code for tokens
 * 用 OAuth 授权码换取令牌
 */
export async function exchangeOAuthCode(
    provider: OAuthProvider,
    code: string
): Promise<{ accessToken: string; refreshToken?: string; idToken?: string } | null> {
    const config = getProviderConfig(provider);
    if (!config) return null;

    try {
        let response: Response;

        if (provider === 'wechat') {
            // WeChat uses GET with query params
            const params = new URLSearchParams({
                appid: config.clientId,
                secret: config.clientSecret,
                code,
                grant_type: 'authorization_code',
            });
            response = await fetch(`${config.tokenUrl}?${params.toString()}`);
        } else if (provider === 'apple') {
            // Apple requires dynamic client secret (ES256 signed JWT)
            const { generateAppleClientSecret } = await import('./apple.js');
            const clientSecret = await generateAppleClientSecret();

            if (!clientSecret) {
                console.error('Failed to generate Apple Client Secret');
                return null;
            }

            response = await fetch(config.tokenUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    Accept: 'application/json',
                },
                body: new URLSearchParams({
                    client_id: config.clientId,
                    client_secret: clientSecret,
                    code,
                    redirect_uri: config.redirectUri,
                    grant_type: 'authorization_code',
                }),
            });
        } else {
            response = await fetch(config.tokenUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    Accept: 'application/json',
                },
                body: new URLSearchParams({
                    client_id: config.clientId,
                    client_secret: config.clientSecret,
                    code,
                    redirect_uri: config.redirectUri,
                    grant_type: 'authorization_code',
                }),
            });
        }

        const data = (await response.json()) as {
            access_token?: string;
            refresh_token?: string;
            id_token?: string;
            error?: string;
            error_description?: string
        };

        // Handle error response from OAuth provider
        if (data.error || !data.access_token) {
            console.error('OAuth token exchange failed:', data);
            return null;
        }

        return {
            accessToken: data.access_token,
            refreshToken: data.refresh_token,
            idToken: data.id_token, // Return ID token used by Apple/Google
        };
    } catch (error) {
        console.error('OAuth token exchange error:', error);
        return null;
    }
}

/**
 * Get user info from OAuth provider
 * 从 OAuth 提供商获取用户信息
 */
export async function getOAuthUserInfo(
    provider: OAuthProvider,
    accessToken: string,
    openId?: string, // For WeChat
    idToken?: string // For Apple/OIDC
): Promise<OAuthUserInfo | null> {
    const config = getProviderConfig(provider);
    if (!config) return null;

    try {
        let response: Response;
        let userData: Record<string, unknown>;

        if (provider === 'wechat') {
            const params = new URLSearchParams({
                access_token: accessToken,
                openid: openId || '',
            });
            response = await fetch(`${config.userInfoUrl}?${params.toString()}`);
            userData = (await response.json()) as Record<string, unknown>;

            return {
                id: userData.openid as string,
                name: userData.nickname as string,
                avatar: userData.headimgurl as string,
                raw: userData,
            };
        }

        response = await fetch(config.userInfoUrl, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                Accept: 'application/json',
            },
        });
        userData = (await response.json()) as Record<string, unknown>;

        if (provider === 'google') {
            return {
                id: userData.id as string,
                email: userData.email as string,
                name: userData.name as string,
                avatar: userData.picture as string,
                raw: userData,
            };
        }

        if (provider === 'github') {
            // Get email from GitHub (may need separate API call)
            let email = userData.email as string | null;

            if (!email) {
                const emailResponse = await fetch('https://api.github.com/user/emails', {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        Accept: 'application/json',
                    },
                });
                const emails = (await emailResponse.json()) as Array<{
                    email: string;
                    primary: boolean;
                    verified: boolean;
                }>;
                const primaryEmail = emails.find((e) => e.primary && e.verified);
                email = primaryEmail?.email || emails[0]?.email;
            }

            return {
                id: (userData.id as number).toString(),
                email: email || undefined,
                name: (userData.name as string) || (userData.login as string),
                avatar: userData.avatar_url as string,
                raw: userData,
            };
        }

        if (provider === 'apple') {
            if (!idToken) return null;
            // Decode ID Token to get email and sub
            // We should verify it, but since we just got it from Apple's token endpoint with our client secret, it's trustworthy enough for extraction here
            // But strict verification is better. The `apple.ts` lib has `verifyAppleIdToken`
            const { verifyAppleIdToken } = await import('./apple.js');
            const validation = await verifyAppleIdToken(idToken);

            if (!validation.valid || !validation.payload) {
                console.error('Invalid Apple ID Token');
                return null;
            }

            const payload = validation.payload;
            return {
                id: payload.sub as string,
                email: payload.email as string | undefined, // May be private relay
                name: undefined, // Apple only sends name in the very first authorization request (id_token usually doesn't have it unless added to scope, but often it's in a separate 'user' JSON in the callback)
                // NOTE: Name handling for Apple is tricky, it's NOT in id_token usually.
                // It comes in the initial callback POST body as 'user' param.
                // We might miss name if we only look here.
                // For now, email/sub is the critical part.
                avatar: undefined,
                raw: payload,
            };
        }

        return null;
    } catch (error) {
        console.error('OAuth user info error:', error);
        return null;
    }
}

/**
 * Check if OAuth provider is configured
 * 检查 OAuth 提供商是否已配置
 */
export function isOAuthProviderConfigured(provider: OAuthProvider): boolean {
    return getProviderConfig(provider) !== null;
}

/**
 * Get list of configured OAuth providers
 * 获取已配置的 OAuth 提供商列表
 */
export function getConfiguredOAuthProviders(): OAuthProvider[] {
    const providers: OAuthProvider[] = ['google', 'github', 'wechat', 'apple'];
    return providers.filter((p) => isOAuthProviderConfigured(p));
}
