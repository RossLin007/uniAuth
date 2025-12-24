import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { uniauth } from '@/lib/uniauth';

// 定义 User 接口
interface User {
    id: string;
    email?: string;
    phone?: string;
    name?: string;
    avatar?: string;
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
    // Google OAuth
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
        // Check if token exists (basic validation for now)
        const init = async () => {
            if (token) {
                // Could decode/verify token here
                // For now we just trust it if present
            }
            setLoading(false);
        };
        init();
    }, [token]);

    // Phone auth methods
    const loginWithPhone = useCallback(async (phone: string, code: string): Promise<AuthResult> => {
        try {
            const res = await uniauth.loginWithPhoneCode(phone, code);
            if (res.success && res.access_token) {
                setToken(res.access_token);
                localStorage.setItem('access_token', res.access_token);
                setUser(res.data?.user || { id: 'temp' });
                return { success: true };
            }
            return { success: false, error: res.message || 'Login failed' };
        } catch (err: unknown) {
            return { success: false, error: getErrorMessage(err) };
        }
    }, []);

    const sendPhoneCode = useCallback(async (phone: string): Promise<AuthResult> => {
        try {
            const res = await uniauth.sendPhoneCode(phone);
            return { success: res.success, error: res.message };
        } catch (err: unknown) {
            return { success: false, error: getErrorMessage(err) };
        }
    }, []);

    // Email auth methods
    const loginWithEmail = useCallback(async (email: string, code: string): Promise<AuthResult> => {
        try {
            const res = await uniauth.loginWithEmailCode(email, code);
            if (res.success && res.access_token) {
                setToken(res.access_token);
                localStorage.setItem('access_token', res.access_token);
                setUser(res.data?.user || { id: 'temp' });
                return { success: true };
            }
            return { success: false, error: res.message || 'Login failed' };
        } catch (err: unknown) {
            return { success: false, error: getErrorMessage(err) };
        }
    }, []);

    const sendEmailCode = useCallback(async (email: string): Promise<AuthResult> => {
        try {
            const res = await uniauth.sendEmailCode(email, 'email_verify');
            return { success: res.success, error: res.message };
        } catch (err: unknown) {
            return { success: false, error: getErrorMessage(err) };
        }
    }, []);

    // Google OAuth login
    const loginWithGoogle = useCallback(async () => {
        // Fetch the auth URL from UniAuth's social login endpoint
        const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
        try {
            const response = await fetch(`${baseUrl}/api/v1/auth/oauth/google/authorize`);
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
