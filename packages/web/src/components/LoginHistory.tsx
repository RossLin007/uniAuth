import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../utils/api';
import EmptyState from './EmptyState';

interface LoginRecord {
    id: string;
    ip_address: string | null;
    user_agent: string | null;
    created_at: string;
    device_type?: string;
    device_name?: string;
    browser?: string;
    os?: string;
}

export default function LoginHistory() {
    const { t } = useTranslation();
    const [records, setRecords] = useState<LoginRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState(false);

    useEffect(() => {
        fetchLoginHistory();
    }, []);

    const fetchLoginHistory = async () => {
        try {
            // We'll use sessions endpoint to get login history
            const res = await api.get<{ success: boolean; data: LoginRecord[] }>('/user/sessions');
            if (res.success) {
                setRecords(res.data.slice(0, 5)); // Only show last 5
            }
        } catch (err) {
            console.error('Failed to fetch login history:', err);
        } finally {
            setLoading(false);
        }
    };

    const parseUserAgent = (ua: string | null) => {
        if (!ua) return { browser: 'Unknown', os: 'Unknown', device: 'Unknown' };

        let browser = 'Unknown';
        let os = 'Unknown';
        let device = 'Desktop';

        // Browser detection
        if (ua.includes('Chrome')) browser = 'Chrome';
        else if (ua.includes('Firefox')) browser = 'Firefox';
        else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari';
        else if (ua.includes('Edge')) browser = 'Edge';

        // OS detection
        if (ua.includes('Windows')) os = 'Windows';
        else if (ua.includes('Mac OS')) os = 'macOS';
        else if (ua.includes('Linux')) os = 'Linux';
        else if (ua.includes('Android')) { os = 'Android'; device = 'Mobile'; }
        else if (ua.includes('iPhone') || ua.includes('iPad')) { os = 'iOS'; device = 'Mobile'; }

        return { browser, os, device };
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays === 0) {
            return t('loginHistory.today');
        } else if (diffDays === 1) {
            return t('loginHistory.yesterday');
        } else if (diffDays < 7) {
            return t('loginHistory.daysAgo', { days: diffDays });
        } else {
            return date.toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
            });
        }
    };

    const formatTime = (dateString: string) => {
        return new Date(dateString).toLocaleTimeString(undefined, {
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const getDeviceIcon = (device: string) => {
        if (device === 'Mobile') {
            return (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
            );
        }
        return (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
        );
    };

    if (loading) {
        return (
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-6">
                <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">
                    {t('loginHistory.title')}
                </h3>
                <div className="animate-pulse space-y-3">
                    <div className="h-12 bg-slate-100 dark:bg-slate-700 rounded-xl"></div>
                    <div className="h-12 bg-slate-100 dark:bg-slate-700 rounded-xl"></div>
                </div>
            </div>
        );
    }

    const displayRecords = expanded ? records : records.slice(0, 3);

    return (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                    {t('loginHistory.title')}
                </h3>
                <span className="text-xs text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded-full">
                    {t('loginHistory.recent', { count: records.length })}
                </span>
            </div>

            {records.length === 0 ? (
                <EmptyState
                    type="history"
                    title={t('loginHistory.noRecords', 'No Login History')}
                    description={t('loginHistory.noRecordsDesc', 'We do not have any login records for your account yet.')}
                />
            ) : (
                <div className="space-y-2">
                    {displayRecords.map((record, index) => {
                        const { browser, os, device } = parseUserAgent(record.user_agent);
                        const isFirst = index === 0;

                        return (
                            <div
                                key={record.id}
                                className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${isFirst
                                    ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                                    : 'bg-slate-50 dark:bg-slate-700/50'
                                    }`}
                            >
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isFirst
                                    ? 'bg-green-500 text-white'
                                    : 'bg-slate-200 dark:bg-slate-600 text-slate-500 dark:text-slate-400'
                                    }`}>
                                    {getDeviceIcon(device)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">
                                            {browser} • {os}
                                        </span>
                                        {isFirst && (
                                            <span className="text-xs bg-green-500 text-white px-1.5 py-0.5 rounded font-medium">
                                                {t('loginHistory.current')}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <span className="text-xs text-slate-400">{record.ip_address || 'Unknown IP'}</span>
                                        <span className="text-xs text-slate-300">•</span>
                                        <span className="text-xs text-slate-400">
                                            {formatDate(record.created_at)} {formatTime(record.created_at)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {records.length > 3 && (
                <button
                    onClick={() => setExpanded(!expanded)}
                    className="w-full mt-3 text-center text-sm text-sky-500 hover:text-sky-600 py-2"
                >
                    {expanded ? t('loginHistory.showLess') : t('loginHistory.showMore')}
                </button>
            )}
        </div>
    );
}
