import { createContext, useContext, useState, useCallback, ReactNode, useMemo } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
    id: string;
    type: ToastType;
    message: string;
}

interface ToastContextType {
    toasts: Toast[];
    success: (message: string) => void;
    error: (message: string) => void;
    info: (message: string) => void;
    dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
}

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const addToast = useCallback((type: ToastType, message: string) => {
        const id = Math.random().toString(36).slice(2);
        setToasts(prev => [...prev, { id, type, message }]);

        // Auto dismiss after 4 seconds
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 4000);
    }, []);

    const dismiss = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const success = useCallback((message: string) => addToast('success', message), [addToast]);
    const error = useCallback((message: string) => addToast('error', message), [addToast]);
    const info = useCallback((message: string) => addToast('info', message), [addToast]);

    const value = useMemo(() => ({
        toasts,
        success,
        error,
        info,
        dismiss
    }), [toasts, success, error, info, dismiss]);

    return (
        <ToastContext.Provider value={value}>
            {children}
            <ToastContainer toasts={toasts} dismiss={dismiss} />
        </ToastContext.Provider>
    );
}

function ToastContainer({ toasts, dismiss }: { toasts: Toast[]; dismiss: (id: string) => void }) {
    if (toasts.length === 0) return null;

    const getIcon = (type: ToastType) => {
        switch (type) {
            case 'success': return <CheckCircle className="h-5 w-5 text-green-400" />;
            case 'error': return <AlertCircle className="h-5 w-5 text-red-400" />;
            case 'info': return <Info className="h-5 w-5 text-blue-400" />;
        }
    };

    const getStyles = (type: ToastType) => {
        switch (type) {
            case 'success': return 'bg-green-900/90 border-green-500/50';
            case 'error': return 'bg-red-900/90 border-red-500/50';
            case 'info': return 'bg-blue-900/90 border-blue-500/50';
        }
    };

    return (
        <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
            {toasts.map(toast => (
                <div
                    key={toast.id}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg backdrop-blur animate-slide-in ${getStyles(toast.type)}`}
                >
                    {getIcon(toast.type)}
                    <span className="text-white text-sm">{toast.message}</span>
                    <button
                        onClick={() => dismiss(toast.id)}
                        className="text-white/60 hover:text-white ml-2"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
            ))}
        </div>
    );
}
