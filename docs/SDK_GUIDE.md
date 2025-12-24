# UniAuth SDK User Guide / SDK 使用指南

UniAuth SDK (`@uniauth/sdk`) provides a simple and type-safe way to integrate UniAuth into your Node.js applications. It supports both **Trusted Client (Embedded Login)** and standard **OAuth 2.0** flows.

UniAuth SDK 为您的 Node.js 应用提供了简单且类型安全的 UniAuth 集成方式，支持**受信任客户端（嵌入式登录）**和标准 **OAuth 2.0** 流程。

## Installation / 安装

```bash
npm install @uniauth/sdk
# or
pnpm add @uniauth/sdk
# or
yarn add @uniauth/sdk
```

## Quick Start / 快速开始

Initialize the client with your credentials:

初始化客户端：

```typescript
import { UniAuthClient } from '@uniauth/sdk';

const client = new UniAuthClient({
  clientId: 'your_client_id',
  clientSecret: 'your_client_secret',
  baseUrl: 'https://auth.yourdomain.com' // Optional, defaults to official UniAuth server
});
```

---

## Embedded Login / 嵌入式登录

Embedded login allows you to build your own login UI and authenticate directly with UniAuth API.
**Note**: This requires your application to be configured with `trusted_client` grant type.

嵌入式登录允许您构建自己的登录界面，并直接通过 UniAuth API 进行认证。
**注意**：这需要您的应用配置了 `trusted_client` 授权模式。

### 1. Phone + SMS Login / 手机号验证码登录

```typescript
// Step 1: Send Verification Code
const sendResult = await client.sendPhoneCode('+8613800000000');
if (sendResult.success) {
  console.log('Code sent, expires in:', sendResult.expires_in);
}

// Step 2: Login with Code
const loginResult = await client.loginWithPhoneCode('+8613800000000', '123456');
if (loginResult.success) {
  console.log('Logged in user:', loginResult.user);
  console.log('Access Token:', loginResult.access_token);
}
```

### 2. Email + Code Login / 邮箱验证码登录 (Passwordless)

```typescript
// Step 1: Send Code
await client.sendEmailCode('user@example.com');

// Step 2: Login
const result = await client.loginWithEmailCode('user@example.com', '123456');
```

### 3. Email + Password Login / 邮箱密码登录

```typescript
const result = await client.loginWithEmailPassword('user@example.com', 'your_password');
```

### 4. Handling MFA / 处理 MFA 二次验证

If a user has MFA enabled, the login method will return `mfa_required: true`.

如果用户开启了 MFA，登录方法将返回 `mfa_required: true`。

```typescript
const result = await client.loginWithEmailPassword('user@example.com', 'password');

if (result.success && result.data?.mfa_required) {
  // 1. Prompt user for MFA code (e.g., from Authenticator App)
  const mfaCode = '123456'; 
  const mfaToken = result.data.mfa_token!;
  
  // 2. Complete Verification
  const mfaResult = await client.verifyMFA(mfaToken, mfaCode);
  
  if (mfaResult.success) {
    console.log('MFA Verified, Token:', mfaResult.access_token);
  }
}
```

### 5. Refresh Token / 刷新令牌

```typescript
const result = await client.refreshToken('your_refresh_token');
if (result.success) {
  console.log('New Access Token:', result.access_token);
}
```

---

## OAuth 2.0 Helpers / OAuth 2.0 辅助方法

Helper methods for standard OAuth 2.0 flows (e.g., for Web Server Apps).

用于标准 OAuth 2.0 流程的辅助方法（例如用于 Web 服务端应用）。

```typescript
// 1. Generate Authorization URL
const authUrl = client.getAuthorizeUrl(
  'https://your-app.com/callback', 
  'openid profile email', 
  'random_state_string'
);
// Redirect user to authUrl...

// 2. Exchange Code for Token (in callback handler)
const tokenResult = await client.exchangeAuthCode('received_code', 'https://your-app.com/callback');
```

## M2M Authentication / 机器对机器认证

For backend services or daemons to authenticate without user interaction (using Client Credentials flow).

适用于后端服务或守护进程在无用户交互的情况下进行认证（使用客户端凭证模式）。

```typescript
// Login with Client Credentials
const result = await client.loginWithClientCredentials('scope1 scope2');

if (result.success) {
  console.log('Access Token:', result.access_token);
}
```

## Token Introspection / 令牌内省

Validate and retrieve metadata for an access token or refresh token.

验证并获取访问令牌或刷新令牌的元数据。

```typescript
const tokenInfo = await client.introspectToken('some_access_token');

if (tokenInfo.active) {
  console.log('Token is active');
  console.log('Client ID:', tokenInfo.client_id);
  console.log('Scopes:', tokenInfo.scope);
} else {
  console.log('Token is invalid or expired');
}
```

## Error Handling / 错误处理

All methods return a consistent result object. You should check `success` field.

所有方法返回一致的结果对象，请检查 `success` 字段。

```typescript
const result = await client.loginWithPhoneCode(...);

if (!result.success) {
  console.error('Login failed:', result.message);
  // Detailed error code if available
  console.error('Error Code:', result.data?.error?.code); 
}
```
