import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../utils/api';
import OtpInput from './OtpInput';
import CountryCodeSelector, { defaultCountry } from './CountryCodeSelector';
import SliderCaptcha from './SliderCaptcha';
import type { Country } from '../data/countries';
import Modal from './ui/Modal';
import { useToast } from '../context/ToastContext';

interface BindPhoneModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export default function BindPhoneModal({ isOpen, onClose, onSuccess }: BindPhoneModalProps) {
    const { t } = useTranslation();
    const { error: toastError, success: toastSuccess } = useToast();

    const [selectedCountry, setSelectedCountry] = useState<Country>(defaultCountry);
    const [phone, setPhone] = useState('');
    const [code, setCode] = useState('');
    const [step, setStep] = useState<'phone' | 'captcha' | 'code'>('phone');
    const [sending, setSending] = useState(false);
    const [binding, setBinding] = useState(false);
    const [countdown, setCountdown] = useState(0);

    const fullPhone = `${selectedCountry.dialCode}${phone}`;

    const handleSendCodeClick = () => {
        if (!phone || phone.length < 5) {
            toastError(t('errors.invalidPhone'));
            return;
        }
        setStep('captcha');
    };

    const handleCaptchaVerify = async (captchaToken: string) => {
        setStep('phone');
        await sendCode(captchaToken);
    };

    const sendCode = async (captchaToken: string) => {
        setSending(true);
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
            toastSuccess(t('common.codeSent', 'Code sent!'));
        } catch (err) {
            toastError((err as Error).message || t('errors.sendCodeFailed'));
        } finally {
            setSending(false);
        }
    };

    const handleBind = async () => {
        if (code.length !== 6) {
            toastError(t('errors.invalidCode'));
            return;
        }

        setBinding(true);
        try {
            await api.post('/user/bind/phone', { phone: fullPhone, code });
            toastSuccess(t('bindings.bindSuccess', 'Phone bound successfully!'));
            onSuccess();
            handleClose();
        } catch (err) {
            toastError((err as Error).message || t('errors.loginFailed'));
        } finally {
            setBinding(false);
        }
    };

    const handleClose = () => {
        setPhone('');
        setCode('');
        setStep('phone');
        onClose();
    };

    // Show captcha (Modal handles its own overlay, so we might need to handle this carefully. 
    // SliderCaptcha usually has its own modal. Let's keep it separate or integrate it.)
    if (step === 'captcha') {
        return (
            <SliderCaptcha
                onVerify={handleCaptchaVerify}
                onClose={() => setStep('phone')}
            />
        );
    }

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            title={t('bindings.bindPhone')}
        >
            {step === 'phone' ? (
                <div className="space-y-6">
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
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
                                className="flex-1 px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:border-sky-500 focus:bg-white dark:focus:bg-black outline-none transition-all dark:text-white"
                                autoFocus
                            />
                        </div>
                    </div>
                    <button
                        onClick={handleSendCodeClick}
                        disabled={sending || !phone}
                        className="w-full py-3.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 text-white font-semibold shadow-lg shadow-sky-500/30 hover:shadow-sky-500/40 active:scale-[0.98] transition-all disabled:opacity-50 disabled:shadow-none"
                    >
                        {sending ? t('common.loading') : t('login.sendCode')}
                    </button>
                </div>
            ) : (
                <div className="space-y-6">
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                            {t('login.code')}
                        </label>
                        <p className="text-xs text-slate-500 mb-4">
                            {t('emailVerify.subtitle')} <span className="font-medium text-slate-800 dark:text-slate-200">{fullPhone}</span>
                        </p>
                        <OtpInput
                            value={code}
                            onChange={setCode}
                            length={6}
                        />
                    </div>

                    <div className="flex flex-col gap-4">
                        <button
                            onClick={handleBind}
                            disabled={binding || code.length !== 6}
                            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 text-white font-semibold shadow-lg shadow-sky-500/30 hover:shadow-sky-500/40 active:scale-[0.98] transition-all disabled:opacity-50 disabled:shadow-none"
                        >
                            {binding ? t('common.loading') : t('common.confirm')}
                        </button>

                        <div className="flex justify-between items-center text-sm">
                            <button
                                onClick={() => setStep('phone')}
                                className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 font-medium"
                            >
                                {t('common.back')}
                            </button>

                            {countdown > 0 ? (
                                <span className="text-slate-400">
                                    {t('login.resendCode', { seconds: countdown })}
                                </span>
                            ) : (
                                <button
                                    onClick={handleSendCodeClick}
                                    className="text-sky-500 hover:text-sky-600 font-medium"
                                >
                                    {t('emailVerify.resend')}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </Modal>
    );
}

