# UniAuth Integration Guide / 集成指南

UniAuth 遵循标准 OAuth 2.0 协议（Authorization Code 模式）。第三方应用可以通过以下流程接入统一认证。

## 1. 接入流程 (Integration Flow)

### Step 1: 注册应用 (Register Application)
首先，您需要在 UniAuth 平台注册您的应用，获取以下凭证：
- **Client ID**: 应用的唯一标识
- **Client Secret**: 应用的私钥（请妥善保管，不要在前端暴露）
- **Redirect URI**: 允许的回调域名白名单

### Step 2: 获取授权码 (Get Authorization Code)
引导用户跳转到 UniAuth 的授权页面：

```http
GET https://auth.your-domain.com/oauth2/authorize
  ?client_id=YOUR_CLIENT_ID
  &redirect_uri=YOUR_CALLBACK_URL
  &response_type=code
  &scope=profile email
  &state=RANDOM_STRING
```

- **检查**: UniAuth 会验证用户是否登录。未登录则跳转登录页。
- **授权**: 用户确认授权后，UniAuth 将重定向回 `redirect_uri` 并附带 `code`。

### Step 3: 换取访问令牌 (Exchange Token)
您的**后端服务器**使用 `code` 向 UniAuth 换取 Access Token：

```http
POST https://auth.your-domain.com/oauth2/token
Content-Type: application/json

{
  "client_id": "YOUR_CLIENT_ID",
  "client_secret": "YOUR_CLIENT_SECRET",
  "code": "RECEIVED_CODE",
  "grant_type": "authorization_code",
  "redirect_uri": "YOUR_CALLBACK_URL"
}
```

**响应示例**:
```json
{
  "access_token": "eyJhbGcV...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "def50200..."
}
```

### Step 4: 获取用户信息 (Get User Info)
使用 Access Token 获取用户信息：

```http
GET https://auth.your-domain.com/oauth2/userinfo
Authorization: Bearer YOUR_ACCESS_TOKEN
```

**响应示例**:
```json
{
  "id": "12345",
  "nickname": "Alice",
  "email": "alice@example.com",
  "avatar_url": "..."
}
```

---

## 2. 数据库准备 (Database Setup)

在开始之前，您需要先在 `applications` 表中插入一条应用记录。您可以使用我们提供的辅助脚本来完成此操作。

## 3. SDK 支持 (SDK Support)

如果您使用 Node.js 开发第三方应用，可以直接使用我们的 Server SDK：

```typescript
import { UniAuthServer } from '@uniauth/server-sdk';

const auth = new UniAuthServer({
  clientId: '...',
  clientSecret: '...',
  issuer: 'https://auth.your-domain.com'
});

// 1. 获取登录跳转 URL
const loginUrl = auth.getLoginUrl();

// 2. 在回调路由处理 Code
const tokens = await auth.exchangeCode(code);

// 3. 验证 Token 或获取用户信息
const user = await auth.getUserInfo(tokens.accessToken);
```
