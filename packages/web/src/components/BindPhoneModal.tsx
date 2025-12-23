import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../utils/api';
import OtpInput from './OtpInput';
import CountryCodeSelector, { defaultCountry } from './CountryCodeSelector';
import SliderCaptcha from './SliderCaptcha';
import type { Country } from '../data/countries';

interface BindPhoneModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export default function BindPhoneModal({ isOpen, onClose, onSuccess }: BindPhoneModalProps) {
    const { t } = useTranslation();
    const [selectedCountry, setSelectedCountry] = useState<Country>(defaultCountry);
    const [phone, setPhone] = useState('');
    const [code, setCode] = useState('');
    const [step, setStep] = useState<'phone' | 'captcha' | 'code'>('phone');
    const [sending, setSending] = useState(false);
    const [binding, setBinding] = useState(false);
    const [countdown, setCountdown] = useState(0);
    const [error, setError] = useState('');

    const fullPhone = `${selectedCountry.dialCode}${phone}`;

    const handleSendCodeClick = () => {
        if (!phone || phone.length < 5) {
            setError(t('errors.invalidPhone'));
            return;
        }
        setError('');
        setStep('captcha');
    };

    const handleCaptchaVerify = async (captchaToken: string) => {
        setStep('phone');
        await sendCode(captchaToken);
    };

    const sendCode = async (captchaToken: string) => {
        setSending(true);
        setError('');
        try {
            await api.post('/auth/phone/send-code', {
                phone: fullPhone,
                captcha_token: captchaToken,
            });
            setStep('code');
            setCountdown(60);
            const timer = setInterval(() => {
                setCountdown((prev) => {
                    if (prev <= 1) {
                        clearInterval(timer);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        } catch (err) {
            setError((err as Error).message || t('errors.sendCodeFailed'));
        } finally {
            setSending(false);
        }
    };

    const handleBind = async () => {
        if (code.length !== 6) {
            setError(t('errors.invalidCode'));
            return;
        }

        setBinding(true);
        setError('');
        try {
            await api.post('/user/bind/phone', { phone: fullPhone, code });
            onSuccess();
            handleClose();
        } catch (err) {
            setError((err as Error).message || t('errors.loginFailed'));
        } finally {
            setBinding(false);
        }
    };

    const handleClose = () => {
        setPhone('');
        setCode('');
        setStep('phone');
        setError('');
        onClose();
    };

    if (!isOpen) return null;

    // Show captcha
    if (step === 'captcha') {
        return (
            <SliderCaptcha
                onVerify={handleCaptchaVerify}
                onClose={() => setStep('phone')}
            />
        );
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-ink dark:text-moonlight">
                        {t('bindings.bindPhone')}
                    </h3>
                    <button
                        onClick={handleClose}
                        className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    >
                        <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {error && (
                    <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
                        {error}
                    </div>
                )}

                {step === 'phone' ? (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-stone dark:text-slate-400 mb-2">
                                {t('login.phone')}
                            </label>
                            <div className="flex gap-2">
                                <CountryCodeSelector
                                    selectedCountry={selectedCountry}
                                    onSelect={setSelectedCountry}
                                />
                                <input
                                    type="tel"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                                    placeholder={t('login.phoneNumberPlaceholder')}
                                    className="flex-1 px-4 py-3 rounded-xl bg-mist dark:bg-slate-900 border border-transparent focus:border-sky-500 focus:bg-white dark:focus:bg-black outline-none transition-all dark:text-white"
                                />
                            </div>
                        </div>
                        <button
                            onClick={handleSendCodeClick}
                            disabled={sending || !phone}
                            className="w-full py-3 rounded-xl bg-gradient-to-r from-sky-400 to-blue-600 text-white font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                        >
                            {sending ? t('common.loading') : t('login.sendCode')}
                        </button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-stone dark:text-slate-400 mb-2">
                                {t('login.code')}
                            </label>
                            <p className="text-xs text-slate-400 mb-3">
                                {t('emailVerify.subtitle')} <span className="font-medium text-slate-600 dark:text-slate-300">{fullPhone}</span>
                            </p>
                            <OtpInput
                                value={code}
                                onChange={setCode}
                                length={6}
                            />
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setStep('phone')}
                                className="flex-1 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                            >
                                {t('common.back')}
                            </button>
                            <button
                                onClick={handleBind}
                                disabled={binding || code.length !== 6}
                                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-sky-400 to-blue-600 text-white font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                            >
                                {binding ? t('common.loading') : t('common.confirm')}
                            </button>
                        </div>
                        {countdown > 0 ? (
                            <p className="text-center text-sm text-slate-400">
                                {t('login.resendCode', { seconds: countdown })}
                            </p>
                        ) : (
                            <button
                                onClick={handleSendCodeClick}
                                className="w-full text-center text-sm text-sky-500 hover:text-sky-600"
                            >
                                {t('emailVerify.resend')}
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

