import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Label } from '@/components/ui/Label';
import { useNavigate } from 'react-router-dom';
import { Mail, Phone, Chrome } from 'lucide-react';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';

type AuthMethod = 'phone' | 'email';
type AuthStep = 'input' | 'code';

export default function Login() {
    const { t } = useTranslation();
    const [method, setMethod] = useState<AuthMethod>('phone');
    const [step, setStep] = useState<AuthStep>('input');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [code, setCode] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const {
        loginWithPhone,
        sendPhoneCode,
        loginWithEmail,
        sendEmailCode,
        loginWithGoogle
    } = useAuth();
    const navigate = useNavigate();

    const handleSendCode = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        const res = method === 'phone'
            ? await sendPhoneCode(phone)
            : await sendEmailCode(email);

        setLoading(false);
        if (res.success) {
            setStep('code');
        } else {
            setError(res.error || t('common.error'));
        }
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        const res = method === 'phone'
            ? await loginWithPhone(phone, code)
            : await loginWithEmail(email, code);

        setLoading(false);
        if (res.success) {
            navigate('/');
        } else {
            setError(res.error || t('common.error'));
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-slate-900 p-4 sm:p-6 lg:p-8">
            {/* Language Switcher - Top Right */}
            <div className="absolute top-4 right-4 z-10">
                <LanguageSwitcher />
            </div>

            <Card className="w-full max-w-md shadow-xl border-slate-700/50 bg-slate-800/90 sm:bg-slate-800">
                <CardHeader className="text-center">
                    <CardTitle className="text-2xl font-bold">{t('auth.loginTitle')}</CardTitle>
                    <CardDescription>{t('auth.loginSubtitle')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Error Message */}
                    {error && (
                        <div className="p-3 rounded-lg bg-red-500/20 border border-red-500/50 text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    {/* Auth Method Tabs */}
                    {step === 'input' && (
                        <div className="flex gap-2 p-1 bg-slate-700/50 rounded-lg">
                            <button
                                type="button"
                                onClick={() => setMethod('phone')}
                                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-all ${method === 'phone'
                                    ? 'bg-blue-600 text-white shadow-md'
                                    : 'text-slate-400 hover:text-white'
                                    }`}
                            >
                                <Phone className="h-4 w-4" /> {t('auth.phone')}
                            </button>
                            <button
                                type="button"
                                onClick={() => setMethod('email')}
                                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-all ${method === 'email'
                                    ? 'bg-blue-600 text-white shadow-md'
                                    : 'text-slate-400 hover:text-white'
                                    }`}
                            >
                                <Mail className="h-4 w-4" /> {t('auth.email')}
                            </button>
                        </div>
                    )}

                    {/* Input Form */}
                    {step === 'input' ? (
                        <form onSubmit={handleSendCode} className="space-y-4">
                            {method === 'phone' ? (
                                <div className="space-y-2">
                                    <Label htmlFor="phone" className="text-slate-300">{t('auth.phoneNumber')}</Label>
                                    <Input
                                        id="phone"
                                        placeholder="+8613800138000"
                                        value={phone}
                                        onChange={e => setPhone(e.target.value)}
                                        required
                                        className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500"
                                    />
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <Label htmlFor="email" className="text-slate-300">{t('auth.emailAddress')}</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="developer@example.com"
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                        required
                                        className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500"
                                    />
                                </div>
                            )}
                            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" isLoading={loading}>
                                {t('auth.sendCode')}
                            </Button>
                        </form>
                    ) : (
                        <form onSubmit={handleLogin} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="code" className="text-slate-300">{t('auth.verificationCode')}</Label>
                                <Input
                                    id="code"
                                    placeholder="123456"
                                    value={code}
                                    onChange={e => setCode(e.target.value)}
                                    required
                                    maxLength={6}
                                    className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 text-center text-2xl tracking-widest"
                                />
                                <p className="text-xs text-slate-500">
                                    {t('auth.codeSentTo', { target: method === 'phone' ? phone : email })}
                                </p>
                            </div>
                            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" isLoading={loading}>
                                {t('auth.verifyAndLogin')}
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                className="w-full text-slate-400 hover:text-white"
                                onClick={() => { setStep('input'); setCode(''); }}
                            >
                                ← {t('common.back')}
                            </Button>
                        </form>
                    )}

                    {/* Divider */}
                    {step === 'input' && (
                        <>
                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-slate-600"></div>
                                </div>
                                <div className="relative flex justify-center text-xs uppercase">
                                    <span className="bg-slate-800 px-2 text-slate-500">{t('auth.continueWith')}</span>
                                </div>
                            </div>

                            {/* Social Login */}
                            <Button
                                type="button"
                                variant="outline"
                                className="w-full border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white"
                                onClick={loginWithGoogle}
                            >
                                <Chrome className="mr-2 h-4 w-4" />
                                {t('auth.continueWithGoogle')}
                            </Button>
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
