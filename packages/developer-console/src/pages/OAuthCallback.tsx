import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

// This page handles the OAuth callback from social login
export default function OAuthCallback() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const accessToken = searchParams.get('access_token');
        const refreshToken = searchParams.get('refresh_token');
        const errorMsg = searchParams.get('error');

        if (errorMsg) {
            setError(errorMsg);
            return;
        }

        if (accessToken) {
            // Store tokens and redirect to dashboard
            localStorage.setItem('access_token', accessToken);
            if (refreshToken) {
                localStorage.setItem('refresh_token', refreshToken);
            }
            navigate('/');
        } else {
            setError('No access token received from OAuth callback');
        }
    }, [searchParams, navigate]);

    if (error) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
                <Card className="w-full max-w-md shadow-2xl border-slate-700 bg-slate-800/50 backdrop-blur">
                    <CardHeader className="text-center">
                        <CardTitle className="text-2xl font-bold text-white">Login Failed</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-red-400 text-center">{error}</p>
                        <a href="/login" className="block mt-4 text-center text-blue-400 hover:underline">
                            Back to Login
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
                    <CardTitle className="text-2xl font-bold text-white">Authenticating...</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-slate-400 text-center">Please wait while we complete your login.</p>
                </CardContent>
            </Card>
        </div>
    );
}
