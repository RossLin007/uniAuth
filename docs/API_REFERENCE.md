# UniAuth API Reference / API 参考

> Base URL: `https://sso.55387.xyz`
>
> All endpoints are prefixed with `/api/v1` unless noted.

---

## Authentication / 认证接口

### Phone Login / 手机登录

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/v1/auth/phone/send-code` | ❌ | Send SMS verification code / 发送短信验证码 |
| POST | `/api/v1/auth/phone/verify` | ❌ | Verify code and login / 验证并登录 |

<details>
<summary><strong>POST /api/v1/auth/phone/send-code</strong></summary>

**Request:**
```json
{
  "phone": "+8613800138000"
}
```
Phone must be E.164 format: `+<country_code><number>`.

**Response (200):**
```json
{
  "success": true,
  "data": { "expires_in": 300, "retry_after": 60 },
  "message": "验证码已发送"
}
```
</details>

<details>
<summary><strong>POST /api/v1/auth/phone/verify</strong></summary>

**Request:**
```json
{
  "phone": "+8613800138000",
  "code": "123456"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "user": { "id": "uuid", "phone": "+861380013800", "nickname": "..." },
    "access_token": "eyJ...",
    "refresh_token": "xxx",
    "expires_in": 3600,
    "is_new_user": false
  }
}

// Or IF MFA is enabled for user:
{
  "success": true,
  "data": {
    "user": { "id": "uuid", "phone": "..." },
    "mfa_required": true,
    "mfa_token": "mfa_xyz..."
  }
}
```
If `mfa_required: true`, see MFA section.
</details>

---

### Email Login / 邮箱登录

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/v1/auth/email/register` | ❌ | Register with email + password / 邮箱注册 |
| POST | `/api/v1/auth/email/login` | ❌ | Login with email + password / 邮箱密码登录 |
| POST | `/api/v1/auth/email/send-code` | ❌ | Send email verification code / 发送邮箱验证码 |
| POST | `/api/v1/auth/email/verify-code` | ❌ | Verify email code (no login) / 验证邮箱验证码 |
| POST | `/api/v1/auth/email/verify` | ❌ | Verify code + login (passwordless) / 验证码登录 |

<details>
<summary><strong>POST /api/v1/auth/email/register</strong></summary>

**Request:**
```json
{
  "email": "user@example.com",
  "password": "StrongPass123!",
  "nickname": "John"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "user": { "id": "uuid", "email": "user@example.com" },
    "access_token": "eyJ...",
    "refresh_token": "xxx",
    "expires_in": 3600
  }
}
```
</details>

<details>
<summary><strong>POST /api/v1/auth/email/login</strong></summary>

**Request:**
```json
{
  "email": "user@example.com",
  "password": "StrongPass123!",
  "remember_me": true
}
```

**Response (200):** Same format as register.
</details>

<details>
<summary><strong>POST /api/v1/auth/email/verify</strong> (Passwordless Login)</summary>

**Step 1:** Call `POST /api/v1/auth/email/send-code` with `{ "email": "..." }`

**Step 2:**
```json
{
  "email": "user@example.com",
  "code": "123456"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "user": { "id": "uuid", "email": "user@example.com" },
    "access_token": "eyJ...",
    "refresh_token": "xxx"
  }
}
```
Auto-creates user if not exists.
</details>

---

### Social Login / 社交登录

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/v1/auth/oauth/providers` | ❌ | List available providers / 获取可用提供商 |
| GET | `/api/v1/auth/oauth/:provider/authorize` | ❌ | Start OAuth redirect / 发起 OAuth 跳转 |
| POST | `/api/v1/auth/oauth/:provider/callback` | ❌ | OAuth callback / OAuth 回调 |

Supported providers: `google`, `github`, `wechat`

---

### MFA / 多因素认证

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/v1/auth/mfa/verify-login` | ❌ | Verify MFA during login / 登录时验证 MFA |

<details>
<summary><strong>POST /api/v1/auth/mfa/verify-login</strong></summary>

**Request:**
```json
{
  "mfa_token": "mfa_xyz...",
  "code": "123456" 
}
```
* `code`: 6-digit TOTP code OR 8-10 char recovery code.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "user": { "id": "uuid", "email": "..." },
    "access_token": "eyJ...",
    "refresh_token": "xxx",
    "expires_in": 3600
  }
}
```
</details>

---

### Token Management / 令牌管理

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/v1/auth/refresh` | ❌ | Refresh access token / 刷新访问令牌 |
| POST | `/api/v1/auth/verify` | 🔑 App Key | Verify token (server-to-server) / 服务端验证令牌 |
| POST | `/api/v1/auth/logout` | 🔒 Bearer | Logout current session / 登出当前会话 |
| POST | `/api/v1/auth/logout-all` | 🔒 Bearer | Logout all sessions / 登出所有会话 |

<details>
<summary><strong>POST /api/v1/auth/refresh</strong></summary>

**Request:**
```json
{
  "refresh_token": "xxx"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "access_token": "eyJ...",
    "refresh_token": "new_refresh_token",
    "expires_in": 3600
  }
}
```
</details>

