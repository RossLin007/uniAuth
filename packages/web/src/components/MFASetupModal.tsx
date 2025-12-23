import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../utils/api';
import OtpInput from './OtpInput';

interface MFAStatus {
    enabled: boolean;
    verifiedAt: string | null;
    recoveryCodes: number;
}

interface MFASetupModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

type SetupStep = 'initial' | 'qrcode' | 'verify' | 'recovery' | 'success';

export default function MFASetupModal({ isOpen, onClose, onSuccess }: MFASetupModalProps) {
    const { t } = useTranslation();
    const [step, setStep] = useState<SetupStep>('initial');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [qrCode, setQrCode] = useState('');
    const [secret, setSecret] = useState('');
    const [verifyCode, setVerifyCode] = useState('');
    const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
    const [copiedRecovery, setCopiedRecovery] = useState(false);

    const resetState = () => {
        setStep('initial');
        setLoading(false);
        setError('');
        setQrCode('');
        setSecret('');
        setVerifyCode('');
        setRecoveryCodes([]);
        setCopiedRecovery(false);
    };

    useEffect(() => {
        if (!isOpen) {
            resetState();
        }
    }, [isOpen]);

    const startSetup = async () => {
        setLoading(true);
        setError('');
        try {
            const data = await api.post<{ secret: string; qrCode: string }>('/mfa/setup', {});
            setSecret(data.secret);
            setQrCode(data.qrCode);
            setStep('qrcode');
        } catch (err) {
            setError((err as Error).message || t('mfa.setupFailed'));
        } finally {
            setLoading(false);
        }
    };

    const verifySetup = async () => {
        if (verifyCode.length !== 6) {
            setError(t('mfa.invalidCode'));
            return;
        }

        setLoading(true);
        setError('');
        try {
            const data = await api.post<{ recoveryCodes: string[] }>('/mfa/verify-setup', { code: verifyCode });
            setRecoveryCodes(data.recoveryCodes);
            setStep('recovery');
        } catch (err) {
            setError((err as Error).message || t('mfa.verifyFailed'));
        } finally {
            setLoading(false);
        }
    };

    const copyRecoveryCodes = async () => {
        const codesText = recoveryCodes.join('\n');
        await navigator.clipboard.writeText(codesText);
        setCopiedRecovery(true);
        setTimeout(() => setCopiedRecovery(false), 2000);
    };

    const finishSetup = () => {
        onSuccess();
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                        <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                            {t('mfa.setupTitle')}
                        </h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            {t('mfa.setupSubtitle')}
                        </p>
                    </div>
                </div>

                {/* Step: Initial */}
                {step === 'initial' && (
                    <div className="space-y-4">
                        <div className="p-4 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800">
                            <h4 className="font-medium text-indigo-800 dark:text-indigo-300 mb-2">
                                {t('mfa.whatIsMFA')}
                            </h4>
                            <p className="text-sm text-indigo-600 dark:text-indigo-400">
                                {t('mfa.whatIsMFADesc')}
                            </p>
                        </div>

                        <div className="text-sm text-slate-600 dark:text-slate-400">
                            <p className="mb-2">{t('mfa.requirements')}</p>
                            <ul className="list-disc list-inside space-y-1">
                                <li>Google Authenticator</li>
                                <li>Microsoft Authenticator</li>
                                <li>Authy</li>
                                <li>{t('mfa.otherApps')}</li>
                            </ul>
                        </div>

                        <button
                            onClick={startSetup}
                            disabled={loading}
                            className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold hover:from-indigo-600 hover:to-purple-700 transition-all disabled:opacity-50"
                        >
                            {loading ? t('common.loading') : t('mfa.startSetup')}
                        </button>
                    </div>
                )}

                {/* Step: QR Code */}
                {step === 'qrcode' && (
                    <div className="space-y-4">
                        <div className="text-center">
                            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                                {t('mfa.scanQRCode')}
                            </p>
                            <div className="inline-block p-4 bg-white rounded-xl shadow-lg">
                                <img src={qrCode} alt="MFA QR Code" className="w-48 h-48" />
                            </div>
                        </div>

                        <div className="p-3 rounded-lg bg-slate-100 dark:bg-slate-900">
                            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                                {t('mfa.manualEntry')}
                            </p>
                            <code className="text-sm font-mono text-slate-800 dark:text-slate-200 break-all">
                                {secret}
                            </code>
                        </div>

                        <button
                            onClick={() => setStep('verify')}
                            className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold hover:from-indigo-600 hover:to-purple-700 transition-all"
                        >
                            {t('mfa.next')}
                        </button>
                    </div>
                )}

                {/* Step: Verify */}
                {step === 'verify' && (
                    <div className="space-y-4">
                        <p className="text-sm text-slate-600 dark:text-slate-400 text-center">
                            {t('mfa.enterCode')}
                        </p>

                        <div className="flex justify-center">
                            <OtpInput
                                length={6}
                                value={verifyCode}
                                onChange={setVerifyCode}
                            />
                        </div>

                        {error && (
                            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm text-center">
                                {error}
                            </div>
                        )}

                        <div className="flex gap-3">
                            <button
                                onClick={() => setStep('qrcode')}
                                className="flex-1 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                            >
                                {t('common.back')}
                            </button>
                            <button
                                onClick={verifySetup}
                                disabled={loading || verifyCode.length !== 6}
                                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold hover:from-indigo-600 hover:to-purple-700 transition-all disabled:opacity-50"
                            >
                                {loading ? t('common.loading') : t('mfa.verify')}
                            </button>
                        </div>
                    </div>
                )}

                {/* Step: Recovery Codes */}
                {step === 'recovery' && (
                    <div className="space-y-4">
                        <div className="p-4 rounded-xl bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
                            <h4 className="font-medium text-yellow-800 dark:text-yellow-300 mb-1">
                                ⚠️ {t('mfa.saveRecoveryCodes')}
                            </h4>
                            <p className="text-sm text-yellow-700 dark:text-yellow-400">
                                {t('mfa.recoveryCodesDesc')}
                            </p>
                        </div>

                        <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-900">
                            <div className="grid grid-cols-2 gap-2">
                                {recoveryCodes.map((code, i) => (
                                    <code key={i} className="text-sm font-mono text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800 px-2 py-1 rounded text-center">
                                        {code}
                                    </code>
                                ))}
                            </div>
                        </div>

                        <button
                            onClick={copyRecoveryCodes}
                            className="w-full py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-sm"
                        >
                            {copiedRecovery ? '✓ ' + t('mfa.copied') : t('mfa.copyRecoveryCodes')}
                        </button>

                        <button
                            onClick={finishSetup}
                            className="w-full py-3 rounded-xl bg-green-500 text-white font-semibold hover:bg-green-600 transition-colors"
                        >
                            {t('mfa.finishSetup')}
                        </button>
                    </div>
                )}

                {/* Close Button */}
                {step === 'initial' && (
                    <button
                        onClick={onClose}
                        className="w-full mt-4 py-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors text-sm"
                    >
                        {t('common.cancel')}
                    </button>
                )}
            </div>
        </div>
    );
}

