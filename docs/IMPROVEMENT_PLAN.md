# UniAuth 商业化改进计划

**计划版本**: 1.0  
**制定日期**: 2025-12-22  
**计划周期**: 6 周 (2025-12-23 ~ 2025-02-02)  
**目标**: 将 UniAuth 从 MVP 阶段提升至商业化就绪状态

---

## 📊 改进目标总览

| 维度 | 当前评分 | 目标评分 | 关键指标 |
|------|---------|---------|---------|
| 功能完整性 | 8.0 | 9.0 | PKCE 支持, MFA 预留 |
| 安全性 | 7.5 | 9.5 | P0/P1 安全问题清零 |
| 高可用性 | 5.0 | 8.5 | 99.9% SLA 支持 |
| 可观测性 | 3.5 | 8.0 | 完整监控告警体系 |
| 测试覆盖 | 3.0 | 8.0 | 核心代码 80%+ 覆盖率 |
| SDK 成熟度 | 7.0 | 8.5 | NPM 发布就绪 |

---

## 🗓️ 六周改进路线图

```
Week 1 (12/23-12/29)  ████████  Phase 1: 安全加固
Week 2 (12/30-01/05)  ████████  Phase 2: 可观测性建设  
Week 3 (01/06-01/12)  ████████  Phase 3: 高可用改造
Week 4 (01/13-01/19)  ████████  Phase 4: 测试体系建设
Week 5 (01/20-01/26)  ████████  Phase 5: SDK 完善 & 文档
Week 6 (01/27-02/02)  ████████  Phase 6: 集成测试 & 发布准备
```

---

## 📋 Phase 1: 安全加固 (Week 1)

**目标**: 解决所有 P0/P1 安全风险

### 1.1 Client Secret 加密存储 [P0]
**负责人**: Backend  
**预计工时**: 1 天

**当前问题**:
```sql
-- applications 表中 client_secret 明文存储
client_secret VARCHAR(128) NOT NULL
```

**改进方案**:
```typescript
// packages/server/src/lib/crypto.ts
import bcrypt from 'bcryptjs';

export async function hashClientSecret(secret: string): Promise<string> {
  return bcrypt.hash(secret, 12);
}

export async function verifyClientSecret(secret: string, hash: string): Promise<boolean> {
  return bcrypt.compare(secret, hash);
}
```

**数据库迁移**:
```sql
-- migrations/005_encrypt_client_secrets.sql
-- 1. 添加新的加密字段
ALTER TABLE applications ADD COLUMN client_secret_hash VARCHAR(255);

-- 2. 应用服务在首次验证时迁移数据
-- 3. 迁移完成后删除明文字段
```

**验收标准**:
- [ ] 新创建的应用 Secret 使用 bcrypt 加密存储
- [ ] 存量数据完成灰度迁移
- [ ] 明文 Secret 字段已删除

---

### 1.2 实现 PKCE 支持 [P0]
**负责人**: Backend  
**预计工时**: 2 天

**OAuth 2.0 PKCE 流程**:
```
Client                                             Server
  │                                                   │
  │  1. Generate code_verifier (random string)        │
  │  2. Create code_challenge = SHA256(verifier)      │
  │                                                   │
  │──── Authorization Request ────────────────────────▶│
  │     client_id, redirect_uri, response_type=code   │
  │     code_challenge, code_challenge_method=S256    │
  │                                                   │
  │◀─── Authorization Code ───────────────────────────│
  │                                                   │
  │──── Token Request ────────────────────────────────▶│
  │     code, client_id, redirect_uri                 │
  │     code_verifier (原始值，非哈希)                  │
  │                                                   │
  │◀─── Access Token ─────────────────────────────────│
```

**实现任务**:
```typescript
// packages/server/src/services/oauth2.service.ts

interface AuthorizationCodeWithPKCE extends AuthorizationCode {
  code_challenge?: string;
  code_challenge_method?: 'S256' | 'plain';
}

async createAuthorizationCode(
  userId: string,
  clientId: string,
  redirectUri: string,
  scope?: string,
  codeChallenge?: string,
  codeChallengeMethod?: 'S256' | 'plain'
): Promise<string> {
  // 存储 code_challenge
}

async exchangeCode(
  clientId: string,
  clientSecret: string | null, // Public client 可以没有 secret
  code: string,
  redirectUri: string,
  codeVerifier?: string
): Promise<OAuth2TokenResponse> {
  // 验证 PKCE
  if (authCode.code_challenge) {
    if (!codeVerifier) throw new Error('code_verifier required');
    
    const challenge = authCode.code_challenge_method === 'S256'
      ? base64url(sha256(codeVerifier))
      : codeVerifier;
      
    if (challenge !== authCode.code_challenge) {
      throw new Error('invalid_grant');
    }
  }
}
```

