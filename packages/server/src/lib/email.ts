/**
 * Email Service
 * 邮件服务
 *
 * Provides email sending functionality using nodemailer.
 * 使用 nodemailer 提供邮件发送功能。
 */

import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { env } from '../config/index.js';
import { logger } from './logger.js';

/**
 * Email transporter instance (singleton)
 * 邮件传输实例（单例）
 */
let transporter: Transporter | null = null;

/**
 * Check if email service is configured
 * 检查邮件服务是否已配置
 */
export function isEmailConfigured(): boolean {
    return !!(
        env.SMTP_HOST &&
        env.SMTP_PORT &&
        env.SMTP_USER &&
        env.SMTP_PASS
    );
}

/**
 * Get email transporter (singleton pattern)
 * 获取邮件传输实例（单例模式）
 */
function getTransporter(): Transporter {
    if (!transporter) {
        if (!isEmailConfigured()) {
            throw new Error('SMTP configuration is incomplete');
        }

        transporter = nodemailer.createTransport({
            host: env.SMTP_HOST,
            port: env.SMTP_PORT,
            secure: env.SMTP_PORT === 465, // true for 465, false for other ports
            auth: {
                user: env.SMTP_USER,
                pass: env.SMTP_PASS,
            },
        });
    }
    return transporter;
}

/**
 * Email template for verification code
 * 验证码邮件模板
 */
