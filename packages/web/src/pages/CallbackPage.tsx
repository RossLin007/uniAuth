import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export default function CallbackPage() {
    const { provider } = useParams<{ provider: string }>();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { setAuth } = useAuthStore();
    const [error, setError] = useState<string | null>(null);
    const hasCalledRef = useRef(false);

    useEffect(() => {
        const handleCallback = async () => {
            // Prevent duplicate calls (React StrictMode or re-renders)
            if (hasCalledRef.current) {
                console.log('OAuth callback already called, skipping...');
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
                const response = await fetch(`/api/v1/auth/oauth/${provider}/callback`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ code, state }),
                });

                const data = await response.json();

                if (!data.success) {
                    setError(data.error?.message || 'OAuth login failed');
                    return;
                }

                // Store auth data
                setAuth(data.data.user, data.data.access_token, data.data.refresh_token);

                // Redirect to home
                navigate('/');
            } catch (err) {
                console.error('OAuth callback error:', err);
                setError('An error occurred during login');
            }
        };

        handleCallback();
    }, [provider, searchParams, navigate, setAuth]);

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
