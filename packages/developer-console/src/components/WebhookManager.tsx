import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Trash, Plus, Activity, Edit2, Save, X } from 'lucide-react';

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
            toast.error(e.message || 'Failed to load webhooks');
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
            toast.success('Webhook created successfully!');
            fetchWebhooks();
        } catch (e: any) {
            toast.error(e.message || 'Failed to create webhook');
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
            toast.success('Webhook updated successfully!');
            fetchWebhooks();
        } catch (e: any) {
            toast.error(e.message || 'Failed to update webhook');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this webhook?')) return;
        try {
            await api.deleteWebhook(clientId, id);
            toast.success('Webhook deleted');
            fetchWebhooks();
        } catch (e: any) {
            toast.error(e.message || 'Failed to delete webhook');
        }
    };

    const handleTest = async () => {
        try {
            await api.testWebhook(clientId, { event: 'user.login', payload: { test: true } });
            toast.success('Test event triggered! Check your endpoint.');
        } catch (e: any) {
            toast.error(e.message || 'Failed to trigger test event');
        }
    };

    if (loading) return <div className="text-slate-600 dark:text-slate-400">Loading webhooks...</div>;

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-slate-900 dark:text-white">{t('webhook.title')}</h3>
                <Button size="sm" variant="primary" onClick={() => setShowCreate(!showCreate)}>
                    <Plus className="mr-2 h-4 w-4" /> {t('webhook.addWebhook')}
                </Button>
            </div>

            {showCreate && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">New Webhook Subscription</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <div className="grid gap-2">
                                <Label>Endpoint URL</Label>
                                <Input
                                    placeholder="https://api.myapp.com/webhooks/uniauth"
                                    value={url}
                                    onChange={e => setUrl(e.target.value)}
                                    required
                                    type="url"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label>Events (comma separated)</Label>
                                <Input
                                    placeholder="user.login, token.revoked"
                                    value={events}
                                    onChange={e => setEvents(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="flex justify-end gap-2">
                                <Button type="button" variant="ghost" onClick={() => setShowCreate(false)}>
                                    {t('common.cancel')}
                                </Button>
                                <Button type="submit" variant="primary">Subscribe</Button>
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
                                        <Label className="text-xs">URL</Label>
                                        <Input
                                            value={editUrl}
                                            onChange={e => setEditUrl(e.target.value)}
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label className="text-xs">Events</Label>
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
                                            <div className="text-xs text-slate-500 font-mono">Secret: ••••••••</div>
                                        )}
                                    </div>
                                    <div className="flex gap-2">
                                        <Button size="sm" variant="ghost" onClick={() => startEdit(wh)} title="Edit">
                                            <Edit2 className="h-4 w-4" />
                                        </Button>
                                        <Button size="sm" variant="ghost" onClick={handleTest} title="Send Test Event">
                                            <Activity className="h-4 w-4" />
                                        </Button>
                                        <Button size="sm" variant="destructive" onClick={() => handleDelete(wh.id)}>
                                            <Trash className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