function getVerificationEmailHtml(code: string, type: string): string {
    const typeLabels: Record<string, { zh: string; en: string }> = {
        email_verify: { zh: '邮箱验证', en: 'Email Verification' },
        login: { zh: '登录验证', en: 'Login Verification' },
        register: { zh: '注册验证', en: 'Registration Verification' },
        reset: { zh: '密码重置', en: 'Password Reset' },
    };

    const label = typeLabels[type] || typeLabels.email_verify;

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>UniAuth - ${label.zh}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #1e293b;
            margin: 0;
            padding: 0;
            background-color: #f8fafc;
        }
        .container {
            max-width: 480px;
            margin: 40px auto;
            padding: 32px;
            background: white;
            border-radius: 16px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
        }
        .logo {
            text-align: center;
            margin-bottom: 24px;
        }
        .logo h1 {
            color: #0ea5e9;
            font-size: 28px;
            margin: 0;
        }
        .title {
            text-align: center;
            color: #64748b;
            font-size: 14px;
            margin-bottom: 32px;
        }
        .code-box {
            background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
            border-radius: 12px;
            padding: 24px;
            text-align: center;
            margin: 24px 0;
        }
        .code {
            font-size: 36px;
            font-weight: bold;
            letter-spacing: 8px;
            color: #0ea5e9;
            font-family: 'SF Mono', Monaco, 'Courier New', monospace;
        }
        .info {
            color: #64748b;
            font-size: 14px;
            text-align: center;
            margin-top: 24px;
        }
        .warning {
            background: #fef3c7;
            border-radius: 8px;
            padding: 12px 16px;
            font-size: 13px;
            color: #92400e;
            margin-top: 24px;
        }
        .footer {
            text-align: center;
            margin-top: 32px;
            padding-top: 24px;
            border-top: 1px solid #e2e8f0;
            color: #94a3b8;
            font-size: 12px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="logo">
            <h1>🔐 UniAuth</h1>
        </div>
        <div class="title">${label.zh} / ${label.en}</div>
        
        <p>您好，</p>
        <p>您正在进行${label.zh}操作，请使用以下验证码：</p>
        
        <div class="code-box">
            <div class="code">${code}</div>
        </div>
        
        <div class="info">
            验证码有效期为 <strong>5 分钟</strong><br>
            This code will expire in <strong>5 minutes</strong>
        </div>
        
        <div class="warning">
            ⚠️ 如果您没有请求此验证码，请忽略本邮件。请勿将验证码分享给任何人。<br>
            If you didn't request this code, please ignore this email. Never share this code with anyone.
        </div>
        
        <div class="footer">
            此邮件由系统自动发送，请勿回复。<br>
            This is an automated message, please do not reply.<br>
            © ${new Date().getFullYear()} UniAuth
        </div>
    </div>
</body>
</html>
    `.trim();
}

/**
 * Email template for plain text (fallback)
 * 纯文本邮件模板（备用）
 */
function getVerificationEmailText(code: string, type: string): string {
    const typeLabels: Record<string, string> = {
        email_verify: '邮箱验证',
        login: '登录验证',
        register: '注册验证',
        reset: '密码重置',
    };

    const label = typeLabels[type] || '邮箱验证';

    return `
UniAuth ${label}

您好，

您正在进行${label}操作，您的验证码是：

${code}

验证码有效期为 5 分钟。

如果您没有请求此验证码，请忽略本邮件。

---
此邮件由系统自动发送，请勿回复。
© ${new Date().getFullYear()} UniAuth
    `.trim();
}

/**
 * Send verification email
 * 发送验证码邮件
 *
 * @param to - Recipient email address
 * @param code - Verification code
 * @param type - Verification type
 * @returns Promise<boolean> - Whether the email was sent successfully
 */
export async function sendVerificationEmail(
    to: string,
    code: string,
    type: 'email_verify' | 'login' | 'register' | 'reset' = 'email_verify'
): Promise<boolean> {
    // In development mode without SMTP, just log the code
    if (!isEmailConfigured()) {
        if (env.NODE_ENV === 'development') {
            logger.info('Email not configured, logging verification code', {
                email: to.substring(0, 3) + '***',
                code,
                type,
            });
            console.log(`\n📧 ========== EMAIL VERIFICATION CODE ==========`);
            console.log(`📧 To: ${to}`);
            console.log(`📧 Type: ${type}`);
            console.log(`📧 Code: ${code}`);
            console.log(`📧 ===============================================\n`);
            return true;
        }
        logger.error('Email service not configured');
        return false;
    }

    try {
        const transport = getTransporter();

        const typeSubjects: Record<string, string> = {
            email_verify: '邮箱验证码 / Email Verification Code',
            login: '登录验证码 / Login Verification Code',
            register: '注册验证码 / Registration Verification Code',
            reset: '密码重置验证码 / Password Reset Code',
        };

        const mailOptions = {
            from: `"UniAuth" <${env.SMTP_FROM || env.SMTP_USER}>`,
            to,
            subject: `【UniAuth】${typeSubjects[type] || typeSubjects.email_verify}`,
            text: getVerificationEmailText(code, type),
            html: getVerificationEmailHtml(code, type),
        };

        const info = await transport.sendMail(mailOptions);

        logger.info('Verification email sent', {
            to: to.substring(0, 3) + '***',
            type,
            messageId: info.messageId,
        });

        return true;
    } catch (error) {
        logger.error('Failed to send verification email', {
            to: to.substring(0, 3) + '***',
            type,
            error: error instanceof Error ? error.message : String(error),
        });
        return false;
    }
}

/**
 * Send password reset email
 * 发送密码重置邮件
 */
export async function sendPasswordResetEmail(
    to: string,
    code: string
): Promise<boolean> {
    return sendVerificationEmail(to, code, 'reset');
}

/**
 * Send welcome email
 * 发送欢迎邮件
 */
export async function sendWelcomeEmail(
    to: string,
    nickname?: string
): Promise<boolean> {
    if (!isEmailConfigured()) {
        logger.warn('Email service not configured, skipping welcome email');
        return true;
    }

    try {
        const transport = getTransporter();

        const displayName = nickname || to.split('@')[0];

        const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Welcome to UniAuth</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #1e293b;
            background-color: #f8fafc;
            margin: 0;
            padding: 0;
        }
        .container {
            max-width: 480px;
            margin: 40px auto;
            padding: 32px;
            background: white;
            border-radius: 16px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
        }
        .logo { text-align: center; margin-bottom: 24px; }
        .logo h1 { color: #0ea5e9; font-size: 28px; margin: 0; }
        h2 { color: #1e293b; margin-bottom: 16px; }
        .footer {
            text-align: center;
            margin-top: 32px;
            padding-top: 24px;
            border-top: 1px solid #e2e8f0;
            color: #94a3b8;
            font-size: 12px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="logo"><h1>🔐 UniAuth</h1></div>
        <h2>欢迎加入 UniAuth！</h2>
        <p>Hi ${displayName}，</p>
        <p>感谢您注册 UniAuth。您现在可以使用统一账号享受所有服务。</p>
        <p>Thank you for joining UniAuth. You can now use one account for all services.</p>
        <div class="footer">
            © ${new Date().getFullYear()} UniAuth
        </div>
    </div>
</body>
</html>
        `.trim();

        await transport.sendMail({
            from: `"UniAuth" <${env.SMTP_FROM || env.SMTP_USER}>`,
            to,
            subject: '欢迎加入 UniAuth / Welcome to UniAuth',
            html,
        });

        logger.info('Welcome email sent', { to: to.substring(0, 3) + '***' });
        return true;
    } catch (error) {
        logger.error('Failed to send welcome email', {
            to: to.substring(0, 3) + '***',
            error: error instanceof Error ? error.message : String(error),
        });
        return false;
    }
}
