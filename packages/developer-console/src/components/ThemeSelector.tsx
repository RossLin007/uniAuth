import { useTheme } from '@/contexts/ThemeContext';
import { useTranslation } from 'react-i18next';
import { Sun, Moon, Monitor } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ThemeSelector({ className }: { className?: string }) {
    const { theme, setTheme } = useTheme();
    const { t } = useTranslation();

    const themes = [
        { value: 'light' as const, icon: Sun, label: t('theme.light') },
        { value: 'dark' as const, icon: Moon, label: t('theme.dark') },
        { value: 'system' as const, icon: Monitor, label: t('theme.system') },
    ];

    return (
        <div className={cn("flex items-center gap-1 p-1 bg-black/20 backdrop-blur-sm border border-white/10 rounded-full", className)}>
            {themes.map(({ value, icon: Icon, label }) => (
                <button
                    key={value}
                    onClick={() => setTheme(value)}
                    title={label}
                    className={cn(
                        "p-2 rounded-full transition-all duration-200",
                        theme === value
                            ? "bg-white/10 text-white shadow-sm ring-1 ring-white/20"
                            : "text-slate-400 hover:text-white hover:bg-white/5"
                    )}
                >
                    <Icon className="h-4 w-4" />
                    <span className="sr-only">{label}</span>
                </button>
            ))}
        </div>
    );
}