**数据库迁移**:
```sql
-- migrations/006_add_pkce_support.sql
ALTER TABLE oauth_authorization_codes 
  ADD COLUMN code_challenge VARCHAR(128),
  ADD COLUMN code_challenge_method VARCHAR(10);
```

**验收标准**:
- [ ] 支持 S256 和 plain 两种 challenge 方法
- [ ] Public Client (无 secret) 强制要求 PKCE
- [ ] 更新开发者文档

---

### 1.3 验证码尝试次数限制 [P1]
**负责人**: Backend  
**预计工时**: 0.5 天

**当前问题**: 验证码可无限次尝试，存在暴力破解风险

**改进方案**:
```typescript
// packages/server/src/services/auth.service.ts

const MAX_VERIFY_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 分钟

async verifyPhoneCode(phone: string, code: string, ...) {
  // 检查锁定状态
  const lockKey = `lockout:phone:${phone}`;
  const isLocked = await redis.get(lockKey);
  if (isLocked) {
    return {
      success: false,
      message: 'Too many attempts. Please try again later.',
      retryAfter: await redis.ttl(lockKey),
    };
  }

  // 获取验证码记录
  const record = await this.getLatestCode(phone, 'login');
  
  // 验证失败处理
  if (record.code !== code) {
    record.attempts += 1;
    await this.updateAttempts(record.id, record.attempts);
    
    if (record.attempts >= MAX_VERIFY_ATTEMPTS) {
      await redis.setex(lockKey, LOCKOUT_DURATION / 1000, '1');
      await this.invalidateCode(record.id);
    }
    
    return {
      success: false,
      message: `Invalid code. ${MAX_VERIFY_ATTEMPTS - record.attempts} attempts remaining.`,
    };
  }
  
  // 验证成功...
}
```

**验收标准**:
- [ ] 单个验证码最多尝试 5 次
- [ ] 超过次数后锁定 15 分钟
- [ ] 锁定状态返回剩余等待时间

---

### 1.4 Rate Limiting 中间件 [P1]
**负责人**: Backend  
**预计工时**: 1 天

**实现方案**:
```typescript
// packages/server/src/middlewares/rate-limit.middleware.ts
import { rateLimiter } from 'hono-rate-limiter';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL!,
  token: process.env.UPSTASH_REDIS_TOKEN!,
});

// 通用 API 限流
export const generalRateLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 分钟
  limit: 100, // 每窗口 100 次
  keyGenerator: (c) => {
    return c.req.header('X-Forwarded-For')?.split(',')[0] || 
           c.req.header('CF-Connecting-IP') || 
           'unknown';
  },
  message: {
    success: false,
    error: {
      code: 'RATE_LIMITED',
      message: 'Too many requests. Please try again later.',
    },
  },
});

// 认证接口限流 (更严格)
export const authRateLimiter = rateLimiter({
  windowMs: 60 * 1000, // 1 分钟
  limit: 5, // 每分钟 5 次
  keyGenerator: (c) => {
    const ip = c.req.header('X-Forwarded-For')?.split(',')[0] || 'unknown';
    const phone = c.req.json()?.phone || '';
    return `auth:${ip}:${phone}`;
  },
});
```

**应用配置**:
```typescript
// packages/server/src/index.ts
import { generalRateLimiter, authRateLimiter } from './middlewares/rate-limit.middleware.js';

// 全局限流
app.use('*', generalRateLimiter);

// 认证接口特殊限流
app.use('/api/v1/auth/send-code', authRateLimiter);
app.use('/api/v1/auth/verify-code', authRateLimiter);
```

**验收标准**:
- [ ] 通用 API: 100 req/15min
- [ ] 认证 API: 5 req/min
- [ ] 返回 429 状态码和 Retry-After 头

---

### 1.5 安全头加固 [P2]
**负责人**: Backend  
**预计工时**: 0.5 天

