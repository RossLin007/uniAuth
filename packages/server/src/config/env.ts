// Load environment variables from root .env file (before any validation)
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../../../../.env') });

import { z } from 'zod';

/**
 * Environment configuration schema
 * 环境配置验证
 */
const envSchema = z.object({
    // Server
    PORT: z.coerce.number().default(3000),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

    // Supabase
    SUPABASE_URL: z.string().url(),
    SUPABASE_ANON_KEY: z.string().min(1),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
    DATABASE_URL: z.string().optional(),

    // JWT
    JWT_SECRET: z.string().min(32),
    JWT_ACCESS_TOKEN_EXPIRES_IN: z.string().default('1h'),
    JWT_REFRESH_TOKEN_EXPIRES_IN: z.string().default('30d'),

    // SMS Provider Selection
    // 'twilio' | 'tencent' | 'auto' (auto routes based on phone country code)
    SMS_PROVIDER: z.enum(['twilio', 'tencent', 'auto']).default('auto'),

    // Twilio SMS (for international numbers)
    TWILIO_ACCOUNT_SID: z.string().optional(),
    TWILIO_AUTH_TOKEN: z.string().optional(),
    TWILIO_PHONE_NUMBER: z.string().optional(),
    TWILIO_MESSAGING_SERVICE_SID: z.string().optional(),
    TWILIO_VERIFY_SERVICE_SID: z.string().optional(),

    // Tencent SMS (for China +86 numbers, optional if using Twilio only)
    TENCENT_SECRET_ID: z.string().optional(),
    TENCENT_SECRET_KEY: z.string().optional(),
    TENCENT_SMS_SDK_APP_ID: z.string().optional(),
    TENCENT_SMS_SIGN_NAME: z.string().optional(),
    TENCENT_SMS_TEMPLATE_ID: z.string().optional(),

    // Email (optional - for email verification)
    SMTP_HOST: z.string().optional(),
    SMTP_PORT: z.coerce.number().optional(),
    SMTP_USER: z.string().optional(),
    SMTP_PASS: z.string().optional(),
    SMTP_FROM: z.string().optional(),

    // OAuth - Google (optional)
    GOOGLE_CLIENT_ID: z.string().optional(),
    GOOGLE_CLIENT_SECRET: z.string().optional(),
    GOOGLE_REDIRECT_URI: z.string().optional(),

    // OAuth - GitHub (optional)
    GITHUB_CLIENT_ID: z.string().optional(),
    GITHUB_CLIENT_SECRET: z.string().optional(),
    GITHUB_REDIRECT_URI: z.string().optional(),

    // OAuth - WeChat (optional)
    WECHAT_APP_ID: z.string().optional(),
    WECHAT_APP_SECRET: z.string().optional(),
    WECHAT_REDIRECT_URI: z.string().optional(),

    // OAuth - Apple (optional)
    APPLE_TEAM_ID: z.string().optional(),  // App Team ID
    APPLE_KEY_ID: z.string().optional(),   // Key ID from Apple Developer
    APPLE_CLIENT_ID: z.string().optional(), // Bundle ID or Service ID
    APPLE_REDIRECT_URI: z.string().optional(),
    // Private Key can be base64 string or pem
    APPLE_PRIVATE_KEY: z.string().optional(),

    // Redis (optional - for caching and rate limiting)
    REDIS_URL: z.string().optional(),

    // Upstash Redis (recommended for production)
    UPSTASH_REDIS_URL: z.string().optional(),
    UPSTASH_REDIS_TOKEN: z.string().optional(),

    // CORS
    CORS_ORIGINS: z.string().default('http://localhost:3000'),

    // Frontend URL (for redirects)
    FRONTEND_URL: z.string().default('http://localhost:5173'),

    // Logging
    LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),

    // Sentry (optional - for error tracking)
    SENTRY_DSN: z.string().optional(),

    // Metrics (optional)
    METRICS_TOKEN: z.string().optional(),

    // WebAuthn / Passkey
    RP_ID: z.string().optional(), // Relying Party ID (domain)
    RP_ORIGIN: z.string().optional(), // Relying Party Origin (full URL)

    // Security
    RATE_LIMIT_ENABLED: z.coerce.boolean().default(true),

    // Test mode (for development)
    TEST_VERIFICATION_CODE: z.string().optional(),
});

/**
 * Parse and validate environment variables
 * 解析并验证环境变量
 */
function parseEnv() {
    const result = envSchema.safeParse(process.env);

    if (!result.success) {
        console.error('❌ Invalid environment variables:');
        console.error(result.error.format());
        throw new Error('Invalid environment configuration');
    }

    return result.data;
}

export const env = parseEnv();

export type Env = z.infer<typeof envSchema>;
