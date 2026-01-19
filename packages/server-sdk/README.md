# @55387.ai/uniauth-server

UniAuth 后端 SDK，用于在 Node.js 后端服务中验证用户令牌。

## 安装

```bash
npm install @55387.ai/uniauth-server
# or
pnpm add @55387.ai/uniauth-server
```

## 快速开始

```typescript
import { UniAuthServer } from '@55387.ai/uniauth-server';

const auth = new UniAuthServer({
  baseUrl: 'https://sso.55387.xyz',
  clientId: 'your-client-id',
  clientSecret: 'your-client-secret',
});

// 验证令牌
const payload = await auth.verifyToken(accessToken);
console.log('User ID:', payload.sub);
```

## Express 中间件

```typescript
import express from 'express';
import { UniAuthServer } from '@55387.ai/uniauth-server';

const app = express();
const auth = new UniAuthServer({ ... });

// 保护 API 路由
app.use('/api/*', auth.middleware());

// 在路由中使用用户信息
app.get('/api/profile', (req, res) => {
  res.json({ user: req.user, payload: req.authPayload });
});
```

## Hono 中间件

```typescript
import { Hono } from 'hono';
import { UniAuthServer } from '@55387.ai/uniauth-server';

const app = new Hono();
const auth = new UniAuthServer({ ... });

// 保护 API 路由
app.use('/api/*', auth.honoMiddleware());

// 在路由中使用用户信息
app.get('/api/profile', (c) => {
  const user = c.get('user');
  return c.json({ user });
});
```

## SSO OAuth2 后端代理登录

当应用配置为 **Confidential Client**（机密客户端）时，需要通过后端完成 Token 交换。

### 流程概述

```
用户 → 前端 → /api/auth/login → 后端生成授权 URL → 重定向到 SSO
                                                    ↓
用户 ← 前端 ← /                ← 后端设置 Cookie ← SSO 回调到 /api/auth/callback
                                                    ↑
                                        后端用 client_secret 交换 Token
```

### API 端点

| 端点 | URL |
|------|-----|
| 授权端点 | `https://sso.55387.xyz/api/v1/oauth2/authorize` |
| Token 端点 | `https://sso.55387.xyz/api/v1/oauth2/token` |
| 用户信息端点 | `https://sso.55387.xyz/api/v1/oauth2/userinfo` |

### 实现示例（Hono）

```typescript
import { Hono } from 'hono';
import { setCookie, getCookie } from 'hono/cookie';

const app = new Hono();

// 登录端点 - 重定向到 SSO
app.get('/api/auth/login', (c) => {
  const origin = c.req.header('origin') || 'http://localhost:3000';
  const redirectUri = `${origin}/api/auth/callback`;
  
  const params = new URLSearchParams({
    client_id: process.env.UNIAUTH_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid profile email phone',
    state: generateRandomState(),  // 生成随机 state 防止 CSRF
  });
  
  return c.redirect(`https://sso.55387.xyz/api/v1/oauth2/authorize?${params}`);
});

// 回调端点 - 交换 Token
app.get('/api/auth/callback', async (c) => {
  const code = c.req.query('code');
  const origin = c.req.header('referer')?.replace(/\/api\/auth\/callback.*$/, '') || 'http://localhost:3000';
  
  // 用授权码交换 Token
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
  
  // 将 Token 存储到 httpOnly Cookie
  setCookie(c, 'auth_token', id_token, {
    httpOnly: true,
    secure: true,
    sameSite: 'Lax',
    maxAge: 60 * 60 * 24 * 7,  // 7 天
  });
  
  return c.redirect('/');
});

// 检查登录状态
app.get('/api/auth/status', async (c) => {
  const token = getCookie(c, 'auth_token');
  if (!token) {
    return c.json({ authenticated: false });
  }
  
  // 验证 Token
  try {
    const payload = await auth.verifyToken(token);
    return c.json({ authenticated: true, userId: payload.sub });
  } catch {
    return c.json({ authenticated: false });
  }
});
```

### 前端调用

```typescript
// 触发登录
const handleLogin = () => {
  window.location.href = '/api/auth/login';
};

// 检查登录状态
const checkAuth = async () => {
  const response = await fetch('/api/auth/status', { credentials: 'include' });
  const data = await response.json();
  return data.authenticated;
};
```

## OAuth2 Token Introspection (RFC 7662)

```typescript
// 内省令牌（资源服务器标准验证方式）
const result = await auth.introspectToken(accessToken);

if (result.active) {
  console.log('Token 有效');
  console.log('用户:', result.sub);
  console.log('权限:', result.scope);
} else {
  console.log('Token 无效或已过期');
}
```

## API 参考

### 初始化选项

```typescript
interface UniAuthServerConfig {
  baseUrl: string;        // UniAuth 服务地址
  clientId: string;       // OAuth2 客户端 ID
  clientSecret: string;   // OAuth2 客户端密钥
  jwtPublicKey?: string;  // JWT 公钥（用于本地验证）
}
```

### 方法

| 方法 | 说明 |
|------|------|
| `verifyToken(token)` | 验证访问令牌 |
| `introspectToken(token)` | RFC 7662 令牌内省 |
| `isTokenActive(token)` | 检查令牌是否有效 |
| `getUser(userId)` | 获取用户信息 |
| `middleware()` | Express/Connect 中间件 |
| `honoMiddleware()` | Hono 中间件 |
| `clearCache()` | 清除令牌缓存 |

### 类型

```typescript
interface TokenPayload {
  sub: string;           // 用户 ID
  iss?: string;          // 签发者
  aud?: string | string[]; // 受众
  exp: number;           // 过期时间
  iat: number;           // 签发时间
  scope?: string;        // 权限范围
  phone?: string;        // 手机号
  email?: string;        // 邮箱
}

interface UserInfo {
  id: string;
  phone?: string;
  email?: string;
  nickname?: string;
  avatar_url?: string;
  phone_verified?: boolean;
  email_verified?: boolean;
}
```

## 错误处理

```typescript
import { ServerAuthError, ServerErrorCode } from '@55387.ai/uniauth-server';

try {
  await auth.verifyToken(token);
} catch (error) {
  if (error instanceof ServerAuthError) {
    switch (error.code) {
      case ServerErrorCode.INVALID_TOKEN:
        // 令牌无效
        break;
      case ServerErrorCode.TOKEN_EXPIRED:
        // 令牌已过期
        break;
    }
  }
}
```

## License

MIT
