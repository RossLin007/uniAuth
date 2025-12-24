import { useTranslation } from 'react-i18next';
import { useTheme } from '@/contexts/ThemeContext';
import { Globe } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export function LanguageSwitcher() {
    const { i18n, t } = useTranslation();
    const { resolvedTheme } = useTheme();

    const toggleLanguage = () => {
        const newLang = i18n.language === 'zh' ? 'en' : 'zh';
        i18n.changeLanguage(newLang);
    };

    const buttonClass = resolvedTheme === 'dark'
        ? 'text-slate-400 hover:text-white hover:bg-slate-700'
        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200';

    return (
        <Button
            variant="ghost"
            size="sm"
            onClick={toggleLanguage}
            className={buttonClass}
            title={t('language.switch')}
        >
            <Globe className="h-4 w-4 mr-1" />
            {i18n.language === 'zh' ? 'EN' : '中'}
        </Button>
    );
}
