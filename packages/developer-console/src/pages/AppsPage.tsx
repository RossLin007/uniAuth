import { useEffect, useState, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { api, App } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Plus, Trash, RefreshCw, Eye, EyeOff, Copy, Check, Edit2 } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { WebhookManager } from '@/components/WebhookManager';
import { IntegrationGuide } from '@/components/IntegrationGuide';
import { RedirectUriManager } from '@/components/RedirectUriManager';
import { CustomClaimsManager } from '@/components/CustomClaimsManager';
import { BrandingSettings } from '@/components/BrandingSettings';
import { Modal } from '@/components/ui/Modal';

// 错误处理辅助函数
const getErrorMessage = (e: unknown, fallback: string): string => {
    if (e instanceof Error) return e.message;
    if (typeof e === 'string') return e;
    return fallback;
};

export default function AppsPage() {
    const { t } = useTranslation();
    const { resolvedTheme } = useTheme();
    const [apps, setApps] = useState<App[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const toast = useToast();

    // Timeout ref for cleanup
    const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

    // Create App Form
    const [newName, setNewName] = useState('');
    const [newDesc, setNewDesc] = useState('');
    const [newType, setNewType] = useState<'web' | 'spa' | 'native' | 'm2m'>('web');
    const [creating, setCreating] = useState(false);

    // Expanded App for Details
    const [expandedApp, setExpandedApp] = useState<string | null>(null);
    const [appDetails, setAppDetails] = useState<App | null>(null);

    // Secret visibility
    const [showSecret, setShowSecret] = useState(false);
    const [copiedField, setCopiedField] = useState<string | null>(null);

    // Edit App Modal State
    const [editingApp, setEditingApp] = useState<App | null>(null);
    const [editForm, setEditForm] = useState({
        name: '',
        description: '',
        homepage_url: '',
        logo_url: ''
    });
    const [updating, setUpdating] = useState(false);

    const fetchApps = useCallback(async () => {
        try {
            const res = await api.getApps();
            setApps(res.data);
        } catch (e: unknown) {
            toast.error(getErrorMessage(e, t('common.error')));
        } finally {
            setLoading(false);
        }
    }, [toast, t]);

    useEffect(() => {
        fetchApps();
    }, [fetchApps]);

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (copyTimeoutRef.current) {
                clearTimeout(copyTimeoutRef.current);
            }
        };
    }, []);

    const copyToClipboard = useCallback((text: string, field: string) => {
        navigator.clipboard.writeText(text);
        setCopiedField(field);
        toast.success(t('common.copied'));

        // Clear previous timeout and set new one
        if (copyTimeoutRef.current) {
            clearTimeout(copyTimeoutRef.current);
        }
        copyTimeoutRef.current = setTimeout(() => setCopiedField(null), 2000);
    }, [toast, t]);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (creating) return;
        setCreating(true);
        try {
            await api.createApp({ name: newName, description: newDesc, app_type: newType });
            setShowCreate(false);
            setNewName('');
            setNewDesc('');
            toast.success(t('app.appCreated'));
            fetchApps();
        } catch (e: any) {
            toast.error(e.message || t('common.error'));
        } finally {
            setCreating(false);
        }
    };

    const loadDetails = async (clientId: string) => {
        if (expandedApp === clientId) {
            setExpandedApp(null);
            setAppDetails(null);
            setShowSecret(false);
            return;
        }
        try {
            const res = await api.getApp(clientId);
            setAppDetails(res.data);
            setExpandedApp(clientId);
            setShowSecret(false);
        } catch (e: any) {
            toast.error(e.message || t('common.error'));
        }
    };

    const handleRotate = async (clientId: string) => {
        if (!confirm(t('app.rotateConfirm'))) return;
        try {
            const res = await api.rotateSecret(clientId);
            setAppDetails(res.data);
            setShowSecret(true);
            toast.success(t('app.secretRotated'));
        } catch (e: any) {
            toast.error(e.message || t('common.error'));
        }
    };

    const handleDelete = async (clientId: string) => {
        if (!confirm(t('app.deleteConfirm'))) return;
        try {
            await api.deleteApp(clientId);
            setExpandedApp(null);
            toast.success(t('app.appDeleted'));
            fetchApps();
        } catch (e: any) {
            toast.error(e.message || t('common.error'));
        }
    };

    // Edit App Logic
    const openEditModal = (app: App) => {
        setEditingApp(app);
        setEditForm({
            name: app.name,
            description: app.description || '',
            homepage_url: app.homepage_url || '',
            logo_url: app.logo_url || ''
        });
    };

    const handleUpdateApp = async () => {
        if (!editingApp) return;
        setUpdating(true);
        try {
            const res = await api.updateApp(editingApp.client_id, {
                name: editForm.name,
                description: editForm.description,
                ...(editForm.homepage_url ? { homepage_url: editForm.homepage_url } : {}),
                ...(editForm.logo_url ? { logo_url: editForm.logo_url } : {})
            });

            // Update local state
            setApps(apps.map(a => a.id === editingApp.id ? { ...a, ...res.data } : a));
            if (appDetails?.id === editingApp.id) {
                setAppDetails({ ...appDetails, ...res.data });
            }

            toast.success(t('app.appUpdated'));
            setEditingApp(null);
        } catch (e: any) {
            toast.error(e.message || t('common.error'));
        } finally {
            setUpdating(false);
        }
    };

    const textPrimary = resolvedTheme === 'dark' ? 'text-white' : 'text-slate-900';
    const textSecondary = resolvedTheme === 'dark' ? 'text-slate-400' : 'text-slate-600';

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className={textSecondary}>{t('common.loading')}</div>
            </div>
        );
    }

    return (
        <div className="space-y-6 md:space-y-8">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className={`text-2xl md:text-3xl font-bold ${textPrimary}`}>{t('nav.apps')}</h1>
                    <p className={`text-sm md:text-base ${textSecondary}`}>{t('apps.subtitle')}</p>
                </div>
                <Button variant="primary" size="sm" onClick={() => setShowCreate(!showCreate)}>
                    <Plus className="mr-2 h-4 w-4" /> {t('dashboard.newApp')}
                </Button>
            </header>

            {showCreate && (
                <Card className="animate-scale-in">
                    <CardHeader>
                        <CardTitle>{t('app.createTitle')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <div className="grid gap-2">
                                <Label htmlFor="name">{t('app.appName')}</Label>
                                <Input
                                    id="name"
                                    value={newName}
                                    onChange={e => setNewName(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="type">{t('app.appType')}</Label>
                                <select
                                    id="type"
                                    className="flex h-10 w-full rounded-lg border px-3 py-2 text-sm border-slate-200 bg-white dark:border-slate-600 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    value={newType}
                                    onChange={e => setNewType(e.target.value as 'web' | 'spa' | 'native' | 'm2m')}
                                >
                                    <option value="web">{t('app.types.web')}</option>
                                    <option value="spa">{t('app.types.spa')}</option>
                                    <option value="native">{t('app.types.native')}</option>
                                    <option value="m2m">{t('app.types.m2m')}</option>
                                </select>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="desc">{t('app.description')}</Label>
                                <Input
                                    id="desc"
                                    value={newDesc}
                                    onChange={e => setNewDesc(e.target.value)}
                                />
                            </div>
                            <div className="flex justify-end gap-2">
                                <Button type="button" variant="ghost" onClick={() => setShowCreate(false)}>
                                    {t('common.cancel')}
                                </Button>
                                <Button type="submit" variant="primary" isLoading={creating} disabled={creating}>
                                    {t('app.createApp')}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            )}

            <div className="grid gap-4 sm:gap-6">
                {apps.length === 0 && !showCreate && (
                    <div className="text-center text-slate-500 py-12">
                        {t('dashboard.noApps')}
                    </div>
                )}
                {apps.map(app => (
                    <Card key={app.id}>
                        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-0 pb-2">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <CardTitle className="text-xl">{app.name}</CardTitle>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-6 w-6 p-0 text-slate-400 hover:text-blue-500"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            openEditModal(app);
                                        }}
                                        title={t('common.edit')}
                                    >
                                        <Edit2 className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                                <CardDescription>
                                    <span className="badge badge-blue mr-2">{app.app_type.toUpperCase()}</span>
                                    <span className="font-mono text-xs">{app.client_id}</span>
                                </CardDescription>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => loadDetails(app.client_id)}
                            >
                                {expandedApp === app.client_id ? t('dashboard.hideDetails') : t('dashboard.manage')}
                            </Button>
                        </CardHeader>
                        {expandedApp === app.client_id && appDetails && (
                            <CardContent className="pt-4 border-t border-slate-200 dark:border-slate-700 mt-4">
                                <div className="space-y-6">
                                    {/* Description & URLs (if present) */}
                                    {(appDetails.description || appDetails.homepage_url) && (
                                        <div className="grid gap-2 text-sm text-slate-600 dark:text-slate-400">
                                            {appDetails.description && <p>{appDetails.description}</p>}
                                            {appDetails.homepage_url && (
                                                <div className="flex items-center gap-1">
                                                    <span className="font-semibold">{t('app.homepageUrl')}:</span>
                                                    <a href={appDetails.homepage_url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                                                        {appDetails.homepage_url}
                                                    </a>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Client ID */}
                                    <div className="grid gap-1">
                                        <Label className="text-xs">{t('app.clientId')}</Label>
                                        <div className="flex items-center gap-2">
                                            <div className="font-mono text-sm bg-slate-100 dark:bg-slate-700/50 p-2.5 rounded-lg border border-slate-200 dark:border-slate-600 flex-1 text-slate-900 dark:text-slate-200">
                                                {appDetails.client_id}
                                            </div>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => copyToClipboard(appDetails.client_id, 'client_id')}
                                            >
                                                {copiedField === 'client_id' ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Client Secret with show/hide */}
                                    <div className="grid gap-1">
                                        <Label className="text-xs">{t('app.clientSecret')}</Label>
                                        <div className="flex items-center gap-2">
                                            <div className="font-mono text-sm bg-slate-100 dark:bg-slate-700/50 p-2.5 rounded-lg border border-slate-200 dark:border-slate-600 flex-1 break-all text-slate-900 dark:text-slate-200">
                                                {showSecret ? appDetails.client_secret : '●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●'}
                                            </div>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => setShowSecret(!showSecret)}
                                            >
                                                {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => copyToClipboard(appDetails.client_secret, 'client_secret')}
                                            >
                                                {copiedField === 'client_secret' ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                                            </Button>
                                            <Button size="sm" variant="destructive" onClick={() => handleRotate(app.client_id)} title={t('app.rotateConfirm')}>
                                                <RefreshCw className="h-4 w-4" />
                                            </Button>
                                        </div>
                                        <p className="text-xs text-orange-500 dark:text-orange-400 mt-1">
                                            ⚠️ {t('app.secretWarning')}
                                        </p>
                                    </div>

                                    {/* Redirect URIs */}
                                    <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                                        <RedirectUriManager
                                            clientId={app.client_id}
                                            initialUris={appDetails.redirect_uris || []}
                                        />
                                    </div>

                                    {/* Webhooks */}
                                    <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                                        <WebhookManager clientId={app.client_id} />
                                    </div>

                                    {/* Custom Claims */}
                                    <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                                        <CustomClaimsManager clientId={app.client_id} />
                                    </div>

                                    {/* Branding Settings */}
                                    <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                                        <BrandingSettings clientId={app.client_id} />
                                    </div>

                                    {/* Integration Guide */}
                                    <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                                        <IntegrationGuide
                                            clientId={appDetails.client_id}
                                            clientSecret={appDetails.client_secret}
                                            appType={app.app_type}
                                        />
                                    </div>

                                    {/* Delete Button */}
                                    <div className="flex justify-end pt-4 border-t border-slate-200 dark:border-slate-700">
                                        <Button variant="destructive" size="sm" onClick={() => handleDelete(app.client_id)}>
                                            <Trash className="mr-2 h-4 w-4" /> {t('app.deleteApp')}
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        )}
                    </Card>
                ))}
            </div>

            {/* Edit App Modal */}
            <Modal
                isOpen={!!editingApp}
                onClose={() => setEditingApp(null)}
                title={t('app.updateApp')}
                description={t('dashboard.subtitle')}
                footer={
                    <>
                        <Button variant="ghost" onClick={() => setEditingApp(null)} disabled={updating}>
                            {t('common.cancel')}
                        </Button>
                        <Button variant="primary" onClick={handleUpdateApp} isLoading={updating}>
                            {t('common.save')}
                        </Button>
                    </>
                }
            >
                <div className="space-y-4">
                    <div className="grid gap-2">
                        <Label>{t('app.appName')}</Label>
                        <Input
                            value={editForm.name}
                            onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label>{t('app.description')}</Label>
                        <Input
                            value={editForm.description}
                            onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label>{t('app.homepageUrl')}</Label>
                        <Input
                            type="url"
                            value={editForm.homepage_url}
                            onChange={e => setEditForm({ ...editForm, homepage_url: e.target.value })}
                            placeholder="https://..."
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label>{t('app.logoUrl')}</Label>
                        <Input
                            type="url"
                            value={editForm.logo_url}
                            onChange={e => setEditForm({ ...editForm, logo_url: e.target.value })}
                            placeholder="https://..."
                        />
                    </div>
                </div>
            </Modal>
        </div>
    );
}
