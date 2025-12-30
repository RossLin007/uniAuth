import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { API_BASE_URL } from '../config/api';

interface User {
    id: string;
    phone: string | null;
    email: string | null;
    nickname: string | null;
    avatar_url: string | null;
}

interface AuthState {
    user: User | null;
    accessToken: string | null;
    refreshToken: string | null;
    isAuthenticated: boolean;
    isValidating: boolean;
    setAuth: (user: User, accessToken: string, refreshToken: string) => void;
    clearAuth: () => void;
    refreshUser: () => Promise<void>;
    validateAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            user: null,
            accessToken: null,
            refreshToken: null,
            isAuthenticated: false,
            isValidating: true, // Start as validating
            setAuth: (user, accessToken, refreshToken) =>
                set({
                    user,
                    accessToken,
                    refreshToken,
                    isAuthenticated: true,
                    isValidating: false,
                }),
            clearAuth: () =>
                set({
                    user: null,
                    accessToken: null,
                    refreshToken: null,
                    isAuthenticated: false,
                    isValidating: false,
                }),
            refreshUser: async () => {
                const { accessToken } = get();
                if (!accessToken) return;

                try {
                    const response = await fetch(`${API_BASE_URL}/api/v1/user/me`, {
                        headers: {
                            Authorization: `Bearer ${accessToken}`,
                        },
                    });
                    if (response.ok) {
                        const data = await response.json();
                        if (data.success && data.data) {
                            set({ user: data.data });
                        }
                    }
                } catch (error) {
                    console.error('Failed to refresh user:', error);
                }
            },
            validateAuth: async () => {
                const { accessToken } = get();
                if (!accessToken) {
                    set({ isValidating: false, isAuthenticated: false });
                    return;
                }

                try {
                    const response = await fetch(`${API_BASE_URL}/api/v1/user/me`, {
                        headers: {
                            Authorization: `Bearer ${accessToken}`,
                        },
                    });
                    if (response.ok) {
                        const data = await response.json();
                        if (data.success && data.data) {
                            set({ user: data.data, isValidating: false, isAuthenticated: true });
                            return;
                        }
                    }
                    // Token invalid - clear auth
                    get().clearAuth();
                } catch (error) {
                    console.error('Failed to validate auth:', error);
                    get().clearAuth();
                }
            },
        }),
        {
            name: 'uniauth-storage',
            partialize: (state) => ({
                user: state.user,
                accessToken: state.accessToken,
                refreshToken: state.refreshToken,
                isAuthenticated: state.isAuthenticated,
            }),
            onRehydrateStorage: () => (state) => {
                // After rehydration, validate the token
                if (state && state.accessToken) {
                    state.validateAuth();
                } else if (state) {
                    // No token, just mark as not validating
                    state.isValidating = false;
                }
            },
        }
    )
);
