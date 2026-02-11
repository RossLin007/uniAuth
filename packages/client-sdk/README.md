# @55387.ai/uniauth-client

> UniAuth Frontend SDK — Phone, Email, Social & SSO login for browser apps.
>
> UniAuth 前端 SDK — 支持手机、邮箱、社交登录和跨域 SSO。

**Version / 版本:** 1.2.2

## Install / 安装

```bash
npm install @55387.ai/uniauth-client
# or / 或
pnpm add @55387.ai/uniauth-client
```

## Quick Start / 快速开始

```typescript
import { UniAuthClient } from '@55387.ai/uniauth-client';

const auth = new UniAuthClient({
  baseUrl: 'https://sso.55387.xyz',
});

// Phone login / 手机登录
await auth.sendCode('+8613800138000');
const result = await auth.loginWithCode('+8613800138000', '123456');

// Email login / 邮箱登录
const result = await auth.loginWithEmail('user@example.com', 'password');

// Check auth / 检查状态
if (auth.isAuthenticated()) {
  const user = await auth.getCurrentUser();
}
```

## Login Methods / 登录方式

### 📱 Phone / 手机号

```typescript
await auth.sendCode('+8613800138000');
const result = await auth.loginWithCode('+8613800138000', '123456');
```

### 📧 Email / 邮箱

```typescript
// Password / 密码登录
await auth.loginWithEmail('user@example.com', 'password');

// Passwordless / 无密码
await auth.sendEmailCode('user@example.com');
await auth.loginWithEmailCode('user@example.com', '123456');

// Register / 注册
await auth.registerWithEmail('user@example.com', 'password', 'Nickname');
```

### 🌐 Social Login / 社交登录

```typescript
const providers = await auth.getOAuthProviders(); // ['google', 'github', 'wechat']
auth.startSocialLogin('google');
```

### 🔐 SSO / 单点登录

```typescript
// ⚠️ Must call configureSso() before using loginWithSSO()
// ⚠️ 使用 loginWithSSO() 前必须调用 configureSso()

// Configure / 配置
auth.configureSso({
  ssoUrl: 'https://sso.55387.xyz',
  clientId: 'ua_xxxxxxxxxxxx',
  redirectUri: window.location.origin + '/callback',
  scope: 'openid profile email phone',
});

// Login / 登录
auth.loginWithSSO();                  // Basic
auth.loginWithSSO({ usePKCE: true }); // Recommended for SPAs

// Callback page / 回调页处理
if (auth.isSSOCallback()) {
  const result = await auth.handleSSOCallback();
  // result: { access_token, refresh_token?, token_type, id_token? }
}
```

> ⚠️ **Confidential Clients** must exchange tokens on the backend. See [AI Integration Guide](../../docs/AI_INTEGRATION_GUIDE.md#2b-backend-proxy-confidential-client).
>
> ⚠️ **机密客户端** 需在后端完成 Token 交换，参见 [集成指南](../../docs/AI_INTEGRATION_GUIDE.md#2b-backend-proxy-confidential-client)。

### 🔑 MFA / 多因素认证

```typescript
const result = await auth.loginWithCode(phone, code);
if (result.mfa_required) {
  await auth.verifyMFA(result.mfa_token!, '123456');
}
```

## API Reference / API 参考

### Config / 配置

```typescript
interface UniAuthConfig {
  baseUrl: string;           // API base URL
  appKey?: string;           // App key (optional)
  clientId?: string;         // OAuth client ID
  storage?: 'localStorage' | 'sessionStorage' | 'memory';
  onTokenRefresh?: (tokens) => void;
  onAuthError?: (error) => void;
  enableRetry?: boolean;     // Default: true
  timeout?: number;          // Default: 30000
}
```

### Methods / 方法

| Method | Description / 说明 |
|--------|-----------|
| `sendCode(phone, type?)` | Send SMS code / 发送短信验证码 |
| `sendEmailCode(email, type?)` | Send email code / 发送邮箱验证码 |
| `loginWithCode(phone, code)` | Phone code login / 手机验证码登录 |
| `loginWithEmailCode(email, code)` | Email code login / 邮箱验证码登录 |
| `loginWithEmail(email, password)` | Email password login / 邮箱密码登录 |
| `registerWithEmail(email, password, nickname?)` | Email register / 邮箱注册 |
| `verifyMFA(mfaToken, code)` | MFA verification / MFA 验证 |
| `getCurrentUser()` | Get current user / 获取当前用户 |
| `updateProfile(updates)` | Update profile / 更新资料 |
| `isAuthenticated()` | Check login status / 检查登录状态 |
| `isTokenValid()` | Check token validity / 检查令牌有效性 |
| `getAccessToken()` | Get token (auto-refresh) / 获取令牌(自动刷新) |
| `getAccessTokenSync()` | Get token (sync) / 获取令牌(同步) |
| `getCachedUser()` | Get cached user / 获取缓存用户 |
| `onAuthStateChange(cb)` | Auth state listener / 认证状态监听 |
| `logout()` | Logout / 登出 |
| `logoutAll()` | Logout all devices / 全设备登出 |
| `configureSso(config)` | Configure SSO / 配置 SSO |
| `loginWithSSO(options?)` | Start SSO login / 发起 SSO 登录 |
| `isSSOCallback()` | Detect SSO callback / 检测 SSO 回调 |
| `handleSSOCallback()` | Handle SSO callback / 处理 SSO 回调 |
| `getOAuthProviders()` | List OAuth providers / 获取 OAuth 提供商 |
| `startSocialLogin(provider)` | Start social login / 发起社交登录 |

## Error Handling / 错误处理

```typescript
import { UniAuthError, AuthErrorCode } from '@55387.ai/uniauth-client';

try {
  await auth.loginWithCode(phone, code);
} catch (error) {
  if (error instanceof UniAuthError) {
    switch (error.code) {
      case AuthErrorCode.MFA_REQUIRED:   // Need MFA / 需要 MFA
      case AuthErrorCode.VERIFY_FAILED:  // Wrong code / 验证码错误
      case AuthErrorCode.RATE_LIMITED:    // Rate limited / 频率限制
    }
  }
}
```

## License

MIT
