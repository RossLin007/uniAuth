# UniAuth 第三方开发者接入能力 - 完整工作计划

> **文档版本**: v1.0  
> **创建日期**: 2025-12-23  
> **目标**: 将 UniAuth 打造为成熟的多应用统一认证服务 (IdP)

---

## 📋 目录

1. [项目背景与目标](#1-项目背景与目标)
2. [功能全景图](#2-功能全景图)
3. [分阶段实施计划](#3-分阶段实施计划)
4. [技术设计要点](#4-技术设计要点)
5. [SDK 规划](#5-sdk-规划)
6. [验收标准](#6-验收标准)

---

## 1. 项目背景与目标

### 1.1 背景

UniAuth 目前已实现：
- ✅ 手机/邮箱验证码登录
- ✅ 邮箱密码登录
- ✅ 社交登录 (Google, GitHub, WeChat)
- ✅ MFA 二次验证
- ✅ OAuth 2.0 Provider (授权码模式 + PKCE)

**现存问题**：
- 第三方应用只能通过 OAuth2 跳转模式接入（用户跳转到 UniAuth 登录页）
- 不支持第三方应用在**自己的登录页**直接调用认证 API（嵌入式登录）
- 缺少应用类型区分、Client Credentials 等企业级功能

### 1.2 目标

构建完整的第三方开发者接入体系：

```
┌─────────────────────────────────────────────────────────────┐
│                    UniAuth IdP                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │ OAuth2 跳转  │  │ 嵌入式 API  │  │ M2M 机器认证 │          │
│  │  (现有)      │  │  (待实现)   │  │  (待实现)   │          │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘          │
│         │                │                │                  │
│         └────────────────┴────────────────┘                  │
│                          ↓                                   │
│              Node.js / TypeScript SDK                        │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. 功能全景图

### 2.1 应用管理模块

| 功能 | 优先级 | 当前状态 | 目标阶段 |
| :--- | :---: | :---: | :---: |
| 应用注册 (client_id/client_secret) | P0 | ✅ 已有 | - |
| 应用类型区分 (Web/SPA/Native/M2M) | P0 | ❌ | Phase 1 |
| Redirect URI 白名单 | P0 | ✅ 已有 | - |
| 应用 Logo/描述 | P1 | ✅ 已有 | - |
| 受信任应用标记 (跳过授权页) | P1 | ✅ 已有 | - |
| 应用 Secret 轮换 | P2 | ❌ | Phase 3 |
| 应用作用域 (Scopes) 定义 | P1 | ⚠️ 部分 | Phase 2 |

### 2.2 认证协议模块

| 功能 | 优先级 | 当前状态 | 目标阶段 |
| :--- | :---: | :---: | :---: |
| OAuth 2.0 Authorization Code | P0 | ✅ 已有 | - |
| OAuth 2.0 + PKCE | P0 | ✅ 已有 | - |
| **嵌入式登录 API (Trusted Client)** | **P0** | **❌** | **Phase 1** |
| Client Credentials (M2M) | P1 | ❌ | Phase 2 |
| OpenID Connect (OIDC) 完整实现 | P2 | ⚠️ 部分 | Phase 3 |

### 2.3 令牌管理模块

| 功能 | 优先级 | 当前状态 | 目标阶段 |
| :--- | :---: | :---: | :---: |
| Access Token (JWT) | P0 | ✅ 已有 | - |
| Refresh Token | P0 | ✅ 已有 | - |
| Token 中包含 `aud` (audience) | P0 | ❌ | Phase 1 |
| Token 中包含 `azp` (authorized party) | P1 | ❌ | Phase 1 |
| ID Token (OIDC) | P2 | ⚠️ 部分 | Phase 3 |
| 自定义 Claims | P3 | ❌ | Phase 4 |

### 2.4 开发者体验模块

| 功能 | 优先级 | 当前状态 | 目标阶段 |
| :--- | :---: | :---: | :---: |
| API 文档 (OpenAPI/Swagger) | P0 | ✅ 已有 | - |
| **Node.js/TypeScript SDK** | **P0** | ⚠️ 文档 | **Phase 1** |
| 开发者控制台 (自助管理应用) | P2 | ❌ | Phase 3 |
| Webhooks (事件通知) | P2 | ❌ | Phase 3 |

### 2.5 安全与审计模块

| 功能 | 优先级 | 当前状态 | 目标阶段 |
| :--- | :---: | :---: | :---: |
| 速率限制 | P0 | ✅ 已有 | - |
| 人机验证 (Captcha) | P0 | ✅ 已有 | - |
| 审计日志 | P0 | ✅ 已有 | - |
| 应用级别审计 (区分来源) | P0 | ❌ | Phase 1 |
| IP 黑/白名单 | P2 | ❌ | Phase 3 |

---

## 3. 分阶段实施计划

### Phase 1: 嵌入式登录核心 (预计 2 周)

> **目标**: 支持第三方应用在自己的登录页直接调用 UniAuth API

#### 3.1.1 数据库变更

```sql
-- 1. 应用类型字段
ALTER TABLE applications ADD COLUMN IF NOT EXISTS 
    app_type VARCHAR(20) DEFAULT 'web' 
    CHECK (app_type IN ('web', 'spa', 'native', 'm2m'));

-- 2. 允许的授权模式
ALTER TABLE applications ADD COLUMN IF NOT EXISTS 
    allowed_grants TEXT[] DEFAULT ARRAY['authorization_code'];
```

#### 3.1.2 API 实现

| 端点 | 方法 | 描述 |
| :--- | :---: | :--- |
| `/api/v1/auth/trusted/phone/send-code` | POST | 发送手机验证码 (需 client 认证) |
| `/api/v1/auth/trusted/phone/verify` | POST | 手机验证码登录 |
| `/api/v1/auth/trusted/email/send-code` | POST | 发送邮箱验证码 (需 client 认证) |
| `/api/v1/auth/trusted/email/verify` | POST | 邮箱验证码登录 |
| `/api/v1/auth/trusted/email/login` | POST | 邮箱密码登录 |
| `/api/v1/auth/trusted/mfa/verify` | POST | MFA 二次验证 |
| `/api/v1/auth/trusted/token/refresh` | POST | 刷新令牌 |

#### 3.1.3 请求格式

```typescript
// 所有 /trusted/* API 需要 client 认证
interface TrustedAuthRequest {
    client_id: string;       // 必填
    client_secret: string;   // Web/M2M 应用必填
    // ... 其他业务参数
}

// 响应格式
interface TrustedAuthResponse {
    success: boolean;
    data?: {
        user: UserPublic;
        access_token: string;   // JWT, aud = client_id
        refresh_token: string;
        expires_in: number;
        mfa_required?: boolean;
        mfa_token?: string;
    };
    error?: { code: string; message: string };
}
```

#### 3.1.4 Token 增强

```typescript
// JWT Payload 增加字段
interface JWTPayload {
    sub: string;              // 用户 ID
    aud: string;              // client_id (应用标识)
    azp: string;              // authorized party
    iss: string;              // UniAuth issuer
    iat: number;
    exp: number;
    scope?: string;
}
```

#### 3.1.5 SDK 实现 (Node.js/TypeScript)

```typescript
// packages/sdk/src/index.ts
export class UniAuthClient {
    constructor(config: {
        baseUrl: string;
        clientId: string;
        clientSecret?: string;
    });

    // 嵌入式登录
    async sendPhoneCode(phone: string): Promise<SendCodeResult>;
    async loginWithPhoneCode(phone: string, code: string): Promise<LoginResult>;
    async sendEmailCode(email: string): Promise<SendCodeResult>;
    async loginWithEmailCode(email: string, code: string): Promise<LoginResult>;
    async loginWithEmailPassword(email: string, password: string): Promise<LoginResult>;
    async verifyMFA(mfaToken: string, code: string): Promise<LoginResult>;
    async refreshToken(refreshToken: string): Promise<TokenResult>;

    // OAuth2 辅助
    getAuthorizationUrl(options: AuthUrlOptions): string;
    exchangeCode(code: string, codeVerifier?: string): Promise<TokenResult>;
    getUserInfo(accessToken: string): Promise<UserInfo>;

    // Token 验证
    verifyToken(token: string): Promise<TokenPayload>;
}
```

#### 3.1.6 交付物

- [ ] 数据库迁移脚本 (`migrations/005_app_types_trusted_api.sql`)
- [ ] Trusted Auth 路由 (`routes/trusted-auth.routes.ts`)
- [ ] Client 认证中间件 (`middlewares/client-auth.middleware.ts`)
- [ ] JWT 增强 (添加 `aud`/`azp`)
- [ ] SDK 包 (`packages/sdk/`)
- [ ] 集成测试
- [ ] 更新开发者文档

---

### Phase 2: M2M 与 Scopes (预计 1.5 周)

> **目标**: 支持机器对机器认证，细化权限控制

#### 3.2.1 功能列表

- [ ] Client Credentials Grant 实现
- [ ] Scope 定义与验证
- [ ] 资源服务器 Token 验证 API
- [ ] SDK 增加 M2M 方法

#### 3.2.2 API

| 端点 | 方法 | 描述 |
| :--- | :---: | :--- |
| `/api/v1/oauth2/token` | POST | 支持 `grant_type=client_credentials` |
| `/api/v1/oauth2/introspect` | POST | Token 内省 (资源服务器验证) |

---

### Phase 3: 开发者控制台与企业功能 (预计 3 周)

> **目标**: 提供自助管理界面，完善企业级功能

#### 3.3.1 开发者控制台 UI

一个 Web 管理界面，让第三方开发者**自助管理**其应用：

```
┌─────────────────────────────────────────────────────────────┐
│  🏠 开发者控制台                              👤 developer@x.com │
├─────────────────────────────────────────────────────────────┤
│  📦 我的应用 (2)                          [+ 创建新应用]      │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  🔵 MyApp                                             │   │
│  │  Client ID: ua_xxx...xxx                              │   │
│  │  类型: Web App | 状态: 活跃 | 本月登录: 1,234           │   │
│  │  [编辑] [查看日志] [删除]                               │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

**功能清单**:
- [ ] 开发者登录/注册
- [ ] 应用列表页
- [ ] 创建应用表单 (类型选择、Logo 上传、Redirect URI 配置)
- [ ] 应用详情/编辑页
- [ ] 凭证管理页 (查看 client_id，脱敏显示 secret)
- [ ] 统计仪表盘 (登录次数、活跃用户、趋势图)
- [ ] 日志查看页 (该应用的认证日志)

#### 3.3.2 应用 Secret 轮换

安全最佳实践，定期更换 `client_secret`：

```
┌─────────────────────────────────────────────┐
│  🔐 凭证管理                                 │
├─────────────────────────────────────────────┤
│  Client ID:     ua_abc123...                │
│  Client Secret: ●●●●●●●●●●●●  [显示] [复制] │
│                                             │
│  ⚠️ 上次轮换: 90 天前                        │
│  [🔄 轮换 Secret]                            │
│                                             │
│  轮换后，旧 Secret 将在 24 小时后失效         │
└─────────────────────────────────────────────┘
```

**功能清单**:
- [ ] 生成新 Secret API
- [ ] 旧 Secret 延迟失效机制 (grace period)
- [ ] 轮换历史记录

#### 3.3.3 Webhooks 事件通知

当特定事件发生时，UniAuth 向第三方应用推送通知：

| 事件 | 触发时机 | 用途 |
| :--- | :--- | :--- |
| `user.login` | 用户通过此应用登录 | 同步登录状态 |
| `user.logout` | 用户登出 | 清理会话 |
| `user.register` | 新用户注册 | 初始化用户数据 |
| `user.mfa_enabled` | 用户开启 MFA | 安全通知 |
| `token.revoked` | Token 被撤销 | 同步失效 |

**请求格式**:
```http
POST https://myapp.com/webhooks/uniauth
X-UniAuth-Signature: sha256=xxx
Content-Type: application/json

{
  "event": "user.login",
  "timestamp": "2025-12-23T22:00:00Z",
  "data": {
    "user_id": "user_123",
    "client_id": "ua_abc123",
    "ip_address": "1.2.3.4"
  }
}
```

**功能清单**:
- [ ] Webhook 配置 CRUD API
- [ ] 事件触发机制
- [ ] HMAC 签名验证
- [ ] 重试机制 (失败重试 3 次，指数退避)
- [ ] 调用日志

#### 3.3.4 IP 黑/白名单

应用级别的访问控制：

| 类型 | 作用 |
| :--- | :--- |
| **IP 白名单** | 仅允许指定 IP 调用 Trusted API (后端服务器) |
| **IP 黑名单** | 阻止可疑 IP 的登录请求 |

**功能清单**:
- [ ] IP 名单配置 API
- [ ] 请求拦截中间件
- [ ] 命中日志记录

#### 3.3.5 OIDC 完整实现

补全 OpenID Connect 标准端点，使第三方可用标准库直接对接：

| 端点 | 描述 |
| :--- | :--- |
| `/.well-known/openid-configuration` | Discovery 文档 |
| `/oauth2/jwks` | 公钥集 (验证 JWT 签名) |
| `/oauth2/userinfo` | 用户信息端点 (完善) |

**功能清单**:
- [ ] Discovery 端点实现
- [ ] JWKS 端点实现
- [ ] ID Token 生成 (符合 OIDC 规范)
- [ ] UserInfo 端点完善

#### 3.3.6 交付物

- [ ] 开发者控制台前端 (`packages/developer-console/`)
- [ ] 开发者身份管理 API
- [ ] 应用管理 API (CRUD)
- [ ] Secret 轮换 API
- [ ] Webhooks 系统
- [ ] IP 控制中间件
- [ ] OIDC 端点
- [ ] 集成测试
- [ ] 文档更新

### Phase 4: 高级功能 (待规划)

> 以下功能根据实际需求择优实现

#### 4.1 自定义 Claims

允许在 JWT Token 中添加自定义字段，资源服务器无需额外查询即可获取用户扩展信息：

```typescript
// Token Payload 示例
{
  "sub": "user_123",
  "email": "alice@example.com",
  // 自定义 Claims
  "org_id": "org_456",
  "roles": ["admin", "editor"],
  "plan": "enterprise"
}
```

- [ ] Claims 配置管理
- [ ] Token 生成时动态注入

#### 4.2 登录流程 Hooks (Actions)

在登录流程的关键节点插入自定义逻辑：

| Hook | 触发时机 | 用途示例 |
| :--- | :--- | :--- |
| `pre-login` | 认证前 | IP 白名单检查、封号验证 |
| `post-login` | 认证成功后 | 记录登录日志到外部系统 |
| `post-register` | 新用户注册后 | 发送欢迎邮件、创建默认数据 |
| `token-exchange` | Token 生成时 | 动态添加 Claims |

- [ ] Hook 配置管理
- [ ] Webhook 调用机制
- [ ] 超时与重试策略

#### 4.3 Passkey / WebAuthn

无密码生物识别登录，未来趋势：

- [ ] WebAuthn 注册流程
- [ ] WebAuthn 登录流程
- [ ] 设备管理 (已注册的 Passkey 列表)

#### 4.4 品牌自定义 (White-Label)

允许应用自定义 UniAuth 托管登录页的外观：

- [ ] Logo / Favicon 配置
- [ ] 主题色 / 背景色
- [ ] 自定义 CSS
- [ ] 登录页文案 (多语言)

---

## 4. 技术设计要点

### 4.1 Client 认证方式

| 应用类型 | 认证方式 | 说明 |
| :--- | :--- | :--- |
| Web (Server-side) | `client_id` + `client_secret` | 后端直接调用 |
| SPA (Browser) | `client_id` + PKCE | 无 secret，用 code_verifier |
| Native (Mobile) | `client_id` + PKCE | 同 SPA |
| M2M (Machine) | `client_id` + `client_secret` | Client Credentials |

### 4.2 安全考量

1. **Secret 传输**: 仅限后端 HTTPS 调用，禁止前端暴露
2. **速率限制**: 按 `client_id` 独立限流
3. **审计**: 所有 Trusted API 调用记录 `client_id`
4. **Token 限制**: 不同应用类型的 Token 有效期可配置

### 4.3 向后兼容

- 现有 `/api/v1/auth/*` 路由保持不变（供 UniAuth 自身前端使用）
- 新增 `/api/v1/auth/trusted/*` 路由供第三方使用
- 现有 OAuth2 流程不受影响

---

## 5. SDK 规划

### 5.1 Node.js / TypeScript SDK

| 模块 | 版本 | 状态 |
| :--- | :---: | :--- |
| `@uniauth/sdk` | 1.0.0 | Phase 1 实现 |
| `@uniauth/sdk` | 1.1.0 | Phase 2 增加 M2M |

**发布位置**: npm registry

**技术栈**:
- TypeScript 5.x
- Fetch API (浏览器兼容)
- Zero dependencies (minimal)

### 5.2 SDK 使用示例

```typescript
import { UniAuthClient } from '@uniauth/sdk';

const auth = new UniAuthClient({
    baseUrl: 'https://auth.example.com',
    clientId: 'your_client_id',
    clientSecret: 'your_client_secret', // 仅后端使用
});

// 嵌入式登录流程
async function handleLogin(phone: string, code: string) {
    const result = await auth.loginWithPhoneCode(phone, code);
    
    if (result.mfaRequired) {
        // 需要 MFA
        const mfaResult = await auth.verifyMFA(result.mfaToken!, userMfaCode);
        return mfaResult;
    }
    
    return result;
}

// Token 刷新
async function refreshSession(refreshToken: string) {
    return auth.refreshToken(refreshToken);
}

// OAuth2 跳转登录
const loginUrl = auth.getAuthorizationUrl({
    redirectUri: 'https://myapp.com/callback',
    scope: 'profile email',
    state: 'random_state',
});
```

### 5.3 开发者文档规划

为开发者提供完整的文档体系：

#### 文档结构

```
docs/
├── README.md                    # 文档首页/索引
├── QUICKSTART.md               # 快速入门 (5 分钟接入)
├── DEVELOPER_GUIDE.md          # 开发者完整指南 (已有，需更新)
├── INTEGRATION.md              # 集成说明 (已有，需更新)
├── API_REFERENCE.md            # API 完整参考
├── SDK_GUIDE.md                # SDK 使用指南
├── SECURITY_BEST_PRACTICES.md  # 安全最佳实践
├── TROUBLESHOOTING.md          # 常见问题与故障排查
├── CHANGELOG.md                # 版本更新日志
└── examples/                   # 示例代码
    ├── nextjs-example/         # Next.js 集成示例
    ├── express-example/        # Express 后端示例
    └── react-spa-example/      # React SPA 示例 (PKCE)
```

#### 文档内容清单

| 文档 | 内容 | 阶段 |
| :--- | :--- | :---: |
| **QUICKSTART.md** | 5 分钟快速接入教程，含可运行示例 | Phase 1 |
| **API_REFERENCE.md** | 所有 API 端点详细说明、请求/响应格式 | Phase 1 |
| **SDK_GUIDE.md** | SDK 安装、配置、完整 API 文档 | Phase 1 |
| **examples/** | 3 个完整示例项目 (Next.js/Express/React SPA) | Phase 1 |
| **SECURITY_BEST_PRACTICES.md** | Token 存储、Secret 保护、CORS 配置 | Phase 1 |
| **TROUBLESHOOTING.md** | 错误码说明、常见问题解答 | Phase 2 |
| **Webhooks 文档** | Webhook 配置与事件处理 | Phase 3 |
| **开发者控制台指南** | 控制台使用说明 | Phase 3 |

#### 示例项目内容

**Next.js 示例** (`examples/nextjs-example/`):
```typescript
// 嵌入式登录页面
// OAuth2 回调处理
// 中间件 Token 验证
// 用户信息展示
```

**Express 后端示例** (`examples/express-example/`):
```typescript
// Trusted API 调用
// Token 验证中间件
// M2M 认证
// Webhook 接收处理
```

**React SPA 示例** (`examples/react-spa-example/`):
```typescript
// PKCE 授权码流程
// Token 自动刷新
// 登录状态管理
```

---

## 6. 验收标准

### Phase 1 验收条件

- [ ] 第三方应用可通过 `client_id` + `client_secret` 调用嵌入式登录 API
- [ ] 返回的 Access Token 包含 `aud` 字段标识应用
- [ ] 审计日志记录 `client_id`
- [ ] SDK 可通过 npm 安装并正常使用
- [ ] 所有 API 有完整测试覆盖
- [ ] 开发者文档更新

### 测试场景

1. **正向流程**: 第三方应用完成手机/邮箱登录
2. **MFA 流程**: 登录后触发 MFA 验证
3. **Token 刷新**: 使用 refresh_token 获取新令牌
4. **错误处理**: 无效 client_id/secret 返回正确错误
5. **速率限制**: 触发限流后正确拒绝请求

---

## 📎 附录

### A. 参考资料

- [OAuth 2.0 RFC 6749](https://datatracker.ietf.org/doc/html/rfc6749)
- [OpenID Connect Core](https://openid.net/specs/openid-connect-core-1_0.html)
- [Auth0 Architecture](https://auth0.com/docs/get-started/architecture-scenarios)

### B. 相关文件

- [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md) - 现有开发者文档
- [INTEGRATION.md](./INTEGRATION.md) - 集成快速入门

---

> **下一步**: 确认此计划后，开始 Phase 1 实施
