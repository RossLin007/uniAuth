import { describe, it, expect, beforeAll } from 'vitest';
import app from '../../src/index.js';

describe('OIDC Integration', () => {
    describe('Discovery Document', () => {
        it('should return valid discovery document', async () => {
            const res = await app.request('/.well-known/openid-configuration');

            expect(res.status).toBe(200);
            const discovery = await res.json();

            // Verify required OIDC fields
            expect(discovery).toHaveProperty('issuer');
            expect(discovery).toHaveProperty('authorization_endpoint');
            expect(discovery).toHaveProperty('token_endpoint');
            expect(discovery).toHaveProperty('userinfo_endpoint');
            expect(discovery).toHaveProperty('response_types_supported');
            expect(discovery).toHaveProperty('grant_types_supported');
            expect(discovery).toHaveProperty('subject_types_supported');
            expect(discovery).toHaveProperty('id_token_signing_alg_values_supported');
            expect(discovery).toHaveProperty('scopes_supported');
            expect(discovery).toHaveProperty('claims_supported');
        });

        it('should advertise correct endpoints', async () => {
            const res = await app.request('/.well-known/openid-configuration');
            const discovery = await res.json();

            expect(discovery.token_endpoint).toContain('/api/v1/oauth2/token');
            expect(discovery.userinfo_endpoint).toContain('/api/v1/oauth2/userinfo');
            expect(discovery.authorization_endpoint).toContain('/oauth2/authorize');
        });

        it('should include openid in supported scopes', async () => {
            const res = await app.request('/.well-known/openid-configuration');
            const discovery = await res.json();

            expect(discovery.scopes_supported).toContain('openid');
            expect(discovery.scopes_supported).toContain('profile');
            expect(discovery.scopes_supported).toContain('email');
        });

        it('should advertise PKCE support', async () => {
            const res = await app.request('/.well-known/openid-configuration');
            const discovery = await res.json();

            expect(discovery.code_challenge_methods_supported).toContain('S256');
            expect(discovery.code_challenge_methods_supported).toContain('plain');
        });

        it('should list standard OIDC claims', async () => {
            const res = await app.request('/.well-known/openid-configuration');
            const discovery = await res.json();

            const requiredClaims = ['sub', 'iss', 'aud', 'exp', 'iat'];
            const profileClaims = ['email', 'email_verified', 'name', 'picture'];

            requiredClaims.forEach(claim => {
                expect(discovery.claims_supported).toContain(claim);
            });

            profileClaims.forEach(claim => {
                expect(discovery.claims_supported).toContain(claim);
            });
        });
    });

    describe('UserInfo Endpoint', () => {
        it('should reject requests without Authorization header', async () => {
            const res = await app.request('/api/v1/oauth2/userinfo');

            expect(res.status).toBe(401);
            const body = await res.json();
            expect(body.error).toBe('invalid_token');
        });

        it('should reject requests with invalid Bearer token', async () => {
            const res = await app.request('/api/v1/oauth2/userinfo', {
                headers: {
                    'Authorization': 'Bearer invalid_token'
                }
            });

            expect(res.status).toBe(401);
            const body = await res.json();
            expect(body.error).toBe('invalid_token');
        });

        it('should reject requests with malformed Authorization header', async () => {
            const res = await app.request('/api/v1/oauth2/userinfo', {
                headers: {
                    'Authorization': 'InvalidFormat token123'
                }
            });

            expect(res.status).toBe(401);
        });

        // Note: Full integration test with valid token would require
        // setting up a complete OAuth2 flow, which is covered in
        // oauth2 integration tests
    });

    describe('ID Token in OAuth2 Flow', () => {
        it('should be tested in oauth2 integration tests', () => {
            // ID Token generation is tested as part of the full
            // OAuth2 authorization code flow
            // See: tests/integration/oauth2.test.ts
            expect(true).toBe(true);
        });
    });
});
