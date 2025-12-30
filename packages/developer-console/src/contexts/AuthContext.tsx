import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { uniauth } from '@/lib/uniauth';
import { API_BASE_URL } from '@/config/api';

// 定义 User 接口
interface User {
    id: string;
    email?: string | null;
    phone?: string | null;
    name?: string;
    nickname?: string | null;
    avatar?: string;
    avatar_url?: string | null;
}

interface AuthResult {
    success: boolean;
    error?: string;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    loading: boolean;
    // Phone auth
    loginWithPhone: (phone: string, code: string) => Promise<AuthResult>;
    sendPhoneCode: (phone: string) => Promise<AuthResult>;
    // Email auth
    loginWithEmail: (email: string, code: string) => Promise<AuthResult>;
    sendEmailCode: (email: string) => Promise<AuthResult>;
    // SSO Login
    loginWithSSO: () => void;
    // Google OAuth (legacy)
    loginWithGoogle: () => void;
    // Logout
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// 错误处理辅助函数
const getErrorMessage = (err: unknown): string => {
    if (err instanceof Error) return err.message;
    if (typeof err === 'string') return err;
    return 'Network Error';
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(localStorage.getItem('access_token'));
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Fetch user info when token exists
        const init = async () => {
            if (token) {
                try {
                    // Fetch user info from the server
                    const userInfo = await uniauth.getCurrentUser();
                    if (userInfo) {
                        setUser({
                            id: userInfo.id,
                            email: userInfo.email,
                            phone: userInfo.phone,
                            nickname: userInfo.nickname,
                            avatar_url: userInfo.avatar_url
                        });
                    }
                } catch (err) {
                    console.error('Failed to fetch user info:', err);
                    // Token might be invalid, clear it
                    localStorage.removeItem('access_token');
                    setToken(null);
                }
            }
            setLoading(false);
        };
        init();
    }, [token]);

    // Phone auth methods
    const loginWithPhone = useCallback(async (phone: string, code: string): Promise<AuthResult> => {
        try {
            const res = await uniauth.loginWithCode(phone, code);
            if (res.access_token) {
                setToken(res.access_token);
                localStorage.setItem('access_token', res.access_token);
                setUser(res.user as User || { id: 'temp' });
                return { success: true };
            }
            return { success: false, error: 'Login failed' };
        } catch (err: unknown) {
            return { success: false, error: getErrorMessage(err) };
        }
    }, []);

    const sendPhoneCode = useCallback(async (phone: string): Promise<AuthResult> => {
        try {
            await uniauth.sendCode(phone, 'login');
            return { success: true };
        } catch (err: unknown) {
            return { success: false, error: getErrorMessage(err) };
        }
    }, []);

    // Email auth methods
    const loginWithEmail = useCallback(async (email: string, code: string): Promise<AuthResult> => {
        try {
            const res = await uniauth.loginWithEmailCode(email, code);
            if (res.access_token) {
                setToken(res.access_token);
                localStorage.setItem('access_token', res.access_token);
                setUser(res.user as User || { id: 'temp' });
                return { success: true };
            }
            return { success: false, error: 'Login failed' };
        } catch (err: unknown) {
            return { success: false, error: getErrorMessage(err) };
        }
    }, []);

    const sendEmailCode = useCallback(async (email: string): Promise<AuthResult> => {
        try {
            await uniauth.sendEmailCode(email, 'login');
            return { success: true };
        } catch (err: unknown) {
            return { success: false, error: getErrorMessage(err) };
        }
    }, []);

    // SSO Login - redirects to central SSO service
    // If user is already logged in at SSO, they'll be automatically logged in here (silent auth)
    const loginWithSSO = useCallback(() => {
        // Generate a random state for CSRF protection
        const state = Math.random().toString(36).substring(7);
        localStorage.setItem('oauth_state', state);

        // Build OAuth authorize URL
        const params = new URLSearchParams({
            client_id: 'developer_console', // This should match the registered app client_id
            redirect_uri: window.location.origin + '/auth/callback',
            response_type: 'code',
            scope: 'openid profile email',
            state,
        });

        // Redirect to SSO OAuth authorize endpoint
        // If user has SSO session, they'll be auto-redirected back with code
        // If not, they'll be redirected to the login page
        window.location.href = `${API_BASE_URL}/api/v1/oauth2/authorize?${params}`;
    }, []);

    // Legacy Google OAuth login (still works, will create SSO session)
    const loginWithGoogle = useCallback(async () => {
        // Fetch the auth URL from UniAuth's social login endpoint
        try {
            const redirectUri = window.location.origin + '/auth/callback/google';
            const response = await fetch(`${API_BASE_URL}/api/v1/auth/oauth/google/authorize?redirect_uri=${encodeURIComponent(redirectUri)}`);
            const data = await response.json();
            if (data.success && data.data?.auth_url) {
                // Redirect to Google's OAuth page
                window.location.href = data.data.auth_url;
            } else {
                console.error('Failed to get Google auth URL:', data);
                alert('Failed to initiate Google login. Please try again.');
            }
        } catch (error) {
            console.error('Error initiating Google login:', error);
            alert('Network error. Please check your connection.');
        }
    }, []);

    const logout = useCallback(() => {
        setToken(null);
        setUser(null);
        localStorage.removeItem('access_token');
    }, []);

    return (
        <AuthContext.Provider value={{
            user,
            token,
            loading,
            loginWithPhone,
            sendPhoneCode,
            loginWithEmail,
            sendEmailCode,
            loginWithSSO,
            loginWithGoogle,
            logout
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
