# 🤖 AI Prompt: Full-Stack App with UniAuth

> Copy everything below the line and paste into your AI coding assistant.
>
> 复制下方分割线以下的全部内容，粘贴到你的 AI 编程助手中。

---

You are an expert full-stack TypeScript developer. Help me build a complete web application with UniAuth authentication, from scratch.

## Project Context

- **UniAuth Server URL**: `YOUR_UNIAUTH_URL` (e.g. `https://auth.55387.xyz`)
- **Client ID**: `YOUR_CLIENT_ID`
- **Client Secret**: `YOUR_CLIENT_SECRET` (backend only!)
- **App Key**: `YOUR_APP_KEY`
- **Redirect URI**: `YOUR_REDIRECT_URI` (e.g. `http://localhost:5173/auth/callback`)

## SDK Packages

### Frontend: `@55387.ai/uniauth-react`

```bash
npm install @55387.ai/uniauth-react
```

**UniAuthProvider** — Wrap your app:
```tsx
import { UniAuthProvider } from '@55387.ai/uniauth-react';

<UniAuthProvider config={{
  baseUrl: 'YOUR_UNIAUTH_URL',
  appKey: 'YOUR_APP_KEY',
  clientId: 'YOUR_CLIENT_ID',
  storage: 'localStorage',
  sso: {
    ssoUrl: 'YOUR_UNIAUTH_URL',
    clientId: 'YOUR_CLIENT_ID',
    redirectUri: 'YOUR_REDIRECT_URI',
    scope: 'openid profile email',
  },
}}>
  <App />
</UniAuthProvider>
```

**useUniAuth()** — Access auth state:
```tsx
const { user, isAuthenticated, isLoading, login, logout, updateProfile, client, getToken } = useUniAuth();
```

**Key client methods** (via `client`):
```typescript
await client.sendCode(phone, 'login');          // SMS code
await client.loginWithCode(phone, code);        // Phone login
await client.sendEmailCode(email, 'login');     // Email code
await client.loginWithEmailCode(email, code);   // Email code login
await client.loginWithEmail(email, password);   // Email password login
await client.registerWithEmail(email, password, nickname);
await client.verifyMFA(mfaToken, code);         // MFA step
client.startSocialLogin('google');              // Social login redirect
client.loginWithSSO({ usePKCE: true });         // SSO redirect
await client.getAccessToken();                  // Auto-refresh token
```

**Types**:
```typescript
interface UserInfo { id: string; phone: string|null; email: string|null; nickname: string|null; avatar_url: string|null; }
interface LoginResult { user: UserInfo; access_token: string; refresh_token: string; expires_in: number; is_new_user: boolean; mfa_required?: boolean; mfa_token?: string; }
```

### Backend: `@55387.ai/uniauth-server`

```bash
npm install @55387.ai/uniauth-server
```

```typescript
import { UniAuthServer, ServerAuthError } from '@55387.ai/uniauth-server';

const auth = new UniAuthServer({
  baseUrl: process.env.UNIAUTH_URL!,
  clientId: process.env.UNIAUTH_CLIENT_ID!,
  clientSecret: process.env.UNIAUTH_CLIENT_SECRET!,
});

// Express middleware
app.use('/api/*', auth.middleware());
// req.user → UserInfo, req.authPayload → TokenPayload

// Hono middleware
app.use('/api/*', auth.honoMiddleware());
// c.get('user') → UserInfo, c.get('authPayload') → TokenPayload

// Manual verification
const payload = await auth.verifyToken(token);
const user = await auth.getUser(payload.sub);
```

## Requirements

### Architecture
- **Frontend**: React + Vite (or Next.js)
- **Backend**: Express or Hono
- **Language**: TypeScript throughout
- **Auth**: Frontend sends `Authorization: Bearer <token>` header, backend validates via `@55387.ai/uniauth-server`

### Frontend Features
1. **Login Page**: SSO login button + optional phone/email login tabs
2. **Protected Routes**: Redirect to login if not authenticated
3. **Dashboard**: Show user info, sample data from protected API
4. **Settings Page** (required):
   - Language: Chinese 中文 / English
   - Theme: Dark / Light / System
   - User profile display (nickname, avatar, email)
   - Logout button
5. **Toast Notifications**: Never use `alert()` or `confirm()`
6. **i18n**: Chinese + English bilingual UI
7. **Dark Mode**: Light, Dark, System
8. **Responsive**: Desktop + Tablet + Mobile

### Backend Features
1. **Protected API routes** using UniAuth middleware
2. **Public routes** for health check
3. **User-specific data**: Use `req.user.id` or `c.get('user').id` to scope data
4. **Error handling**: JSON error responses with proper status codes
5. **CORS**: Allow frontend origin

### Design Tokens (Fan Design System)
```
Primary: #07C160 | Error: #FA5151 | Warning: #FFBE00 | Link: #576B95
Border Radius: button 8px, card 12px, input 4px
Font: base 17px, h1 20px, caption 14px, small 12px
Spacing: page edge 16px, element gap 8px, unit 4px
Background Light: page #F2F2F2, card #FFFFFF
Background Dark: page #111111, card #191919
Text Light: primary rgba(0,0,0,0.9), secondary rgba(0,0,0,0.5)
Text Dark: primary rgba(255,255,255,0.8), secondary rgba(255,255,255,0.5)
Button height: 48px, Navbar height: 44px
```

### Environment Variables

**Frontend** (`.env`):
```env
VITE_UNIAUTH_URL=YOUR_UNIAUTH_URL
VITE_UNIAUTH_CLIENT_ID=YOUR_CLIENT_ID
VITE_UNIAUTH_APP_KEY=YOUR_APP_KEY
VITE_UNIAUTH_REDIRECT_URI=http://localhost:5173/auth/callback
VITE_API_URL=http://localhost:3000
```

**Backend** (`.env`):
```env
UNIAUTH_URL=YOUR_UNIAUTH_URL
UNIAUTH_CLIENT_ID=YOUR_CLIENT_ID
UNIAUTH_CLIENT_SECRET=YOUR_CLIENT_SECRET
PORT=3000
FRONTEND_URL=http://localhost:5173
```

### Testing
- Frontend: Vitest + React Testing Library
- Backend: Vitest + supertest
- Include tests for auth flow, protected routes, and error handling

Generate the complete project with both frontend and backend. Ensure all code compiles and follows TypeScript best practices.
