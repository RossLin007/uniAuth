import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { api } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';

interface RedirectUriManagerProps {
    clientId: string;
    initialUris: string[];
    onUpdate?: (uris: string[]) => void;
}

export function RedirectUriManager({ clientId, initialUris, onUpdate }: RedirectUriManagerProps) {
    const { t } = useTranslation();
    const toast = useToast();
    const [uris, setUris] = useState<string[]>(initialUris || []);
    const [newUri, setNewUri] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const validateUri = (uri: string): boolean => {
        try {
            const url = new URL(uri);
            // Allow http for localhost, require https otherwise
            if (url.protocol === 'http:' && !url.hostname.includes('localhost') && url.hostname !== '127.0.0.1') {
                setError(t('redirectUri.httpsRequired'));
                return false;
            }
            return true;
        } catch {
            setError(t('redirectUri.invalidUrl'));
            return false;
        }
    };

    const addUri = async () => {
        if (!newUri.trim()) return;
        if (!validateUri(newUri)) return;
        if (uris.includes(newUri)) {
            setError(t('redirectUri.duplicate'));
            return;
        }

        setError(null);
        setSaving(true);
        try {
            const updatedUris = [...uris, newUri];
            await api.updateApp(clientId, { redirect_uris: updatedUris });
            setUris(updatedUris);
            setNewUri('');
            toast.success(t('redirectUri.added'));
            onUpdate?.(updatedUris);
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : t('redirectUri.addError');
            setError(msg);
        } finally {
            setSaving(false);
        }
    };

    const removeUri = async (uri: string) => {
        setSaving(true);
        setError(null);
        try {
            const updatedUris = uris.filter(u => u !== uri);
            await api.updateApp(clientId, { redirect_uris: updatedUris });
            setUris(updatedUris);
            toast.success(t('redirectUri.removed'));
            onUpdate?.(updatedUris);
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : t('redirectUri.removeError');
            setError(msg);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-3">
            <Label className="text-sm font-medium">
                {t('redirectUri.title')}
            </Label>

            {error && (
                <div className="text-sm text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-500/10 p-2 rounded">
                    {error}
                </div>
            )}

            {/* Existing URIs */}
            <div className="space-y-2">
                {uris.length === 0 ? (
                    <p className="text-sm text-slate-500 italic">
                        {t('redirectUri.noUrisConfigured')}
                    </p>
                ) : (
                    uris.map((uri, idx) => (
                        <div key={idx} className="flex items-center gap-2 group">
                            <div className="flex-1 font-mono text-sm bg-slate-100 dark:bg-slate-700/50 p-2 rounded border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-slate-200">
                                {uri}
                            </div>
                            <Button
                                size="sm"
                                variant="ghost"
                                className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-600"
                                onClick={() => removeUri(uri)}
                                disabled={saving}
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    ))
                )}
            </div>

            {/* Add new URI */}
            <div className="flex gap-2">
                <Input
                    placeholder={t('redirectUri.placeholder')}
                    value={newUri}
                    onChange={e => { setNewUri(e.target.value); setError(null); }}
                    onKeyDown={e => e.key === 'Enter' && addUri()}
                    className="flex-1"
                />
                <Button
                    size="sm"
                    variant="primary"
                    onClick={addUri}
                    disabled={saving || !newUri.trim()}
                    isLoading={saving}
                >
                    <Plus className="h-4 w-4" />
                </Button>
            </div>

            <p className="text-xs text-slate-500">
                {t('redirectUri.hint')}
            </p>
        </div>
    );
}
