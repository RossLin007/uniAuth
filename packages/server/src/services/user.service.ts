import { getSupabase, TABLES } from '../lib/supabase.js';
import { hashToken } from '../lib/index.js';
import { MESSAGES } from '../config/index.js';
import type { User, UserPublic, Session, UpdateUserRequest } from '../types/index.js';

/**
 * User Service
 * 用户服务
 */
export class UserService {
    private supabase = getSupabase();

    /**
     * Get user by ID
     * 根据 ID 获取用户
     */
    async getUserById(userId: string): Promise<User | null> {
        const { data, error } = await this.supabase
            .from(TABLES.USERS)
            .select('*')
            .eq('id', userId)
            .single<User>();

        if (error || !data) {
            return null;
        }

        return data;
    }

    /**
     * Get user public info
     * 获取用户公开信息
     */
    async getUserPublic(userId: string): Promise<UserPublic | null> {
        const user = await this.getUserById(userId);

        if (!user) {
            return null;
        }

        return {
            id: user.id,
            phone: user.phone,
            email: user.email,
            nickname: user.nickname,
            avatar_url: user.avatar_url,
        };
    }

    /**
     * Update user info
     * 更新用户信息
     */
    async updateUser(
        userId: string,
        updates: UpdateUserRequest
    ): Promise<{ success: boolean; message: string; user?: UserPublic }> {
        const { data, error } = await this.supabase
            .from(TABLES.USERS)
            .update({
                ...updates,
                updated_at: new Date().toISOString(),
            })
            .eq('id', userId)
            .select()
            .single<User>();

        if (error || !data) {
            console.error('Failed to update user:', error);
            return {
                success: false,
                message: MESSAGES.ERROR.INTERNAL_ERROR,
            };
        }

        return {
            success: true,
            message: MESSAGES.SUCCESS.USER_UPDATED,
            user: {
                id: data.id,
                phone: data.phone,
                email: data.email,
                nickname: data.nickname,
                avatar_url: data.avatar_url,
            },
        };
    }

    /**
     * Get user's active sessions
     * 获取用户的活跃会话
     */
    async getSessions(
        userId: string,
        currentTokenHash?: string
    ): Promise<Session[]> {
        const { data, error } = await this.supabase
            .from(TABLES.REFRESH_TOKENS)
            .select('id, device_info, ip_address, created_at, token_hash')
            .eq('user_id', userId)
            .eq('revoked', false)
            .gt('expires_at', new Date().toISOString())
            .order('created_at', { ascending: false });

        if (error || !data) {
            return [];
        }

        return data.map((session) => ({
            id: session.id,
            device_info: session.device_info,
            ip_address: session.ip_address,
            created_at: session.created_at,
            is_current: currentTokenHash ? session.token_hash === currentTokenHash : false,
        }));
    }

    /**
     * Revoke a specific session
     * 撤销特定会话
     */
    async revokeSession(
        userId: string,
        sessionId: string
    ): Promise<{ success: boolean; message: string }> {
        const { error } = await this.supabase
            .from(TABLES.REFRESH_TOKENS)
            .update({ revoked: true })
            .eq('id', sessionId)
            .eq('user_id', userId);

        if (error) {
            console.error('Failed to revoke session:', error);
            return {
                success: false,
                message: MESSAGES.ERROR.INTERNAL_ERROR,
            };
        }

        return {
            success: true,
            message: MESSAGES.SUCCESS.LOGOUT_SUCCESS,
        };
    }

    // ============================================
    // Account Binding Methods / 账户绑定方法
    // ============================================

    /**
     * Get user's account bindings
     * 获取用户的账户绑定信息
     */
    async getBindings(userId: string): Promise<{
        phone: { value: string | null; verified: boolean };
        email: { value: string | null; verified: boolean };
        oauth: Array<{
            provider: string;
            provider_email: string | null;
            created_at: string;
        }>;
    }> {
        const user = await this.getUserById(userId);
        if (!user) {
            return {
                phone: { value: null, verified: false },
                email: { value: null, verified: false },
                oauth: [],
            };
        }

        // Get OAuth bindings
        const { data: oauthAccounts } = await this.supabase
            .from('oauth_accounts')
            .select('provider, provider_email, created_at')
            .eq('user_id', userId);

        return {
            phone: { value: user.phone, verified: user.phone_verified },
            email: { value: user.email, verified: user.email_verified },
            oauth: oauthAccounts || [],
        };
    }

