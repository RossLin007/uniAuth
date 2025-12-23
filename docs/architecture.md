# UniAuth - Unified Authentication Platform

## 项目架构文档 / Project Architecture

---

## 1. 项目概述 / Project Overview

**UniAuth** 是一个统一身份认证平台，为多个应用服务（笔记、AI Chat 等）提供集中式的用户认证与授权。

**UniAuth** is a unified authentication platform that provides centralized user authentication and authorization for multiple application services (Notes, AI Chat, etc.).

### 核心特性 / Core Features

| Feature | Description |
|---------|-------------|
| 📱 **Phone Login** | 手机号 + 验证码登录 (腾讯云短信) |
| 🔑 **Token Auth** | JWT Access Token + Refresh Token |
| 🔌 **SDK Support** | 前端 SDK & 后端 SDK |
| 🌐 **Multi-language** | 中英文双语支持 |
| 📱 **Responsive** | PC / Mobile / Tablet 全端适配 |

---

## 2. 系统架构 / System Architecture

```
┌────────────────────────────────────────────────────────────────────┐
│                         Client Applications                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐           │
│  │  Notes   │  │ AI Chat  │  │   App3   │  │   ...    │           │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘           │
│       │             │             │             │                  │
│       └─────────────┴──────┬──────┴─────────────┘                  │
│                            │                                       │
│                   ┌────────▼────────┐                              │
│                   │  UniAuth SDK    │  (Frontend / Backend)        │
│                   └────────┬────────┘                              │
└────────────────────────────┼───────────────────────────────────────┘
                             │ HTTPS
┌────────────────────────────▼───────────────────────────────────────┐
│                      UniAuth API Server                            │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │                    API Gateway (Hono)                        │  │
│  ├─────────────────────────────────────────────────────────────┤  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │  │
│  │  │   Auth   │  │   User   │  │   Token  │  │   Admin  │    │  │
│  │  │ Service  │  │ Service  │  │ Service  │  │ Service  │    │  │
│  │  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘    │  │
│  │       └─────────────┴──────┬──────┴─────────────┘          │  │
│  └────────────────────────────┼────────────────────────────────┘  │
│                               │                                    │
│  ┌────────────────────────────▼────────────────────────────────┐  │
│  │                   Infrastructure Layer                       │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │  │
│  │  │ Supabase │  │  Redis   │  │ Tencent  │  │   Rate   │    │  │
│  │  │ Postgres │  │  Cache   │  │   SMS    │  │ Limiter  │    │  │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘    │  │
│  └─────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────┘
```

---

## 3. 技术栈 / Tech Stack

### 后端 / Backend

