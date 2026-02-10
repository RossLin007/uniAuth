UniAuth 集成反馈与改进建议
基于我们在集成 UniAuth (Client v1.2.2, Server v1.2.1) 过程中遇到的阻碍，我们整理了以下建议，希望能帮助 UniAuth 团队优化产品体验。

1. 核心流程与文档误导 (Critical)
问题描述： 我们在控制台创建了 WEB (Confidential Client) 类型的应用。

现状：官方文档和 
@55387.ai/uniauth-client
 SDK 默认引导我们在前端（浏览器）直接调用 Token 交换接口。
后果：由于 WEB 类型应用的 client_secret 不能暴露在前端，且 UniAuth 对此类应用的 Token 端点实施了 CORS 限制，导致前端请求直接被浏览器拦截（CORS Error），且报错信息 (invalid_client 或 Network Error) 极具误导性，让我们误以为是配置错误调试了很久。
最终方案：我们被迫完全重写认证流，实现了一个 "Backend-for-Frontend (BFF)" 代理，由我们自己的后端去与 UniAuth 进行 Token 交互。
改进建议：

文档明确区分：在文档显著位置强调：“如果您的应用类型是 WEB (服务端应用)，严禁在前端直接获取 Token。请务必使用后端 API 代理模式，或使用 SPA/Native 类型。”
SDK 防呆设计：前端 SDK 如果检测到配置了 client_secret（虽然本就不该在前端配）或者响应了具体的 CORS 错误，能在控制台打印更明确的提示：“WEB Application type requires server-side token exchange.”
2. API 路径版本混乱 (API Consistency)
问题描述：

SDK 默认行为：
uniauth-client
 似乎倾向于使用 /oauth/authorize 这种标准风格路径。
实际服务端：实际生效的路径隐藏在 /api/v1/oauth2/authorize。
后果：直接使用 Base URL (https://sso.55387.xyz) 会导致 404 Not Found。我们需要手动拼接 /api/v1/... 才能调通。
改进建议：

统一规范：要么服务端支持标准的 /oauth/authorize 别名（推荐，符合 OAuth2 惯例），要么 SDK 的 baseUrl 配置项应该自动追加 /api/v1，或者文档中明确 Base URL 必须包含 /api/v1。
3. 服务端 SDK 验证接口失效 (Server SDK Bug)
问题描述： 使用 
@55387.ai/uniauth-server
 (v1.2.1) 的 verifyToken() 方法时：

现状：SDK 内部硬编码请求 POST /api/v1/auth/verify。
后果：该接口在生产环境返回 404 Not Found，导致合法的 Token 无法通过 SDK 验证。
临时修复：我们要么手动 Patch SDK，要么放弃使用 verifyToken，改为手动调用 /api/v1/user/me 来验证 Token 有效性（利用其 401/200 状态码）。
改进建议：

紧急修复 SDK：请发布新版 Server SDK，将验证端点修正为存在的接口（如 /api/v1/oauth2/introspect 或 /api/v1/user/me）。
4. 错误信息优化 (Developer Experience)
问题描述： 当 redirect_uri 不匹配或者 CORS 被拒时，返回的错误往往是通用的 invalid_client 或者直接网络错误。

改进建议：

详细错误说明：在开发环境下（或通过特殊 Header），返回更具体的错误原因。例如：“Redirect URI mismatch: expected X, got Y” 或 “CORS policy: WEB applications cannot exchange tokens from browser origins.”
一句话总结： UniAuth 的核心功能是强大的，但在 WEB 应用的接入指引 和 SDK 与服务端接口的一致性 上存在断层，极大增加了开发者的接入成本。希望采纳改进！

---

## 已解决 (Resolved) — 2026-02-10

### ✅ 问题 2: API 路径版本混乱
- **修复**: OIDC Discovery 中 `authorization_endpoint` 已修正为 `${apiBase}/oauth2/authorize`（含 `/api/v1` 前缀）
- **文件**: `oidc.routes.ts` L38
- **文档**: `AI_INTEGRATION_GUIDE.md`、`INTEGRATION.md` 中的 Passport 示例 URL、OIDC Discovery 示例均已同步更新

### ✅ 问题 3: 服务端 SDK 验证接口失效 (404)
- **修复**: 实现了 `POST /api/v1/auth/verify` 端点，使用 `X-App-Key` + `X-App-Secret` 认证
- **文件**: `auth.routes.ts` — 新增 120 行 verify 路由
- **SDK 增强**: `@55387.ai/uniauth-server` v1.2.2 的 `verifyToken()` 现在具备三级降级链：
  1. `/api/v1/auth/verify` (首选)
  2. `/api/v1/oauth2/introspect` (降级)
  3. 本地 JWT 验证 (最后手段，如配置了 `jwtPublicKey`)

### ✅ 问题 4: 错误信息优化
- **修复**: OAuth2 Token 端点错误新增 `error_hint` 字段，含具体调试建议
- **示例**: `invalid_client` 错误现在返回 `"error_hint": "Verify: (1) client_id matches Developer Console, (2) client_secret is correct, (3) for WEB (Confidential) apps, exchange tokens from your backend, not the browser"`

### 📝 问题 1: 文档误导 — 部分改善
- **已做**: 文档已更新明确 `/auth/verify` 需要 App 凭证 (X-App-Key + X-App-Secret)
- **待做**: SDK 前端检测 Confidential Client 的防呆设计 (未来版本)