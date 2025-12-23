import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    hashClientSecret,
    verifyClientSecret,
    generateSecureToken,
    hashToken,
    generateCodeVerifier,
    generateCodeChallenge,
    verifyCodeChallenge,
} from '../../src/lib/crypto.js';

describe('Crypto Utilities', () => {
    describe('Client Secret Hashing', () => {
        it('should hash a client secret', async () => {
            const secret = 'my_secret_key_12345';
            const hash = await hashClientSecret(secret);

            expect(hash).toBeTruthy();
            expect(hash).not.toBe(secret);
            expect(hash.startsWith('$2')).toBe(true); // bcrypt prefix
        });

        it('should verify a correct secret', async () => {
            const secret = 'my_secret_key_12345';
            const hash = await hashClientSecret(secret);

            const isValid = await verifyClientSecret(secret, hash);
            expect(isValid).toBe(true);
        });

        it('should reject an incorrect secret', async () => {
            const secret = 'my_secret_key_12345';
            const hash = await hashClientSecret(secret);

            const isValid = await verifyClientSecret('wrong_secret', hash);
            expect(isValid).toBe(false);
        });

        it('should generate different hashes for same input', async () => {
            const secret = 'my_secret_key_12345';
            const hash1 = await hashClientSecret(secret);
            const hash2 = await hashClientSecret(secret);

            expect(hash1).not.toBe(hash2); // Different salt each time

            // But both should verify
            expect(await verifyClientSecret(secret, hash1)).toBe(true);
            expect(await verifyClientSecret(secret, hash2)).toBe(true);
        });
    });

    describe('Secure Token Generation', () => {
        it('should generate a 64-character hex token by default', () => {
            const token = generateSecureToken();

            expect(token).toHaveLength(64); // 32 bytes = 64 hex chars
            expect(/^[a-f0-9]+$/.test(token)).toBe(true);
        });

        it('should generate tokens of custom length', () => {
            const token16 = generateSecureToken(16);
            const token64 = generateSecureToken(64);

            expect(token16).toHaveLength(32); // 16 bytes = 32 hex chars
            expect(token64).toHaveLength(128); // 64 bytes = 128 hex chars
        });

        it('should generate unique tokens', () => {
            const tokens = new Set(
                Array.from({ length: 100 }, () => generateSecureToken())
            );

            expect(tokens.size).toBe(100);
        });
    });

    describe('Token Hashing', () => {
        it('should hash tokens consistently', () => {
            const token = 'test_token_12345';
            const hash1 = hashToken(token);
            const hash2 = hashToken(token);

            expect(hash1).toBe(hash2);
            expect(hash1).toHaveLength(64); // SHA-256 = 64 hex chars
        });

        it('should produce different hashes for different tokens', () => {
            const hash1 = hashToken('token1');
            const hash2 = hashToken('token2');

            expect(hash1).not.toBe(hash2);
        });
    });

    describe('PKCE Code Verifier', () => {
        it('should generate a valid code verifier', () => {
            const verifier = generateCodeVerifier();

            expect(verifier.length).toBe(64);
            expect(/^[A-Za-z0-9_-]+$/.test(verifier)).toBe(true);
        });

        it('should generate unique verifiers', () => {
            const verifiers = new Set(
                Array.from({ length: 100 }, () => generateCodeVerifier())
            );

            expect(verifiers.size).toBe(100);
        });
    });

    describe('PKCE Code Challenge', () => {
        it('should generate S256 challenge correctly', () => {
            const verifier = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';
            const challenge = generateCodeChallenge(verifier, 'S256');

            // The challenge should be a base64url encoded SHA256 hash
            expect(challenge).toBeTruthy();
            expect(challenge).not.toBe(verifier);
            // Should be valid base64url
            expect(/^[A-Za-z0-9_-]+$/.test(challenge)).toBe(true);
        });

        it('should return verifier for plain method', () => {
            const verifier = 'my_code_verifier';
            const challenge = generateCodeChallenge(verifier, 'plain');

            expect(challenge).toBe(verifier);
        });

        it('should use S256 by default', () => {
            const verifier = 'test_verifier';
            const challengeDefault = generateCodeChallenge(verifier);
            const challengeS256 = generateCodeChallenge(verifier, 'S256');

            expect(challengeDefault).toBe(challengeS256);
        });
    });

    describe('PKCE Verification', () => {
        it('should verify valid S256 challenge', () => {
            const verifier = generateCodeVerifier();
            const challenge = generateCodeChallenge(verifier, 'S256');

            expect(verifyCodeChallenge(verifier, challenge, 'S256')).toBe(true);
        });

        it('should verify valid plain challenge', () => {
            const verifier = 'my_plain_verifier';
            const challenge = verifier;

            expect(verifyCodeChallenge(verifier, challenge, 'plain')).toBe(true);
        });

        it('should reject invalid verifier', () => {
            const verifier = generateCodeVerifier();
            const challenge = generateCodeChallenge(verifier, 'S256');

            expect(verifyCodeChallenge('wrong_verifier', challenge, 'S256')).toBe(false);
        });

        it('should reject tampared challenge', () => {
            const verifier = generateCodeVerifier();
            const challenge = 'tampered_challenge';

            expect(verifyCodeChallenge(verifier, challenge, 'S256')).toBe(false);
        });
    });
});
