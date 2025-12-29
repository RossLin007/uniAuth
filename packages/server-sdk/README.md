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
