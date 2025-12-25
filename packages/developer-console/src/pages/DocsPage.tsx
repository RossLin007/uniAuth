import { useTranslation } from 'react-i18next';
import { useTheme } from '@/contexts/ThemeContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { BookOpen, ExternalLink, Code, Webhook, Shield, Key } from 'lucide-react';

export default function DocsPage() {
    const { t } = useTranslation();
    const { resolvedTheme } = useTheme();

    const textPrimary = resolvedTheme === 'dark' ? 'text-white' : 'text-slate-900';
    const textSecondary = resolvedTheme === 'dark' ? 'text-slate-400' : 'text-slate-600';

    const docSections = [
        {
            icon: Code,
            title: t('docs.quickstart'),
            description: t('docs.quickstartDesc'),
            link: '/api/v1/docs'
        },
        {
            icon: Key,
            title: t('docs.authentication'),
            description: t('docs.authenticationDesc'),
            link: '/api/v1/docs#/Auth'
        },
        {
            icon: Shield,
            title: t('docs.oauth2'),
            description: t('docs.oauth2Desc'),
            link: '/api/v1/docs#/OAuth2'
        },
        {
            icon: Webhook,
            title: t('docs.webhooks'),
            description: t('docs.webhooksDesc'),
            link: '/api/v1/docs#/Webhooks'
        }
    ];

    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

    return (
        <div className="space-y-6 md:space-y-8">
            <header>
                <h1 className={`text-2xl md:text-3xl font-bold ${textPrimary}`}>{t('nav.docs')}</h1>
                <p className={`text-sm md:text-base ${textSecondary}`}>{t('docs.subtitle')}</p>
            </header>

            {/* API Documentation Link */}
            <Card className="border-blue-500/50 bg-gradient-to-r from-blue-500/10 to-transparent">
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <BookOpen className="h-8 w-8 text-blue-500" />
                        <div>
                            <CardTitle className="text-lg">{t('docs.swaggerTitle')}</CardTitle>
                            <CardDescription>{t('docs.swaggerDesc')}</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <a
                        href={`${baseUrl}/api/v1/docs`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                    >
                        {t('docs.openSwagger')}
                        <ExternalLink className="h-4 w-4" />
                    </a>
                </CardContent>
            </Card>

            {/* Documentation Sections */}
            <div className="grid gap-4 md:grid-cols-2">
                {docSections.map((section, index) => {
                    const Icon = section.icon;
                    return (
                        <Card key={index} className="hover:border-blue-500/50 transition-colors cursor-pointer">
                            <a
                                href={`${baseUrl}${section.link}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block"
                            >
                                <CardHeader>
                                    <div className="flex items-center gap-3">
                                        <Icon className={`h-5 w-5 ${textSecondary}`} />
                                        <CardTitle className="text-base">{section.title}</CardTitle>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <p className={`text-sm ${textSecondary}`}>
                                        {section.description}
                                    </p>
                                </CardContent>
                            </a>
                        </Card>
                    );
                })}
            </div>

            {/* SDK Section */}
            <Card>
                <CardHeader>
                    <CardTitle>{t('docs.sdkTitle')}</CardTitle>
                    <CardDescription>{t('docs.sdkDesc')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-4">
                        <p className={`text-sm font-medium mb-2 ${textPrimary}`}>npm / pnpm</p>
                        <code className="text-sm text-blue-500 dark:text-blue-400">
                            pnpm add @uniauth/sdk
                        </code>
                    </div>
                    <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-4">
                        <p className={`text-sm font-medium mb-2 ${textPrimary}`}>{t('docs.basicUsage')}</p>
                        <pre className="text-xs text-slate-600 dark:text-slate-400 overflow-x-auto">
                            {`import { UniAuth } from '@uniauth/sdk';

const auth = new UniAuth({
    clientId: 'your-client-id',
    baseUrl: '${baseUrl}'
});

// Send phone verification code
await auth.sendPhoneCode('+8613800138000');

// Login with phone code
const result = await auth.loginWithPhoneCode(
    '+8613800138000', 
    '123456'
);`}
                        </pre>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