```typescript
// packages/server/src/index.ts
import { secureHeaders } from 'hono/secure-headers';

app.use('*', secureHeaders({
  strictTransportSecurity: 'max-age=31536000; includeSubDomains',
  xContentTypeOptions: 'nosniff',
  xFrameOptions: 'DENY',
  xXssProtection: '1; mode=block',
  contentSecurityPolicy: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'"],
    styleSrc: ["'self'", "'unsafe-inline'"],
  },
}));
```

**验收标准**:
- [ ] HSTS 启用
- [ ] CSP 配置完成
- [ ] 通过 securityheaders.com A 级评分

---

## 📋 Phase 2: 可观测性建设 (Week 2)

**目标**: 建立完整的日志、监控、告警体系

### 2.1 结构化日志系统 [P0]
**预计工时**: 1.5 天

**依赖安装**:
```bash
pnpm add pino pino-http
pnpm add -D pino-pretty
```

**实现**:
```typescript
// packages/server/src/lib/logger.ts
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => ({ level: label }),
    bindings: () => ({}),
  },
  timestamp: () => `,"time":"${new Date().toISOString()}"`,
  base: {
    service: 'uniauth-api',
    version: process.env.npm_package_version,
    env: process.env.NODE_ENV,
  },
});

// 子 logger 工厂
export function createLogger(module: string) {
  return logger.child({ module });
}
```

**请求日志中间件**:
```typescript
// packages/server/src/middlewares/request-logger.middleware.ts
import { nanoid } from 'nanoid';
import { logger } from '../lib/logger.js';

export function requestLogger(): MiddlewareHandler {
  return async (c, next) => {
    const requestId = c.req.header('X-Request-Id') || nanoid();
    const startTime = Date.now();
    
    c.set('requestId', requestId);
    c.header('X-Request-Id', requestId);
    
    logger.info({
      type: 'request',
      requestId,
      method: c.req.method,
      path: c.req.path,
      ip: c.req.header('X-Forwarded-For')?.split(',')[0],
      userAgent: c.req.header('User-Agent'),
    });
    
    await next();
    
    const duration = Date.now() - startTime;
    logger.info({
      type: 'response',
      requestId,
      status: c.res.status,
      duration,
    });
  };
}
```

**验收标准**:
- [ ] 所有日志输出为 JSON 格式
- [ ] 包含 requestId 追踪
- [ ] 开发环境使用 pino-pretty 格式化

---

### 2.2 Sentry 错误追踪 [P0]
**预计工时**: 0.5 天

```typescript
// packages/server/src/lib/sentry.ts
import * as Sentry from '@sentry/node';

export function initSentry() {
  if (process.env.NODE_ENV === 'production' && process.env.SENTRY_DSN) {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV,
      tracesSampleRate: 0.1,
      integrations: [
        new Sentry.Integrations.Http({ tracing: true }),
      ],
    });
  }
}

// 错误上报
export function captureException(error: Error, context?: Record<string, unknown>) {
  logger.error({ error, ...context }, 'Captured exception');
  Sentry.captureException(error, { extra: context });
}
```

**Hono 集成**:
```typescript
// packages/server/src/index.ts
app.onError((err, c) => {
  const requestId = c.get('requestId');
  captureException(err, { requestId, path: c.req.path });
  
  return c.json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
      requestId,
    },
  }, 500);
});
```

**验收标准**:
- [ ] 生产环境异常自动上报
- [ ] 包含完整上下文信息
- [ ] Sentry 仪表板可查看

---

### 2.3 健康检查增强 [P1]
**预计工时**: 0.5 天

```typescript
// packages/server/src/routes/health.routes.ts
import { Hono } from 'hono';
import { getSupabase } from '../lib/supabase.js';

const healthRouter = new Hono();

// 简单健康检查 (Load Balancer 用)
healthRouter.get('/health', (c) => {
  return c.json({ status: 'ok' });
});

// 深度健康检查 (监控系统用)
healthRouter.get('/health/ready', async (c) => {
  const checks: Record<string, { status: string; latency?: number }> = {};
  
  // 数据库检查
  const dbStart = Date.now();
  try {
    await getSupabase().from('users').select('id').limit(1);
    checks.database = { status: 'healthy', latency: Date.now() - dbStart };
  } catch (error) {
    checks.database = { status: 'unhealthy' };
  }
  
  // Redis 检查 (如果配置)
  if (process.env.UPSTASH_REDIS_URL) {
    const redisStart = Date.now();
    try {
      await redis.ping();
      checks.redis = { status: 'healthy', latency: Date.now() - redisStart };
    } catch (error) {
      checks.redis = { status: 'unhealthy' };
    }
  }
  
  const allHealthy = Object.values(checks).every(c => c.status === 'healthy');
  
  return c.json({
    status: allHealthy ? 'healthy' : 'degraded',
    checks,
    version: process.env.npm_package_version,
    uptime: process.uptime(),
  }, allHealthy ? 200 : 503);
});

export { healthRouter };
```

