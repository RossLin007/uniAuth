import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store/authStore';
import SliderCaptcha from './SliderCaptcha';

interface Props {
    email: string;
    onVerified?: () => void;
    onClose?: () => void;
}

/**
 * Email Verification Component
 * 邮箱验证组件
 * 
 * A modal/inline component for verifying user's email address.
 * 用于验证用户邮箱地址的模态/内联组件。
 */
export default function EmailVerification({ email, onVerified, onClose }: Props) {
    const { t } = useTranslation();
    const { accessToken } = useAuthStore();

    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [sendingCode, setSendingCode] = useState(false);
    const [countdown, setCountdown] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [showCaptcha, setShowCaptcha] = useState(false);

    // Prevent double sending in React 18 StrictMode
    const hasSentCode = useRef(false);

    // Countdown timer
    useEffect(() => {
        if (countdown > 0) {
            const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [countdown]);

    // Auto-show captcha on mount (only once)
    useEffect(() => {
        if (!hasSentCode.current) {
            hasSentCode.current = true;
            // Show captcha before first send
            setShowCaptcha(true);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleResendClick = () => {
        if (countdown > 0 || sendingCode) return;
        setShowCaptcha(true);
    };

    const handleCaptchaVerify = async (captchaToken: string) => {
        setShowCaptcha(false);
        await sendCode(captchaToken);
    };

    const handleCaptchaClose = () => {
        setShowCaptcha(false);
    };

    const sendCode = async (captchaToken: string) => {
        setSendingCode(true);
        setError(null);

        try {
            const response = await fetch('/api/v1/auth/email/send-code', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
                },
                body: JSON.stringify({
                    email,
                    type: 'email_verify',
                    captcha_token: captchaToken,
                }),
            });

            const data = await response.json();

            if (!data.success) {
                setError(data.error?.message || t('emailVerify.sendFailed'));
                if (data.data?.retry_after) {
                    setCountdown(data.data.retry_after);
                }
                return;
            }

            setCountdown(data.data?.retry_after || 60);
        } catch (err) {
            console.error('Send code error:', err);
            setError(t('errors.networkError'));
        } finally {
            setSendingCode(false);
        }
    };

    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!code || code.length !== 6) {
            setError(t('errors.invalidCode'));
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/v1/auth/email/verify-code', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
                },
                body: JSON.stringify({
                    email,
                    code,
                }),
            });

            const data = await response.json();

            if (!data.success) {
                setError(data.error?.message || t('emailVerify.verifyFailed'));
                return;
            }

            setSuccess(true);
            onVerified?.();

            // Auto close after 2 seconds
            setTimeout(() => {
                onClose?.();
            }, 2000);
        } catch (err) {
            console.error('Verify error:', err);
            setError(t('errors.networkError'));
        } finally {
            setLoading(false);
        }
    };

    const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.replace(/\D/g, '').slice(0, 6);
        setCode(value);
    };

    if (success) {
        return (
            <div className="email-verification-success">
                <div className="success-icon">
                    <svg className="w-16 h-16 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
                <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-200 mt-4">
                    {t('emailVerify.successTitle')}
                </h3>
                <p className="text-slate-500 dark:text-slate-400 mt-2">
                    {t('emailVerify.successMessage')}
                </p>
            </div>
        );
    }

    return (
        <div className="email-verification">
            {/* Header */}
            <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-sky-100 dark:bg-sky-900/30 mb-4">
                    <svg className="w-8 h-8 text-sky-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                </div>
                <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-200">
                    {t('emailVerify.title')}
                </h3>
                <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm">
                    {t('emailVerify.subtitle')}
                </p>
                <p className="text-sky-500 font-medium mt-1">{email}</p>
            </div>

            {/* Verification Form */}
            <form onSubmit={handleVerify} className="space-y-4">
                {/* Code Input */}
                <div>
                    <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={code}
                        onChange={handleCodeChange}
                        placeholder={t('login.codePlaceholder')}
                        maxLength={6}
                        className="w-full px-4 py-4 text-center text-2xl font-mono tracking-[0.5em] rounded-xl border border-slate-200 dark:border-slate-700 bg-canvas dark:bg-slate-800 text-ink dark:text-moonlight placeholder:text-stone focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-all"
                        autoFocus
                    />
                </div>

                {/* Resend Button */}
                <div className="text-center">
                    <button
                        type="button"
                        onClick={handleResendClick}
                        disabled={countdown > 0 || sendingCode}
                        className="text-sm text-sky-500 hover:text-sky-600 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors"
                    >
                        {sendingCode ? (
                            <span className="inline-flex items-center gap-2">
                                <span className="w-4 h-4 border-2 border-sky-500 border-t-transparent rounded-full animate-spin"></span>
                                {t('common.loading')}
                            </span>
                        ) : countdown > 0 ? (
                            t('login.resendCode', { seconds: countdown })
                        ) : (
                            t('emailVerify.resend')
                        )}
                    </button>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm text-center">
                        {error}
                    </div>
                )}

                {/* Submit Button */}
                <button
                    type="submit"
                    disabled={loading || code.length !== 6}
                    className="w-full py-3 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                    {loading && (
                        <span className="inline-block w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    )}
                    {t('emailVerify.verify')}
                </button>

                {/* Cancel Button */}
                {onClose && (
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-full py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium transition-colors"
                    >
                        {t('common.cancel')}
                    </button>
                )}
            </form>

            {/* Info */}
            <p className="text-center text-xs text-slate-400 dark:text-slate-500 mt-4">
                {t('emailVerify.info')}
            </p>

            {/* Captcha Modal */}
            {showCaptcha && (
                <SliderCaptcha
                    onVerify={handleCaptchaVerify}
                    onClose={handleCaptchaClose}
                />
            )}
        </div>
    );
}
