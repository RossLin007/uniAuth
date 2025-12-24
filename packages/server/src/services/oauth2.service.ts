import { nanoid } from 'nanoid';
import { getSupabase, TABLES } from '../lib/supabase.js';
import { generateAccessToken, generateRefreshToken } from '../lib/jwt.js';
import { verifyClientSecret, verifyCodeChallenge } from '../lib/crypto.js';
import { authService } from './auth.service.js';
import { oauth2Logger as logger } from '../lib/logger.js';
import type {
    Application,
    AuthorizationCode,
    AuthorizationCodeWithPKCE,
    ApplicationExtended,
    User,
    OAuth2TokenResponse
} from '../types/index.js';

/**
 * OAuth2 Provider Service
 * OAuth 2.0 提供商服务 - 处理第三方应用的授权请求
 * 
 * Supports:
 * - Standard OAuth 2.0 Authorization Code Flow
 * - PKCE (Proof Key for Code Exchange) for public clients
 * - Secure client secret verification with bcrypt
 */
export class OAuth2Service {
    private supabase = getSupabase();

    /**
     * Get Application by Client ID
     * 根据 Client ID 获取应用信息
     */
    async getApplication(clientId: string): Promise<ApplicationExtended | null> {
        const { data, error } = await this.supabase
            .from(TABLES.APPLICATIONS)
            .select('*')
            .eq('client_id', clientId)
            .single<ApplicationExtended>();

        if (error || !data || data.status !== 'active') {
            logger.warn('Application not found or inactive', { clientId });
            return null;
        }

        return data;
    }

    /**
     * Validate Client ID and Redirect URI
     * 验证客户端和回调地址
     */
    async validateClient(clientId: string, redirectUri: string): Promise<ApplicationExtended | null> {
        const app = await this.getApplication(clientId);
        if (!app) return null;

        // Verify redirect_uri is in the allowed list
        // 必须完全匹配数组中的某一项
        if (!app.redirect_uris.includes(redirectUri)) {
            logger.warn('Invalid redirect_uri', {
                clientId,
                redirectUri,
                allowed: app.redirect_uris
            });
            return null;
        }

        return app;
    }

    /**
     * Create Authorization Code with optional PKCE support
     * 创建授权码（支持可选的 PKCE）
     * 
     * @param userId - The authenticated user's ID
     * @param clientId - The client application's ID
     * @param redirectUri - The callback URI
     * @param scope - Requested scopes (optional)
     * @param codeChallenge - PKCE code challenge (optional)
     * @param codeChallengeMethod - PKCE method: 'S256' or 'plain' (optional)
     */
    async createAuthorizationCode(
        userId: string,
        clientId: string,
        redirectUri: string,
        scope?: string,
        codeChallenge?: string,
        codeChallengeMethod?: 'S256' | 'plain'
    ): Promise<string> {
        const code = nanoid(32); // 32 chars random code
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        const insertData: Record<string, unknown> = {
            code,
            client_id: clientId,
            user_id: userId,
            redirect_uri: redirectUri,
            scope,
            expires_at: expiresAt.toISOString(),
        };

        // Add PKCE fields if provided
        if (codeChallenge) {
            insertData.code_challenge = codeChallenge;
            insertData.code_challenge_method = codeChallengeMethod || 'S256';
        }

        const { error } = await this.supabase
            .from(TABLES.OAUTH_AUTHORIZATION_CODES)
            .insert(insertData);

        if (error) {
            logger.error('Failed to create authorization code', { error, clientId, userId });
            throw new Error('Internal Server Error');
        }

        logger.info('Authorization code created', {
            clientId,
            userId,
            hasPKCE: !!codeChallenge
        });

        return code;
    }

