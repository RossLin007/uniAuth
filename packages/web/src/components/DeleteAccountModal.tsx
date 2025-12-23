import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../utils/api';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';

interface DeleteAccountModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function DeleteAccountModal({ isOpen, onClose }: DeleteAccountModalProps) {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { clearAuth } = useAuthStore();
    const [confirmText, setConfirmText] = useState('');
    const [deleting, setDeleting] = useState(false);
    const [error, setError] = useState('');

    const handleDelete = async () => {
        if (confirmText !== 'DELETE') {
            setError(t('deleteAccount.confirmError'));
            return;
        }

        setDeleting(true);
        setError('');
        try {
            // api.delete returns the data field directly, not the full response
            // If the call succeeds without throwing, the deletion was successful
            await api.delete<{ message?: string }>(
                '/user/account',
                { confirm: 'DELETE' }
            );

            clearAuth();
            navigate('/login');
        } catch (err) {
            setError((err as Error).message || t('deleteAccount.failed'));
        } finally {
            setDeleting(false);
        }
    };

    const handleClose = () => {
        setConfirmText('');
        setError('');
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-5">
                {/* Warning Header */}
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
                        <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-red-600 dark:text-red-400">
                            {t('deleteAccount.title')}
                        </h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            {t('deleteAccount.subtitle')}
                        </p>
                    </div>
                </div>

                {/* Warning Message */}
                <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                    <h4 className="font-medium text-red-700 dark:text-red-400 mb-2">
                        {t('deleteAccount.warningTitle')}
                    </h4>
                    <ul className="text-sm text-red-600 dark:text-red-400 space-y-1">
                        <li className="flex items-start gap-2">
                            <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            {t('deleteAccount.warning1')}
                        </li>
                        <li className="flex items-start gap-2">
                            <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            {t('deleteAccount.warning2')}
                        </li>
                        <li className="flex items-start gap-2">
                            <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            {t('deleteAccount.warning3')}
                        </li>
                    </ul>
                </div>

                {/* Confirmation Input */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        {t('deleteAccount.confirmLabel')}
                    </label>
                    <input
                        type="text"
                        value={confirmText}
                        onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
                        placeholder="DELETE"
                        className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none transition-all text-center font-mono text-lg tracking-widest uppercase dark:text-white"
                    />
                </div>

                {error && (
                    <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
                        {error}
                    </div>
                )}

                {/* Actions */}
                <div className="flex gap-3">
                    <button
                        onClick={handleClose}
                        className="flex-1 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                    >
                        {t('common.cancel')}
                    </button>
                    <button
                        onClick={handleDelete}
                        disabled={deleting || confirmText !== 'DELETE'}
                        className="flex-1 py-3 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {deleting ? t('common.loading') : t('deleteAccount.confirmButton')}
                    </button>
                </div>
            </div>
        </div>
    );
}
