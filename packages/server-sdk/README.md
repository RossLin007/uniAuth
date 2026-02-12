# @55387.ai/uniauth-server

> UniAuth Backend SDK — Token verification & middleware for Node.js servers.
>
> UniAuth 后端 SDK — Node.js 服务端令牌验证和中间件。

**Version / 版本:** 1.2.2

## Install / 安装

```bash
npm install @55387.ai/uniauth-server
# or / 或
pnpm add @55387.ai/uniauth-server
```

## Quick Start / 快速开始

```typescript
import { UniAuthServer } from '@55387.ai/uniauth-server';

const auth = new UniAuthServer({
  baseUrl: 'https://sso.55387.xyz',
  clientId: process.env.UNIAUTH_CLIENT_ID!,
  clientSecret: process.env.UNIAUTH_CLIENT_SECRET!,
});

// Verify token / 验证令牌
const payload = await auth.verifyToken(accessToken);
console.log('User ID:', payload.sub);
```

## Middleware / 中间件

### Express

```typescript
import express from 'express';
const app = express();

app.use('/api/*', auth.middleware());

app.get('/api/profile', (req, res) => {
  res.json({ user: req.user, payload: req.authPayload });
});
```

### Hono

```typescript
import { Hono } from 'hono';
const app = new Hono();

app.use('/api/*', auth.honoMiddleware());

app.get('/api/profile', (c) => {
  return c.json({ user: c.get('user') });
});
```

## SSO Backend Proxy / SSO 后端代理

When your app is a **Confidential Client**, token exchange must happen on the server.

当应用配置为 **机密客户端** 时，Token 交换必须在服务端完成。

```
User → Frontend → /api/auth/login → Backend → redirect to UniAuth SSO
                                                      ↓
User ← Frontend ← redirect ← Backend (set cookie) ← SSO callback
                                      ↑
                         Backend exchanges code with client_secret
```

See full implementation: [AI Integration Guide](../../docs/AI_INTEGRATION_GUIDE.md#2b-backend-proxy-confidential-client)

完整实现见: [集成指南](../../docs/AI_INTEGRATION_GUIDE.md#2b-backend-proxy-confidential-client)

## Token Introspection / 令牌内省

RFC 7662 compliant token introspection:

```typescript
const result = await auth.introspectToken(accessToken);

if (result.active) {
  console.log('User:', result.sub);
  console.log('Scope:', result.scope);
}
```

## API Reference / API 参考

### Config / 配置

```typescript
interface UniAuthServerConfig {
  baseUrl: string;        // UniAuth server URL
  clientId: string;       // OAuth2 client ID
  clientSecret: string;   // OAuth2 client secret
  jwtPublicKey?: string;  // JWT public key (local verification)
}
```

### Methods / 方法

| Method | Description / 说明 |
|--------|-----------|
| `verifyToken(token)` | Verify access token / 验证访问令牌 |
| `introspectToken(token)` | RFC 7662 introspection / 令牌内省 |
| `isTokenActive(token)` | Check if token is active / 检查令牌状态 |
| `getUser(userId)` | Get user info / 获取用户信息 |
| `middleware()` | Express middleware / Express 中间件 |
| `honoMiddleware()` | Hono middleware / Hono 中间件 |
| `clearCache()` | Clear token cache / 清除令牌缓存 |

### Token Verification Flow / 令牌验证流程

```
verifyToken(token)
  │
  ├─ 1. POST /api/v1/auth/verify (App Key + Secret)
  │     ↓ success → return payload
  │     ↓ 404 or network error
  │
  ├─ 2. POST /api/v1/oauth2/introspect (Basic Auth, RFC 7662)
  │     ↓ active:true → return payload
  │     ↓ fail
  │
  └─ 3. Local JWT verification (if jwtPublicKey configured)
```

### Types / 类型

```typescript
interface TokenPayload {
  sub: string;              // User ID
  iss?: string;             // Issuer
  aud?: string | string[];  // Audience
  exp: number;              // Expiration
  iat: number;              // Issued at
  scope?: string;           // Scopes
  phone?: string;           // Phone number
  email?: string;           // Email
}
```

## Error Handling / 错误处理

```typescript
import { ServerAuthError, ServerErrorCode } from '@55387.ai/uniauth-server';

try {
  await auth.verifyToken(token);
} catch (error) {
  if (error instanceof ServerAuthError) {
    switch (error.code) {
      case ServerErrorCode.INVALID_TOKEN:  // Invalid / 令牌无效
      case ServerErrorCode.TOKEN_EXPIRED:  // Expired / 令牌过期
    }
  }
}
```

## 🤖 AI Agent Prompts / AI 智能体提示词

This package includes an AI-ready integration prompt. Copy it into your AI coding assistant (Claude, Cursor, Copilot, etc.) to generate a complete backend protection setup automatically.

本包附带 AI 集成提示词。将其复制到 AI 编程助手中，即可自动生成完整的后端保护代码。

```bash
# After install, find the prompt at:
# 安装后，提示词文件位于：
cat node_modules/@55387.ai/uniauth-server/ai-prompts/backend-protection.md
```

> [!TIP]
> Replace placeholders like `YOUR_UNIAUTH_URL` and `YOUR_CLIENT_SECRET` before pasting into your AI assistant.
> 粘贴到 AI 助手前，请替换 `YOUR_UNIAUTH_URL` 和 `YOUR_CLIENT_SECRET` 等占位符。

See all prompts: [docs/ai-prompts/](../../docs/ai-prompts/README.md)

## License

MIT
