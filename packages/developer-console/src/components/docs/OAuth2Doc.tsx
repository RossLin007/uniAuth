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
                    API 端点
                </h3>
                <div className={`${codeBg} rounded-lg p-4 overflow-x-auto`}>
                    <table className="text-sm w-full">
                        <thead>
                            <tr className={textSecondary}>
                                <th className="text-left py-1">端点</th>
                                <th className="text-left py-1">URL</th>
                            </tr>
                        </thead>
                        <tbody className="text-slate-600 dark:text-slate-400">
                            <tr>
                                <td className="py-1">授权端点</td>
                                <td className="py-1"><code>/api/v1/oauth2/authorize</code></td>
                            </tr>
                            <tr>
                                <td className="py-1">Token 端点</td>
                                <td className="py-1"><code>/api/v1/oauth2/token</code></td>
                            </tr>
                            <tr>
                                <td className="py-1">用户信息</td>
                                <td className="py-1"><code>/api/v1/oauth2/userinfo</code></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            {/* SSO Client SDK */}
            <div className="space-y-3">
                <h3 className={`text-lg font-semibold ${textPrimary}`}>
                    方式一：前端 SDK（Public Client）
                </h3>
                <p className={textSecondary}>适用于纯前端应用，无需 client_secret</p>

                <div className={`${codeBg} rounded-lg p-4 overflow-x-auto`}>
                    <pre className="text-xs text-slate-600 dark:text-slate-400">
                        {`import { UniAuthClient } from '@55387.ai/uniauth-client';

const auth = new UniAuthClient({
    baseUrl: 'https://sso.55387.xyz',
    clientId: 'your-client-id',
});

// 配置 SSO
auth.configureSso({
    ssoUrl: 'https://sso.55387.xyz',
    clientId: 'your-client-id',
    redirectUri: window.location.origin + '/callback',
    scope: 'openid profile email phone',
});

// 触发 SSO 登录
auth.loginWithSSO();

// 在回调页面处理
if (auth.isSSOCallback()) {
    const result = await auth.handleSSOCallback();
    // result.access_token, result.refresh_token
}`}
                    </pre>
                </div>
                <div className={`bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3`}>
                    <p className="text-sm text-yellow-800 dark:text-yellow-200">
                        <strong>注意：</strong>应用需在管理后台配置为 Public Client
                    </p>
                </div>
            </div>

            {/* Backend Proxy Flow */}
            <div className="space-y-3">
                <h3 className={`text-lg font-semibold ${textPrimary}`}>
                    方式二：后端代理登录（Confidential Client，推荐）
                </h3>
                <p className={textSecondary}>适用于有后端服务的应用，client_secret 存储在服务端</p>

                <div className={`${codeBg} rounded-lg p-4 overflow-x-auto`}>
                    <pre className="text-xs text-slate-600 dark:text-slate-400">
                        {`// 后端 - 生成授权 URL
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
    
    // 存储到 httpOnly Cookie
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
                    前端调用
                </h3>
                <div className={`${codeBg} rounded-lg p-4 overflow-x-auto`}>
                    <pre className="text-xs text-slate-600 dark:text-slate-400">
                        {`// 触发登录
const handleLogin = () => {
    window.location.href = '/api/auth/login';
};

// 检查登录状态
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
                    常见问题
                </h3>
                <div className={`${codeBg} rounded-lg p-4 space-y-3`}>
                    <div>
                        <p className={`text-sm font-medium ${textPrimary}`}>invalid_client 错误</p>
                        <p className="text-xs text-slate-600 dark:text-slate-400">检查 client_id 是否正确，redirect_uri 是否在后台注册</p>
                    </div>
                    <div>
                        <p className={`text-sm font-medium ${textPrimary}`}>Client authentication failed</p>
                        <p className="text-xs text-slate-600 dark:text-slate-400">前端直接调用 Token 端点需配置为 Public Client，否则需通过后端代理</p>
                    </div>
                    <div>
                        <p className={`text-sm font-medium ${textPrimary}`}>404 错误</p>
                        <p className="text-xs text-slate-600 dark:text-slate-400">确认使用正确的端点：/api/v1/oauth2/authorize（注意 v1 和 oauth2）</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
