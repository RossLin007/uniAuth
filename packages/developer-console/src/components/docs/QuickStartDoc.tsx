import { useTranslation } from 'react-i18next';
import { useTheme } from '@/contexts/ThemeContext';
import { API_BASE_URL } from '@/config/api';

export default function QuickStartDoc() {
    const { t } = useTranslation();
    const { resolvedTheme } = useTheme();

    const textPrimary = resolvedTheme === 'dark' ? 'text-white' : 'text-slate-900';
    const textSecondary = resolvedTheme === 'dark' ? 'text-slate-400' : 'text-slate-600';
    const codeBg = resolvedTheme === 'dark' ? 'bg-slate-800' : 'bg-slate-100';

    return (
        <div className="space-y-6">
            <h2 className={`text-xl font-bold ${textPrimary}`}>{t('docs.quickstart')}</h2>
            <p className={textSecondary}>{t('docs.quickstartDesc')}</p>

            {/* Step 1: Install SDK */}
            <div className="space-y-3">
                <h3 className={`text-lg font-semibold ${textPrimary}`}>
                    1. {t('docs.content.installSdk')}
                </h3>
                <div className={`${codeBg} rounded-lg p-4`}>
                    <code className="text-sm text-blue-500 dark:text-blue-400">
                        pnpm add @55387.ai/uniauth-client
                    </code>
                </div>
            </div>

            {/* Step 2: Initialize Client */}
            <div className="space-y-3">
                <h3 className={`text-lg font-semibold ${textPrimary}`}>
                    2. {t('docs.content.initClient')}
                </h3>
                <div className={`${codeBg} rounded-lg p-4 overflow-x-auto`}>
                    <pre className="text-xs text-slate-600 dark:text-slate-400">
                        {`import { UniAuthClient } from '@55387.ai/uniauth-client';

const auth = new UniAuthClient({
    baseUrl: '${API_BASE_URL}'
});`}
                    </pre>
                </div>
            </div>

            {/* Step 3: Login with Phone */}
            <div className="space-y-3">
                <h3 className={`text-lg font-semibold ${textPrimary}`}>
                    3. {t('docs.content.phoneLogin')}
                </h3>
                <div className={`${codeBg} rounded-lg p-4 overflow-x-auto`}>
                    <pre className="text-xs text-slate-600 dark:text-slate-400">
                        {`// Send phone verification code / 发送手机验证码
await auth.sendCode('+8613800138000');

// Login with phone code / 手机验证码登录
const result = await auth.loginWithCode(
    '+8613800138000', 
    '123456'
);

console.log(result.access_token);`}
                    </pre>
                </div>
            </div>

            {/* Step 4: Login with Email */}
            <div className="space-y-3">
                <h3 className={`text-lg font-semibold ${textPrimary}`}>
                    4. {t('docs.content.emailLogin')}
                </h3>
                <div className={`${codeBg} rounded-lg p-4 overflow-x-auto`}>
                    <pre className="text-xs text-slate-600 dark:text-slate-400">
                        {`// Option A: Email code login / 邮箱验证码登录
await auth.sendEmailCode('user@example.com');
const result = await auth.loginWithEmailCode(
    'user@example.com', 
    '123456'
);

// Option B: Email password login / 邮箱密码登录
const result2 = await auth.loginWithEmail(
    'user@example.com',
    'your-password'
);`}
                    </pre>
                </div>
            </div>
        </div>
    );
}
