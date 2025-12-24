import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import app from '../../src/index';
import { getSupabase, TABLES } from '../../src/lib/supabase';
import { env } from '../../src/config';
import { hashToken } from '../../src/lib/jwt';

describe('Trusted Client API', () => {
    let clientId: string;
    let clientSecret: string;
    // Use random credentials to avoid rate limiting
    const randomSuffix = Math.floor(Math.random() * 10000);
    let testPhone = `+86138${String(randomSuffix).padStart(8, '0')}`;
    let testEmail = `trusted-test-${randomSuffix}@example.com`;
    let verificationCode: string;
    let mfaToken: string;

    beforeAll(async () => {
        // Ensure we have a test application
        const supabase = getSupabase();

        // Create or get trusted application
        // We keep client_id constant to avoid creating too many apps,
        // but users/phones will be unique per run
        clientId = 'trusted-app-test';
        clientSecret = 'trusted-secret-test';

        const { error } = await supabase.from(TABLES.APPLICATIONS).upsert({
            client_id: clientId,
            client_secret: clientSecret, // In real test env, this might need hashing if logic enabled
            name: 'Trusted Test App',
            redirect_uris: ['http://localhost:3000/callback'],
            is_trusted: true,
            app_type: 'web',
            allowed_grants: ['trusted_client', 'authorization_code'],
            status: 'active'
        }, { onConflict: 'client_id' });

        if (error) console.error('Setup error:', error);
    });

    describe('Client Authentication', () => {
        it('should reject requests without client_id', async () => {
            const res = await app.request('/api/v1/auth/trusted/phone/send-code', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ phone: testPhone }),
            });
            expect(res.status).toBe(400);
            const data = await res.json();
            expect(data.error.code).toBe('MISSING_CLIENT_ID');
        });

        it('should reject requests with invalid client_secret', async () => {
            const res = await app.request('/api/v1/auth/trusted/phone/send-code', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Client-Id': clientId,
                    'X-Client-Secret': 'wrong-secret',
                },
                body: JSON.stringify({ phone: testPhone }),
            });
            expect(res.status).toBe(401);
            const data = await res.json();
            expect(data.error.code).toBe('INVALID_CLIENT_SECRET');
        });
    });

    describe('Phone Authentication Flow', () => {
        it('should send phone verification code', async () => {
            const res = await app.request('/api/v1/auth/trusted/phone/send-code', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Client-Id': clientId,
                    'X-Client-Secret': clientSecret,
                },
                body: JSON.stringify({ phone: testPhone }),
            });

            expect(res.status).toBe(200);
            const data = await res.json();
            expect(data.success).toBe(true);

            // In test mode, we might want to fetch the code from DB if possible, 
            // or use a fixed code/mock if configured.
            // For now assuming we can proceed or mock verify.
        });
    });

    describe('Email Authentication Flow', () => {
        it('should send email verification code', async () => {
            const res = await app.request('/api/v1/auth/trusted/email/send-code', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Client-Id': clientId,
                    'X-Client-Secret': clientSecret,
                },
                body: JSON.stringify({ email: testEmail }),
            });

            expect(res.status).toBe(200);
            const data = await res.json();
            expect(data.success).toBe(true);
        }, 10000); // Increase timeout to 10s
    });

    // Note: Full end-to-end flow requires DB state inspection or mocking auth service
    // Since this is an integration test against the real app structure, 
    // we focus on connection and contract verification here.
});
