import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';
import SessionList from '../components/SessionList';
import ProfileEditor from '../components/ProfileEditor';
import LanguageSwitch from '../components/LanguageSwitch';
import AccountBindings from '../components/AccountBindings';
import BindPhoneModal from '../components/BindPhoneModal';
import BindEmailModal from '../components/BindEmailModal';
import AuthorizedApps from '../components/AuthorizedApps';
import SecurityStatus from '../components/SecurityStatus';
import LoginHistory from '../components/LoginHistory';
import DeleteAccountModal from '../components/DeleteAccountModal';
import MFASetupModal, { MFAStatusCard } from '../components/MFASetupModal';

export default function HomePage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { user, clearAuth, refreshUser } = useAuthStore();
    const [idCopied, setIdCopied] = useState(false);
    const [showBindPhone, setShowBindPhone] = useState(false);
    const [showBindEmail, setShowBindEmail] = useState(false);
    const [showDeleteAccount, setShowDeleteAccount] = useState(false);
    const [showMFASetup, setShowMFASetup] = useState(false);
    const [mfaKey, setMfaKey] = useState(0);
    const [bindingsKey, setBindingsKey] = useState(0);

    const handleLogout = () => {
        clearAuth();
        navigate('/login');
    };

    const copyUserId = async () => {
        if (user?.id) {
            await navigator.clipboard.writeText(user.id);
            setIdCopied(true);
            setTimeout(() => setIdCopied(false), 2000);
        }
    };

    if (!user) {
        navigate('/login');
        return null;
    }

    return (
        <div className="min-h-screen bg-mist dark:bg-slate-900 p-4 sm:p-8 transition-colors duration-300">
            <div className="max-w-4xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex justify-between items-center bg-white/80 dark:bg-slate-800/80 backdrop-blur-md p-4 rounded-2xl sticky top-4 z-50 shadow-sm border border-white/20">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-sky-500/20">
                            U
                        </div>
                        <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-800 to-slate-600 dark:from-white dark:to-slate-400">
                            UniAuth
                        </h1>
                    </div>
                    <div className="flex items-center gap-3">
                        <LanguageSwitch />
                        <button
                            onClick={handleLogout}
                            className="px-4 py-2 rounded-xl bg-white dark:bg-slate-800 text-slate-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 border border-slate-200 dark:border-slate-700 transition-all text-sm font-medium shadow-sm hover:shadow-md"
                        >
                            {t('home.signOut')}
                        </button>
                    </div>
                </div>

                {/* User Profile Card */}
                <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-6 sm:p-8 overflow-hidden group hover:shadow-md transition-shadow">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-sky-400 via-blue-500 to-purple-600"></div>

                    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 relative z-10">
                        {/* Avatar */}
                        <div className="relative">
                            <div className="w-24 h-24 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-4xl overflow-hidden ring-4 ring-white dark:ring-slate-800 shadow-lg group-hover:scale-105 transition-transform duration-300">
                                {user.avatar_url ? (
                                    <img
                                        src={user.avatar_url}
                                        alt={user.nickname || 'User'}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <span className="text-slate-400 dark:text-slate-500 font-light">
                                        {user.nickname?.[0]?.toUpperCase() || user.phone?.[0] || user.email?.[0] || 'U'}
                                    </span>
                                )}
                            </div>
                            <div className="absolute bottom-1 right-1 w-5 h-5 bg-green-500 border-2 border-white dark:border-slate-800 rounded-full"></div>
                        </div>

                        {/* Info */}
                        <div className="flex-1 text-center sm:text-left space-y-4 w-full">
                            <div className="space-y-1">
                                <h2 className="text-3xl font-bold text-slate-800 dark:text-white tracking-tight">
                                    {user.nickname || 'UniAuth User'}
                                </h2>
                                <div className="flex items-center justify-center sm:justify-start gap-2 text-sm text-slate-400 dark:text-slate-500 font-mono">
                                    <span>ID:</span>
                                    <span
                                        className="bg-slate-100 dark:bg-slate-900 px-2 py-0.5 rounded text-slate-600 dark:text-slate-400 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                                        title={user.id}
                                    >
                                        {user.id.slice(0, 8)}...{user.id.slice(-4)}
                                    </span>
                                    <button
                                        onClick={copyUserId}
                                        className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                                        title={t('home.idCopied')}
                                    >
                                        {idCopied ? (
                                            <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                        ) : (
                                            <svg className="w-4 h-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                            </svg>
                                        )}
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
                                <div className={`p-4 rounded-xl border transition-all ${user.email ? 'bg-sky-50 border-sky-100 dark:bg-sky-900/20 dark:border-sky-800' : 'bg-slate-50 border-slate-100 dark:bg-slate-800/50 dark:border-slate-700'}`}>
                                    <div className="flex items-center gap-2 mb-1">
                                        <svg className={`w-4 h-4 ${user.email ? 'text-sky-500' : 'text-slate-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                        </svg>
                                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Email</p>
                                    </div>
                                    <p className={`font-medium truncate ${user.email ? 'text-sky-900 dark:text-sky-100' : 'text-slate-400 italic'}`}>
                                        {user.email || t('home.notBound')}
                                    </p>
                                </div>

                                <div className={`p-4 rounded-xl border transition-all ${user.phone ? 'bg-emerald-50 border-emerald-100 dark:bg-emerald-900/20 dark:border-emerald-800' : 'bg-slate-50 border-slate-100 dark:bg-slate-800/50 dark:border-slate-700'}`}>
                                    <div className="flex items-center gap-2 mb-1">
                                        <svg className={`w-4 h-4 ${user.phone ? 'text-emerald-500' : 'text-slate-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                        </svg>
                                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Phone</p>
                                    </div>
                                    <p className={`font-medium truncate ${user.phone ? 'text-emerald-900 dark:text-emerald-100' : 'text-slate-400 italic'}`}>
                                        {user.phone || t('home.notBound')}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <ProfileEditor />
                </div>

                {/* Sessions & Other modules */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2">
                        <SessionList />
                    </div>

                    <div className="space-y-6">
                        <SecurityStatus user={user} />

                        <AccountBindings
                            key={bindingsKey}
                            onBindPhone={() => setShowBindPhone(true)}
                            onBindEmail={() => setShowBindEmail(true)}
                        />

                        <MFAStatusCard
                            key={mfaKey}
                            onSetupClick={() => setShowMFASetup(true)}
                            onDisableClick={() => setShowMFASetup(true)}
                        />

                        <AuthorizedApps />

                        <LoginHistory />

                        {/* Danger Zone */}
                        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-red-200 dark:border-red-800/30 p-6">
                            <h3 className="text-lg font-bold text-red-600 dark:text-red-400 mb-3">
                                {t('deleteAccount.title')}
                            </h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                                {t('deleteAccount.subtitle')}
                            </p>
                            <button
                                onClick={() => setShowDeleteAccount(true)}
                                className="px-4 py-2 rounded-lg border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-sm font-medium"
                            >
                                {t('deleteAccount.confirmButton')}
                            </button>
                        </div>
                    </div>
                </div>

                <div className="text-center text-slate-400 text-xs py-8">
                    {t('home.copyright', { year: new Date().getFullYear() })}
                </div>
            </div>

            {/* Bind Modals */}
            <BindPhoneModal
                isOpen={showBindPhone}
                onClose={() => setShowBindPhone(false)}
                onSuccess={() => {
                    setBindingsKey((k) => k + 1);
                    refreshUser();
                }}
            />
            <BindEmailModal
                isOpen={showBindEmail}
                onClose={() => setShowBindEmail(false)}
                onSuccess={() => {
                    setBindingsKey((k) => k + 1);
                    refreshUser();
                }}
            />
            <DeleteAccountModal
                isOpen={showDeleteAccount}
                onClose={() => setShowDeleteAccount(false)}
            />
            <MFASetupModal
                isOpen={showMFASetup}
                onClose={() => setShowMFASetup(false)}
                onSuccess={() => setMfaKey((k) => k + 1)}
            />
        </div>
    );
}
