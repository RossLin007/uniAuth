import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import app from '../../src/index.js';
import { getSupabase, TABLES } from '../../src/lib/supabase.js';

describe('M2M Authentication Flow', () => {
    let clientId: string;
    let clientSecret: string;
    let accessToken: string;
    const supabase = getSupabase();
    // Unique ID for this test run
    const testId = Math.floor(Math.random() * 100000);

    beforeAll(async () => {
        // 1. Create a test M2M application
        clientId = `m2m_test_client_${testId}`;
        clientSecret = `secret_${testId}`;

        const { data: appData, error: appError } = await supabase
            .from(TABLES.APPLICATIONS)
            .insert({
                client_id: clientId,
                client_secret: clientSecret, // Plain text for simplicity in test, usually hashed
                name: 'M2M Test App',
                redirect_uris: ['http://localhost:3000/callback'],
                is_trusted: true,
                app_type: 'm2m',
                allowed_grants: ['client_credentials'],
                status: 'active'
            })
            .select()
            .single();

        if (appError) throw appError;

        // 2. Assign scopes to this app
        // First get 'read:users' scope or create it if not exists (it wasn't in migration seed)
        let { data: scopeData } = await supabase
            .from('scopes')
            .select('id')
            .eq('name', 'read:users')
            .single();

        if (!scopeData) {
            const { data: newScope } = await supabase
                .from('scopes')
                .insert({ name: 'read:users', description: 'Read users' })
                .select()
                .single();
            scopeData = newScope;
        }

        // Assign scope
        await supabase
            .from('app_scopes')
            .insert({
                app_id: appData.id,
                scope_id: scopeData!.id
            });
    });

    afterAll(async () => {
        // Cleanup
        if (clientId) {
            await supabase.from(TABLES.APPLICATIONS).delete().eq('client_id', clientId);
        }
    });

    it('should authenticate with client credentials', async () => {
        const res = await app.request('/api/v1/oauth2/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                grant_type: 'client_credentials',
                client_id: clientId,
                client_secret: clientSecret,
                scope: 'read:users'
            })
        });

        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data).toHaveProperty('access_token');
        expect(data).toHaveProperty('token_type', 'Bearer');
        expect(data).toHaveProperty('expires_in');
        // Client Credentials flow typically doesn't return refresh token, 
        // though some implementations might. Our current impl does not.

        accessToken = data.access_token;
    });

    it('should reject invalid client credentials', async () => {
        const res = await app.request('/api/v1/oauth2/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                grant_type: 'client_credentials',
                client_id: clientId,
                client_secret: 'wrong_secret'
            })
        });

        expect(res.status).toBe(400); // 400 with invalid_client error usually
        const data = await res.json();
        expect(data.error).toBe('invalid_client');
    });

    it('should reject invalid scope', async () => {
        const res = await app.request('/api/v1/oauth2/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                grant_type: 'client_credentials',
                client_id: clientId,
                client_secret: clientSecret,
                scope: 'write:admin_data' // a scope we didn't assign
            })
        });

        expect(res.status).toBe(400);
        const data = await res.json();
        expect(data.error).toBe('invalid_scope');
    });

    it('should introspect valid token', async () => {
        const res = await app.request('/api/v1/oauth2/introspect', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                token: accessToken,
                client_id: clientId,
                client_secret: clientSecret
            })
        });

        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.active).toBe(true);
        expect(data.client_id).toBe(clientId);
        expect(data.scope).toContain('read:users');
    });

    it('should return active:false for invalid token', async () => {
        const res = await app.request('/api/v1/oauth2/introspect', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                token: 'invalid_token_string',
                client_id: clientId,
                client_secret: clientSecret
            })
        });

        expect(res.status).toBe(200); // Introspection endpoint usually returns 200 OK with active: false
        const data = await res.json();
        expect(data.active).toBe(false);
    });

    it('should fail introspection with invalid client auth', async () => {
        const res = await app.request('/api/v1/oauth2/introspect', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                token: accessToken,
                client_id: clientId,
                client_secret: 'wrong'
            })
        });

        expect(res.status).toBe(401);
    });
});
