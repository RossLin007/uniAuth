import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    generateVerificationCode,
    generateAccessToken,
    generateRefreshToken,
    hashToken,
    verifyAccessToken,
} from '../src/lib/index.js';

// Mock environment variables
vi.mock('../src/config/env.js', () => ({
    env: {
        JWT_SECRET: 'test_secret_key_at_least_32_characters_long',
        JWT_ACCESS_TOKEN_EXPIRES_IN: '1h',
        JWT_REFRESH_TOKEN_EXPIRES_IN: '30d',
    },
}));

describe('Verification Code', () => {
    it('should generate a 6-digit code by default', () => {
        const code = generateVerificationCode();
        expect(code).toMatch(/^\d{6}$/);
    });

    it('should generate a code with custom length', () => {
        const code = generateVerificationCode(4);
        expect(code).toMatch(/^\d{4}$/);
    });

    it('should generate unique codes', () => {
        const codes = new Set(
            Array.from({ length: 100 }, () => generateVerificationCode())
        );
        // Most codes should be unique (allowing some collision due to randomness)
        expect(codes.size).toBeGreaterThan(90);
    });
});

describe('JWT Functions', () => {
    const testUser = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        phone: '+8613800138000',
    };

    it('should generate a valid access token', async () => {
        const token = await generateAccessToken(testUser);
        expect(token).toBeTruthy();
        expect(typeof token).toBe('string');
        expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });

    it('should generate a refresh token', () => {
        const token = generateRefreshToken();
        expect(token).toBeTruthy();
        expect(typeof token).toBe('string');
        expect(token.length).toBeGreaterThan(20);
    });

    it('should hash tokens consistently', () => {
        const token = 'test_token';
        const hash1 = hashToken(token);
        const hash2 = hashToken(token);
        expect(hash1).toBe(hash2);
        expect(hash1.length).toBe(64); // SHA-256 hex length
    });

    it('should verify a valid access token', async () => {
        const token = await generateAccessToken(testUser);
        const payload = await verifyAccessToken(token);

        expect(payload.sub).toBe(testUser.id);
        expect(payload.phone).toBe(testUser.phone);
        expect(payload.iat).toBeDefined();
        expect(payload.exp).toBeDefined();
    });

    it('should reject an invalid token', async () => {
        await expect(verifyAccessToken('invalid_token')).rejects.toThrow();
    });
});

