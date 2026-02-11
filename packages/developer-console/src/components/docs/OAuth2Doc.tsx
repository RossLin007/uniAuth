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

            {/* API Endpoints */}
            <div className="space-y-3">
                <h3 className={`text-lg font-semibold ${textPrimary}`}>
                    {t('docs.content.oauth2Endpoints')}
                </h3>
                <div className={`${codeBg} rounded-lg p-4 overflow-x-auto`}>
                    <table className="text-sm w-full">
                        <thead>
                            <tr className={textSecondary}>
                                <th className="text-left py-1">{t('docs.content.oauth2Endpoint')}</th>
                                <th className="text-left py-1">{t('docs.content.oauth2Url')}</th>
                            </tr>
                        </thead>
                        <tbody className="text-slate-600 dark:text-slate-400">
                            <tr>
                                <td className="py-1">{t('docs.content.oauth2AuthEndpoint')}</td>
                                <td className="py-1"><code>/api/v1/oauth2/authorize</code></td>
                            </tr>
                            <tr>
                                <td className="py-1">{t('docs.content.oauth2TokenEndpoint')}</td>
                                <td className="py-1"><code>/api/v1/oauth2/token</code></td>
                            </tr>
                            <tr>
                                <td className="py-1">{t('docs.content.oauth2UserinfoEndpoint')}</td>
                                <td className="py-1"><code>/api/v1/oauth2/userinfo</code></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            {/* SSO Client SDK */}
            <div className="space-y-3">
                <h3 className={`text-lg font-semibold ${textPrimary}`}>
                    {t('docs.content.oauth2PublicClient')}
                </h3>
                <p className={textSecondary}>{t('docs.content.oauth2PublicClientDesc')}</p>

                <div className={`${codeBg} rounded-lg p-4 overflow-x-auto`}>
                    <pre className="text-xs text-slate-600 dark:text-slate-400">
                        {`import { UniAuthClient } from '@55387.ai/uniauth-client';

const auth = new UniAuthClient({
    baseUrl: 'https://sso.55387.xyz',
    clientId: 'your-client-id',
});

// Configure SSO / 配置 SSO
auth.configureSso({
    ssoUrl: 'https://sso.55387.xyz',
    clientId: 'your-client-id',
    redirectUri: window.location.origin + '/callback',
    scope: 'openid profile email phone',
});

// Trigger SSO login / 触发 SSO 登录
auth.loginWithSSO();

// Handle callback / 在回调页面处理
if (auth.isSSOCallback()) {
    const result = await auth.handleSSOCallback();
    // result.access_token, result.refresh_token
}`}
                    </pre>
                </div>
                <div className={`bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3`}>
                    <p className="text-sm text-yellow-800 dark:text-yellow-200">
                        <strong>⚠️</strong> {t('docs.content.oauth2PublicClientNote')}
                    </p>
                </div>
            </div>

            {/* Backend Proxy Flow */}
            <div className="space-y-3">
                <h3 className={`text-lg font-semibold ${textPrimary}`}>
                    {t('docs.content.oauth2ConfidentialClient')}
                </h3>
                <p className={textSecondary}>{t('docs.content.oauth2ConfidentialClientDesc')}</p>

                <div className={`${codeBg} rounded-lg p-4 overflow-x-auto`}>
                    <pre className="text-xs text-slate-600 dark:text-slate-400">
                        {`// Backend - Generate authorization URL
// 后端 - 生成授权 URL
app.get('/api/auth/login', (c) => {
    const params = new URLSearchParams({
        client_id: process.env.CLIENT_ID,
        redirect_uri: origin + '/api/auth/callback',
        response_type: 'code',
        scope: 'openid profile email phone',
        state: generateRandomState(),
    });
    return c.redirect(\`https://sso.55387.xyz/api/v1/oauth2/authorize?\${params}\`);
});

// Backend - Handle callback, exchange Token
// 后端 - 处理回调，交换 Token
app.get('/api/auth/callback', async (c) => {
    const code = c.req.query('code');
    
    const response = await fetch('https://sso.55387.xyz/api/v1/oauth2/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            client_id: process.env.CLIENT_ID,
            client_secret: process.env.CLIENT_SECRET,
            code,
            grant_type: 'authorization_code',
            redirect_uri: origin + '/api/auth/callback',
        }),
    });
    
    const { access_token, id_token } = await response.json();
    
    // Store in httpOnly Cookie / 存储到 httpOnly Cookie
    setCookie(c, 'auth_token', id_token, {
        httpOnly: true,
        secure: true,
        sameSite: 'Lax',
        maxAge: 60 * 60 * 24 * 7,
    });
    
    return c.redirect('/');
});`}
                    </pre>
                </div>
            </div>

            {/* Frontend Call */}
            <div className="space-y-3">
                <h3 className={`text-lg font-semibold ${textPrimary}`}>
                    {t('docs.content.oauth2FrontendCall')}
                </h3>
                <div className={`${codeBg} rounded-lg p-4 overflow-x-auto`}>
                    <pre className="text-xs text-slate-600 dark:text-slate-400">
                        {`// Trigger login / 触发登录
const handleLogin = () => {
    window.location.href = '/api/auth/login';
};

// Check auth status / 检查登录状态
const checkAuth = async () => {
    const response = await fetch('/api/auth/status', { credentials: 'include' });
    const data = await response.json();
    return data.authenticated;
};`}
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
const response = await fetch('https://sso.55387.xyz/api/v1/oauth2/token', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
    },
    body: JSON.stringify({
        grant_type: 'client_credentials',
        client_id: 'your-m2m-client-id',
        client_secret: 'your-m2m-client-secret',
        scope: 'read:users write:users'
    })
});`}
                    </pre>
                </div>
            </div>

            {/* Troubleshooting */}
            <div className="space-y-3">
                <h3 className={`text-lg font-semibold ${textPrimary}`}>
                    {t('docs.content.oauth2Troubleshooting')}
                </h3>
                <div className={`${codeBg} rounded-lg p-4 space-y-3`}>
                    <div>
                        <p className={`text-sm font-medium ${textPrimary}`}>{t('docs.content.oauth2InvalidClient')}</p>
                        <p className="text-xs text-slate-600 dark:text-slate-400">{t('docs.content.oauth2InvalidClientFix')}</p>
                    </div>
                    <div>
                        <p className={`text-sm font-medium ${textPrimary}`}>{t('docs.content.oauth2AuthFailed')}</p>
                        <p className="text-xs text-slate-600 dark:text-slate-400">{t('docs.content.oauth2AuthFailedFix')}</p>
                    </div>
                    <div>
                        <p className={`text-sm font-medium ${textPrimary}`}>{t('docs.content.oauth2NotFound')}</p>
                        <p className="text-xs text-slate-600 dark:text-slate-400">{t('docs.content.oauth2NotFoundFix')}</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