<details>
<summary><strong>POST /api/v1/auth/verify</strong> (Server-to-Server)</summary>

**Headers:**
```
X-App-Key: your_client_id
X-App-Secret: your_client_secret
```

**Request:**
```json
{
  "token": "eyJ..."
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "sub": "user-uuid",
    "email": "user@example.com",
    "phone": "+8613800138000",
    "exp": 1700000000,
    "iat": 1699996400,
    "scope": "openid profile email"
  }
}
```
</details>

---

## OAuth2 / OAuth2 接口

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/v1/oauth2/authorize` | ❌ | Authorization endpoint / 授权端点 |
| POST | `/api/v1/oauth2/authorize` | 🔒 Bearer | User approves authorization / 用户确认授权 |
| GET | `/api/v1/oauth2/validate` | ❌ | Validate client configuration / 验证客户端配置 |
| POST | `/api/v1/oauth2/token` | ❌ | Token exchange / 令牌交换 |
| POST | `/api/v1/oauth2/introspect` | 🔑 Basic | RFC 7662 Token introspection / 令牌内省 |

<details>
<summary><strong>POST /api/v1/oauth2/token</strong></summary>

**Request (Authorization Code):**
```json
{
  "grant_type": "authorization_code",
  "client_id": "ua_xxxx",
  "client_secret": "secret",
  "code": "auth_code",
  "redirect_uri": "https://myapp.com/callback",
  "code_verifier": "pkce_verifier"
}
```

**Request (Refresh Token):**
```json
{
  "grant_type": "refresh_token",
  "client_id": "ua_xxxx",
  "client_secret": "secret",
  "refresh_token": "xxx"
}
```

**Response (200):**
```json
{
  "access_token": "eyJ...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "xxx",
  "id_token": "eyJ...",
  "scope": "openid profile email"
}
```
</details>

<details>
<summary><strong>POST /api/v1/oauth2/introspect</strong> (RFC 7662)</summary>

**Headers:**
```
Authorization: Basic base64(client_id:client_secret)
```

**Request:**
```json
{
  "token": "eyJ...",
  "token_type_hint": "access_token"
}
```

**Response (200):**
```json
{
  "active": true,
  "sub": "user-uuid",
  "scope": "openid profile",
  "client_id": "ua_xxxx",
  "token_type": "Bearer",
  "exp": 1700000000,
  "iat": 1699996400,
  "iss": "https://sso.55387.xyz"
}
```
</details>

---

## OIDC / OpenID Connect 接口

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/.well-known/openid-configuration` | ❌ | OIDC Discovery / OIDC 发现文档 |
| GET | `/.well-known/jwks.json` | ❌ | JSON Web Key Set / 公钥集 |
| GET | `/api/v1/oauth2/userinfo` | 🔒 Bearer | UserInfo endpoint / 用户信息端点 |

> **Note:** OIDC discovery and JWKS endpoints are at the root level, NOT under `/api/v1`.

---

## User / 用户接口

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/v1/user/me` | 🔒 Bearer | Get current user / 获取当前用户 |
| PATCH | `/api/v1/user/me` | 🔒 Bearer | Update profile / 更新用户资料 |
| GET | `/api/v1/user/sessions` | 🔒 Bearer | List active sessions / 获取活跃会话 |
| DELETE | `/api/v1/user/sessions/:id` | 🔒 Bearer | Revoke a session / 撤销会话 |

---

## Legacy Endpoints / 兼容接口

These endpoints are kept for backward compatibility and redirect internally:

| Method | Endpoint | Redirects To |
|--------|----------|--------------|
| POST | `/api/v1/auth/send-code` | → `/api/v1/auth/phone/send-code` |
| POST | `/api/v1/auth/verify-code` | → `/api/v1/auth/phone/verify` |

---

## Auth Legend / 认证说明

| Symbol | Meaning |
|--------|---------|
| ❌ | No authentication required / 无需认证 |
| 🔒 Bearer | `Authorization: Bearer <access_token>` header |
| 🔑 App Key | `X-App-Key` + `X-App-Secret` headers |
| 🔑 Basic | `Authorization: Basic base64(client_id:client_secret)` |

---

## Standard Error Response / 标准错误格式

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message"
  }
}
```

### Common Error Codes / 常见错误码

| Code | HTTP | Description |
|------|------|-------------|
| `VERIFY_FAILED` | 400 | Wrong verification code / 验证码错误 |
| `LOGIN_FAILED` | 401 | Invalid credentials / 登录凭据无效 |
| `MISSING_CREDENTIALS` | 401 | Missing app key/secret headers / 缺少应用凭据 |
| `INVALID_CREDENTIALS` | 401 | Wrong app key/secret / 应用凭据错误 |
| `TOKEN_EXPIRED` | 401 | Token has expired / 令牌已过期 |
| `INVALID_TOKEN` | 401 | Token is invalid / 令牌无效 |
| `RATE_LIMITED` | 429 | Too many requests / 请求过于频繁 |
| `INTERNAL_ERROR` | 500 | Server error / 服务器内部错误 |