| Component | Technology |
|-----------|------------|
| Runtime | Node.js 20+ |
| Language | TypeScript |
| Framework | [Hono](https://hono.dev/) - Fast, lightweight |
| Database | Supabase PostgreSQL |
| Cache | Redis (Upstash) |
| SMS | 腾讯云短信 SDK |
| Auth | JWT (jose) |
| Validation | Zod |
| Testing | Vitest |

### SDK

| SDK | Technology |
|-----|------------|
| Frontend SDK | TypeScript, fetch API |
| Backend SDK | TypeScript, Node.js compatible |

---

## 4. 数据库设计 / Database Schema

### 4.1 用户表 / Users Table

```sql
-- 用户表 / Users
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone VARCHAR(20) UNIQUE NOT NULL,          -- 手机号 (带国际区号)
    phone_verified BOOLEAN DEFAULT FALSE,       -- 手机是否已验证
    nickname VARCHAR(100),                      -- 昵称
    avatar_url TEXT,                            -- 头像 URL
    status VARCHAR(20) DEFAULT 'active',        -- active, suspended, deleted
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建索引
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_status ON users(status);
```

### 4.2 验证码表 / Verification Codes Table

```sql
-- 验证码表 / Verification Codes
CREATE TABLE verification_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone VARCHAR(20) NOT NULL,                 -- 手机号
    code VARCHAR(6) NOT NULL,                   -- 验证码 (6位)
    type VARCHAR(20) NOT NULL,                  -- login, register, reset
    expires_at TIMESTAMPTZ NOT NULL,            -- 过期时间
    used BOOLEAN DEFAULT FALSE,                 -- 是否已使用
    attempts INT DEFAULT 0,                     -- 验证尝试次数
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建索引
CREATE INDEX idx_vc_phone_type ON verification_codes(phone, type);
CREATE INDEX idx_vc_expires ON verification_codes(expires_at);
```

### 4.3 刷新令牌表 / Refresh Tokens Table

```sql
-- 刷新令牌表 / Refresh Tokens
CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(64) NOT NULL UNIQUE,     -- Token hash (SHA-256)
    device_info JSONB,                          -- 设备信息
    ip_address VARCHAR(45),                     -- IP 地址
    expires_at TIMESTAMPTZ NOT NULL,            -- 过期时间
    revoked BOOLEAN DEFAULT FALSE,              -- 是否已撤销
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建索引
CREATE INDEX idx_rt_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_rt_token_hash ON refresh_tokens(token_hash);
```

### 4.4 应用表 / Applications Table

```sql
-- 应用表 / Applications (接入的应用)
CREATE TABLE applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,                 -- 应用名称
    app_key VARCHAR(64) UNIQUE NOT NULL,        -- 应用 Key
    app_secret VARCHAR(128) NOT NULL,           -- 应用 Secret (加密存储)
    redirect_uris TEXT[] DEFAULT '{}',          -- 允许的回调 URI
    status VARCHAR(20) DEFAULT 'active',        -- active, suspended
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建索引
CREATE INDEX idx_apps_app_key ON applications(app_key);
```

### 4.5 审计日志表 / Audit Logs Table

```sql
-- 审计日志表 / Audit Logs
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(50) NOT NULL,                -- login, logout, token_refresh, etc.
    ip_address VARCHAR(45),
    user_agent TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建索引
CREATE INDEX idx_al_user_id ON audit_logs(user_id);
CREATE INDEX idx_al_action ON audit_logs(action);
CREATE INDEX idx_al_created_at ON audit_logs(created_at);
```

---

## 5. API 设计 / API Design

### 5.1 认证相关 API / Authentication APIs

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/send-code` | 发送验证码 / Send verification code |
| POST | `/api/v1/auth/verify-code` | 验证码登录/注册 / Login/Register with code |
| POST | `/api/v1/auth/refresh` | 刷新令牌 / Refresh token |
| POST | `/api/v1/auth/logout` | 登出 / Logout |
| POST | `/api/v1/auth/logout-all` | 登出所有设备 / Logout all devices |

### 5.2 用户相关 API / User APIs

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/user/me` | 获取当前用户信息 / Get current user |
| PATCH | `/api/v1/user/me` | 更新用户信息 / Update user info |
| GET | `/api/v1/user/sessions` | 获取活跃会话 / Get active sessions |
| DELETE | `/api/v1/user/sessions/:id` | 撤销某个会话 / Revoke a session |

### 5.3 应用管理 API / Application APIs (Admin)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/admin/apps` | 获取应用列表 / List applications |
| POST | `/api/v1/admin/apps` | 创建应用 / Create application |
| PATCH | `/api/v1/admin/apps/:id` | 更新应用 / Update application |
| DELETE | `/api/v1/admin/apps/:id` | 删除应用 / Delete application |

---

## 6. API 请求/响应示例 / API Examples

### 6.1 发送验证码 / Send Verification Code

**Request:**
```http
POST /api/v1/auth/send-code
Content-Type: application/json

{
  "phone": "+8613800138000",
  "type": "login"
}
```

**Response (Success):**
```json
{
  "success": true,
  "data": {
    "expires_in": 300,
    "retry_after": 60
  },
  "message": "验证码已发送 / Verification code sent"
}
```

### 6.2 验证码登录 / Login with Code

**Request:**
```http
POST /api/v1/auth/verify-code
Content-Type: application/json

{
  "phone": "+8613800138000",
  "code": "123456"
}
```

**Response (Success):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "phone": "+8613800138000",
      "nickname": null,
      "avatar_url": null
    },
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "dGhpcyBpcyBhIHJlZnJlc2ggdG9rZW4...",
    "expires_in": 3600,
    "is_new_user": true
  }
}
```

### 6.3 刷新令牌 / Refresh Token

**Request:**
```http
POST /api/v1/auth/refresh
Content-Type: application/json

