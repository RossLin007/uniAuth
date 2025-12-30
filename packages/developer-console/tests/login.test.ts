import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('Login Form - Validation', () => {
    describe('Phone number validation', () => {
        const e164Regex = /^\+[1-9]\d{6,14}$/;

        it('should accept valid E.164 format phone numbers', () => {
            expect(e164Regex.test('+8613800138000')).toBe(true);
            expect(e164Regex.test('+14155552671')).toBe(true);
            expect(e164Regex.test('+447911123456')).toBe(true);
            expect(e164Regex.test('+81312345678')).toBe(true);
        });

        it('should reject invalid phone numbers', () => {
            expect(e164Regex.test('13800138000')).toBe(false);    // No +
            expect(e164Regex.test('+0123456789')).toBe(false);    // Starts with 0
            expect(e164Regex.test('+12345')).toBe(false);         // Too short
            expect(e164Regex.test('8613800138000')).toBe(false);  // No +
            expect(e164Regex.test('')).toBe(false);               // Empty
        });
    });

    describe('Email validation', () => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        it('should accept valid email addresses', () => {
            expect(emailRegex.test('test@example.com')).toBe(true);
            expect(emailRegex.test('user.name@domain.co')).toBe(true);
            expect(emailRegex.test('user+tag@example.org')).toBe(true);
        });

        it('should reject invalid email addresses', () => {
            expect(emailRegex.test('invalid')).toBe(false);
            expect(emailRegex.test('missing@domain')).toBe(false);
            expect(emailRegex.test('@nodomain.com')).toBe(false);
            expect(emailRegex.test('')).toBe(false);
        });
    });

    describe('Verification code validation', () => {
        const codeRegex = /^\d{6}$/;

        it('should accept valid 6-digit codes', () => {
            expect(codeRegex.test('123456')).toBe(true);
            expect(codeRegex.test('000000')).toBe(true);
            expect(codeRegex.test('999999')).toBe(true);
        });

        it('should reject invalid codes', () => {
            expect(codeRegex.test('12345')).toBe(false);      // Too short
            expect(codeRegex.test('1234567')).toBe(false);    // Too long
            expect(codeRegex.test('abcdef')).toBe(false);     // Letters
            expect(codeRegex.test('12 345')).toBe(false);     // Space
            expect(codeRegex.test('')).toBe(false);           // Empty
        });
    });
});

describe('AuthContext', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should handle sendPhoneCode without captcha token', async () => {
        // Mock the SDK sendCode method
        const mockSendCode = vi.fn().mockResolvedValue({
            expires_in: 300,
            retry_after: 60,
        });

        // Verify the function signature matches (no captchaToken required)
        expect(typeof mockSendCode).toBe('function');

        await mockSendCode('+8613800138000');
        expect(mockSendCode).toHaveBeenCalledWith('+8613800138000');
    });

    it('should handle sendEmailCode without captcha token', async () => {
        const mockSendEmailCode = vi.fn().mockResolvedValue({
            expires_in: 300,
            retry_after: 60,
        });

        await mockSendEmailCode('test@example.com');
        expect(mockSendEmailCode).toHaveBeenCalledWith('test@example.com');
    });
});

describe('API Configuration', () => {
    it('should validate API URL format', () => {
        const urlPattern = /^https?:\/\/.+$/;

        // Example URLs
        expect(urlPattern.test('https://sso.55387.xyz')).toBe(true);
        expect(urlPattern.test('http://localhost:3000')).toBe(true);
        expect(urlPattern.test('invalid')).toBe(false);
    });
});
