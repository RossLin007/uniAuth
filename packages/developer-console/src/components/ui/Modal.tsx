import * as React from "react"
import { createPortal } from "react-dom"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

interface ModalProps {
    isOpen: boolean
    onClose: () => void
    title: string
    description?: string
    children: React.ReactNode
    footer?: React.ReactNode
    className?: string
}

export function Modal({ isOpen, onClose, title, description, children, footer, className }: ModalProps) {
    const [visible, setVisible] = React.useState(false);
    const [animating, setAnimating] = React.useState(false);

    React.useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose()
        }

        if (isOpen) {
            setVisible(true);
            requestAnimationFrame(() => setAnimating(true));
            document.addEventListener('keydown', handleEscape)
            document.body.style.overflow = 'hidden'
        } else {
            setAnimating(false);
            const timer = setTimeout(() => {
                setVisible(false);
                document.body.style.overflow = 'unset'
            }, 300);
            return () => {
                clearTimeout(timer);
                document.removeEventListener('keydown', handleEscape)
                document.body.style.overflow = 'unset'
            }
        }
    }, [isOpen, onClose])

    if (!visible) return null

    return createPortal(
        <div className={`fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 transition-all duration-300 ${animating ? 'bg-black/50 backdrop-blur-sm' : 'bg-transparent pointer-events-none'}`}>
            <div
                className="absolute inset-0"
                onClick={onClose}
            />

            <div
                className={cn(
                    `relative w-full max-w-lg bg-white dark:bg-slate-900 sm:rounded-2xl rounded-t-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh] 
                    transform transition-all duration-300 cubic-bezier(0.16, 1, 0.3, 1)
                    ${animating ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-full sm:translate-y-8 sm:scale-95 opacity-0'}`,
                    className
                )}
                onClick={e => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
            >
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
                    <div className="space-y-1">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white leading-none tracking-tight font-display">
                            {title}
                        </h3>
                        {description && (
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                {description}
                            </p>
                        )}
                    </div>
                    <button
                        className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors"
                        onClick={onClose}
                    >
                        <X className="h-5 w-5" />
                        <span className="sr-only">Close</span>
                    </button>
                </div>

                {/* Content */}
                <div className="p-5 overflow-y-auto">
                    {children}
                </div>

                {/* Footer */}
                {footer && (
                    <div className="flex items-center justify-end p-5 pt-0 gap-3 bg-slate-50/50 dark:bg-slate-900/50">
                        {footer}
                    </div>
                )}
            </div>
        </div>,
        document.body
    )
}