**验收标准**:
- [ ] `/health` 返回简单状态
- [ ] `/health/ready` 检查所有依赖
- [ ] 不健康时返回 503

---

### 2.4 基础指标监控 [P1]
**预计工时**: 1 天

```typescript
// packages/server/src/lib/metrics.ts
import { Registry, Counter, Histogram, collectDefaultMetrics } from 'prom-client';

export const registry = new Registry();

// 收集默认指标 (CPU, 内存等)
collectDefaultMetrics({ register: registry });

// 自定义指标
export const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'path', 'status'],
  registers: [registry],
});

export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'path'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
  registers: [registry],
});

export const authAttempts = new Counter({
  name: 'auth_attempts_total',
  help: 'Total authentication attempts',
  labelNames: ['type', 'result'], // type: phone/email/oauth, result: success/failure
  registers: [registry],
});
```

**Prometheus 端点**:
```typescript
// packages/server/src/routes/metrics.routes.ts
healthRouter.get('/metrics', async (c) => {
  // 仅允许内部访问
  const token = c.req.header('Authorization');
  if (token !== `Bearer ${process.env.METRICS_TOKEN}`) {
    return c.text('Unauthorized', 401);
  }
  
  c.header('Content-Type', registry.contentType);
  return c.text(await registry.metrics());
});
```

**验收标准**:
- [ ] 暴露 Prometheus 格式指标
- [ ] 包含请求延迟、错误率、认证统计
- [ ] 可对接 Grafana 仪表板

---

### 2.5 告警配置 [P2]
**预计工时**: 0.5 天

创建告警规则文档:
```yaml
# docs/alerting-rules.yaml
groups:
  - name: uniauth-alerts
    rules:
      # 高错误率告警
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m]) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "Error rate is above 5% for the last 5 minutes"
      
      # 认证失败告警
      - alert: HighAuthFailureRate
        expr: rate(auth_attempts_total{result="failure"}[5m]) / rate(auth_attempts_total[5m]) > 0.3
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High authentication failure rate"
      
      # 服务不可用告警
      - alert: ServiceDown
        expr: up{job="uniauth"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "UniAuth service is down"
```

**验收标准**:
- [ ] 告警规则文档完成
- [ ] 可对接 AlertManager/PagerDuty

---

## 📋 Phase 3: 高可用改造 (Week 3)

**目标**: 支持水平扩展，达到 99.9% SLA 能力

### 3.1 Docker 化部署 [P0]
**预计工时**: 1 天

```dockerfile
# Dockerfile
FROM node:20-alpine AS builder

WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/server/package.json ./packages/server/
RUN npm install -g pnpm && pnpm install --frozen-lockfile

COPY packages/server ./packages/server
COPY tsconfig.json ./
RUN pnpm --filter @uniauth/server build

# Production image
FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

# 安全: 使用非 root 用户
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 hono
USER hono

COPY --from=builder --chown=hono:nodejs /app/packages/server/dist ./dist
COPY --from=builder --chown=hono:nodejs /app/packages/server/package.json ./
COPY --from=builder --chown=hono:nodejs /app/node_modules ./node_modules

EXPOSE 3000
CMD ["node", "dist/index.js"]
```

```yaml
# docker-compose.yml
version: '3.8'

services:
  api:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
    env_file:
      - .env
    healthcheck:
      test: ["CMD", "wget", "-q", "--spider", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    deploy:
      replicas: 3
      resources:
        limits:
          memory: 512M
        reservations:
          memory: 256M
```

**验收标准**:
- [ ] Docker 镜像构建成功
- [ ] 支持多实例部署
- [ ] 健康检查配置完成

---

### 3.2 Redis 缓存层 [P0]
**预计工时**: 1.5 天

