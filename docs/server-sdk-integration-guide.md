# UniAuth Server SDK 接入指南

> 适用于已接入 Client SDK 的后端项目（Morning、Note 等）

## 概述

**Client SDK** 用于前端：处理用户登录、Token 管理  
**Server SDK** 用于后端：验证 Token、保护 API、获取用户信息

## 安装

```bash
# npm
npm install @55387.ai/uniauth-server

# pnpm (推荐)
pnpm add @55387.ai/uniauth-server
```

---

## 快速开始

### 1. 初始化 SDK

```typescript
// lib/auth.ts
import { UniAuthServer } from '@55387.ai/uniauth-server';

export const uniauth = new UniAuthServer({
  baseUrl: process.env.UNIAUTH_URL || 'https://sso.55387.xyz',
  clientId: process.env.UNIAUTH_CLIENT_ID!,
  clientSecret: process.env.UNIAUTH_CLIENT_SECRET!,
});
```

### 2. 环境变量

```env
UNIAUTH_URL=https://sso.55387.xyz
UNIAUTH_CLIENT_ID=your_app_client_id
UNIAUTH_CLIENT_SECRET=your_app_client_secret
```

---

## 使用方式

### 方式一：Express 中间件（推荐）

```typescript
import express from 'express';
import { uniauth } from './lib/auth';

const app = express();

// 保护所有 /api 路由
app.use('/api/*', uniauth.middleware());

// 在路由中获取用户信息
app.get('/api/profile', (req, res) => {
  // req.user - 用户详细信息
  // req.authPayload - Token 载荷
  res.json({ 
    userId: req.user?.id,
    email: req.user?.email,
    tokenExp: req.authPayload?.exp 
  });
});
```

### 方式二：Hono 中间件

```typescript
import { Hono } from 'hono';
import { uniauth } from './lib/auth';

const app = new Hono();

// 保护所有 /api 路由
app.use('/api/*', uniauth.honoMiddleware());

// 在路由中获取用户信息
app.get('/api/profile', (c) => {
  const user = c.get('user');
  return c.json({ user });
});
```

### 方式三：手动验证 Token

```typescript
import { uniauth } from './lib/auth';

async function handleRequest(req: Request) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const payload = await uniauth.verifyToken(token);
    // payload.sub = 用户 ID
    // payload.email = 邮箱
    // payload.phone = 手机号
    // payload.exp = 过期时间
  } catch (error) {
    return new Response('Invalid token', { status: 401 });
  }
}
```

---

## API 参考

### 核心方法

| 方法 | 说明 | 返回值 |
|------|------|--------|
| `verifyToken(token)` | 验证 Token 有效性 | `TokenPayload` |
| `introspectToken(token)` | RFC 7662 令牌内省 | `IntrospectionResult` |
| `getUser(userId)` | 获取用户详情 | `UserInfo` |
| `isTokenActive(token)` | 检查 Token 是否有效 | `boolean` |

### 中间件

| 方法 | 说明 |
|------|------|
| `middleware()` | Express/Connect 中间件 |
| `honoMiddleware()` | Hono 框架中间件 |

---

## 类型定义

```typescript
// Token 载荷
interface TokenPayload {
  sub: string;           // 用户 ID
  iss?: string;          // 签发者
  aud?: string;          // 受众
  exp: number;           // 过期时间 (Unix timestamp)
  iat: number;           // 签发时间
  scope?: string;        // 权限范围
  email?: string;        // 邮箱
  phone?: string;        // 手机号
}

// 用户信息
interface UserInfo {
  id: string;
  email?: string;
  phone?: string;
  nickname?: string;
  avatar_url?: string;
  email_verified?: boolean;
  phone_verified?: boolean;
}
```

---

## 错误处理

```typescript
import { ServerAuthError, ServerErrorCode } from '@55387.ai/uniauth-server';

try {
  await uniauth.verifyToken(token);
} catch (error) {
  if (error instanceof ServerAuthError) {
    switch (error.code) {
      case ServerErrorCode.INVALID_TOKEN:
        // Token 格式无效
        break;
      case ServerErrorCode.TOKEN_EXPIRED:
        // Token 已过期，前端应使用 Refresh Token 刷新
        break;
      case ServerErrorCode.UNAUTHORIZED:
        // 用户未认证
        break;
    }
  }
}
```

---

## 与 Client SDK 配合

```
┌─────────────────┐        ┌─────────────────┐        ┌─────────────────┐
│   前端 (React)  │        │   后端 (Node)   │        │   UniAuth SSO   │
│  Client SDK     │───────▶│   Server SDK    │───────▶│                 │
└─────────────────┘        └─────────────────┘        └─────────────────┘
         │                          │
         │ 1. 用户登录获取 Token    │ 3. 验证 Token
         │ 2. 发送 API 请求        │ 4. 获取用户信息
         ▼                          ▼
```

## 常见问题

**Q: Token 验证是远程还是本地？**  
A: 默认远程验证，可配置 `jwtPublicKey` 启用本地验证。

**Q: Token 缓存多久？**  
A: SDK 自动缓存验证结果 1 分钟，可调用 `clearCache()` 清除。

**Q: 刷新 Token 由谁处理？**  
A: 前端 Client SDK 负责自动刷新，后端只需验证 Access Token。
