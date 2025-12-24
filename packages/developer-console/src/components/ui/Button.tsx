import * as React from "react"
import { cn } from "@/lib/utils"
import { Loader2 } from "lucide-react"

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'default' | 'primary' | 'outline' | 'ghost' | 'destructive'
    size?: 'default' | 'sm' | 'lg' | 'icon'
    isLoading?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = 'default', size = 'default', isLoading, children, disabled, ...props }, ref) => {
        return (
            <button
                className={cn(
                    // 基础样式
                    "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
                    "disabled:pointer-events-none disabled:opacity-50",
                    // 变体样式
                    {
                        'bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100': variant === 'default',
                        'bg-blue-600 text-white hover:bg-blue-700': variant === 'primary',
                        'border bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300': variant === 'outline',
                        'bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300': variant === 'ghost',
                        'bg-red-500 text-white hover:bg-red-600': variant === 'destructive',
                    },
                    // 尺寸样式
                    {
                        'h-10 px-4 py-2': size === 'default',
                        'h-8 px-3 text-xs': size === 'sm',
                        'h-12 px-6 text-base': size === 'lg',
                        'h-10 w-10 p-0': size === 'icon',
                    },
                    className
                )}
                ref={ref}
                disabled={disabled || isLoading}
                {...props}
            >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {children}
            </button>
        )
    }
)
Button.displayName = "Button"

export { Button }
