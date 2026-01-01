import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { authClient } from '../utils/auth';
import { useOAuthRedirect } from '../hooks/useOAuthRedirect';
import { useToast } from '../context/ToastContext';

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
    const { isOAuthFlow, getPostLoginRedirect } = useOAuthRedirect();
    const { success: toastSuccess } = useToast();

    const [email, setEmail] = useState(() => {
        // Load saved email from localStorage
        return localStorage.getItem('uniauth_last_email') || '';
    });
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [sendingCode, setSendingCode] = useState(false);
    const [countdown, setCountdown] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [codeSent, setCodeSent] = useState(false);

    // MFA state
    const [mfaRequired, setMfaRequired] = useState(false);
    const [mfaToken, setMfaToken] = useState('');
    const [mfaUser, setMfaUser] = useState<User | null>(null);

    // Save email to localStorage when it changes
    useEffect(() => {
        if (email) {
            localStorage.setItem('uniauth_last_email', email);
        }
    }, [email]);

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

    const handleSendCodeClick = async () => {
        if (!isValidEmail(email)) {
            setError(t('errors.invalidEmail'));
            return;
        }

        setError(null);
        await sendCode();
    };

    const sendCode = async () => {
        setSendingCode(true);

        try {
            const data = await authClient.sendEmailCode(email, 'login');

            // Handle success (authClient throws on error)
            setCountdown(data.retry_after || 60);
            setCodeSent(true);
            toastSuccess(t('common.codeSent', 'Verification code sent!'));
        } catch (err: any) {
            console.error('Send code error:', err);
            setError(err.message || t('errors.networkError'));
            if (err.code === 'RATELIMIT' && err.retry_after) {
                setCountdown(err.retry_after);
            }
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
            const data = await authClient.loginWithEmailCode(email, code);

            // Check if MFA is required
            if (data.mfa_required) {
                setMfaUser(data.user);
                setMfaToken(data.mfa_token || '');
                setMfaRequired(true);
                return;
            }

            // Success! Store is updated via listener, just redirect
            // Redirect - check if this is an OAuth flow
            const redirectUrl = getPostLoginRedirect();
            if (isOAuthFlow()) {
                // OAuth flow: redirect to authorize endpoint to complete flow
                window.location.href = redirectUrl;
            } else {
                // Normal login: navigate to home
                navigate('/');
            }
        } catch (err: any) {
            console.error('Login error:', err);
            setError(err.message || t('errors.loginFailed'));
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
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <div className="flex-1 min-w-0">
                        <OtpInput
                            value={code}
                            onChange={setCode}
                            disabled={loading}
                        />
                    </div>
                    <button
                        type="button"
                        onClick={handleSendCodeClick}
                        disabled={sendingCode || countdown > 0}
                        className="shrink-0 w-full sm:w-auto px-4 py-2.5 text-sm rounded-lg bg-sky-50 dark:bg-sky-900/20 text-sky-600 dark:text-sky-400 font-medium whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed hover:bg-sky-100 dark:hover:bg-sky-900/30 border border-sky-200 dark:border-sky-700 transition-colors"
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
        </>
    );
}
