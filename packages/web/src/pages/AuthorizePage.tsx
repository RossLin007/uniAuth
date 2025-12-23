import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../utils/api';
import { useAuthStore } from '../store/authStore';

interface ClientInfo {
    name: string;
    logo_url: string | null;
    description: string | null;
    homepage_url: string | null;
    is_trusted: boolean;
}

export default function AuthorizePage() {
    const [searchParams] = useSearchParams();
    const { user } = useAuthStore();
    const [client, setClient] = useState<ClientInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [authorizing, setAuthorizing] = useState(false);

    const clientId = searchParams.get('client_id');
    const redirectUri = searchParams.get('redirect_uri');
    const scope = searchParams.get('scope');
    const state = searchParams.get('state');
    const responseType = searchParams.get('response_type');

    useEffect(() => {
        if (!clientId || !redirectUri) {
            setError('Missing required parameters (client_id, redirect_uri)');
            setLoading(false);
            return;
        }

        const validateClient = async () => {
            try {
                const res = await api.get<{ application: ClientInfo }>(
                    `/oauth2/validate?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code`
                );
                setClient(res.application);
            } catch (err: any) {
                console.error('Validation failed', err);
                setError(err.message || 'Invalid client or redirect URI');
            } finally {
                setLoading(false);
            }
        };

        validateClient();
    }, [clientId, redirectUri]);

    const handleAuthorize = async () => {
        setAuthorizing(true);
        try {
            const res = await api.post<{ redirect_url: string }>('/oauth2/authorize', {
                client_id: clientId,
                redirect_uri: redirectUri,
                scope,
                state,
                response_type: 'code',
            });

            // Redirect back to the third-party app
            window.location.href = res.redirect_url;
        } catch (err: any) {
            console.error('Authorization failed', err);
            setError(err.message || 'Authorization failed');
            setAuthorizing(false);
        }
    };

    const handleCancel = () => {
        // If possible, redirect back with error
        if (redirectUri) {
            const url = new URL(redirectUri);
            url.searchParams.set('error', 'access_denied');
            if (state) url.searchParams.set('state', state);
            window.location.href = url.toString();
        } else {
            window.history.back();
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-mist dark:bg-slate-900">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-mist dark:bg-slate-900 p-4">
                <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-xl max-w-md w-full text-center space-y-4">
                    <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <h1 className="text-xl font-bold text-ink dark:text-moonlight">Authorization Error</h1>
                    <p className="text-stone dark:text-slate-400">{error}</p>
                    <button
                        onClick={() => window.history.back()}
                        className="px-6 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-xl transition-colors text-sm font-medium"
                    >
                        Go Back
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-mist dark:bg-slate-900 p-4 transition-colors duration-300">
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden relative animate-fade-in group">
                {/* Header Gradient */}
                <div className="h-32 bg-gradient-to-br from-sky-400 to-blue-600 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
                    <div className="absolute -bottom-8 -right-8 w-32 h-32 bg-white/20 rounded-full blur-2xl"></div>

                    <div className="absolute bottom-0 left-0 w-full h-16 bg-gradient-to-t from-white dark:from-slate-800 to-transparent"></div>
                </div>

                <div className="px-8 pb-8 -mt-12 relative z-10">
                    {/* App Icons */}
                    <div className="flex justify-center items-center gap-6 mb-8">
                        <div className="w-20 h-20 bg-white dark:bg-slate-700 rounded-2xl shadow-lg flex items-center justify-center p-2 transform group-hover:-translate-x-2 transition-transform duration-500">
                            {user?.avatar_url ? (
                                <img src={user.avatar_url} alt="User" className="w-full h-full rounded-xl object-cover" />
                            ) : (
                                <div className="w-full h-full bg-slate-100 dark:bg-slate-600 rounded-xl flex items-center justify-center text-2xl">
                                    👤
                                </div>
                            )}
                        </div>
                        <div className="w-8 h-8 flex items-center justify-center text-slate-300 dark:text-slate-600">
                            <svg className="w-6 h-6 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                            </svg>
                        </div>
                        <div className="w-20 h-20 bg-white dark:bg-slate-700 rounded-2xl shadow-lg flex items-center justify-center p-2 transform group-hover:translate-x-2 transition-transform duration-500">
                            {client?.logo_url ? (
                                <img src={client.logo_url} alt="App" className="w-full h-full rounded-xl object-contain" />
                            ) : (
                                <div className="w-full h-full bg-indigo-50 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center text-2xl font-bold text-indigo-500">
                                    {client?.name?.[0]?.toUpperCase() || 'A'}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="text-center space-y-2 mb-8">
                        <h2 className="text-2xl font-bold text-ink dark:text-moonlight">
                            Authorization Request
                        </h2>
                        <p className="text-stone dark:text-slate-400">
                            <span className="font-semibold text-slate-800 dark:text-white">{client?.name}</span> wants to access your account:
                        </p>
                        <div className="inline-block px-3 py-1 bg-slate-100 dark:bg-slate-700 rounded-full text-xs font-mono text-slate-500 dark:text-slate-300">
                            {user?.email || user?.phone}
                        </div>
                    </div>

                    {/* Permissions List */}
                    <div className="space-y-4 mb-8">
                        <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50">
                            <div className="mt-1 w-5 h-5 rounded-full bg-green-100 text-green-600 flex items-center justify-center flex-shrink-0">
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <div className="text-sm">
                                <p className="font-medium text-slate-700 dark:text-slate-200">View your public profile</p>
                                <p className="text-slate-400 text-xs">Nickname, Avatar, User ID</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50">
                            <div className="mt-1 w-5 h-5 rounded-full bg-green-100 text-green-600 flex items-center justify-center flex-shrink-0">
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <div className="text-sm">
                                <p className="font-medium text-slate-700 dark:text-slate-200">View your email/phone</p>
                                <p className="text-slate-400 text-xs">For verification and contact</p>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="space-y-3">
                        <button
                            onClick={handleAuthorize}
                            disabled={authorizing}
                            className="w-full py-3.5 bg-sky-500 hover:bg-sky-600 active:scale-[0.98] text-white rounded-xl font-bold shadow-lg shadow-sky-500/30 transition-all disabled:opacity-70 disabled:scale-100"
                        >
                            {authorizing ? (
                                <span className="flex items-center justify-center gap-2">
                                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                    Authorizing...
                                </span>
                            ) : (
                                'Allow Access'
                            )}
                        </button>
                        <button
                            onClick={handleCancel}
                            disabled={authorizing}
                            className="w-full py-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl font-semibold transition-colors disabled:opacity-50"
                        >
                            Cancel
                        </button>
                    </div>

                    <div className="mt-6 text-center">
                        <p className="text-xs text-slate-400">
                            By continuing, you allow this app to access your data in accordance with their privacy policy.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
