import { useTranslation } from 'react-i18next';
import { useTheme } from '@/contexts/ThemeContext';

export default function WebhooksDoc() {
    const { t } = useTranslation();
    const { resolvedTheme } = useTheme();

    const textPrimary = resolvedTheme === 'dark' ? 'text-white' : 'text-slate-900';
    const textSecondary = resolvedTheme === 'dark' ? 'text-slate-400' : 'text-slate-600';
    const codeBg = resolvedTheme === 'dark' ? 'bg-slate-800' : 'bg-slate-100';
    const borderColor = resolvedTheme === 'dark' ? 'border-slate-700' : 'border-slate-200';

    const events = [
        { name: 'user.created', description: t('docs.content.eventUserCreated') },
        { name: 'user.login', description: t('docs.content.eventUserLogin') },
        { name: 'user.logout', description: t('docs.content.eventUserLogout') },
        { name: 'user.updated', description: t('docs.content.eventUserUpdated') },
        { name: 'user.deleted', description: t('docs.content.eventUserDeleted') },
        { name: 'mfa.enabled', description: t('docs.content.eventMfaEnabled') },
        { name: 'mfa.disabled', description: t('docs.content.eventMfaDisabled') },
    ];

    return (
        <div className="space-y-6">
            <h2 className={`text-xl font-bold ${textPrimary}`}>{t('docs.webhooks')}</h2>
            <p className={textSecondary}>{t('docs.webhooksDesc')}</p>

            {/* Available Events */}
            <div className="space-y-3">
                <h3 className={`text-lg font-semibold ${textPrimary}`}>
                    {t('docs.content.availableEvents')}
                </h3>
                <div className={`border ${borderColor} rounded-lg overflow-hidden`}>
                    <table className="w-full text-sm">
                        <thead className={codeBg}>
                            <tr>
                                <th className={`px-4 py-3 text-left font-medium ${textPrimary}`}>
                                    {t('docs.content.eventName')}
                                </th>
                                <th className={`px-4 py-3 text-left font-medium ${textPrimary}`}>
                                    {t('docs.content.description')}
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {events.map((event, index) => (
                                <tr key={index} className={`border-t ${borderColor}`}>
                                    <td className={`px-4 py-3 font-mono text-xs ${textSecondary}`}>
                                        {event.name}
                                    </td>
                                    <td className={`px-4 py-3 ${textSecondary}`}>
                                        {event.description}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Webhook Payload */}
            <div className="space-y-3">
                <h3 className={`text-lg font-semibold ${textPrimary}`}>
                    {t('docs.content.webhookPayload')}
                </h3>
                <div className={`${codeBg} rounded-lg p-4 overflow-x-auto`}>
                    <pre className="text-xs text-slate-600 dark:text-slate-400">
                        {`{
  "event": "user.login",
  "timestamp": "2024-01-15T10:30:00Z",
  "data": {
    "user_id": "usr_123456",
    "email": "user@example.com",
    "phone": "+8613800138000",
    "ip_address": "192.168.1.1",
    "user_agent": "Mozilla/5.0..."
  },
  "signature": "sha256=abc123..."
}`}
                    </pre>
                </div>
            </div>

            {/* Verify Signature */}
            <div className="space-y-3">
                <h3 className={`text-lg font-semibold ${textPrimary}`}>
                    {t('docs.content.verifySignature')}
                </h3>
                <div className={`${codeBg} rounded-lg p-4 overflow-x-auto`}>
                    <pre className="text-xs text-slate-600 dark:text-slate-400">
                        {`import crypto from 'crypto';

function verifyWebhookSignature(payload: string, signature: string, secret: string) {
    const expectedSignature = 'sha256=' + 
        crypto.createHmac('sha256', secret)
              .update(payload)
              .digest('hex');
    
    return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
    );
}`}
                    </pre>
                </div>
            </div>
        </div>
    );
}