```typescript
// packages/server/src/lib/redis.ts
import { Redis } from '@upstash/redis';

let redis: Redis | null = null;

export function getRedis(): Redis {
  if (!redis) {
    if (!process.env.UPSTASH_REDIS_URL || !process.env.UPSTASH_REDIS_TOKEN) {
      throw new Error('Redis configuration missing');
    }
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_URL,
      token: process.env.UPSTASH_REDIS_TOKEN,
    });
  }
  return redis;
}

// 缓存工具函数
export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    return await getRedis().get(key);
  } catch (error) {
    logger.warn({ error, key }, 'Cache get failed');
    return null; // 缓存失败不影响业务
  }
}

export async function cacheSet(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  try {
    await getRedis().setex(key, ttlSeconds, value);
  } catch (error) {
    logger.warn({ error, key }, 'Cache set failed');
  }
}

export async function cacheDelete(key: string): Promise<void> {
  try {
    await getRedis().del(key);
  } catch (error) {
    logger.warn({ error, key }, 'Cache delete failed');
  }
}
```

**Token 验证缓存**:
```typescript
// packages/server/src/lib/jwt.ts

export async function verifyAccessTokenCached(token: string): Promise<JWTPayload> {
  const cacheKey = `token:${hashToken(token).substring(0, 16)}`;
  
  // 尝试从缓存获取
  const cached = await cacheGet<JWTPayload>(cacheKey);
  if (cached) {
    return cached;
  }
  
  // 验证 token
  const payload = await verifyAccessToken(token);
  
  // 缓存结果 (最多 5 分钟或到过期时间)
  const ttl = Math.min(300, payload.exp - Math.floor(Date.now() / 1000));
  if (ttl > 0) {
    await cacheSet(cacheKey, payload, ttl);
  }
  
  return payload;
}
```

**验收标准**:
- [ ] Token 验证缓存降低数据库负载
- [ ] 验证码存储在 Redis
- [ ] Rate Limiting 使用 Redis

---

### 3.3 数据库连接优化 [P1]
**预计工时**: 0.5 天

```typescript
// packages/server/src/lib/supabase.ts
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { env } from '../config/env.js';

let supabase: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!supabase) {
    supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      db: {
        schema: 'public',
      },
      global: {
        fetch: (url, options) => {
          return fetch(url, {
            ...options,
            // 添加超时控制
            signal: AbortSignal.timeout(10000),
          });
        },
      },
    });
  }
  return supabase;
}

// 带重试的数据库操作
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 100
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      // 指数退避
      const delay = baseDelay * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
      
      logger.warn({ attempt, error }, 'Database operation retry');
    }
  }
  
  throw lastError;
}
```

**验收标准**:
- [ ] 数据库操作带超时
- [ ] 失败自动重试 (指数退避)
- [ ] 连接池复用

---

### 3.4 优雅关闭 [P1]
**预计工时**: 0.5 天

```typescript
// packages/server/src/index.ts

let isShuttingDown = false;

// 优雅关闭处理
async function gracefulShutdown(signal: string) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  
  logger.info({ signal }, 'Received shutdown signal, starting graceful shutdown');
  
  // 停止接受新请求
  server.close();
  
  // 等待现有请求完成 (最多 30 秒)
  const timeout = setTimeout(() => {
    logger.warn('Graceful shutdown timeout, forcing exit');
    process.exit(1);
  }, 30000);
  
  try {
    // 清理资源
    await Promise.all([
      // 关闭 Redis 连接
      redis?.quit(),
      // 其他清理操作
    ]);
    
    clearTimeout(timeout);
    logger.info('Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    logger.error({ error }, 'Error during graceful shutdown');
    process.exit(1);
  }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
```

**验收标准**:
- [ ] 收到终止信号后停止接受新请求
- [ ] 等待现有请求完成
- [ ] 清理所有资源后退出

---

## 📋 Phase 4: 测试体系建设 (Week 4)

**目标**: 核心代码测试覆盖率 ≥ 80%

### 4.1 单元测试完善 [P0]
**预计工时**: 2.5 天

**测试文件结构**:
```
packages/server/tests/
├── unit/
│   ├── services/
│   │   ├── auth.service.test.ts
│   │   ├── oauth2.service.test.ts
│   │   └── user.service.test.ts
│   ├── lib/
│   │   ├── jwt.test.ts
│   │   ├── sms.test.ts
│   │   └── crypto.test.ts
│   └── middlewares/
│       ├── auth.middleware.test.ts
│       └── rate-limit.middleware.test.ts
├── integration/
│   └── ... (Phase 4.2)
└── e2e/
    └── ... (Phase 4.3)
```

