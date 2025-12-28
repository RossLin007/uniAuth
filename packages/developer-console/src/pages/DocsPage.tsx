import { useTranslation } from 'react-i18next';
import { useTheme } from '@/contexts/ThemeContext';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { BookOpen, ExternalLink, Code, Webhook, Shield, Key, ArrowLeft } from 'lucide-react';
import { API_BASE_URL } from '@/config/api';
import QuickStartDoc from '@/components/docs/QuickStartDoc';
import AuthenticationDoc from '@/components/docs/AuthenticationDoc';
import OAuth2Doc from '@/components/docs/OAuth2Doc';
import WebhooksDoc from '@/components/docs/WebhooksDoc';

type DocSection = 'quickstart' | 'authentication' | 'oauth2' | 'webhooks';

export default function DocsPage() {
    const { t } = useTranslation();
    const { resolvedTheme } = useTheme();
    const { section } = useParams<{ section?: DocSection }>();
    const navigate = useNavigate();

    const textPrimary = resolvedTheme === 'dark' ? 'text-white' : 'text-slate-900';
    const textSecondary = resolvedTheme === 'dark' ? 'text-slate-400' : 'text-slate-600';

    const docSections = [
        {
            id: 'quickstart' as DocSection,
            icon: Code,
            title: t('docs.quickstart'),
            description: t('docs.quickstartDesc'),
        },
        {
            id: 'authentication' as DocSection,
            icon: Key,
            title: t('docs.authentication'),
            description: t('docs.authenticationDesc'),
        },
        {
            id: 'oauth2' as DocSection,
            icon: Shield,
            title: t('docs.oauth2'),
            description: t('docs.oauth2Desc'),
        },
        {
            id: 'webhooks' as DocSection,
            icon: Webhook,
            title: t('docs.webhooks'),
            description: t('docs.webhooksDesc'),
        }
    ];

    const baseUrl = API_BASE_URL;

    // Render doc content based on selected section
    const renderDocContent = () => {
        switch (section) {
            case 'quickstart':
                return <QuickStartDoc />;
            case 'authentication':
                return <AuthenticationDoc />;
            case 'oauth2':
                return <OAuth2Doc />;
            case 'webhooks':
                return <WebhooksDoc />;
            default:
                return null;
        }
    };

    // If a section is selected, show the doc content
    if (section) {
        return (
            <div className="space-y-6 md:space-y-8">
                {/* Back button */}
                <button
                    onClick={() => navigate('/docs')}
                    className={`flex items-center gap-2 ${textSecondary} hover:${textPrimary} transition-colors`}
                >
                    <ArrowLeft className="h-4 w-4" />
                    {t('common.back')}
                </button>

                {/* Doc content */}
                <Card>
                    <CardContent className="pt-6">
                        {renderDocContent()}
                    </CardContent>
                </Card>

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
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Default: show doc sections overview
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
                        href={`${baseUrl}/docs`}
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
                {docSections.map((docSection) => {
                    const Icon = docSection.icon;
                    return (
                        <Card
                            key={docSection.id}
                            className="hover:border-blue-500/50 transition-colors cursor-pointer"
                            onClick={() => navigate(`/docs/${docSection.id}`)}
                        >
                            <CardHeader>
                                <div className="flex items-center gap-3">
                                    <Icon className={`h-5 w-5 ${textSecondary}`} />
                                    <CardTitle className="text-base">{docSection.title}</CardTitle>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <p className={`text-sm ${textSecondary}`}>
                                    {docSection.description}
                                </p>
                            </CardContent>
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
