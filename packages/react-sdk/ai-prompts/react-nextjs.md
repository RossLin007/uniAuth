# 🤖 AI Prompt: React / Next.js Integration

> Copy everything below the line and paste into your AI coding assistant.
>
> 复制下方分割线以下的全部内容，粘贴到你的 AI 编程助手中。

---

You are an expert TypeScript/React developer. Help me integrate UniAuth authentication into my React (or Next.js) application using the official `@55387.ai/uniauth-react` SDK.

## Project Context

- **UniAuth Server URL**: `YOUR_UNIAUTH_URL` (e.g. `https://auth.55387.xyz`)
- **Client ID**: `YOUR_CLIENT_ID`
- **Redirect URI**: `YOUR_REDIRECT_URI` (e.g. `http://localhost:5173/auth/callback`)
- **App Key** (optional, for direct login): `YOUR_APP_KEY`

## SDK Reference

### Installation

```bash
npm install @55387.ai/uniauth-react
# This automatically installs @55387.ai/uniauth-client as a dependency
```

### UniAuthProvider (React Context)

Wrap your app with `UniAuthProvider` to enable auth state management:

```tsx
import { UniAuthProvider } from '@55387.ai/uniauth-react';

function App() {
  return (
    <UniAuthProvider
      config={{
        baseUrl: 'YOUR_UNIAUTH_URL',
        appKey: 'YOUR_APP_KEY',       // for direct login (phone/email)
        clientId: 'YOUR_CLIENT_ID',   // for SSO/OAuth login
        storage: 'localStorage',      // or 'sessionStorage' | 'memory'
        sso: {
          ssoUrl: 'YOUR_UNIAUTH_URL',
          clientId: 'YOUR_CLIENT_ID',
          redirectUri: 'YOUR_REDIRECT_URI',
          scope: 'openid profile email',
        },
      }}
    >
      <YourApp />
    </UniAuthProvider>
  );
}
```

### useUniAuth() Hook

```tsx
import { useUniAuth } from '@55387.ai/uniauth-react';

function MyComponent() {
  const {
    user,            // UserInfo | null — current user
    isAuthenticated, // boolean
    isLoading,       // boolean
    error,           // Error | null
    login,           // (options?: { usePKCE?: boolean; usePopup?: boolean }) => void — starts SSO login
    logout,          // () => Promise<void>
    updateProfile,   // (updates: { nickname?: string; avatar_url?: string }) => Promise<void>
    client,          // UniAuthClient instance — for advanced operations
    getToken,        // () => string | null — get current access token
  } = useUniAuth();
}
```

### UserInfo Type

```typescript
interface UserInfo {
  id: string;
  phone: string | null;
  email: string | null;
  nickname: string | null;
  avatar_url: string | null;
}
```

### UniAuthClient Methods (available via `client`)

```typescript
// Phone login
await client.sendCode('+8613800138000', 'login');     // Send SMS code
await client.loginWithCode('+8613800138000', '123456'); // Verify code

// Email login
await client.sendEmailCode('user@example.com', 'login');
await client.loginWithEmailCode('user@example.com', '123456');
await client.loginWithEmail('user@example.com', 'password');

// Email registration
await client.registerWithEmail('user@example.com', 'password', 'nickname');

// MFA (when login returns mfa_required: true)
await client.verifyMFA(mfaToken, '123456');

// Social login
const providers = await client.getOAuthProviders(); // [{id:'google',name:'Google',enabled:true}]
client.startSocialLogin('google');                   // Redirects to Google

// SSO (configured via UniAuthProvider)
client.loginWithSSO();                               // Redirects to SSO page
client.loginWithSSO({ usePKCE: true });

// Token management
const token = await client.getAccessToken();         // Auto-refreshes if expired
const isValid = client.isTokenValid();

// Logout
await client.logout();                               // Current session
await client.logoutAll();                            // All devices
```

### LoginResult Type (returned by login methods)

```typescript
interface LoginResult {
  user: UserInfo;
  access_token: string;
  refresh_token: string;
  expires_in: number;
  is_new_user: boolean;
  mfa_required?: boolean;   // true if MFA needed
  mfa_token?: string;       // use with verifyMFA()
  mfa_methods?: string[];   // e.g. ['totp', 'email']
}
```

## Requirements

1. **SSO Login Flow**: Implement a login page with a "Login with UniAuth" button that triggers `login()`. Handle the OAuth callback automatically via `UniAuthProvider`.

2. **Protected Routes**: Create a route guard (or wrapper component) that redirects unauthenticated users to login.

3. **User Profile**: Display user info (nickname, avatar, email) when authenticated. Allow editing nickname and avatar via `updateProfile()`.

4. **Settings Page**: Include at minimum:
   - Language switch (Chinese 中文 / English)
   - Theme mode (Dark / Light / System)
   - User info display
   - Logout button

5. **i18n**: All UI text must support Chinese and English. Use a simple i18n system (context-based or `i18next`).

6. **Dark Mode**: Support light, dark, and system-preference themes.

7. **Notifications**: Use Toast/Snackbar for success/error messages. **Never use `alert()` or `confirm()`.**

8. **Responsive**: Must work on desktop, tablet, and mobile.

9. **Design System**: Follow these design tokens:
   - Primary color: `#07C160`
   - Error: `#FA5151`, Warning: `#FFBE00`
   - Border radius: button `8px`, card `12px`, input `4px`
   - Base font: `17px`, scale: h1 `20px`, caption `14px`, small `12px`
   - Page edge padding: `16px`, element gap: `8px`
   - Background (light): `#F2F2F2` page / `#FFFFFF` card
   - Background (dark): `#111111` page / `#191919` card

10. **Testing**: Include unit tests with Vitest + React Testing Library.

## Environment Variables

```env
VITE_UNIAUTH_URL=YOUR_UNIAUTH_URL
VITE_UNIAUTH_CLIENT_ID=YOUR_CLIENT_ID
VITE_UNIAUTH_APP_KEY=YOUR_APP_KEY
VITE_UNIAUTH_REDIRECT_URI=http://localhost:5173/auth/callback
```

## File Structure (suggested)

```
src/
├── providers/
│   └── AuthProvider.tsx          # UniAuthProvider wrapper
├── hooks/
│   └── useAuth.ts                # Re-export useUniAuth + custom logic
├── components/
│   ├── ProtectedRoute.tsx        # Auth guard
│   ├── LoginPage.tsx             # Login UI
│   └── UserAvatar.tsx            # User avatar display
├── pages/
│   ├── LoginPage.tsx
│   ├── DashboardPage.tsx
│   └── SettingsPage.tsx
├── i18n/
│   ├── index.ts
│   ├── zh.ts
│   └── en.ts
└── __tests__/
    ├── AuthProvider.test.tsx
    └── LoginPage.test.tsx
```

Generate the complete implementation. Make sure code compiles without errors and follows TypeScript best practices.
