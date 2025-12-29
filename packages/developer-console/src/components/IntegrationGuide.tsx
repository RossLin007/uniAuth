import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Copy, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/contexts/ToastContext';

interface IntegrationGuideProps {
    clientId: string;
    clientSecret: string;
    appType: string;
}

export function IntegrationGuide({ clientId, clientSecret, appType }: IntegrationGuideProps) {
    const { t } = useTranslation();
    const toast = useToast();
    const [copied, setCopied] = useState<string | null>(null);
    const [expanded, setExpanded] = useState(true);

    const apiBaseUrl = 'https://your-uniauth-server.com'; // TODO: Use env

    const copyToClipboard = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopied(id);
        toast.success(t('common.copied'));
        setTimeout(() => setCopied(null), 2000);
    };

    const CodeBlock = ({ code, id }: { code: string; id: string }) => (
        <div className="relative group">
            <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg overflow-x-auto text-sm">
                <code>{code}</code>
            </pre>
            <Button
                size="sm"
                variant="ghost"
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-white"
                onClick={() => copyToClipboard(code, id)}
            >
                {copied === id ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
        </div>
    );

    // SDK Installation
    const installCode = `npm install @55387.ai/uniauth-client
# 或者
pnpm add @55387.ai/uniauth-client`;

    // Frontend Quick Start
    const frontendCode = `import { UniAuthClient } from '@55387.ai/uniauth-client';

// 初始化客户端 (前端)
const uniauth = new UniAuthClient({
    apiUrl: '${apiBaseUrl}',
    clientId: '${clientId}',
});

// ========== 手机号登录 ==========
// 1. 发送验证码
await uniauth.sendPhoneCode('+8613800138000', 'login');

// 2. 验证登录
const result = await uniauth.loginWithPhone('+8613800138000', '123456');
if (result.success) {
    console.log('登录成功:', result.data.access_token);
}

// ========== 邮箱登录 ==========
await uniauth.sendEmailCode('user@example.com', 'login');
const emailResult = await uniauth.loginWithEmailCode('user@example.com', '123456');

// ========== OAuth 跳转登录 ==========
const authUrl = uniauth.getAuthorizeUrl(
    'https://your-app.com/callback',
    'openid profile email'
);
window.location.href = authUrl;`;

    // Backend M2M Code
    const backendCode = `import { UniAuthClient } from '@55387.ai/uniauth-client';

// 初始化客户端 (后端 M2M)
const uniauth = new UniAuthClient({
    apiUrl: '${apiBaseUrl}',
    clientId: '${clientId}',
    clientSecret: '${clientSecret}', // ⚠️ 仅后端使用
});

// ========== M2M 认证 (服务间调用) ==========
const tokenResult = await uniauth.loginWithClientCredentials(['read:users', 'write:data']);
console.log('M2M Token:', tokenResult.access_token);

// ========== Token 验证 ==========
const introspection = await uniauth.introspectToken(someAccessToken);
if (introspection.active) {
    console.log('Token 有效, 用户ID:', introspection.sub);
}`;

    // OAuth Callback Handler
    const callbackCode = `// OAuth2 回调处理 (后端路由)
app.get('/callback', async (req, res) => {
    const { code, state } = req.query;
    
    // 使用授权码换取 Token
    const response = await fetch('${apiBaseUrl}/api/v1/oauth2/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            grant_type: 'authorization_code',
            code: code,
            redirect_uri: 'https://your-app.com/callback',
            client_id: '${clientId}',
            client_secret: '${clientSecret}',
        }),
    });
    
    const tokens = await response.json();
    // 存储 tokens.access_token 和 tokens.refresh_token
    res.redirect('/dashboard');
});`;

    // Webhook Handler
    const webhookCode = `import crypto from 'crypto';

// Webhook 接收端点
app.post('/webhooks/uniauth', (req, res) => {
    const signature = req.headers['x-uniauth-signature'];
    const payload = JSON.stringify(req.body);
    
    // 验证签名
    const expected = crypto
        .createHmac('sha256', 'your-webhook-secret')
        .update(payload)
        .digest('hex');
    
    if (signature !== \`sha256=\${expected}\`) {
        return res.status(401).send('Invalid signature');
    }
    
    // 处理事件
    const { event, data } = req.body;
    switch (event) {
        case 'user.created':
            console.log('新用户注册:', data.user.email);
            break;
        case 'user.login':
            console.log('用户登录:', data.user_id);
            break;
    }
    
    res.status(200).send('OK');
});`;

    return (
        <div className="space-y-4">
            <button
                onClick={() => setExpanded(!expanded)}
                className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400"
            >
                {expanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                📖 {t('integration.title')}
            </button>

            {expanded && (
                <div className="space-y-6 pl-2 border-l-2 border-blue-500/50">
                    {/* Step 1: Installation */}
                    <div className="space-y-2">
                        <h4 className="font-medium text-slate-900 dark:text-white">1️⃣ {t('integration.installSdk')}</h4>
                        <CodeBlock code={installCode} id="install" />
                    </div>

                    {/* Step 2: Frontend */}
                    <div className="space-y-2">
                        <h4 className="font-medium text-slate-900 dark:text-white">2️⃣ {t('integration.frontend')}</h4>
                        <p className="text-sm text-orange-600 dark:text-orange-400">
                            ⚠️ {t('integration.frontendHint')}
                        </p>
                        <CodeBlock code={frontendCode} id="frontend" />
                    </div>

                    {/* Step 3: Backend M2M */}
                    {(appType === 'm2m' || appType === 'web') && (
                        <div className="space-y-2">
                            <h4 className="font-medium text-slate-900 dark:text-white">3️⃣ {t('integration.backend')}</h4>
                            <p className="text-sm text-slate-600 dark:text-slate-400">
                                {t('integration.backendHint')}
                            </p>
                            <CodeBlock code={backendCode} id="backend" />
                        </div>
                    )}

                    {/* Step 4: OAuth Callback */}
                    <div className="space-y-2">
                        <h4 className="font-medium text-slate-900 dark:text-white">4️⃣ {t('integration.oauthCallback')}</h4>
                        <CodeBlock code={callbackCode} id="callback" />
                    </div>

                    {/* Step 5: Webhooks */}
                    <div className="space-y-2">
                        <h4 className="font-medium text-slate-900 dark:text-white">5️⃣ {t('integration.webhookHandler')}</h4>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                            {t('integration.webhookHint')}
                        </p>
                        <CodeBlock code={webhookCode} id="webhook" />
                    </div>

                    {/* API Reference Link */}
                    <div className="pt-4">
                        <a
                            href="/docs"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm font-medium"
                        >
                            📚 {t('integration.viewDocs')}
                        </a>
                    </div>
                </div>
            )}
        </div>
    );
}
