import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { API_BASE_URL } from '@/config/api';

/**
 * SSO Callback Page
 * 
 * This page handles the OAuth callback from the SSO service.
 * It exchanges the authorization code for tokens and stores them.
 */
export default function SSOCallback() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const errorParam = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');

        // Handle OAuth error
        if (errorParam) {
            setError(errorDescription || errorParam);
            return;
        }

        // Validate state to prevent CSRF
        const savedState = localStorage.getItem('oauth_state');
        if (state && savedState && state !== savedState) {
            setError('Invalid state parameter. Please try logging in again.');
            return;
        }

        // Clean up state
        localStorage.removeItem('oauth_state');

        if (!code) {
            setError('No authorization code received.');
            return;
        }

        // Exchange code for tokens
        exchangeCodeForTokens(code);
    }, [searchParams, navigate]);

    const exchangeCodeForTokens = async (code: string) => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/v1/oauth2/token`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    grant_type: 'authorization_code',
                    client_id: 'developer_console',
                    code,
                    redirect_uri: window.location.origin + '/auth/callback',
                }),
            });

            const data = await response.json();

            if (data.error) {
                setError(data.error_description || data.error);
                return;
            }

            if (data.access_token) {
                // Store tokens
                localStorage.setItem('access_token', data.access_token);
                if (data.refresh_token) {
                    localStorage.setItem('refresh_token', data.refresh_token);
                }
                // Redirect to dashboard
                navigate('/', { replace: true });
            } else {
                setError('Failed to get access token.');
            }
        } catch (err) {
            console.error('Token exchange error:', err);
            setError('Network error during token exchange. Please try again.');
        }
    };

    if (error) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
                <Card className="w-full max-w-md shadow-2xl border-slate-700 bg-slate-800/50 backdrop-blur">
                    <CardHeader className="text-center">
                        <CardTitle className="text-2xl font-bold text-white">
                            Login Failed / 登录失败
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-red-400 text-center">{error}</p>
                        <a
                            href="/login"
                            className="block text-center text-blue-400 hover:text-blue-300 hover:underline"
                        >
                            ← Back to Login / 返回登录
                        </a>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
            <Card className="w-full max-w-md shadow-2xl border-slate-700 bg-slate-800/50 backdrop-blur">
                <CardHeader className="text-center">
                    <CardTitle className="text-2xl font-bold text-white">
                        Authenticating... / 认证中...
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex justify-center mb-4">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
                    </div>
                    <p className="text-slate-400 text-center">
                        Please wait while we complete your login.
                    </p>
                    <p className="text-slate-500 text-center text-sm mt-1">
                        请稍候，正在完成登录...
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
