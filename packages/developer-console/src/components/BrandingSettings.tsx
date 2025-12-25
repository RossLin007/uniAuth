import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { api, BrandingConfig, UpdateBrandingRequest } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { useToast } from '@/contexts/ToastContext';
import { Palette, RefreshCw, Eye } from 'lucide-react';

interface BrandingSettingsProps {
    clientId: string;
}

// Default branding values
const DEFAULT_BRANDING: BrandingConfig = {
    logo_url: null,
    favicon_url: null,
    background_image_url: null,
    primary_color: '#3b82f6',
    secondary_color: '#8b5cf6',
    background_color: '#0f172a',
    text_color: '#f8fafc',
    card_color: '#1e293b',
    error_color: '#ef4444',
    font_family: 'Inter, system-ui, sans-serif',
    custom_css: null,
    login_title: null,
    login_subtitle: null,
    footer_text: null,
    show_social_login: true,
    show_powered_by: true,
    default_locale: 'en',
};

export function BrandingSettings({ clientId }: BrandingSettingsProps) {
    const { t } = useTranslation();
    const toast = useToast();
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [branding, setBranding] = useState<BrandingConfig>(DEFAULT_BRANDING);
    const [showPreview, setShowPreview] = useState(false);

    const loadBranding = async () => {
        setLoading(true);
        try {
            const res = await api.getBranding(clientId);
            setBranding({ ...DEFAULT_BRANDING, ...res.data });
        } catch (error) {
            console.error(error);
            // Use defaults if no branding set
            setBranding(DEFAULT_BRANDING);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (clientId) {
            loadBranding();
        }
    }, [clientId]);

    const handleSave = async () => {
        setSaving(true);
        try {
            const updateData: UpdateBrandingRequest = { ...branding };
            await api.updateBranding(clientId, updateData);
            toast.success(t('branding.saveSuccess'));
        } catch (error: any) {
            toast.error(error.message || t('branding.saveError'));
        } finally {
            setSaving(false);
        }
    };

    const handleReset = async () => {
        if (!confirm(t('branding.resetConfirm'))) return;

        try {
            await api.deleteBranding(clientId);
            setBranding(DEFAULT_BRANDING);
            toast.success(t('branding.resetSuccess'));
        } catch (error: any) {
            toast.error(error.message || t('branding.resetError'));
        }
    };

    const updateField = <K extends keyof BrandingConfig>(field: K, value: BrandingConfig[K]) => {
        setBranding(prev => ({ ...prev, [field]: value }));
    };

    if (loading) {
        return <div className="text-center py-4 text-slate-500">{t('common.loading')}</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-medium flex items-center gap-2">
                        <Palette className="h-5 w-5" />
                        {t('branding.title')}
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        {t('branding.description')}
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setShowPreview(!showPreview)}>
                        <Eye className="mr-2 h-4 w-4" />
                        {showPreview ? t('branding.hidePreview') : t('branding.showPreview')}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={handleReset}>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        {t('branding.reset')}
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Settings Column */}
                <div className="space-y-4">
                    {/* Logo & Images */}
                    <div className="space-y-3">
                        <h4 className="font-medium text-sm text-slate-700 dark:text-slate-300">{t('branding.images')}</h4>
                        <div className="grid gap-2">
                            <Label>{t('branding.logoUrl')}</Label>
                            <Input
                                placeholder="https://example.com/logo.png"
                                value={branding.logo_url || ''}
                                onChange={(e) => updateField('logo_url', e.target.value || null)}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label>{t('branding.faviconUrl')}</Label>
                            <Input
                                placeholder="https://example.com/favicon.ico"
                                value={branding.favicon_url || ''}
                                onChange={(e) => updateField('favicon_url', e.target.value || null)}
                            />
                        </div>
                    </div>

                    {/* Colors */}
                    <div className="space-y-3">
                        <h4 className="font-medium text-sm text-slate-700 dark:text-slate-300">{t('branding.colors')}</h4>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="grid gap-2">
                                <Label>{t('branding.primaryColor')}</Label>
                                <div className="flex gap-2">
                                    <input
                                        type="color"
                                        value={branding.primary_color}
                                        onChange={(e) => updateField('primary_color', e.target.value)}
                                        className="h-10 w-14 rounded border border-slate-300 dark:border-slate-700 cursor-pointer"
                                    />
                                    <Input
                                        value={branding.primary_color}
                                        onChange={(e) => updateField('primary_color', e.target.value)}
                                        className="flex-1"
                                    />
                                </div>
                            </div>
                            <div className="grid gap-2">
                                <Label>{t('branding.secondaryColor')}</Label>
                                <div className="flex gap-2">
                                    <input
                                        type="color"
                                        value={branding.secondary_color}
                                        onChange={(e) => updateField('secondary_color', e.target.value)}
                                        className="h-10 w-14 rounded border border-slate-300 dark:border-slate-700 cursor-pointer"
                                    />
                                    <Input
                                        value={branding.secondary_color}
                                        onChange={(e) => updateField('secondary_color', e.target.value)}
                                        className="flex-1"
                                    />
                                </div>
                            </div>
                            <div className="grid gap-2">
                                <Label>{t('branding.backgroundColor')}</Label>
                                <div className="flex gap-2">
                                    <input
                                        type="color"
                                        value={branding.background_color}
                                        onChange={(e) => updateField('background_color', e.target.value)}
                                        className="h-10 w-14 rounded border border-slate-300 dark:border-slate-700 cursor-pointer"
                                    />
                                    <Input
                                        value={branding.background_color}
                                        onChange={(e) => updateField('background_color', e.target.value)}
                                        className="flex-1"
                                    />
                                </div>
                            </div>
                            <div className="grid gap-2">
                                <Label>{t('branding.textColor')}</Label>
                                <div className="flex gap-2">
                                    <input
                                        type="color"
                                        value={branding.text_color}
                                        onChange={(e) => updateField('text_color', e.target.value)}
                                        className="h-10 w-14 rounded border border-slate-300 dark:border-slate-700 cursor-pointer"
                                    />
                                    <Input
                                        value={branding.text_color}
                                        onChange={(e) => updateField('text_color', e.target.value)}
                                        className="flex-1"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Text Content */}
                    <div className="space-y-3">
                        <h4 className="font-medium text-sm text-slate-700 dark:text-slate-300">{t('branding.textContent')}</h4>
                        <div className="grid gap-2">
                            <Label>{t('branding.loginTitle')}</Label>
                            <Input
                                placeholder={t('branding.loginTitlePlaceholder')}
                                value={branding.login_title || ''}
                                onChange={(e) => updateField('login_title', e.target.value || null)}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label>{t('branding.loginSubtitle')}</Label>
                            <Input
                                placeholder={t('branding.loginSubtitlePlaceholder')}
                                value={branding.login_subtitle || ''}
                                onChange={(e) => updateField('login_subtitle', e.target.value || null)}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label>{t('branding.footerText')}</Label>
                            <Input
                                placeholder="© 2025 Your Company"
                                value={branding.footer_text || ''}
                                onChange={(e) => updateField('footer_text', e.target.value || null)}
                            />
                        </div>
                    </div>

                    {/* Options */}
                    <div className="space-y-3">
                        <h4 className="font-medium text-sm text-slate-700 dark:text-slate-300">{t('branding.options')}</h4>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={branding.show_social_login}
                                onChange={(e) => updateField('show_social_login', e.target.checked)}
                                className="rounded border-slate-300 dark:border-slate-700"
                            />
                            <span className="text-sm">{t('branding.showSocialLogin')}</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={branding.show_powered_by}
                                onChange={(e) => updateField('show_powered_by', e.target.checked)}
                                className="rounded border-slate-300 dark:border-slate-700"
                            />
                            <span className="text-sm">{t('branding.showPoweredBy')}</span>
                        </label>
                    </div>

                    <Button onClick={handleSave} isLoading={saving} className="w-full">
                        {t('common.save')}
                    </Button>
                </div>

                {/* Preview Column */}
                {showPreview && (
                    <div
                        className="rounded-lg p-6 min-h-[400px] flex items-center justify-center"
                        style={{
                            backgroundColor: branding.background_color,
                            color: branding.text_color,
                        }}
                    >
                        <div
                            className="w-full max-w-sm rounded-lg p-6 shadow-lg"
                            style={{ backgroundColor: branding.card_color }}
                        >
                            {branding.logo_url && (
                                <img
                                    src={branding.logo_url}
                                    alt="Logo"
                                    className="h-12 mx-auto mb-4"
                                />
                            )}
                            <h2
                                className="text-xl font-bold text-center mb-2"
                                style={{ color: branding.text_color }}
                            >
                                {branding.login_title || 'Welcome'}
                            </h2>
                            <p
                                className="text-sm text-center mb-6 opacity-80"
                                style={{ color: branding.text_color }}
                            >
                                {branding.login_subtitle || 'Sign in to continue'}
                            </p>

                            <div className="space-y-3">
                                <input
                                    type="email"
                                    placeholder="Email"
                                    className="w-full px-3 py-2 rounded border bg-transparent"
                                    style={{ borderColor: branding.primary_color }}
                                />
                                <button
                                    className="w-full py-2 rounded font-medium"
                                    style={{
                                        backgroundColor: branding.primary_color,
                                        color: '#fff',
                                    }}
                                >
                                    Continue
                                </button>
                            </div>

                            {branding.show_powered_by && (
                                <p className="text-xs text-center mt-4 opacity-50">
                                    Powered by UniAuth
                                </p>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
