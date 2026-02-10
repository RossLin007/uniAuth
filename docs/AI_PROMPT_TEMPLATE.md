# UniAuth 接入提示词模板

> 将以下提示词复制给任何 AI coding agent，它会自动读取 SDK 中的文档并完成接入。

---

## 提示词 A：Confidential Client（后端代理 SSO，推荐）

```
请为本项目接入 UniAuth SSO 统一登录。

## 接入文档
详细的接入文档在 node_modules/@55387.ai/uniauth-server/INTEGRATION.md，请先完整阅读该文档再开始开发。

## 需要安装的依赖
- 前端不需要安装 SDK（仅需一个按钮和状态检查）
- 后端：npm install @55387.ai/uniauth-server

## 需要实现的内容

### 后端（Confidential Client 模式）
1. 初始化 UniAuthServer（读取 UNIAUTH_URL, UNIAUTH_CLIENT_ID, UNIAUTH_CLIENT_SECRET 环境变量）
2. 实现以下路由：
   - GET /api/auth/login — 生成授权 URL 并重定向到 UniAuth SSO
   - GET /api/auth/callback — 用授权码 + client_secret 交换 Token，存入 httpOnly Cookie
   - GET /api/auth/status — 验证 Cookie 中的 Token，返回登录状态和用户信息
   - POST /api/auth/logout — 清除 Cookie
3. 使用 uniauth.middleware() 或 uniauth.honoMiddleware() 保护需要认证的 API 路由

### 前端
1. 登录按钮：点击后 window.location.href = '/api/auth/login'
2. 登录状态检查：请求 /api/auth/status（携带 credentials: 'include'）
3. 登出：POST /api/auth/logout

### 环境变量
在 .env 中添加：
UNIAUTH_URL=https://sso.55387.xyz
UNIAUTH_CLIENT_ID=（待填写）
UNIAUTH_CLIENT_SECRET=（待填写）

## 技术要求
- 使用 state 参数防止 CSRF
- Token 存储在 httpOnly + Secure + SameSite=Lax 的 Cookie 中
- 所有认证相关端点需要正确的错误处理
- 需要编写相应的单元测试
```

---

## 提示词 B：Public Client（前端 SDK 直接处理）

```
请为本项目接入 UniAuth SSO 统一登录。

## 接入文档
详细的接入文档在 node_modules/@55387.ai/uniauth-client/INTEGRATION.md，请先完整阅读该文档再开始开发。

## 需要安装的依赖
- 前端：npm install @55387.ai/uniauth-client
- 后端：npm install @55387.ai/uniauth-server

## 需要实现的内容

### 前端（使用 Client SDK SSO 模式）
1. 初始化 UniAuthClient
2. 调用 auth.configureSso() 配置 SSO（clientId, redirectUri, scope）
3. 登录按钮调用 auth.loginWithSSO({ usePKCE: true })
4. 创建 /callback 回调页面，调用 auth.handleSSOCallback() 处理回调
5. 使用 auth.isAuthenticated() 检查登录状态
6. 使用 auth.getAccessToken() 获取 Token（自动刷新）
7. 使用 auth.onAuthStateChange() 监听状态变化
8. 创建 AuthContext / useAuth composable 封装认证逻辑

### 后端（仅需验证 Token）
1. 初始化 UniAuthServer
2. 使用中间件保护 API 路由：app.use('/api/*', uniauth.middleware())
3. 通过 req.user 或 c.get('user') 获取用户信息

### 环境变量
前端 .env：
VITE_UNIAUTH_URL=https://sso.55387.xyz
VITE_UNIAUTH_CLIENT_ID=（待填写）

后端 .env：
UNIAUTH_URL=https://sso.55387.xyz
UNIAUTH_CLIENT_ID=（待填写）
UNIAUTH_CLIENT_SECRET=（待填写）

## 技术要求
- 前端必须使用 PKCE
- 需要实现完整的 AuthContext/Provider 模式
- 需要处理 Token 过期和自动刷新
- 需要编写相应的单元测试
```

---

## 提示词 C：嵌入式登录（自建登录页面）

```
请为本项目接入 UniAuth 嵌入式登录（使用自建登录表单）。

## 接入文档
详细的接入文档在 node_modules/@55387.ai/uniauth-client/INTEGRATION.md，请先完整阅读该文档再开始开发。

## 需要安装的依赖
- 前端：npm install @55387.ai/uniauth-client
- 后端：npm install @55387.ai/uniauth-server

## 需要实现的内容

### 前端（使用 Client SDK Embedded 模式）
1. 初始化 UniAuthClient({ baseUrl: 'https://sso.55387.xyz' })
2. 创建登录页面，支持以下登录方式：
   - 手机号 + 验证码：auth.sendCode() → auth.loginWithCode()
   - 邮箱 + 验证码：auth.sendEmailCode() → auth.loginWithEmailCode()
   - 邮箱 + 密码：auth.loginWithEmail()
3. 处理 MFA：检查 result.mfa_required，如果需要则显示 MFA 输入框
4. 创建 AuthContext/Provider 管理全局认证状态
5. 使用 auth.onAuthStateChange() 监听状态
6. 实现登出：auth.logout()

### 后端
1. 初始化 UniAuthServer
2. 使用中间件保护 API：app.use('/api/*', uniauth.middleware())
3. 通过 req.user 获取用户信息

### 环境变量
前端 .env：
VITE_UNIAUTH_URL=https://sso.55387.xyz

后端 .env：
UNIAUTH_URL=https://sso.55387.xyz
UNIAUTH_CLIENT_ID=（待填写）
UNIAUTH_CLIENT_SECRET=（待填写）

## 技术要求
- 登录表单需要有验证码倒计时（60秒）
- 不能使用 alert/confirm，使用 Toast 通知
- 需要支持中英文双语
- 需要编写相应的单元测试
```

---

## 使用方法

1. 确保项目已安装对应 SDK（`npm install @55387.ai/uniauth-client` 或 `@55387.ai/uniauth-server`）
2. 根据你的需求选择提示词 A / B / C
3. 复制提示词内容发送给 AI agent
4. AI agent 会先读取 `node_modules` 中的 `INTEGRATION.md` 获取完整 API 参考，然后完成实现
