# UniAuth — Unified Authentication Platform

<p align="center">
  <strong>🔐 Unified Authentication Platform / 统一身份认证平台</strong>
</p>

<p align="center">
  Centralized user authentication & authorization for multiple apps.<br/>
  为多个应用提供统一的用户认证与授权服务。
</p>

---

## ✨ Features / 特性

| Feature | Description |
|---------|-------------|
| 📱 **Phone Login** | SMS code login (Tencent Cloud SMS) / 手机验证码登录 |
| 📧 **Email Login** | Password + Passwordless code login / 密码 + 验证码登录 |
| 🌐 **Social Login** | Google, GitHub, WeChat OAuth / 第三方 OAuth 登录 |
| 🔐 **SSO** | Single Sign-On via OAuth2/OIDC / 单点登录 |
| 🔑 **MFA** | Multi-factor authentication / 多因素认证 |
| 🪙 **JWT + Refresh** | Access Token + Refresh Token rotation / 双令牌轮换 |
| 📦 **SDK** | Client SDK + Server SDK + React SDK |
| 🌍 **Bilingual** | Chinese + English / 中英双语 |
| 📱 **Responsive** | PC / Mobile / Tablet / 全端适配 |
| 🛡️ **Security** | Rate limiting, IP blocking, audit logging |

---

## 🚀 Quick Start / 快速开始

### Prerequisites / 前置要求

- Node.js 20+
- pnpm 8+
- Supabase account
- Tencent Cloud SMS (for phone login)

### Install & Run / 安装与运行

```bash
git clone https://github.com/RossLin007/uniAuth.git
cd uniAuth
pnpm install
cp .env.example .env
# Edit .env with your configuration / 编辑 .env

# Start all services / 一键启动
npm run dev:all
```

### Service Ports / 服务端口

| Service | Port | URL | Description |
|---------|------|-----|-------------|
| 🔧 API Server | 3000 | http://localhost:3000 | Backend API / 后端 API |
| 🌐 Web Frontend | 5173 | http://localhost:5173 | Login page / 登录页 |
| 👨‍💻 Developer Console | 5174 | http://localhost:5174 | App management / 应用管理 |
| 📚 API Docs | 3000 | http://localhost:3000/docs | Swagger / 接口文档 |

---

## 📦 Packages / 包结构

| Package | Version | Description |
|---------|---------|-------------|
| `@55387.ai/uniauth-client` | 1.2.2 | Frontend SDK ([npm](https://www.npmjs.com/package/@55387.ai/uniauth-client)) |
| `@55387.ai/uniauth-server` | 1.2.2 | Backend SDK ([npm](https://www.npmjs.com/package/@55387.ai/uniauth-server)) |
| `@55387.ai/uniauth-react` | 0.1.0 | React hooks & components |
| `@uniauth/server` | — | API Server (internal) |
| `@uniauth/web` | — | Login frontend (internal) |
| `@uniauth/developer-console` | — | Developer console (internal) |

---

## 📖 SDK Usage / SDK 使用

### Frontend / 前端

```typescript
import { UniAuthClient } from '@55387.ai/uniauth-client';

const auth = new UniAuthClient({ baseUrl: 'https://sso.55387.xyz' });

// 📱 Phone login / 手机登录
await auth.sendCode('+8613800138000');
const result = await auth.loginWithCode('+8613800138000', '123456');

// 📧 Email login / 邮箱登录
const result = await auth.loginWithEmail('user@example.com', 'password');

// 🌐 Social login / 社交登录
auth.startSocialLogin('google');

// 🔐 SSO login / 单点登录
auth.configureSso({ ssoUrl: '...', clientId: '...', redirectUri: '...' });
auth.loginWithSSO();

// 👤 User / 用户
const user = await auth.getCurrentUser();
await auth.logout();
```

### Backend / 后端

```typescript
import { UniAuthServer } from '@55387.ai/uniauth-server';

const auth = new UniAuthServer({
  baseUrl: 'https://sso.55387.xyz',
  clientId: 'your-client-id',
  clientSecret: 'your-client-secret',
});

// Protect routes / 保护路由
app.use('/api/*', auth.middleware());          // Express
app.use('/api/*', auth.honoMiddleware());      // Hono

// Verify token / 验证令牌
const payload = await auth.verifyToken(token);
```

---

## 🔗 API Endpoints / API 接口

### Auth / 认证

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/v1/auth/phone/send-code` | ❌ | Send SMS code / 发送短信验证码 |
| POST | `/api/v1/auth/phone/verify` | ❌ | Phone code login / 手机验证码登录 |
| POST | `/api/v1/auth/email/register` | ❌ | Email register / 邮箱注册 |
| POST | `/api/v1/auth/email/login` | ❌ | Email login / 邮箱密码登录 |
| POST | `/api/v1/auth/email/send-code` | ❌ | Send email code / 发送邮箱验证码 |
| POST | `/api/v1/auth/email/verify` | ❌ | Email code login / 邮箱验证码登录 |
| GET | `/api/v1/auth/oauth/providers` | ❌ | List OAuth providers / OAuth 提供商 |
| GET | `/api/v1/auth/oauth/:provider/authorize` | ❌ | Social login redirect / 社交登录跳转 |
| POST | `/api/v1/auth/mfa/verify-login` | ❌ | MFA verification / MFA 验证 |
| POST | `/api/v1/auth/refresh` | ❌ | Refresh token / 刷新令牌 |
| POST | `/api/v1/auth/verify` | 🔑 | Verify token / 验证令牌 |
| POST | `/api/v1/auth/logout` | 🔒 | Logout / 登出 |
| POST | `/api/v1/auth/logout-all` | 🔒 | Logout all / 全设备登出 |

### OAuth2

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/oauth2/authorize` | Authorization / 授权 |
| POST | `/api/v1/oauth2/token` | Token exchange / 令牌交换 |
| POST | `/api/v1/oauth2/introspect` | Token introspection / 令牌内省 |

### OIDC

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/.well-known/openid-configuration` | Discovery / 发现文档 |
| GET | `/.well-known/jwks.json` | JWKS / 公钥集 |
| GET | `/api/v1/oauth2/userinfo` | UserInfo / 用户信息 |

### User / 用户

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/v1/user/me` | 🔒 | Get user / 获取用户 |
| PATCH | `/api/v1/user/me` | 🔒 | Update profile / 更新资料 |
| GET | `/api/v1/user/sessions` | 🔒 | List sessions / 活跃会话 |
| DELETE | `/api/v1/user/sessions/:id` | 🔒 | Revoke session / 撤销会话 |

> ❌ = No auth &nbsp; 🔒 = Bearer token &nbsp; 🔑 = App Key/Secret

---

## 📚 Documentation / 文档

| Document | Description |
|----------|-------------|
| [AI Integration Guide](./docs/AI_INTEGRATION_GUIDE.md) | 🤖 Complete integration guide for AI agents / AI 集成指南 |
| [API Reference](./docs/API_REFERENCE.md) | 📋 Full REST API reference / 完整 API 参考 |
| [Changelog](./docs/CHANGELOG.md) | 📝 Version history / 版本记录 |

---

## 🧪 Testing / 测试

```bash
pnpm test              # Run all tests
pnpm test:coverage     # With coverage
pnpm test:watch        # Watch mode
```

---

## 🐳 Deployment / 部署

```bash
# Docker
docker build -t uniauth .
docker compose up -d
```

See [DEPLOYMENT.md](./DEPLOYMENT.md) for full deployment guide.

---

## 📄 License

MIT
