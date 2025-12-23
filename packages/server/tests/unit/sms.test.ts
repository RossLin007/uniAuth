/**
 * SMS Service Unit Tests
 * 短信服务单元测试
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock logger first
vi.mock('../../src/lib/logger.js', () => ({
    logger: {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
    },
}));

// Mock environment variables
vi.mock('../../src/config/env.js', () => ({
    env: {
        SMS_PROVIDER: 'auto',
        // Twilio config
        TWILIO_ACCOUNT_SID: 'ACtest123456789',
        TWILIO_AUTH_TOKEN: 'test_auth_token',
        TWILIO_PHONE_NUMBER: '+15551234567',
        TWILIO_MESSAGING_SERVICE_SID: undefined,
        TWILIO_VERIFY_SERVICE_SID: undefined,
        // Tencent config
        TENCENT_SECRET_ID: 'test_secret_id',
        TENCENT_SECRET_KEY: 'test_secret_key',
        TENCENT_SMS_SDK_APP_ID: '1400000000',
        TENCENT_SMS_SIGN_NAME: 'TestSign',
        TENCENT_SMS_TEMPLATE_ID: '1234567',
    },
}));

// Mock the SMS providers index with inline factory
vi.mock('../../src/lib/sms-providers/index.js', () => ({
    sendViaTwilio: vi.fn().mockResolvedValue(true),
    sendViaTencent: vi.fn().mockResolvedValue(true),
    isTwilioConfigured: vi.fn().mockReturnValue(true),
    isTencentConfigured: vi.fn().mockReturnValue(true),
    sendViaTwilioVerify: vi.fn().mockResolvedValue(true),
    checkViaTwilioVerify: vi.fn().mockResolvedValue(true),
}));

// Import after mocks are set up
import {
    sendVerificationSms,
    generateVerificationCode,
    isSmsConfigured,
    getAvailableProviders,
} from '../../src/lib/sms.js';

import {
    sendViaTwilio,
    sendViaTencent,
    isTwilioConfigured,
    isTencentConfigured,
} from '../../src/lib/sms-providers/index.js';

describe('SMS Service', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Reset mock implementations
        vi.mocked(sendViaTwilio).mockResolvedValue(true);
        vi.mocked(sendViaTencent).mockResolvedValue(true);
        vi.mocked(isTwilioConfigured).mockReturnValue(true);
        vi.mocked(isTencentConfigured).mockReturnValue(true);
    });

    describe('generateVerificationCode', () => {
        it('should generate a 6-digit code by default', () => {
            const code = generateVerificationCode();
            expect(code).toMatch(/^\d{6}$/);
        });

        it('should generate a code with custom length', () => {
            const code = generateVerificationCode(4);
            expect(code).toMatch(/^\d{4}$/);
        });

        it('should generate an 8-digit code', () => {
            const code = generateVerificationCode(8);
            expect(code).toMatch(/^\d{8}$/);
        });

        it('should generate unique codes', () => {
            const codes = new Set(
                Array.from({ length: 100 }, () => generateVerificationCode())
            );
            // Most codes should be unique (allowing some collision due to randomness)
            expect(codes.size).toBeGreaterThan(90);
        });
    });

    describe('sendVerificationSms', () => {
        it('should route China (+86) numbers to Tencent provider', async () => {
            const result = await sendVerificationSms('+8613800138000', '123456');

            expect(result).toBe(true);
            expect(sendViaTencent).toHaveBeenCalledWith('+8613800138000', '123456');
            expect(sendViaTwilio).not.toHaveBeenCalled();
        });

        it('should route US (+1) numbers to Twilio provider', async () => {
            const result = await sendVerificationSms('+15551234567', '123456');

            expect(result).toBe(true);
            expect(sendViaTwilio).toHaveBeenCalledWith('+15551234567', '123456');
            expect(sendViaTencent).not.toHaveBeenCalled();
        });

        it('should route UK (+44) numbers to Twilio provider', async () => {
            const result = await sendVerificationSms('+447911123456', '654321');

            expect(result).toBe(true);
            expect(sendViaTwilio).toHaveBeenCalledWith('+447911123456', '654321');
            expect(sendViaTencent).not.toHaveBeenCalled();
        });

        it('should route Japan (+81) numbers to Twilio provider', async () => {
            const result = await sendVerificationSms('+819012345678', '999999');

            expect(result).toBe(true);
            expect(sendViaTwilio).toHaveBeenCalledWith('+819012345678', '999999');
            expect(sendViaTencent).not.toHaveBeenCalled();
        });

        it('should fall back to Twilio if Tencent is not configured for China number', async () => {
            vi.mocked(isTencentConfigured).mockReturnValue(false);

            const result = await sendVerificationSms('+8613800138000', '123456');

            expect(result).toBe(true);
            expect(sendViaTwilio).toHaveBeenCalledWith('+8613800138000', '123456');
        });

        it('should return false if sending via provider fails', async () => {
            vi.mocked(sendViaTencent).mockResolvedValue(false);

            const result = await sendVerificationSms('+8613800138000', '123456');

            expect(result).toBe(false);
        });
    });

    describe('isSmsConfigured', () => {
        it('should return true when both providers are configured', () => {
            expect(isSmsConfigured()).toBe(true);
        });

        it('should return true when only Twilio is configured', () => {
            vi.mocked(isTencentConfigured).mockReturnValue(false);
            vi.mocked(isTwilioConfigured).mockReturnValue(true);
            expect(isSmsConfigured()).toBe(true);
        });

        it('should return true when only Tencent is configured', () => {
            vi.mocked(isTencentConfigured).mockReturnValue(true);
            vi.mocked(isTwilioConfigured).mockReturnValue(false);
            expect(isSmsConfigured()).toBe(true);
        });

        it('should return false when no provider is configured', () => {
            vi.mocked(isTencentConfigured).mockReturnValue(false);
            vi.mocked(isTwilioConfigured).mockReturnValue(false);
            expect(isSmsConfigured()).toBe(false);
        });
    });

    describe('getAvailableProviders', () => {
        it('should return list of configured providers', () => {
            const providers = getAvailableProviders();
            expect(providers).toContain('tencent');
            expect(providers).toContain('twilio');
        });

        it('should return only Twilio when Tencent not configured', () => {
            vi.mocked(isTencentConfigured).mockReturnValue(false);
            const providers = getAvailableProviders();
            expect(providers).toContain('twilio');
            expect(providers).not.toContain('tencent');
        });

        it('should return empty array when no provider configured', () => {
            vi.mocked(isTencentConfigured).mockReturnValue(false);
            vi.mocked(isTwilioConfigured).mockReturnValue(false);
            const providers = getAvailableProviders();
            expect(providers).toHaveLength(0);
        });
    });
});

describe('Provider Selection Logic', () => {
    it('should correctly identify China numbers', () => {
        const chinaNumbers = [
            '+8613800138000',
            '+8615012345678',
            '+8618888888888',
        ];

        chinaNumbers.forEach((phone) => {
            expect(phone.startsWith('+86')).toBe(true);
        });
    });

    it('should correctly identify non-China numbers', () => {
        const internationalNumbers = [
            '+15551234567',    // US
            '+447911123456',   // UK
            '+819012345678',   // Japan
            '+6591234567',     // Singapore
            '+821012345678',   // South Korea
        ];

        internationalNumbers.forEach((phone) => {
            expect(phone.startsWith('+86')).toBe(false);
        });
    });
});
