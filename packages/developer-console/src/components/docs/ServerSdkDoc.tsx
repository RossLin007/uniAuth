import { useTranslation } from 'react-i18next';
import { useTheme } from '@/contexts/ThemeContext';
import { API_BASE_URL } from '@/config/api';

export default function ServerSdkDoc() {
    const { t } = useTranslation();
    const { resolvedTheme } = useTheme();

    const textPrimary = resolvedTheme === 'dark' ? 'text-white' : 'text-slate-900';
    const textSecondary = resolvedTheme === 'dark' ? 'text-slate-400' : 'text-slate-600';
    const codeBg = resolvedTheme === 'dark' ? 'bg-slate-800' : 'bg-slate-100';
    const noteBg = resolvedTheme === 'dark' ? 'bg-blue-900/30 border-blue-500/50' : 'bg-blue-50 border-blue-200';

    return (
        <div className="space-y-6">
            <h2 className={`text-xl font-bold ${textPrimary}`}>{t('docs.serverSdk')}</h2>
            <p className={textSecondary}>{t('docs.serverSdkDesc')}</p>

            {/* Architecture Overview */}
            <div className={`${noteBg} border rounded-lg p-4`}>
                <h4 className={`font-semibold mb-2 ${textPrimary}`}>
                    🏗️ Architecture Overview / 架构概览
                </h4>
                <div className={`text-sm ${textSecondary} space-y-2`}>
                    <p><strong>Frontend (React/Vue):</strong> <code className="text-blue-500">@55387.ai/uniauth-client</code> → SSO Login → Get accessToken</p>
                    <p><strong>Backend (Node.js):</strong> <code className="text-blue-500">@55387.ai/uniauth-server</code> → Verify accessToken → Protect APIs</p>
                </div>
            </div>

            {/* Step 1: Install SDK */}
            <div className="space-y-3">
                <h3 className={`text-lg font-semibold ${textPrimary}`}>
                    1. {t('docs.content.serverInstall')}
                </h3>
                <div className={`${codeBg} rounded-lg p-4`}>
                    <code className="text-sm text-blue-500 dark:text-blue-400">
                        pnpm add @55387.ai/uniauth-server
                    </code>
                </div>
            </div>

            {/* Step 2: Initialize */}
            <div className="space-y-3">
                <h3 className={`text-lg font-semibold ${textPrimary}`}>
                    2. {t('docs.content.serverInit')}
                </h3>
                <div className={`${codeBg} rounded-lg p-4 overflow-x-auto`}>
                    <pre className="text-xs text-slate-600 dark:text-slate-400">
                        {`import { UniAuthServer } from '@55387.ai/uniauth-server';

const auth = new UniAuthServer({
    baseUrl: '${API_BASE_URL}',
    clientId: 'your-client-id',
    clientSecret: 'your-client-secret',
});`}
                    </pre>
                </div>
            </div>

            {/* Step 3: Express Middleware */}
            <div className="space-y-3">
                <h3 className={`text-lg font-semibold ${textPrimary}`}>
                    3. {t('docs.content.expressMiddleware')}
                </h3>
                <div className={`${codeBg} rounded-lg p-4 overflow-x-auto`}>
                    <pre className="text-xs text-slate-600 dark:text-slate-400">
                        {`import express from 'express';
import { UniAuthServer } from '@55387.ai/uniauth-server';

const app = express();
const auth = new UniAuthServer({ /* config */ });

// Protect all /api/* routes
app.use('/api/*', auth.middleware());

// Access user info in protected routes
app.get('/api/profile', (req, res) => {
    // req.user contains user info
    // req.authPayload contains token claims
    res.json({ 
        user: req.user, 
        payload: req.authPayload 
    });
});`}
                    </pre>
                </div>
            </div>

            {/* Step 4: Hono Middleware */}
            <div className="space-y-3">
                <h3 className={`text-lg font-semibold ${textPrimary}`}>
                    4. {t('docs.content.honoMiddleware')}
                </h3>
                <div className={`${codeBg} rounded-lg p-4 overflow-x-auto`}>
                    <pre className="text-xs text-slate-600 dark:text-slate-400">
                        {`import { Hono } from 'hono';
import { UniAuthServer } from '@55387.ai/uniauth-server';

const app = new Hono();
const auth = new UniAuthServer({ /* config */ });

// Protect routes
app.use('/api/*', auth.honoMiddleware());

// Access user
app.get('/api/profile', (c) => {
    const user = c.get('user');
    return c.json({ user });
});`}
                    </pre>
                </div>
            </div>

            {/* Step 5: Local Verification (Optional) */}
            <div className="space-y-3">
                <h3 className={`text-lg font-semibold ${textPrimary}`}>
                    5. {t('docs.content.localVerification')} (Optional)
                </h3>
                <div className={`${noteBg} border rounded-lg p-4`}>
                    <p className={`text-sm ${textSecondary}`}>
                        🔐 Access Tokens are signed with <strong>RS256</strong> (asymmetric).
                        For high-performance scenarios, you can verify tokens locally using the public key.
                        <br />
                        访问令牌使用 <strong>RS256</strong> 非对称签名。高性能场景下可使用公钥本地验证。
                    </p>
                </div>
                <div className={`${codeBg} rounded-lg p-4 overflow-x-auto`}>
                    <pre className="text-xs text-slate-600 dark:text-slate-400">
                        {`import { UniAuthServer } from '@55387.ai/uniauth-server';

// Option 1: Remote verification (default, simpler)
// 方式一：远程验证（默认，更简单）
const auth = new UniAuthServer({
    baseUrl: '${API_BASE_URL}',
    clientId: 'your-client-id',
    clientSecret: 'your-client-secret',
});

// Option 2: Local verification with JWKS public key (faster)
// 方式二：使用 JWKS 公钥本地验证（更快）
async function initAuthWithLocalVerify() {
    // Fetch JWKS from SSO
    const jwksUrl = '${API_BASE_URL}/.well-known/jwks.json';
    const jwks = await fetch(jwksUrl).then(r => r.json());
    
    // Convert JWK to PEM (using jose library)
    const { importJWK, exportSPKI } = await import('jose');
    const publicKey = await importJWK(jwks.keys[0], 'RS256');
    const pem = await exportSPKI(publicKey);
    
    return new UniAuthServer({
        baseUrl: '${API_BASE_URL}',
        clientId: 'your-client-id',
        clientSecret: 'your-client-secret',
        jwtPublicKey: pem, // Enable local RS256 verification
    });
}`}
                    </pre>
                </div>
            </div>

            {/* Step 6: Token Introspection */}
            <div className="space-y-3">
                <h3 className={`text-lg font-semibold ${textPrimary}`}>
                    6. {t('docs.content.tokenIntrospection')}
                </h3>
                <div className={`${codeBg} rounded-lg p-4 overflow-x-auto`}>
                    <pre className="text-xs text-slate-600 dark:text-slate-400">
                        {`// Introspect token (RFC 7662 standard)
const result = await auth.introspectToken(accessToken);

if (result.active) {
    console.log('Token active');
    console.log('User:', result.sub);
    console.log('Scope:', result.scope);
} else {
    console.log('Token expired or invalid');
}`}
                    </pre>
                </div>
            </div>

            {/* Step 7: Error Handling */}
            <div className="space-y-3">
                <h3 className={`text-lg font-semibold ${textPrimary}`}>
                    7. {t('docs.content.errorHandling')}
                </h3>
                <div className={`${codeBg} rounded-lg p-4 overflow-x-auto`}>
                    <pre className="text-xs text-slate-600 dark:text-slate-400">
                        {`import { ServerAuthError, ServerErrorCode } from '@55387.ai/uniauth-server';

try {
    await auth.verifyToken(token);
} catch (error) {
    if (error instanceof ServerAuthError) {
        switch (error.code) {
            case ServerErrorCode.INVALID_TOKEN:
                // Handle invalid token
                break;
            case ServerErrorCode.TOKEN_EXPIRED:
                // Handle expired token
                break;
        }
    }
}`}
                    </pre>
                </div>
            </div>

            {/* Full Integration Example */}
            <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                <h3 className={`text-lg font-bold ${textPrimary}`}>
                    🔗 Full Integration Example / 完整集成示例
                </h3>
                <p className={`text-sm ${textSecondary}`}>
                    Frontend + Backend working together (e.g., Morning Reader project)
                </p>

                {/* Frontend Code */}
                <div className="space-y-2">
                    <h4 className={`font-semibold ${textPrimary}`}>Frontend (React)</h4>
                    <div className={`${codeBg} rounded-lg p-4 overflow-x-auto`}>
                        <pre className="text-xs text-slate-600 dark:text-slate-400">
                            {`// src/lib/auth.ts
import { UniAuth } from '@55387.ai/uniauth-client';

export const auth = new UniAuth({
    clientId: 'morning-reader-client',
    baseUrl: '${API_BASE_URL}'
});

// src/components/Login.tsx
const handleLogin = async () => {
    await auth.sendPhoneCode('+8613800138000');
    const result = await auth.loginWithPhoneCode(phone, code);
    
    // Store token for API calls
    localStorage.setItem('accessToken', result.accessToken);
};

// src/api/client.ts
export const apiClient = {
    async fetchProfile() {
        const token = localStorage.getItem('accessToken');
        return fetch('/api/profile', {
            headers: {
                'Authorization': \`Bearer \${token}\`
            }
        });
    }
};`}
                        </pre>
                    </div>
                </div>

                {/* Backend Code */}
                <div className="space-y-2">
                    <h4 className={`font-semibold ${textPrimary}`}>Backend (Express/Hono)</h4>
                    <div className={`${codeBg} rounded-lg p-4 overflow-x-auto`}>
                        <pre className="text-xs text-slate-600 dark:text-slate-400">
                            {`// src/server.ts
import express from 'express';
import { UniAuthServer } from '@55387.ai/uniauth-server';

const app = express();
const auth = new UniAuthServer({
    baseUrl: '${API_BASE_URL}',
    clientId: process.env.UNIAUTH_CLIENT_ID!,
    clientSecret: process.env.UNIAUTH_CLIENT_SECRET!,
});

// Protect API routes
app.use('/api/*', auth.middleware());

// Get user profile
app.get('/api/profile', (req, res) => {
    // req.user is populated by middleware
    res.json({
        id: req.user?.id,
        phone: req.user?.phone,
        email: req.user?.email,
        nickname: req.user?.nickname,
    });
});

// Get user's reading list
app.get('/api/readings', async (req, res) => {
    const userId = req.user?.id;
    const readings = await db.readings.findMany({
        where: { userId }
    });
    res.json(readings);
});

app.listen(3001);`}
                        </pre>
                    </div>
                </div>
            </div>

            {/* Available Methods Table */}
            <div className="space-y-3">
                <h3 className={`text-lg font-semibold ${textPrimary}`}>
                    {t('docs.content.availableMethods')}
                </h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className={codeBg}>
                            <tr>
                                <th className={`px-4 py-2 text-left ${textPrimary}`}>Method</th>
                                <th className={`px-4 py-2 text-left ${textPrimary}`}>Description</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr className="border-b border-slate-200 dark:border-slate-700">
                                <td className="px-4 py-2"><code className="text-blue-500">verifyToken(token)</code></td>
                                <td className={`px-4 py-2 ${textSecondary}`}>Verify access token / 验证访问令牌</td>
                            </tr>
                            <tr className="border-b border-slate-200 dark:border-slate-700">
                                <td className="px-4 py-2"><code className="text-blue-500">introspectToken(token)</code></td>
                                <td className={`px-4 py-2 ${textSecondary}`}>RFC 7662 Token Introspection / 令牌内省</td>
                            </tr>
                            <tr className="border-b border-slate-200 dark:border-slate-700">
                                <td className="px-4 py-2"><code className="text-blue-500">isTokenActive(token)</code></td>
                                <td className={`px-4 py-2 ${textSecondary}`}>Check if token is active / 检查令牌是否有效</td>
                            </tr>
                            <tr className="border-b border-slate-200 dark:border-slate-700">
                                <td className="px-4 py-2"><code className="text-blue-500">getUser(userId)</code></td>
                                <td className={`px-4 py-2 ${textSecondary}`}>Get user info / 获取用户信息</td>
                            </tr>
                            <tr className="border-b border-slate-200 dark:border-slate-700">
                                <td className="px-4 py-2"><code className="text-blue-500">middleware()</code></td>
                                <td className={`px-4 py-2 ${textSecondary}`}>Express/Connect middleware / Express 中间件</td>
                            </tr>
                            <tr className="border-b border-slate-200 dark:border-slate-700">
                                <td className="px-4 py-2"><code className="text-blue-500">honoMiddleware()</code></td>
                                <td className={`px-4 py-2 ${textSecondary}`}>Hono middleware / Hono 中间件</td>
                            </tr>
                            <tr>
                                <td className="px-4 py-2"><code className="text-blue-500">clearCache()</code></td>
                                <td className={`px-4 py-2 ${textSecondary}`}>Clear token cache / 清除令牌缓存</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
