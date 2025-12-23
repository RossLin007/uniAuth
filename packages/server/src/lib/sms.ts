/**
 * Unified SMS Service
 * 统一短信服务
 *
 * Supports multiple SMS providers with automatic routing:
 * 支持多个短信供应商，自动路由：
 * 
 * - China (+86) → Tencent Cloud SMS (cheaper, faster)
 * - International → Twilio (better coverage)
 */

import { env } from '../config/index.js';
import { logger } from './logger.js';
import {
    sendViaTwilio,
    sendViaTencent,
    isTwilioConfigured,
    isTencentConfigured,
} from './sms-providers/index.js';

/**
 * SMS Provider type
 * 短信供应商类型
 */
export type SmsProvider = 'twilio' | 'tencent' | 'auto';

/**
 * Determine which SMS provider to use based on phone number
 * 根据手机号确定使用哪个短信供应商
 *
 * Strategy:
 * - China (+86) → Tencent Cloud (cheaper, faster for China)
 * - Other countries → Twilio (better international coverage)
 * 
 * 策略：
 * - 中国大陆号码 (+86) → 腾讯云（比较成本更便宜、速度更快）
 * - 其他国际号码 → Twilio（覆盖面更广）
 */
function getProviderForPhone(phone: string): 'twilio' | 'tencent' {
    // China mainland numbers use Tencent Cloud
    if (phone.startsWith('+86')) {
        // Check if Tencent is configured, fallback to Twilio if not
        if (isTencentConfigured()) {
            return 'tencent';
        }
        logger.warn('Tencent SMS not configured, falling back to Twilio for China number');
    }

    // International numbers use Twilio
    if (isTwilioConfigured()) {
        return 'twilio';
    }

    // Fallback: if only Tencent is configured, use it for all numbers
    if (isTencentConfigured()) {
        logger.warn('Twilio not configured, using Tencent for international number');
        return 'tencent';
    }

    // This shouldn't happen if at least one provider is configured
    throw new Error('No SMS provider configured');
}

/**
 * Get the configured SMS provider from environment
 * 从环境变量获取配置的短信供应商
 */
function getConfiguredProvider(): SmsProvider {
    const provider = env.SMS_PROVIDER?.toLowerCase() as SmsProvider | undefined;

    if (provider === 'twilio' || provider === 'tencent' || provider === 'auto') {
        return provider;
    }

    // Default to 'auto' if not specified or invalid
    return 'auto';
}

/**
 * Send verification code via SMS
 * 通过短信发送验证码
 *
 * @param phone - Phone number with country code (e.g., +8613800138000, +15551234567)
 * @param code - 6-digit verification code
 * @returns Promise<boolean> - Whether the SMS was sent successfully
 */
export async function sendVerificationSms(
    phone: string,
    code: string
): Promise<boolean> {
    const configuredProvider = getConfiguredProvider();

    // Determine actual provider to use
    let provider: 'twilio' | 'tencent';

    if (configuredProvider === 'auto') {
        provider = getProviderForPhone(phone);
        logger.info('Auto-selected SMS provider', {
            phone: phone.substring(0, 4) + '****',
            provider,
        });
    } else {
        provider = configuredProvider;
    }

    // Send SMS based on provider
    logger.info('Sending verification SMS', {
        phone: phone.substring(0, 4) + '****',
        provider,
    });

    switch (provider) {
        case 'twilio':
            if (!isTwilioConfigured()) {
                logger.error('Twilio is not configured');
                return false;
            }
            return await sendViaTwilio(phone, code);

        case 'tencent':
            if (!isTencentConfigured()) {
                logger.error('Tencent SMS is not configured');
                return false;
            }
            return await sendViaTencent(phone, code);

        default:
            logger.error('Unknown SMS provider', { provider });
            return false;
    }
}

/**
 * Generate a random verification code
 * 生成随机验证码
 *
 * @param length - Code length (default: 6)
 * @returns string - Random numeric code
 */
export function generateVerificationCode(length: number = 6): string {
    const min = Math.pow(10, length - 1);
    const max = Math.pow(10, length) - 1;
    return Math.floor(min + Math.random() * (max - min + 1)).toString();
}

/**
 * Check if any SMS provider is available
 * 检查是否有可用的短信供应商
 */
export function isSmsConfigured(): boolean {
    return isTwilioConfigured() || isTencentConfigured();
}

/**
 * Get available SMS providers
 * 获取可用的短信供应商列表
 */
export function getAvailableProviders(): string[] {
    const providers: string[] = [];
    if (isTencentConfigured()) providers.push('tencent');
    if (isTwilioConfigured()) providers.push('twilio');
    return providers;
}
