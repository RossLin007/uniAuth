# UniAuth AI Integration Guide / AI 集成指南

> **For AI Agents**: This guide enables complete UniAuth integration in under 1 minute.
>
> **给 AI 代理**: 本指南帮助 AI 在 1 分钟内完成 UniAuth 集成。

| Item | Value |
|------|-------|
| **Production URL** | `https://sso.55387.xyz` |
| **Frontend SDK** | `@55387.ai/uniauth-client` v1.2.2 |
| **Backend SDK** | `@55387.ai/uniauth-server` v1.2.2 |
| **React SDK** | `@55387.ai/uniauth-react` v0.1.0 |
| **OIDC Discovery** | `https://sso.55387.xyz/.well-known/openid-configuration` |

---

## Choose Your Integration Method / 选择集成方式

```
Which scenario fits your app? / 你的场景是？
│
├─ A) Build your OWN login form → Section 1 (SDK Direct Login)
│   自己构建登录界面 → 第 1 节
│
├─ B) Redirect to UniAuth login page (SSO) → Section 2
│   跳转到 UniAuth 登录页 → 第 2 节
│   ├─ Frontend SPA (Public Client) → Section 2a
│   └─ Backend server (Confidential Client) → Section 2b
│
├─ C) Use standard OIDC library (Python/Go/Java) → Section 3
│   使用标准 OIDC 库 → 第 3 节
│
└─ D) Direct REST API (no SDK) → See API_REFERENCE.md
    直接 REST API → 见 API_REFERENCE.md
```

---

## 1. SDK Direct Login / SDK 直连登录

> Best for: Apps with their own login UI (Trusted Client)
>
> 适用：拥有自己登录界面的应用

### 1.1 Install / 安装

```bash
# Frontend
npm install @55387.ai/uniauth-client

# Backend (for token verification)
npm install @55387.ai/uniauth-server
```

### 1.2 Initialize / 初始化

```typescript
import { UniAuthClient } from '@55387.ai/uniauth-client';

const auth = new UniAuthClient({
  baseUrl: 'https://sso.55387.xyz',
  // Optional / 可选:
  // storage: 'localStorage',  // 'localStorage' | 'sessionStorage' | 'memory'
  // enableRetry: true,
  // timeout: 30000,
  onTokenRefresh: (tokens) => console.log('Tokens refreshed'),
  onAuthError: (error) => console.error('Auth error:', error),
});
```

### 1.3 Phone Login / 手机号登录

```typescript
// Step 1: Send SMS code / 发送验证码
await auth.sendCode('+8613800138000');

// Step 2: Verify and login / 验证并登录
const result = await auth.loginWithCode('+8613800138000', '123456');
// result: { user, access_token, refresh_token, expires_in, is_new_user }
```

### 1.4 Email Login / 邮箱登录

```typescript
// Option A: Passwordless (code) / 无密码登录
await auth.sendEmailCode('user@example.com');
const result = await auth.loginWithEmailCode('user@example.com', '123456');

// Option B: Password / 密码登录
const result = await auth.loginWithEmail('user@example.com', 'password123');

// Option C: Register / 注册
const result = await auth.registerWithEmail('user@example.com', 'password123', 'Nickname');
```

### 1.5 Social Login / 社交登录

```typescript
// Get providers / 获取可用的提供商
const providers = await auth.getOAuthProviders();
// → ['google', 'github', 'wechat']

// Start OAuth redirect / 发起跳转
auth.startSocialLogin('google');
auth.startSocialLogin('github');
auth.startSocialLogin('wechat');
```

### 1.6 MFA / 多因素认证

```typescript
const result = await auth.loginWithCode(phone, code);

if (result.mfa_required) {
  const mfaResult = await auth.verifyMFA(result.mfa_token!, '123456');
  // mfaResult: { access_token, refresh_token }
}
```

### 1.7 User Management / 用户管理

```typescript
const user = await auth.getCurrentUser();      // Get user info
await auth.updateProfile({ nickname: 'New' }); // Update profile
const isLoggedIn = auth.isAuthenticated();      // Check auth status
const token = await auth.getAccessToken();      // Auto-refreshing token
await auth.logout();                            // Logout current device
await auth.logoutAll();                         // Logout all devices

// Auth state listener / 认证状态监听
const unsub = auth.onAuthStateChange((user, isAuth) => {
  console.log(isAuth ? 'Logged in' : 'Logged out');
});
```

### 1.8 Backend Token Verification / 后端令牌验证

