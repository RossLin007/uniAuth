import { useEffect, useState } from 'react';
import { api } from '../utils/api';
import { useTranslation } from 'react-i18next';

interface Session {
    id: string;
    device_info: {
        browser?: string;
        platform?: string;
        user_agent?: string;
    };
    ip_address: string;
    created_at: string;
    is_current: boolean;
}

export default function SessionList() {
    const { t } = useTranslation();
    const [sessions, setSessions] = useState<Session[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchSessions = async () => {
        try {
            const data = await api.get<{ sessions: Session[] }>('/user/sessions');
            setSessions(data.sessions || []);
        } catch (err) {
            console.error('Failed to fetch sessions', err);
        } finally {
            setLoading(false);
        }
    };

    const handleRevoke = async (sessionId: string) => {
        try {
            await api.delete(`/user/sessions/${sessionId}`);
            // Refresh list
            fetchSessions();
        } catch (err) {
            console.error('Failed to revoke session', err);
        }
    };

    useEffect(() => {
        fetchSessions();
    }, []);

    if (loading) return <div className="animate-pulse h-20 bg-slate-100 dark:bg-slate-800 rounded-xl"></div>;

    return (
        <div className="bg-canvas dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-6">
            <h3 className="text-lg font-bold text-ink dark:text-moonlight mb-4">
                {t('home.activeSessions')}
            </h3>
            <div className="space-y-4">
                {sessions.map((session) => (
                    <div
                        key={session.id}
                        className="flex items-center justify-between p-4 rounded-xl bg-mist dark:bg-slate-700/30 border border-slate-100 dark:border-slate-700"
                    >
                        <div className="flex items-center gap-4">
                            {/* Icon */}
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${session.is_current ? 'bg-green-100 text-green-600' : 'bg-slate-200 text-slate-500'
                                }`}>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                            </div>

                            {/* Info */}
                            <div>
                                <p className="font-medium text-ink dark:text-moonlight flex items-center gap-2">
                                    {session.device_info?.platform || 'Unknown OS'} - {session.device_info?.browser || 'Unknown Browser'}
                                    {session.is_current && (
                                        <span className="px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 text-xs font-bold">
                                            {t('home.current')}
                                        </span>
                                    )}
                                </p>
                                <p className="text-xs text-stone mt-0.5">
                                    IP: {session.ip_address || 'Unknown'} • {new Date(session.created_at).toLocaleString()}
                                </p>
                            </div>
                        </div>

                        {/* Action */}
                        {!session.is_current && (
                            <button
                                onClick={() => handleRevoke(session.id)}
                                className="text-sm text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 px-3 py-1.5 rounded-lg transition-colors"
                            >
                                {t('home.revoke')}
                            </button>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
