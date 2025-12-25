import { useState, useEffect, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import PhoneLoginForm from '../components/PhoneLoginForm';
import EmailLoginForm from '../components/EmailLoginForm';
import OAuthButtons from '../components/OAuthButtons';
import LanguageSwitch from '../components/LanguageSwitch';
import { useBranding } from '../utils/branding';

type AuthTab = 'phone' | 'email';

export default function LoginPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { isAuthenticated } = useAuthStore();
    const [activeTab, setActiveTab] = useState<AuthTab>('phone');

    // Get client_id from URL for branding
    const clientId = searchParams.get('client_id');
    const { branding, loading: brandingLoading } = useBranding(clientId);

    // Track initial auth state - only redirect if user was authenticated on page load
    const wasAuthenticatedOnMount = useRef(isAuthenticated);

    // Only redirect if user was already authenticated when page first loaded
    useEffect(() => {
        if (wasAuthenticatedOnMount.current) {
            navigate('/');
        }
    }, [navigate]);

    // Dynamic styles from branding
    const dynamicStyles = useMemo(() => ({
        background: branding.background_image_url
            ? `url(${branding.background_image_url}) center/cover no-repeat`
            : undefined,
        backgroundColor: branding.background_color,
        color: branding.text_color,
        fontFamily: branding.font_family,
    }), [branding]);

    const cardStyles = useMemo(() => ({
        backgroundColor: branding.card_color,
    }), [branding]);

    const primaryButtonStyles = useMemo(() => ({
        backgroundColor: branding.primary_color,
        color: '#ffffff',
    }), [branding]);

    // If user was authenticated on mount, don't render
    if (wasAuthenticatedOnMount.current) {
        return null;
    }

    return (
        <div
            className="min-h-screen flex items-center justify-center p-4 transition-colors"
            style={dynamicStyles}
        >
            {/* Language Switch */}
            <div className="fixed top-4 right-4">
                <LanguageSwitch />
            </div>

            {/* Login Card */}
            <div className="w-full max-w-md animate-fade-in">
                {/* Logo & Header */}
                <div className="text-center mb-8">
                    {branding.logo_url ? (
                        <img
                            src={branding.logo_url}
                            alt="Logo"
                            className="h-16 mx-auto mb-4"
                        />
                    ) : (
                        <div
                            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl text-white text-2xl font-bold mb-4 shadow-medium"
                            style={{ backgroundColor: branding.primary_color }}
                        >
                            U
                        </div>
                    )}
                    <h1 className="text-2xl font-semibold" style={{ color: branding.text_color }}>
                        {branding.login_title || t('login.title')}
                    </h1>
                    <p className="mt-1 opacity-70" style={{ color: branding.text_color }}>
                        {branding.login_subtitle || t('login.subtitle')}
                    </p>
                </div>

                {/* Card Container */}
                <div
                    className="rounded-2xl shadow-medium p-6 md:p-8"
                    style={cardStyles}
                >
                    {/* Tabs */}
                    <div className="flex bg-slate-100 dark:bg-slate-800 rounded-xl p-1 mb-6">
                        <button
                            onClick={() => setActiveTab('phone')}
                            className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${activeTab === 'phone'
                                ? 'bg-white dark:bg-slate-700 shadow-soft'
                                : 'hover:bg-slate-200 dark:hover:bg-slate-700'
                                }`}
                            style={activeTab === 'phone' ? { color: branding.primary_color } : undefined}
                        >
                            {t('tabs.phone')}
                        </button>
                        <button
                            onClick={() => setActiveTab('email')}
                            className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${activeTab === 'email'
                                ? 'bg-white dark:bg-slate-700 shadow-soft'
                                : 'hover:bg-slate-200 dark:hover:bg-slate-700'
                                }`}
                            style={activeTab === 'email' ? { color: branding.primary_color } : undefined}
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

                    {/* Social Login */}
                    {branding.show_social_login && (
                        <>
                            {/* Divider */}
                            <div className="relative my-6">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-slate-200 dark:border-slate-700"></div>
                                </div>
                                <div className="relative flex justify-center text-xs uppercase">
                                    <span className="bg-white dark:bg-slate-800 px-2 text-slate-500">
                                        {t('login.or')}
                                    </span>
                                </div>
                            </div>

                            {/* OAuth Buttons */}
                            <OAuthButtons />
                        </>
                    )}

                    {/* Terms */}
                    <p className="text-xs text-slate-500 text-center mt-6">
                        {t('login.terms')}{' '}
                        <a href="/terms" className="hover:underline" style={{ color: branding.primary_color }}>
                            {t('login.termsLink')}
                        </a>{' '}
                        {t('login.and')}{' '}
                        <a href="/privacy" className="hover:underline" style={{ color: branding.primary_color }}>
                            {t('login.privacyLink')}
                        </a>
                    </p>
                </div>

                {/* Footer */}
                <div className="text-center mt-6">
                    {branding.footer_text ? (
                        <p className="text-sm opacity-70" style={{ color: branding.text_color }}>
                            {branding.footer_text}
                        </p>
                    ) : (
                        <p className="text-sm opacity-70" style={{ color: branding.text_color }}>
                            {t('tagline')}
                        </p>
                    )}
                    {branding.show_powered_by && (
                        <p className="text-xs opacity-50 mt-1" style={{ color: branding.text_color }}>
                            Powered by UniAuth
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
