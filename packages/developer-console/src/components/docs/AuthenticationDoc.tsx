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
            auth: '❌',
            description: t('docs.content.sendPhoneCode'),
        },
        {
            method: 'POST',
            path: '/api/v1/auth/phone/verify',
            auth: '❌',
            description: t('docs.content.verifyPhoneCode'),
        },
        {
            method: 'POST',
            path: '/api/v1/auth/email/register',
            auth: '❌',
            description: t('docs.content.emailRegister'),
        },
        {
            method: 'POST',
            path: '/api/v1/auth/email/login',
            auth: '❌',
            description: t('docs.content.emailLogin'),
        },
        {
            method: 'POST',
            path: '/api/v1/auth/email/send-code',
            auth: '❌',
            description: t('docs.content.sendEmailCode'),
        },
        {
            method: 'POST',
            path: '/api/v1/auth/email/verify',
            auth: '❌',
            description: t('docs.content.verifyEmailCode'),
        },
        {
            method: 'GET',
            path: '/api/v1/auth/oauth/:provider/authorize',
            auth: '❌',
            description: t('docs.content.socialLogin'),
        },
        {
            method: 'POST',
            path: '/api/v1/auth/mfa/verify-login',
            auth: '❌',
            description: t('docs.content.mfaVerify'),
        },
        {
            method: 'POST',
            path: '/api/v1/auth/refresh',
            auth: '❌',
            description: t('docs.content.refreshToken'),
        },
        {
            method: 'POST',
            path: '/api/v1/auth/verify',
            auth: '🔑',
            description: t('docs.content.verifyToken'),
        },
        {
            method: 'POST',
            path: '/api/v1/auth/logout',
            auth: '🔒',
            description: t('docs.content.logout'),
        },
        {
            method: 'POST',
            path: '/api/v1/auth/logout-all',
            auth: '🔒',
            description: t('docs.content.logoutAll'),
        },
    ];

    return (
        <div className="space-y-6">
            <h2 className={`text-xl font-bold ${textPrimary}`}>{t('docs.authentication')}</h2>
            <p className={textSecondary}>{t('docs.authenticationDesc')}</p>

            {/* Auth Legend */}
            <div className={`text-xs ${textSecondary} flex gap-4`}>
                <span>❌ = No auth</span>
                <span>🔒 = Bearer token</span>
                <span>🔑 = App Key/Secret</span>
            </div>

            {/* Endpoints Table */}
            <div className={`border ${borderColor} rounded-lg overflow-hidden`}>
                <table className="w-full text-sm">
                    <thead className={codeBg}>
                        <tr>
                            <th className={`px-4 py-3 text-left font-medium ${textPrimary}`}>Method</th>
                            <th className={`px-4 py-3 text-left font-medium ${textPrimary}`}>Endpoint</th>
                            <th className={`px-4 py-3 text-center font-medium ${textPrimary} hidden sm:table-cell`}>Auth</th>
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
                                <td className={`px-4 py-3 text-center hidden sm:table-cell`}>
                                    {endpoint.auth}
                                </td>
                                <td className={`px-4 py-3 ${textSecondary} hidden md:table-cell`}>
                                    {endpoint.description}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Example: Phone Login */}
            <div className="space-y-3">
                <h3 className={`text-lg font-semibold ${textPrimary}`}>
                    📱 {t('docs.content.phoneLoginExample')}
                </h3>
                <div className={`${codeBg} rounded-lg p-4 overflow-x-auto`}>
                    <pre className="text-xs text-slate-600 dark:text-slate-400">
                        {`curl -X POST 'https://sso.55387.xyz/api/v1/auth/phone/send-code' \\
  -H 'Content-Type: application/json' \\
  -d '{
    "phone": "+8613800138000"
  }'`}
                    </pre>
                </div>
            </div>

            {/* Example: Email Login */}
            <div className="space-y-3">
                <h3 className={`text-lg font-semibold ${textPrimary}`}>
                    📧 {t('docs.content.emailLoginExample')}
                </h3>
                <div className={`${codeBg} rounded-lg p-4 overflow-x-auto`}>
                    <pre className="text-xs text-slate-600 dark:text-slate-400">
                        {`curl -X POST 'https://sso.55387.xyz/api/v1/auth/email/login' \\
  -H 'Content-Type: application/json' \\
  -d '{
    "email": "user@example.com",
    "password": "your-password"
  }'`}
                    </pre>
                </div>
            </div>

            {/* Example: Social Login */}
            <div className="space-y-3">
                <h3 className={`text-lg font-semibold ${textPrimary}`}>
                    🌐 {t('docs.content.socialLoginExample')}
                </h3>
                <div className={`${codeBg} rounded-lg p-4 overflow-x-auto`}>
                    <pre className="text-xs text-slate-600 dark:text-slate-400">
                        {`# Google Login (redirect)
GET https://sso.55387.xyz/api/v1/auth/oauth/google/authorize
  ?redirect_uri=https://your-app.com/callback

# GitHub Login
GET https://sso.55387.xyz/api/v1/auth/oauth/github/authorize
  ?redirect_uri=https://your-app.com/callback`}
                    </pre>
                </div>
            </div>
        </div>
    );
}
