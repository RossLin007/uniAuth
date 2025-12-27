import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    className?: string; // Optional custom class for the content container
}

export default function Modal({ isOpen, onClose, title, children, className = '' }: ModalProps) {
    const [visible, setVisible] = useState(false);
    const [animating, setAnimating] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setVisible(true);
            // Small delay to allow render before animation starts
            requestAnimationFrame(() => setAnimating(true));
        } else {
            setAnimating(false);
            const timer = setTimeout(() => {
                setVisible(false);
            }, 300); // Match transition duration
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    if (!visible) return null;

    return (
        <div className={`fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 transition-all duration-300 ${animating ? 'bg-black/40 backdrop-blur-sm' : 'bg-transparent pointer-events-none'}`}>
            {/* Backdrop Click Handler */}
            <div className="absolute inset-0" onClick={onClose}></div>

            {/* Modal Content */}
            <div
                className={`
                    bg-white dark:bg-slate-800 w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-2xl overflow-hidden
                    transform transition-transform duration-300 cubic-bezier(0.16, 1, 0.3, 1)
                    ${animating ? 'translate-y-0 scale-100' : 'translate-y-full sm:translate-y-8 sm:scale-95'}
                    max-h-[90vh] flex flex-col
                    ${className}
                `}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-700">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white font-serif tracking-tight">
                        {title}
                    </h3>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Scrollable Content */}
                <div className="p-4 sm:p-6 overflow-y-auto">
                    {children}
                </div>
            </div>
        </div>
    );
}
