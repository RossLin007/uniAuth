import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { API_BASE_URL } from '../config/api';
import SliderCaptcha from './SliderCaptcha';
import OtpInput from './OtpInput';
import MFAVerifyStep from './MFAVerifyStep';

interface User {
    id: string;
    phone: string | null;
    email: string | null;
    nickname: string | null;
    avatar_url: string | null;
}

/**
 * Email provider configurations for inbox quick links
 * 邮箱提供商配置，用于快捷打开邮箱链接
 */
const EMAIL_PROVIDERS: Record<string, { name: string; inboxUrl: string }> = {
    'gmail.com': { name: 'Gmail', inboxUrl: 'https://mail.google.com' },
    'googlemail.com': { name: 'Gmail', inboxUrl: 'https://mail.google.com' },
    'outlook.com': { name: 'Outlook', inboxUrl: 'https://outlook.live.com' },
    'hotmail.com': { name: 'Outlook', inboxUrl: 'https://outlook.live.com' },
    'live.com': { name: 'Outlook', inboxUrl: 'https://outlook.live.com' },
    'msn.com': { name: 'Outlook', inboxUrl: 'https://outlook.live.com' },
    'qq.com': { name: 'QQ邮箱', inboxUrl: 'https://mail.qq.com' },
    'foxmail.com': { name: 'QQ邮箱', inboxUrl: 'https://mail.qq.com' },
    '163.com': { name: '网易邮箱', inboxUrl: 'https://mail.163.com' },
    '126.com': { name: '网易邮箱', inboxUrl: 'https://mail.126.com' },
    'yeah.net': { name: '网易邮箱', inboxUrl: 'https://mail.yeah.net' },
    'sina.com': { name: '新浪邮箱', inboxUrl: 'https://mail.sina.com.cn' },
    'sina.cn': { name: '新浪邮箱', inboxUrl: 'https://mail.sina.com.cn' },
    'sohu.com': { name: '搜狐邮箱', inboxUrl: 'https://mail.sohu.com' },
    'aliyun.com': { name: '阿里邮箱', inboxUrl: 'https://mail.aliyun.com' },
    'yahoo.com': { name: 'Yahoo Mail', inboxUrl: 'https://mail.yahoo.com' },
    'icloud.com': { name: 'iCloud', inboxUrl: 'https://www.icloud.com/mail' },
    'me.com': { name: 'iCloud', inboxUrl: 'https://www.icloud.com/mail' },
    'mac.com': { name: 'iCloud', inboxUrl: 'https://www.icloud.com/mail' },
    'protonmail.com': { name: 'ProtonMail', inboxUrl: 'https://mail.proton.me' },
    'proton.me': { name: 'ProtonMail', inboxUrl: 'https://mail.proton.me' },
    'zoho.com': { name: 'Zoho Mail', inboxUrl: 'https://mail.zoho.com' },
    'yandex.com': { name: 'Yandex Mail', inboxUrl: 'https://mail.yandex.com' },
};

/**
 * Get email provider info from email address
 * 根据邮箱地址获取邮箱提供商信息
 */
function getEmailProvider(email: string): { name: string; inboxUrl: string } | null {
    const domain = email.split('@')[1]?.toLowerCase();
    if (!domain) return null;
    return EMAIL_PROVIDERS[domain] || null;
}

/**
 * Email Login Form (Passwordless OTP Mode)
 * 邮箱登录表单（无密码验证码模式）
 * 
 * Uses verification code instead of password, similar to phone login.
 * 使用验证码代替密码，类似手机登录。
 */
