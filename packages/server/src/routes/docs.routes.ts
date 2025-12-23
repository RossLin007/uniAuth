/**
 * OpenAPI/Swagger Documentation
 * OpenAPI/Swagger 文档
 * 
 * Provides interactive API documentation using Swagger UI
 * 使用 Swagger UI 提供交互式 API 文档
 */

import { Hono } from 'hono';
import { swaggerUI } from '@hono/swagger-ui';
import type { HonoVariables } from '../types/index.js';

const docsRouter = new Hono<{ Variables: HonoVariables }>();

/**
 * OpenAPI 3.0 Specification
 * OpenAPI 3.0 规范
 */
const openApiSpec = {
    openapi: '3.0.3',
    info: {
        title: 'UniAuth API',
        description: `
# UniAuth 统一认证服务 API

UniAuth 是一个现代化的统一认证服务，支持多种登录方式和 OAuth 2.0 提供商功能。

## 特性

- 📱 手机验证码登录
- 📧 邮箱密码登录
- 🔐 OAuth 2.0 社交登录 (Google, GitHub, WeChat)
- 🎫 JWT Token 管理
- 🔄 Token 自动刷新
- 📊 多设备会话管理
- 🏢 OAuth 2.0 Provider 能力

## 认证方式

大多数 API 需要在请求头中携带 Bearer Token：

\`\`\`
Authorization: Bearer <access_token>
\`\`\`

## 错误处理

所有 API 返回统一的错误格式：

\`\`\`json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message"
  }
}
\`\`\`
        `,
        version: '1.0.0',
        contact: {
            name: 'UniAuth Support',
            url: 'https://github.com/your-org/uniauth',
        },
        license: {
            name: 'MIT',
            url: 'https://opensource.org/licenses/MIT',
        },
    },
    servers: [
        {
            url: 'http://localhost:3000',
            description: 'Development Server',
        },
        {
            url: 'https://auth.example.com',
            description: 'Production Server',
        },
    ],
    tags: [
        { name: 'Health', description: '健康检查 / Health Check' },
        { name: 'Authentication', description: '认证相关 / Authentication' },
        { name: 'User', description: '用户管理 / User Management' },
        { name: 'OAuth2', description: 'OAuth 2.0 提供商 / OAuth 2.0 Provider' },
    ],
    paths: {
        // Health Check
        '/health': {
            get: {
                tags: ['Health'],
                summary: '简单健康检查 / Simple Health Check',
                description: '返回服务运行状态，用于负载均衡器',
                responses: {
                    200: {
                        description: '服务正常',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        status: { type: 'string', example: 'ok' },
                                        timestamp: { type: 'string', format: 'date-time' },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
        '/health/ready': {
            get: {
                tags: ['Health'],
                summary: '就绪检查 / Readiness Check',
                description: '深度健康检查，验证数据库和 Redis 连接',
                responses: {
                    200: {
                        description: '所有依赖正常',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        status: { type: 'string', enum: ['healthy', 'degraded'] },
                                        checks: {
                                            type: 'object',
                                            properties: {
                                                database: { type: 'object' },
                                                redis: { type: 'object' },
                                                memory: { type: 'object' },
                                            },
                                        },
                                        version: { type: 'string' },
                                        uptime: { type: 'number' },
                                    },
                                },
                            },
                        },
                    },
                    503: {
                        description: '服务降级',
                    },
                },
            },
        },

        // Authentication
        '/api/v1/auth/send-code': {
            post: {
                tags: ['Authentication'],
                summary: '发送验证码 / Send Verification Code',
                description: '向手机或邮箱发送验证码',
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    phone: { type: 'string', example: '+8613800138000' },
                                    email: { type: 'string', format: 'email' },
                                    type: {
                                        type: 'string',
                                        enum: ['login', 'register', 'reset', 'email_verify'],
                                        default: 'login'
                                    },
                                },
                                oneOf: [
                                    { required: ['phone'] },
                                    { required: ['email'] },
                                ],
                            },
                        },
                    },
                },
                responses: {
                    200: {
                        description: '验证码发送成功',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean', example: true },
                                        data: {
                                            type: 'object',
                                            properties: {
                                                expires_in: { type: 'number', example: 300 },
                                                retry_after: { type: 'number', example: 60 },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                    429: {
                        description: '请求过于频繁',
                    },
                },
            },
        },
        '/api/v1/auth/verify-code': {
            post: {
                tags: ['Authentication'],
                summary: '验证码登录 / Login with Code',
                description: '使用验证码登录或注册',
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    phone: { type: 'string', example: '+8613800138000' },
                                    email: { type: 'string', format: 'email' },
                                    code: { type: 'string', example: '123456' },
                                },
                                required: ['code'],
                            },
                        },
                    },
                },
                responses: {
                    200: {
                        description: '登录成功',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/LoginResponse' },
                            },
                        },
                    },
                    401: {
                        description: '验证码错误或已过期',
                    },
                },
            },
        },
        '/api/v1/auth/login': {
            post: {
                tags: ['Authentication'],
                summary: '邮箱密码登录 / Email Login',
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    email: { type: 'string', format: 'email' },
                                    password: { type: 'string', minLength: 8 },
                                },
                                required: ['email', 'password'],
                            },
                        },
                    },
                },
                responses: {
                    200: {
                        description: '登录成功',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/LoginResponse' },
                            },
                        },
                    },
                    401: {
                        description: '邮箱或密码错误',
                    },
                },
            },
        },
        '/api/v1/auth/refresh': {
            post: {
                tags: ['Authentication'],
                summary: '刷新令牌 / Refresh Token',
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    refresh_token: { type: 'string' },
                                },
                                required: ['refresh_token'],
                            },
                        },
                    },
                },
                responses: {
                    200: {
                        description: '刷新成功',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean' },
                                        data: {
                                            type: 'object',
                                            properties: {
                                                access_token: { type: 'string' },
                                                refresh_token: { type: 'string' },
                                                expires_in: { type: 'number' },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
        '/api/v1/auth/logout': {
            post: {
                tags: ['Authentication'],
                summary: '登出 / Logout',
                security: [{ bearerAuth: [] }],
                requestBody: {
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    refresh_token: { type: 'string' },
                                },
                            },
                        },
                    },
                },
                responses: {
                    200: {
                        description: '登出成功',
                    },
                },
            },
        },

        // User
        '/api/v1/user/me': {
            get: {
                tags: ['User'],
                summary: '获取当前用户 / Get Current User',
                security: [{ bearerAuth: [] }],
                responses: {
                    200: {
                        description: '成功',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/UserResponse' },
                            },
                        },
                    },
                    401: {
                        description: '未认证',
                    },
                },
            },
            patch: {
                tags: ['User'],
                summary: '更新用户资料 / Update Profile',
                security: [{ bearerAuth: [] }],
                requestBody: {
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    nickname: { type: 'string' },
                                    avatar_url: { type: 'string', format: 'uri' },
                                },
                            },
                        },
                    },
                },
                responses: {
                    200: {
                        description: '更新成功',
                    },
                },
            },
        },
        '/api/v1/user/sessions': {
            get: {
                tags: ['User'],
                summary: '获取登录设备 / Get Sessions',
                security: [{ bearerAuth: [] }],
                responses: {
                    200: {
                        description: '成功',
                    },
                },
            },
        },

        // OAuth2 Provider
        '/api/v1/oauth2/validate': {
            get: {
                tags: ['OAuth2'],
                summary: '验证客户端 / Validate Client',
                description: '验证 OAuth2 客户端信息和回调地址',
                parameters: [
                    { name: 'client_id', in: 'query', required: true, schema: { type: 'string' } },
                    { name: 'redirect_uri', in: 'query', required: true, schema: { type: 'string', format: 'uri' } },
                    { name: 'response_type', in: 'query', required: true, schema: { type: 'string', enum: ['code'] } },
                    { name: 'scope', in: 'query', schema: { type: 'string' } },
                    { name: 'state', in: 'query', schema: { type: 'string' } },
                    { name: 'code_challenge', in: 'query', schema: { type: 'string', description: 'PKCE code challenge' } },
                    { name: 'code_challenge_method', in: 'query', schema: { type: 'string', enum: ['S256', 'plain'] } },
                ],
                responses: {
                    200: {
                        description: '客户端验证成功',
                    },
                    400: {
                        description: '无效的客户端或回调地址',
                    },
                },
            },
        },
        '/api/v1/oauth2/authorize': {
            post: {
                tags: ['OAuth2'],
                summary: '授权请求 / Authorization Request',
                description: '用户同意授权后调用，生成授权码',
                security: [{ bearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    client_id: { type: 'string' },
                                    redirect_uri: { type: 'string', format: 'uri' },
                                    response_type: { type: 'string', enum: ['code'] },
                                    scope: { type: 'string' },
                                    state: { type: 'string' },
                                    code_challenge: { type: 'string' },
                                    code_challenge_method: { type: 'string', enum: ['S256', 'plain'] },
                                },
                                required: ['client_id', 'redirect_uri', 'response_type'],
                            },
                        },
                    },
                },
                responses: {
                    200: {
                        description: '授权成功，返回重定向 URL',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean' },
                                        data: {
                                            type: 'object',
                                            properties: {
                                                redirect_url: { type: 'string', format: 'uri' },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
        '/api/v1/oauth2/token': {
            post: {
                tags: ['OAuth2'],
                summary: '令牌交换 / Token Exchange',
                description: '使用授权码换取访问令牌',
                requestBody: {
                    required: true,
                    content: {
                        'application/x-www-form-urlencoded': {
                            schema: {
                                type: 'object',
                                properties: {
                                    grant_type: { type: 'string', enum: ['authorization_code'] },
                                    client_id: { type: 'string' },
                                    client_secret: { type: 'string' },
                                    code: { type: 'string' },
                                    redirect_uri: { type: 'string', format: 'uri' },
                                    code_verifier: { type: 'string', description: 'PKCE code verifier' },
                                },
                                required: ['grant_type', 'client_id', 'code', 'redirect_uri'],
                            },
                        },
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    grant_type: { type: 'string', enum: ['authorization_code'] },
                                    client_id: { type: 'string' },
                                    client_secret: { type: 'string' },
                                    code: { type: 'string' },
                                    redirect_uri: { type: 'string', format: 'uri' },
                                    code_verifier: { type: 'string' },
                                },
                                required: ['grant_type', 'client_id', 'code', 'redirect_uri'],
                            },
                        },
                    },
                },
                responses: {
                    200: {
                        description: '令牌交换成功',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/OAuth2TokenResponse' },
                            },
                        },
                    },
                    400: {
                        description: '请求无效',
                    },
                },
            },
        },
        '/api/v1/oauth2/userinfo': {
            get: {
                tags: ['OAuth2'],
                summary: '用户信息 / User Info',
                description: 'OIDC 兼容的用户信息端点',
                security: [{ bearerAuth: [] }],
                responses: {
                    200: {
                        description: '成功',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        sub: { type: 'string', description: 'User ID' },
                                        name: { type: 'string' },
                                        email: { type: 'string' },
                                        email_verified: { type: 'boolean' },
                                        phone_number: { type: 'string' },
                                        phone_number_verified: { type: 'boolean' },
                                        picture: { type: 'string', format: 'uri' },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
    },
    components: {
        securitySchemes: {
            bearerAuth: {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT',
                description: 'JWT Access Token',
            },
        },
        schemas: {
            LoginResponse: {
                type: 'object',
                properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                        type: 'object',
                        properties: {
                            user: { $ref: '#/components/schemas/User' },
                            access_token: { type: 'string' },
                            refresh_token: { type: 'string' },
                            expires_in: { type: 'number', example: 3600 },
                            is_new_user: { type: 'boolean' },
                        },
                    },
                },
            },
            UserResponse: {
                type: 'object',
                properties: {
                    success: { type: 'boolean' },
                    data: { $ref: '#/components/schemas/User' },
                },
            },
            User: {
                type: 'object',
                properties: {
                    id: { type: 'string', format: 'uuid' },
                    phone: { type: 'string', nullable: true },
                    email: { type: 'string', format: 'email', nullable: true },
                    nickname: { type: 'string', nullable: true },
                    avatar_url: { type: 'string', format: 'uri', nullable: true },
                },
            },
            OAuth2TokenResponse: {
                type: 'object',
                properties: {
                    access_token: { type: 'string' },
                    token_type: { type: 'string', example: 'Bearer' },
                    expires_in: { type: 'number', example: 3600 },
                    refresh_token: { type: 'string' },
                },
            },
            Error: {
                type: 'object',
                properties: {
                    success: { type: 'boolean', example: false },
                    error: {
                        type: 'object',
                        properties: {
                            code: { type: 'string' },
                            message: { type: 'string' },
                        },
                    },
                },
            },
        },
    },
};

/**
 * GET /docs
 * Swagger UI
 */
docsRouter.get(
    '/docs',
    swaggerUI({
        url: '/docs/openapi.json',
    })
);

/**
 * GET /docs/openapi.json
 * OpenAPI JSON Specification
 */
docsRouter.get('/docs/openapi.json', (c) => {
    return c.json(openApiSpec);
});

export { docsRouter, openApiSpec };
