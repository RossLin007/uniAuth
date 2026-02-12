# 🤖 UniAuth AI Agent Prompts

> **Copy → Paste → Done.** Give these prompts to your AI coding assistant to integrate UniAuth in minutes.
>
> **复制 → 粘贴 → 完成。** 将这些提示词交给你的 AI 编程助手，几分钟内完成 UniAuth 集成。

## How to Use / 使用方法

1. **Choose your scenario** from the table below  
2. **Copy the entire prompt** from the corresponding file  
3. **Paste it into** Claude, Cursor, GitHub Copilot, or any AI coding assistant  
4. **Replace placeholders** like `YOUR_UNIAUTH_URL` with your actual values  
5. **Let AI generate** the complete integration code  

## Prompts / 提示词列表

| Prompt | Scenario / 场景 | SDK |
|--------|-----------------|-----|
| [React / Next.js](./react-nextjs.md) | Add login to a React or Next.js app / 为 React 应用添加登录 | `@55387.ai/uniauth-react` |
| [Backend Protection](./backend-protection.md) | Protect API routes (Express, Hono, Next.js) / 保护后端 API | `@55387.ai/uniauth-server` |
| [Full-Stack App](./full-stack.md) | Build a complete app from scratch / 从零构建全栈应用 | Both SDKs |
| [OAuth2 Provider](./oauth2-provider.md) | Use UniAuth as your OAuth2/OIDC provider / 作为 OAuth2 提供商 | `@55387.ai/uniauth-client` |
| [Mobile / Trusted Client](./mobile-trusted-client.md) | Native apps via Trusted Client API / 移动端原生集成 | REST API |

## Prerequisites / 前提条件

Before using any prompt, you need: / 使用前需要准备：

- A running UniAuth instance (e.g. `https://auth.example.com`)  
- Client credentials from the Developer Console (Client ID + Secret)  
- Node.js 18+ and npm/pnpm installed  

## Placeholder Reference / 占位符说明

| Placeholder | Description |
|-------------|-------------|
| `YOUR_UNIAUTH_URL` | Your UniAuth server URL (e.g. `https://auth.55387.xyz`) |
| `YOUR_CLIENT_ID` | OAuth2 Client ID from Developer Console |
| `YOUR_CLIENT_SECRET` | OAuth2 Client Secret (backend only, never expose to frontend!) |
| `YOUR_APP_KEY` | Application Key for frontend SDK |
| `YOUR_REDIRECT_URI` | OAuth callback URL (e.g. `https://yourapp.com/auth/callback`) |

## Tips / 小贴士

- 🔒 **Never expose `CLIENT_SECRET` in frontend code** — it's backend-only
- 🌐 Prompts instruct AI to generate **bilingual UI** (Chinese + English)
- 🌙 Prompts include **dark mode** support by default
- 📱 Generated code is **responsive** (desktop + mobile)
