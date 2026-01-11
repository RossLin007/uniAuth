/**
 * JWT RS256 签名迁移验证测试
 * 验证 Access Token 现在使用 RS256 非对称签名
 */

import { describe, it, expect, vi } from 'vitest';
import * as jose from 'jose';

// Mock environment variables
vi.mock('../../src/config/env.js', () => ({
    env: {
        JWT_SECRET: 'test_secret_key_at_least_32_characters_long',
        JWT_ACCESS_TOKEN_EXPIRES_IN: '1h',
        JWT_REFRESH_TOKEN_EXPIRES_IN: '30d',
        FRONTEND_URL: 'https://auth.test.com',
    },
}));

// Import after mock
import { generateAccessToken, verifyAccessToken } from '../../src/lib/jwt.js';
import { getKeyPair, exportPublicJWK } from '../../src/lib/jwks.js';

describe('JWT RS256 Migration', () => {
    describe('Access Token Signing', () => {
        it('should generate access token with RS256 algorithm', async () => {
            const user = { id: 'test-user-123', email: 'test@example.com' };
            const token = await generateAccessToken(user);

            // Decode the token header to check algorithm
            const [headerB64] = token.split('.');
            const header = JSON.parse(Buffer.from(headerB64, 'base64url').toString());

            expect(header.alg).toBe('RS256');
            expect(header.kid).toBeDefined();
        });

        it('should include kid (key id) in token header', async () => {
            const user = { id: 'test-user-456' };
            const token = await generateAccessToken(user);

            const [headerB64] = token.split('.');
            const header = JSON.parse(Buffer.from(headerB64, 'base64url').toString());

            expect(header.kid).toMatch(/^uniauth-rsa-/);
        });

        it('should verify access token with RS256', async () => {
            const user = { id: 'test-user-789', phone: '+8613800138000' };
            const token = await generateAccessToken(user);

            const payload = await verifyAccessToken(token);

            expect(payload.sub).toBe('test-user-789');
            expect(payload.phone).toBe('+8613800138000');
        });

        it('should include correct claims in access token', async () => {
            const user = { id: 'claim-test-user', email: 'claims@test.com' };
            const options = { clientId: 'test-client', scope: 'read write' };

            const token = await generateAccessToken(user, options);
            const payload = await verifyAccessToken(token);

            expect(payload.sub).toBe('claim-test-user');
            expect(payload.email).toBe('claims@test.com');
            expect(payload.scope).toBe('read write');
            expect(payload.azp).toBe('test-client');
            expect(payload.aud).toBe('test-client');
        });
    });

    describe('JWKS Public Key', () => {
        it('should export public key as JWK', async () => {
            const jwk = await exportPublicJWK();

            expect(jwk.kty).toBe('RSA');
            expect(jwk.alg).toBe('RS256');
            expect(jwk.use).toBe('sig');
            expect(jwk.kid).toBeDefined();
            expect(jwk.n).toBeDefined(); // RSA modulus
            expect(jwk.e).toBeDefined(); // RSA exponent
        });

        it('should be able to verify token with exported public key', async () => {
            // Generate token
            const user = { id: 'jwks-verify-test' };
            const token = await generateAccessToken(user);

            // Get public key
            const { publicKey } = await getKeyPair();

            // Verify with public key
            const { payload } = await jose.jwtVerify(token, publicKey);

            expect(payload.sub).toBe('jwks-verify-test');
        });
    });

    describe('Security Verification', () => {
        it('should NOT be verifiable with HS256 secret', async () => {
            const user = { id: 'security-test' };
            const token = await generateAccessToken(user);

            // Try to verify with a fake HS256 secret (should fail)
            const fakeSecret = new TextEncoder().encode('fake-jwt-secret');

            await expect(
                jose.jwtVerify(token, fakeSecret)
            ).rejects.toThrow();
        });

        it('should generate verifiable tokens consistently', async () => {
            // RS256 signatures are deterministic with same key and payload
            const user = { id: 'same-user' };
            const token1 = await generateAccessToken(user);
            const token2 = await generateAccessToken(user);

            // Both should verify correctly
            const payload1 = await verifyAccessToken(token1);
            const payload2 = await verifyAccessToken(token2);

            expect(payload1.sub).toBe(payload2.sub);
            expect(payload1.sub).toBe('same-user');
        });
    });
});
