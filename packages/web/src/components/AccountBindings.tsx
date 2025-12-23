import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../utils/api';

interface Binding {
    phone: { value: string | null; verified: boolean };
    email: { value: string | null; verified: boolean };
    oauth: Array<{
        provider: string;
        provider_email: string | null;
        created_at: string;
    }>;
}

interface AccountBindingsProps {
    onBindPhone?: () => void;
    onBindEmail?: () => void;
}

export default function AccountBindings({ onBindPhone, onBindEmail }: AccountBindingsProps) {
    const { t } = useTranslation();
    const [bindings, setBindings] = useState<Binding | null>(null);
    const [loading, setLoading] = useState(true);
    const [unbinding, setUnbinding] = useState<string | null>(null);

    useEffect(() => {
        fetchBindings();
    }, []);

    const fetchBindings = async () => {
        try {
            const data = await api.get<Binding>('/user/bindings');
            setBindings(data);
        } catch (error) {
            console.error('Failed to fetch bindings:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleUnbind = async (provider: string) => {
        if (!confirm(t('bindings.unbindConfirm', { provider }))) {
            return;
        }

        setUnbinding(provider);
        try {
            await api.delete(`/user/unbind/${provider}`);
            fetchBindings();
        } catch (error) {
            console.error('Failed to unbind:', error);
            alert((error as Error).message);
        } finally {
            setUnbinding(null);
        }
    };

    const getProviderIcon = (provider: string) => {
        switch (provider) {
            case 'google':
                return (
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                );
            case 'github':
                return (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                    </svg>
                );
            case 'wechat':
                return (
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#07C160">
                        <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 01.213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 00.167-.054l1.903-1.114a.864.864 0 01.717-.098 10.16 10.16 0 002.837.403c.276 0 .543-.027.811-.05a6.04 6.04 0 01-.172-1.387c0-3.476 3.138-6.294 7.007-6.294.39 0 .774.034 1.146.1-.32-3.632-3.949-6.462-8.382-6.462z" />
                    </svg>
                );
            default:
                return (
                    <div className="w-5 h-5 bg-gray-300 rounded-full flex items-center justify-center">
                        <span className="text-xs text-gray-600">{provider[0].toUpperCase()}</span>
                    </div>
                );
        }
    };

    if (loading) {
        return (
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-6">
                <div className="animate-pulse space-y-4">
                    <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-1/3"></div>
                    <div className="h-16 bg-slate-200 dark:bg-slate-700 rounded"></div>
                    <div className="h-16 bg-slate-200 dark:bg-slate-700 rounded"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-6">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">
                {t('bindings.title')}
            </h3>

            <div className="space-y-4">
                {/* Phone Binding */}
                <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-700/50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                            <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('bindings.phone')}</p>
                            <p className={`text-sm ${bindings?.phone.value ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 italic'}`}>
                                {bindings?.phone.value || t('bindings.notBound')}
                            </p>
                        </div>
                    </div>
                    {!bindings?.phone.value && onBindPhone && (
                        <button
                            onClick={onBindPhone}
                            className="px-3 py-1.5 text-sm font-medium text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-900/20 rounded-lg transition-colors"
                        >
                            {t('bindings.bind')}
                        </button>
                    )}
                </div>

                {/* Email Binding */}
                <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-700/50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-sky-100 dark:bg-sky-900/30 flex items-center justify-center">
                            <svg className="w-5 h-5 text-sky-600 dark:text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('bindings.email')}</p>
                            <p className={`text-sm ${bindings?.email.value ? 'text-sky-600 dark:text-sky-400' : 'text-slate-400 italic'}`}>
                                {bindings?.email.value || t('bindings.notBound')}
                            </p>
                        </div>
                    </div>
                    {!bindings?.email.value && onBindEmail && (
                        <button
                            onClick={onBindEmail}
                            className="px-3 py-1.5 text-sm font-medium text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-900/20 rounded-lg transition-colors"
                        >
                            {t('bindings.bind')}
                        </button>
                    )}
                </div>

                {/* OAuth Accounts */}
                {bindings?.oauth && bindings.oauth.length > 0 && (
                    <div className="pt-4 border-t border-slate-100 dark:border-slate-700">
                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-3">{t('bindings.oauth')}</p>
                        <div className="space-y-2">
                            {bindings.oauth.map((account) => (
                                <div key={account.provider} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50">
                                    <div className="flex items-center gap-3">
                                        {getProviderIcon(account.provider)}
                                        <div>
                                            <p className="text-sm font-medium text-slate-700 dark:text-slate-300 capitalize">
                                                {t(`providers.${account.provider}`, account.provider)}
                                            </p>
                                            {account.provider_email && (
                                                <p className="text-xs text-slate-400">{account.provider_email}</p>
                                            )}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleUnbind(account.provider)}
                                        disabled={unbinding === account.provider}
                                        className="px-3 py-1.5 text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
                                    >
                                        {unbinding === account.provider ? '...' : t('bindings.unbind')}
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