// MFA Status Card Component
export function MFAStatusCard({ onSetupClick, onDisableClick }: {
    onSetupClick: () => void;
    onDisableClick: () => void;
}) {
    const { t } = useTranslation();
    const [status, setStatus] = useState<MFAStatus | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchStatus = async () => {
        try {
            const data = await api.get<MFAStatus>('/mfa/status');
            setStatus(data);
        } catch (err) {
            console.error('Failed to fetch MFA status:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStatus();
    }, []);

    if (loading) {
        return (
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-6">
                <div className="animate-pulse">
                    <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-1/3 mb-4"></div>
                    <div className="h-10 bg-slate-200 dark:bg-slate-700 rounded"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                    {t('mfa.title')}
                </h3>
                {status?.enabled && (
                    <span className="px-2 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 text-xs font-medium">
                        {t('mfa.enabled')}
                    </span>
                )}
            </div>

            {status?.enabled ? (
                <div className="space-y-3">
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                        {t('mfa.enabledDesc')}
                    </p>
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                        {t('mfa.recoveryCodesRemaining', { count: status.recoveryCodes })}
                    </div>
                    <button
                        onClick={onDisableClick}
                        className="w-full py-2 rounded-lg border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-sm font-medium"
                    >
                        {t('mfa.disable')}
                    </button>
                </div>
            ) : (
                <div className="space-y-3">
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                        {t('mfa.disabledDesc')}
                    </p>
                    <button
                        onClick={onSetupClick}
                        className="w-full py-2 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium hover:from-indigo-600 hover:to-purple-700 transition-all text-sm"
                    >
                        {t('mfa.enable')}
                    </button>
                </div>
            )}
        </div>
    );
}
