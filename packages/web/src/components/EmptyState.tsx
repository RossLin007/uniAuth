import { useTranslation } from 'react-i18next';

type EmptyStateType = 'sessions' | 'apps' | 'history' | 'default';

interface EmptyStateProps {
    type?: EmptyStateType;
    title?: string;
    description?: string;
    action?: React.ReactNode;
}

export default function EmptyState({ type = 'default', title, description, action }: EmptyStateProps) {
    const { t } = useTranslation();

    const getIllustration = () => {
        switch (type) {
            case 'sessions':
                return (
                    <svg className="w-32 h-32 text-slate-200 dark:text-slate-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                        <line x1="8" y1="21" x2="16" y2="21" />
                        <line x1="12" y1="17" x2="12" y2="21" />
                        <path d="M12 13h.01" strokeWidth="2" />
                        <path d="M7 7h10" />
                    </svg>
                );
            case 'apps':
                return (
                    <svg className="w-32 h-32 text-slate-200 dark:text-slate-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="4" y="4" width="16" height="16" rx="2" ry="2" />
                        <rect x="9" y="9" width="6" height="6" />
                        <line x1="9" y1="1" x2="9" y2="4" />
                        <line x1="15" y1="1" x2="15" y2="4" />
                        <line x1="9" y1="20" x2="9" y2="23" />
                        <line x1="15" y1="20" x2="15" y2="23" />
                        <line x1="20" y1="9" x2="23" y2="9" />
                        <line x1="20" y1="14" x2="23" y2="14" />
                        <line x1="1" y1="9" x2="4" y2="9" />
                        <line x1="1" y1="14" x2="4" y2="14" />
                    </svg>
                );
            case 'history':
                return (
                    <svg className="w-32 h-32 text-slate-200 dark:text-slate-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                        <path d="M12 18v.01" strokeWidth="2" stroke="currentColor" className="text-emerald-400 opacity-50" />
                    </svg>
                );
            default:
                return (
                    <svg className="w-32 h-32 text-slate-200 dark:text-slate-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                );
        }
    };

    return (
        <div className="flex flex-col items-center justify-center p-8 text-center animate-fade-in">
            <div className="mb-4 relative">
                {getIllustration()}
                <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent dark:from-slate-800 opacity-50"></div>
            </div>
            {title && (
                <h3 className="text-lg font-medium text-slate-900 dark:text-slate-200 mb-1">
                    {title}
                </h3>
            )}
            {description && (
                <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs mx-auto mb-4">
                    {description}
                </p>
            )}
            {action && (
                <div className="mt-2">
                    {action}
                </div>
            )}
        </div>
    );
}
