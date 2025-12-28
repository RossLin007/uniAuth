import { useTranslation } from 'react-i18next';
import { useTheme } from '@/contexts/ThemeContext';

export default function OAuth2Doc() {
    const { t } = useTranslation();
    const { resolvedTheme } = useTheme();

    const textPrimary = resolvedTheme === 'dark' ? 'text-white' : 'text-slate-900';
    const textSecondary = resolvedTheme === 'dark' ? 'text-slate-400' : 'text-slate-600';
    const codeBg = resolvedTheme === 'dark' ? 'bg-slate-800' : 'bg-slate-100';

    return (
        <div className="space-y-6">
            <h2 className={`text-xl font-bold ${textPrimary}`}>{t('docs.oauth2')}</h2>
            <p className={textSecondary}>{t('docs.oauth2Desc')}</p>

            {/* Authorization Code Flow */}
            <div className="space-y-3">
                <h3 className={`text-lg font-semibold ${textPrimary}`}>
                    {t('docs.content.authCodeFlow')}
                </h3>
                <p className={textSecondary}>{t('docs.content.authCodeFlowDesc')}</p>

                <div className={`${codeBg} rounded-lg p-4 overflow-x-auto`}>
                    <pre className="text-xs text-slate-600 dark:text-slate-400">
                        {`// Step 1: Redirect user to authorization endpoint
const authUrl = \`\${baseUrl}/api/v1/oauth/authorize?\` + new URLSearchParams({
    client_id: 'your-client-id',
    redirect_uri: 'https://your-app.com/callback',
    response_type: 'code',
    scope: 'openid profile email',
    state: 'random-state-string'
});

window.location.href = authUrl;`}
                    </pre>
                </div>
            </div>

            {/* Token Exchange */}
            <div className="space-y-3">
                <h3 className={`text-lg font-semibold ${textPrimary}`}>
                    {t('docs.content.tokenExchange')}
                </h3>
                <div className={`${codeBg} rounded-lg p-4 overflow-x-auto`}>
                    <pre className="text-xs text-slate-600 dark:text-slate-400">
                        {`// Step 2: Exchange code for tokens (server-side)
const response = await fetch(\`\${baseUrl}/api/v1/oauth/token\`, {
    method: 'POST',
    headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: 'received-auth-code',
        redirect_uri: 'https://your-app.com/callback',
        client_id: 'your-client-id',
        client_secret: 'your-client-secret'
    })
});

const { access_token, id_token, refresh_token } = await response.json();`}
                    </pre>
                </div>
            </div>

            {/* Client Credentials Flow */}
            <div className="space-y-3">
                <h3 className={`text-lg font-semibold ${textPrimary}`}>
                    {t('docs.content.clientCredentials')}
                </h3>
                <p className={textSecondary}>{t('docs.content.clientCredentialsDesc')}</p>
                <div className={`${codeBg} rounded-lg p-4 overflow-x-auto`}>
                    <pre className="text-xs text-slate-600 dark:text-slate-400">
                        {`// M2M Authentication
const response = await fetch(\`\${baseUrl}/api/v1/oauth/token\`, {
    method: 'POST',
    headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: 'your-m2m-client-id',
        client_secret: 'your-m2m-client-secret',
        scope: 'read:users write:users'
    })
});`}
                    </pre>
                </div>
            </div>
        </div>
    );
}