    /**
     * Unbind OAuth account
     * 解绑 OAuth 账户
     */
    async unbindOAuth(
        userId: string,
        provider: string
    ): Promise<{ success: boolean; message: string }> {
        // Check if user has other login methods
        const user = await this.getUserById(userId);
        if (!user) {
            return { success: false, message: 'User not found' };
        }

        // Count available login methods
        const { data: oauthAccounts } = await this.supabase
            .from('oauth_accounts')
            .select('provider')
            .eq('user_id', userId);

        const oauthCount = oauthAccounts?.length || 0;
        const hasPhone = !!user.phone;
        const hasEmail = !!user.email;
        const totalMethods = oauthCount + (hasPhone ? 1 : 0) + (hasEmail ? 1 : 0);

        if (totalMethods <= 1) {
            return {
                success: false,
                message: '无法解绑唯一的登录方式 / Cannot unbind the only login method',
            };
        }

        // Delete the OAuth account binding
        const { error } = await this.supabase
            .from('oauth_accounts')
            .delete()
            .eq('user_id', userId)
            .eq('provider', provider);

        if (error) {
            console.error('Failed to unbind OAuth:', error);
            return { success: false, message: MESSAGES.ERROR.INTERNAL_ERROR };
        }

        return {
            success: true,
            message: `${provider} 已解绑 / ${provider} unbound successfully`,
        };
    }

    /**
     * Bind phone number (requires verified code)
     * 绑定手机号（需要验证码验证）
     */
    async bindPhone(
        userId: string,
        phone: string,
        code: string
    ): Promise<{ success: boolean; message: string }> {
        // Verify the code first
        const { data: verificationCode, error: codeError } = await this.supabase
            .from(TABLES.VERIFICATION_CODES)
            .select('*')
            .eq('phone', phone)
            .eq('used', false)
            .gt('expires_at', new Date().toISOString())
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (codeError || !verificationCode) {
            return {
                success: false,
                message: '验证码已过期或不存在 / Verification code expired or not found',
            };
        }

        // Check max attempts
        if (verificationCode.attempts >= 5) {
            return {
                success: false,
                message: '验证码尝试次数过多 / Too many verification attempts',
            };
        }

        // Increment attempts
        await this.supabase
            .from(TABLES.VERIFICATION_CODES)
            .update({ attempts: verificationCode.attempts + 1 })
            .eq('id', verificationCode.id);

        // Verify code
        if (verificationCode.code !== code) {
            return {
                success: false,
                message: '验证码错误 / Invalid verification code',
            };
        }

        // Mark code as used
        await this.supabase
            .from(TABLES.VERIFICATION_CODES)
            .update({ used: true })
            .eq('id', verificationCode.id);

        // Check if phone is already used by another user
        const { data: existingUser } = await this.supabase
            .from(TABLES.USERS)
            .select('id')
            .eq('phone', phone)
            .neq('id', userId)
            .single();

        if (existingUser) {
            return {
                success: false,
                message: '该手机号已被其他账户绑定 / Phone number already bound to another account',
            };
        }

        // Update user's phone
        const { error } = await this.supabase
            .from(TABLES.USERS)
            .update({ phone, phone_verified: true, updated_at: new Date().toISOString() })
            .eq('id', userId);

        if (error) {
            console.error('Failed to bind phone:', error);
            return { success: false, message: MESSAGES.ERROR.INTERNAL_ERROR };
        }

        return { success: true, message: '手机号绑定成功 / Phone bound successfully' };
    }

    /**
     * Bind email address (requires verified code)
     * 绑定邮箱地址（需要验证码验证）
     */
    async bindEmail(
        userId: string,
        email: string,
        code: string
    ): Promise<{ success: boolean; message: string }> {
        // Verify the code first
        const { data: verificationCode, error: codeError } = await this.supabase
            .from(TABLES.VERIFICATION_CODES)
            .select('*')
            .eq('email', email)
            .eq('used', false)
            .gt('expires_at', new Date().toISOString())
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (codeError || !verificationCode) {
            return {
                success: false,
                message: '验证码已过期或不存在 / Verification code expired or not found',
            };
        }

        // Check max attempts
        if (verificationCode.attempts >= 5) {
            return {
                success: false,
                message: '验证码尝试次数过多 / Too many verification attempts',
            };
        }

        // Increment attempts
        await this.supabase
            .from(TABLES.VERIFICATION_CODES)
            .update({ attempts: verificationCode.attempts + 1 })
            .eq('id', verificationCode.id);

        // Verify code
        if (verificationCode.code !== code) {
            return {
                success: false,
                message: '验证码错误 / Invalid verification code',
            };
        }

        // Mark code as used
        await this.supabase
            .from(TABLES.VERIFICATION_CODES)
            .update({ used: true })
            .eq('id', verificationCode.id);

        // Check if email is already used by another user
        const { data: existingUser } = await this.supabase
            .from(TABLES.USERS)
            .select('id')
            .eq('email', email)
            .neq('id', userId)
            .single();

        if (existingUser) {
            return {
                success: false,
                message: '该邮箱已被其他账户绑定 / Email already bound to another account',
            };
        }

        // Update user's email
        const { error } = await this.supabase
            .from(TABLES.USERS)
            .update({ email, email_verified: true, updated_at: new Date().toISOString() })
            .eq('id', userId);

        if (error) {
            console.error('Failed to bind email:', error);
            return { success: false, message: MESSAGES.ERROR.INTERNAL_ERROR };
        }

        return { success: true, message: '邮箱绑定成功 / Email bound successfully' };
    }

