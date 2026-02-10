import React, { createContext, useContext, useEffect, useState, useRef, type ReactNode } from 'react';
import { UniAuthClient, type UserInfo } from '@55387.ai/uniauth-client';
import type { UniAuthProviderConfig, UniAuthContextType } from './types';

const UniAuthContext = createContext<UniAuthContextType | undefined>(undefined);

export interface UniAuthProviderProps {
    config: UniAuthProviderConfig;
    children: ReactNode;
    /** Custom fallback component during loading */
    loadingComponent?: ReactNode;
}

export const UniAuthProvider: React.FC<UniAuthProviderProps> = ({
    config,
    children,
    loadingComponent
}) => {
    const [user, setUser] = useState<UserInfo | null>(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    // Use ref to hold client instance to avoid re-creation
    const clientRef = useRef<UniAuthClient | null>(null);

    // Initialize client once
    if (!clientRef.current) {
        const { sso, ...clientConfig } = config;
        clientRef.current = new UniAuthClient(clientConfig);

        if (sso) {
            clientRef.current.configureSso(sso);
        }
    }

    const client = clientRef.current!;

    useEffect(() => {
        // 1. Handle SSO Callback if present
        const handleCallback = async () => {
            if (client.isSSOCallback()) {
                try {
                    setIsLoading(true);
                    await client.handleSSOCallback();
                    // State will be updated via onAuthStateChange listener below
                    // Clear URL query params
                    window.history.replaceState({}, document.title, window.location.pathname);
                } catch (err: any) {
                    console.error('[UniAuth] SSO Callback Error:', err);
                    setError(err);
                } finally {
                    setIsLoading(false);
                }
            } else {
                // Initial check
                const currentUser = await client.getCurrentUser();
                if (currentUser) {
                    setUser(currentUser);
                    setIsAuthenticated(true);
                }
                setIsLoading(false);
            }
        };

        handleCallback();

        // 2. Subscribe to Auth State Changes
        const unsubscribe = client.onAuthStateChange((user, isAuth) => {
            setUser(user);
            setIsAuthenticated(isAuth);
            setIsLoading(false);
        });

        return () => {
            unsubscribe();
        };
    }, [client]);

    const login = (options?: { usePKCE?: boolean; usePopup?: boolean }) => {
        try {
            client.loginWithSSO(options);
        } catch (err: any) {
            setError(err);
            console.error('[UniAuth] Login Error:', err);
        }
    };

    const logout = async () => {
        try {
            setIsLoading(true);
            await client.logout();
        } catch (err: any) {
            setError(err);
            console.error('[UniAuth] Logout Error:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const updateProfile = async (updates: Partial<Pick<UserInfo, 'nickname' | 'avatar_url'>>) => {
        try {
            const updatedUser = await client.updateProfile(updates);
            setUser(updatedUser);
        } catch (err: any) {
            throw err;
        }
    };

    const contextValue: UniAuthContextType = {
        user,
        isAuthenticated,
        isLoading,
        error,
        login,
        logout,
        updateProfile,
        client,
        getToken: () => client.getAccessTokenSync()
    };

    return (
        <UniAuthContext.Provider value={contextValue}>
            {isLoading && loadingComponent ? loadingComponent : children}
        </UniAuthContext.Provider>
    );
};

export const useUniAuth = (): UniAuthContextType => {
    const context = useContext(UniAuthContext);
    if (context === undefined) {
        throw new Error('useUniAuth must be used within a UniAuthProvider');
    }
    return context;
};
