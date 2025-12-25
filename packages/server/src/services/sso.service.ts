/**
 * SSO Session Service
 * Manages centralized sessions for Single Sign-On functionality
 */

import { getSupabase, TABLES } from '../lib/supabase.js';
import { logger } from '../lib/logger.js';
import { nanoid } from 'nanoid';

export interface SSOSession {
    id: string;
    user_id: string;
    session_token: string;
    apps: string[]; // List of application IDs that share this session
    created_at: string;
    expires_at: string;
    last_activity: string;
    remember_me: boolean;
    ip_address?: string;
    user_agent?: string;
}

interface SessionCreateOptions {
    rememberMe?: boolean;
    ipAddress?: string;
    userAgent?: string;
}

class SSOSessionService {
    private readonly SESSION_TTL_DEFAULT = 24 * 60 * 60 * 1000; // 24 hours
    private readonly SESSION_TTL_REMEMBER = 30 * 24 * 60 * 60 * 1000; // 30 days
    private readonly SESSION_COOKIE_NAME = 'uniauth_sso_session';

    /**
     * Create a new SSO session
     */
    async createSession(
        userId: string,
        applicationId: string,
        options: SessionCreateOptions = {}
    ): Promise<SSOSession> {
        const supabase = getSupabase();
        const sessionToken = nanoid(64);
        const now = new Date();
        const ttl = options.rememberMe ? this.SESSION_TTL_REMEMBER : this.SESSION_TTL_DEFAULT;
        const expiresAt = new Date(now.getTime() + ttl);

        const sessionData = {
            user_id: userId,
            session_token: sessionToken,
            apps: [applicationId],
            created_at: now.toISOString(),
            expires_at: expiresAt.toISOString(),
            last_activity: now.toISOString(),
            remember_me: options.rememberMe || false,
            ip_address: options.ipAddress,
            user_agent: options.userAgent,
        };

        const { data, error } = await supabase
            .from('sso_sessions')
            .insert(sessionData)
            .select()
            .single();

        if (error) {
            logger.error('Failed to create SSO session', { userId, error });
            throw new Error('Session creation failed');
        }

        logger.info('SSO session created', { userId, sessionId: data.id, appId: applicationId });
        return data;
    }

    /**
     * Validate and get SSO session by token
     */
    async getSessionByToken(sessionToken: string): Promise<SSOSession | null> {
        const supabase = getSupabase();

        const { data, error } = await supabase
            .from('sso_sessions')
            .select('*')
            .eq('session_token', sessionToken)
            .single();

        if (error || !data) {
            return null;
        }

        // Check if session is expired
        if (new Date(data.expires_at) < new Date()) {
            await this.deleteSession(data.id);
            return null;
        }

        // Update last activity
        await this.touchSession(data.id);

        return data;
    }

    /**
     * Check if user has active session (for silent auth)
     */
    async hasActiveSession(userId: string): Promise<SSOSession | null> {
        const supabase = getSupabase();

        const { data, error } = await supabase
            .from('sso_sessions')
            .select('*')
            .eq('user_id', userId)
            .gt('expires_at', new Date().toISOString())
            .order('last_activity', { ascending: false })
            .limit(1)
            .single();

        if (error || !data) {
            return null;
        }

        return data;
    }

    /**
     * Add application to existing session
     */
    async addAppToSession(sessionId: string, applicationId: string): Promise<boolean> {
        const supabase = getSupabase();

        // Get current session
        const { data: session, error: fetchError } = await supabase
            .from('sso_sessions')
            .select('apps')
            .eq('id', sessionId)
            .single();

        if (fetchError || !session) {
            return false;
        }

        const apps = session.apps || [];
        if (!apps.includes(applicationId)) {
            apps.push(applicationId);
        }

        const { error } = await supabase
            .from('sso_sessions')
            .update({ apps, last_activity: new Date().toISOString() })
            .eq('id', sessionId);

        if (error) {
            logger.error('Failed to add app to session', { sessionId, applicationId, error });
            return false;
        }

        logger.info('App added to SSO session', { sessionId, applicationId });
        return true;
    }

    /**
     * Update last activity timestamp
     */
    private async touchSession(sessionId: string): Promise<void> {
        const supabase = getSupabase();

        await supabase
            .from('sso_sessions')
            .update({ last_activity: new Date().toISOString() })
            .eq('id', sessionId);
    }

    /**
     * Delete a session (logout)
     */
    async deleteSession(sessionId: string): Promise<boolean> {
        const supabase = getSupabase();

        const { error } = await supabase
            .from('sso_sessions')
            .delete()
            .eq('id', sessionId);

        if (error) {
            logger.error('Failed to delete SSO session', { sessionId, error });
            return false;
        }

        logger.info('SSO session deleted', { sessionId });
        return true;
    }

    /**
     * Delete session by token
     */
    async deleteSessionByToken(sessionToken: string): Promise<boolean> {
        const supabase = getSupabase();

        const { error } = await supabase
            .from('sso_sessions')
            .delete()
            .eq('session_token', sessionToken);

        return !error;
    }

    /**
     * Single Logout - Delete all sessions for a user
     */
    async logoutAll(userId: string): Promise<number> {
        const supabase = getSupabase();

        // Get all sessions first to notify apps (future webhook)
        const { data: sessions } = await supabase
            .from('sso_sessions')
            .select('id, apps')
            .eq('user_id', userId);

        const { error } = await supabase
            .from('sso_sessions')
            .delete()
            .eq('user_id', userId);

        if (error) {
            logger.error('Failed to logout all sessions', { userId, error });
            return 0;
        }

        const count = sessions?.length || 0;
        logger.info('All SSO sessions logged out', { userId, count });

        // TODO: Send logout webhooks to all apps in sessions

        return count;
    }

    /**
     * Clean up expired sessions (should be run periodically)
     */
    async cleanupExpiredSessions(): Promise<number> {
        const supabase = getSupabase();

        const { data, error } = await supabase
            .from('sso_sessions')
            .delete()
            .lt('expires_at', new Date().toISOString())
            .select('id');

        if (error) {
            logger.error('Failed to cleanup expired sessions', { error });
            return 0;
        }

        const count = data?.length || 0;
        if (count > 0) {
            logger.info('Cleaned up expired SSO sessions', { count });
        }
        return count;
    }

    /**
     * Get cookie name for SSO session
     */
    getCookieName(): string {
        return this.SESSION_COOKIE_NAME;
    }

    /**
     * Get cookie options
     */
    getCookieOptions(rememberMe: boolean = false): Record<string, unknown> {
        const maxAge = rememberMe ? this.SESSION_TTL_REMEMBER / 1000 : this.SESSION_TTL_DEFAULT / 1000;

        return {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge,
            path: '/',
        };
    }
}

export const ssoSessionService = new SSOSessionService();
