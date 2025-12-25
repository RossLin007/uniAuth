import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
    startRegistration,
    browserSupportsWebAuthn,
} from '@simplewebauthn/browser';
import { api } from '../utils/api';

interface PasskeyCredential {
    id: string;
    device_name: string;
    device_type: string;
    created_at: string;
    last_used_at: string | null;
}

export function PasskeyManager() {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);
    const [passkeys, setPasskeys] = useState<PasskeyCredential[]>([]);
    const [registering, setRegistering] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [deviceName, setDeviceName] = useState('');
    const [showNameInput, setShowNameInput] = useState(false);

    const isSupported = browserSupportsWebAuthn();

    const loadPasskeys = async () => {
        setLoading(true);
        try {
            const data = await api.get<PasskeyCredential[]>('/auth/passkey/credentials');
            setPasskeys(data);
        } catch (err: unknown) {
            console.error('Failed to load passkeys:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isSupported) {
            loadPasskeys();
        }
    }, [isSupported]);

    const handleRegister = async () => {
        setError(null);
        setSuccess(null);
        setRegistering(true);

        try {
            // 1. Get registration options from server
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const options = await api.post<any>('/auth/passkey/register/options', {});

            // 2. Start registration with browser
            const credential = await startRegistration({ optionsJSON: options });

            // 3. Verify with server
            await api.post('/auth/passkey/register/verify', {
                response: credential,
                deviceName: deviceName || t('passkey.defaultDeviceName'),
            });

            setSuccess(t('passkey.registerSuccess'));
            setDeviceName('');
            setShowNameInput(false);
            loadPasskeys();
        } catch (err: unknown) {
            console.error('Registration error:', err);
            const message = err instanceof Error ? err.message : t('passkey.registerError');
            setError(message);
        } finally {
            setRegistering(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm(t('passkey.deleteConfirm'))) return;

        try {
            await api.delete(`/auth/passkey/credentials/${id}`);
            setSuccess(t('passkey.deleteSuccess'));
            loadPasskeys();
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : t('passkey.deleteError');
            setError(message);
        }
    };

    if (!isSupported) {
        return (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl p-4 border border-yellow-200 dark:border-yellow-800">
                <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-300">
                    <span>🛡️</span>
                    <span>{t('passkey.notSupported')}</span>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="text-xl">👆</span>
                    <h3 className="font-semibold">{t('passkey.title')}</h3>
                </div>
                <button
                    onClick={() => setShowNameInput(true)}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors"
                    disabled={registering}
                >
                    <span>➕</span>
                    {t('passkey.addPasskey')}
                </button>
            </div>

            <p className="text-sm text-slate-600 dark:text-slate-400">
                {t('passkey.description')}
            </p>

            {error && (
                <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg p-3 text-sm">
                    {error}
                </div>
            )}

            {success && (
                <div className="bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-lg p-3 text-sm">
                    {success}
                </div>
            )}

            {showNameInput && (
                <div className="flex gap-2 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                    <input
                        type="text"
                        value={deviceName}
                        onChange={(e) => setDeviceName(e.target.value)}
                        placeholder={t('passkey.deviceNamePlaceholder')}
                        className="flex-1 px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                    />
                    <button
                        onClick={handleRegister}
                        disabled={registering}
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                    >
                        {registering ? t('passkey.registering') : t('passkey.register')}
                    </button>
                    <button
                        onClick={() => setShowNameInput(false)}
                        className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg"
                    >
                        {t('common.cancel')}
                    </button>
                </div>
            )}

            {loading ? (
                <div className="text-center py-4 text-slate-500">
                    {t('common.loading')}
                </div>
            ) : passkeys.length === 0 ? (
                <div className="text-center py-6 text-slate-500 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                    <span className="text-3xl block mb-2">🔑</span>
                    <p>{t('passkey.noPasskeys')}</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {passkeys.map((passkey) => (
                        <div
                            key={passkey.id}
                            className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg"
                        >
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg text-xl">
                                    👆
                                </div>
                                <div>
                                    <div className="font-medium text-slate-900 dark:text-white">
                                        {passkey.device_name || t('passkey.unnamed')}
                                    </div>
                                    <div className="text-xs text-slate-500">
                                        {passkey.device_type} • {t('passkey.addedOn')} {new Date(passkey.created_at).toLocaleDateString()}
                                        {passkey.last_used_at && ` • ${t('passkey.lastUsed')} ${new Date(passkey.last_used_at).toLocaleDateString()}`}
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => handleDelete(passkey.id)}
                                className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                title={t('common.delete') || 'Delete'}
                            >
                                🗑️
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
