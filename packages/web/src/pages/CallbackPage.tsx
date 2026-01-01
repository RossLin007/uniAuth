import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { authClient } from '../utils/auth';
import { API_BASE_URL } from '../config/api';
import MFAVerifyStep from '../components/MFAVerifyStep';

interface User {
    id: string;
    phone: string | null;
    email: string | null;
    nickname: string | null;
    avatar_url: string | null;
}

export default function CallbackPage() {
    const { provider } = useParams<{ provider: string }>();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { setAuth } = useAuthStore();
    const [error, setError] = useState<string | null>(null);
    const hasCalledRef = useRef(false);

    // MFA state
    const [mfaRequired, setMfaRequired] = useState(false);
    const [mfaToken, setMfaToken] = useState('');
    const [mfaUser, setMfaUser] = useState<User | null>(null);

    useEffect(() => {
        const handleCallback = async () => {
            // Prevent duplicate API calls (React StrictMode or re-renders)
            if (hasCalledRef.current) {
                console.log('[CallbackPage] OAuth callback already called, skipping...');
                return;
            }
            hasCalledRef.current = true;

            const code = searchParams.get('code');
            const state = searchParams.get('state');

            if (!code) {
                setError('Authorization code not found');
                return;
            }

            try {
                // Explicitly pass the redirect URI to match the one sent during authorization
                const redirectUri = `${window.location.origin}/auth/callback/${provider}`;

                // Check if user is already authenticated - if so, this is a LINK operation
                if (useAuthStore.getState().isAuthenticated) {
                    const response = await fetch(`${API_BASE_URL}/api/v1/account/link-oauth`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${useAuthStore.getState().accessToken}`
                        },
                        body: JSON.stringify({
                            provider,
                            code,
                            redirect_uri: redirectUri
                        }),
                    });

                    const data = await response.json();

                    if (!data.success) {
                        setError(data.error?.message || data.error_description || 'Link failed');
                        return;
                    }

                    // Link successful, check for pending OAuth flow first
                    completeOAuthFlowIfNeeded(() => navigate('/'));
                    return;
                }

                // Normal Login Flow
                const data = await authClient.handleOAuthCallback(provider!, code, redirectUri);

                // Check if MFA is required
                if (data.mfa_required) {
                    setMfaUser(data.user);
                    setMfaToken(data.mfa_token || '');
                    setMfaRequired(true);
                    return;
                }

                // Store auth data (synced via listener)
                // setAuth call is no longer needed as authClient.onAuthStateChange handles it
                // setAuth(data.user, data.access_token, data.refresh_token);

                // Complete OAuth flow if there's one pending, otherwise go home
                completeOAuthFlowIfNeeded(() => navigate('/'));
            } catch (err) {
                console.error('[CallbackPage] OAuth callback error:', err);
                setError('An error occurred during login');
            }
        };

        handleCallback();
    }, [provider, searchParams, navigate, setAuth]);

    /**
     * Helper function to complete a pending OAuth flow after successful login
     * Checks sessionStorage for saved OAuth params and redirects to authorize endpoint
     */
    const completeOAuthFlowIfNeeded = (fallback: () => void) => {
        const savedOAuthFlow = sessionStorage.getItem('oauth_flow_params');
        console.log('[CallbackPage] Checking for saved OAuth flow params:', savedOAuthFlow);

        if (savedOAuthFlow) {
            try {
                const oauthParams = JSON.parse(savedOAuthFlow);
                console.log('[CallbackPage] Found OAuth flow params, completing flow:', oauthParams);
                sessionStorage.removeItem('oauth_flow_params'); // Clean up

                // Build the OAuth authorize URL to complete the original flow
                const params = new URLSearchParams();
                params.set('client_id', oauthParams.client_id);
                params.set('redirect_uri', oauthParams.redirect_uri);
                params.set('response_type', oauthParams.response_type);
                if (oauthParams.scope) params.set('scope', oauthParams.scope);
                if (oauthParams.state) params.set('state', oauthParams.state);
                if (oauthParams.nonce) params.set('nonce', oauthParams.nonce);
                if (oauthParams.code_challenge) params.set('code_challenge', oauthParams.code_challenge);
                if (oauthParams.code_challenge_method) params.set('code_challenge_method', oauthParams.code_challenge_method);

                const redirectUrl = `${API_BASE_URL}/api/v1/oauth2/authorize?${params.toString()}`;
                console.log('[CallbackPage] Redirecting to complete OAuth flow:', redirectUrl);

                // Use window.location.href for full page redirect
                window.location.href = redirectUrl;
                return;
            } catch (e) {
                console.error('[CallbackPage] Failed to parse saved OAuth flow params:', e);
                sessionStorage.removeItem('oauth_flow_params');
            }
        }

        // No OAuth flow to complete - call fallback
        fallback();
    };

    const handleMFABack = () => {
        // Reset and go to login page
        setMfaRequired(false);
        setMfaToken('');
        setMfaUser(null);
        navigate('/login');
    };

    // Show MFA verification step if required
    if (mfaRequired && mfaUser && mfaToken) {
        return (
            <div className="min-h-screen gradient-bg flex items-center justify-center p-4">
                <div className="bg-canvas dark:bg-ocean rounded-2xl shadow-medium p-8 max-w-md w-full">
                    <MFAVerifyStep
                        user={mfaUser}
                        mfaToken={mfaToken}
                        onBack={handleMFABack}
                    />
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen gradient-bg flex items-center justify-center p-4">
                <div className="bg-canvas dark:bg-ocean rounded-2xl shadow-medium p-8 text-center max-w-md">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                        <svg
                            className="w-8 h-8 text-red-500"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M6 18L18 6M6 6l12 12"
                            />
                        </svg>
                    </div>
                    <h2 className="text-xl font-semibold text-ink dark:text-moonlight mb-2">
                        Login Failed
                    </h2>
                    <p className="text-stone mb-4">{error}</p>
                    <button
                        onClick={() => navigate('/login')}
                        className="px-6 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-lg font-medium transition-colors"
                    >
                        Back to Login
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen gradient-bg flex items-center justify-center p-4">
            <div className="bg-canvas dark:bg-ocean rounded-2xl shadow-medium p-8 text-center">
                <div className="w-12 h-12 mx-auto mb-4 border-4 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-stone">Processing login...</p>
            </div>
        </div>
    );
}