{
  "refresh_token": "dGhpcyBpcyBhIHJlZnJlc2ggdG9rZW4..."
}
```

**Response (Success):**
```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "bmV3IHJlZnJlc2ggdG9rZW4...",
    "expires_in": 3600
  }
}
```

---

## 7. SDK 设计 / SDK Design

### 7.1 前端 SDK / Frontend SDK

```typescript
// @uniauth/client

import { UniAuthClient } from '@uniauth/client';

// 初始化
const auth = new UniAuthClient({
  baseUrl: 'https://auth.example.com',
  appKey: 'your-app-key',
  storage: 'localStorage', // or 'sessionStorage'
  onTokenRefresh: (tokens) => {
    console.log('Tokens refreshed');
  },
  onAuthError: (error) => {
    console.log('Auth error:', error);
  }
});

// 发送验证码
await auth.sendCode('+8613800138000');

// 验证码登录
const result = await auth.loginWithCode('+8613800138000', '123456');

// 获取当前用户
const user = await auth.getCurrentUser();

// 登出
await auth.logout();

// 检查登录状态
const isLoggedIn = auth.isAuthenticated();

// 获取 Access Token (自动刷新)
const token = await auth.getAccessToken();
```

### 7.2 后端 SDK / Backend SDK

```typescript
// @uniauth/server

import { UniAuthServer } from '@uniauth/server';

// 初始化
const auth = new UniAuthServer({
  baseUrl: 'https://auth.example.com',
  appKey: 'your-app-key',
  appSecret: 'your-app-secret'
});

// 验证 Access Token
const payload = await auth.verifyToken(accessToken);
// Returns: { userId: 'uuid', phone: '+8613800138000', ... }

// Express/Hono 中间件
app.use('/api/*', auth.middleware());

// 获取用户信息
const user = await auth.getUser(userId);
```

---

## 8. 安全设计 / Security Design

### 8.1 令牌策略 / Token Strategy

| Token | Lifetime | Storage |
|-------|----------|---------|
| Access Token | 1 hour | Memory / LocalStorage |
| Refresh Token | 30 days | HttpOnly Cookie / Secure Storage |

### 8.2 安全措施 / Security Measures

- ✅ **Rate Limiting**: 验证码发送 1 次/分钟，验证 5 次/15 分钟
- ✅ **Token Rotation**: Refresh Token 每次使用后自动轮换
- ✅ **IP Blocking**: 多次失败后临时封禁 IP
- ✅ **Audit Logging**: 所有认证操作记录日志
- ✅ **HTTPS Only**: 生产环境强制 HTTPS
- ✅ **CORS**: 严格的跨域策略

---

## 9. 项目结构 / Project Structure

```
uniAuth/
├── .agent/                      # Agent 配置
│   ├── GEMINI.md
│   └── rules/
├── docs/                        # 文档
│   ├── owner.md
│   └── architecture.md
├── packages/
│   ├── server/                  # API 服务
│   │   ├── src/
│   │   │   ├── index.ts         # 入口
│   │   │   ├── config/          # 配置
│   │   │   ├── routes/          # 路由
│   │   │   ├── services/        # 业务逻辑
│   │   │   ├── middlewares/     # 中间件
│   │   │   ├── lib/             # 工具库
│   │   │   └── types/           # 类型定义
│   │   ├── tests/               # 测试
│   │   └── package.json
│   ├── client-sdk/              # 前端 SDK
│   │   ├── src/
│   │   ├── tests/
│   │   └── package.json
│   └── server-sdk/              # 后端 SDK
│       ├── src/
│       ├── tests/
│       └── package.json
├── package.json                 # Monorepo root
├── pnpm-workspace.yaml
├── tsconfig.json
└── README.md
```

---

## 10. 开发路线图 / Development Roadmap

### Phase 1: Core (MVP) ⏱️ 1-2 weeks
- [x] 项目架构设计
- [ ] 数据库 Schema 创建
- [ ] 验证码发送/验证 API
- [ ] JWT 令牌管理
- [ ] 基础用户 API

### Phase 2: SDK ⏱️ 1 week
- [ ] Frontend SDK
- [ ] Backend SDK
- [ ] SDK 文档

### Phase 3: Enhancement ⏱️ 1 week
- [ ] 应用管理后台
- [ ] 审计日志
- [ ] 监控告警

### Phase 4: Production ⏱️ Ongoing
- [ ] 部署到 Cloud Run
- [ ] 自动化测试
- [ ] 性能优化

---

*Last Updated: 2025-12-21*
