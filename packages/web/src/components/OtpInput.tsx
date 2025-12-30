import { useState, useRef, useEffect, KeyboardEvent, ClipboardEvent, ChangeEvent } from 'react';

interface OtpInputProps {
    /** Number of digits in the OTP (default: 6) */
    length?: number;
    /** Current value */
    value: string;
    /** Callback when value changes */
    onChange: (value: string) => void;
    /** Placeholder for each input (default: '•') */
    placeholder?: string;
    /** Whether the input is disabled */
    disabled?: boolean;
    /** Additional class names */
    className?: string;
}

/**
 * OTP Input Component
 * 验证码输入组件
 * 
 * Features:
 * - 6 separate digit boxes with auto-focus movement
 * - Paste support for full code
 * - Keyboard navigation (arrow keys, backspace)
 * - Accessible with proper ARIA labels
 */
export default function OtpInput({
    length = 6,
    value,
    onChange,
    placeholder = '•',
    disabled = false,
    className = '',
}: OtpInputProps) {
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
    const [focusedIndex, setFocusedIndex] = useState<number>(-1);

    // Initialize refs array
    useEffect(() => {
        inputRefs.current = inputRefs.current.slice(0, length);
    }, [length]);

    // Convert value to array of digits
    const digits = value.split('').slice(0, length);
    while (digits.length < length) {
        digits.push('');
    }

    // Handle individual digit input
    const handleChange = (index: number, e: ChangeEvent<HTMLInputElement>) => {
        const inputValue = e.target.value;

        // Only allow digits
        const digit = inputValue.replace(/\D/g, '').slice(-1);

        // Update the value
        const newDigits = [...digits];
        newDigits[index] = digit;
        const newValue = newDigits.join('');
        onChange(newValue);

        // Auto-focus next input
        if (digit && index < length - 1) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    // Handle paste
    const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData('text');
        const digits = pastedData.replace(/\D/g, '').slice(0, length);

        if (digits) {
            onChange(digits);
            // Focus the last filled input or the next empty one
            const targetIndex = Math.min(digits.length, length - 1);
            inputRefs.current[targetIndex]?.focus();
        }
    };

    // Handle keyboard navigation
    const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
        switch (e.key) {
            case 'Backspace':
                if (!digits[index] && index > 0) {
                    // If current is empty, move to previous and clear it
                    e.preventDefault();
                    const newDigits = [...digits];
                    newDigits[index - 1] = '';
                    onChange(newDigits.join(''));
                    inputRefs.current[index - 1]?.focus();
                }
                break;
            case 'ArrowLeft':
                if (index > 0) {
                    e.preventDefault();
                    inputRefs.current[index - 1]?.focus();
                }
                break;
            case 'ArrowRight':
                if (index < length - 1) {
                    e.preventDefault();
                    inputRefs.current[index + 1]?.focus();
                }
                break;
            case 'Delete':
                // Clear current and all subsequent
                const newDigits = [...digits];
                for (let i = index; i < length; i++) {
                    newDigits[i] = '';
                }
                onChange(newDigits.join(''));
                break;
        }
    };

    // Handle focus
    const handleFocus = (index: number) => {
        setFocusedIndex(index);
        // Select the content when focused
        inputRefs.current[index]?.select();
    };

    // Handle blur
    const handleBlur = () => {
        setFocusedIndex(-1);
    };

    return (
        <div className={`flex gap-1.5 ${className}`} role="group" aria-label="验证码输入">
            {digits.map((digit, index) => (
                <input
                    key={index}
                    ref={(el) => { inputRefs.current[index] = el; }}
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={digit}
                    onChange={(e) => handleChange(index, e)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    onPaste={handlePaste}
                    onFocus={() => handleFocus(index)}
                    onBlur={handleBlur}
                    disabled={disabled}
                    maxLength={1}
                    placeholder={focusedIndex === index ? '' : placeholder}
                    aria-label={`第 ${index + 1} 位验证码`}
                    className={`
                        w-8 h-10 text-center text-base font-bold rounded-lg
                        border transition-all duration-150
                        ${focusedIndex === index
                            ? 'border-sky-500 ring-2 ring-sky-500/20 bg-white dark:bg-slate-800'
                            : digit
                                ? 'border-sky-400 bg-sky-50/50 dark:bg-sky-900/20 dark:border-sky-500'
                                : 'border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800'
                        }
                        ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-sky-300'}
                        text-slate-800 dark:text-white placeholder:text-slate-300 dark:placeholder:text-slate-500
                        focus:outline-none
                    `}
                />
            ))}
        </div>
    );
}
