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

#### 3.3.1 功能列表

- [ ] 开发者控制台 UI (应用 CRUD)
- [ ] 应用 Secret 轮换
- [ ] Webhooks 事件通知
- [ ] IP 黑/白名单
- [ ] OIDC 完整实现 (Discovery, JWKS 端点)

---

### Phase 4: 高级功能 (待规划)

- [ ] 自定义 Claims
- [ ] 登录流程 Hooks
- [ ] 品牌自定义 (登录页主题)
- [ ] SAML 2.0 (企业 SSO)

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
