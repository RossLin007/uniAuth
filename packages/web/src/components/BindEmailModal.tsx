import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../utils/api';
import OtpInput from './OtpInput';
import SliderCaptcha from './SliderCaptcha';
import Modal from './ui/Modal';
import { useToast } from '../context/ToastContext';

interface BindEmailModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export default function BindEmailModal({ isOpen, onClose, onSuccess }: BindEmailModalProps) {
    const { t } = useTranslation();
    const { error: toastError, success: toastSuccess } = useToast();

    const [email, setEmail] = useState('');
    const [code, setCode] = useState('');
    const [step, setStep] = useState<'email' | 'captcha' | 'code'>('email');
    const [sending, setSending] = useState(false);
    const [binding, setBinding] = useState(false);
    const [countdown, setCountdown] = useState(0);

    const validateEmail = (email: string) => {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    };

    const handleSendCodeClick = () => {
        if (!validateEmail(email)) {
            toastError(t('errors.invalidEmail'));
            return;
        }
        setStep('captcha');
    };

    const handleCaptchaVerify = async (captchaToken: string) => {
        setStep('email');
        await sendCode(captchaToken);
    };

    const sendCode = async (captchaToken: string) => {
        setSending(true);
        try {
            await api.post('/auth/email/send-code', {
                email,
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
            await api.post('/user/bind/email', { email, code });
            toastSuccess(t('bindings.bindSuccess', 'Email bound successfully!'));
            onSuccess();
            handleClose();
        } catch (err) {
            toastError((err as Error).message || t('errors.loginFailed'));
        } finally {
            setBinding(false);
        }
    };

    const handleClose = () => {
        setEmail('');
        setCode('');
        setStep('email');
        onClose();
    };

    if (step === 'captcha') {
        return (
            <SliderCaptcha
                onVerify={handleCaptchaVerify}
                onClose={() => setStep('email')}
            />
        );
    }

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            title={t('bindings.bindEmail')}
        >
            {step === 'email' ? (
                <div className="space-y-6">
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                            {t('login.email')}
                        </label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder={t('login.emailPlaceholder')}
                            className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:border-sky-500 focus:bg-white dark:focus:bg-black outline-none transition-all dark:text-white"
                            autoFocus
                        />
                    </div>
                    <button
                        onClick={handleSendCodeClick}
                        disabled={sending || !email}
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
                            {t('emailVerify.subtitle')} <span className="font-medium text-slate-800 dark:text-slate-200">{email}</span>
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
                                onClick={() => setStep('email')}
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

