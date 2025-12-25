import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/Button';
import { ThemeSelector } from '@/components/ThemeSelector';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { LayoutDashboard, AppWindow, BookOpen, LogOut, Menu, X } from 'lucide-react';
import { useState } from 'react';

interface NavItem {
    path: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
}

export function Layout() {
    const { t } = useTranslation();
    const { logout } = useAuth();
    const { resolvedTheme } = useTheme();
    const location = useLocation();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const navItems: NavItem[] = [
        { path: '/dashboard', label: t('nav.dashboard'), icon: LayoutDashboard },
        { path: '/apps', label: t('nav.apps'), icon: AppWindow },
        { path: '/docs', label: t('nav.docs'), icon: BookOpen },
    ];

    const bgClass = resolvedTheme === 'dark' ? 'bg-slate-900' : 'bg-slate-50';
    const sidebarClass = resolvedTheme === 'dark'
        ? 'bg-slate-800 border-slate-700'
        : 'bg-white border-slate-200';
    const textPrimary = resolvedTheme === 'dark' ? 'text-white' : 'text-slate-900';
    const textSecondary = resolvedTheme === 'dark' ? 'text-slate-400' : 'text-slate-600';

    const NavLinkItem = ({ item }: { item: NavItem }) => {
        const Icon = item.icon;
        const isActive = location.pathname === item.path ||
            (item.path === '/dashboard' && location.pathname === '/');

        return (
            <NavLink
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${isActive
                        ? 'bg-blue-600 text-white'
                        : `${textSecondary} hover:bg-slate-700/50 hover:text-white`
                    }`}
            >
                <Icon className="h-5 w-5" />
                <span className="font-medium">{item.label}</span>
            </NavLink>
        );
    };

    return (
        <div className={`min-h-screen ${bgClass} flex`}>
            {/* Desktop Sidebar */}
            <aside className={`hidden md:flex md:flex-col md:w-64 ${sidebarClass} border-r`}>
                <div className="p-6 border-b border-slate-700">
                    <h1 className={`text-xl font-bold ${textPrimary}`}>{t('dashboard.title')}</h1>
                    <p className={`text-sm ${textSecondary}`}>{t('dashboard.subtitle')}</p>
                </div>

                <nav className="flex-1 p-4 space-y-2">
                    {navItems.map((item) => (
                        <NavLinkItem key={item.path} item={item} />
                    ))}
                </nav>

                <div className="p-4 border-t border-slate-700 space-y-3">
                    <div className="flex items-center gap-2">
                        <ThemeSelector />
                        <LanguageSwitcher />
                    </div>
                    <Button
                        variant="ghost"
                        className="w-full justify-start text-red-400 hover:text-red-300 hover:bg-red-500/10"
                        onClick={logout}
                    >
                        <LogOut className="h-4 w-4 mr-2" />
                        {t('common.logout')}
                    </Button>
                </div>
            </aside>

            {/* Mobile Header */}
            <div className="md:hidden fixed top-0 left-0 right-0 z-50 h-16">
                <div className={`${sidebarClass} border-b h-full flex items-center justify-between px-4`}>
                    <h1 className={`text-lg font-bold ${textPrimary}`}>{t('dashboard.title')}</h1>
                    <button
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        className={`p-2 rounded-lg ${textSecondary} hover:bg-slate-700/50`}
                    >
                        {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                    </button>
                </div>
            </div>

            {/* Mobile Menu Overlay */}
            {mobileMenuOpen && (
                <div
                    className="md:hidden fixed inset-0 z-40 bg-black/50"
                    onClick={() => setMobileMenuOpen(false)}
                />
            )}

            {/* Mobile Sidebar */}
            <aside className={`md:hidden fixed top-16 left-0 bottom-0 w-64 z-50 transform transition-transform ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
                } ${sidebarClass} border-r`}>
                <nav className="p-4 space-y-2">
                    {navItems.map((item) => (
                        <NavLinkItem key={item.path} item={item} />
                    ))}
                </nav>

                <div className="p-4 border-t border-slate-700 space-y-3">
                    <div className="flex items-center gap-2">
                        <ThemeSelector />
                        <LanguageSwitcher />
                    </div>
                    <Button
                        variant="ghost"
                        className="w-full justify-start text-red-400 hover:text-red-300 hover:bg-red-500/10"
                        onClick={logout}
                    >
                        <LogOut className="h-4 w-4 mr-2" />
                        {t('common.logout')}
                    </Button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 md:ml-0 mt-16 md:mt-0">
                <div className="p-4 md:p-8 max-w-5xl mx-auto">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
