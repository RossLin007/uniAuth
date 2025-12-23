import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../utils/api';
import { useAuthStore } from '../store/authStore';

export default function ProfileEditor() {
    const { t } = useTranslation();
    const { user } = useAuthStore();
    const [isEditing, setIsEditing] = useState(false);
    const [nickname, setNickname] = useState(user?.nickname || '');
    const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || '');
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        setSaving(true);
        try {
            const { user: updatedUser } = await api.patch<{ user: typeof user }>('/user/me', {
                nickname: nickname || null,
                avatar_url: avatarUrl || null,
            });

            if (updatedUser) {
                // Update local state and persisted store
                const newUser = { ...user!, ...updatedUser };

                // Directly update the zustand store state
                useAuthStore.setState({ user: newUser });

                // Also update local state to reflect changes immediately
                setNickname(newUser.nickname || '');
                setAvatarUrl(newUser.avatar_url || '');

                setIsEditing(false);
            }
        } catch (err) {
            console.error('Failed to update profile', err);
            alert(t('profile.saveFailed'));
        } finally {
            setSaving(false);
        }
    };

    if (!isEditing) {
        return (
            <div className="flex justify-end mt-4 sm:mt-0 sm:absolute sm:top-6 sm:right-6">
                <button
                    onClick={() => setIsEditing(true)}
                    className="px-4 py-2 rounded-xl bg-white dark:bg-slate-700 text-stone dark:text-slate-300 border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors text-sm font-medium"
                >
                    {t('profile.edit')}
                </button>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
                <h3 className="text-lg font-bold text-ink dark:text-moonlight">{t('profile.title')}</h3>

                <div className="space-y-3">
                    <div>
                        <label className="block text-sm font-medium text-stone mb-1">{t('profile.nickname')}</label>
                        <input
                            type="text"
                            value={nickname}
                            onChange={(e) => setNickname(e.target.value)}
                            className="w-full px-4 py-2 rounded-xl bg-mist dark:bg-slate-900 border border-transparent focus:bg-white dark:focus:bg-black focus:border-sky-500 outline-none transition-all dark:text-white"
                            placeholder={t('profile.nicknamePlaceholder')}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-stone mb-1">{t('profile.avatarUrl')}</label>
                        <input
                            type="url"
                            value={avatarUrl}
                            onChange={(e) => setAvatarUrl(e.target.value)}
                            className="w-full px-4 py-2 rounded-xl bg-mist dark:bg-slate-900 border border-transparent focus:bg-white dark:focus:bg-black focus:border-sky-500 outline-none transition-all dark:text-white"
                            placeholder={t('profile.avatarUrlPlaceholder')}
                        />
                    </div>
                </div>

                <div className="flex justify-end gap-3 mt-6">
                    <button
                        onClick={() => setIsEditing(false)}
                        className="px-4 py-2 rounded-xl text-stone hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700 transition-colors"
                    >
                        {t('profile.cancel')}
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-medium transition-colors disabled:opacity-50"
                    >
                        {saving ? t('profile.saving') : t('profile.save')}
                    </button>
                </div>
            </div>
        </div>
    );
}
