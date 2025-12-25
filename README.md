# UniAuth 统一身份认证平台

<p align="center">
  <strong>🔐 Unified Authentication Platform / 统一身份认证平台</strong>
</p>

<p align="center">
  为多个应用服务提供统一的用户认证与授权。
  <br/>
  Provides centralized user authentication and authorization for multiple application services.
</p>

---

## ✨ Features / 特性

| Feature | Description |
|---------|-------------|
| 📱 **Phone Login** | 手机号 + 验证码登录 (腾讯云短信) |
| 🔑 **JWT Tokens** | Access Token + Refresh Token 双令牌机制 |
| 🔄 **Token Rotation** | 自动刷新与轮换令牌，增强安全性 |
| 🔌 **SDK Support** | 提供前端 SDK 与后端 SDK |
| 🌐 **Multi-language** | 中英文双语支持 |
| 📱 **Responsive** | PC / Mobile / Tablet 全端适配 |
| 🛡️ **Security** | Rate Limiting, IP Blocking, Audit Logging |

---

## 🚀 Quick Start / 快速开始

### Prerequisites / 前置要求

- Node.js 20+
- pnpm 8+
- Supabase 账户
- 腾讯云短信服务

### Installation / 安装

```bash
# Clone the repository
git clone https://github.com/your-org/uniauth.git
cd uniauth

# Install dependencies
pnpm install

# Copy environment variables
cp .env.example .env

# Edit .env with your configuration
```

### Configuration / 配置

编辑 `.env` 文件，填入以下配置：

```env
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# JWT
JWT_SECRET=your_secret_key_at_least_32_chars

# Tencent SMS
TENCENT_SECRET_ID=your_secret_id
TENCENT_SECRET_KEY=your_secret_key
TENCENT_SMS_SDK_APP_ID=your_app_id
TENCENT_SMS_SIGN_NAME=your_sign_name
TENCENT_SMS_TEMPLATE_ID=your_template_id
```

### Database Setup / 数据库设置

在 Supabase SQL Editor 中运行迁移脚本：

```bash
cat packages/server/migrations/001_initial_schema.sql
```

### Run / 运行

#### 启动所有服务 (推荐)

```bash
# 一键启动所有开发服务
npm run dev:all

# 停止所有服务
npm run stop:all
```

#### 服务地址

| 服务 | 端口 | 地址 | 描述 |
|------|------|------|------|
| 🔧 **API Server** | 3000 | http://localhost:3000 | 后端 API 服务 |
| 🌐 **Web Frontend** | 5173 | http://localhost:5173 | 用户登录页面 |
| 👨‍💻 **Developer Console** | 5174 | http://localhost:5174 | 开发者控制台 |
| 📚 **API Docs** | 3000 | http://localhost:3000/docs | Swagger 文档 |

#### 单独启动服务

```bash
# 只启动 API 服务
npm run dev

# 只启动 Web 前端
npm run dev:web

# 只启动开发者控制台
npm run dev:console
```

#### 生产构建

```bash
# 构建所有包
pnpm build

# 启动生产服务
pnpm start
```

---

## 📦 Packages / 包结构

| Package | Description |
|---------|-------------|
| `@uniauth/server` | API 服务端 |
| `@uniauth/client` | 前端 SDK |
| `@uniauth/server-sdk` | 后端 SDK |

---

## 📖 SDK Usage / SDK 使用

### Frontend SDK / 前端 SDK

```typescript
import { UniAuthClient } from '@uniauth/client';

const auth = new UniAuthClient({
  baseUrl: 'https://auth.example.com',
  appKey: 'your-app-key',
});

// 发送验证码
await auth.sendCode('+8613800138000');

// 验证码登录
const result = await auth.loginWithCode('+8613800138000', '123456');
console.log('User:', result.user);

// 获取当前用户
const user = await auth.getCurrentUser();

// 检查登录状态
if (auth.isAuthenticated()) {
  console.log('User is logged in');
}

// 登出
await auth.logout();
```

### Backend SDK / 后端 SDK

```typescript
import { UniAuthServer } from '@uniauth/server-sdk';
import express from 'express';

const auth = new UniAuthServer({
  baseUrl: 'https://auth.example.com',
  appKey: 'your-app-key',
  appSecret: 'your-app-secret',
});

const app = express();

// 使用中间件保护路由
app.use('/api/*', auth.middleware());

// 访问用户信息
app.get('/api/profile', (req, res) => {
  res.json({
    user: req.user,
    payload: req.authPayload,
  });
});

// 手动验证令牌
app.get('/verify', async (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  const payload = await auth.verifyToken(token);
  res.json({ payload });
});
```

---

## 🔗 API Endpoints / API 接口

### Authentication / 认证

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/send-code` | 发送验证码 |
| POST | `/api/v1/auth/verify-code` | 验证码登录 |
| POST | `/api/v1/auth/refresh` | 刷新令牌 |
| POST | `/api/v1/auth/logout` | 登出 |
| POST | `/api/v1/auth/logout-all` | 登出所有设备 |

### User / 用户

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/user/me` | 获取当前用户 |
| PATCH | `/api/v1/user/me` | 更新用户信息 |
| GET | `/api/v1/user/sessions` | 获取活跃会话 |
| DELETE | `/api/v1/user/sessions/:id` | 撤销会话 |

---

## 🧪 Testing / 测试

```bash
# Run all tests
pnpm test

# Run tests with coverage
pnpm test:coverage

# Run tests in watch mode
pnpm test:watch
```

---

## 📄 License / 许可证

MIT License

---

## 🤝 Contributing / 贡献

欢迎贡献代码！请查看 [CONTRIBUTING.md](./CONTRIBUTING.md) 了解更多信息。

Contributions are welcome! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for more details.
