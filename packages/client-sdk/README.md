# @55387.ai/uniauth-client

UniAuth 前端 SDK，支持手机、邮箱、社交登录和跨域 SSO。

## 安装

```bash
npm install @55387.ai/uniauth-client
# or
pnpm add @55387.ai/uniauth-client
```

## 快速开始

```typescript
import { UniAuthClient } from '@55387.ai/uniauth-client';

const auth = new UniAuthClient({
  baseUrl: 'https://sso.55387.xyz',
});

// 发送验证码
await auth.sendCode('+8613800138000');

// 验证码登录
const result = await auth.loginWithCode('+8613800138000', '123456');

// 检查登录状态
if (auth.isAuthenticated()) {
  const user = await auth.getCurrentUser();
  console.log('已登录:', user);
}
```

## SSO 跨域登录

```typescript
// 配置 SSO
auth.configureSso({
  ssoUrl: 'https://sso.55387.xyz',
  clientId: 'my-app',
  redirectUri: 'https://my-app.com/auth/callback',
});

// 发起 SSO 登录
auth.loginWithSSO();

// 在回调页面处理
if (auth.isSSOCallback()) {
  const result = await auth.handleSSOCallback();
  if (result) {
    navigate('/dashboard');
  }
}
```

## MFA 多因素认证

```typescript
const result = await auth.loginWithCode(phone, code);

if (result.mfa_required) {
  const mfaCode = prompt('请输入验证器应用中的验证码:');
  const finalResult = await auth.verifyMFA(result.mfa_token!, mfaCode);
}
```

## 社交登录

```typescript
// 获取可用的 OAuth 提供商
const providers = await auth.getOAuthProviders();

// 发起社交登录
auth.startSocialLogin('google');
```

## 认证状态监听

```typescript
const unsubscribe = auth.onAuthStateChange((user, isAuthenticated) => {
  if (isAuthenticated) {
    console.log('用户已登录:', user);
  } else {
    console.log('用户已登出');
  }
});

// 取消监听
unsubscribe();
```

## API 参考

### 初始化选项

```typescript
interface UniAuthConfig {
  baseUrl: string;           // API 地址
  appKey?: string;           // 应用密钥
  clientId?: string;         // OAuth 客户端 ID
  storage?: 'localStorage' | 'sessionStorage' | 'memory';
  onTokenRefresh?: (tokens) => void;
  onAuthError?: (error) => void;
  enableRetry?: boolean;     // 启用重试 (默认 true)
  timeout?: number;          // 请求超时 (默认 30000ms)
}
```

### 核心方法

| 方法 | 说明 |
|------|------|
| `sendCode(phone, type?)` | 发送手机验证码 |
| `sendEmailCode(email, type?)` | 发送邮箱验证码 |
| `loginWithCode(phone, code)` | 手机验证码登录 |
| `loginWithEmailCode(email, code)` | 邮箱验证码登录 |
| `loginWithEmail(email, password)` | 邮箱密码登录 |
| `registerWithEmail(email, password, nickname?)` | 邮箱注册 |
| `verifyMFA(mfaToken, code)` | MFA 验证 |
| `getCurrentUser()` | 获取当前用户 |
| `updateProfile(updates)` | 更新用户资料 |
| `logout()` | 登出 |
| `logoutAll()` | 全设备登出 |

### SSO 方法

| 方法 | 说明 |
|------|------|
| `configureSso(config)` | 配置 SSO |
| `loginWithSSO(options?)` | 发起 SSO 登录 |
| `isSSOCallback()` | 检测是否为 SSO 回调 |
| `handleSSOCallback()` | 处理 SSO 回调 |

### 社交登录方法

| 方法 | 说明 |
|------|------|
| `getOAuthProviders()` | 获取 OAuth 提供商列表 |
| `startSocialLogin(provider, redirectUri?)` | 发起社交登录 |

### 状态方法

| 方法 | 说明 |
|------|------|
| `isAuthenticated()` | 检查是否已登录 |
| `isTokenValid()` | 检查 Token 是否有效 |
| `getAccessToken()` | 获取 Token (异步，自动刷新) |
| `getAccessTokenSync()` | 获取 Token (同步) |
| `getCachedUser()` | 获取缓存的用户信息 |
| `onAuthStateChange(callback)` | 监听认证状态变更 |

## 错误处理

```typescript
import { UniAuthError, AuthErrorCode } from '@55387.ai/uniauth-client';

try {
  await auth.loginWithCode(phone, code);
} catch (error) {
  if (error instanceof UniAuthError) {
    switch (error.code) {
      case AuthErrorCode.MFA_REQUIRED:
        // 需要 MFA 验证
        break;
      case AuthErrorCode.VERIFY_FAILED:
        // 验证码错误
        break;
      default:
        console.error(error.message);
    }
  }
}
```

## License

MIT
