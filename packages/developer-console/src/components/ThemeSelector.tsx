import { useTheme } from '@/contexts/ThemeContext';
import { useTranslation } from 'react-i18next';
import { Sun, Moon, Monitor } from 'lucide-react';

export function ThemeSelector() {
    const { theme, setTheme, resolvedTheme } = useTheme();
    const { t } = useTranslation();

    const themes = [
        { value: 'light' as const, icon: Sun, label: t('theme.light') },
        { value: 'dark' as const, icon: Moon, label: t('theme.dark') },
        { value: 'system' as const, icon: Monitor, label: t('theme.system') },
    ];

    const bgClass = resolvedTheme === 'dark' ? 'bg-slate-700/50' : 'bg-slate-200';
    const inactiveClass = resolvedTheme === 'dark'
        ? 'text-slate-400 hover:text-white'
        : 'text-slate-500 hover:text-slate-900';

    return (
        <div className={`flex items-center gap-1 p-1 ${bgClass} rounded-lg`}>
            {themes.map(({ value, icon: Icon, label }) => (
                <button
                    key={value}
                    onClick={() => setTheme(value)}
                    title={label}
                    className={`p-2 rounded-md transition-all ${theme === value
                            ? 'bg-blue-600 text-white shadow-md'
                            : inactiveClass
                        }`}
                >
                    <Icon className="h-4 w-4" />
                </button>
            ))}
        </div>
    );
}
