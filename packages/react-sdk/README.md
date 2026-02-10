# @55387.ai/uniauth-react

Official React SDK for UniAuth integration. Provides easy-to-use hooks and context for managing authentication state and SSO flows.

## Features

- 🔐 **Automated SSO**: Handles authorization code exchange and PKCE flow automatically.
- 🔄 **State Management**: Reactive user state (`user`, `isAuthenticated`, `isLoading`).
- 🛡️ **Type-Safe**: Full TypeScript support.
- 🍪 **Token Management**: Automatic token storage and refresh.

## Installation

```bash
npm install @55387.ai/uniauth-react @55387.ai/uniauth-client
```

> **Note**: If you are using this in a monorepo or cannot access the private registry, you can copy the source code from `src/` directly into your project.

## Quick Start

### 1. Configure the Provider

Wrap your application root with `UniAuthProvider`.

```tsx
// src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { UniAuthProvider, type UniAuthProviderConfig } from '@55387.ai/uniauth-react';
import App from './App';

const config: UniAuthProviderConfig = {
  // 1. Basic Config
  baseUrl: import.meta.env.VITE_UNIAUTH_BASE_URL || 'https://sso.55387.xyz',
  clientId: import.meta.env.VITE_UNIAUTH_CLIENT_ID,
  
  // 2. Redirect URI (Must match Console EXACTLY)
  redirectUri: window.location.origin + '/callback',
  
  // 3. SSO Specifics
  sso: {
    // URL of the SSO Authorize Endpoint
    ssoUrl: 'https://sso.55387.xyz',
    // Always use PKCE for public clients (SPA)
    usePKCE: true,
  }
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <UniAuthProvider 
      config={config}
      // Optional: Custom loading component
      loadingComponent={<div className="loading">Initializing Auth...</div>}
    >
      <App />
    </UniAuthProvider>
  </React.StrictMode>
);
```

### 2. Use the Hook

Access authentication state in any component.

```tsx
// src/components/LoginButton.tsx
import { useUniAuth } from '@55387.ai/uniauth-react';

export const LoginButton = () => {
  const { 
    user, 
    isAuthenticated, 
    isLoading, 
    login, 
    logout 
  } = useUniAuth();

  if (isLoading) return <div>Checking session...</div>;

  if (isAuthenticated && user) {
    return (
      <div className="user-profile">
        <img src={user.avatar_url} alt={user.nickname} />
        <span>Welcome, {user.nickname}!</span>
        <button onClick={() => logout()}>Logout</button>
      </div>
    );
  }

  return (
    <button onClick={() => login()}>
      Login with SSO
    </button>
  );
};
```

## Advanced Usage

### Getting Access Token

You can retrieve the valid access token for API requests.

```ts
const { getToken } = useUniAuth();

const callApi = async () => {
  const token = getToken();
  if (!token) return;

  const res = await fetch('/api/protected', {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
};
```

### Handling Nginx/CORS Issues

If you encounter CORS errors during token exchange:

1.  **Server-Side Fix (Recommended)**: Add your domain to `CORS_ORIGINS` on the SSO Server.
2.  **Proxy Fix**: Configure Nginx proxy to forward `/api/uni-auth/` -> SSO Server, and update `baseUrl` in config to point to the proxy.

## Troubleshooting

### `invalid_client` Error
- Check `clientId` matches Console exactly (no trailing spaces).
- Check `redirectUri` matches Console exactly (http vs https, trailing slash).
- Ensure you used `sso.55387.xyz` (Production) or your own dev server correctly.

### 404 on Callback
- Ensure your SPA router (React Router) handles the `/callback` route.
- Ensure your Nginx config directs all routes to `index.html` (`try_files $uri /index.html`).

### 401 Unauthorized
- Check if you are sending the `Authorization: Bearer <token>` header in your API calls.
