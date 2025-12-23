/**
 * Twilio SMS Provider
 * Twilio 短信服务提供商
 * 
 * 用于发送国际短信，覆盖 180+ 国家
 * Used for sending international SMS, covering 180+ countries
 */

import twilio, { Twilio } from 'twilio';
import { env } from '../../config/index.js';
import { logger } from '../logger.js';

/**
 * Twilio SMS client instance (singleton)
 * Twilio 短信客户端实例（单例）
 */
let twilioClient: Twilio | null = null;

/**
 * Check if Twilio is configured
 * 检查 Twilio 是否已配置
 */
export function isTwilioConfigured(): boolean {
    return !!(
        env.TWILIO_ACCOUNT_SID &&
        env.TWILIO_AUTH_TOKEN &&
        (env.TWILIO_PHONE_NUMBER || env.TWILIO_MESSAGING_SERVICE_SID)
    );
}

/**
 * Get Twilio client (singleton pattern)
 * 获取 Twilio 客户端（单例模式）
 */
function getTwilioClient(): Twilio {
    if (!twilioClient) {
        if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN) {
            throw new Error('Twilio credentials not configured');
        }
        twilioClient = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);
    }
    return twilioClient;
}

/**
 * Send verification SMS via Twilio
 * 通过 Twilio 发送验证短信
 *
 * @param phone - Phone number with country code (E.164 format, e.g., +15551234567)
 * @param code - Verification code
 * @returns Promise<boolean> - Whether the SMS was sent successfully
 */
export async function sendViaTwilio(
    phone: string,
    code: string
): Promise<boolean> {
    try {
        const client = getTwilioClient();

        // Build message content (bilingual)
        // 构建短信内容（中英双语）
        const messageBody = `【UniAuth】Your verification code is: ${code}. Valid for 5 minutes. Do not share this code.\n您的验证码是：${code}，5分钟内有效，请勿泄露。`;

        // Build message options
        const messageOptions: {
            body: string;
            to: string;
            from?: string;
            messagingServiceSid?: string;
        } = {
            body: messageBody,
            to: phone,
        };

        // Prefer Messaging Service (recommended for production)
        // 优先使用 Messaging Service（推荐生产环境使用）
        if (env.TWILIO_MESSAGING_SERVICE_SID) {
            messageOptions.messagingServiceSid = env.TWILIO_MESSAGING_SERVICE_SID;
        } else if (env.TWILIO_PHONE_NUMBER) {
            messageOptions.from = env.TWILIO_PHONE_NUMBER;
        } else {
            throw new Error('No Twilio phone number or messaging service configured');
        }

        const message = await client.messages.create(messageOptions);

        // Check send status
        if (message.status === 'failed' || message.status === 'undelivered') {
            logger.error('Twilio SMS send failed', {
                phone: phone.substring(0, 4) + '****',
                status: message.status,
                errorCode: message.errorCode,
                errorMessage: message.errorMessage,
            });
            return false;
        }

        logger.info('Twilio SMS sent successfully', {
            phone: phone.substring(0, 4) + '****',
            sid: message.sid,
            status: message.status,
        });

        return true;
    } catch (error) {
        logger.error('Twilio SMS error', {
            phone: phone.substring(0, 4) + '****',
            error: error instanceof Error ? error.message : String(error),
        });
        return false;
    }
}

/**
 * Twilio Verify API - Send verification
 * Twilio Verify API - 发送验证码
 * 
 * This is an alternative approach using Twilio's dedicated Verify service
 * 这是使用 Twilio 专用 Verify 服务的替代方案
 */
export async function sendViaTwilioVerify(phone: string): Promise<boolean> {
    try {
        if (!env.TWILIO_VERIFY_SERVICE_SID) {
            throw new Error('Twilio Verify Service SID not configured');
        }

        const client = getTwilioClient();

        const verification = await client.verify.v2
            .services(env.TWILIO_VERIFY_SERVICE_SID)
            .verifications.create({
                to: phone,
                channel: 'sms',
            });

        logger.info('Twilio Verify sent', {
            phone: phone.substring(0, 4) + '****',
            status: verification.status,
        });

        return verification.status === 'pending';
    } catch (error) {
        logger.error('Twilio Verify error', {
            phone: phone.substring(0, 4) + '****',
            error: error instanceof Error ? error.message : String(error),
        });
        return false;
    }
}

/**
 * Twilio Verify API - Check verification code
 * Twilio Verify API - 验证验证码
 */
export async function checkViaTwilioVerify(
    phone: string,
    code: string
): Promise<boolean> {
    try {
        if (!env.TWILIO_VERIFY_SERVICE_SID) {
            throw new Error('Twilio Verify Service SID not configured');
        }

        const client = getTwilioClient();

        const verificationCheck = await client.verify.v2
            .services(env.TWILIO_VERIFY_SERVICE_SID)
            .verificationChecks.create({
                to: phone,
                code: code,
            });

        logger.info('Twilio Verify check', {
            phone: phone.substring(0, 4) + '****',
            status: verificationCheck.status,
        });

        return verificationCheck.status === 'approved';
    } catch (error) {
        logger.error('Twilio Verify check error', {
            phone: phone.substring(0, 4) + '****',
            error: error instanceof Error ? error.message : String(error),
        });
        return false;
    }
}
