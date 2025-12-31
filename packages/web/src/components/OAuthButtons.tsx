import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config/api';

interface OAuthProvider {
    id: string;
    name: string;
    icon: React.ReactNode;
    color: string;
}

const providers: OAuthProvider[] = [
    {
        id: 'google',
        name: 'Google',
        icon: (
            <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
            </svg>
        ),
        color: 'hover:bg-red-50 dark:hover:bg-red-900/10',
    },
];

export default function OAuthButtons() {
    const { t } = useTranslation();
    const [availableProviders, setAvailableProviders] = useState<string[]>([]);
    const [loading, setLoading] = useState<string | null>(null);

    // Fetch available OAuth providers
    useEffect(() => {
        const fetchProviders = async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/api/v1/auth/oauth/providers`);
                const data = await response.json();
                if (data.success) {
                    setAvailableProviders(data.data.providers);
                }
            } catch (error) {
                console.error('Failed to fetch OAuth providers:', error);
            }
        };

        fetchProviders();
    }, []);

    const handleOAuthLogin = async (providerId: string) => {
        setLoading(providerId);

        try {
            // Explicitly pass the current origin as the redirect URI base
            // This fixes the mismatch between 'sso' (backend default) and 'auth' (actual frontend)
            const redirectUri = `${window.location.origin}/auth/callback/${providerId}`;

            // IMPORTANT: Preserve OAuth flow params before redirecting to external OAuth provider
            // These params need to be restored after the OAuth callback to complete the original flow
            const urlParams = new URLSearchParams(window.location.search);
            const clientId = urlParams.get('client_id');
            const originalRedirectUri = urlParams.get('redirect_uri');
            const responseType = urlParams.get('response_type');

            if (clientId && originalRedirectUri && responseType) {
                // Store the original OAuth flow params to restore after Google callback
                const oauthFlowParams = {
                    client_id: clientId,
                    redirect_uri: originalRedirectUri,
                    response_type: responseType,
                    scope: urlParams.get('scope') || '',
                    state: urlParams.get('state') || '',
                    nonce: urlParams.get('nonce') || '',
                    code_challenge: urlParams.get('code_challenge') || '',
                    code_challenge_method: urlParams.get('code_challenge_method') || '',
                };
                console.log('[OAuthButtons] Saving OAuth flow params to sessionStorage:', oauthFlowParams);
                sessionStorage.setItem('oauth_flow_params', JSON.stringify(oauthFlowParams));
            } else {
                console.log('[OAuthButtons] No OAuth flow params found in URL:', { clientId, originalRedirectUri, responseType });
            }

            const response = await fetch(`${API_BASE_URL}/api/v1/auth/oauth/${providerId}/authorize?redirect_uri=${encodeURIComponent(redirectUri)}`);
            const data = await response.json();

            if (data.success && data.data.auth_url) {
                // Redirect to OAuth provider
                window.location.href = data.data.auth_url;
            } else {
                console.error('Failed to get OAuth URL:', data.error);
                setLoading(null);
            }
        } catch (error) {
            console.error('OAuth error:', error);
            setLoading(null);
        }
    };

    // Filter to only show available providers
    const displayProviders = providers.filter((p) =>
        availableProviders.includes(p.id) || availableProviders.length === 0
    );

    if (displayProviders.length === 0) {
        return null;
    }

    return (
        <div className="space-y-3">
            {displayProviders.map((provider) => (
                <button
                    key={provider.id}
                    onClick={() => handleOAuthLogin(provider.id)}
                    disabled={loading !== null}
                    className={`w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-canvas dark:bg-slate-800 text-ink dark:text-moonlight font-medium transition-all ${provider.color} disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                    {loading === provider.id ? (
                        <span className="inline-block w-5 h-5 border-2 border-sky-500 border-t-transparent rounded-full animate-spin"></span>
                    ) : (
                        provider.icon
                    )}
                    {t('login.continueWith', { provider: t(`providers.${provider.id}`) })}
                </button>
            ))}
        </div>
    );
}
