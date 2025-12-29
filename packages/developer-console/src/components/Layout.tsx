import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/Button';
import { ThemeSelector } from '@/components/ThemeSelector';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { LayoutDashboard, AppWindow, BookOpen, LogOut, Menu, X, Settings, ChevronDown } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

interface NavItem {
    path: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
}

export function Layout() {
    const { t } = useTranslation();
    const { user, logout } = useAuth();
    const { resolvedTheme } = useTheme();
    const location = useLocation();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const userMenuRef = useRef<HTMLDivElement>(null);

    // Close user menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
                setUserMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

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
            (item.path === '/dashboard' && location.pathname === '/') ||
            (item.path === '/docs' && location.pathname.startsWith('/docs'));

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

    // User avatar component
    const UserAvatar = ({ size = 'md' }: { size?: 'sm' | 'md' }) => {
        const sizeClass = size === 'sm' ? 'w-8 h-8 text-xs' : 'w-10 h-10 text-sm';

        if (user?.avatar_url) {
            return (
                <img
                    src={user.avatar_url}
                    alt={user.nickname || 'User'}
                    className={`${sizeClass} rounded-full object-cover`}
                />
            );
        }

        // Default avatar with initials
        const initials = user?.nickname
            ? user.nickname.slice(0, 2).toUpperCase()
            : user?.email?.slice(0, 2).toUpperCase()
            || user?.phone?.slice(-2)
            || 'U';

        return (
            <div className={`${sizeClass} rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-medium`}>
                {initials}
            </div>
        );
    };

    // User display name
    const userDisplayName = user?.nickname || user?.email?.split('@')[0] || user?.phone || t('common.user');

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
                    {/* User Profile Section */}
                    <div className="relative" ref={userMenuRef}>
                        <button
                            onClick={() => setUserMenuOpen(!userMenuOpen)}
                            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${textSecondary} hover:bg-slate-700/50`}
                        >
                            <UserAvatar />
                            <div className="flex-1 text-left overflow-hidden">
                                <p className={`text-sm font-medium ${textPrimary} truncate`}>{userDisplayName}</p>
                                <p className={`text-xs ${textSecondary} truncate`}>
                                    {user?.email || user?.phone || t('common.noContactInfo')}
                                </p>
                            </div>
                            <ChevronDown className={`h-4 w-4 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {/* User Dropdown Menu */}
                        {userMenuOpen && (
                            <div className={`absolute bottom-full left-0 right-0 mb-2 py-2 rounded-lg shadow-lg ${resolvedTheme === 'dark' ? 'bg-slate-700' : 'bg-white'} border ${resolvedTheme === 'dark' ? 'border-slate-600' : 'border-slate-200'}`}>
                                {/* Theme & Language in dropdown */}
                                <div className="flex items-center gap-2 px-4 py-2 border-b border-slate-600/50">
                                    <ThemeSelector />
                                    <LanguageSwitcher />
                                </div>

                                <NavLink
                                    to="/settings"
                                    onClick={() => setUserMenuOpen(false)}
                                    className={`flex items-center gap-2 px-4 py-2 text-sm ${textSecondary} hover:bg-slate-600/50`}
                                >
                                    <Settings className="h-4 w-4" />
                                    {t('nav.settings')}
                                </NavLink>
                                <button
                                    onClick={() => {
                                        setUserMenuOpen(false);
                                        logout();
                                    }}
                                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-400 hover:bg-red-500/10"
                                >
                                    <LogOut className="h-4 w-4" />
                                    {t('common.logout')}
                                </button>
                            </div>
                        )}
                    </div>
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
                } ${sidebarClass} border-r flex flex-col`}>
                <nav className="flex-1 p-4 space-y-2">
                    {navItems.map((item) => (
                        <NavLinkItem key={item.path} item={item} />
                    ))}
                </nav>

                <div className="p-4 border-t border-slate-700 space-y-3">
                    {/* User Profile Section - Mobile */}
                    <div className="flex items-center gap-3 px-3 py-2">
                        <UserAvatar size="sm" />
                        <div className="flex-1 overflow-hidden">
                            <p className={`text-sm font-medium ${textPrimary} truncate`}>{userDisplayName}</p>
                            <p className={`text-xs ${textSecondary} truncate`}>
                                {user?.email || user?.phone || ''}
                            </p>
                        </div>
                    </div>

                    <NavLink
                        to="/settings"
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm ${textSecondary} hover:bg-slate-700/50`}
                    >
                        <Settings className="h-4 w-4" />
                        {t('nav.settings')}
                    </NavLink>

                    {/* Theme & Language in mobile sidebar */}
                    <div className="flex items-center gap-2 px-2">
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
