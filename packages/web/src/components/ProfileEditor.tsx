import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../utils/api';
import { useAuthStore } from '../store/authStore';
import { X, User, Link, RefreshCw, Check, AlertCircle, Sparkles } from 'lucide-react';

const AVATAR_STYLES = ['avataaars', 'micah', 'notionists', 'adventurer', 'lorelei'];

interface ProfileEditorProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function ProfileEditor({ isOpen, onClose }: ProfileEditorProps) {
    const { t } = useTranslation();
    const { user } = useAuthStore();

    // Form State
    const [nickname, setNickname] = useState(user?.nickname || '');
    const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || '');
    const [avatarMode, setAvatarMode] = useState<'preset' | 'link'>('preset');

    // Status State
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    // Preset State
    const [seed, setSeed] = useState(Math.random().toString(36).substring(7));
    const [selectedStyle, setSelectedStyle] = useState(AVATAR_STYLES[1]); // Default to micah

    useEffect(() => {
        if (isOpen) {
            setNickname(user?.nickname || '');
            setAvatarUrl(user?.avatar_url || '');
            setSuccess(false);
            setError(null);
            // Detect if current avatar is likely a preset
            if (user?.avatar_url?.includes('dicebear.com')) {
                setAvatarMode('preset');
            } else if (user?.avatar_url) {
                setAvatarMode('link');
            }
        }
    }, [isOpen, user]);

    const generateAvatar = () => {
        return `https://api.dicebear.com/9.x/${selectedStyle}/svg?seed=${seed}`;
    };

    const handleRandomize = () => {
        setSeed(Math.random().toString(36).substring(7));
    };

    const handleSave = async () => {
        // Validation
        if (nickname.length < 2) {
            setError(t('profile.nicknameTooShort', 'Nickname must be at least 2 characters'));
            return;
        }

        setError(null);
        setSaving(true);

        try {
            const finalAvatarUrl = avatarMode === 'preset' ? generateAvatar() : avatarUrl;

            const updatedUser = await api.patch<typeof user>('/user/me', {
                nickname: nickname || null,
                avatar_url: finalAvatarUrl || null,
            });

            if (updatedUser) {
                const newUser = { ...user!, ...updatedUser };
                useAuthStore.setState({ user: newUser });

                // Show success state briefly before closing
                setSuccess(true);
                setTimeout(() => {
                    onClose();
                    setSuccess(false);
                }, 1000);
            }
        } catch (err: any) {
            console.error('Failed to update profile', err);
            setError(err.message || t('profile.saveFailed'));
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-sm animate-fade-in">
            {/* Modal */}
            <div className="relative bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl rounded-3xl shadow-2xl max-w-lg w-full p-6 sm:p-8 space-y-6 border border-white/20 dark:border-slate-700 ring-1 ring-black/5">

                {/* Header */}
                <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold text-slate-800 dark:text-white font-serif tracking-tight flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-sky-500" />
                        {t('profile.editProfile', 'Edit Profile')}
                    </h3>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="space-y-6">
                    {/* Avatar Section */}
                    <div className="space-y-3">
                        <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                            {t('profile.avatar', 'Avatar')}
                            <div className="flex p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs">
                                <button
                                    onClick={() => setAvatarMode('preset')}
                                    className={`px-2 py-1 rounded-md transition-all ${avatarMode === 'preset' ? 'bg-white dark:bg-slate-700 shadow-sm text-sky-600 dark:text-sky-400 font-medium' : 'text-slate-500'}`}
                                >
                                    Presets
                                </button>
                                <button
                                    onClick={() => setAvatarMode('link')}
                                    className={`px-2 py-1 rounded-md transition-all ${avatarMode === 'link' ? 'bg-white dark:bg-slate-700 shadow-sm text-sky-600 dark:text-sky-400 font-medium' : 'text-slate-500'}`}
                                >
                                    Link
                                </button>
                            </div>
                        </label>

                        <div className="flex items-center gap-6">
                            {/* Preview */}
                            <div className="relative group">
                                <div className="w-24 h-24 rounded-full bg-slate-50 dark:bg-slate-800 border-4 border-white dark:border-slate-700 shadow-lg overflow-hidden flex-shrink-0">
                                    <img
                                        src={avatarMode === 'preset' ? generateAvatar() : (avatarUrl || generateAvatar())}
                                        alt="Avatar Preview"
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${nickname || 'User'}&background=random`;
                                        }}
                                    />
                                </div>
                                {avatarMode === 'preset' && (
                                    <button
                                        onClick={handleRandomize}
                                        className="absolute -bottom-1 -right-1 p-2 bg-white dark:bg-slate-800 rounded-full shadow-md text-slate-600 dark:text-slate-300 hover:text-sky-500 dark:hover:text-sky-400 border border-slate-100 dark:border-slate-600 transition-transform active:scale-95"
                                        title="Randomize"
                                    >
                                        <RefreshCw className="w-4 h-4" />
                                    </button>
                                )}
                            </div>

                            {/* Controls */}
                            <div className="flex-1 space-y-3">
                                {avatarMode === 'preset' ? (
                                    <div className="grid grid-cols-5 gap-2">
                                        {AVATAR_STYLES.map(style => (
                                            <button
                                                key={style}
                                                onClick={() => setSelectedStyle(style)}
                                                className={`aspect-square rounded-lg overflow-hidden border-2 transition-all ${selectedStyle === style ? 'border-sky-500 ring-2 ring-sky-500/20' : 'border-transparent hover:border-slate-200 dark:hover:border-slate-700'}`}
                                                title={style}
                                            >
                                                <img
                                                    src={`https://api.dicebear.com/9.x/${style}/svg?seed=${seed}`}
                                                    className="w-full h-full object-cover"
                                                    alt={style}
                                                />
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="relative">
                                        <Link className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <input
                                            type="url"
                                            value={avatarUrl}
                                            onChange={(e) => setAvatarUrl(e.target.value)}
                                            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:bg-white dark:focus:bg-slate-900 focus:border-sky-500 outline-none transition-all dark:text-white font-mono text-sm"
                                            placeholder="https://example.com/me.jpg"
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Nickname Section */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                            {t('profile.nickname')}
                        </label>
                        <div className="relative">
                            <input
                                type="text"
                                value={nickname}
                                onChange={(e) => setNickname(e.target.value)}
                                className={`w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border focus:bg-white dark:focus:bg-slate-900 outline-none transition-all dark:text-white font-medium
                                    ${error ? 'border-red-300 focus:border-red-500' : 'border-slate-200 dark:border-slate-700 focus:border-sky-500'}
                                `}
                                placeholder={t('profile.nicknamePlaceholder')}
                                maxLength={30}
                            />
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                                {nickname.length}/30
                            </div>
                        </div>
                        {error && (
                            <p className="flex items-center gap-1.5 text-xs text-red-500 mt-2 font-medium animate-pulse">
                                <AlertCircle className="w-3.5 h-3.5" />
                                {error}
                            </p>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-3 pt-2">
                    <button
                        onClick={onClose}
                        className="px-5 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors font-medium text-sm"
                        disabled={saving}
                    >
                        {t('profile.cancel')}
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving || success}
                        className={`
                            relative px-6 py-2.5 rounded-xl font-medium text-sm transition-all overflow-hidden flex items-center gap-2
                            ${success
                                ? 'bg-green-500 text-white shadow-lg shadow-green-500/30'
                                : 'bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white shadow-lg shadow-sky-500/30 active:scale-95'
                            }
                            ${saving ? 'opacity-80 cursor-wait' : ''}
                        `}
                    >
                        {success ? (
                            <>
                                <Check className="w-4 h-4" />
                                {t('profile.saved', 'Saved!')}
                            </>
                        ) : saving ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                {t('profile.saving')}
                            </>
                        ) : (
                            t('profile.save')
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
