import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock Supabase before importing the service
vi.mock('../../src/lib/supabase.js', () => ({
    getSupabase: vi.fn(() => ({
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn(),
    })),
}));

// Mock environment
vi.mock('../../src/config/env.js', () => ({
    env: {
        RP_ID: 'localhost',
        RP_ORIGIN: 'http://localhost:3000',
    },
}));

describe('WebAuthn Service', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.resetAllMocks();
    });

    describe('Base64URL Encoding/Decoding', () => {
        it('should correctly encode Uint8Array to base64url', async () => {
            const { uint8ArrayToBase64Url } = await import('../../src/services/webauthn.service.js');

            const input = new Uint8Array([72, 101, 108, 108, 111]); // "Hello"
            const result = uint8ArrayToBase64Url(input);

            // Base64url should not have +, /, or = characters
            expect(result).not.toContain('+');
            expect(result).not.toContain('/');
            expect(result).not.toContain('=');
            expect(result).toBe('SGVsbG8');
        });

        it('should correctly decode base64url to Uint8Array', async () => {
            const { base64UrlToUint8Array } = await import('../../src/services/webauthn.service.js');

            const input = 'SGVsbG8'; // "Hello" in base64url
            const result = base64UrlToUint8Array(input);

            expect(result).toEqual(new Uint8Array([72, 101, 108, 108, 111]));
        });

        it('should round-trip encode/decode correctly', async () => {
            const { uint8ArrayToBase64Url, base64UrlToUint8Array } = await import('../../src/services/webauthn.service.js');

            const original = new Uint8Array([0, 1, 2, 255, 128, 64, 32, 16, 8, 4, 2, 1]);
            const encoded = uint8ArrayToBase64Url(original);
            const decoded = base64UrlToUint8Array(encoded);

            expect(decoded).toEqual(original);
        });
    });

    describe('Service exports', () => {
        it('should export required functions', async () => {
            const webauthnService = await import('../../src/services/webauthn.service.js');

            expect(typeof webauthnService.uint8ArrayToBase64Url).toBe('function');
            expect(typeof webauthnService.base64UrlToUint8Array).toBe('function');
            expect(typeof webauthnService.generatePasskeyRegistrationOptions).toBe('function');
            expect(typeof webauthnService.verifyPasskeyRegistration).toBe('function');
            expect(typeof webauthnService.generatePasskeyAuthenticationOptions).toBe('function');
            expect(typeof webauthnService.verifyPasskeyAuthentication).toBe('function');
            expect(typeof webauthnService.listUserPasskeys).toBe('function');
            expect(typeof webauthnService.deletePasskey).toBe('function');
            expect(typeof webauthnService.renamePasskey).toBe('function');
        });
    });
});
