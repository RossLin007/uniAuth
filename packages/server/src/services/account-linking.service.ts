/**
 * Account Linking Service
 * Manages linking/unlinking social accounts and conflict resolution
 */

import { getSupabase, TABLES } from '../lib/supabase.js';
import { logger } from '../lib/logger.js';

export interface LinkedAccount {
    id: string;
    user_id: string;
    provider: string;
    provider_user_id: string;
    provider_email?: string;
    provider_data?: Record<string, unknown>;
    created_at: string;
    updated_at: string;
}

export interface LinkConflict {
    type: 'email_exists' | 'provider_linked' | 'already_linked';
    existingUserId?: string;
    existingEmail?: string;
    provider: string;
    message: string;
}

export interface LinkResult {
    success: boolean;
    account?: LinkedAccount;
    conflict?: LinkConflict;
}

class AccountLinkingService {
    /**
     * Get all linked accounts for a user
     */
    async getLinkedAccounts(userId: string): Promise<LinkedAccount[]> {
        const supabase = getSupabase();

        const { data, error } = await supabase
            .from('oauth_accounts')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: true });

        if (error) {
            logger.error('Failed to get linked accounts', { userId, error });
            return [];
        }

        return data || [];
    }

    /**
     * Check if a provider is already linked to any user
     */
    async findExistingLink(
        provider: string,
        providerUserId: string
    ): Promise<LinkedAccount | null> {
        const supabase = getSupabase();

        const { data, error } = await supabase
            .from('oauth_accounts')
            .select('*')
            .eq('provider', provider)
            .eq('provider_user_id', providerUserId)
            .single();

        if (error) return null;
        return data;
    }

    /**
     * Check for email conflict
     * Returns user if email is already registered
     */
    async checkEmailConflict(email: string, excludeUserId?: string): Promise<string | null> {
        const supabase = getSupabase();

        let query = supabase
            .from('users')
            .select('id')
            .eq('email', email);

        if (excludeUserId) {
            query = query.neq('id', excludeUserId);
        }

        const { data, error } = await query.single();

        if (error) return null;
        return data?.id || null;
    }

    /**
     * Link a social account to an existing user
     * With full conflict detection
     */
    async linkAccount(
        userId: string,
        provider: string,
        providerUserId: string,
        providerEmail?: string,
        providerData?: Record<string, unknown>
    ): Promise<LinkResult> {
        const supabase = getSupabase();

        // 1. Check if this provider account is already linked to another user
        const existingLink = await this.findExistingLink(provider, providerUserId);

        if (existingLink) {
            if (existingLink.user_id === userId) {
                // Already linked to this user - just update
                return {
                    success: true,
                    account: existingLink,
                };
            }

            // Linked to a different user - conflict!
            return {
                success: false,
                conflict: {
                    type: 'provider_linked',
                    existingUserId: existingLink.user_id,
                    provider,
                    message: `This ${provider} account is already linked to another user`,
                },
            };
        }

        // 2. Check if user already has this provider linked (different account)
        const { data: userLinks } = await supabase
            .from('oauth_accounts')
            .select('*')
            .eq('user_id', userId)
            .eq('provider', provider)
            .single();

        if (userLinks) {
            return {
                success: false,
                conflict: {
                    type: 'already_linked',
                    provider,
                    message: `You already have a ${provider} account linked. Unlink it first to link a different account.`,
                },
            };
        }

        // 3. Check email conflict (optional)
        if (providerEmail) {
            const conflictUserId = await this.checkEmailConflict(providerEmail, userId);
            if (conflictUserId) {
                // Email exists on another account - could offer account merge
                logger.warn('Email conflict during account linking', {
                    userId,
                    provider,
                    conflictUserId,
                    email: providerEmail,
                });
                // We don't block linking, but log it
            }
        }

        // 4. Create the link
        const { data, error } = await supabase
            .from('oauth_accounts')
            .insert({
                user_id: userId,
                provider,
                provider_user_id: providerUserId,
                provider_email: providerEmail,
                provider_data: providerData,
            })
            .select()
            .single();

        if (error) {
            logger.error('Failed to link account', { userId, provider, error });
            return {
                success: false,
                conflict: {
                    type: 'provider_linked',
                    provider,
                    message: 'Failed to link account due to a database error',
                },
            };
        }

        logger.info('Account linked successfully', { userId, provider });
        return {
            success: true,
            account: data,
        };
    }

    /**
     * Unlink a social account from a user
     */
    async unlinkAccount(
        userId: string,
        provider: string
    ): Promise<{ success: boolean; error?: string }> {
        const supabase = getSupabase();

        // Check if this is the only auth method
        const linkedAccounts = await this.getLinkedAccounts(userId);
        const { data: user } = await supabase
            .from('users')
            .select('email, password_hash, phone')
            .eq('id', userId)
            .single();

        // Count available auth methods
        const authMethods = linkedAccounts.length +
            (user?.password_hash ? 1 : 0) +
            (user?.phone ? 1 : 0);

        if (authMethods <= 1) {
            return {
                success: false,
                error: 'Cannot unlink the only authentication method. Add another login method first.',
            };
        }

        const { error } = await supabase
            .from('oauth_accounts')
            .delete()
            .eq('user_id', userId)
            .eq('provider', provider);

        if (error) {
            logger.error('Failed to unlink account', { userId, provider, error });
            return {
                success: false,
                error: 'Failed to unlink account',
            };
        }

        logger.info('Account unlinked successfully', { userId, provider });
        return { success: true };
    }

    /**
     * Get available providers that user can still link
     */
    async getAvailableProviders(userId: string): Promise<string[]> {
        const allProviders = ['google', 'github', 'wechat', 'apple'];
        const linkedAccounts = await this.getLinkedAccounts(userId);
        const linkedProviders = linkedAccounts.map(a => a.provider);

        return allProviders.filter(p => !linkedProviders.includes(p));
    }

    /**
     * Merge two accounts (advanced - use with caution)
     * Moves all data from source to target and deletes source
     */
    async mergeAccounts(
        targetUserId: string,
        sourceUserId: string
    ): Promise<{ success: boolean; error?: string }> {
        const supabase = getSupabase();

        try {
            // 1. Move oauth accounts
            await supabase
                .from('oauth_accounts')
                .update({ user_id: targetUserId })
                .eq('user_id', sourceUserId);

            // 2. Move refresh tokens
            await supabase
                .from('refresh_tokens')
                .update({ user_id: targetUserId })
                .eq('user_id', sourceUserId);

            // 3. Move SSO sessions
            await supabase
                .from('sso_sessions')
                .update({ user_id: targetUserId })
                .eq('user_id', sourceUserId);

            // 4. Delete source user
            await supabase
                .from('users')
                .delete()
                .eq('id', sourceUserId);

            logger.info('Accounts merged successfully', { targetUserId, sourceUserId });
            return { success: true };
        } catch (error) {
            logger.error('Failed to merge accounts', { targetUserId, sourceUserId, error });
            return {
                success: false,
                error: 'Account merge failed',
            };
        }
    }
}

export const accountLinkingService = new AccountLinkingService();