**示例测试**:
```typescript
// packages/server/tests/unit/services/auth.service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthService } from '../../../src/services/auth.service.js';

describe('AuthService', () => {
  let authService: AuthService;
  
  beforeEach(() => {
    authService = new AuthService();
    vi.clearAllMocks();
  });
  
  describe('sendPhoneCode', () => {
    it('should send verification code successfully', async () => {
      // Mock SMS service
      vi.spyOn(authService, 'sendSms').mockResolvedValue({ success: true });
      
      const result = await authService.sendPhoneCode('+8613800138000', 'login');
      
      expect(result.success).toBe(true);
      expect(result.expiresIn).toBe(300);
    });
    
    it('should reject invalid phone number', async () => {
      const result = await authService.sendPhoneCode('invalid', 'login');
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('Invalid phone');
    });
    
    it('should enforce rate limit', async () => {
      await authService.sendPhoneCode('+8613800138000', 'login');
      const result = await authService.sendPhoneCode('+8613800138000', 'login');
      
      expect(result.success).toBe(false);
      expect(result.retryAfter).toBeGreaterThan(0);
    });
  });
  
  describe('verifyPhoneCode', () => {
    it('should verify correct code', async () => {
      // Setup: 创建验证码
      await authService.sendPhoneCode('+8613800138000', 'login');
      
      // Mock 获取验证码
      vi.spyOn(authService, 'getLatestCode').mockResolvedValue({
        code: '123456',
        attempts: 0,
        expires_at: new Date(Date.now() + 300000),
      });
      
      const result = await authService.verifyPhoneCode('+8613800138000', '123456');
      
      expect(result.success).toBe(true);
      expect(result.tokens).toBeDefined();
    });
    
    it('should reject expired code', async () => {
      vi.spyOn(authService, 'getLatestCode').mockResolvedValue({
        code: '123456',
        attempts: 0,
        expires_at: new Date(Date.now() - 1000), // 已过期
      });
      
      const result = await authService.verifyPhoneCode('+8613800138000', '123456');
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('expired');
    });
  });
});
```

**验收标准**:
- [ ] AuthService 测试覆盖率 ≥ 85%
- [ ] OAuth2Service 测试覆盖率 ≥ 85%
- [ ] JWT 工具函数 100% 覆盖

---

### 4.2 集成测试 [P0]
**预计工时**: 1.5 天

```typescript
// packages/server/tests/integration/auth.integration.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import app from '../../src/index.js';

describe('Authentication API Integration', () => {
  
  describe('POST /api/v1/auth/send-code', () => {
    it('should send verification code', async () => {
      const res = await app.request('/api/v1/auth/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: '+8613800138000',
          type: 'login',
        }),
      });
      
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.expires_in).toBe(300);
    });
    
    it('should reject invalid request', async () => {
      const res = await app.request('/api/v1/auth/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      
      expect(res.status).toBe(400);
    });
  });
  
  describe('Full Login Flow', () => {
    it('should complete phone login flow', async () => {
      // 1. 发送验证码
      await app.request('/api/v1/auth/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: '+8613800138000', type: 'login' }),
      });
      
      // 2. 验证登录 (测试环境使用固定验证码)
      const loginRes = await app.request('/api/v1/auth/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: '+8613800138000',
          code: process.env.TEST_VERIFICATION_CODE || '000000',
        }),
      });
      
      expect(loginRes.status).toBe(200);
      const loginBody = await loginRes.json();
      expect(loginBody.data.access_token).toBeDefined();
      expect(loginBody.data.refresh_token).toBeDefined();
      
      // 3. 使用 Token 访问保护接口
      const meRes = await app.request('/api/v1/user/me', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${loginBody.data.access_token}`,
        },
      });
      
      expect(meRes.status).toBe(200);
    });
  });
});
```

**验收标准**:
- [ ] 所有 API 端点都有集成测试
- [ ] 覆盖正常和异常流程
- [ ] 测试可在 CI 中运行

---

### 4.3 E2E 测试 [P1]
**预计工时**: 1 天

```typescript
// packages/web/tests/e2e/login.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Login Flow', () => {
  test('should login with phone number', async ({ page }) => {
    await page.goto('/login');
    
    // 输入手机号
    await page.fill('[data-testid="phone-input"]', '13800138000');
    await page.click('[data-testid="send-code-button"]');
    
    // 等待验证码发送
    await expect(page.locator('[data-testid="code-input"]')).toBeVisible();
    
    // 输入验证码 (测试环境)
    await page.fill('[data-testid="code-input"]', '000000');
    await page.click('[data-testid="login-button"]');
    
    // 验证登录成功
    await expect(page).toHaveURL('/');
    await expect(page.locator('[data-testid="user-avatar"]')).toBeVisible();
  });
  
  test('should show error for invalid code', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="phone-input"]', '13800138000');
    await page.click('[data-testid="send-code-button"]');
    
    await page.fill('[data-testid="code-input"]', '999999');
    await page.click('[data-testid="login-button"]');
    
    await expect(page.locator('[data-testid="error-message"]')).toContainText('Invalid');
  });
});
```

**验收标准**:
- [ ] 核心用户流程 E2E 覆盖
- [ ] Playwright 配置完成
- [ ] 可在 CI 中运行

---

## 📋 Phase 5: SDK 完善 & 文档 (Week 5)

**目标**: SDK NPM 发布就绪，文档完善

### 5.1 SDK 请求重试机制 [P1]
**预计工时**: 1 天

```typescript
// packages/client-sdk/src/http.ts

interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  retryableStatuses: number[];
}

const defaultRetryConfig: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  retryableStatuses: [408, 429, 500, 502, 503, 504],
};

export async function fetchWithRetry(
  url: string,
  options: RequestInit,
  config: RetryConfig = defaultRetryConfig
): Promise<Response> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);
      
      if (!config.retryableStatuses.includes(response.status)) {
        return response;
      }
      
      // 处理 Retry-After 头
      const retryAfter = response.headers.get('Retry-After');
      if (retryAfter) {
        await sleep(parseInt(retryAfter) * 1000);
        continue;
      }
    } catch (error) {
      lastError = error as Error;
    }
    
    if (attempt < config.maxRetries) {
      const delay = Math.min(
        config.baseDelay * Math.pow(2, attempt),
        config.maxDelay
      );
      await sleep(delay);
    }
  }
  
  throw lastError || new Error('Request failed after retries');
}
```

**验收标准**:
- [ ] 支持指数退避重试
- [ ] 处理 Retry-After 头
- [ ] 可配置重试策略

---

### 5.2 NPM 发布配置 [P1]
**预计工时**: 0.5 天

```json
// packages/client-sdk/package.json
{
  "name": "@55387.ai/uniauth-client",
  "version": "1.0.0",
  "description": "UniAuth Frontend SDK",
  "main": "./dist/index.js",
  "module": "./dist/index.mjs",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.mjs",
      "require": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "files": ["dist", "README.md"],
  "scripts": {
    "build": "tsup src/index.ts --format cjs,esm --dts --clean",
    "prepublishOnly": "pnpm build && pnpm test"
  },
  "repository": {
    "type": "git",
    "url": "https://github.com/your-org/uniauth.git",
    "directory": "packages/client-sdk"
  },
  "keywords": ["auth", "authentication", "uniauth", "sdk"],
  "license": "MIT",
  "publishConfig": {
    "access": "public"
  }
}
```

**验收标准**:
- [ ] 支持 CJS 和 ESM
- [ ] TypeScript 类型定义包含
- [ ] 可发布到 NPM

---

### 5.3 API 文档生成 [P1]
**预计工时**: 1 天

```typescript
// packages/server/src/lib/openapi.ts
import { OpenAPIHono } from '@hono/zod-openapi';

// 使用 zod-openapi 生成文档
const apiSpec = {
  openapi: '3.0.0',
  info: {
    title: 'UniAuth API',
    version: '1.0.0',
    description: 'Unified Authentication Platform API',
  },
  servers: [
    { url: 'https://api.uniauth.com', description: 'Production' },
    { url: 'http://localhost:3000', description: 'Development' },
  ],
  // ... 详细规范
};
```

**Swagger UI 集成**:
```typescript
// packages/server/src/routes/docs.routes.ts
import { swaggerUI } from '@hono/swagger-ui';

const docsRouter = new Hono();

docsRouter.get('/docs', swaggerUI({ url: '/api/openapi.json' }));
docsRouter.get('/api/openapi.json', (c) => c.json(apiSpec));

export { docsRouter };
```

**验收标准**:
- [ ] OpenAPI 3.0 规范完整
- [ ] Swagger UI 可访问
- [ ] 包含所有端点和示例

---

### 5.4 SDK README 完善 [P2]
**预计工时**: 0.5 天

```markdown
# @55387.ai/uniauth-client

