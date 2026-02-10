# @55387.ai/uniauth-react

Official React SDK for UniAuth SSO integration.
UniAuth 官方 React SDK，用于 SSO 集成。

## Features / 功能

- 🔐 **SSO Integration / SSO 集成**: PKCE authorization code flow with auto-callback handling / 自动处理 PKCE 授权码流程
- 🔄 **Reactive State / 响应式状态**: `user`, `isAuthenticated`, `isLoading` hooks
- 🛡️ **TypeScript**: Full type-safe API / 完整类型安全
- 🍪 **Token Management / Token 管理**: Auto token storage & refresh / 自动存储与刷新

## Installation / 安装

```bash
npm install @55387.ai/uniauth-react @55387.ai/uniauth-client
```

## Quick Start / 快速开始

### 1. Configure Provider / 配置 Provider

```tsx
// src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { UniAuthProvider, type UniAuthProviderConfig } from '@55387.ai/uniauth-react';
import App from './App';

const config: UniAuthProviderConfig = {
  baseUrl: import.meta.env.VITE_UNIAUTH_BASE_URL || 'https://sso.55387.xyz',
  clientId: import.meta.env.VITE_UNIAUTH_CLIENT_ID,
  redirectUri: window.location.origin + '/callback',
  sso: {
    ssoUrl: 'https://sso.55387.xyz',
    usePKCE: true,     // Recommended for SPA / 推荐用于单页应用
  }
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <UniAuthProvider config={config} loadingComponent={<div>Loading...</div>}>
      <App />
    </UniAuthProvider>
  </React.StrictMode>
);
```

### 2. Use the Hook / 使用 Hook

```tsx
import { useUniAuth } from '@55387.ai/uniauth-react';

export const LoginButton = () => {
  const { user, isAuthenticated, isLoading, login, logout } = useUniAuth();

  if (isLoading) return <div>Checking session...</div>;

  if (isAuthenticated && user) {
    return (
      <div>
        <img src={user.avatar_url} alt={user.nickname} />
        <span>Welcome, {user.nickname}!</span>
        <button onClick={() => logout()}>Logout</button>
      </div>
    );
  }

  return <button onClick={() => login()}>Login with SSO</button>;
};
```

## API Reference

### `useUniAuth()` Hook

Returns `UniAuthContextType`:

| Property / 属性 | Type / 类型 | Description / 描述 |
|---|---|---|
| `user` | `UserInfo \| null` | Current user info / 当前用户信息 |
| `isAuthenticated` | `boolean` | Auth status / 认证状态 |
| `isLoading` | `boolean` | Loading state / 加载状态 |
| `error` | `Error \| null` | Error state / 错误状态 |
| `login(options?)` | `(opts?) => void` | Start SSO login / 发起 SSO 登录 |
| `logout()` | `() => Promise<void>` | Logout / 退出登录 |
| `updateProfile(updates)` | `(updates) => Promise<void>` | Update profile (nickname, avatar) / 更新资料 |
| `client` | `UniAuthClient` | Raw client instance / 原始客户端实例 |
| `getToken()` | `() => string \| null` | Get access token synchronously / 同步获取 Token |

### `login()` Options

```ts
login({ usePKCE: true, usePopup: false });
```

| Option | Default | Description / 描述 |
|---|---|---|
| `usePKCE` | `true` | Use PKCE flow (recommended for SPA) / 使用 PKCE 流程 |
| `usePopup` | `false` | Open login in popup / 弹窗登录 |

## Advanced Usage / 高级用法

### Getting Access Token / 获取 Access Token

```ts
const { getToken } = useUniAuth();

const callApi = async () => {
  const token = getToken();
  if (!token) return;

  const res = await fetch('/api/protected', {
    headers: { Authorization: `Bearer ${token}` }
  });
};
```

### Update User Profile / 更新用户资料

```ts
const { updateProfile } = useUniAuth();

await updateProfile({ nickname: 'New Name' });
```

### Access Raw Client / 访问原始客户端

```ts
const { client } = useUniAuth();

// Use any UniAuthClient method directly
// 直接使用 UniAuthClient 的任何方法
await client.sendCode('+8613800138000');
const result = await client.loginWithCode('+8613800138000', '123456');
```

## Environment Variables / 环境变量

```bash
VITE_UNIAUTH_BASE_URL=https://sso.55387.xyz
VITE_UNIAUTH_CLIENT_ID=your-client-id
```

## Troubleshooting / 故障排查

### `invalid_client` Error
- Check `clientId` matches Console exactly / 检查 clientId 是否与控制台完全一致
- Check `redirectUri` matches Console exactly / 检查 redirectUri 是否与控制台完全一致

### 404 on Callback / 回调 404
- Ensure React Router handles `/callback` route / 确保路由处理了 `/callback` 路径
- Configure Nginx: `try_files $uri /index.html`

### CORS Errors / 跨域错误
- Add your domain to `CORS_ORIGINS` on SSO Server / 在 SSO 服务器添加域名到 CORS_ORIGINS
- Or configure Nginx proxy: `/api/uni-auth/` → SSO Server / 或配置 Nginx 代理
