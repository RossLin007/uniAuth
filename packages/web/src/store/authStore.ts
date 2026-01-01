import { create } from 'zustand';
import { authClient } from '../utils/auth';
import type { UserInfo } from '@55387.ai/uniauth-client';

interface AuthState {
    user: UserInfo | null;
    accessToken: string | null;
    refreshToken: string | null;
    isAuthenticated: boolean;
    isValidating: boolean;
    // Actions are now delegated to authClient or just state updaters
    setAuth: (user: UserInfo, accessToken: string, refreshToken: string) => void;
    clearAuth: () => void;
    refreshUser: () => Promise<void>;
    validateAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => {
    // Initialize state from authClient (sync if available in localStorage)
    const initialToken = authClient.getAccessTokenSync();
    const initialUser = authClient.getCachedUser();

    // Setup listener for auth state changes
    authClient.onAuthStateChange((user, isAuthenticated) => {
        set({
            user,
            isAuthenticated,
            accessToken: isAuthenticated ? authClient.getAccessTokenSync() : null,
            refreshToken: null, // We don't need to expose refresh token in store usually, SDK handles it
            isValidating: false,
        });
    });

    return {
        user: initialUser,
        accessToken: initialToken,
        refreshToken: null,
        isAuthenticated: !!initialToken,
        isValidating: false, // Initial state is determined by sync check

        setAuth: (user, accessToken, refreshToken) => {
            // This might not be needed if we strictly use authClient.login()
            // But for compatibility with existing code that calls setAuth manually:
            // We should updated authClient storage manually if setAuth is called from outside?
            // Actually, best to enforce usage of authClient.login everywhere.
            // For now, we update local state, but warning: this doesn't update authClient storage if called manually!
            // So we should try to eliminate manual setAuth calls.
            set({
                user,
                accessToken,
                refreshToken,
                isAuthenticated: true,
                isValidating: false,
            });
        },

        clearAuth: () => {
            authClient.logout(); // This will trigger onAuthStateChange
            set({
                user: null,
                accessToken: null,
                refreshToken: null,
                isAuthenticated: false,
                isValidating: false,
            });
        },

        refreshUser: async () => {
            try {
                const user = await authClient.getCurrentUser();
                set({ user });
            } catch (error) {
                console.error('Failed to refresh user:', error);
            }
        },

        validateAuth: async () => {
            set({ isValidating: true });
            try {
                // If we have a token, try to fetch user to validate it
                const user = await authClient.getCurrentUser();
                // onAuthStateChange should update the store
            } catch (error) {
                console.error('Failed to validate auth:', error);
                // Auth error validation likely handled by SDK (clears token if 401)
                if (!authClient.getAccessTokenSync()) {
                    get().clearAuth();
                }
            } finally {
                set({ isValidating: false });
            }
        },
    };
});

