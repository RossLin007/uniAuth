# UniAuth 项目接入指南 / Integration Guide

> 本指南面向需要接入 UniAuth 的项目团队（lifeview、morning 及未来项目），提供菜单式功能选择和从零到一的详细接入步骤。
>
> This guide helps project teams (lifeview, morning, and future projects) integrate UniAuth step-by-step with a menu-driven approach.

| 项目 / Item | 值 / Value |
|---|---|
| **生产环境 URL** | `https://sso.55387.xyz` |
| **前端 SDK** | `@55387.ai/uniauth-client` v1.2.4 |
| **后端 SDK** | `@55387.ai/uniauth-server` v1.2.3 |
| **React SDK** | `@55387.ai/uniauth-react` v1.0.2 |
| **OIDC Discovery** | `https://sso.55387.xyz/.well-known/openid-configuration` |
| **Developer Console** | `https://sso.55387.xyz:5174` |

---

## 📋 目录 / Table of Contents

- [第一步：注册应用获取凭据](#第一步注册应用获取凭据)
- [第二步：选择接入方式](#第二步选择接入方式)
- [A. SDK 直连接入（自建登录页）](#a-sdk-直连接入自建登录页)
  - [A1. 手机号 + 验证码登录](#a1-手机号--验证码登录)
  - [A2. 邮箱 + 密码登录](#a2-邮箱--密码登录)
  - [A3. 邮箱 + 验证码登录（无密码）](#a3-邮箱--验证码登录无密码)
  - [A4. 社交登录（Google / GitHub / 微信）](#a4-社交登录google--github--微信)
  - [A5. Passkey / WebAuthn（免密码生物识别）](#a5-passkey--webauthn免密码生物识别)
- [B. SSO 跳转接入（跳转到 UniAuth 登录页）](#b-sso-跳转接入跳转到-uniauth-登录页)
  - [B1. 前端 SPA (Public Client)](#b1-前端-spa-public-client)
  - [B2. 后端代理 (Confidential Client)](#b2-后端代理-confidential-client)
- [C. Trusted Client API（嵌入式登录 API）](#c-trusted-client-api嵌入式登录-api)
- [D. 标准 OIDC 接入（非 Node.js 项目）](#d-标准-oidc-接入非-nodejs-项目)
- [🔐 MFA 多因素认证处理（重要！）](#-mfa-多因素认证处理重要)
- [🔑 Token 管理](#-token-管理)
- [🛡️ 后端 Token 验证](#️-后端-token-验证)
- [🔗 账号关联（Account Linking）](#-账号关联account-linking)
- [⚠️ 错误处理](#️-错误处理)
- [❓ FAQ 常见问题](#-faq-常见问题)

---

## 第一步：注册应用获取凭据

在接入任何认证方式之前，你需要先在 **Developer Console** 注册你的应用，获取 `client_id` 和 `client_secret`。

Before integrating any auth method, register your app in the **Developer Console** to get your credentials.

### 操作步骤 / Steps

1. 访问 Developer Console: `https://sso.55387.xyz:5174`
2. 登录后，点击 **创建应用 / Create Application**
3. 填写应用信息：
   - **应用名称**: 如 `lifeview-prod`
   - **应用类型**:
     - `public` — 前端 SPA，无 client_secret
     - `confidential` — 有后端服务，使用 client_secret
     - `trusted_client` — 嵌入式登录（自建登录页 + 服务端验证）
   - **回调 URL**: 如 `https://your-app.com/callback`
4. 创建后获取：
   - `client_id`: 如 `ua_xxxxxxxxxxxx`
   - `client_secret`: 如 `uas_xxxxxxxxxxxx`（机密客户端专用）

### 环境变量配置 / Environment Variables

```env
# 前端 / Frontend
UNIAUTH_URL=https://sso.55387.xyz

# 后端 / Backend (confidential / trusted_client only)
UNIAUTH_URL=https://sso.55387.xyz
UNIAUTH_CLIENT_ID=ua_xxxxxxxxxxxx
UNIAUTH_CLIENT_SECRET=uas_xxxxxxxxxxxx
UNIAUTH_REDIRECT_URI=https://your-app.com/callback
```

---

## 第二步：选择接入方式

根据你的项目需求，选择最适合的接入方式：

Choose the integration approach that best fits your project:

```
你的项目是什么情况？ / What is your scenario?
│
├─ A) 我要自己构建登录页面 → 方式 A (SDK 直连接入)
│   I want to build my own login page → Method A
│   │
│   ├─ 手机号 + 验证码 → A1
│   ├─ 邮箱 + 密码     → A2
│   ├─ 邮箱 + 验证码   → A3
│   ├─ 社交登录        → A4
│   └─ Passkey 生物识别 → A5
│
├─ B) 我要跳转到 UniAuth 统一登录页 → 方式 B (SSO 接入)
│   I want to redirect to UniAuth login page → Method B
│   │
│   ├─ 纯前端 SPA → B1 (Public Client)
│   └─ 有后端服务 → B2 (Confidential Client，推荐)
│
├─ C) 我的项目有自己的后端，想用 API 直接调用 → 方式 C (Trusted Client)
│   My project has its own backend, I want direct API calls → Method C
│   ⚠️ 需要 trusted_client 类型应用
│
└─ D) 我的项目不是 Node.js 的 (Python/Go/Java) → 方式 D (标准 OIDC)
    My project is not Node.js → Method D
```

> [!IMPORTANT]
> **所有登录方式都可能触发 MFA！** 如果用户开启了 MFA（如 `atai829525@gmail.com`），登录接口会返回 `mfa_required: true`，你必须处理这个情况。详见 [MFA 多因素认证处理](#-mfa-多因素认证处理重要) 章节。
>
> **All login methods can trigger MFA!** If a user has MFA enabled, login APIs will return `mfa_required: true`. You MUST handle this. See the [MFA section](#-mfa-多因素认证处理重要).

---

## A. SDK 直连接入（自建登录页）

> 适用场景：你的项目有自己的登录 UI，希望在自己的页面中完成认证。
>
> Best for: Apps with their own login UI.

### 安装 / Install

```bash
# 前端 SDK / Frontend SDK
npm install @55387.ai/uniauth-client
# 或 / or
pnpm add @55387.ai/uniauth-client

# React 项目推荐 / React projects
npm install @55387.ai/uniauth-react

# 后端 SDK（Token 验证）/ Backend SDK
npm install @55387.ai/uniauth-server
```

### 初始化 / Initialize

```typescript
import { UniAuthClient } from '@55387.ai/uniauth-client';

const auth = new UniAuthClient({
  baseUrl: 'https://sso.55387.xyz',
  // 可选配置 / Optional:
  storage: 'localStorage',   // 'localStorage' | 'sessionStorage' | 'memory'
  enableRetry: true,          // 网络错误自动重试 / Auto retry on error
  timeout: 30000,             // 请求超时 / Request timeout (ms)
  onTokenRefresh: (tokens) => {
    console.log('Tokens refreshed / 令牌已刷新');
  },
  onAuthError: (error) => {
    console.error('Auth error / 认证错误:', error);
  },
});
```

#### React 项目初始化 / React Setup

```tsx
import { UniAuthProvider, useUniAuth } from '@55387.ai/uniauth-react';

// App.tsx
function App() {
  return (
    <UniAuthProvider baseUrl="https://sso.55387.xyz">
      <YourApp />
    </UniAuthProvider>
  );
}

// 在任意组件中使用 / Use in any component
function LoginPage() {
  const { auth, user, isAuthenticated, isLoading } = useUniAuth();
  // auth = UniAuthClient instance
}
```

---

### A1. 手机号 + 验证码登录

Phone + SMS Code Login

#### 完整流程 / Full Flow

```
用户输入手机号 → 发送验证码 → 用户输入验证码 → 验证登录
                                                  ↓
                                          检查 mfa_required？
                                          ├─ 否 → 登录成功 ✅
                                          └─ 是 → MFA 验证 → 登录成功 ✅
```

#### 代码示例 / Code Example

```typescript
// Step 1: 发送验证码 / Send SMS code
try {
  const sendResult = await auth.sendCode('+8613800138000');
  // sendResult: { expires_in: 300, retry_after: 60 }
  console.log(`验证码已发送，${sendResult.retry_after}秒后可重发`);
} catch (error) {
  // 处理发送失败（频率限制等）
  console.error('发送失败:', error.message);
}

// Step 2: 验证码登录 / Verify and login
try {
  const result = await auth.loginWithCode('+8613800138000', '123456');

  // ⚠️ 必须检查 MFA / MUST check MFA
  if (result.mfa_required) {
    // 用户开启了 MFA，需要 TOTP 验证
    // 详见 MFA 章节
    const mfaCode = prompt('请输入 MFA 验证码'); // 实际项目请使用 UI 组件
    const mfaResult = await auth.verifyMFA(result.mfa_token!, mfaCode);
    console.log('MFA 验证通过，登录成功');
    return;
  }

  // 正常登录成功
  console.log('登录成功:', result.user);
  console.log('Access Token:', result.access_token);
  console.log('是否新用户:', result.is_new_user);
} catch (error) {
  console.error('登录失败:', error.message);
}
```

---

### A2. 邮箱 + 密码登录

Email + Password Login

#### 完整流程 / Full Flow

```
首次用户: 邮箱注册 → 自动登录
已有用户: 邮箱+密码 → 验证登录
                        ↓
                检查 mfa_required？
                ├─ 否 → 登录成功 ✅
                └─ 是 → MFA 验证 → 登录成功 ✅
```

#### 代码示例 / Code Example

```typescript
// 注册新用户 / Register
try {
  const result = await auth.registerWithEmail(
    'user@example.com',
    'StrongPass123!',
    'John'  // nickname, 可选 / optional
  );
  console.log('注册成功:', result.user);
} catch (error) {
  if (error.code === 'REGISTER_FAILED') {
    console.error('注册失败（邮箱已存在？）:', error.message);
  }
}

// 登录 / Login
try {
  const result = await auth.loginWithEmail('user@example.com', 'StrongPass123!');

  // ⚠️ 必须检查 MFA / MUST check MFA
  if (result.mfa_required) {
    const mfaResult = await auth.verifyMFA(result.mfa_token!, mfaCode);
    return;
  }

  console.log('登录成功:', result.user);
} catch (error) {
  if (error.code === 'LOGIN_FAILED') {
    console.error('密码错误');
  }
}
```

---

### A3. 邮箱 + 验证码登录（无密码）

Email + Verification Code (Passwordless) Login

#### 完整流程 / Full Flow

```
用户输入邮箱 → 发送验证码 → 用户输入验证码 → 验证登录
                                               ↓
                                       检查 mfa_required？
                                       ├─ 否 → 登录成功 ✅
                                       └─ 是 → MFA 验证 → 登录成功 ✅
```

> [!NOTE]
> 邮箱验证码登录会自动创建账号（如果邮箱未注册），无需单独注册步骤。
>
> Passwordless email login auto-creates the account if the email is not registered.

#### 代码示例 / Code Example

```typescript
// Step 1: 发送邮箱验证码 / Send email code
try {
  const sendResult = await auth.sendEmailCode('user@example.com');
  console.log(`验证码已发送到邮箱，${sendResult.retry_after}秒后可重发`);
} catch (error) {
  console.error('发送失败:', error.message);
}

// Step 2: 验证码登录 / Verify and login
try {
  const result = await auth.loginWithEmailCode('user@example.com', '123456');

  // ⚠️ 必须检查 MFA / MUST check MFA
  if (result.mfa_required) {
    const mfaResult = await auth.verifyMFA(result.mfa_token!, mfaCode);
    return;
  }

  console.log('登录成功:', result.user);
} catch (error) {
  console.error('登录失败:', error.message);
}
```

---

### A4. 社交登录（Google / GitHub / 微信）

Social Login (Google / GitHub / WeChat)

#### 完整流程 / Full Flow

```
用户点击社交登录按钮 → 跳转到第三方授权页
                          ↓
          用户授权 → 自动回调并完成登录 ✅
```

> [!NOTE]
> 社交登录的跳转和回调由 UniAuth 服务端处理，前端 SDK 只需要调用一个方法。会话完成后会自动跳回你的页面。
>
> Social login redirect and callback are handled by UniAuth server. The frontend SDK just needs one method call.

#### 代码示例 / Code Example

```typescript
// 获取可用的社交登录提供商 / Get available providers
const providers = await auth.getOAuthProviders();
// → [
//   { id: 'google', name: 'Google', enabled: true },
//   { id: 'github', name: 'GitHub', enabled: true },
//   { id: 'wechat', name: 'WeChat', enabled: true }
// ]

// 发起社交登录（页面会跳转）/ Start social login (page redirects)
auth.startSocialLogin('google');
auth.startSocialLogin('github');
auth.startSocialLogin('wechat');
```

#### 渲染按钮示例 / Render Buttons Example

```tsx
function SocialLoginButtons() {
  const { auth } = useUniAuth();
  const [providers, setProviders] = useState([]);

  useEffect(() => {
    auth.getOAuthProviders().then(setProviders);
  }, []);

  return (
    <div className="social-login">
      {providers.filter(p => p.enabled).map(provider => (
        <button
          key={provider.id}
          onClick={() => auth.startSocialLogin(provider.id)}
        >
          使用 {provider.name} 登录
        </button>
      ))}
    </div>
  );
}
```

---

### A5. Passkey / WebAuthn（免密码生物识别）

Passkey / WebAuthn (Passwordless Biometric Login)

> [!NOTE]
> Passkey 目前通过 REST API 直接调用，尚未集成到客户端 SDK 中。
>
> Passkey is currently available via direct REST API calls, not yet in the client SDK.

#### 完整流程 / Full Flow

```
注册 Passkey（需要已登录）:
  已登录用户 → 请求注册选项 → 浏览器生物识别 → 验证注册 → Passkey 绑定成功

使用 Passkey 登录:
  用户 → 请求登录选项 → 浏览器生物识别 → 验证登录 → 登录成功 ✅
```

#### API 端点 / Endpoints

| 方法 | 端点 | 认证 | 说明 |
|------|------|------|------|
| POST | `/api/v1/auth/passkey/register/options` | 🔒 Bearer | 获取注册选项 |
| POST | `/api/v1/auth/passkey/register/verify` | 🔒 Bearer | 验证注册 |
| POST | `/api/v1/auth/passkey/login/options` | ❌ | 获取登录选项 |
| POST | `/api/v1/auth/passkey/login/verify` | ❌ | 验证登录 |
| GET | `/api/v1/auth/passkey/credentials` | 🔒 Bearer | 列出已注册 Passkey |
| PATCH | `/api/v1/auth/passkey/credentials/:id` | 🔒 Bearer | 重命名 Passkey |
| DELETE | `/api/v1/auth/passkey/credentials/:id` | 🔒 Bearer | 删除 Passkey |

#### 代码示例（使用 @simplewebauthn/browser）

```bash
npm install @simplewebauthn/browser
```

```typescript
import {
  startRegistration,
  startAuthentication
} from '@simplewebauthn/browser';

const BASE_URL = 'https://sso.55387.xyz';

// ============================================
// 注册 Passkey（需要已登录）/ Register Passkey (requires auth)
// ============================================

async function registerPasskey(accessToken: string) {
  // Step 1: 获取注册选项 / Get registration options
  const optionsRes = await fetch(`${BASE_URL}/api/v1/auth/passkey/register/options`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });
  const { data: options } = await optionsRes.json();

  // Step 2: 调用浏览器 WebAuthn API / Call browser WebAuthn API
  const credential = await startRegistration(options);

  // Step 3: 验证注册 / Verify registration
  const verifyRes = await fetch(`${BASE_URL}/api/v1/auth/passkey/register/verify`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      response: credential,
      deviceName: 'My MacBook',  // 可选设备名称 / Optional device name
    }),
  });
  const result = await verifyRes.json();
  console.log('Passkey 注册成功:', result);
}

// ============================================
// 使用 Passkey 登录 / Login with Passkey
// ============================================

async function loginWithPasskey() {
  // Step 1: 获取登录选项 / Get login options
  const optionsRes = await fetch(`${BASE_URL}/api/v1/auth/passkey/login/options`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),  // 可选传入 email/phone 限定用户
  });
  const { data: options } = await optionsRes.json();

  // Step 2: 调用浏览器 WebAuthn API / Call browser WebAuthn API
  const credential = await startAuthentication(options);

  // Step 3: 验证登录 / Verify login
  const verifyRes = await fetch(`${BASE_URL}/api/v1/auth/passkey/login/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ response: credential }),
  });
  const result = await verifyRes.json();
  // result.data: { user, access_token, refresh_token, expires_in }
  console.log('Passkey 登录成功:', result.data.user);
}
```

---

## B. SSO 跳转接入（跳转到 UniAuth 登录页）

> 适用场景：不想自建登录页，直接跳转到 UniAuth 的统一登录页。所有登录方式、MFA 均由 UniAuth 页面处理。
>
> Best for: Apps that don't want to build their own login UI. UniAuth handles all login methods including MFA.

> [!TIP]
> **SSO 方式的最大优势**：UniAuth 登录页已经处理了所有登录方式（手机、邮箱、社交、Passkey）和 MFA 验证流程。你的项目只需要处理回调即可，无需自己实现 MFA UI。
>
> **SSO advantage**: UniAuth login page handles ALL login methods and MFA. Your project just handles the callback.

---

### B1. 前端 SPA (Public Client)

适用于纯前端应用，Token 在浏览器端完成交换。

```typescript
import { UniAuthClient } from '@55387.ai/uniauth-client';

const auth = new UniAuthClient({ baseUrl: 'https://sso.55387.xyz' });

// Step 1: 配置 SSO / Configure SSO
auth.configureSso({
  ssoUrl: 'https://sso.55387.xyz',
  clientId: 'ua_xxxxxxxxxxxx',
  redirectUri: window.location.origin + '/callback',
  scope: 'openid profile email phone',
});

// Step 2: 触发登录（页面跳转到 UniAuth）/ Trigger login
auth.loginWithSSO();              // 基础模式
auth.loginWithSSO({ usePKCE: true }); // 推荐使用 PKCE

// Step 3: 回调页面处理 / Callback page handling
// 在你的 /callback 路由中：
if (auth.isSSOCallback()) {
  try {
    const result = await auth.handleSSOCallback();
    // result: { access_token, refresh_token?, token_type, id_token? }
    console.log('SSO 登录成功');
    window.location.href = '/dashboard';
  } catch (error) {
    console.error('SSO 回调处理失败:', error);
  }
}
```

---

### B2. 后端代理 (Confidential Client)

> [!IMPORTANT]
> **推荐所有有后端的项目使用此方式。** `client_secret` 仅在服务端使用，更安全。
>
> **Recommended for all apps with a backend.** `client_secret` stays server-side.

```
完整流程:
User → 前端 → /api/auth/login → 后端 → 跳转到 UniAuth SSO
                                                    ↓
                    用户在 UniAuth 页面登录（支持所有方式 + MFA）
                                                    ↓
User ← 前端 ← 重定向 ← 后端 (设置 cookie) ← SSO 回调带 code
                                 ↑
                   后端使用 client_secret 交换 code 为 token
```

#### Hono 后端示例 / Hono Backend Example

```typescript
import { Hono } from 'hono';
import { setCookie, getCookie, deleteCookie } from 'hono/cookie';
import { UniAuthServer } from '@55387.ai/uniauth-server';

const app = new Hono();

const uniauth = new UniAuthServer({
  baseUrl: process.env.UNIAUTH_URL || 'https://sso.55387.xyz',
  clientId: process.env.UNIAUTH_CLIENT_ID!,
  clientSecret: process.env.UNIAUTH_CLIENT_SECRET!,
});

// 1. 发起登录 — 跳转到 UniAuth / Start login — redirect to UniAuth
app.get('/api/auth/login', (c) => {
  const origin = c.req.header('origin') || c.req.header('referer')?.replace(/\/+$/, '') || 'http://localhost:3000';
  const params = new URLSearchParams({
    client_id: process.env.UNIAUTH_CLIENT_ID!,
    redirect_uri: `${origin}/api/auth/callback`,
    response_type: 'code',
    scope: 'openid profile email phone',
    state: crypto.randomUUID(),
  });
  return c.redirect(`https://sso.55387.xyz/api/v1/oauth2/authorize?${params}`);
});

// 2. 回调 — 用 code 交换 token / Callback — exchange code for tokens
app.get('/api/auth/callback', async (c) => {
  const code = c.req.query('code');
  if (!code) {
    return c.json({ error: 'Missing authorization code' }, 400);
  }

  const origin = c.req.header('referer')?.replace(/\/api\/auth\/callback.*$/, '')
    || 'http://localhost:3000';

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

  const data = await response.json();
  if (!response.ok) {
    return c.json({ error: 'Token exchange failed', details: data }, 400);
  }

  // 将 token 存入 httpOnly cookie（安全）
  setCookie(c, 'auth_token', data.id_token || data.access_token, {
    httpOnly: true,
    secure: true,
    sameSite: 'Lax',
    maxAge: 60 * 60 * 24 * 7,  // 7 天
    path: '/',
  });

  return c.redirect('/');
});

// 3. 检查登录状态 / Check auth status
app.get('/api/auth/status', async (c) => {
  const token = getCookie(c, 'auth_token');
  if (!token) return c.json({ authenticated: false });

  try {
    const payload = await uniauth.verifyToken(token);
    return c.json({ authenticated: true, user: payload });
  } catch {
    return c.json({ authenticated: false });
  }
});

// 4. 登出 / Logout
app.post('/api/auth/logout', (c) => {
  deleteCookie(c, 'auth_token', { path: '/' });
  return c.json({ success: true });
});
```

#### 前端调用 / Frontend Usage

```typescript
// 触发登录 / Trigger login
window.location.href = '/api/auth/login';

// 检查登录状态 / Check auth status
const res = await fetch('/api/auth/status');
const { authenticated, user } = await res.json();

// 登出 / Logout
await fetch('/api/auth/logout', { method: 'POST' });
```

---

## C. Trusted Client API（嵌入式登录 API）

> 适用场景：你的项目有自己的后端服务，希望在服务端直接调用 UniAuth API 完成用户认证，无需使用前端 SDK。
>
> Best for: Projects with their own backend that want server-side authentication via direct API calls.

> [!WARNING]
> **需要 `trusted_client` 类型应用凭据。** 所有请求需要带上 `X-Client-Id` 和 `X-Client-Secret` 头。
>
> Requires `trusted_client` type app credentials. All requests must include `X-Client-Id` and `X-Client-Secret` headers.

### 认证方式 / Authentication Method

所有 Trusted Client API 请求必须携带以下头部：

```
X-Client-Id: ua_xxxxxxxxxxxx
X-Client-Secret: uas_xxxxxxxxxxxx
```

### API 端点一览 / API Endpoints

| 方法 | 端点 | 说明 |
|------|------|------|
| POST | `/api/v1/auth/trusted/phone/send-code` | 发送手机验证码 |
| POST | `/api/v1/auth/trusted/phone/verify` | 手机验证码登录 |
| POST | `/api/v1/auth/trusted/email/send-code` | 发送邮箱验证码 |
| POST | `/api/v1/auth/trusted/email/verify` | 邮箱验证码登录 |
| POST | `/api/v1/auth/trusted/email/login` | 邮箱密码登录 |
| POST | `/api/v1/auth/trusted/mfa/verify` | MFA 验证 |
| POST | `/api/v1/auth/trusted/token/refresh` | 刷新 Token |

### 完整接入示例（Node.js / TypeScript）

```typescript
const UNIAUTH_URL = 'https://sso.55387.xyz';
const CLIENT_ID = process.env.UNIAUTH_CLIENT_ID!;
const CLIENT_SECRET = process.env.UNIAUTH_CLIENT_SECRET!;

// 通用请求函数 / Common request function
async function trustedRequest(endpoint: string, body: object) {
  const response = await fetch(`${UNIAUTH_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Client-Id': CLIENT_ID,
      'X-Client-Secret': CLIENT_SECRET,
    },
    body: JSON.stringify(body),
  });
  return response.json();
}

// ============================================
// 手机号登录流程 / Phone login flow
// ============================================

// Step 1: 发送验证码 / Send SMS code
const sendResult = await trustedRequest('/api/v1/auth/trusted/phone/send-code', {
  phone: '+8613800138000',
});
// sendResult: { success: true, data: { expires_in: 300, retry_after: 60 } }

// Step 2: 验证码登录 / Verify and login
const loginResult = await trustedRequest('/api/v1/auth/trusted/phone/verify', {
  phone: '+8613800138000',
  code: '123456',
});

// Step 3: ⚠️ 检查 MFA / Check MFA
if (loginResult.data.mfa_required) {
  // 用户开启了 MFA，需要额外验证
  // 将 mfa_token 传给前端，让用户输入 TOTP 验证码
  const mfaResult = await trustedRequest('/api/v1/auth/trusted/mfa/verify', {
    mfa_token: loginResult.data.mfa_token,
    code: '654321',  // 来自用户的 TOTP 应用 (如 Google Authenticator)
  });
  // mfaResult: { success: true, data: { user, access_token, refresh_token, expires_in } }
} else {
  // 正常登录成功
  // loginResult.data: { user, access_token, refresh_token, expires_in, is_new_user }
}

// ============================================
// 邮箱密码登录流程 / Email password login flow
// ============================================

const emailLogin = await trustedRequest('/api/v1/auth/trusted/email/login', {
  email: 'user@example.com',
  password: 'StrongPass123!',
});
// 同样需要检查 mfa_required / Also check mfa_required

// ============================================
// 邮箱验证码登录流程 / Email code login flow
// ============================================

// Step 1: 发送邮箱验证码
await trustedRequest('/api/v1/auth/trusted/email/send-code', {
  email: 'user@example.com',
});

// Step 2: 验证码登录
const emailCodeLogin = await trustedRequest('/api/v1/auth/trusted/email/verify', {
  email: 'user@example.com',
  code: '123456',
});
// 同样需要检查 mfa_required / Also check mfa_required

// ============================================
// Token 刷新 / Token refresh
// ============================================

const refreshResult = await trustedRequest('/api/v1/auth/trusted/token/refresh', {
  refresh_token: 'xxx',
});
// refreshResult: { success: true, data: { access_token, refresh_token, expires_in } }
```

---

## D. 标准 OIDC 接入（非 Node.js 项目）

> 适用场景：Python、Go、Java 等非 Node.js 项目，使用标准 OIDC 客户端库。
>
> Best for: Non-Node.js projects using standard OIDC client libraries.

### OIDC 端点 / Endpoints

| 端点 | URL |
|------|-----|
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
    profile: (p) => ({
      id: p.sub,
      name: p.name,
      email: p.email,
      image: p.picture,
    }),
    clientId: process.env.UNIAUTH_CLIENT_ID,
    clientSecret: process.env.UNIAUTH_CLIENT_SECRET,
  }],
});
```

### Python + Authlib (Flask)

```python
from authlib.integrations.flask_client import OAuth

oauth = OAuth(app)
uniauth = oauth.register(
    'uniauth',
    client_id='ua_xxxxxxxxxxxx',
    client_secret='uas_xxxxxxxxxxxx',
    server_metadata_url='https://sso.55387.xyz/.well-known/openid-configuration',
    client_kwargs={'scope': 'openid profile email phone'},
)

@app.route('/login')
def login():
    return uniauth.authorize_redirect(url_for('callback', _external=True))

@app.route('/callback')
def callback():
    token = uniauth.authorize_access_token()
    user = uniauth.parse_id_token(token)
    session['user'] = user
    return redirect('/dashboard')
```

### Go + coreos/go-oidc

```go
provider, _ := oidc.NewProvider(ctx, "https://sso.55387.xyz")
oauth2Config := oauth2.Config{
    ClientID:     "ua_xxxxxxxxxxxx",
    ClientSecret: "uas_xxxxxxxxxxxx",
    RedirectURL:  "http://localhost:8080/callback",
    Endpoint:     provider.Endpoint(),
    Scopes:       []string{oidc.ScopeOpenID, "profile", "email", "phone"},
}
```

---

## 🔐 MFA 多因素认证处理（重要！）

> [!CAUTION]
> **这是接入方最容易遗漏的部分！** 如果你的用户群中有人开启了 MFA（如 `atai829525@gmail.com`），你的应用 **必须** 处理 MFA 流程，否则这些用户将无法登录。
>
> **This is the most commonly missed part!** If any of your users have MFA enabled, your app **MUST** handle the MFA flow, or those users cannot log in.

### MFA 触发场景 / When MFA is Triggered

**所有登录方式**（手机验证码、邮箱密码、邮箱验证码）在用户开启了 MFA 后，都会在第一步认证成功后返回 `mfa_required: true`，而不是直接返回 `access_token`。

All login methods return `mfa_required: true` after the first authentication step if the user has MFA enabled.

### 返回数据格式 / Response Format

```json
// 正常登录成功 (用户未开启 MFA) / Normal success (no MFA)
{
  "success": true,
  "data": {
    "user": { "id": "uuid", "email": "user@example.com" },
    "access_token": "eyJ...",
    "refresh_token": "xxx",
    "expires_in": 3600
  }
}

// MFA 触发 (用户已开启 MFA) / MFA triggered (user has MFA enabled)
{
  "success": true,
  "data": {
    "user": { "id": "uuid", "email": "atai829525@gmail.com" },
    "mfa_required": true,
    "mfa_token": "mfa_xxxxxxxxxxxxxxxx"
  }
}
```

### 完整 MFA 处理流程 / Complete MFA Flow

```
任意登录方式 → 第一步认证
                  ↓
          检查 response.data.mfa_required
                  ↓
    ┌─── false ───┴─── true ──────┐
    ↓                              ↓
  登录成功 ✅              展示 MFA 输入界面
  有 access_token            (让用户输入 TOTP 验证码)
                              ↓
                    用户输入 6 位数字验证码
                    (来自 Google Authenticator 等)
                              ↓
                    调用 verifyMFA(mfa_token, code)
                              ↓
                    ┌── 失败 ──┴── 成功 ──┐
                    ↓                      ↓
              显示错误提示              登录成功 ✅
              让用户重试               有 access_token
                    │
                    └── 也可使用 Recovery Code ──┘
                       (8-10位恢复码，一次性使用)
```

### SDK 方式处理 / SDK Method

```typescript
import { UniAuthClient, UniAuthError, AuthErrorCode } from '@55387.ai/uniauth-client';

const auth = new UniAuthClient({ baseUrl: 'https://sso.55387.xyz' });

async function handleLogin() {
  try {
    // 任何登录方式 / Any login method
    const result = await auth.loginWithCode('+8613800138000', '123456');
    // 或 / or: await auth.loginWithEmail('user@example.com', 'password');
    // 或 / or: await auth.loginWithEmailCode('user@example.com', '123456');

    if (result.mfa_required) {
      // ========== MFA 处理开始 ==========
      
      // 1. 在 UI 中展示 MFA 输入框
      //    Show MFA input in your UI
      showMFADialog();

      // 2. 用户输入验证码后调用
      //    Call after user enters the code
      const mfaCode = await getMFACodeFromUser(); // 你的 UI 逻辑

      try {
        const mfaResult = await auth.verifyMFA(result.mfa_token!, mfaCode);
        // 登录成功！mfaResult 包含 access_token 和 refresh_token
        console.log('MFA 验证通过，登录成功');
        redirectToDashboard();
      } catch (mfaError) {
        if (mfaError instanceof UniAuthError) {
          if (mfaError.code === 'MFA_VERIFY_FAILED') {
            showError('验证码错误，请重试');
            // 用户可以重试输入，不需要重新登录
          }
        }
      }

      // ========== MFA 处理结束 ==========
      return;
    }

    // 正常登录成功（用户未开启 MFA）
    console.log('登录成功:', result.user);
    redirectToDashboard();

  } catch (error) {
    if (error instanceof UniAuthError) {
      switch (error.code) {
        case AuthErrorCode.VERIFY_FAILED:
          showError('验证码错误');
          break;
        case AuthErrorCode.LOGIN_FAILED:
          showError('密码错误');
          break;
        case AuthErrorCode.RATE_LIMITED:
          showError('操作太频繁，请稍后再试');
          break;
      }
    }
  }
}
```

### Trusted Client API 方式处理 / Trusted Client API Method

```typescript
// 登录接口返回 MFA 要求时 / When login API returns MFA required
const loginResult = await trustedRequest('/api/v1/auth/trusted/phone/verify', {
  phone: '+8613800138000',
  code: '123456',
});

if (loginResult.data?.mfa_required) {
  // 将 mfa_token 返回给前端
  // Return mfa_token to frontend
  // 前端展示 MFA 输入框，用户输入后再调用：

  const mfaResult = await trustedRequest('/api/v1/auth/trusted/mfa/verify', {
    mfa_token: loginResult.data.mfa_token,
    code: '654321',  // 6位 TOTP 验证码 或 8-10位恢复码
  });

  if (mfaResult.success) {
    // 登录成功
    // mfaResult.data: { user, access_token, refresh_token, expires_in }
  } else {
    // MFA 验证失败
    // mfaResult.error: { code: 'MFA_VERIFY_FAILED', message: '...' }
  }
}
```

### Recovery Code（恢复码）

用户开启 MFA 时会获得一组恢复码。当用户无法使用 TOTP 应用（如手机丢失）时，可以使用恢复码代替 TOTP 验证码。

When users enable MFA, they receive recovery codes. When TOTP app is unavailable (e.g., lost phone), recovery codes can be used instead.

- 恢复码长度：8-10 位 / Recovery code length: 8-10 characters
- 每个恢复码只能使用一次 / Each recovery code is single-use
- 使用方法与 TOTP 验证码相同，传入 `verifyMFA()` 或 `/mfa/verify` 端点

```typescript
// 使用恢复码 / Use recovery code
await auth.verifyMFA(mfaToken, 'ABCD-1234-EF');  // 恢复码代替6位数字
```

---

## 🔑 Token 管理

### Token 类型 / Token Types

| Token | 有效期 | 用途 |
|-------|--------|------|
| `access_token` | 1 小时 | API 请求认证 |
| `refresh_token` | 7 天 | 刷新 access_token |
| `id_token` | — | 用户身份信息 (OIDC) |

### 自动刷新（SDK） / Auto Refresh (SDK)

```typescript
// SDK 自动处理 token 刷新
const token = await auth.getAccessToken(); // 如果过期会自动刷新

// 监听 Token 刷新事件
const auth = new UniAuthClient({
  baseUrl: 'https://sso.55387.xyz',
  onTokenRefresh: (tokens) => {
    console.log('Token 已自动刷新');
  },
});
```

### 手动刷新 / Manual Refresh

```typescript
// 使用 refresh_token 获取新的 access_token
const response = await fetch('https://sso.55387.xyz/api/v1/auth/refresh', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ refresh_token: 'xxx' }),
});
const { data } = await response.json();
// data: { access_token, refresh_token, expires_in }
```

### 登出 / Logout

```typescript
// SDK 方式
await auth.logout();     // 登出当前设备
await auth.logoutAll();  // 登出所有设备

// REST API 方式
await fetch('https://sso.55387.xyz/api/v1/auth/logout', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${accessToken}` },
});
```

---

## 🛡️ 后端 Token 验证

### 安装 / Install

```bash
npm install @55387.ai/uniauth-server
```

### 初始化 / Initialize

```typescript
import { UniAuthServer } from '@55387.ai/uniauth-server';

const uniauth = new UniAuthServer({
  baseUrl: process.env.UNIAUTH_URL || 'https://sso.55387.xyz',
  clientId: process.env.UNIAUTH_CLIENT_ID!,
  clientSecret: process.env.UNIAUTH_CLIENT_SECRET!,
});
```

### Express 中间件 / Express Middleware

```typescript
// 保护路由 / Protect routes
app.use('/api/*', uniauth.middleware());

// 访问用户信息 / Access user info
app.get('/api/profile', (req, res) => {
  res.json({
    user: req.user,        // { id, email, phone, nickname }
    payload: req.authPayload, // JWT payload
  });
});
```

### Hono 中间件 / Hono Middleware

```typescript
app.use('/api/*', uniauth.honoMiddleware());

app.get('/api/profile', (c) => {
  const user = c.get('user');
  const payload = c.get('authPayload');
  return c.json({ user, payload });
});
```

### 手动验证 / Manual Verification

```typescript
try {
  const payload = await uniauth.verifyToken(accessToken);
  // payload: { sub, email, phone, exp, iat, scope }
  console.log('User ID:', payload.sub);
} catch (error) {
  // ServerErrorCode.INVALID_TOKEN 或 ServerErrorCode.TOKEN_EXPIRED
  console.error('Token 验证失败:', error.message);
}
```

---

## 🔗 账号关联（Account Linking）

> 允许已登录用户关联/解除关联多个社交账号。
>
> Allows authenticated users to link/unlink multiple social accounts.

### API 端点 / Endpoints

| 方法 | 端点 | 说明 |
|------|------|------|
| GET | `/api/v1/account/linked-accounts` | 获取已关联账号列表 |
| POST | `/api/v1/account/link` | 关联社交账号 |
| POST | `/api/v1/account/link-oauth` | 安全关联（服务端交换 code）|
| DELETE | `/api/v1/account/link/:provider` | 解除关联 |
| GET | `/api/v1/account/link/check/:provider` | 检查是否可关联 |

所有端点需要 `Authorization: Bearer <access_token>` 头。

All endpoints require `Authorization: Bearer <access_token>` header.

### 示例 / Example

```typescript
// 获取已关联的账号 / Get linked accounts
const res = await fetch('https://sso.55387.xyz/api/v1/account/linked-accounts', {
  headers: { 'Authorization': `Bearer ${accessToken}` },
});
const data = await res.json();
// data: {
//   linked_accounts: [
//     { provider: 'google', provider_email: 'user@gmail.com', linked_at: '...' }
//   ],
//   available_providers: ['github', 'wechat']
// }

// 关联新账号（使用 OAuth code）/ Link new account (via OAuth code)
const linkRes = await fetch('https://sso.55387.xyz/api/v1/account/link-oauth', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    provider: 'github',
    code: 'oauth_authorization_code',
    redirect_uri: 'https://your-app.com/link-callback',
  }),
});

// 解除关联 / Unlink
await fetch('https://sso.55387.xyz/api/v1/account/link/google', {
  method: 'DELETE',
  headers: { 'Authorization': `Bearer ${accessToken}` },
});
```

---

## ⚠️ 错误处理

### 所有错误码 / Error Codes

| 错误码 | HTTP | 说明 | 处理建议 |
|--------|------|------|----------|
| `VERIFY_FAILED` | 400 | 验证码错误 | 提示用户重新输入 |
| `LOGIN_FAILED` | 401 | 密码错误 / 凭据无效 | 提示用户检查密码 |
| `MFA_REQUIRED` | — | 需要 MFA 验证 | 展示 MFA 输入框 |
| `MFA_VERIFY_FAILED` | 401 | MFA 验证码错误 | 提示用户重试 |
| `MISSING_CREDENTIALS` | 401 | 缺少 App Key/Secret | 检查配置 |
| `INVALID_CREDENTIALS` | 401 | App Key/Secret 错误 | 检查凭据 |
| `TOKEN_EXPIRED` | 401 | Token 已过期 | 使用 refresh_token 刷新 |
| `INVALID_TOKEN` | 401 | Token 无效 | 重新登录 |
| `RATE_LIMITED` | 429 | 请求太频繁 | 等待后重试 |
| `SEND_CODE_FAILED` | 500 | 发送验证码失败 | 重试或联系管理员 |
| `REGISTER_FAILED` | 400 | 注册失败（邮箱已存在） | 提示用户登录 |
| `INTERNAL_ERROR` | 500 | 服务器错误 | 联系管理员 |

### SDK 错误处理 / SDK Error Handling

```typescript
import { UniAuthError, AuthErrorCode } from '@55387.ai/uniauth-client';

try {
  await auth.loginWithCode(phone, code);
} catch (error) {
  if (error instanceof UniAuthError) {
    switch (error.code) {
      case AuthErrorCode.VERIFY_FAILED:
        showToast('验证码错误，请重新输入');
        break;
      case AuthErrorCode.RATE_LIMITED:
        showToast('操作太频繁，请稍后再试');
        break;
      case AuthErrorCode.MFA_REQUIRED:
        // 这个通常不会作为异常抛出，而是在 result 中返回
        // This usually isn't thrown as an error, but returned in result
        break;
      default:
        showToast(`登录失败: ${error.message}`);
    }
  }
}
```

### 后端 SDK 错误处理 / Backend SDK Error Handling

```typescript
import { ServerAuthError, ServerErrorCode } from '@55387.ai/uniauth-server';

try {
  await uniauth.verifyToken(token);
} catch (error) {
  if (error instanceof ServerAuthError) {
    switch (error.code) {
      case ServerErrorCode.INVALID_TOKEN:
        return c.json({ error: 'Token 无效' }, 401);
      case ServerErrorCode.TOKEN_EXPIRED:
        return c.json({ error: 'Token 已过期' }, 401);
    }
  }
}
```

---

## ❓ FAQ 常见问题

### Q1: 用户开启了 MFA，我的应用怎么处理？

**A:** 所有登录方式在用户开启 MFA 后，第一步认证成功后会返回 `mfa_required: true` 和 `mfa_token`，而不是 `access_token`。你需要：

1. 检测 `result.mfa_required` 或 `result.data.mfa_required`
2. 在 UI 中展示 MFA 验证码输入框
3. 调用 `auth.verifyMFA(mfa_token, code)` 或 `POST /api/v1/auth/trusted/mfa/verify`
4. 成功后才能获得 `access_token`

如果你使用 **SSO 方式**（方式 B），MFA 流程由 UniAuth 登录页自动处理，你的应用不需要额外处理。

### Q2: 我应该选哪种接入方式？

| 场景 | 推荐方式 |
|------|----------|
| React/Vue 前端，想快速接入 | **B1** (SSO Public Client) |
| 有后端（Hono/Express），安全优先 | **B2** (SSO Confidential Client) |
| 想自定义登录 UI | **A** (SDK 直连) |
| 后端直接调 API，不用 SDK | **C** (Trusted Client) |
| Python/Go/Java 项目 | **D** (标准 OIDC) |
| 不想处理 MFA UI | **B** (SSO，MFA 由 UniAuth 页面处理) |

### Q3: `client_secret` 可以放在前端吗？

**绝对不行！** `client_secret` 只能在服务端使用。如果你的应用是纯前端 SPA，使用 **Public Client** 模式（无 `client_secret`），并配合 PKCE。

### Q4: Token 过期了怎么办？

SDK 会自动处理 token 刷新。如果你手动管理 token，在 `access_token` 过期（默认 1 小时）后，使用 `refresh_token` 调用 `/api/v1/auth/refresh` 获取新的 token。`refresh_token` 有效期为 7 天。

### Q5: 如何处理登出？

```typescript
// SDK 方式
await auth.logout();          // 登出当前设备
await auth.logoutAll();       // 登出所有设备

// REST API
POST /api/v1/auth/logout      // 需要 Bearer token
POST /api/v1/auth/logout-all  // 需要 Bearer token
```

### Q6: 手机号格式要求是什么？

必须使用 **E.164 格式**：`+<国家代码><号码>`，如 `+8613800138000`（中国），`+14155552671`（美国）。

### Q7: 我的项目需要同时支持多种登录方式怎么办？

可以！所有方式可以组合使用。推荐的 UI 布局：
- 主区域：手机验证码登录 或 邮箱密码登录
- 底部：社交登录按钮（Google / GitHub / WeChat）
- 高级选项：Passkey 登录

### Q8: SSO 方式下，用户在 UniAuth 页面选择了社交登录，回调会到哪里？

社交登录的回调由 UniAuth 服务端内部处理。当用户完成社交登录后，UniAuth 会将用户重定向回你配置的 `redirect_uri`，带上 `code` 参数。你的应用只需要处理这个 `code` 即可，不需要关心用户是用哪种方式登录的。

---

## 🔒 安全最佳实践

1. **永远不要在前端暴露 `client_secret`** — 仅在服务端使用
2. **公共客户端使用 PKCE** — `auth.loginWithSSO({ usePKCE: true })`
3. **后端使用 `httpOnly` Cookie 存储 Token** — 防止 XSS 攻击
4. **验证 `state` 参数** — 防止 CSRF 攻击
5. **使用短期 access_token + refresh token 轮换** — 已由 UniAuth 默认配置
6. **接入 MFA 处理** — 确保开启 MFA 的用户也能正常登录

---

> 📬 **需要帮助？** 联系 UniAuth 管理员或查看 [API Reference](./API_REFERENCE.md) 获取完整 API 文档。
>
> 📬 **Need help?** Contact the UniAuth admin or see [API Reference](./API_REFERENCE.md) for the full API docs.
