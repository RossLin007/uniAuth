import { useTranslation } from 'react-i18next';

export default function LanguageSwitch() {
    const { i18n } = useTranslation();

    const toggleLanguage = () => {
        const newLang = i18n.language.startsWith('zh') ? 'en' : 'zh';
        i18n.changeLanguage(newLang);
    };

    return (
        <button
            onClick={toggleLanguage}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-canvas dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-stone hover:text-ink dark:hover:text-moonlight hover:border-sky-500 transition-all shadow-soft"
            aria-label="Switch language"
        >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"
                />
            </svg>
            <span className="text-sm font-medium">
                {i18n.language.startsWith('zh') ? 'EN' : '中文'}
            </span>
        </button>
    );
}
