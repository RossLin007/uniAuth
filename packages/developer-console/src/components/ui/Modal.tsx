import * as React from "react"
import { createPortal } from "react-dom"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "./Button"

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
    React.useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose()
            }
        }

        if (isOpen) {
            document.addEventListener('keydown', handleEscape)
            document.body.style.overflow = 'hidden'
        }

        return () => {
            document.removeEventListener('keydown', handleEscape)
            document.body.style.overflow = 'unset'
        }
    }, [isOpen, onClose])

    if (!isOpen) return null

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div
                className={cn(
                    "relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200",
                    className
                )}
                onClick={e => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
            >
                <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800">
                    <div className="space-y-1">
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white leading-none tracking-tight">
                            {title}
                        </h3>
                        {description && (
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                {description}
                            </p>
                        )}
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-full"
                        onClick={onClose}
                    >
                        <X className="h-4 w-4" />
                        <span className="sr-only">Close</span>
                    </Button>
                </div>

                <div className="p-6 overflow-y-auto">
                    {children}
                </div>

                {footer && (
                    <div className="flex items-center justify-end p-6 pt-0 gap-2">
                        {footer}
                    </div>
                )}
            </div>
        </div>,
        document.body
    )
}
