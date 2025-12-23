import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

interface SecurityStatusProps {
    user: {
        email: string | null;
        phone: string | null;
    };
    oauthCount?: number;
}

interface SecurityItem {
    key: string;
    label: string;
    status: 'complete' | 'incomplete';
    weight: number;
}

export default function SecurityStatus({ user, oauthCount = 0 }: SecurityStatusProps) {
    const { t } = useTranslation();

    const securityItems = useMemo<SecurityItem[]>(() => [
        {
            key: 'email',
            label: t('security.emailVerified'),
            status: user.email ? 'complete' : 'incomplete',
            weight: 30,
        },
        {
            key: 'phone',
            label: t('security.phoneVerified'),
            status: user.phone ? 'complete' : 'incomplete',
            weight: 30,
        },
        {
            key: 'oauth',
            label: t('security.oauthLinked'),
            status: oauthCount > 0 ? 'complete' : 'incomplete',
            weight: 20,
        },
        {
            key: 'mfa',
            label: t('security.mfaEnabled'),
            status: 'incomplete', // TODO: implement MFA
            weight: 20,
        },
    ], [user.email, user.phone, oauthCount, t]);

    const securityScore = useMemo(() => {
        return securityItems.reduce((score, item) => {
            return score + (item.status === 'complete' ? item.weight : 0);
        }, 0);
    }, [securityItems]);

    const getScoreColor = (score: number) => {
        if (score >= 80) return 'text-green-400';
        if (score >= 50) return 'text-yellow-400';
        return 'text-red-400';
    };

    const getScoreLabel = (score: number) => {
        if (score >= 80) return t('security.excellent');
        if (score >= 50) return t('security.good');
        return t('security.needsImprovement');
    };

    const getProgressColor = (score: number) => {
        if (score >= 80) return 'bg-green-400';
        if (score >= 50) return 'bg-yellow-400';
        return 'bg-red-400';
    };

    return (
        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-lg p-6 text-white overflow-hidden relative">
            {/* Background decoration */}
            <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
            <div className="absolute bottom-0 left-0 -ml-8 -mb-8 w-32 h-32 bg-black/10 rounded-full blur-2xl"></div>

            <h3 className="text-lg font-bold mb-4 relative z-10">{t('home.securityStatus')}</h3>

            {/* Score Circle */}
            <div className="flex items-center gap-4 mb-4 relative z-10">
                <div className="relative w-20 h-20">
                    {/* Background circle */}
                    <svg className="w-20 h-20 transform -rotate-90">
                        <circle
                            cx="40"
                            cy="40"
                            r="36"
                            stroke="rgba(255,255,255,0.2)"
                            strokeWidth="6"
                            fill="none"
                        />
                        <circle
                            cx="40"
                            cy="40"
                            r="36"
                            stroke="currentColor"
                            strokeWidth="6"
                            fill="none"
                            strokeDasharray={`${securityScore * 2.26} 226`}
                            className={`${getScoreColor(securityScore)} transition-all duration-700`}
                            strokeLinecap="round"
                        />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-2xl font-bold">{securityScore}</span>
                    </div>
                </div>
                <div>
                    <p className={`text-lg font-semibold ${getScoreColor(securityScore)}`}>
                        {getScoreLabel(securityScore)}
                    </p>
                    <p className="text-sm text-white/70">{t('security.securityScore')}</p>
                </div>
            </div>

            {/* Security Items */}
            <div className="space-y-2 relative z-10">
                {securityItems.map((item) => (
                    <div
                        key={item.key}
                        className="flex items-center justify-between bg-white/10 p-2 px-3 rounded-lg backdrop-blur-sm"
                    >
                        <div className="flex items-center gap-2">
                            {item.status === 'complete' ? (
                                <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            ) : (
                                <svg className="w-4 h-4 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01" />
                                </svg>
                            )}
                            <span className={`text-sm ${item.status === 'complete' ? 'text-white' : 'text-white/60'}`}>
                                {item.label}
                            </span>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${item.status === 'complete'
                                ? 'bg-green-400/20 text-green-300'
                                : 'bg-white/10 text-white/50'
                            }`}>
                            +{item.weight}
                        </span>
                    </div>
                ))}
            </div>

            {/* Progress bar */}
            <div className="mt-4 relative z-10">
                <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
                    <div
                        className={`h-full ${getProgressColor(securityScore)} rounded-full transition-all duration-700`}
                        style={{ width: `${securityScore}%` }}
                    />
                </div>
            </div>
        </div>
    );
}