```typescript
import { UniAuthServer } from '@55387.ai/uniauth-server';

const uniauth = new UniAuthServer({
  baseUrl: process.env.UNIAUTH_URL || 'https://sso.55387.xyz',
  clientId: process.env.UNIAUTH_CLIENT_ID!,
  clientSecret: process.env.UNIAUTH_CLIENT_SECRET!,
});

// Express middleware / Express 中间件
app.use('/api/*', uniauth.middleware());
app.get('/api/profile', (req, res) => {
  res.json({ user: req.user, payload: req.authPayload });
});

// Hono middleware / Hono 中间件
app.use('/api/*', uniauth.honoMiddleware());
app.get('/api/profile', (c) => c.json({ user: c.get('user') }));

// Manual verification / 手动验证
const payload = await uniauth.verifyToken(token);
// payload: { sub, email, phone, exp, iat, scope }
```

---

## 2. SSO Login / SSO 单点登录

### 2a. Frontend SPA (Public Client)

> Redirects to UniAuth login page, token exchange in browser.
>
> 跳转到 UniAuth 登录页，在浏览器端完成 Token 交换。

```typescript
import { UniAuthClient } from '@55387.ai/uniauth-client';

const auth = new UniAuthClient({ baseUrl: 'https://sso.55387.xyz' });

// Configure SSO / 配置 SSO
auth.configureSso({
  ssoUrl: 'https://sso.55387.xyz',
  clientId: 'ua_xxxxxxxxxxxx',
  redirectUri: window.location.origin + '/callback',
  scope: 'openid profile email phone',
});

// Trigger login / 触发登录
auth.loginWithSSO();             // Basic
auth.loginWithSSO({ usePKCE: true }); // With PKCE (recommended)
```

**Callback page / 回调页面:**

```typescript
if (auth.isSSOCallback()) {
  const result = await auth.handleSSOCallback();
  // result: { access_token, refresh_token?, token_type, id_token? }
  localStorage.setItem('access_token', result.access_token);
  window.location.href = '/';
}
```

> ⚠️ If your app is a **Confidential Client**, use Section 2b instead.

### 2b. Backend Proxy (Confidential Client)

> Token exchange happens on your server with `client_secret`.
>
> Token 交换在你的服务端完成（使用 `client_secret`）。

```
User → Frontend → /api/auth/login → Backend → redirect to UniAuth SSO
                                                     ↓
User ← Frontend ← redirect ← Backend (set cookie) ← SSO callback
                                     ↑
                        Backend exchanges code with client_secret
```

```typescript
import { Hono } from 'hono';
import { setCookie, getCookie, deleteCookie } from 'hono/cookie';

const app = new Hono();

// 1. Login — redirect to UniAuth SSO
app.get('/api/auth/login', (c) => {
  const origin = c.req.header('origin') || 'http://localhost:3000';
  const params = new URLSearchParams({
    client_id: process.env.UNIAUTH_CLIENT_ID!,
    redirect_uri: `${origin}/api/auth/callback`,
    response_type: 'code',
    scope: 'openid profile email phone',
    state: crypto.randomUUID(),
  });
  return c.redirect(`https://sso.55387.xyz/api/v1/oauth2/authorize?${params}`);
});

// 2. Callback — exchange code for tokens
app.get('/api/auth/callback', async (c) => {
  const code = c.req.query('code');
  const origin = c.req.header('referer')?.replace(/\/api\/auth\/callback.*$/, '') || 'http://localhost:3000';

  const response = await fetch('https://sso.55387.xyz/api/v1/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.UNIAUTH_CLIENT_ID,
      client_secret: process.env.UNIAUTH_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
      redirect_uri: `${origin}/api/auth/callback`,
    }),
  });

  const { access_token, id_token } = await response.json();

  setCookie(c, 'auth_token', id_token || access_token, {
    httpOnly: true, secure: true, sameSite: 'Lax',
    maxAge: 60 * 60 * 24 * 7, path: '/',
  });

  return c.redirect('/');
});

// 3. Status check / 登录状态检查
app.get('/api/auth/status', async (c) => {
  const token = getCookie(c, 'auth_token');
  if (!token) return c.json({ authenticated: false });
  try {
    const payload = await uniauth.verifyToken(token);
    return c.json({ authenticated: true, userId: payload.sub });
  } catch {
    return c.json({ authenticated: false });
  }
});