    /**
     * Exchange Code for Token with PKCE support
     * 使用授权码换取令牌（支持 PKCE）
     * 
     * @param clientId - The client application's ID
     * @param clientSecret - The client secret (optional for public clients)
     * @param code - The authorization code
     * @param redirectUri - Must match the original redirect_uri
     * @param codeVerifier - PKCE code verifier (required if code_challenge was sent)
     */
    async exchangeCode(
        clientId: string,
        clientSecret: string | null,
        code: string,
        redirectUri: string,
        codeVerifier?: string
    ): Promise<OAuth2TokenResponse> {
        // 1. Get Application
        const { data: app, error: appError } = await this.supabase
            .from(TABLES.APPLICATIONS)
            .select('*')
            .eq('client_id', clientId)
            .single<ApplicationExtended>();

        if (appError || !app) {
            logger.warn('Client not found', { clientId });
            throw new Error('invalid_client');
        }

        // 2. Verify Client Secret (for confidential clients)
        if (!app.is_public) {
            if (!clientSecret) {
                logger.warn('Client secret required for confidential client', { clientId });
                throw new Error('invalid_client');
            }

            // Check if we have a hashed secret (new format) or plain text (legacy)
            let isSecretValid = false;

            if (app.client_secret_hash) {
                // Verify against bcrypt hash
                isSecretValid = await verifyClientSecret(clientSecret, app.client_secret_hash);
            } else if (app.client_secret) {
                // Legacy: plain text comparison (should be migrated)
                isSecretValid = app.client_secret === clientSecret;

                // TODO: Automatically migrate to hashed version on successful verification
            }

            if (!isSecretValid) {
                logger.warn('Invalid client secret', { clientId });
                throw new Error('invalid_client');
            }
        }

        // 3. Get and Verify Authorization Code
        const { data: authCode, error: codeError } = await this.supabase
            .from(TABLES.OAUTH_AUTHORIZATION_CODES)
            .select('*')
            .eq('code', code)
            .single<AuthorizationCodeWithPKCE>();

        if (codeError || !authCode) {
            logger.warn('Authorization code not found', { code: code.substring(0, 8) + '...' });
            throw new Error('invalid_grant');
        }

        // 4. Check expiration
        if (new Date(authCode.expires_at) < new Date()) {
            logger.warn('Authorization code expired', { code: code.substring(0, 8) + '...' });
            throw new Error('invalid_grant');
        }

        // 5. Check if already used
        if (authCode.used_at) {
            logger.warn('Authorization code already used', { code: code.substring(0, 8) + '...' });
            throw new Error('invalid_grant');
        }

        // 6. Check redirect_uri match
        if (authCode.redirect_uri !== redirectUri) {
            logger.warn('Redirect URI mismatch', {
                expected: authCode.redirect_uri,
                received: redirectUri
            });
            throw new Error('invalid_grant');
        }

        // 7. Check client_id match
        if (authCode.client_id !== clientId) {
            logger.warn('Client ID mismatch', {
                expected: authCode.client_id,
                received: clientId
            });
            throw new Error('invalid_grant');
        }

        // 8. Verify PKCE (if code_challenge was provided during authorization)
        if (authCode.code_challenge) {
            if (!codeVerifier) {
                logger.warn('PKCE code_verifier required but not provided', { clientId });
                throw new Error('invalid_grant');
            }

            const isValidPKCE = verifyCodeChallenge(
                codeVerifier,
                authCode.code_challenge,
                authCode.code_challenge_method || 'S256'
            );

            if (!isValidPKCE) {
                logger.warn('PKCE verification failed', { clientId });
                throw new Error('invalid_grant');
            }

            logger.debug('PKCE verification successful', { clientId });
        } else if (app.is_public) {
            // Public clients MUST use PKCE
            logger.warn('Public client must use PKCE', { clientId });
            throw new Error('invalid_grant');
        }

        // 9. Mark authorization code as used
        await this.supabase
            .from(TABLES.OAUTH_AUTHORIZATION_CODES)
            .update({ used_at: new Date().toISOString() })
            .eq('code', code);

        // 10. Get user and generate tokens
        const user = await this.getUser(authCode.user_id);
        if (!user) {
            logger.error('User not found for authorization code', { userId: authCode.user_id });
            throw new Error('user_not_found');
        }

        const accessToken = await generateAccessToken(user);
        const refreshToken = await generateRefreshToken();

        // Store refresh token with OAuth2 client info
        await authService.storeRefreshToken(user.id, refreshToken, {
            user_agent: `OAuth2 Client: ${app.name}`,
            platform: 'API',
            browser: 'OAuth2'
        }, '0.0.0.0');

        const expiresIn = 3600; // Standard 1 hour

        logger.info('Token exchange successful', {
            clientId,
            userId: user.id,
            scope: authCode.scope
        });

        return {
            access_token: accessToken,
            token_type: 'Bearer',
            expires_in: expiresIn,
            refresh_token: refreshToken,
        };
    }

