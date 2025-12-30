import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { API_BASE_URL } from '@/config/api';

// SDK uses these keys for token storage
const UNIAUTH_ACCESS_TOKEN_KEY = 'uniauth_access_token';
const UNIAUTH_REFRESH_TOKEN_KEY = 'uniauth_refresh_token';

// This page handles the OAuth callback from Google social login
export default function GoogleCallback() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [error, setError] = useState<string | null>(null);
    const [status, setStatus] = useState('Processing...');

    // MFA state - check sessionStorage for persisted MFA token
    const storedMfaToken = sessionStorage.getItem('mfa_token');
    const [mfaRequired, setMfaRequired] = useState(!!storedMfaToken);
    const [mfaToken, setMfaToken] = useState(storedMfaToken || '');
    const [mfaCode, setMfaCode] = useState('');
    const [mfaLoading, setMfaLoading] = useState(false);

    useEffect(() => {
        const code = searchParams.get('code');

        // If we have stored MFA token but no OAuth code, this means user
        // navigated directly to this page without going through OAuth flow.
        // Clear the stale token and redirect to login.
        if (storedMfaToken && !code) {
            sessionStorage.removeItem('mfa_token');
            window.location.href = '/login';
            return;
        }

        // If we already have MFA token stored (and have valid OAuth context), skip code exchange
        if (storedMfaToken) {
            setStatus('MFA verification required');
            return;
        }

        const exchangeCode = async () => {
            const state = searchParams.get('state');
            const errorParam = searchParams.get('error');

            if (errorParam) {
                setError(errorParam);
                return;
            }

            if (!code) {
                setError('No authorization code received');
                return;
            }

            try {
                setStatus('Exchanging code for tokens...');

                // Call the backend to exchange the code for tokens
                const response = await fetch(`${API_BASE_URL}/api/v1/auth/oauth/google/callback`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        code,
                        state,
                        redirect_uri: window.location.origin + '/auth/callback/google'
                    }),
                });

                const data = await response.json();
                console.log('OAuth callback response:', data);

                if (data.success) {
                    // Check if MFA is required
                    if (data.data?.mfa_required) {
                        // Store MFA token in sessionStorage so page refresh doesn't re-attempt code exchange
                        sessionStorage.setItem('mfa_token', data.data.mfa_token);
                        setMfaRequired(true);
                        setMfaToken(data.data.mfa_token);
                        setStatus('MFA verification required');
                        return;
                    }

                    if (data.data?.access_token) {
                        // Store tokens using SDK's localStorage keys
                        localStorage.setItem(UNIAUTH_ACCESS_TOKEN_KEY, data.data.access_token);
                        if (data.data.refresh_token) {
                            localStorage.setItem(UNIAUTH_REFRESH_TOKEN_KEY, data.data.refresh_token);
                        }
                        // Also store in legacy keys for AuthContext compatibility
                        localStorage.setItem('access_token', data.data.access_token);
                        if (data.data.refresh_token) {
                            localStorage.setItem('refresh_token', data.data.refresh_token);
                        }
                        setStatus('Login successful! Redirecting...');
                        // Force full page reload to update AuthContext
                        setTimeout(() => window.location.href = '/', 500);
                    } else {
                        setError('No access token in response');
                    }
                } else {
                    // Show detailed error
                    const errorMsg = data.error?.message || data.message || JSON.stringify(data);
                    console.error('OAuth callback failed:', errorMsg);
                    setError(errorMsg);
                }
            } catch (err: any) {
                console.error('OAuth callback error:', err);
                setError(err.message || 'Network error during login');
            }
        };

        exchangeCode();
    }, [searchParams, navigate]);

    const handleMfaSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMfaLoading(true);
        setError(null);

        try {
            const response = await fetch(`${API_BASE_URL}/api/v1/auth/mfa/verify-login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    mfa_token: mfaToken,
                    code: mfaCode
                }),
            });

            const data = await response.json();
            console.log('MFA verify response:', data);

            if (data.success && data.data?.access_token) {
                // Store tokens using SDK's localStorage keys
                localStorage.setItem(UNIAUTH_ACCESS_TOKEN_KEY, data.data.access_token);
                if (data.data.refresh_token) {
                    localStorage.setItem(UNIAUTH_REFRESH_TOKEN_KEY, data.data.refresh_token);
                }
                // Also store in legacy keys for AuthContext compatibility
                localStorage.setItem('access_token', data.data.access_token);
                if (data.data.refresh_token) {
                    localStorage.setItem('refresh_token', data.data.refresh_token);
                }
                // Clear MFA token from session storage
                sessionStorage.removeItem('mfa_token');
                setStatus('Login successful! Redirecting...');
                // Force full page reload to update AuthContext
                setTimeout(() => window.location.href = '/', 500);
            } else {
                // Clear stale MFA token on failure - it may be expired
                sessionStorage.removeItem('mfa_token');
                setError(data.error?.message || 'MFA verification failed');
            }
        } catch (err: any) {
            // Clear stale MFA token on error
            sessionStorage.removeItem('mfa_token');
            setError(err.message || 'Network error');
        } finally {
            setMfaLoading(false);
        }
    };

    // MFA Input Form
    if (mfaRequired) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
                <Card className="w-full max-w-md shadow-2xl border-slate-700 bg-slate-800/50 backdrop-blur">
                    <CardHeader className="text-center">
                        <CardTitle className="text-2xl font-bold text-white">MFA Verification</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-slate-400 text-center mb-4">
                            Enter your 6-digit authenticator code
                        </p>
                        {error && (
                            <div className="p-3 rounded-lg bg-red-500/20 border border-red-500/50 text-red-400 text-sm mb-4">
                                {error}
                            </div>
                        )}
                        <form onSubmit={handleMfaSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="mfaCode" className="text-slate-300">Verification Code</Label>
                                <Input
                                    id="mfaCode"
                                    placeholder="123456"
                                    value={mfaCode}
                                    onChange={e => setMfaCode(e.target.value)}
                                    required
                                    maxLength={6}
                                    className="bg-slate-700/50 border-slate-600 text-white text-center text-2xl tracking-widest"
                                />
                            </div>
                            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" isLoading={mfaLoading}>
                                Verify
                            </Button>
                        </form>
                        <button
                            type="button"
                            onClick={() => {
                                sessionStorage.removeItem('mfa_token');
                                window.location.href = '/login';
                            }}
                            className="block mt-4 text-center text-slate-500 hover:text-slate-300 text-sm w-full"
                        >
                            Cancel and go back
                        </button>
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
                        {error ? 'Login Failed' : 'Authenticating...'}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {error ? (
                        <>
                            <p className="text-red-400 text-center mb-4">{error}</p>
                            <a href="/login" className="block text-center text-blue-400 hover:underline">
                                Back to Login
                            </a>
                        </>
                    ) : (
                        <p className="text-slate-400 text-center">{status}</p>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
