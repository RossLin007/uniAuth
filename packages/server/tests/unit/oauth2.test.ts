import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the supabase and redis modules before importing the service
vi.mock('../../src/lib/supabase.js', () => ({
    getSupabase: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
        is: vi.fn().mockReturnThis(),
    }),
    TABLES: {
        USERS: 'users',
        VERIFICATION_CODES: 'verification_codes',
        REFRESH_TOKENS: 'refresh_tokens',
        OAUTH_ACCOUNTS: 'oauth_accounts',
        APPLICATIONS: 'applications',
        OAUTH_AUTHORIZATION_CODES: 'oauth_authorization_codes',
        AUDIT_LOGS: 'audit_logs',
    },
}));

vi.mock('../../src/lib/redis.js', () => ({
    isRedisAvailable: vi.fn().mockReturnValue(false),
    cacheGet: vi.fn().mockResolvedValue(null),
    cacheSet: vi.fn().mockResolvedValue(undefined),
    cacheDelete: vi.fn().mockResolvedValue(undefined),
    storeVerificationCode: vi.fn().mockResolvedValue(undefined),
    getVerificationCode: vi.fn().mockResolvedValue(null),
    deleteVerificationCode: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../src/lib/sms.js', () => ({
    sendVerificationSms: vi.fn().mockResolvedValue({ success: true }),
    generateVerificationCode: vi.fn().mockReturnValue('123456'),
}));

import {
    hashClientSecret,
    verifyClientSecret,
    verifyCodeChallenge,
    generateCodeChallenge,
} from '../../src/lib/crypto.js';
import { getSupabase, TABLES } from '../../src/lib/supabase.js';

describe('OAuth2Service', () => {
    const mockSupabase = getSupabase();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Client Secret Verification', () => {
        it('should hash and verify client secret correctly', async () => {
            const secret = 'test_client_secret_12345';
            const hash = await hashClientSecret(secret);

            const isValid = await verifyClientSecret(secret, hash);
            expect(isValid).toBe(true);
        });

        it('should reject wrong secret', async () => {
            const secret = 'test_client_secret_12345';
            const hash = await hashClientSecret(secret);

            const isValid = await verifyClientSecret('wrong_secret', hash);
            expect(isValid).toBe(false);
        });
    });

    describe('PKCE Verification', () => {
        it('should verify valid PKCE challenge with S256', () => {
            const verifier = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';
            const challenge = generateCodeChallenge(verifier, 'S256');

            const isValid = verifyCodeChallenge(verifier, challenge, 'S256');
            expect(isValid).toBe(true);
        });

        it('should verify valid PKCE challenge with plain', () => {
            const verifier = 'my_code_verifier';
            const challenge = verifier; // plain method

            const isValid = verifyCodeChallenge(verifier, challenge, 'plain');
            expect(isValid).toBe(true);
        });

        it('should reject invalid PKCE verifier', () => {
            const verifier = 'original_verifier';
            const challenge = generateCodeChallenge(verifier, 'S256');

            const isValid = verifyCodeChallenge('wrong_verifier', challenge, 'S256');
            expect(isValid).toBe(false);
        });
    });

    describe('Authorization Code Flow', () => {
        it('should have correct table names', () => {
            expect(TABLES.APPLICATIONS).toBe('applications');
            expect(TABLES.OAUTH_AUTHORIZATION_CODES).toBe('oauth_authorization_codes');
            expect(TABLES.USERS).toBe('users');
        });
    });
});
