/** @type {import('tailwindcss').Config} */
export default {
    content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                // Zen Design System Colors
                canvas: '#FFFFFF',
                mist: '#F8FAFC',
                ink: '#1E293B',
                stone: '#64748B',
                sky: {
                    50: '#F0F9FF',
                    100: '#E0F2FE',
                    200: '#BAE6FD',
                    300: '#7DD3FC',
                    400: '#38BDF8',
                    500: '#0EA5E9',
                    600: '#0284C7',
                    700: '#0369A1',
                },
                bamboo: {
                    500: '#10B981',
                },
                sunray: {
                    500: '#F59E0B',
                },
                ocean: '#0F172A',
                moonlight: '#E2E8F0',
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
            },
            boxShadow: {
                soft: '0 2px 8px rgba(0, 0, 0, 0.04)',
                medium: '0 4px 16px rgba(0, 0, 0, 0.08)',
            },
        },
    },
    plugins: [],
};
