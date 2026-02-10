以下是给你的 Project AI Agent 的最终集成指令。请复制以下内容发送给它：

---

# UniAuth 集成任务 (React SDK 版)

请将项目中的手动 UniAuth 集成逻辑替换为官方发布的 React SDK (`@55387.ai/uniauth-react`)。

## 1. 安装依赖

```bash
npm install @55387.ai/uniauth-react @55387.ai/uniauth-client
```

## 2. 重构 AuthContext

请废弃原有的 `src/contexts/AuthContext.tsx` 手动实现，改为使用 SDK 提供的 `UniAuthProvider`。

### 修改 `src/main.tsx` (或 `App.tsx` 入口)

```tsx
import { UniAuthProvider } from '@55387.ai/uniauth-react';

const authConfig = {
  baseUrl: import.meta.env.VITE_UNIAUTH_BASE_URL || 'https://sso.55387.xyz',
  clientId: import.meta.env.VITE_UNIAUTH_CLIENT_ID, // 确保 .env 已配置
  redirectUri: window.location.origin + '/callback', // 必须与控制台一致
  sso: {
    ssoUrl: 'https://sso.55387.xyz', // SSO 服务器地址
    usePKCE: true,
  }
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <UniAuthProvider config={authConfig} loadingComponent={<div>Loading Auth...</div>}>
    <App />
  </UniAuthProvider>
);
```

### 修改组件逻辑 `src/components/SomeComponent.tsx`

使用 `useUniAuth` 钩子替换原来的 Context 引用：

```tsx
import { useUniAuth } from '@55387.ai/uniauth-react';

const { user, login, logout, getToken, isAuthenticated } = useUniAuth();

// 获取 Token 调用后端 API
const callApi = () => {
  const token = getToken();
  fetch('/api/endpoint', {
     headers: { Authorization: `Bearer ${token}` }
  });
};
```

## 3. 解决跨域 (CORS) 问题

如果登录后遇到 API 请求 CORS 错误：

1.  **方案 A (服务器配置 - 已生效)**：确认 SSO 后端已配置 `CORS_ORIGINS` 包含你的前端域名。
2.  **方案 B (Nginx 反代 - 备选)**：
    修改 Nginx 配置，将 `/uni-auth-api/` 转发到 SSO 服务器，并在前端 Config 中设置 `baseUrl: '/uni-auth-api'`.

## 4. 验证清单

- [ ] 点击登录跳转 SSO 正常
- [ ] 回调 `/callback` 自动处理并获取 Token
- [ ] `getToken()` 能获取到 Access Token
- [ ] 后端 API 调用带上了 `Authorization` 头
