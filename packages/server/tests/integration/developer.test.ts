import { describe, it, expect, beforeAll } from 'vitest';
import app from '../../src/index.js';
import { getSupabase } from '../../src/lib/supabase.js';

describe('Developer API (App Management)', () => {
    let authToken: string;
    let userId: string;
    let testAppId: string;
    let testClientId: string;

    const supabase = getSupabase();

    beforeAll(async () => {
        // 1. Create a user and get Login Token
        // Using existing auth endpoints or direct DB insertion + JWT generation
        // For integration test, it's easier to verify phone login if we have that helper from trusted-auth.test.ts
        // OR we can just generate a token manually using our jwt lib since this is server-side test

        const { generateAccessToken } = await import('../../src/lib/jwt.js');

        // Create user in DB
        const suffix = Math.floor(Math.random() * 100000);
        const email = `dev_test_${suffix}@example.com`;

        const { data: user, error } = await supabase.auth.signUp({
            email,
            password: 'Password123!',
        });

        // Wait, supabase.auth.signUp uses GoTrue which might be mocked or real.
        // If we are testing our API, we rely on users table.
        // Let's insert directly into 'users' table if we can, or use our auth routes.

        // Using our Auth API is more robust
        // Register user
        const resRegister = await app.request('/api/v1/user/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                phone: `+86139${String(suffix).padStart(8, '0')}`,
                email: email,
                password: 'Password123!',
                code: '123456' // Assuming mocked verification in test env if configured, or we need to trick it
            })
        });

        // If register is hard (needs valid code), let's fallback to creating user via Supabase Admin (service role) 
        // OR just fake the token if we trust verifyAccessToken (which reads DB to get user?)
        // The authMiddleware calls `supabase.auth.getUser(token)` usually, or checks our JWT.
        // Our `authMiddleware` verifies the JWT and inserts `c.set('user', payload)`.

        // Actually, our `authMiddleware` in `packages/server/src/middlewares/auth.middleware.ts` 
        // uses `jose` to verify token locally. It does NOT call Supabase Auth API unless configured to.
        // Let's check auth.middleware.ts content quickly? 
        // Assuming it validates our JWT.

        // Let's insert a dummy user into 'users' table directly to satisfy foreign keys if any
        const { data: dbUser } = await supabase
            .from('users')
            .insert({
                email,
                phone: `+86139${String(suffix).padStart(8, '0')}`,
                password_hash: 'hash',
                nickname: 'DevTester'
            })
            .select()
            .single();

        userId = dbUser.id;

        // Generate Token
        authToken = await generateAccessToken({ id: userId });
    });

    it('should list empty apps initially', async () => {
        const res = await app.request('/api/v1/developer/apps', {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.data).toEqual([]);
    });

    it('should create an application', async () => {
        const res = await app.request('/api/v1/developer/apps', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: 'My Integration Test App',
                description: 'Created via API',
                app_type: 'web',
                redirect_uris: ['https://example.com/cb']
            })
        });

        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.success).toBe(true);
        expect(json.data.name).toBe('My Integration Test App');
        expect(json.data.owner_id).toBe(userId);
        expect(json.data.client_secret).toBeDefined();

        testAppId = json.data.id;
        testClientId = json.data.client_id;
    });

    it('should list apps containing the new app', async () => {
        const res = await app.request('/api/v1/developer/apps', {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.data).toHaveLength(1);
        expect(json.data[0].id).toBe(testAppId);
        // Secret should be masked
        expect(json.data[0].client_secret).toBe('********');
    });

    it('should get app details', async () => {
        const res = await app.request(`/api/v1/developer/apps/${testClientId}`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.data.id).toBe(testAppId);
        // Detail view should reveal secret (or maybe masked? implementation said reveal, let's allow reveal for now as per plan)
        expect(json.data.client_secret).not.toBe('********');
        expect(json.data.client_secret).toMatch(/^sec_/);
    });

    it('should update app details', async () => {
        const res = await app.request(`/api/v1/developer/apps/${testClientId}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: 'Updated Name',
                homepage_url: 'https://example.com'
            })
        });

        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.data.name).toBe('Updated Name');
        expect(json.data.homepage_url).toBe('https://example.com');
    });

    it('should rotate client secret', async () => {
        // Get old secret
        const detailRes = await app.request(`/api/v1/developer/apps/${testClientId}`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const oldSecret = (await detailRes.json()).data.client_secret;

        // Rotate
        const res = await app.request(`/api/v1/developer/apps/${testClientId}/secret`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        expect(res.status).toBe(200);
        const newSecret = (await res.json()).data.client_secret;

        expect(newSecret).not.toBe(oldSecret);
        expect(newSecret).toMatch(/^sec_/);
    });

    it('should delete application', async () => {
        const res = await app.request(`/api/v1/developer/apps/${testClientId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        expect(res.status).toBe(200);

        // Verify gone
        const detailRes = await app.request(`/api/v1/developer/apps/${testClientId}`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        expect(detailRes.status).toBe(404);
    });
});
