import { useTranslation } from 'react-i18next';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { ThemeSelector } from '@/components/ThemeSelector';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { Sun, User, Shield } from 'lucide-react';

export default function SettingsPage() {
    const { t } = useTranslation();
    const { resolvedTheme } = useTheme();
    const { user } = useAuth();

    const cardClass = resolvedTheme === 'dark'
        ? 'bg-slate-800/50 border-slate-700'
        : 'bg-white border-slate-200';
    const textPrimary = resolvedTheme === 'dark' ? 'text-white' : 'text-slate-900';
    const textSecondary = resolvedTheme === 'dark' ? 'text-slate-400' : 'text-slate-600';

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className={`text-2xl font-bold ${textPrimary}`}>{t('nav.settings')}</h1>
                <p className={`text-sm ${textSecondary}`}>{t('settings.subtitle')}</p>
            </div>

            {/* Profile Section */}
            <div className={`rounded-xl border ${cardClass} p-6`}>
                <div className="flex items-center gap-3 mb-4">
                    <User className={`h-5 w-5 ${textSecondary}`} />
                    <h2 className={`text-lg font-semibold ${textPrimary}`}>{t('settings.profile')}</h2>
                </div>

                <div className="space-y-4">
                    <div className="flex items-center gap-4">
                        {/* Avatar */}
                        {user?.avatar_url ? (
                            <img
                                src={user.avatar_url}
                                alt={user.nickname || 'User'}
                                className="w-16 h-16 rounded-full object-cover"
                            />
                        ) : (
                            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xl font-medium">
                                {user?.nickname?.slice(0, 2).toUpperCase() ||
                                    user?.email?.slice(0, 2).toUpperCase() ||
                                    user?.phone?.slice(-2) || 'U'}
                            </div>
                        )}
                        <div>
                            <p className={`font-medium ${textPrimary}`}>
                                {user?.nickname || user?.email?.split('@')[0] || user?.phone || t('common.user')}
                            </p>
                            <p className={`text-sm ${textSecondary}`}>
                                {user?.email || user?.phone || t('common.noContactInfo')}
                            </p>
                        </div>
                    </div>

                    <div className={`text-sm ${textSecondary}`}>
                        <p>ID: {user?.id || '-'}</p>
                    </div>
                </div>
            </div>

            {/* Appearance Section */}
            <div className={`rounded-xl border ${cardClass} p-6`}>
                <div className="flex items-center gap-3 mb-4">
                    <Sun className={`h-5 w-5 ${textSecondary}`} />
                    <h2 className={`text-lg font-semibold ${textPrimary}`}>{t('settings.appearance')}</h2>
                </div>

                <div className="space-y-4">
                    {/* Theme */}
                    <div className="flex items-center justify-between">
                        <div>
                            <p className={`font-medium ${textPrimary}`}>{t('settings.theme')}</p>
                            <p className={`text-sm ${textSecondary}`}>{t('settings.themeDesc')}</p>
                        </div>
                        <ThemeSelector />
                    </div>

                    {/* Language */}
                    <div className="flex items-center justify-between">
                        <div>
                            <p className={`font-medium ${textPrimary}`}>{t('settings.language')}</p>
                            <p className={`text-sm ${textSecondary}`}>{t('settings.languageDesc')}</p>
                        </div>
                        <LanguageSwitcher />
                    </div>
                </div>
            </div>

            {/* Security Section */}
            <div className={`rounded-xl border ${cardClass} p-6`}>
                <div className="flex items-center gap-3 mb-4">
                    <Shield className={`h-5 w-5 ${textSecondary}`} />
                    <h2 className={`text-lg font-semibold ${textPrimary}`}>{t('settings.security')}</h2>
                </div>

                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className={`font-medium ${textPrimary}`}>{t('settings.mfa')}</p>
                            <p className={`text-sm ${textSecondary}`}>{t('settings.mfaDesc')}</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs ${resolvedTheme === 'dark' ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                            {t('common.comingSoon')}
                        </span>
                    </div>

                    <div className="flex items-center justify-between">
                        <div>
                            <p className={`font-medium ${textPrimary}`}>{t('settings.sessions')}</p>
                            <p className={`text-sm ${textSecondary}`}>{t('settings.sessionsDesc')}</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs ${resolvedTheme === 'dark' ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                            {t('common.comingSoon')}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