> UniAuth Frontend SDK for browser and Node.js

## Installation

```bash
npm install @55387.ai/uniauth-client
# or
pnpm add @55387.ai/uniauth-client
```

## Quick Start

```typescript
import { UniAuthClient } from '@55387.ai/uniauth-client';

const auth = new UniAuthClient({
  baseUrl: 'https://api.uniauth.com',
  appKey: 'your-app-key',
});

// Send verification code
await auth.sendCode('+8613800138000');

// Login with code
const result = await auth.loginWithCode('+8613800138000', '123456');
console.log(result.user);
```

## Features

- ✅ Phone/Email login
- ✅ OAuth social login
- ✅ Automatic token refresh
- ✅ TypeScript support
- ✅ Retry with exponential backoff

## API Reference

[View full API documentation](https://docs.uniauth.com/sdk/client)
```

**验收标准**:
- [ ] 每个 SDK 有完整 README
- [ ] 包含安装、使用、API 说明
- [ ] 中英双语

---

## 📋 Phase 6: 集成测试 & 发布准备 (Week 6)

**目标**: 完成最终验收，准备商业化发布

### 6.1 全量集成测试 [P0]
**预计工时**: 2 天

**测试清单**:
- [ ] 所有 API 端点功能测试
- [ ] OAuth2 授权流程完整测试
- [ ] SDK 客户端集成测试
- [ ] 多实例部署测试
- [ ] 故障转移测试

---

### 6.2 安全审计 [P0]
**预计工时**: 1 天

**审计清单**:
- [ ] OWASP Top 10 检查
- [ ] 依赖漏洞扫描 (npm audit)
- [ ] 敏感数据泄露检查
- [ ] API 安全测试

---

### 6.3 性能基线测试 [P1]
**预计工时**: 1 天

```bash
# 使用 k6 进行负载测试
k6 run --vus 100 --duration 5m scripts/load-test.js
```

**性能目标**:
| 指标 | 目标 |
|------|------|
| P95 延迟 | < 200ms |
| 错误率 | < 0.1% |
| RPS | > 1000 |

---

### 6.4 发布检查清单 [P0]
**预计工时**: 1 天

**发布前检查**:
- [ ] 所有测试通过
- [ ] 文档完整更新
- [ ] CHANGELOG 编写
- [ ] 版本号更新
- [ ] Docker 镜像构建测试
- [ ] 生产环境配置验证
- [ ] 回滚计划准备

---

## 📊 资源与依赖

### 新增依赖项

```json
{
  "dependencies": {
    "@sentry/node": "^7.x",
    "@upstash/redis": "^1.x",
    "bcryptjs": "^2.x",
    "pino": "^8.x",
    "prom-client": "^15.x",
    "hono-rate-limiter": "^0.x"
  },
  "devDependencies": {
    "@playwright/test": "^1.x",
    "pino-pretty": "^10.x",
    "@types/bcryptjs": "^2.x"
  }
}
```

### 基础设施需求

| 服务 | 用途 | 预估成本/月 |
|------|------|------------|
| Upstash Redis | 缓存 + Rate Limiting | $10-50 |
| Sentry | 错误追踪 | $0-26 (Free tier) |
| Cloud Run | 容器部署 | $20-100 |

---

## ✅ 验收标准总结

### Phase 1 完成标准
- [ ] P0/P1 安全问题清零
- [ ] PKCE 支持上线
- [ ] Rate Limiting 生效

### Phase 2 完成标准
- [ ] 结构化日志输出
- [ ] Sentry 错误追踪
- [ ] 健康检查完善

### Phase 3 完成标准
- [ ] Docker 部署就绪
- [ ] Redis 缓存运行
- [ ] 支持水平扩展

### Phase 4 完成标准
- [ ] 核心代码覆盖率 ≥ 80%
- [ ] 集成测试通过
- [ ] E2E 测试就绪

### Phase 5 完成标准
- [ ] SDK NPM 发布就绪
- [ ] API 文档完整
- [ ] 开发者指南更新

### Phase 6 完成标准
- [ ] 全量测试通过
- [ ] 安全审计完成
- [ ] 性能基线达标

---

## 📞 联系方式

如有问题，请联系项目负责人。

---

*计划更新日期: 2025-12-22*