    /**
     * Get authorized third-party applications
     * 获取已授权的第三方应用
     */
    async getAuthorizedApps(userId: string): Promise<{
        success: boolean;
        apps: Array<{
            clientId: string;
            name: string;
            description: string | null;
            logoUrl: string | null;
            homepageUrl: string | null;
            authorizedAt: string;
            lastUsedAt: string | null;
            scopes: string[];
        }>;
    }> {
        // Get distinct applications that have refresh tokens for this user
        const { data: tokens, error } = await this.supabase
            .from(TABLES.REFRESH_TOKENS)
            .select(`
                created_at,
                last_used_at,
                scope,
                application:applications!client_id (
                    client_id,
                    name,
                    description,
                    logo_url,
                    homepage_url
                )
            `)
            .eq('user_id', userId)
            .eq('revoked', false)
            .not('client_id', 'is', null)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Failed to get authorized apps:', error);
            return { success: false, apps: [] };
        }

        // Group by client_id and get the earliest authorization
        const appMap = new Map<string, {
            clientId: string;
            name: string;
            description: string | null;
            logoUrl: string | null;
            homepageUrl: string | null;
            authorizedAt: string;
            lastUsedAt: string | null;
            scopes: Set<string>;
        }>();

        for (const token of tokens || []) {
            const app = token.application as unknown as {
                client_id: string;
                name: string;
                description: string | null;
                logo_url: string | null;
                homepage_url: string | null;
            };

            if (!app || !app.client_id) continue;

            if (!appMap.has(app.client_id)) {
                appMap.set(app.client_id, {
                    clientId: app.client_id,
                    name: app.name,
                    description: app.description,
                    logoUrl: app.logo_url,
                    homepageUrl: app.homepage_url,
                    authorizedAt: token.created_at,
                    lastUsedAt: token.last_used_at,
                    scopes: new Set(token.scope ? token.scope.split(' ') : []),
                });
            } else {
                const existing = appMap.get(app.client_id)!;
                // Keep earliest authorization date
                if (new Date(token.created_at) < new Date(existing.authorizedAt)) {
                    existing.authorizedAt = token.created_at;
                }
                // Keep latest usage date
                if (token.last_used_at && (!existing.lastUsedAt || new Date(token.last_used_at) > new Date(existing.lastUsedAt))) {
                    existing.lastUsedAt = token.last_used_at;
                }
                // Merge scopes
                if (token.scope) {
                    token.scope.split(' ').forEach((s: string) => existing.scopes.add(s));
                }
            }
        }

        const apps = Array.from(appMap.values()).map(app => ({
            ...app,
            scopes: Array.from(app.scopes),
        }));

        return { success: true, apps };
    }

    /**
     * Revoke authorization for an application
     * 撤销应用授权
     */
    async revokeAppAuthorization(
        userId: string,
        clientId: string
    ): Promise<{ success: boolean; message: string }> {
        // Revoke all refresh tokens for this user and client
        const { error } = await this.supabase
            .from(TABLES.REFRESH_TOKENS)
            .update({ revoked: true })
            .eq('user_id', userId)
            .eq('client_id', clientId);

        if (error) {
            console.error('Failed to revoke app authorization:', error);
            return { success: false, message: MESSAGES.ERROR.INTERNAL_ERROR };
        }

        return { success: true, message: '应用授权已撤销 / Application authorization revoked' };
    }

    /**
     * Delete user account and all related data
     * 删除用户账户及所有相关数据
     */
    async deleteAccount(userId: string): Promise<{ success: boolean; message: string }> {
        try {
            // Delete in order: dependent tables first

            // 1. Delete refresh tokens
            await this.supabase
                .from(TABLES.REFRESH_TOKENS)
                .delete()
                .eq('user_id', userId);

            // 2. Delete OAuth accounts
            await this.supabase
                .from('oauth_accounts')
                .delete()
                .eq('user_id', userId);

            // 3. Delete verification codes (if any)
            await this.supabase
                .from(TABLES.VERIFICATION_CODES)
                .delete()
                .eq('user_id', userId);

            // 4. Delete authorization codes (if any)
            await this.supabase
                .from(TABLES.OAUTH_AUTHORIZATION_CODES)
                .delete()
                .eq('user_id', userId);

            // 5. Finally delete the user
            const { error } = await this.supabase
                .from(TABLES.USERS)
                .delete()
                .eq('id', userId);

            if (error) {
                console.error('Failed to delete user:', error);
                return { success: false, message: MESSAGES.ERROR.INTERNAL_ERROR };
            }

            return { success: true, message: '账户已永久删除 / Account permanently deleted' };
        } catch (error) {
            console.error('Delete account error:', error);
            return { success: false, message: MESSAGES.ERROR.INTERNAL_ERROR };
        }
    }
}

// Export singleton instance
export const userService = new UserService();


