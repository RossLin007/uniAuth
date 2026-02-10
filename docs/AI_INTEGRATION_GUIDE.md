# UniAuth Integration Guide for AI Assistants

> **Purpose**: This document provides everything an AI coding assistant needs to integrate UniAuth into any project. It covers all authentication methods, SDK usage, OAuth2/OIDC flows, API reference, and complete code examples.
>
> **UniAuth Service URL (Production)**: `https://sso.55387.xyz`
>
> **SDK Packages**:
> - Frontend: `@55387.ai/uniauth-client` (v1.2.2)
> - Backend: `@55387.ai/uniauth-server` (v1.2.2)

---

## Table of Contents

1. [Overview](#1-overview)
2. [Prerequisites](#2-prerequisites)
3. [Integration Methods Decision Tree](#3-integration-methods-decision-tree)
4. [Method A: SDK Integration (Recommended)](#4-method-a-sdk-integration-recommended)
5. [Method B: SSO / OAuth2 Authorization Code Flow](#5-method-b-sso--oauth2-authorization-code-flow)
6. [Method C: OIDC Standard Integration](#6-method-c-oidc-standard-integration)
7. [Method D: Direct API Integration (No SDK)](#7-method-d-direct-api-integration-no-sdk)
8. [Complete API Reference](#8-complete-api-reference)
9. [Data Types & Interfaces](#9-data-types--interfaces)
10. [Error Handling](#10-error-handling)
11. [Security Best Practices](#11-security-best-practices)
12. [Framework-Specific Examples](#12-framework-specific-examples)
13. [Troubleshooting](#13-troubleshooting)
14. [FAQ](#14-faq)

---

## 1. Overview

UniAuth is a unified authentication platform providing centralized user authentication and authorization. It supports:

| Feature | Description |
|---------|-------------|
| 📱 Phone Login | Phone + SMS verification code (Tencent Cloud SMS) |
| 📧 Email Login | Email + verification code / Email + password |
| 🔐 OAuth2/OIDC | Acts as an OAuth 2.0 / OpenID Connect Provider |
| 🔑 JWT Tokens | Access Token (1h) + Refresh Token (30d) with rotation |
| 🔄 SSO | Single Sign-On across multiple applications |
| 🛡️ MFA | TOTP-based multi-factor authentication |
| 🤖 M2M | Machine-to-Machine authentication via Client Credentials |
| 🔌 Social Login | Google, GitHub, WeChat OAuth |

### Architecture

```
┌──────────────────────────────┐
│     Your Application         │
│  ┌────────┐  ┌────────────┐  │
│  │Frontend│  │  Backend   │  │
│  │(Client │  │ (Server    │  │
│  │  SDK)  │  │   SDK)     │  │
│  └───┬────┘  └─────┬──────┘  │
└──────┼──────────────┼────────┘
       │              │
       │   HTTPS      │  HTTPS
       ▼              ▼
┌──────────────────────────────┐
│   UniAuth Server             │
│   https://sso.55387.xyz      │
│   (Hono + Supabase + Redis)  │
└──────────────────────────────┘
```

---

## 2. Prerequisites

### 2.1 Register Your Application

Go to the **UniAuth Developer Console** (`https://sso.55387.xyz/developer`) and register your app to get:

| Credential | Description | Example |
|------------|-------------|---------|
| `Client ID` | Unique app identifier | `ua_xxxxxxxxxxxx` |
| `Client Secret` | App secret key (keep secure, never in frontend) | `xxxxxxxx` |
| `Redirect URIs` | Allowed OAuth callback URLs (multiple supported) | `http://localhost:3000/callback` |
| `Client Type` | **Public** (frontend SPA) or **Confidential** (backend) | Depends on your architecture |
| `Scopes` | Authorization scopes | `openid profile email phone` |

### 2.2 Environment Variables

Your project needs these environment variables:

```env
# Required
UNIAUTH_URL=https://sso.55387.xyz
UNIAUTH_CLIENT_ID=ua_xxxxxxxxxxxx
UNIAUTH_CLIENT_SECRET=your_client_secret  # Backend only, NEVER in frontend

# Optional
UNIAUTH_REDIRECT_URI=http://localhost:3000/callback
```

---

## 3. Integration Methods Decision Tree

Choose the best method based on your scenario:

```
Is your app a Node.js / TypeScript project?
├── YES → Do you want embedded login UI (your own login form)?
│   ├── YES → Use Method A: SDK Integration (Trusted Client)
│   └── NO → Do you need SSO (redirect to UniAuth login page)?
│       ├── YES → Is your backend a Confidential Client?
│       │   ├── YES → Use Method B: Backend-proxy SSO flow
│       │   └── NO → Use Method A: Client SDK SSO
│       └── NO → Use Method A: SDK Integration
├── NO → Are you using Python, Java, Go, etc.?
│   ├── YES → Use Method C: OIDC Standard Integration
│   └── NO → Use Method D: Direct API Integration
```

| Method | When to Use | Complexity |
|--------|-------------|------------|
| **A: SDK** | Node.js/TS projects, fastest integration | ⭐ Low |
| **B: SSO/OAuth2** | Cross-domain SSO, redirecting to UniAuth login page | ⭐⭐ Medium |
| **C: OIDC** | Non-Node.js projects, using standard OIDC libraries | ⭐⭐ Medium |
| **D: Direct API** | Any language, no SDK dependency, full control | ⭐⭐⭐ High |

---

## 4. Method A: SDK Integration (Recommended)

### 4.1 Installation

```bash
# Frontend SDK
npm install @55387.ai/uniauth-client

# Backend SDK
npm install @55387.ai/uniauth-server
```

---

### 4.2 Frontend SDK — Embedded Login (Trusted Client)

> **Requirement**: Your app must be registered as a **Trusted Client** (`trusted_client` grant type) in the Developer Console.

#### Initialize

```typescript
import { UniAuthClient } from '@55387.ai/uniauth-client';

const auth = new UniAuthClient({
  baseUrl: 'https://sso.55387.xyz',
  // clientId: 'ua_xxxx',         // Optional for trusted client
  // storage: 'localStorage',     // 'localStorage' | 'sessionStorage' | 'memory'
  // enableRetry: true,           // Auto-retry on failure (default: true)
  // timeout: 30000,              // Request timeout in ms (default: 30000)
  onTokenRefresh: (tokens) => {
    console.log('Tokens refreshed automatically');
  },
  onAuthError: (error) => {
    console.error('Auth error:', error);
  },
});
```

#### Phone + SMS Login

```typescript
// Step 1: Send verification code
const sendResult = await auth.sendCode('+8613800138000');
// sendResult: { success: true, data: { expires_in: 300, retry_after: 60 } }

// Step 2: Login with code
const loginResult = await auth.loginWithCode('+8613800138000', '123456');
// loginResult: { success: true, data: { user, access_token, refresh_token, expires_in, is_new_user } }
```

#### Email + Code Login (Passwordless)

```typescript
// Step 1: Send email code
await auth.sendEmailCode('user@example.com');

// Step 2: Login
const result = await auth.loginWithEmailCode('user@example.com', '123456');
```

#### Email + Password Login

```typescript
const result = await auth.loginWithEmail('user@example.com', 'password123');
```

#### Email Registration

```typescript
const result = await auth.registerWithEmail('user@example.com', 'password123', 'Nickname');
```

#### MFA (Multi-Factor Authentication)

```typescript
const result = await auth.loginWithCode(phone, code);

if (result.mfa_required) {
  // Prompt user for TOTP code from authenticator app
  const mfaCode = '123456';
  const mfaResult = await auth.verifyMFA(result.mfa_token!, mfaCode);
  // mfaResult contains final access_token and refresh_token
}
```

#### User Management

```typescript
// Get current user
const user = await auth.getCurrentUser();
// user: { id, phone, email, nickname, avatar_url }

// Update profile
await auth.updateProfile({ nickname: 'New Name', avatar_url: 'https://...' });

// Check auth status
const isLoggedIn = auth.isAuthenticated();

// Get access token (auto-refreshes if expired)
const token = await auth.getAccessToken();

// Get cached user (synchronous, no API call)
const cachedUser = auth.getCachedUser();

// Listen to auth state changes
const unsubscribe = auth.onAuthStateChange((user, isAuthenticated) => {
  if (isAuthenticated) {
    console.log('Logged in:', user);
  } else {
    console.log('Logged out');
  }
});

// Logout
await auth.logout();      // Current device
await auth.logoutAll();   // All devices
```

#### Social Login

```typescript
// Get available OAuth providers
const providers = await auth.getOAuthProviders();
// providers: ['google', 'github', 'wechat']

// Start social login (redirects user)
auth.startSocialLogin('google');
auth.startSocialLogin('github');
auth.startSocialLogin('wechat');
```

---

### 4.3 Frontend SDK — SSO Login (Public Client)

> For apps that redirect to UniAuth's login page instead of building their own.

```typescript
// Step 1: Configure SSO
auth.configureSso({
  ssoUrl: 'https://sso.55387.xyz',
  clientId: 'ua_xxxxxxxxxxxx',
  redirectUri: window.location.origin + '/callback',
  scope: 'openid profile email phone', // default: 'openid profile email'
});

// Step 2: Trigger SSO login (redirects to UniAuth login page)
auth.loginWithSSO();

// With PKCE (recommended for public clients):
auth.loginWithSSO({ usePKCE: true });
```

```typescript
// Step 3: Handle callback (on your /callback page)
// React example:
function CallbackPage() {
  useEffect(() => {
    const handleCallback = async () => {
      if (auth.isSSOCallback()) {
        try {
          const result = await auth.handleSSOCallback();
          if (result) {
            // result: { access_token, refresh_token?, expires_in?, token_type, id_token? }
            localStorage.setItem('access_token', result.access_token);
            if (result.refresh_token) {
              localStorage.setItem('refresh_token', result.refresh_token);
            }
            window.location.href = '/';
          }
        } catch (error) {
          console.error('SSO callback error:', error);
        }
      }
    };
    handleCallback();
  }, []);

  return <div>Logging in...</div>;
}
```

> ⚠️ **Important**: If your app is a **Confidential Client**, the frontend SDK cannot call the token endpoint directly (missing `client_secret`). Use **Method B** (backend-proxy flow) instead.

---

### 4.4 Backend SDK

#### Initialize

```typescript
// lib/auth.ts
import { UniAuthServer } from '@55387.ai/uniauth-server';

export const uniauth = new UniAuthServer({
  baseUrl: process.env.UNIAUTH_URL || 'https://sso.55387.xyz',
  clientId: process.env.UNIAUTH_CLIENT_ID!,
  clientSecret: process.env.UNIAUTH_CLIENT_SECRET!,
  // jwtPublicKey: '...',  // Optional: for local JWT verification (faster)
});
```

#### Express Middleware

```typescript
import express from 'express';
import { uniauth } from './lib/auth';

const app = express();

// Protect all /api routes
app.use('/api/*', uniauth.middleware());

// Access user info in routes
app.get('/api/profile', (req, res) => {
  // req.user       — full user info (UserInfo)
  // req.authPayload — JWT payload (TokenPayload)
  res.json({
    userId: req.user?.id,
    email: req.user?.email,
    phone: req.user?.phone,
    tokenExp: req.authPayload?.exp,
  });
});
```

#### Hono Middleware

```typescript
import { Hono } from 'hono';
import { uniauth } from './lib/auth';

const app = new Hono();

// Protect all /api routes
app.use('/api/*', uniauth.honoMiddleware());

// Access user info
app.get('/api/profile', (c) => {
  const user = c.get('user');
  return c.json({ user });
});
```

#### Manual Token Verification

```typescript
import { uniauth } from './lib/auth';

async function handleRequest(req: Request) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const payload = await uniauth.verifyToken(token);
    // payload.sub   = User ID
    // payload.email = Email
    // payload.phone = Phone
    // payload.exp   = Expiration (Unix timestamp)
  } catch (error) {
    return new Response('Invalid token', { status: 401 });
  }
}
```

#### Token Introspection (RFC 7662)

```typescript
const result = await uniauth.introspectToken(accessToken);

if (result.active) {
  console.log('User:', result.sub);
  console.log('Scopes:', result.scope);
} else {
  console.log('Token is invalid or expired');
}
```

#### Quick Token Check

```typescript
const isValid = await uniauth.isTokenActive(token);
```

---

## 5. Method B: SSO / OAuth2 Authorization Code Flow

### When to Use

Use this when your backend is a **Confidential Client** and you want SSO (redirect to UniAuth login page with `client_secret` exchange on the backend).

### Flow Diagram

```
User → Frontend → /api/auth/login → Backend generates auth URL → Redirect to SSO
                                                                 ↓
User ← Frontend ← /              ← Backend sets Cookie ←     SSO callback to /api/auth/callback
                                                                 ↑
                                               Backend exchanges code for tokens with client_secret
```

### OAuth2 Endpoints

| Endpoint | URL |
|----------|-----|
| Authorization | `https://sso.55387.xyz/api/v1/oauth2/authorize` |
| Token | `https://sso.55387.xyz/api/v1/oauth2/token` |
| UserInfo | `https://sso.55387.xyz/api/v1/oauth2/userinfo` |
| JWKS | `https://sso.55387.xyz/.well-known/jwks.json` |
| OIDC Discovery | `https://sso.55387.xyz/.well-known/openid-configuration` |

### Complete Backend Implementation (Hono)

```typescript
import { Hono } from 'hono';
import { setCookie, getCookie, deleteCookie } from 'hono/cookie';
import { UniAuthServer } from '@55387.ai/uniauth-server';
import crypto from 'crypto';

const app = new Hono();

const auth = new UniAuthServer({
  baseUrl: 'https://sso.55387.xyz',
  clientId: process.env.UNIAUTH_CLIENT_ID!,
  clientSecret: process.env.UNIAUTH_CLIENT_SECRET!,
});

// Helper: generate random state for CSRF protection
function generateState(): string {
  return crypto.randomBytes(32).toString('hex');
}

// 1. Login endpoint — redirects to UniAuth SSO
app.get('/api/auth/login', (c) => {
  const origin = c.req.header('origin') || c.req.header('referer')?.replace(/\/+$/, '') || 'http://localhost:3000';
  const redirectUri = `${origin}/api/auth/callback`;
  const state = generateState();

  // TODO: Store state in Redis/session for CSRF validation

  const params = new URLSearchParams({
    client_id: process.env.UNIAUTH_CLIENT_ID!,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid profile email phone',
    state,
  });

  return c.redirect(`https://sso.55387.xyz/api/v1/oauth2/authorize?${params.toString()}`);
});

// 2. Callback endpoint — exchanges code for tokens
app.get('/api/auth/callback', async (c) => {
  const code = c.req.query('code');
  const state = c.req.query('state');

  if (!code) {
    return c.json({ error: 'Missing authorization code' }, 400);
  }

  // TODO: Validate state against stored value

  const origin = c.req.header('referer')?.replace(/\/api\/auth\/callback.*$/, '') || 'http://localhost:3000';
  const redirectUri = `${origin}/api/auth/callback`;

  // Exchange code for tokens
  const response = await fetch('https://sso.55387.xyz/api/v1/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.UNIAUTH_CLIENT_ID,
      client_secret: process.env.UNIAUTH_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    return c.json({ error: 'Token exchange failed', details: error }, 400);
  }

  const { access_token, id_token, refresh_token } = await response.json();

  // Store token in httpOnly cookie (secure!)
  setCookie(c, 'auth_token', id_token || access_token, {
    httpOnly: true,
    secure: true,
    sameSite: 'Lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  });

  // Redirect to frontend home
  return c.redirect('/');
});

// 3. Auth status endpoint
app.get('/api/auth/status', async (c) => {
  const token = getCookie(c, 'auth_token');
  if (!token) {
    return c.json({ authenticated: false });
  }

  try {
    const payload = await auth.verifyToken(token);
    return c.json({
      authenticated: true,
      userId: payload.sub,
      email: payload.email,
    });
  } catch {
    return c.json({ authenticated: false });
  }
});

// 4. Logout endpoint
app.post('/api/auth/logout', (c) => {
  deleteCookie(c, 'auth_token', { path: '/' });
  return c.json({ success: true });
});
```

### Frontend Code for SSO (Non-SDK)

```typescript
// Trigger login
const handleLogin = () => {
  window.location.href = '/api/auth/login';
};

// Check login status
const checkAuth = async (): Promise<boolean> => {
  const response = await fetch('/api/auth/status', { credentials: 'include' });
  const data = await response.json();
  return data.authenticated === true;
};

// Logout
const handleLogout = async () => {
  await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
  window.location.href = '/login';
};
```

---

## 6. Method C: OIDC Standard Integration

UniAuth is a **fully OIDC-compliant Identity Provider**. Any standard OIDC client library works.

### OIDC Discovery URL

```
https://sso.55387.xyz/.well-known/openid-configuration
```

### Discovery Response (Key Fields)

```json
{
  "issuer": "https://sso.55387.xyz",
  "authorization_endpoint": "https://sso.55387.xyz/api/v1/oauth2/authorize",
  "token_endpoint": "https://sso.55387.xyz/api/v1/oauth2/token",
  "userinfo_endpoint": "https://sso.55387.xyz/api/v1/oauth2/userinfo",
  "jwks_uri": "https://sso.55387.xyz/.well-known/jwks.json",
  "scopes_supported": ["openid", "profile", "email", "phone"],
  "response_types_supported": ["code"],
  "grant_types_supported": ["authorization_code", "client_credentials", "refresh_token"],
  "id_token_signing_alg_values_supported": ["RS256"]
}
```

### Node.js + Passport

```javascript
import passport from 'passport';
import { Strategy as OpenIDStrategy } from 'passport-openidconnect';

passport.use(new OpenIDStrategy({
    issuer: 'https://sso.55387.xyz',
    authorizationURL: 'https://sso.55387.xyz/api/v1/oauth2/authorize',
    tokenURL: 'https://sso.55387.xyz/api/v1/oauth2/token',
    userInfoURL: 'https://sso.55387.xyz/api/v1/oauth2/userinfo',
    clientID: process.env.UNIAUTH_CLIENT_ID,
    clientSecret: process.env.UNIAUTH_CLIENT_SECRET,
    callbackURL: 'https://myapp.com/callback',
    scope: ['openid', 'profile', 'email']
  },
  (issuer, profile, done) => {
    return done(null, profile);
  }
));

app.get('/auth/uniauth', passport.authenticate('openidconnect'));
app.get('/callback',
  passport.authenticate('openidconnect', { failureRedirect: '/login' }),
  (req, res) => res.redirect('/dashboard')
);
```

### Next.js + NextAuth

```typescript
// pages/api/auth/[...nextauth].ts  or  app/api/auth/[...nextauth]/route.ts
import NextAuth from 'next-auth';

export const authOptions = {
  providers: [
    {
      id: 'uniauth',
      name: 'UniAuth',
      type: 'oauth',
      wellKnown: 'https://sso.55387.xyz/.well-known/openid-configuration',
      authorization: { params: { scope: 'openid profile email phone' } },
      idToken: true,
      profile(profile) {
        return {
          id: profile.sub,
          name: profile.name,
          email: profile.email,
          image: profile.picture,
        };
      },
      clientId: process.env.UNIAUTH_CLIENT_ID,
      clientSecret: process.env.UNIAUTH_CLIENT_SECRET,
    },
  ],
};

export default NextAuth(authOptions);
```

### Python + Authlib (Flask)

```python
from authlib.integrations.flask_client import OAuth

oauth = OAuth(app)

uniauth = oauth.register(
    'uniauth',
    client_id='ua_abc123',
    client_secret='SECRET',
    server_metadata_url='https://sso.55387.xyz/.well-known/openid-configuration',
    client_kwargs={'scope': 'openid profile email'}
)

@app.route('/login')
def login():
    redirect_uri = url_for('callback', _external=True)
    return uniauth.authorize_redirect(redirect_uri)

@app.route('/callback')
def callback():
    token = uniauth.authorize_access_token()
    user_info = uniauth.parse_id_token(token)
    # user_info['email'], user_info['name'], user_info['sub']
    return redirect('/dashboard')
```

---

## 7. Method D: Direct API Integration (No SDK)

### 7.1 Phone SMS Login

```bash
# Step 1: Send code
curl -X POST https://sso.55387.xyz/api/v1/auth/phone/send-code \
  -H "Content-Type: application/json" \
  -d '{"phone": "+8613800138000"}'

# Response: {"success": true, "data": {"expires_in": 300, "retry_after": 60}}

# Step 2: Verify code and login
curl -X POST https://sso.55387.xyz/api/v1/auth/phone/verify \
  -H "Content-Type: application/json" \
  -d '{"phone": "+8613800138000", "code": "123456"}'

# Response: {"success": true, "data": {"user": {...}, "access_token": "eyJ...", "refresh_token": "...", "expires_in": 3600}}
```

### 7.2 Email Login

```bash
# Email + Code
curl -X POST https://sso.55387.xyz/api/v1/auth/email/send-code \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "type": "login"}'

curl -X POST https://sso.55387.xyz/api/v1/auth/email/verify \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "code": "123456"}'

# Email + Password
curl -X POST https://sso.55387.xyz/api/v1/auth/email/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "password123"}'

# Email Registration
curl -X POST https://sso.55387.xyz/api/v1/auth/email/register \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "password123", "code": "123456"}'
```

### 7.3 Token Management

```bash
# Refresh token
curl -X POST https://sso.55387.xyz/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refresh_token": "your_refresh_token"}'

# Verify token (requires app credentials)
curl -X POST https://sso.55387.xyz/api/v1/auth/verify \
  -H "Content-Type: application/json" \
  -H "X-App-Key: your_client_id" \
  -H "X-App-Secret: your_client_secret" \
  -d '{"token": "your_access_token"}'

# Logout
curl -X POST https://sso.55387.xyz/api/v1/auth/logout \
  -H "Authorization: Bearer your_access_token" \
  -H "Content-Type: application/json" \
  -d '{"refresh_token": "your_refresh_token"}'

# Logout all devices
curl -X POST https://sso.55387.xyz/api/v1/auth/logout-all \
  -H "Authorization: Bearer your_access_token"
```

### 7.4 User Info

```bash
# Get current user
curl https://sso.55387.xyz/api/v1/user/me \
  -H "Authorization: Bearer your_access_token"

# Update profile
curl -X PATCH https://sso.55387.xyz/api/v1/user/me \
  -H "Authorization: Bearer your_access_token" \
  -H "Content-Type: application/json" \
  -d '{"nickname": "NewName", "avatar_url": "https://..."}'
```

### 7.5 OAuth2 Authorization Code Flow (cURL)

```bash
# Step 1: Redirect user to (open in browser)
https://sso.55387.xyz/api/v1/oauth2/authorize?client_id=ua_abc123&redirect_uri=https://myapp.com/callback&response_type=code&scope=openid%20profile%20email&state=random_string

# Step 2: Exchange code for tokens
curl -X POST https://sso.55387.xyz/api/v1/oauth2/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=authorization_code" \
  -d "code=AUTH_CODE" \
  -d "redirect_uri=https://myapp.com/callback" \
  -d "client_id=ua_abc123" \
  -d "client_secret=SECRET"

# Step 3: Get user info
curl https://sso.55387.xyz/api/v1/oauth2/userinfo \
  -H "Authorization: Bearer ACCESS_TOKEN"

# Refresh OAuth2 tokens
curl -X POST https://sso.55387.xyz/api/v1/oauth2/token \
  -d "grant_type=refresh_token" \
  -d "refresh_token=REFRESH_TOKEN" \
  -d "client_id=ua_abc123" \
  -d "client_secret=SECRET"
```

---

## 8. Complete API Reference

### Authentication APIs

| Method | Endpoint | Auth Required | Description |
|--------|----------|:---:|-------------|
| POST | `/api/v1/auth/phone/send-code` | ❌ | Send phone SMS code |
| POST | `/api/v1/auth/phone/verify` | ❌ | Login with phone + code |
| POST | `/api/v1/auth/email/send-code` | ❌ | Send email verification code |
| POST | `/api/v1/auth/email/verify` | ❌ | Login with email + code |
| POST | `/api/v1/auth/email/login` | ❌ | Login with email + password |
| POST | `/api/v1/auth/email/register` | ❌ | Register with email + password |
| POST | `/api/v1/auth/refresh` | ❌ | Refresh access token |
| POST | `/api/v1/auth/verify` | 🔑 App Key | Verify a token (X-App-Key + X-App-Secret) |
| POST | `/api/v1/auth/logout` | ✅ | Logout current device |
| POST | `/api/v1/auth/logout-all` | ✅ | Logout all devices |
| GET | `/api/v1/auth/oauth/google/authorize` | ❌ | Google OAuth redirect |
| GET | `/api/v1/auth/oauth/github/authorize` | ❌ | GitHub OAuth redirect |
| GET | `/api/v1/auth/oauth/wechat/authorize` | ❌ | WeChat OAuth redirect |

### User APIs

| Method | Endpoint | Auth Required | Description |
|--------|----------|:---:|-------------|
| GET | `/api/v1/user/me` | ✅ | Get current user |
| PATCH | `/api/v1/user/me` | ✅ | Update profile |
| GET | `/api/v1/user/sessions` | ✅ | Get active sessions |
| DELETE | `/api/v1/user/sessions/:id` | ✅ | Revoke a session |
| GET | `/api/v1/user/bindings` | ✅ | Get OAuth account bindings |
| DELETE | `/api/v1/user/unbind/:provider` | ✅ | Unbind OAuth account |
| POST | `/api/v1/user/bind/phone` | ✅ | Bind phone number |
| POST | `/api/v1/user/bind/email` | ✅ | Bind email |
| GET | `/api/v1/user/authorized-apps` | ✅ | Get authorized apps |
| DELETE | `/api/v1/user/authorized-apps/:clientId` | ✅ | Revoke app authorization |

### MFA APIs

| Method | Endpoint | Auth Required | Description |
|--------|----------|:---:|-------------|
| GET | `/api/v1/mfa/status` | ✅ | Get MFA status |
| POST | `/api/v1/mfa/setup` | ✅ | Start MFA setup (returns QR code) |
| POST | `/api/v1/mfa/verify-setup` | ✅ | Confirm MFA setup |
| POST | `/api/v1/mfa/verify` | ✅ | Verify MFA code during login |
| POST | `/api/v1/mfa/disable` | ✅ | Disable MFA |
| POST | `/api/v1/mfa/regenerate-recovery` | ✅ | Regenerate recovery codes |

### OAuth2 Provider APIs

| Method | Endpoint | Auth Required | Description |
|--------|----------|:---:|-------------|
| GET | `/api/v1/oauth2/validate` | ❌ | Validate client & redirect_uri |
| POST | `/api/v1/oauth2/authorize` | ✅ | Generate authorization code |
| POST | `/api/v1/oauth2/token` | ❌ | Exchange code for tokens |
| GET | `/api/v1/oauth2/userinfo` | ✅ (OAuth token) | Get user info (OIDC-compatible) |

### Health APIs

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Simple health check |
| GET | `/health/ready` | Deep readiness check (DB, Redis, memory) |

---

## 9. Data Types & Interfaces

### Login Response

```typescript
interface LoginResponse {
  success: boolean;
  data: {
    user: User;
    access_token: string;
    refresh_token: string;
    expires_in: number;     // seconds (3600 = 1 hour)
    is_new_user: boolean;
    // MFA fields (only present if MFA required)
    mfa_required?: boolean;
    mfa_token?: string;
  };
}
```

### User

```typescript
interface User {
  id: string;             // UUID
  phone?: string | null;  // e.g. "+8613800138000"
  email?: string | null;
  nickname?: string | null;
  avatar_url?: string | null;
}
```

### Token Payload (JWT Claims)

```typescript
interface TokenPayload {
  sub: string;             // User ID
  iss?: string;            // Issuer ("https://sso.55387.xyz")
  aud?: string | string[]; // Audience (your client_id)
  exp: number;             // Expiration (Unix timestamp)
  iat: number;             // Issued at (Unix timestamp)
  scope?: string;          // Space-separated scopes
  email?: string;
  phone?: string;
}
```

### UserInfo (from Server SDK / OAuth2 userinfo endpoint)

```typescript
interface UserInfo {
  id: string;              // (same as `sub`)
  phone?: string;
  email?: string;
  nickname?: string;
  avatar_url?: string;
  phone_verified?: boolean;
  email_verified?: boolean;
}
```

### OAuth2 Token Response

```typescript
interface OAuth2TokenResponse {
  access_token: string;
  token_type: string;      // "Bearer"
  expires_in: number;      // 3600
  refresh_token: string;
  id_token?: string;       // Present when scope includes "openid"
}
```

### SSO Callback Result

```typescript
interface SSOResult {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type: string;      // "Bearer"
  id_token?: string;
}
```

### Error Response

```typescript
interface ErrorResponse {
  success: false;
  error: {
    code: string;          // e.g. "INVALID_CODE", "TOKEN_EXPIRED"
    message: string;       // Human-readable error message
  };
}
```

---

## 10. Error Handling

### Frontend SDK Errors

```typescript
import { UniAuthError, AuthErrorCode } from '@55387.ai/uniauth-client';

try {
  await auth.loginWithCode(phone, code);
} catch (error) {
  if (error instanceof UniAuthError) {
    switch (error.code) {
      case AuthErrorCode.MFA_REQUIRED:
        // Handle MFA flow
        break;
      case AuthErrorCode.VERIFY_FAILED:
        // Wrong verification code
        break;
      default:
        console.error(error.message);
    }
  }
}
```

### Backend SDK Errors

```typescript
import { ServerAuthError, ServerErrorCode } from '@55387.ai/uniauth-server';

try {
  await uniauth.verifyToken(token);
} catch (error) {
  if (error instanceof ServerAuthError) {
    switch (error.code) {
      case ServerErrorCode.INVALID_TOKEN:
        // Token format invalid
        break;
      case ServerErrorCode.TOKEN_EXPIRED:
        // Token expired — frontend should use refresh_token
        break;
      case ServerErrorCode.UNAUTHORIZED:
        // User not authenticated
        break;
    }
  }
}
```

### Common HTTP Error Codes

| Status | Meaning | Action |
|--------|---------|--------|
| 400 | Bad Request | Check request body / parameters |
| 401 | Unauthorized | Token invalid/expired, refresh or re-login |
| 404 | Not Found | Check endpoint URL (must include `/api/v1/`) |
| 429 | Too Many Requests | Rate limited, wait and retry |
| 500 | Server Error | UniAuth server issue, retry later |

---

## 11. Security Best Practices

### Token Strategy

| Token | Lifetime | Storage Location |
|-------|----------|------------------|
| Access Token | 1 hour | Memory or localStorage (frontend) |
| Refresh Token | 30 days | httpOnly cookie or secure storage |
| ID Token | 24 hours | httpOnly cookie (backend SSO flow) |
| Authorization Code | 10 minutes | Single-use, never store |

### Rules

1. **NEVER expose `client_secret` in frontend code** — use backend-proxy flow for confidential clients
2. **Always use HTTPS** in production
3. **Use `state` parameter** for CSRF protection in OAuth2 flows
4. **Use PKCE** for all public clients (SPA, mobile apps)
5. **Validate `redirect_uri`** — must match exactly what's registered
6. **Validate JWT tokens** — check signature, issuer, audience, expiration
7. **Store sensitive tokens in httpOnly cookies** when possible
8. **Implement token rotation** — UniAuth automatically rotates refresh tokens
9. **Use rate limiting** — UniAuth enforces: SMS 1/min, verify 5/15min

---

## 12. Framework-Specific Examples

### React (with Client SDK)

```tsx
// contexts/AuthContext.tsx
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { UniAuthClient } from '@55387.ai/uniauth-client';

interface AuthContextType {
  user: any | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (phone: string, code: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const auth = new UniAuthClient({
  baseUrl: 'https://sso.55387.xyz',
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check existing auth state on mount
    if (auth.isAuthenticated()) {
      auth.getCurrentUser().then(setUser).catch(() => setUser(null)).finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }

    // Listen for auth state changes
    const unsubscribe = auth.onAuthStateChange((u, isAuth) => {
      setUser(isAuth ? u : null);
    });
    return unsubscribe;
  }, []);

  const login = async (phone: string, code: string) => {
    const result = await auth.loginWithCode(phone, code);
    if (result.mfa_required) {
      throw new Error('MFA_REQUIRED');
    }
    setUser(result.data?.user);
  };

  const logout = async () => {
    await auth.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
```

### Vue 3 (Composable)

```typescript
// composables/useAuth.ts
import { ref, onMounted } from 'vue';
import { UniAuthClient } from '@55387.ai/uniauth-client';

const auth = new UniAuthClient({ baseUrl: 'https://sso.55387.xyz' });
const user = ref<any>(null);
const isAuthenticated = ref(false);
const isLoading = ref(true);

export function useAuth() {
  onMounted(async () => {
    if (auth.isAuthenticated()) {
      try {
        user.value = await auth.getCurrentUser();
        isAuthenticated.value = true;
      } catch {
        user.value = null;
        isAuthenticated.value = false;
      }
    }
    isLoading.value = false;
  });

  const login = async (phone: string, code: string) => {
    const result = await auth.loginWithCode(phone, code);
    user.value = result.data?.user;
    isAuthenticated.value = true;
  };

  const logout = async () => {
    await auth.logout();
    user.value = null;
    isAuthenticated.value = false;
  };

  return { user, isAuthenticated, isLoading, login, logout, auth };
}
```

### Express.js (Full Backend)

```typescript
import express from 'express';
import { UniAuthServer } from '@55387.ai/uniauth-server';

const app = express();
const auth = new UniAuthServer({
  baseUrl: process.env.UNIAUTH_URL || 'https://sso.55387.xyz',
  clientId: process.env.UNIAUTH_CLIENT_ID!,
  clientSecret: process.env.UNIAUTH_CLIENT_SECRET!,
});

// Public routes
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Protected routes
app.use('/api/*', auth.middleware());

app.get('/api/profile', (req, res) => {
  res.json({ user: req.user });
});

app.get('/api/data', (req, res) => {
  const userId = req.authPayload?.sub;
  // Fetch user-specific data...
  res.json({ userId, data: [] });
});

app.listen(3000, () => console.log('Server running on :3000'));
```

---

## 13. Troubleshooting

| Error | Cause | Solution |
|-------|-------|----------|
| `invalid_client` | Wrong `client_id` | Verify credentials in Developer Console |
| `Client authentication failed` | Wrong `client_secret` or using confidential client from frontend | Use backend-proxy flow, or switch to Public Client |
| `invalid_grant` | Auth code expired (10 min) or already used | Codes are single-use, request a new one |
| `redirect_uri mismatch` | Callback URL doesn't match registered URI | URLs must match exactly (protocol + domain + port + path) |
| `PKCE required` | Public client must use PKCE | Use `auth.loginWithSSO({ usePKCE: true })` |
| 404 on OAuth2 endpoints | Wrong endpoint path | Use `/api/v1/oauth2/authorize`, not `/oauth2/authorize` |
| Token expired (401) | Access token expired | Use refresh token or `auth.getAccessToken()` (auto-refreshes) |
| `ERR_SSL_PROTOCOL_ERROR` | Using HTTPS on localhost | Use `http://localhost:3000` for local development |

### Debugging Tips

1. Check the OIDC discovery document: `https://sso.55387.xyz/.well-known/openid-configuration`
2. Decode JWTs at [jwt.io](https://jwt.io) to inspect claims
3. Test API calls with cURL before implementing in code
4. Enable `onAuthError` callback in the Client SDK for early error detection
5. Check UniAuth API docs at `https://sso.55387.xyz/docs` (Swagger UI)

---

## 14. FAQ

**Q: Can I verify tokens locally without calling UniAuth?**
A: Yes. Configure `jwtPublicKey` in the Server SDK, or fetch the JWKS from `/.well-known/jwks.json`. Default behavior is remote verification with 1-minute cache.

**Q: Who handles token refresh?**
A: The frontend Client SDK handles auto-refresh via `getAccessToken()`. Backend only needs to verify the access token.

**Q: How long is the token cache?**
A: Server SDK caches verification results for 1 minute. Call `clearCache()` to clear.

**Q: Can I use UniAuth without the SDK?**
A: Yes, see Method D (Direct API) or Method C (OIDC standard library).

**Q: What scopes are available?**
A: `openid`, `profile`, `email`, `phone`. Use `openid profile email phone` for full access.

**Q: Is M2M (machine-to-machine) authentication supported?**
A: Yes, use Client Credentials flow:
```typescript
const result = await client.loginWithClientCredentials('scope1 scope2');
```

---

## Quick Reference Card

```
┌─────────────────────────────────────────────────────────────┐
│                    UniAuth Quick Reference                   │
├─────────────────────────────────────────────────────────────┤
│ Service URL:    https://sso.55387.xyz                        │
│ Swagger:        https://sso.55387.xyz/docs                   │
│ OIDC Discovery: https://sso.55387.xyz/.well-known/openid-configuration │
│ JWKS:           https://sso.55387.xyz/.well-known/jwks.json  │
├─────────────────────────────────────────────────────────────┤
│ Frontend SDK:   npm install @55387.ai/uniauth-client         │
│ Backend SDK:    npm install @55387.ai/uniauth-server         │
├─────────────────────────────────────────────────────────────┤
│ Access Token:   1h    │ Refresh Token: 30d   │ ID Token: 24h│
│ Auth Code:      10min │ SMS Rate: 1/min      │ PKCE: S256   │
├─────────────────────────────────────────────────────────────┤
│ Key Endpoints:                                               │
│  POST /api/v1/auth/phone/send-code    — Send SMS code       │
│  POST /api/v1/auth/phone/verify       — SMS login           │
│  POST /api/v1/auth/email/login        — Email+password      │
│  POST /api/v1/auth/refresh            — Refresh token       │
│  GET  /api/v1/user/me                 — Get current user    │
│  POST /api/v1/oauth2/token            — OAuth2 token exchange│
│  GET  /api/v1/oauth2/userinfo         — OIDC userinfo       │
└─────────────────────────────────────────────────────────────┘
```
