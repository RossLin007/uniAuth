# UniAuth React Integration (Source Code Edition)

If you cannot install `@55387.ai/uniauth-react` from npm, please copy the following files into your project.

## 1. Create `src/uniauth/UniAuthProvider.tsx`

Copy the following code exactly:

```tsx
import React, { createContext, useContext, useEffect, useState, useRef, type ReactNode } from 'react';
import { UniAuthClient, type UniAuthConfig, type SSOConfig, type UserInfo } from '@55387.ai/uniauth-client';

export interface UniAuthProviderConfig extends UniAuthConfig {
  /** SSO Configuration (optional but recommended for SSO login) */
  sso?: SSOConfig;
}

export interface UniAuthContextType {
  user: UserInfo | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: Error | null;
  login: (options?: { usePKCE?: boolean; usePopup?: boolean }) => void;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<Pick<UserInfo, 'nickname' | 'avatar_url'>>) => Promise<void>;
  client: UniAuthClient;
  getToken: () => string | null;
}

const UniAuthContext = createContext<UniAuthContextType | undefined>(undefined);

export const UniAuthProvider: React.FC<{ 
  config: UniAuthProviderConfig; 
  children: ReactNode;
}> = ({ config, children }) => {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  const clientRef = useRef<UniAuthClient | null>(null);

  if (!clientRef.current) {
    const { sso, ...clientConfig } = config;
    clientRef.current = new UniAuthClient(clientConfig);
    if (sso) clientRef.current.configureSso(sso);
  }

  const client = clientRef.current!;

  useEffect(() => {
    const init = async () => {
      // 1. Check if this is an SSO Callback
      if (client.isSSOCallback()) {
        try {
          setIsLoading(true);
          console.log('[UniAuth] Processing SSO Callback...');
          const { user } = await client.handleSSOCallback();
          setUser(user);
          setIsAuthenticated(true);
          // Clean URL
          window.history.replaceState({}, document.title, window.location.pathname);
        } catch (err: any) {
          console.error('[UniAuth] SSO Callback Failed:', err);
          setError(err);
        } finally {
          setIsLoading(false);
        }
        return;
      }

      // 2. Initial Session Check
      const currentUser = await client.getCurrentUser();
      if (currentUser) {
        setUser(currentUser);
        setIsAuthenticated(true);
      }
      setIsLoading(false);
    };

    init();

    // 3. Listen for changes (Logout, Token Refresh)
    return client.onAuthStateChange((newUser, isAuth) => {
      setUser(newUser);
      setIsAuthenticated(isAuth);
      setIsLoading(false);
    });
  }, [client]);

  const login = (options = { usePKCE: true }) => {
    try {
      client.loginWithSSO(options);
    } catch (err: any) {
      console.error('[UniAuth] Login Failed:', err);
      setError(err);
    }
  };

  const logout = async () => {
    try {
      await client.logout();
    } catch (err: any) {
      console.error('[UniAuth] Logout Failed:', err);
    }
  };

  return (
    <UniAuthContext.Provider value={{
      user,
      isAuthenticated,
      isLoading,
      error,
      login,
      logout,
      updateProfile: client.updateProfile.bind(client),
      client,
      getToken: () => client.getAccessTokenSync()
    }}>
      {children}
    </UniAuthContext.Provider>
  );
};

export const useUniAuth = () => {
  const context = useContext(UniAuthContext);
  if (!context) throw new Error('useUniAuth must be used within UniAuthProvider');
  return context;
};
```

## 2. Usage in `src/main.tsx`

```tsx
import { UniAuthProvider } from './uniauth/UniAuthProvider';

const config = {
  baseUrl: import.meta.env.VITE_UNIAUTH_BASE_URL || 'https://sso.55387.xyz',
  clientId: import.meta.env.VITE_UNIAUTH_CLIENT_ID,
  // IMPORTANT: This must match Console exactly!
  redirectUri: window.location.origin + '/auth/callback', 
  sso: {
    usePKCE: true,
  }
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <UniAuthProvider config={config}>
    <App />
  </UniAuthProvider>
);
```

## 3. Usage in Components

```tsx
import { useUniAuth } from './uniauth/UniAuthProvider';

export default function LoginPage() {
  const { login, user, isLoading, error } = useUniAuth();

  if (isLoading) return <div>Loading...</div>;
  
  if (error) return <div className="error">{error.message}</div>;

  if (user) {
    return <div>Logged in as: {user.nickname}</div>;
  }

  return <button onClick={() => login()}>Login with SSO</button>;
}
```
