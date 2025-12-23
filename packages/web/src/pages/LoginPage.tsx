import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import PhoneLoginForm from '../components/PhoneLoginForm';
import EmailLoginForm from '../components/EmailLoginForm';
import OAuthButtons from '../components/OAuthButtons';
import LanguageSwitch from '../components/LanguageSwitch';

type AuthTab = 'phone' | 'email';

export default function LoginPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { isAuthenticated } = useAuthStore();
    const [activeTab, setActiveTab] = useState<AuthTab>('phone');

    // Track initial auth state - only redirect if user was authenticated on page load
    const wasAuthenticatedOnMount = useRef(isAuthenticated);

    // Only redirect if user was already authenticated when page first loaded
    useEffect(() => {
        if (wasAuthenticatedOnMount.current) {
            navigate('/');
        }
    }, [navigate]);

    // If user was authenticated on mount, don't render
    if (wasAuthenticatedOnMount.current) {
        return null;
    }


    return (
        <div className="min-h-screen gradient-bg flex items-center justify-center p-4">
            {/* Language Switch */}
            <div className="fixed top-4 right-4">
                <LanguageSwitch />
            </div>

            {/* Login Card */}
            <div className="w-full max-w-md animate-fade-in">
                {/* Logo & Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-sky-500 text-white text-2xl font-bold mb-4 shadow-medium">
                        U
                    </div>
                    <h1 className="text-2xl font-semibold text-ink dark:text-moonlight">
                        {t('login.title')}
                    </h1>
                    <p className="text-stone dark:text-stone mt-1">{t('login.subtitle')}</p>
                </div>

                {/* Card Container */}
                <div className="bg-canvas dark:bg-ocean rounded-2xl shadow-medium p-6 md:p-8">
                    {/* Tabs */}
                    <div className="flex bg-mist dark:bg-slate-800 rounded-xl p-1 mb-6">
                        <button
                            onClick={() => setActiveTab('phone')}
                            className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${activeTab === 'phone'
                                ? 'bg-canvas dark:bg-slate-700 text-ink dark:text-moonlight shadow-soft'
                                : 'text-stone hover:text-ink dark:hover:text-moonlight'
                                }`}
                        >
                            {t('tabs.phone')}
                        </button>
                        <button
                            onClick={() => setActiveTab('email')}
                            className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${activeTab === 'email'
                                ? 'bg-canvas dark:bg-slate-700 text-ink dark:text-moonlight shadow-soft'
                                : 'text-stone hover:text-ink dark:hover:text-moonlight'
                                }`}
                        >
                            {t('tabs.email')}
                        </button>
                    </div>

                    {/* Form */}
                    {activeTab === 'phone' ? (
                        <PhoneLoginForm />
                    ) : (
                        <EmailLoginForm />
                    )}

                    {/* Divider */}
                    <div className="relative my-6">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-slate-200 dark:border-slate-700"></div>
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-canvas dark:bg-ocean px-2 text-stone">
                                {t('login.or')}
                            </span>
                        </div>
                    </div>

                    {/* OAuth Buttons */}
                    <OAuthButtons />

                    {/* Terms */}
                    <p className="text-xs text-stone text-center mt-6">
                        {t('login.terms')}{' '}
                        <a href="/terms" className="text-sky-500 hover:underline">
                            {t('login.termsLink')}
                        </a>{' '}
                        {t('login.and')}{' '}
                        <a href="/privacy" className="text-sky-500 hover:underline">
                            {t('login.privacyLink')}
                        </a>
                    </p>
                </div>

                {/* Tagline */}
                <p className="text-center text-sm text-stone mt-6">{t('tagline')}</p>
            </div>
        </div>
    );
}
