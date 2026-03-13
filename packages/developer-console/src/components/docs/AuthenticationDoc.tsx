import { useTranslation } from 'react-i18next';
import { useTheme } from '@/contexts/ThemeContext';

export default function AuthenticationDoc() {
    const { t } = useTranslation();
    const { resolvedTheme } = useTheme();

    const textPrimary = resolvedTheme === 'dark' ? 'text-white' : 'text-slate-900';
    const textSecondary = resolvedTheme === 'dark' ? 'text-slate-400' : 'text-slate-600';
    const codeBg = resolvedTheme === 'dark' ? 'bg-slate-800' : 'bg-slate-100';
    const borderColor = resolvedTheme === 'dark' ? 'border-slate-700' : 'border-slate-200';

    const coreEndpoints = [
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

    const passkeyEndpoints = [
        {
            method: 'POST',
            path: '/api/v1/passkey/register/options',
            auth: '🔒',
            description: t('docs.content.passkeyRegOptions'),
        },
        {
            method: 'POST',
            path: '/api/v1/passkey/register/verify',
            auth: '🔒',
            description: t('docs.content.passkeyRegVerify'),
        },
        {
            method: 'POST',
            path: '/api/v1/passkey/authenticate/options',
            auth: '❌',
            description: t('docs.content.passkeyAuthOptions'),
        },
        {
            method: 'POST',
            path: '/api/v1/passkey/authenticate/verify',
            auth: '❌',
            description: t('docs.content.passkeyAuthVerify'),
        },
    ];

    const trustedEndpoints = [
        {
            method: 'POST',
            path: '/api/v1/trusted-auth/phone/send-code',
            auth: '🔑',
            description: t('docs.content.trustedSendPhoneCode'),
        },
        {
            method: 'POST',
            path: '/api/v1/trusted-auth/phone/login',
            auth: '🔑',
            description: t('docs.content.trustedPhoneLogin'),
        },
        {
            method: 'POST',
            path: '/api/v1/trusted-auth/email/send-code',
            auth: '🔑',
            description: t('docs.content.trustedSendEmailCode'),
        },
        {
            method: 'POST',
            path: '/api/v1/trusted-auth/email/verify',
            auth: '🔑',
            description: t('docs.content.trustedEmailCodeLogin'),
        },
        {
            method: 'POST',
            path: '/api/v1/trusted-auth/email/login',
            auth: '🔑',
            description: t('docs.content.trustedEmailPasswordLogin'),
        },
        {
            method: 'POST',
            path: '/api/v1/trusted-auth/mfa/verify',
            auth: '🔑',
            description: t('docs.content.trustedMfaVerify'),
        },
        {
            method: 'POST',
            path: '/api/v1/trusted-auth/token/refresh',
            auth: '🔑',
            description: t('docs.content.trustedRefreshToken'),
        },
    ];

    const accountLinkingEndpoints = [
        {
            method: 'GET',
            path: '/api/v1/account-linking/accounts',
            auth: '🔒',
            description: t('docs.content.linkedAccounts'),
        },
        {
            method: 'POST',
            path: '/api/v1/account-linking/link',
            auth: '🔒',
            description: t('docs.content.linkAccount'),
        },
        {
            method: 'DELETE',
            path: '/api/v1/account-linking/unlink/:provider',
            auth: '🔒',
            description: t('docs.content.unlinkAccount'),
        },
        {
            method: 'GET',
            path: '/api/v1/account-linking/check/:provider',
            auth: '🔒',
            description: t('docs.content.checkLinkable'),
        },
    ];

    const EndpointsTable = ({ endpoints }: { endpoints: typeof coreEndpoints }) => (
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
                                    : endpoint.method === 'DELETE'
                                        ? 'bg-red-500/20 text-red-500'
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
    );

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

            {/* Core Endpoints Table */}
            <EndpointsTable endpoints={coreEndpoints} />

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
                {/* MFA Handling Section */}
                <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                    <h3 className={`text-lg font-bold ${textPrimary}`}>
                        🛡️ {t('docs.content.mfaFlow')}
                    </h3>
                    <p className={textSecondary}>{t('docs.content.mfaFlowDesc')}</p>

                    <div className="space-y-3">
                        <h4 className={`font-semibold ${textPrimary}`}>
                            {t('docs.content.mfaHandlingExample')}
                        </h4>
                        <div className={`${codeBg} rounded-lg p-4 overflow-x-auto`}>
                            <pre className="text-xs text-slate-600 dark:text-slate-400">
                                {`// 1. Check for mfa_required in login response
// 1. 检查登录响应中的 mfa_required
const result = await auth.loginWithCode(phone, code);

if (result.mfa_required) {
  // 2. Show MFA Input UI
  // 2. 展示 MFA 输入界面
  const mfaCode = await promptUserForMfaCode();
  
  // 3. Verify MFA
  // 3. 验证 MFA
  const mfaResult = await auth.verifyMFA(result.mfa_token, mfaCode);
  console.log('Login Success:', mfaResult.user);
}`}
                            </pre>
                        </div>
                    </div>
                </div>

                {/* Passkey / WebAuthn Section */}
                <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                    <h3 className={`text-lg font-bold ${textPrimary}`}>
                        🔐 Passkey / WebAuthn
                    </h3>
                    <EndpointsTable endpoints={passkeyEndpoints} />

                    <div className="space-y-3">
                        <h4 className={`font-semibold ${textPrimary}`}>
                            {t('docs.content.passkeyExample')}
                        </h4>
                        <div className={`${codeBg} rounded-lg p-4 overflow-x-auto`}>
                            <pre className="text-xs text-slate-600 dark:text-slate-400">
                                {`// Step 1: Get authentication options / 获取认证选项
const optionsRes = await fetch('https://sso.55387.xyz/api/v1/passkey/authenticate/options', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
});
const options = await optionsRes.json();

// Step 2: Use browser WebAuthn API / 使用浏览器 WebAuthn API
const credential = await navigator.credentials.get({
    publicKey: options.publicKey,
});

// Step 3: Verify with server / 提交给服务端验证
const verifyRes = await fetch('https://sso.55387.xyz/api/v1/passkey/authenticate/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credential),
});
const { access_token, refresh_token } = await verifyRes.json();`}
                            </pre>
                        </div>
                    </div>
                </div>

                {/* Trusted Client API Section */}
                <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                    <h3 className={`text-lg font-bold ${textPrimary}`}>
                        🏢 Trusted Client API
                    </h3>
                    <EndpointsTable endpoints={trustedEndpoints} />

                    <div className="space-y-3">
                        <h4 className={`font-semibold ${textPrimary}`}>
                            {t('docs.content.trustedClientExample')}
                        </h4>
                        <div className={`${codeBg} rounded-lg p-4 overflow-x-auto`}>
                            <pre className="text-xs text-slate-600 dark:text-slate-400">
                                {`// Trusted Client: Send phone code and login directly
// 可信客户端：发送手机验证码并直接登录
const sendRes = await fetch('https://sso.55387.xyz/api/v1/trusted-auth/phone/send-code', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'X-Client-Id': 'your-client-id',
        'X-Client-Secret': 'your-client-secret',
    },
    body: JSON.stringify({ phone: '+8613800138000' }),
});

const loginRes = await fetch('https://sso.55387.xyz/api/v1/trusted-auth/phone/login', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'X-Client-Id': 'your-client-id',
        'X-Client-Secret': 'your-client-secret',
    },
    body: JSON.stringify({
        phone: '+8613800138000',
        code: '123456',
    }),
});
const { access_token, refresh_token } = await loginRes.json();`}
                            </pre>
                        </div>
                    </div>
                </div>

                {/* Account Linking Section */}
                <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                    <h3 className={`text-lg font-bold ${textPrimary}`}>
                        🔗 Account Linking
                    </h3>
                    <EndpointsTable endpoints={accountLinkingEndpoints} />

                    <div className="space-y-3">
                        <h4 className={`font-semibold ${textPrimary}`}>
                            {t('docs.content.accountLinkingExample')}
                        </h4>
                        <div className={`${codeBg} rounded-lg p-4 overflow-x-auto`}>
                            <pre className="text-xs text-slate-600 dark:text-slate-400">
                                {`// List linked accounts / 查看已关联账号
const accounts = await fetch('https://sso.55387.xyz/api/v1/account-linking/accounts', {
    headers: { 'Authorization': 'Bearer <access_token>' },
}).then(r => r.json());

// Link a new social account / 关联新的社交账号
await fetch('https://sso.55387.xyz/api/v1/account-linking/link', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer <access_token>',
    },
    body: JSON.stringify({
        provider: 'github',
        code: '<oauth-authorization-code>',
    }),
});

// Unlink an account / 解除关联
await fetch('https://sso.55387.xyz/api/v1/account-linking/unlink/github', {
    method: 'DELETE',
    headers: { 'Authorization': 'Bearer <access_token>' },
});`}
                            </pre>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
