import { useTranslation } from 'react-i18next';
import { useTheme } from '@/contexts/ThemeContext';

export default function AuthenticationDoc() {
    const { t } = useTranslation();
    const { resolvedTheme } = useTheme();

    const textPrimary = resolvedTheme === 'dark' ? 'text-white' : 'text-slate-900';
    const textSecondary = resolvedTheme === 'dark' ? 'text-slate-400' : 'text-slate-600';
    const codeBg = resolvedTheme === 'dark' ? 'bg-slate-800' : 'bg-slate-100';
    const borderColor = resolvedTheme === 'dark' ? 'border-slate-700' : 'border-slate-200';

    const endpoints = [
        {
            method: 'POST',
            path: '/api/v1/auth/phone/send-code',
            description: t('docs.content.sendPhoneCode'),
        },
        {
            method: 'POST',
            path: '/api/v1/auth/phone/verify',
            description: t('docs.content.verifyPhoneCode'),
        },
        {
            method: 'POST',
            path: '/api/v1/auth/email/send-code',
            description: t('docs.content.sendEmailCode'),
        },
        {
            method: 'POST',
            path: '/api/v1/auth/email/verify',
            description: t('docs.content.verifyEmailCode'),
        },
        {
            method: 'GET',
            path: '/api/v1/auth/google',
            description: t('docs.content.googleLogin'),
        },
        {
            method: 'POST',
            path: '/api/v1/auth/logout',
            description: t('docs.content.logout'),
        },
    ];

    return (
        <div className="space-y-6">
            <h2 className={`text-xl font-bold ${textPrimary}`}>{t('docs.authentication')}</h2>
            <p className={textSecondary}>{t('docs.authenticationDesc')}</p>

            {/* Endpoints Table */}
            <div className={`border ${borderColor} rounded-lg overflow-hidden`}>
                <table className="w-full text-sm">
                    <thead className={codeBg}>
                        <tr>
                            <th className={`px-4 py-3 text-left font-medium ${textPrimary}`}>Method</th>
                            <th className={`px-4 py-3 text-left font-medium ${textPrimary}`}>Endpoint</th>
                            <th className={`px-4 py-3 text-left font-medium ${textPrimary} hidden md:table-cell`}>{t('docs.content.description')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {endpoints.map((endpoint, index) => (
                            <tr key={index} className={`border-t ${borderColor}`}>
                                <td className="px-4 py-3">
                                    <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${endpoint.method === 'POST'
                                            ? 'bg-green-500/20 text-green-500'
                                            : 'bg-blue-500/20 text-blue-500'
                                        }`}>
                                        {endpoint.method}
                                    </span>
                                </td>
                                <td className={`px-4 py-3 font-mono text-xs ${textSecondary}`}>
                                    {endpoint.path}
                                </td>
                                <td className={`px-4 py-3 ${textSecondary} hidden md:table-cell`}>
                                    {endpoint.description}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Example Request */}
            <div className="space-y-3">
                <h3 className={`text-lg font-semibold ${textPrimary}`}>
                    {t('docs.content.exampleRequest')}
                </h3>
                <div className={`${codeBg} rounded-lg p-4 overflow-x-auto`}>
                    <pre className="text-xs text-slate-600 dark:text-slate-400">
                        {`curl -X POST 'https://sso.55387.xyz/api/v1/auth/phone/send-code' \\
  -H 'Content-Type: application/json' \\
  -H 'X-Client-Id: your-client-id' \\
  -d '{
    "phone": "+8613800138000"
  }'`}
                    </pre>
                </div>
            </div>
        </div>
    );
}
