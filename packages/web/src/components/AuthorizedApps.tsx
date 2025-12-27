import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../utils/api';
import EmptyState from './EmptyState';

interface AuthorizedApp {
    clientId: string;
    name: string;
    description: string | null;
    logoUrl: string | null;
    homepageUrl: string | null;
    authorizedAt: string;
    lastUsedAt: string | null;
    scopes: string[];
}

export default function AuthorizedApps() {
    const { t } = useTranslation();
    const [apps, setApps] = useState<AuthorizedApp[]>([]);
    const [loading, setLoading] = useState(true);
    const [revoking, setRevoking] = useState<string | null>(null);

    useEffect(() => {
        fetchApps();
    }, []);

    const fetchApps = async () => {
        try {
            const res = await api.get<{ success: boolean; data: AuthorizedApp[] }>('/user/authorized-apps');
            if (res.success) {
                setApps(res.data);
            }
        } catch (err) {
            console.error('Failed to fetch authorized apps:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleRevoke = async (clientId: string) => {
        if (!confirm(t('authorizedApps.revokeConfirm'))) return;

        setRevoking(clientId);
        try {
            const res = await api.delete<{ success: boolean }>(`/user/authorized-apps/${clientId}`);
            if (res.success) {
                setApps(apps.filter(app => app.clientId !== clientId));
            }
        } catch (err) {
            console.error('Failed to revoke app:', err);
        } finally {
            setRevoking(null);
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    const getScopeLabel = (scope: string): string => {
        const scopeLabels: Record<string, string> = {
            'openid': t('scopes.openid'),
            'profile': t('scopes.profile'),
            'email': t('scopes.email'),
            'phone': t('scopes.phone'),
        };
        return scopeLabels[scope] || scope;
    };

    if (loading) {
        return (
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-6">
                <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">
                    {t('authorizedApps.title')}
                </h3>
                <div className="animate-pulse space-y-3">
                    <div className="h-16 bg-slate-100 dark:bg-slate-700 rounded-xl"></div>
                    <div className="h-16 bg-slate-100 dark:bg-slate-700 rounded-xl"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-6">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 font-serif">
                {t('authorizedApps.title')}
            </h3>

            {apps.length === 0 ? (
                <EmptyState
                    type="apps"
                    title={t('authorizedApps.noApps')}
                    description={t('authorizedApps.noAppsDesc', 'You have not authorized any applications yet.')}
                />
            ) : (
                <div className="space-y-3">
                    {apps.map((app) => (
                        <div
                            key={app.clientId}
                            className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                        >
                            {/* App Icon */}
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0 overflow-hidden">
                                {app.logoUrl ? (
                                    <img src={app.logoUrl} alt={app.name} className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-white text-xl font-bold">{app.name.charAt(0).toUpperCase()}</span>
                                )}
                            </div>

                            {/* App Info */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <h4 className="font-semibold text-slate-800 dark:text-white truncate">
                                        {app.homepageUrl ? (
                                            <a href={app.homepageUrl} target="_blank" rel="noopener noreferrer" className="hover:text-sky-500">
                                                {app.name}
                                            </a>
                                        ) : (
                                            app.name
                                        )}
                                    </h4>
                                </div>
                                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                                    {t('authorizedApps.authorizedOn', { date: formatDate(app.authorizedAt) })}
                                    {app.lastUsedAt && (
                                        <span className="ml-2">
                                            • {t('authorizedApps.lastUsed', { date: formatDate(app.lastUsedAt) })}
                                        </span>
                                    )}
                                </p>
                                {app.scopes.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-2">
                                        {app.scopes.map((scope) => (
                                            <span
                                                key={scope}
                                                className="px-2 py-0.5 text-xs rounded-full bg-sky-100 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400"
                                            >
                                                {getScopeLabel(scope)}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Revoke Button */}
                            <button
                                onClick={() => handleRevoke(app.clientId)}
                                disabled={revoking === app.clientId}
                                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors disabled:opacity-50"
                            >
                                {revoking === app.clientId ? t('common.loading') : t('authorizedApps.revoke')}
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