// 4. Logout
app.post('/api/auth/logout', (c) => {
  deleteCookie(c, 'auth_token', { path: '/' });
  return c.json({ success: true });
});
```

---

## 3. OIDC Standard Integration / 标准 OIDC 集成

> For non-Node.js apps (Python, Go, Java, etc.) using standard OIDC libraries.
>
> 适用于非 Node.js 应用，使用标准 OIDC 客户端库。

### OIDC Endpoints

| Endpoint | URL |
|----------|-----|
| Discovery | `https://sso.55387.xyz/.well-known/openid-configuration` |
| Authorization | `https://sso.55387.xyz/api/v1/oauth2/authorize` |
| Token | `https://sso.55387.xyz/api/v1/oauth2/token` |
| UserInfo | `https://sso.55387.xyz/api/v1/oauth2/userinfo` |
| JWKS | `https://sso.55387.xyz/.well-known/jwks.json` |

### Next.js + NextAuth

```typescript
// app/api/auth/[...nextauth]/route.ts
import NextAuth from 'next-auth';

export default NextAuth({
  providers: [{
    id: 'uniauth',
    name: 'UniAuth',
    type: 'oauth',
    wellKnown: 'https://sso.55387.xyz/.well-known/openid-configuration',
    authorization: { params: { scope: 'openid profile email phone' } },
    idToken: true,
    profile: (p) => ({ id: p.sub, name: p.name, email: p.email, image: p.picture }),
    clientId: process.env.UNIAUTH_CLIENT_ID,
    clientSecret: process.env.UNIAUTH_CLIENT_SECRET,
  }],
});
```

### Node.js + Passport

```javascript
import { Strategy as OpenIDStrategy } from 'passport-openidconnect';

passport.use(new OpenIDStrategy({
    issuer: 'https://sso.55387.xyz',
    authorizationURL: 'https://sso.55387.xyz/api/v1/oauth2/authorize',
    tokenURL: 'https://sso.55387.xyz/api/v1/oauth2/token',
    userInfoURL: 'https://sso.55387.xyz/api/v1/oauth2/userinfo',
    clientID: process.env.UNIAUTH_CLIENT_ID,
    clientSecret: process.env.UNIAUTH_CLIENT_SECRET,
    callbackURL: 'https://myapp.com/callback',
    scope: ['openid', 'profile', 'email'],
  },
  (issuer, profile, done) => done(null, profile)
));
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
    client_kwargs={'scope': 'openid profile email'},
)

@app.route('/login')
def login():
    return uniauth.authorize_redirect(url_for('callback', _external=True))

@app.route('/callback')
def callback():
    token = uniauth.authorize_access_token()
    user = uniauth.parse_id_token(token)
    return redirect('/dashboard')
```

---

## Environment Variables / 环境变量

```env
# Required / 必填
UNIAUTH_URL=https://sso.55387.xyz
UNIAUTH_CLIENT_ID=ua_xxxxxxxxxxxx
UNIAUTH_CLIENT_SECRET=your_secret   # Backend only! 仅后端使用

# Optional / 可选
UNIAUTH_REDIRECT_URI=http://localhost:3000/callback
```

---

## Error Handling / 错误处理

### Frontend SDK

```typescript
import { UniAuthError, AuthErrorCode } from '@55387.ai/uniauth-client';

try {
  await auth.loginWithCode(phone, code);
} catch (error) {
  if (error instanceof UniAuthError) {
    switch (error.code) {
      case AuthErrorCode.MFA_REQUIRED:   // Need MFA verification
      case AuthErrorCode.VERIFY_FAILED:  // Wrong verification code
      case AuthErrorCode.RATE_LIMITED:    // Too many requests
    }
  }
}
```

### Backend SDK

```typescript
import { ServerAuthError, ServerErrorCode } from '@55387.ai/uniauth-server';

try {
  await uniauth.verifyToken(token);
} catch (error) {
  if (error instanceof ServerAuthError) {
    switch (error.code) {
      case ServerErrorCode.INVALID_TOKEN:  // Token invalid
      case ServerErrorCode.TOKEN_EXPIRED:  // Token expired
    }
  }
}
```

---

## Security Best Practices / 安全最佳实践

1. **Never expose `client_secret` in frontend code** / 永远不要在前端暴露 `client_secret`
2. **Use PKCE** for public clients (SPA) / 公共客户端使用 PKCE
3. **Store tokens in `httpOnly` cookies** on backend / 后端使用 `httpOnly` Cookie 存储令牌
4. **Validate `state` parameter** to prevent CSRF / 验证 `state` 参数防止 CSRF
5. **Use short-lived access tokens** + refresh token rotation / 使用短期访问令牌 + 刷新令牌轮换