export default function EmailLoginForm() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { setAuth } = useAuthStore();

    const [email, setEmail] = useState('');
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [sendingCode, setSendingCode] = useState(false);
    const [countdown, setCountdown] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [showCaptcha, setShowCaptcha] = useState(false);
    const [codeSent, setCodeSent] = useState(false);

    // MFA state
    const [mfaRequired, setMfaRequired] = useState(false);
    const [mfaToken, setMfaToken] = useState('');
    const [mfaUser, setMfaUser] = useState<User | null>(null);

    // Countdown timer
    useEffect(() => {
        if (countdown > 0) {
            const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [countdown]);

    // Validate email format
    const isValidEmail = (email: string) => {
        return email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    };

    const handleSendCodeClick = () => {
        if (!isValidEmail(email)) {
            setError(t('errors.invalidEmail'));
            return;
        }

        setError(null);
        // Show captcha before sending code
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

        try {
            const response = await fetch(`${API_BASE_URL}/api/v1/auth/email/send-code`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email,
                    type: 'login',
                    captcha_token: captchaToken,
                }),
            });

            const data = await response.json();

            if (!data.success) {
                setError(data.error?.message || t('errors.sendCodeFailed'));
                if (data.data?.retry_after) {
                    setCountdown(data.data.retry_after);
                }
                return;
            }

            setCountdown(data.data?.retry_after || 60);
            setCodeSent(true);
        } catch (err) {
            console.error('Send code error:', err);
            setError(t('errors.networkError'));
        } finally {
            setSendingCode(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validate email
        if (!isValidEmail(email)) {
            setError(t('errors.invalidEmail'));
            return;
        }
        // Validate code
        if (!code || !code.match(/^\d{6}$/)) {
            setError(t('errors.invalidCode'));
            return;
        }

        setError(null);
        setLoading(true);

        try {
            const response = await fetch(`${API_BASE_URL}/api/v1/auth/email/verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, code }),
            });

            const data = await response.json();

            if (!data.success) {
                setError(data.error?.message || t('errors.loginFailed'));
                return;
            }

            // Check if MFA is required
            if (data.data.mfa_required) {
                setMfaUser(data.data.user);
                setMfaToken(data.data.mfa_token);
                setMfaRequired(true);
                return;
            }

            // Store auth data
            setAuth(data.data.user, data.data.access_token, data.data.refresh_token);

            // Redirect
            navigate('/');
        } catch (err) {
            console.error('Login error:', err);
            setError(t('errors.networkError'));
        } finally {
            setLoading(false);
        }
    };

    const handleMFABack = () => {
        setMfaRequired(false);
        setMfaToken('');
        setMfaUser(null);
        setCode('');
    };

    // Show MFA verification step if required
    if (mfaRequired && mfaUser && mfaToken) {
        return (
            <MFAVerifyStep
                user={mfaUser}
                mfaToken={mfaToken}
                onBack={handleMFABack}
            />
        );
    }

    return (
        <>
            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Email Input */}
                <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t('login.emailPlaceholder')}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-canvas dark:bg-slate-800 text-ink dark:text-moonlight placeholder:text-stone focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-all"
                />

                {/* Code Input */}
                <div className="flex justify-between items-center">
                    <OtpInput
                        value={code}
                        onChange={setCode}
                        disabled={loading}
                    />
                    <button
                        type="button"
                        onClick={handleSendCodeClick}
                        disabled={sendingCode || countdown > 0}
                        className="ml-2 px-3 py-2 h-12 text-sm rounded-lg bg-sky-50 dark:bg-sky-900/20 text-sky-600 dark:text-sky-400 font-medium whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed hover:bg-sky-100 dark:hover:bg-sky-900/30 transition-colors"
                    >
                        {sendingCode ? (
                            <span className="inline-block w-4 h-4 border-2 border-sky-500 border-t-transparent rounded-full animate-spin"></span>
                        ) : countdown > 0 ? (
                            `${countdown}s`
                        ) : (
                            t('login.sendCode')
                        )}
                    </button>
                </div>

                {/* Email Provider Tip - Show after code is sent */}
                {codeSent && !error && (() => {
                    const provider = getEmailProvider(email);
                    if (provider) {
                        return (
                            <div className="p-3 rounded-xl bg-sky-50 dark:bg-sky-900/20 border border-sky-100 dark:border-sky-800">
                                <p className="text-sm text-slate-600 dark:text-slate-400">
                                    {t('login.codeSentTip')}
                                </p>
                                <a
                                    href={provider.inboxUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sky-600 dark:text-sky-400 text-sm font-medium hover:bg-sky-50 dark:hover:bg-sky-900/30 transition-colors"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                    </svg>
                                    {t('login.openInbox', { provider: provider.name })}
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                    </svg>
                                </a>
                            </div>
                        );
                    }
                    return null;
                })()}

                {/* Error Message */}
                {error && (
                    <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
                        {error}
                    </div>
                )}

                {/* Submit Button */}
                <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                    {loading && (
                        <span className="inline-block w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    )}
                    {t('login.signIn')}
                </button>
            </form>

            {/* Captcha Modal */}
            {showCaptcha && (
                <SliderCaptcha
                    onVerify={handleCaptchaVerify}
                    onClose={handleCaptchaClose}
                />
            )}
        </>
    );
}