    /**
     * Get user by ID
     * 根据 ID 获取用户
     */
    private async getUser(userId: string): Promise<User | null> {
        const { data } = await this.supabase
            .from(TABLES.USERS)
            .select('*')
            .eq('id', userId)
            .single();
        return data;
    }

    /**
     * Revoke all tokens for a client
     * 撤销客户端的所有令牌
     */
    async revokeClientTokens(clientId: string, userId: string): Promise<void> {
        // Delete all unused authorization codes for this client/user pair
        await this.supabase
            .from(TABLES.OAUTH_AUTHORIZATION_CODES)
            .delete()
            .eq('client_id', clientId)
            .eq('user_id', userId)
            .is('used_at', null);

        logger.info('Client tokens revoked', { clientId, userId });
    }

    /**
     * Validate requested scopes against allowed app scopes
     */
    async validateScope(clientId: string, requestedScope: string | undefined): Promise<boolean> {
        if (!requestedScope) return true; // No scope requested is usually fine, or default to all allowed

        const scopes = requestedScope.split(' ');

        // Fetch allowed scopes for the app
        // We join applications -> app_scopes -> scopes
        const { data, error } = await this.supabase
            .from('app_scopes')
            .select('scopes(name)')
            .eq('app_id', (await this.getApplication(clientId))?.id);

        if (error || !data) {
            logger.warn('Failed to fetch app scopes', { clientId, error });
            return false;
        }

        const allowedScopes = data.map((item: any) => item.scopes.name);

        // Check if all requested scopes are allowed
        const unknownScopes = scopes.filter(s => !allowedScopes.includes(s));

        if (unknownScopes.length > 0) {
            logger.warn('Invalid scopes requested', { clientId, unknownScopes });
            return false;
        }

        return true;
    }

    /**
     * Issue Token for Client Credentials Grant (M2M)
     */
    async issueClientCredentialsToken(
        clientId: string,
        clientSecret: string,
        scope?: string
    ): Promise<OAuth2TokenResponse> {
        // 1. Get Application
        const app = await this.getApplication(clientId);
        if (!app) throw new Error('invalid_client');

        // 2. Validate Secret
        let isSecretValid = false;
        if (app.client_secret_hash) {
            isSecretValid = await verifyClientSecret(clientSecret, app.client_secret_hash);
        } else if (app.client_secret) {
            isSecretValid = app.client_secret === clientSecret;
        }

        if (!isSecretValid) {
            logger.warn('Invalid client secret for M2M', { clientId });
            throw new Error('invalid_client');
        }

        // 3. Verify Grant Type
        if (!app.allowed_grants.includes('client_credentials')) {
            logger.warn('Client credentials grant not allowed', { clientId });
            throw new Error('unauthorized_client');
        }

        // 4. Validate Scopes
        if (scope && !(await this.validateScope(clientId, scope))) {
            throw new Error('invalid_scope');
        }

        // 5. Generate Access Token (sub = client_id)
        // For M2M, there is no user, so we pass { id: clientId } as user
        const accessToken = await generateAccessToken({ id: clientId }, {
            clientId: clientId,
            scope: scope
        });

        // 6. Return Token (no refresh token for client_credentials)
        return {
            access_token: accessToken,
            token_type: 'Bearer',
            expires_in: 3600, // 1 hour
        };
    }
}

export const oauth2Service = new OAuth2Service();
