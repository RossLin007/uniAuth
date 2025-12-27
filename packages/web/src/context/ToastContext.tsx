import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { X, Check, AlertCircle, Info, AlertTriangle } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
    id: string;
    type: ToastType;
    message: string;
    duration?: number;
}

interface ToastContextType {
    showToast: (message: string, type: ToastType, duration?: number) => void;
    success: (message: string, duration?: number) => void;
    error: (message: string, duration?: number) => void;
    info: (message: string, duration?: number) => void;
    warning: (message: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const removeToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, []);

    const showToast = useCallback((message: string, type: ToastType, duration = 3000) => {
        const id = Math.random().toString(36).substring(7);
        setToasts((prev) => [...prev, { id, message, type, duration }]);

        if (duration > 0) {
            setTimeout(() => {
                removeToast(id);
            }, duration);
        }
    }, [removeToast]);

    const success = useCallback((message: string, duration?: number) => showToast(message, 'success', duration), [showToast]);
    const error = useCallback((message: string, duration?: number) => showToast(message, 'error', duration), [showToast]);
    const info = useCallback((message: string, duration?: number) => showToast(message, 'info', duration), [showToast]);
    const warning = useCallback((message: string, duration?: number) => showToast(message, 'warning', duration), [showToast]);

    return (
        <ToastContext.Provider value={{ showToast, success, error, info, warning }}>
            {children}
            <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
                {toasts.map((toast) => (
                    <div
                        key={toast.id}
                        className={`
                            pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border backdrop-blur-md animate-slide-in-right transition-all
                            ${toast.type === 'success' ? 'bg-white/90 dark:bg-slate-800/90 border-green-200 dark:border-green-900 text-green-700 dark:text-green-400' : ''}
                            ${toast.type === 'error' ? 'bg-white/90 dark:bg-slate-800/90 border-red-200 dark:border-red-900 text-red-700 dark:text-red-400' : ''}
                            ${toast.type === 'info' ? 'bg-white/90 dark:bg-slate-800/90 border-sky-200 dark:border-sky-900 text-sky-700 dark:text-sky-400' : ''}
                            ${toast.type === 'warning' ? 'bg-white/90 dark:bg-slate-800/90 border-amber-200 dark:border-amber-900 text-amber-700 dark:text-amber-400' : ''}
                        `}
                    >
                        {toast.type === 'success' && <Check className="w-5 h-5" />}
                        {toast.type === 'error' && <AlertCircle className="w-5 h-5" />}
                        {toast.type === 'info' && <Info className="w-5 h-5" />}
                        {toast.type === 'warning' && <AlertTriangle className="w-5 h-5" />}

                        <p className="text-sm font-medium">{toast.message}</p>

                        <button
                            onClick={() => removeToast(toast.id)}
                            className="ml-2 p-1 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors"
                        >
                            <X className="w-4 h-4 opacity-50" />
                        </button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
};

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};
