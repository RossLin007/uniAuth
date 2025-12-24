# UniAuth Developer Guide & API Reference

欢迎使用 UniAuth 开发者文档。UniAuth 是一个标准的 OAuth 2.0 身份提供商 (Identity Provider, IdP)。
本文档将指导您如何将您的第三方应用程序（网站、移动应用、桌面应用）接入 UniAuth 生态系统。

---

## 📚 目录 (Table of Contents)

1. [核心概念 (Core Concepts)](#1-核心概念)
2. [接入前准备 (Prerequisites)](#2-接入前准备)
3. [授权码模式流程 (Authorization Code Flow)](#3-授权码模式流程)
    - [Step 1: 发起授权请求](#step-1-发起授权请求)
    - [Step 2: 接收授权码 (Code)](#step-2-接收授权码-code)
    - [Step 3: 换取访问令牌 (Access Token)](#step-3-换取访问令牌-access-token)
    - [Step 4: 获取用户信息](#step-4-获取用户信息)
4. [嵌入式登录模式 (Embedded Login Mode)](#4-嵌入式登录模式-embedded-login-mode)
5. [API 参考 (API Reference)](#5-api-参考)
6. [错误处理 (Error Handling)](#6-错误处理)
7. [安全最佳实践 (Security Best Practices)](#7-安全最佳实践)

---

## 1. 核心概念

在开始之前，请理解以下术语：

| 术语 | 说明 |
| :--- | :--- |
| **Client (客户端)** | 您的应用程序（及其后端服务器）。 |
| **Resource Owner (资源所有者)** | 使用您的应用并授权其访问数据的用户。 |
| **Authorization Server (认证服务器)** | UniAuth 平台，负责验证用户身份并颁发令牌。 |
| **Client ID** | 应用的唯一公开标识符。 |
| **Client Secret** | 应用的私钥，**必须仅在服务器端保存**，严禁泄露给前端。 |
| **Authorization Code** | 临时凭证，用于换取 Access Token，有效期很短（通常 10 分钟）。 |
| **Access Token** | 访问令牌，用于调用 API 获取用户数据。 |
| **Refresh Token** | 刷新令牌，用于在 Access Token 过期后获取新的令牌，无需用户重新登录。 |

---

## 2. 接入前准备

### 注册应用
您需要在 UniAuth 数据库中创建一个应用记录。
请联系系统管理员或使用提供的脚本生成凭证。

您将获得：
*   **Client ID**: `app_xxxxxxxxxxxx`
*   **Client Secret**: `sk_xxxxxxxxxxxxxxxxxxxxxxxx`
*   **Redirect URI**: 您必须将您的回调地址（如 `http://localhost:3000/api/auth/callback/uniauth`）添加到白名单中。

---

## 3. 授权码模式流程

这是最安全、最常用的 OAuth 2.0 流程，适用于有后端服务器的应用。

### Step 1: 发起授权请求

**场景**: 用户点击您应用上的 "使用 UniAuth 登录" 按钮。
**动作**: 浏览器重定向到 UniAuth 的授权页面。

**URL**: `GET /oauth2/authorize` (前端路由)

**完整示例**:
```http
http://localhost:5173/oauth2/authorize?client_id=YOUR_CLIENT_ID&redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fcallback&response_type=code&scope=profile%20email&state=xyz123
```

**参数说明**:

| 参数 | 必选 | 描述 |
| :--- | :--- | :--- |
| `client_id` | 是 | 您的应用 ID。 |
| `redirect_uri` | 是 | 授权成功后的回调地址，**必须**与注册时完全一致（包括 http/https 和端口）。 |
| `response_type` | 是 | 固定值 `code`。 |
| `scope` | 否 | 请求权限范围，如 `profile` (默认), `email`。 |
| `state` | 建议 | 随机字符串，用于防止 CSRF 攻击。在回调时会原样传回。 |

### Step 2: 接收授权码 (Code)

**场景**: 用户在 UniAuth 页面同意授权。
**动作**: UniAuth 将浏览器重定向回您的 `redirect_uri`。

**URL**:
```
http://localhost:3000/callback?code=AUTH_CODE_HERE&state=xyz123
```

> **注意**: 如果 URL 中包含 `error` 参数（如 `?error=access_denied`），说明用户拒绝了授权或发生了错误。

### Step 3: 换取访问令牌 (Access Token)

**场景**: 您的前端将 `code` 发送给您的**后端服务器**。
**动作**: 您的后端服务器向 UniAuth API 发起请求，用 `code` 换取 `access_token`。

**端点**: `POST https://api.uniauth.com/api/v1/oauth2/token`

**请求头**:
- `Content-Type: application/json` 或 `application/x-www-form-urlencoded`

**请求体 (JSON)**:
```json
{
  "grant_type": "authorization_code",
  "client_id": "YOUR_CLIENT_ID",
  "client_secret": "YOUR_CLIENT_SECRET",
  "code": "AUTH_CODE_RECEIVED_IN_STEP_2",
  "redirect_uri": "YOUR_CALLBACK_URL" // 必须与 Step 1 完全一致
}
```

**响应成功 (200 OK)**:
```json
{
  "access_token": "eyJhbGciOiJIUzI1Ni...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "def50200..."
}
```

### Step 4: 获取用户信息

**场景**: 您的后端拿到 `access_token` 后，查询当前用户是谁。
**动作**: 调用 UserInfo 接口。

**端点**: `GET https://api.uniauth.com/api/v1/oauth2/userinfo`

**请求头**:
- `Authorization: Bearer YOUR_ACCESS_TOKEN`

**响应成功 (200 OK)**:
```json
{
  "sub": "user_uuid_here",
  "name": "User Nickname",
  "email": "user@example.com",
  "email_verified": true,
  "phone_number": "13800138000",
  "phone_number_verified": true,
  "picture": "https://example.com/avatar.png",
  "updated_at": "2024-12-22T05:00:00Z"
}
```

---

---

## 4. 嵌入式登录模式 (Embedded Login Mode)

嵌入式登录允许您在自己的应用程序（如移动 App、SPA）中直接构建登录界面（输入手机号/邮箱和密码），然后调用 UniAuth 的 API 完成认证。这提供了最流畅的用户体验，无需页面跳转。

> **前提条件**: 您的应用通过了 UniAuth 的可信应用审核，并被授予 `trusted_client` 授权模式。

### 推荐集成方式
我们强力推荐使用官方 SDK 进行接入，它封装了所有的 API 调用细节。

📚 **详细指南请参阅**: [SDK 使用指南 (SDK Guide)](./SDK_GUIDE.md)

### HTTP API 概览

如果您无法使用 Node.js SDK，也可以直接调用 HTTP API (Base URL: `https://api.uniauth.com/api/v1`):

**认证要求**: 所有请求必须包含 `X-Client-Id` 和 `X-Client-Secret` 头。

| 功能 | 端点 | 描述 |
| :--- | :--- | :--- |
| **发送手机验证码** | `POST /auth/trusted/phone/send-code` | 向指定手机号发送验证码 |
| **手机验证码登录** | `POST /auth/trusted/phone/verify` | 验证代码并返回 Token |
| **邮箱验证码登录** | `POST /auth/trusted/email/verify` | 验证邮箱代码并返回 Token |
| **MFA 验证** | `POST /auth/trusted/mfa/verify` | 完成 MFA 二次验证 |
| **刷新令牌** | `POST /auth/trusted/token/refresh` | 刷新 Access Token |

---

## 5. API 参考

### `POST /oauth2/token`

除授权码模式外，我们也支持刷新令牌。

**刷新令牌请求**:
```json
{
  "grant_type": "refresh_token",
  "refresh_token": "YOUR_REFRESH_TOKEN",
  "client_id": "YOUR_CLIENT_ID",
  "client_secret": "YOUR_CLIENT_SECRET"
}
```

---

## 6. 错误处理

当 API 调用失败时，会返回 HTTP 4xx 或 5xx 状态码，并包含 JSON 错误信息。

**格式**:
```json
{
  "error": "invalid_request",
  "error_description": "The redirect_uri is missing."
}
```

**常见错误码**:
*   `invalid_request`: 缺少参数或参数格式错误。
*   `invalid_client`: Client ID 或 Secret 错误。
*   `invalid_grant`: Code 无效、过期、已使用，或 Redirect URI 不匹配。
*   `unauthorized_client`: 该应用无权使用此 Grant Type。
*   `access_denied`: 用户或服务器拒绝了请求。

---

## 7. 安全最佳实践

1.  **保护 Client Secret**: 永远不要将 Client Secret 包含在前端代码（React/Vue/iOS/Android）中。它是应用的私钥，只能在安全的后端服务器上使用。
2.  **使用 State 参数**: 始终在 Step 1 生成一个随机的 `state` 并在 Step 2 验证它，以防止 CSRF 攻击。
3.  **HTTPS**: 所有的重定向 URI 和 API 调用都必须使用 HTTPS（本地开发除外）。
4.  **Token 存储**:
    *   在后端，建议将 Token 存储在加密的 Session 或 HttpOnly Cookie 中。
    *   不要在 LocalStorage 中存储 Access Token，以防 XSS 攻击。
5.  **Code 只能用一次**: Authorization Code 是一次性的，使用后即失效。

---

UniAuth Developer Team
