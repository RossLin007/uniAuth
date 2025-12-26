import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { API_BASE_URL } from '../config/api';
import OtpInput from './OtpInput';

interface User {
    id: string;
    phone: string | null;
    email: string | null;
    nickname: string | null;
    avatar_url: string | null;
}

interface MFAVerifyStepProps {
    user: User;
    mfaToken: string;
    onBack: () => void;
}

export default function MFAVerifyStep({ user, mfaToken, onBack }: MFAVerifyStepProps) {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { setAuth } = useAuthStore();
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const verifyMFA = async () => {
        if (code.length < 6) {
            setError(t('mfa.invalidCode'));
            return;
        }

        setLoading(true);
        setError('');

        try {
            const response = await fetch(`${API_BASE_URL}/api/v1/auth/mfa/verify-login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    mfa_token: mfaToken,
                    code,
                }),
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                setError(data.error?.message || t('mfa.verifyFailed'));
                return;
            }

            // Login successful
            setAuth(data.data.user, data.data.access_token, data.data.refresh_token);
            navigate('/');
        } catch (err) {
            setError((err as Error).message || t('errors.networkError'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="text-center">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-xl mb-4">
                    <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                </div>
                <h2 className="text-xl font-semibold text-ink dark:text-moonlight mb-1">
                    {t('mfa.verifyTitle', { defaultValue: 'Two-Factor Authentication' })}
                </h2>
                <p className="text-sm text-stone dark:text-stone">
                    {t('mfa.verifySubtitle', { defaultValue: 'Enter the code from your authenticator app' })}
                </p>
            </div>

            {/* User Info */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-mist dark:bg-slate-800">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sky-400 to-blue-500 flex items-center justify-center text-white font-semibold">
                    {user.nickname?.[0] || user.email?.[0] || user.phone?.[0] || '?'}
                </div>
                <div className="flex-1 min-w-0">
                    {user.nickname && (
                        <p className="text-sm font-medium text-ink dark:text-moonlight truncate">
                            {user.nickname}
                        </p>
                    )}
                    <p className="text-xs text-stone truncate">
                        {user.email || user.phone}
                    </p>
                </div>
            </div>

            {/* OTP Input */}
            <div className="flex justify-center">
                <OtpInput
                    length={6}
                    value={code}
                    onChange={setCode}
                />
            </div>

            {/* Error */}
            {error && (
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm text-center">
                    {error}
                </div>
            )}

            {/* Recovery Code Tip */}
            <p className="text-xs text-stone text-center">
                {t('mfa.recoveryCodeTip', { defaultValue: 'You can also use a recovery code' })}
            </p>

            {/* Buttons */}
            <div className="flex gap-3">
                <button
                    onClick={onBack}
                    className="flex-1 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                    {t('common.back')}
                </button>
                <button
                    onClick={verifyMFA}
                    disabled={loading || code.length < 6}
                    className="flex-1 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold hover:from-indigo-600 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? t('common.loading') : t('mfa.verify')}
                </button>
            </div>
        </div>
    );
}
