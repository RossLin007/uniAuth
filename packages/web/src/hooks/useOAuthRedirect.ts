import { useSearchParams } from 'react-router-dom';
import { useCallback } from 'react';
import { API_BASE_URL } from '../config/api';

/**
 * Hook to handle OAuth redirect after login
 * 登录成功后处理 OAuth 重定向
 * 
 * If the user came from an OAuth flow (has client_id in URL params),
 * this hook provides a function to redirect back to complete the authorization.
 */
export function useOAuthRedirect() {
    const [searchParams] = useSearchParams();

    /**
     * Check if this is an OAuth login flow
     */
    const isOAuthFlow = useCallback((): boolean => {
        return !!(
            searchParams.get('client_id') &&
            searchParams.get('redirect_uri') &&
            searchParams.get('response_type')
        );
    }, [searchParams]);

    /**
     * Get the OAuth redirect URL to complete authorization after login
     * Returns null if not in OAuth flow
     */
    const getOAuthRedirectUrl = useCallback((): string | null => {
        const clientId = searchParams.get('client_id');
        const redirectUri = searchParams.get('redirect_uri');
        const responseType = searchParams.get('response_type');

        if (!clientId || !redirectUri || !responseType) {
            return null;
        }

        // Build the OAuth authorize URL with all params
        const params = new URLSearchParams();
        params.set('client_id', clientId);
        params.set('redirect_uri', redirectUri);
        params.set('response_type', responseType);

        // Optional params
        const scope = searchParams.get('scope');
        const state = searchParams.get('state');
        const nonce = searchParams.get('nonce');
        const codeChallenge = searchParams.get('code_challenge');
        const codeChallengeMethod = searchParams.get('code_challenge_method');

        if (scope) params.set('scope', scope);
        if (state) params.set('state', state);
        if (nonce) params.set('nonce', nonce);
        if (codeChallenge) params.set('code_challenge', codeChallenge);
        if (codeChallengeMethod) params.set('code_challenge_method', codeChallengeMethod);

        // The user is now logged in and has an SSO session cookie
        // Redirect back to authorize endpoint which will perform silent auth
        return `${API_BASE_URL}/api/v1/oauth2/authorize?${params.toString()}`;
    }, [searchParams]);

    /**
     * Redirect to complete OAuth flow, or navigate to home if not OAuth
     * Returns the URL to redirect to
     */
    const getPostLoginRedirect = useCallback((): string => {
        const oauthUrl = getOAuthRedirectUrl();
        return oauthUrl || '/';
    }, [getOAuthRedirectUrl]);

    return {
        isOAuthFlow,
        getOAuthRedirectUrl,
        getPostLoginRedirect,
    };
}
