import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Trash, Edit2 } from 'lucide-react';
import { api, CustomClaim, CreateClaimRequest, UpdateClaimRequest } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/contexts/ToastContext';

interface CustomClaimsManagerProps {
    clientId: string;
}

export function CustomClaimsManager({ clientId }: CustomClaimsManagerProps) {
    const { t } = useTranslation();
    const toast = useToast();
    const [claims, setClaims] = useState<CustomClaim[]>([]);
    const [loading, setLoading] = useState(false);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingClaim, setEditingClaim] = useState<CustomClaim | null>(null);
    const [saving, setSaving] = useState(false);

    // Form State
    const [formData, setFormData] = useState<Partial<CustomClaim>>({
        claim_name: '',
        claim_source: 'user_attribute',
        source_field: '',
        static_value: '',
        computed_expression: '',
        transform_function: 'none',
        required_scope: '',
        enabled: true
    });

    const resetForm = () => {
        setFormData({
            claim_name: '',
            claim_source: 'user_attribute',
            source_field: '',
            static_value: '',
            computed_expression: '',
            transform_function: 'none',
            required_scope: '',
            enabled: true
        });
        setEditingClaim(null);
    };

    const loadClaims = async () => {
        setLoading(true);
        try {
            const res = await api.getClaims(clientId);
            setClaims(res.data);
        } catch (error) {
            console.error(error);
            toast.error(t('claims.loadError'));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (clientId) {
            loadClaims();
        }
    }, [clientId]);

    const handleOpenCreate = () => {
        resetForm();
        setIsModalOpen(true);
    };

    const handleOpenEdit = (claim: CustomClaim) => {
        setEditingClaim(claim);
        setFormData({ ...claim });
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        if (!formData.claim_name) return;

        setSaving(true);
        try {
            if (editingClaim) {
                await api.updateClaim(clientId, editingClaim.id, formData as UpdateClaimRequest);
                toast.success(t('claims.updateSuccess'));
            } else {
                await api.createClaim(clientId, formData as CreateClaimRequest);
                toast.success(t('claims.createSuccess'));
            }
            setIsModalOpen(false);
            loadClaims();
        } catch (error: any) {
            toast.error(error.message || t('claims.saveError'));
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (claimId: string) => {
        if (!confirm(t('common.confirmDelete'))) return;

        try {
            await api.deleteClaim(clientId, claimId);
            toast.success(t('claims.deleteSuccess'));
            loadClaims();
        } catch (error: any) {
            toast.error(error.message || t('claims.deleteError'));
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-medium">{t('claims.title')}</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        {t('claims.description')}
                    </p>
                </div>
                <Button onClick={handleOpenCreate} size="sm" disabled={loading}>
                    <Plus className="mr-2 h-4 w-4" />
                    {t('claims.addClaim')}
                </Button>
            </div>

            {loading ? (
                <div className="text-center py-4 text-slate-500">{t('common.loading')}</div>
            ) : (
                <div className="rounded-md border border-slate-200 dark:border-slate-700">
                    <div className="relative w-full overflow-auto">
                        <table className="w-full caption-bottom text-sm text-left">
                            <thead className="[&_tr]:border-b [&_tr]:border-slate-200 dark:[&_tr]:border-slate-700">
                                <tr className="border-b transition-colors hover:bg-slate-100/50 dark:hover:bg-slate-800/50">
                                    <th className="h-12 px-4 align-middle font-medium text-slate-500 dark:text-slate-400">
                                        {t('claims.name')}
                                    </th>
                                    <th className="h-12 px-4 align-middle font-medium text-slate-500 dark:text-slate-400">
                                        {t('claims.source')}
                                    </th>
                                    <th className="h-12 px-4 align-middle font-medium text-slate-500 dark:text-slate-400">
                                        {t('claims.transform')}
                                    </th>
                                    <th className="h-12 px-4 align-middle font-medium text-slate-500 dark:text-slate-400 text-right">
                                        {t('common.actions')}
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="[&_tr:last-child]:border-0">
                                {claims.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="p-4 text-center text-slate-500">
                                            {t('claims.noClaims')}
                                        </td>
                                    </tr>
                                ) : (
                                    claims.map((claim) => (
                                        <tr key={claim.id} className="border-b border-slate-200 dark:border-slate-700 transition-colors hover:bg-slate-100/50 dark:hover:bg-slate-800/50">
                                            <td className="p-4 align-middle font-mono">
                                                {claim.claim_name}
                                                {claim.required_scope && (
                                                    <span className="ml-2 text-xs bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-500">
                                                        {claim.required_scope}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="p-4 align-middle">
                                                <div className="flex flex-col">
                                                    <span className="capitalize">{claim.claim_source.replace('_', ' ')}</span>
                                                    <span className="text-xs text-slate-500 font-mono">
                                                        {claim.claim_source === 'user_attribute' && claim.source_field}
                                                        {claim.claim_source === 'static' && `"${claim.static_value}"`}
                                                        {claim.claim_source === 'computed' && claim.computed_expression}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="p-4 align-middle font-mono text-xs">
                                                {claim.transform_function !== 'none' ? claim.transform_function : '-'}
                                            </td>
                                            <td className="p-4 align-middle text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleOpenEdit(claim)}
                                                    >
                                                        <Edit2 className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                                                        onClick={() => handleDelete(claim.id)}
                                                    >
                                                        <Trash className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingClaim ? t('claims.editClaim') : t('claims.createClaim')}
                description={t('claims.modalDescription')}
                footer={
                    <>
                        <Button variant="ghost" onClick={() => setIsModalOpen(false)}>
                            {t('common.cancel')}
                        </Button>
                        <Button variant="primary" onClick={handleSave} isLoading={saving}>
                            {t('common.save')}
                        </Button>
                    </>
                }
            >
                <div className="space-y-4">
                    <div className="grid gap-2">
                        <Label>{t('claims.name')}</Label>
                        <Input
                            placeholder="e.g. role"
                            value={formData.claim_name}
                            onChange={(e) => setFormData({ ...formData, claim_name: e.target.value })}
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label>{t('claims.source')}</Label>
                        <select
                            className="flex h-10 w-full rounded-md border border-slate-300 bg-transparent px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-50 dark:focus:ring-slate-400 dark:focus:ring-offset-slate-900"
                            value={formData.claim_source}
                            onChange={(e) => setFormData({ ...formData, claim_source: e.target.value as any })}
                        >
                            <option value="user_attribute">User Attribute</option>
                            <option value="static">Static Value</option>
                            <option value="computed">Computed Expression</option>
                        </select>
                    </div>

                    {formData.claim_source === 'user_attribute' && (
                        <div className="grid gap-2">
                            <Label>{t('claims.attributeName')}</Label>
                            <Input
                                placeholder="e.g. email, phone, id"
                                value={formData.source_field || ''}
                                onChange={(e) => setFormData({ ...formData, source_field: e.target.value })}
                            />
                        </div>
                    )}

                    {formData.claim_source === 'static' && (
                        <div className="grid gap-2">
                            <Label>{t('claims.staticValue')}</Label>
                            <Input
                                placeholder="Value to return"
                                value={formData.static_value || ''}
                                onChange={(e) => setFormData({ ...formData, static_value: e.target.value })}
                            />
                        </div>
                    )}

                    {formData.claim_source === 'computed' && (
                        <div className="grid gap-2">
                            <Label>{t('claims.expression')}</Label>
                            <Input
                                placeholder="e.g. ${first_name} ${last_name}"
                                value={formData.computed_expression || ''}
                                onChange={(e) => setFormData({ ...formData, computed_expression: e.target.value })}
                            />
                            <p className="text-xs text-slate-500">
                                Use {'${field}'} to reference user attributes.
                            </p>
                        </div>
                    )}

                    <div className="grid gap-2">
                        <Label>{t('claims.transform')}</Label>
                        <select
                            className="flex h-10 w-full rounded-md border border-slate-300 bg-transparent px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-50 dark:focus:ring-slate-400 dark:focus:ring-offset-slate-900"
                            value={formData.transform_function}
                            onChange={(e) => setFormData({ ...formData, transform_function: e.target.value as any })}
                        >
                            <option value="none">None</option>
                            <option value="uppercase">Uppercase</option>
                            <option value="lowercase">Lowercase</option>
                            <option value="hash_sha256">SHA-256 Hash</option>
                            <option value="base64_encode">Base64 Encode</option>
                            <option value="json_stringify">JSON Stringify</option>
                        </select>
                    </div>

                    <div className="grid gap-2">
                        <Label>{t('claims.requiredScope')}</Label>
                        <Input
                            placeholder="Optional (e.g. profile)"
                            value={formData.required_scope || ''}
                            onChange={(e) => setFormData({ ...formData, required_scope: e.target.value })}
                        />
                    </div>
                </div>
            </Modal>
        </div>
    );
}
