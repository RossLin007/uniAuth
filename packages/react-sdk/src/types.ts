import { UniAuthClient, type UniAuthConfig, type SSOConfig, type UserInfo } from '@55387.ai/uniauth-client';

export interface UniAuthProviderConfig extends UniAuthConfig {
    /** SSO Configuration (optional but recommended for SSO login) */
    sso?: SSOConfig;
}

export interface UniAuthContextType {
    /** Current user info */
    user: UserInfo | null;
    /** Whether user is authenticated */
    isAuthenticated: boolean;
    /** Loading state */
    isLoading: boolean;
    /** Error state */
    error: Error | null;
    /** Login with SSO */
    login: (options?: { usePKCE?: boolean; usePopup?: boolean }) => void;
    /** Logout */
    logout: () => Promise<void>;
    /** Update user profile */
    updateProfile: (updates: Partial<Pick<UserInfo, 'nickname' | 'avatar_url'>>) => Promise<void>;
    /** Raw UniAuthClient instance */
    client: UniAuthClient;
    /** Get access token synchronously */
    getToken: () => string | null;
}
