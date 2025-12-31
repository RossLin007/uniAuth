import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Mail, Phone, Chrome, ArrowRight, Smartphone, Command } from 'lucide-react';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { ThemeSelector } from '@/components/ThemeSelector';
import { useToast } from '@/contexts/ToastContext';

type AuthMethod = 'phone' | 'email';
type AuthStep = 'input' | 'code';

export default function Login() {
    const { t } = useTranslation();
    const { error: toastError } = useToast();
    const [method, setMethod] = useState<AuthMethod>('phone');
    const [step, setStep] = useState<AuthStep>('input');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);

    const {
        loginWithPhone,
        sendPhoneCode,
        loginWithEmail,
        sendEmailCode,
        loginWithSSO,
        loginWithGoogle
    } = useAuth();
    const navigate = useNavigate();

    const handleRequestCode = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const res = method === 'phone'
            ? await sendPhoneCode(phone)
            : await sendEmailCode(email);

        setLoading(false);
        if (res.success) {
            setStep('code');
        } else {
            toastError(res.error || t('common.error'));
        }
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const res = method === 'phone'
            ? await loginWithPhone(phone, code)
            : await loginWithEmail(email, code);

        setLoading(false);
        if (res.success) {
            navigate('/');
        } else {
            toastError(res.error || t('common.error'));
        }
    };

    return (
        <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-200 selection:bg-blue-500/30 transition-colors duration-500">
            {/* Ambient Background Effects */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-500/10 blur-[120px] animate-pulse-slow"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-500/10 blur-[120px] animate-pulse-slow delay-1000"></div>
            </div>

            {/* Language & Theme Switcher */}
            <div className="absolute top-6 right-6 z-20 flex items-center gap-2">
                <ThemeSelector className="bg-white/10 dark:bg-black/20 border-slate-200/20 dark:border-white/10" />
                <LanguageSwitcher />
            </div>

            {/* Main Card */}
            <div className="relative z-10 w-full max-w-md p-4 animate-in fade-in zoom-in-95 duration-500">
                <div className="backdrop-blur-xl bg-white/70 dark:bg-slate-900/60 border border-white/20 dark:border-white/5 rounded-3xl shadow-2xl p-8 sm:p-10 ring-1 ring-slate-900/5 dark:ring-white/10 transition-colors duration-300">

                    {/* Header */}
                    <div className="text-center mb-10 space-y-2">
                        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 shadow-lg shadow-blue-500/20 mb-4">
                            <Command className="w-6 h-6 text-white" />
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white font-display">
                            {t('auth.loginTitle', 'Developer Console')}
                        </h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            {t('auth.loginSubtitle', 'Sign in to manage your applications')}
                        </p>
                    </div>

                    {/* Method Tabs */}
                    {step === 'input' && (
                        <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 dark:bg-black/20 rounded-xl mb-8 border border-slate-200 dark:border-white/5 transition-colors">
                            <button
                                type="button"
                                onClick={() => setMethod('phone')}
                                className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${method === 'phone'
                                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm ring-1 ring-slate-900/5 dark:ring-white/10'
                                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5'
                                    }`}
                            >
                                <Smartphone className="w-4 h-4" />
                                {t('auth.phone')}
                            </button>
                            <button
                                type="button"
                                onClick={() => setMethod('email')}
                                className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${method === 'email'
                                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm ring-1 ring-slate-900/5 dark:ring-white/10'
                                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5'
                                    }`}
                            >
                                <Mail className="w-4 h-4" />
                                {t('auth.email')}
                            </button>
                        </div>
                    )}

                    {/* Form */}
                    {step === 'input' ? (
                        <form onSubmit={handleRequestCode} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 ml-1 uppercase tracking-wider">
                                    {method === 'phone' ? t('auth.phoneNumber') : t('auth.emailAddress')}
                                </label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400 dark:text-slate-500 group-focus-within:text-blue-500 dark:group-focus-within:text-blue-400 transition-colors">
                                        {method === 'phone' ? <Phone className="w-5 h-5" /> : <Mail className="w-5 h-5" />}
                                    </div>
                                    <input
                                        type={method === 'phone' ? 'tel' : 'email'}
                                        required
                                        value={method === 'phone' ? phone : email}
                                        onChange={e => method === 'phone' ? setPhone(e.target.value) : setEmail(e.target.value)}
                                        placeholder={method === 'phone' ? '+86 138 0000 0000' : 'developer@example.com'}
                                        className="w-full bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl py-3 pl-10 pr-4 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50 focus:bg-white dark:focus:bg-black/30 focus:ring-1 focus:ring-blue-500/50 transition-all shadow-sm dark:shadow-none"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full relative group overflow-hidden rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 p-[1px] focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-2 focus:ring-offset-slate-50 dark:focus:ring-offset-slate-900 disabled:opacity-50"
                            >
                                <div className="relative flex items-center justify-center gap-2 px-6 py-3 bg-white/0 rounded-xl text-white font-semibold tracking-wide transition-all group-hover:bg-white/10">
                                    {loading ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            {t('auth.sendCode')}
                                            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                        </>
                                    )}
                                </div>
                            </button>
                        </form>
                    ) : (
                        <form onSubmit={handleLogin} className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 ml-1 uppercase tracking-wider">
                                    {t('auth.verificationCode')}
                                </label>
                                <input
                                    type="text"
                                    required
                                    maxLength={6}
                                    value={code}
                                    onChange={e => setCode(e.target.value)}
                                    placeholder="000000"
                                    className="w-full bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl py-4 text-center text-3xl tracking-[0.5em] font-mono text-slate-900 dark:text-white placeholder:text-slate-300 dark:placeholder:text-slate-700/50 focus:outline-none focus:border-blue-500/50 focus:bg-white dark:focus:bg-black/30 focus:ring-1 focus:ring-blue-500/50 transition-all mb-2 shadow-sm dark:shadow-none"
                                    autoFocus
                                />
                                <p className="text-xs text-center text-slate-500">
                                    {t('auth.codeSentTo', { target: method === 'phone' ? phone : email })}
                                </p>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3 text-white font-semibold shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 hover:from-blue-500 hover:to-indigo-500 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {loading && <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                                {t('auth.verifyAndLogin')}
                            </button>

                            <button
                                type="button"
                                onClick={() => { setStep('input'); setCode(''); }}
                                className="w-full py-2 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                            >
                                {t('common.back', 'Back to previous step')}
                            </button>
                        </form>
                    )}

                    {/* Footer / Social */}
                    {step === 'input' && (
                        <div className="mt-8 space-y-6">
                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-slate-200 dark:border-white/5"></div>
                                </div>
                                <div className="relative flex justify-center text-xs uppercase">
                                    <span className="bg-slate-50 dark:bg-slate-900/60 px-3 text-slate-500 backdrop-blur-xl rounded-full">
                                        {t('auth.continueWith')}
                                    </span>
                                </div>
                            </div>

                            <div className="space-y-3">
                                {/* SSO Quick Login - for users already logged in at SSO portal */}
                                <button
                                    type="button"
                                    onClick={() => loginWithSSO().catch((err: Error) => console.error('SSO login error:', err))}
                                    className="w-full flex items-center justify-center gap-3 px-6 py-3 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 hover:from-blue-100 hover:to-indigo-100 dark:hover:from-blue-900/30 dark:hover:to-indigo-900/30 border border-blue-200/50 dark:border-blue-500/20 hover:border-blue-300 dark:hover:border-blue-500/30 text-blue-700 dark:text-blue-300 font-medium transition-all group shadow-sm dark:shadow-none"
                                >
                                    <Command className="w-5 h-5 text-blue-500 dark:text-blue-400" />
                                    <span>{t('auth.continueWithSSO', 'UniAuth SSO')}</span>
                                </button>

                                {/* Google OAuth */}
                                <button
                                    type="button"
                                    onClick={loginWithGoogle}
                                    className="w-full flex items-center justify-center gap-3 px-6 py-3 rounded-xl bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 text-slate-700 dark:text-white font-medium transition-all group shadow-sm dark:shadow-none"
                                >
                                    <Chrome className="w-5 h-5 text-slate-500 dark:text-slate-400 group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors" />
                                    <span>{t('auth.continueWithGoogle')}</span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                <p className="text-center text-xs text-slate-500 dark:text-slate-600 mt-8">
                    &copy; {new Date().getFullYear()} UniAuth Developer Console
                </p>
            </div>
        </div>
    );
}
