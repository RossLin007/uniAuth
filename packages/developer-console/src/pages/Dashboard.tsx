import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { api, App } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { AppWindow, Key, Webhook, Users } from 'lucide-react';
import { Link } from 'react-router-dom';

// 错误处理辅助函数
const getErrorMessage = (e: unknown, fallback: string): string => {
    if (e instanceof Error) return e.message;
    if (typeof e === 'string') return e;
    return fallback;
};

export default function Dashboard() {
    const { t } = useTranslation();
    const { resolvedTheme } = useTheme();
    const [apps, setApps] = useState<App[]>([]);
    const [loading, setLoading] = useState(true);
    const toast = useToast();

    const fetchApps = useCallback(async () => {
        try {
            const res = await api.getApps();
            setApps(res.data);
        } catch (e: unknown) {
            toast.error(getErrorMessage(e, t('common.error')));
        } finally {
            setLoading(false);
        }
    }, [toast, t]);

    useEffect(() => {
        fetchApps();
    }, [fetchApps]);

    const textPrimary = resolvedTheme === 'dark' ? 'text-white' : 'text-slate-900';
    const textSecondary = resolvedTheme === 'dark' ? 'text-slate-400' : 'text-slate-600';

    // Calculate stats
    const stats = [
        {
            icon: AppWindow,
            label: t('stats.totalApps'),
            value: apps.length,
            color: 'text-blue-500',
            bgColor: 'bg-blue-500/10'
        },
        {
            icon: Key,
            label: t('stats.activeClients'),
            value: apps.filter(a => a.app_type === 'web' || a.app_type === 'spa').length,
            color: 'text-green-500',
            bgColor: 'bg-green-500/10'
        },
        {
            icon: Webhook,
            label: t('stats.webhooks'),
            value: apps.reduce((sum, _) => sum, 0), // Placeholder
            color: 'text-purple-500',
            bgColor: 'bg-purple-500/10'
        },
        {
            icon: Users,
            label: t('stats.m2mClients'),
            value: apps.filter(a => a.app_type === 'm2m').length,
            color: 'text-orange-500',
            bgColor: 'bg-orange-500/10'
        }
    ];

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className={textSecondary}>{t('common.loading')}</div>
            </div>
        );
    }

    return (
        <div className="space-y-6 md:space-y-8">
            <header>
                <h1 className={`text-2xl md:text-3xl font-bold ${textPrimary}`}>{t('nav.dashboard')}</h1>
                <p className={`text-sm md:text-base ${textSecondary}`}>{t('dashboard.welcomeMessage')}</p>
            </header>

            {/* Stats Grid */}
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
                {stats.map((stat, index) => {
                    const Icon = stat.icon;
                    return (
                        <Card key={index}>
                            <CardContent className="p-4">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                                        <Icon className={`h-5 w-5 ${stat.color}`} />
                                    </div>
                                    <div>
                                        <p className={`text-2xl font-bold ${textPrimary}`}>{stat.value}</p>
                                        <p className={`text-xs ${textSecondary}`}>{stat.label}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {/* Quick Actions */}
            <Card>
                <CardHeader>
                    <CardTitle>{t('dashboard.quickActions')}</CardTitle>
                    <CardDescription>{t('dashboard.quickActionsDesc')}</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                    <Link
                        to="/apps"
                        className="flex items-center gap-3 p-4 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-blue-500 transition-colors"
                    >
                        <AppWindow className="h-6 w-6 text-blue-500" />
                        <div>
                            <p className={`font-medium ${textPrimary}`}>{t('dashboard.manageApps')}</p>
                            <p className={`text-sm ${textSecondary}`}>{t('dashboard.manageAppsDesc')}</p>
                        </div>
                    </Link>
                    <Link
                        to="/docs"
                        className="flex items-center gap-3 p-4 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-blue-500 transition-colors"
                    >
                        <Key className="h-6 w-6 text-green-500" />
                        <div>
                            <p className={`font-medium ${textPrimary}`}>{t('dashboard.viewDocs')}</p>
                            <p className={`text-sm ${textSecondary}`}>{t('dashboard.viewDocsDesc')}</p>
                        </div>
                    </Link>
                </CardContent>
            </Card>

            {/* Recent Apps */}
            {apps.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>{t('dashboard.recentApps')}</CardTitle>
                        <CardDescription>{t('dashboard.recentAppsDesc')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {apps.slice(0, 3).map(app => (
                                <Link
                                    key={app.id}
                                    to="/apps"
                                    className="flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-blue-500 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <AppWindow className={`h-5 w-5 ${textSecondary}`} />
                                        <div>
                                            <p className={`font-medium ${textPrimary}`}>{app.name}</p>
                                            <p className={`text-xs ${textSecondary}`}>{app.app_type.toUpperCase()}</p>
                                        </div>
                                    </div>
                                    <span className="font-mono text-xs text-slate-500">{app.client_id.slice(0, 8)}...</span>
                                </Link>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
