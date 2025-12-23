/**
 * Tencent Cloud SMS Provider
 * 腾讯云短信服务提供商
 * 
 * 用于发送中国大陆短信，价格便宜、速度快
 * Used for sending SMS to mainland China, cost-effective and fast
 */

import * as sms from 'tencentcloud-sdk-nodejs-sms';
import { env } from '../../config/index.js';
import { logger } from '../logger.js';

const SmsClient = sms.sms.v20210111.Client;

/**
 * SMS client instance (singleton)
 * 短信客户端实例（单例）
 */
let smsClient: InstanceType<typeof SmsClient> | null = null;

/**
 * Check if Tencent SMS is configured
 * 检查腾讯云短信是否已配置
 */
export function isTencentConfigured(): boolean {
    return !!(
        env.TENCENT_SECRET_ID &&
        env.TENCENT_SECRET_KEY &&
        env.TENCENT_SMS_SDK_APP_ID &&
        env.TENCENT_SMS_SIGN_NAME &&
        env.TENCENT_SMS_TEMPLATE_ID
    );
}

/**
 * Get SMS client (singleton pattern)
 * 获取短信客户端（单例模式）
 */
function getSmsClient(): InstanceType<typeof SmsClient> {
    if (!smsClient) {
        smsClient = new SmsClient({
            credential: {
                secretId: env.TENCENT_SECRET_ID,
                secretKey: env.TENCENT_SECRET_KEY,
            },
            region: 'ap-guangzhou',
            profile: {
                httpProfile: {
                    reqMethod: 'POST',
                    reqTimeout: 30,
                },
            },
        });
    }
    return smsClient;
}

/**
 * Send verification SMS via Tencent Cloud
 * 通过腾讯云发送验证短信
 *
 * @param phone - Phone number with country code (e.g., +8613800138000)
 * @param code - 6-digit verification code
 * @returns Promise<boolean> - Whether the SMS was sent successfully
 */
export async function sendViaTencent(
    phone: string,
    code: string
): Promise<boolean> {
    try {
        // Validate required configuration
        if (!env.TENCENT_SMS_SDK_APP_ID || !env.TENCENT_SMS_SIGN_NAME || !env.TENCENT_SMS_TEMPLATE_ID) {
            logger.error('Tencent SMS configuration incomplete');
            return false;
        }

        const client = getSmsClient();

        const params = {
            PhoneNumberSet: [phone],
            SmsSdkAppId: env.TENCENT_SMS_SDK_APP_ID,
            SignName: env.TENCENT_SMS_SIGN_NAME,
            TemplateId: env.TENCENT_SMS_TEMPLATE_ID,
            TemplateParamSet: [code],
        };

        const response = await client.SendSms(params);

        // Check if all messages were sent successfully
        const allSuccess = response.SendStatusSet?.every(
            (status) => status.Code === 'Ok'
        );

        if (!allSuccess) {
            logger.error('Tencent SMS send failed', {
                phone: phone.substring(0, 4) + '****',
                statusSet: response.SendStatusSet,
            });
            return false;
        }

        logger.info('Tencent SMS sent successfully', {
            phone: phone.substring(0, 4) + '****',
        });

        return true;
    } catch (error) {
        logger.error('Tencent SMS error', {
            phone: phone.substring(0, 4) + '****',
            error: error instanceof Error ? error.message : String(error),
        });
        return false;
    }
}
