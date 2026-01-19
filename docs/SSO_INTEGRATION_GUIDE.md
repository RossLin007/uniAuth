# UniAuth SSO 集成指南

本文档介绍如何在你的应用中集成 UniAuth SSO 单点登录功能。

## 概述

UniAuth SSO 使用标准的 OAuth 2.0 授权码流程（Authorization Code Flow）。你的应用需要：

1. 在 UniAuth 管理后台注册应用，获取 `client_id` 和 `client_secret`
2. 配置有效的 `redirect_uri`
3. 实现授权和 Token 交换逻辑

## API 端点

| 端点 | URL |
|------|-----|
| 授权端点 | `https://sso.55387.xyz/api/v1/oauth2/authorize` |
| Token 端点 | `https://sso.55387.xyz/api/v1/oauth2/token` |
| 用户信息端点 | `https://sso.55387.xyz/api/v1/oauth2/userinfo` |
| JWKS 端点 | `https://sso.55387.xyz/.well-known/jwks.json` |
| OpenID 配置 | `https://sso.55387.xyz/.well-known/openid-configuration` |

## 集成方式

### 方式一：使用 UniAuth SDK（推荐）

#### 前端 SDK

```bash
npm install @55387.ai/uniauth-client
```

```typescript
import { UniAuthClient } from '@55387.ai/uniauth-client'

const uniauth = new UniAuthClient({
  baseUrl: 'https://sso.55387.xyz',
  clientId: 'your_client_id',
})

// 配置 SSO
uniauth.configureSso({
  ssoUrl: 'https://sso.55387.xyz',
  clientId: 'your_client_id',
  redirectUri: window.location.origin + '/callback',
  scope: 'openid profile email phone',
})

// 触发 SSO 登录
uniauth.loginWithSSO()

// 处理回调（在 /callback 页面）
if (uniauth.isSSOCallback()) {
  const result = await uniauth.handleSSOCallback()
  // result.access_token, result.refresh_token, result.expires_in
}
```

> **注意**：前端 SDK 直接调用 Token 端点时需要应用配置为 **Public Client**（公开客户端），否则会因缺少 `client_secret` 而失败。

#### 后端 SDK

```bash
npm install @55387.ai/uniauth-server
```

```typescript
import { UniAuthServer } from '@55387.ai/uniauth-server'

const uniAuth = new UniAuthServer({
  baseUrl: 'https://sso.55387.xyz',
  clientId: process.env.UNIAUTH_CLIENT_ID,
  clientSecret: process.env.UNIAUTH_CLIENT_SECRET,
})

// 验证 Token
const result = await uniAuth.verifyToken(accessToken)

// 获取用户信息
const user = await uniAuth.getUser(accessToken)
```

---

### 方式二：后端代理登录流程（推荐用于机密客户端）

当你的应用使用 **Confidential Client**（机密客户端）时，需要通过后端完成 Token 交换，因为 `client_secret` 不能暴露在前端。

#### 流程图

```
用户 → 前端 → /api/auth/login → 后端生成授权 URL → 重定向到 SSO
                                                    ↓
用户 ← 前端 ← /                ← 后端设置 Cookie ← SSO 回调到 /api/auth/callback
                                                    ↑
                                        后端用 client_secret 交换 Token
```

#### 后端实现示例（TypeScript / Hono）

##### 1. 生成授权 URL

```typescript
// lib/auth.ts
export function generateAuthUrl(config: AuthConfig, state: string): string {
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: 'code',
    scope: 'openid profile email phone',
    state,
  })
  return `https://sso.55387.xyz/api/v1/oauth2/authorize?${params.toString()}`
}
```

##### 2. 登录端点

```typescript
// routes/auth.ts
app.get('/login', async (c) => {
  const origin = c.req.header('origin') || 'http://localhost:3000'
  const redirectUri = `${origin}/api/auth/callback`
  
  const config = {
    clientId: c.env.UNIAUTH_CLIENT_ID,
    clientSecret: c.env.UNIAUTH_CLIENT_SECRET,
    redirectUri,
  }

  const state = generateState() // 生成随机 state 防止 CSRF
  // 将 state 存储到 Redis 用于验证...

  const authUrl = generateAuthUrl(config, state)
  return c.redirect(authUrl)
})
```

##### 3. 回调端点

```typescript
app.get('/callback', async (c) => {
  const code = c.req.query('code')
  const state = c.req.query('state')
  
  // 验证 state...
  
  const config = {
    clientId: c.env.UNIAUTH_CLIENT_ID,
    clientSecret: c.env.UNIAUTH_CLIENT_SECRET,
    redirectUri: `${origin}/api/auth/callback`,
  }

  // 用授权码交换 Token
  const response = await fetch('https://sso.55387.xyz/api/v1/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: config.redirectUri,
    }),
  })

  const { access_token, id_token, refresh_token } = await response.json()

  // 将 Token 存储到 httpOnly Cookie
  setCookie(c, 'auth_token', id_token, {
    httpOnly: true,
    secure: true,
    sameSite: 'Lax',
    maxAge: 60 * 60 * 24 * 7, // 7 天
  })

  return c.redirect('/')
})
```

##### 4. 验证登录状态

```typescript
app.get('/me', async (c) => {
  const token = getCookie(c, 'auth_token')
  if (!token) {
    return c.json({ error: 'Not authenticated' }, 401)
  }

  // 解析 JWT 获取用户信息
  const decoded = decodeJwt(token)
  return c.json({
    userId: decoded.sub,
    email: decoded.email,
    name: decoded.name,
  })
})
```

#### 前端实现

```typescript
// LoginPage.tsx
const handleOAuthLogin = () => {
  // 跳转到后端登录端点
  window.location.href = '/api/auth/login'
}

// auth.ts
export async function checkAuthStatus(): Promise<boolean> {
  const response = await fetch('/api/auth/status', {
    credentials: 'include', // 携带 Cookie
  })
  const data = await response.json()
  return data.authenticated === true
}
```

---

## SSO 配置清单

在 UniAuth 管理后台配置应用时，需要设置：

| 配置项 | 说明 | 示例 |
|--------|------|------|
| Client ID | 应用唯一标识 | `ua_xxxxxxxxxxxx` |
| Client Secret | 应用密钥（机密客户端需要） | `xxxxxxxx` |
| Redirect URIs | 授权回调地址（可配置多个） | `http://localhost:3000/api/auth/callback` |
| Client Type | Public（前端）或 Confidential（后端） | Confidential |
| Scopes | 授权范围 | `openid profile email phone` |

---

## 常见问题

### 1. `invalid_client` 错误

- 检查 `client_id` 是否正确
- 检查 `redirect_uri` 是否在 SSO 后台注册

### 2. `Client authentication failed` 错误

- 如果是前端直接调用 Token 端点，需要配置为 Public Client
- 如果是后端调用，检查 `client_secret` 是否正确

### 3. Token 过期

- 使用 `refresh_token` 刷新 Token
- 或重新引导用户登录

### 4. 404 错误

- 确认使用正确的 API 端点：`/api/v1/oauth2/authorize`（不是 `/oauth2/authorize`）

---

## 参考项目

- [transcribe 项目](../../../transcribe) - 后端代理登录实现示例
- [meeting 项目](../../../meeting) - UniAuth SDK 集成示例
