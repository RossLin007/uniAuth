import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { api, WebhookDelivery } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Trash, Plus, Activity, Edit2, Save, X, History } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';

interface Webhook {
    id: string;
    url: string;
    events: string[];
    is_active: boolean;
    secret?: string;
    created_at: string;
}

export function WebhookManager({ clientId }: { clientId: string }) {
    const { t } = useTranslation();
    const toast = useToast();
    const [webhooks, setWebhooks] = useState<Webhook[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);

    // Delivery Logs
    const [showLogs, setShowLogs] = useState(false);
    const [deliveries, setDeliveries] = useState<WebhookDelivery[]>([]);
    const [loadingLogs, setLoadingLogs] = useState(false);

    // Create/Edit Form
    const [url, setUrl] = useState('');
    const [events, setEvents] = useState('user.login');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editUrl, setEditUrl] = useState('');
    const [editEvents, setEditEvents] = useState('');

    const fetchWebhooks = async () => {
        try {
            const res = await api.getWebhooks(clientId);
            setWebhooks(res.data);
        } catch (e: any) {
            toast.error(e.message || t('common.error'));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchWebhooks();
    }, [clientId]);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.createWebhook(clientId, {
                url,
                events: events.split(',').map(s => s.trim()),
            });
            setShowCreate(false);
            setUrl('');
            setEvents('user.login');
            toast.success(t('webhook.createdSuccess'));
            fetchWebhooks();
        } catch (e: any) {
            toast.error(e.message || t('common.error'));
        }
    };

    const startEdit = (wh: Webhook) => {
        setEditingId(wh.id);
        setEditUrl(wh.url);
        setEditEvents(wh.events.join(', '));
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditUrl('');
        setEditEvents('');
    };

    const handleUpdate = async (webhookId: string) => {
        try {
            await api.updateWebhook(clientId, webhookId, {
                url: editUrl,
                events: editEvents.split(',').map(s => s.trim()),
            });
            cancelEdit();
            toast.success(t('webhook.updatedSuccess'));
            fetchWebhooks();
        } catch (e: any) {
            toast.error(e.message || t('common.error'));
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm(t('webhook.deleteConfirm'))) return;
        try {
            await api.deleteWebhook(clientId, id);
            toast.success(t('webhook.deletedSuccess'));
            fetchWebhooks();
        } catch (e: any) {
            toast.error(e.message || t('common.error'));
        }
    };

    const handleTest = async () => {
        try {
            await api.testWebhook(clientId, { event: 'user.login', payload: { test: true } });
            toast.success(t('webhook.testSuccess'));
        } catch (e: any) {
            toast.error(e.message || t('webhook.testError'));
        }
    };

    const fetchDeliveries = async () => {
        setLoadingLogs(true);
        setShowLogs(true);
        try {
            const res = await api.getWebhookDeliveries(clientId);
            setDeliveries(res.data);
        } catch (e: any) {
            toast.error(e.message || t('common.error'));
        } finally {
            setLoadingLogs(false);
        }
    };

    if (loading) return <div className="text-slate-600 dark:text-slate-400">{t('common.loading')}</div>;

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-slate-900 dark:text-white">{t('webhook.title')}</h3>
                <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={fetchDeliveries}>
                        <History className="mr-2 h-4 w-4" /> {t('webhook.deliveries')}
                    </Button>
                    <Button size="sm" variant="primary" onClick={() => setShowCreate(!showCreate)}>
                        <Plus className="mr-2 h-4 w-4" /> {t('webhook.addWebhook')}
                    </Button>
                </div>
            </div>

            {showCreate && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">{t('webhook.newSubscription')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <div className="grid gap-2">
                                <Label>{t('webhook.endpointUrl')}</Label>
                                <Input
                                    placeholder="https://api.myapp.com/webhooks/uniauth"
                                    value={url}
                                    onChange={e => setUrl(e.target.value)}
                                    required
                                    type="url"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label>{t('webhook.events')}</Label>
                                <Input
                                    placeholder={t('webhook.eventsPlaceholder')}
                                    value={events}
                                    onChange={e => setEvents(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="flex justify-end gap-2">
                                <Button type="button" variant="ghost" onClick={() => setShowCreate(false)}>
                                    {t('common.cancel')}
                                </Button>
                                <Button type="submit" variant="primary">{t('webhook.subscribe')}</Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            )}

            <div className="grid gap-3">
                {webhooks.length === 0 && !showCreate && (
                    <div className="text-slate-500 text-sm">{t('webhook.noWebhooks')}</div>
                )}
                {webhooks.map(wh => (
                    <Card key={wh.id}>
                        <CardContent className="p-4">
                            {editingId === wh.id ? (
                                // Edit Mode
                                <div className="space-y-3">
                                    <div className="grid gap-2">
                                        <Label className="text-xs">{t('webhook.url')}</Label>
                                        <Input
                                            value={editUrl}
                                            onChange={e => setEditUrl(e.target.value)}
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label className="text-xs">{t('webhook.events')}</Label>
                                        <Input
                                            value={editEvents}
                                            onChange={e => setEditEvents(e.target.value)}
                                        />
                                    </div>
                                    <div className="flex justify-end gap-2">
                                        <Button size="sm" variant="ghost" onClick={cancelEdit}>
                                            <X className="h-4 w-4" />
                                        </Button>
                                        <Button size="sm" variant="primary" onClick={() => handleUpdate(wh.id)}>
                                            <Save className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                // View Mode
                                <div className="flex items-center justify-between">
                                    <div className="space-y-1">
                                        <div className="font-mono text-sm font-medium text-slate-900 dark:text-white">{wh.url}</div>
                                        <div className="flex gap-2 flex-wrap">
                                            {wh.events.map(ev => (
                                                <span key={ev} className="px-2 py-0.5 bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 rounded text-xs">
                                                    {ev}
                                                </span>
                                            ))}
                                        </div>
                                        {wh.secret && (
                                            <div className="text-xs text-slate-500 font-mono">{t('webhook.secretDisplay')}: ••••••••</div>
                                        )}
                                    </div>
                                    <div className="flex gap-2">
                                        <Button size="sm" variant="ghost" onClick={() => startEdit(wh)} title={t('common.edit')}>
                                            <Edit2 className="h-4 w-4" />
                                        </Button>
                                        <Button size="sm" variant="ghost" onClick={handleTest} title={t('webhook.testWebhook')}>
                                            <Activity className="h-4 w-4" />
                                        </Button>
                                        <Button size="sm" variant="destructive" onClick={() => handleDelete(wh.id)} title={t('common.delete')}>
                                            <Trash className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Delivery Logs Modal */}
            <Modal
                isOpen={showLogs}
                onClose={() => setShowLogs(false)}
                title={t('webhook.deliveries')}
                className="max-w-3xl"
            >
                {loadingLogs ? (
                    <div className="py-8 text-center text-slate-500">{t('common.loading')}</div>
                ) : (
                    <div className="space-y-4">
                        {deliveries.length === 0 ? (
                            <p className="text-slate-500 text-center py-4">{t('webhook.noDeliveries')}</p>
                        ) : (
                            <div className="rounded-md border border-slate-200 dark:border-slate-700">
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-50 dark:bg-slate-800 text-xs uppercase text-slate-500">
                                        <tr>
                                            <th className="px-4 py-2 text-left">{t('webhook.status')}</th>
                                            <th className="px-4 py-2 text-left">{t('webhook.code')}</th>
                                            <th className="px-4 py-2 text-left">{t('webhook.events')}</th>
                                            <th className="px-4 py-2 text-left">{t('webhook.time')}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                        {deliveries.map(d => (
                                            <tr key={d.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                                <td className="px-4 py-2">
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${d.status === 'success' ? 'bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-300' :
                                                            d.status === 'failed' ? 'bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-300' :
                                                                'bg-yellow-100 text-yellow-800 dark:bg-yellow-500/20 dark:text-yellow-300'
                                                        }`}>
                                                        {d.status}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-2 font-mono text-xs">
                                                    {d.response_status || '-'}
                                                </td>
                                                <td className="px-4 py-2">
                                                    {d.event}
                                                </td>
                                                <td className="px-4 py-2 text-slate-500">
                                                    {new Date(d.created_at).toLocaleString()}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}
            </Modal>
        </div>
    );
}
