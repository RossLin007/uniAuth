# UniAuth Cloud Run 部署指南

本文档详细说明如何将 UniAuth 项目部署到 Google Cloud Run。我们将采用**微服务架构**，将项目拆分为三个独立的服务运行。

## 📅 部署架构

系统将部署为以下三个独立服务：

| 服务名称 | 描述 | 类型 | 端口 | Docker配置位置 |
|----------|------|------|------|----------------|
| **uniauth-api** | 后端 API 服务 | Node.js Server | 3000 | `/Dockerfile` (根目录) |
| **uniauth-web** | C端用户 Web App | Nginx (Static) | 80 | `/packages/web/Dockerfile` |
| **uniauth-console** | 开发者控制台 | Nginx (Static) | 80 | `/packages/developer-console/Dockerfile` |

## ✅ 准备工作

在开始之前，请确保你已经完成了以下准备工作：

1.  **安装 Google Cloud SDK**
    *   确保本地已安装 `gcloud` CLI 工具。
    *   [安装指南](https://cloud.google.com/sdk/docs/install)

2.  **身份认证与项目配置**
    ```bash
    # 登录 Google Cloud
    gcloud auth login

    # 设置你的项目 ID
    gcloud config set project [YOUR_PROJECT_ID]

    # 配置 Docker 凭证 (用于推送到 GCR/Artifact Registry)
    gcloud auth configure-docker
    ```

3.  **Supabase 数据库**
    *   确保你的 Supabase 数据库允许来自 Google Cloud Run 的连接（通常是允许所有 IP 或配置 VPC Peering）。
    *   准备好连接字符串。

## 🚀 自动部署 (推荐)

我们提供了一个一键部署脚本，可以自动构建镜像并部署所有服务。

1.  **运行部署脚本**
    ```bash
    ./scripts/deploy-cloud-run.sh
    ```

2.  **等待部署完成**
    脚本会依次部署 API、Web 和 Console 服务。完成后，它会输出每个服务的访问 URL。

## ⚙️ 环境变量配置

部署完成后，你需要为 **uniauth-api** 服务配置环境变量。

1.  进入 [Google Cloud Console - Cloud Run](https://console.cloud.google.com/run)。
2.  点击 **uniauth-api** 服务。
3.  点击顶部 "**EDIT & DEPLOY NEW REVISION**"。
4.  切换到 "**VARIABLES & SECRETS**" 标签页。
5.  添加以下环境变量 (参考本地 `.env` 文件)：

    *   `SUPABASE_URL`
    *   `SUPABASE_ANON_KEY`
    *   `SUPABASE_SERVICE_ROLE_KEY`
    *   `DATABASE_URL`
    *   `JWT_SECRET`
    *   `FRONTEND_URL` (设置为部署后的 uniauth-web URL)
    *   `DEV_CONSOLE_URL` (设置为部署后的 uniauth-console URL)
    *   ...以及其他必要的配置 (Google OAuth, Twilio, Tencent Cloud 等)

6.  点击底部 "**DEPLOY**" 保存并重新部署。

## 🔧 手动部署步骤 (参考)

如果你不想使用脚本，可以手动执行以下命令：

### 1. 部署 API 服务
```bash
# 构建镜像
gcloud builds submit --tag gcr.io/[PROJECT_ID]/uniauth-api -f Dockerfile .

# 部署服务
gcloud run deploy uniauth-api \
  --image gcr.io/[PROJECT_ID]/uniauth-api \
  --region asia-east1 \
  --platform managed \
  --allow-unauthenticated \
  --port 3000
```

### 2. 部署 Web 前端
```bash
# 构建镜像 (多阶段构建)
gcloud builds submit --tag gcr.io/[PROJECT_ID]/uniauth-web -f packages/web/Dockerfile .

# 部署服务
gcloud run deploy uniauth-web \
  --image gcr.io/[PROJECT_ID]/uniauth-web \
  --region asia-east1 \
  --platform managed \
  --allow-unauthenticated \
  --port 80
```

### 3. 部署开发者控制台
```bash
# 构建镜像
gcloud builds submit --tag gcr.io/[PROJECT_ID]/uniauth-console -f packages/developer-console/Dockerfile .

# 部署服务
gcloud run deploy uniauth-console \
  --image gcr.io/[PROJECT_ID]/uniauth-console \
  --region asia-east1 \
  --platform managed \
  --allow-unauthenticated \
  --port 80
```

## 🌐 域名配置 (自定义域名)

要在 Cloud Run 上使用自己的域名 (如 `auth.example.com`)，你需要在 Google Cloud Console 中进行配置，并更新应用的配置。

### 1. 映射域名 (Google Cloud Platform)

1.  进入 [Google Cloud Run 控制台](https://console.cloud.google.com/run)。
2.  点击所有的三个服务 (**uniauth-api**, **uniauth-web**, **uniauth-console**)。
3.  点击顶部的 "**MANAGE CUSTOM DOMAINS**" (管理自定义域名)。
4.  点击 "**ADD MAPPING**"。
5.  选择服务 (例如 `uniauth-web`)，选择已验证的域名，并指定子域名 (例如 `www` 或 `@`)。
6.  按照提示在你的 DNS 提供商处添加 `CNAME` 或 `A` 记录。

### 2. 更新应用配置 (重要)

配置好域名后，你需要更新应用以识别这些新域名：

#### A. 更新后端 CORS 配置
为了让前端 (新域名) 能访问后端，你需要更新 API 服务的 `CORS_ORIGINS` 环境变量。

1.  转到 **uniauth-api** 服务 -> **EDIT & DEPLOY NEW REVISION** -> **VARIABLES & SECRETS**。
2.  更新 `CORS_ORIGINS`，添加你的新域名：
    ```text
    http://localhost:3000,https://uniauth-web-xxx.a.run.app,https://www.yourdomain.com,https://console.yourdomain.com
    ```
3.  更新 `FRONTEND_URL` 和 `DEV_CONSOLE_URL` 为你的新域名。
4.  重新部署 API 服务。

#### B. 更新前端连接的 API 地址
如果你也给 API 服务配置了自定义域名 (例如 `api.yourdomain.com`)，你需要重新构建前端，让它们指向这个新地址。

修改 `scripts/deploy-cloud-run.sh` 脚本或手动部署，强制指定 `VITE_API_URL`：

```bash
# 手动重新部署 Web 前端 (指定 API 新域名)
gcloud builds submit --tag gcr.io/[PROJECT_ID]/uniauth-web \
  --build-arg VITE_API_URL=https://api.yourdomain.com \
  -f packages/web/Dockerfile .

gcloud run deploy uniauth-web ...
```

或者，你可以在脚本中修改获取 `API_URL` 的逻辑。

