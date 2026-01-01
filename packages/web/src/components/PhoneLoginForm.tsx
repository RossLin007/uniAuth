import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { authClient } from '../utils/auth';
import { useOAuthRedirect } from '../hooks/useOAuthRedirect';
import { useToast } from '../context/ToastContext';

import CountryCodeSelector from './CountryCodeSelector';
import OtpInput from './OtpInput';
import MFAVerifyStep from './MFAVerifyStep';
import { defaultCountry, type Country } from '../data/countries';

interface User {
    id: string;
    phone: string | null;
    email: string | null;
    nickname: string | null;
    avatar_url: string | null;
}

export default function PhoneLoginForm() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { setAuth } = useAuthStore();
    const { isOAuthFlow, getPostLoginRedirect } = useOAuthRedirect();
    const { success: toastSuccess } = useToast();

    const [selectedCountry, setSelectedCountry] = useState<Country>(() => {
        // Load saved country from localStorage
        const saved = localStorage.getItem('uniauth_last_country');
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch { /* ignore */ }
        }
        return defaultCountry;
    });
    const [phoneNumber, setPhoneNumber] = useState(() => {
        // Load saved phone from localStorage
        return localStorage.getItem('uniauth_last_phone') || '';
    });
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [sendingCode, setSendingCode] = useState(false);
    const [countdown, setCountdown] = useState(0);
    const [error, setError] = useState<string | null>(null);

    // MFA state
    const [mfaRequired, setMfaRequired] = useState(false);
    const [mfaToken, setMfaToken] = useState('');
    const [mfaUser, setMfaUser] = useState<User | null>(null);

    // Full phone number with country code
    const fullPhone = phoneNumber ? `${selectedCountry.dialCode}${phoneNumber.replace(/^0+/, '')}` : '';

    // Save phone and country to localStorage when they change
    useEffect(() => {
        if (phoneNumber) {
            localStorage.setItem('uniauth_last_phone', phoneNumber);
        }
        localStorage.setItem('uniauth_last_country', JSON.stringify(selectedCountry));
    }, [phoneNumber, selectedCountry]);

    // Countdown timer
    useEffect(() => {
        if (countdown > 0) {
            const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [countdown]);

    // Format phone number input (remove non-digits, limit length)
    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.replace(/\D/g, '').slice(0, 15);
        setPhoneNumber(value);
    };

    const handleSendCodeClick = async () => {
        // Validate phone number (at least 6 digits)
        if (!phoneNumber || phoneNumber.length < 6) {
            setError(t('errors.invalidPhone'));
            return;
        }

        // Validate full phone number format
        if (!fullPhone.match(/^\+[1-9]\d{6,14}$/)) {
            setError(t('errors.invalidPhone'));
            return;
        }

        setError(null);
        await sendCode();
    };

    const sendCode = async () => {
        setSendingCode(true);

        try {
            const data = await authClient.sendCode(fullPhone, 'login');

            // Handle success
            setCountdown(data.retry_after || 60);
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

        // Validate phone
        if (!phoneNumber || phoneNumber.length < 6) {
            setError(t('errors.invalidPhone'));
            return;
        }
        if (!code || !code.match(/^\d{6}$/)) {
            setError(t('errors.invalidCode'));
            return;
        }

        setError(null);
        setLoading(true);

        try {
            const data = await authClient.loginWithCode(fullPhone, code);

            // Check if MFA is required
            if (data.mfa_required) {
                setMfaUser(data.user);
                setMfaToken(data.mfa_token || '');
                setMfaRequired(true);
                return;
            }

            // Success, redirect
            const redirectUrl = getPostLoginRedirect();
            if (isOAuthFlow()) {
                window.location.href = redirectUrl;
            } else {
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
                {/* Phone Input with Country Selector */}
                <div className="flex gap-2">
                    <CountryCodeSelector
                        selectedCountry={selectedCountry}
                        onSelect={setSelectedCountry}
                    />
                    <input
                        type="tel"
                        value={phoneNumber}
                        onChange={handlePhoneChange}
                        placeholder={t('login.phoneNumberPlaceholder', '请输入手机号')}
                        className="flex-1 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-canvas dark:bg-slate-800 text-ink dark:text-moonlight placeholder:text-stone focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-all"
                    />
                </div>

                {/* OTP Input with Send Code Button */}
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
                        disabled={sendingCode || countdown > 0 || !phoneNumber}
                        className="shrink-0 w-full sm:w-auto px-4 py-2.5 text-sm rounded-lg bg-sky-50 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400 font-medium whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed hover:bg-sky-100 dark:hover:bg-sky-900/50 border border-sky-200 dark:border-sky-700 transition-all"
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

