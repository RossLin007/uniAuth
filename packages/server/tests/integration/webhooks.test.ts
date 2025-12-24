import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import app from '../../src/index.js';
import { getSupabase } from '../../src/lib/supabase.js';
import { webhookService } from '../../src/services/webhook.service.js';
import { randomBytes } from 'crypto';
import jwt from 'jsonwebtoken';

describe('Webhooks Integration', () => {
    let authToken: string;
    let userId: string;
    let clientId: string;
    let webhookId: string;
    const testUrl = 'https://example.com/webhook';

    beforeAll(async () => {
        // 1. Create a user (Direct DB Insert to avoid Auth API validation/rate limits)
        const supabase = getSupabase();
        const suffix = Math.floor(Math.random() * 100000);
        const email = `dev_webhook_${suffix}@example.com`;

        const { data: user, error } = await supabase
            .from('users')
            .insert({
                email,
                phone: `+86138${String(suffix).padStart(8, '0')}`,
                password_hash: 'hash',
                nickname: 'WebhookTester'
            })
            .select()
            .single();

        if (error) throw error;
        userId = user.id;

        // 2. Create app
        const { data: appData, error: appError } = await supabase
            .from('applications')
            .insert({
                name: 'Webhook Test App',
                owner_id: userId,
                client_id: 'ua_' + randomBytes(8).toString('hex'),
                client_secret: 'secret',
                app_type: 'web',
                allowed_grants: ['authorization_code']
            })
            .select()
            .single();
        if (appError) throw appError;
        clientId = appData.client_id;

        // 3. Generate token for user
        const { generateAccessToken } = await import('../../src/lib/jwt.js');
        authToken = await generateAccessToken({
            id: userId,
            email,
            role: 'authenticated'
        });
    });

    it('should create a webhook', async () => {
        const res = await app.request(`/api/v1/developer/apps/${clientId}/webhooks`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({
                url: testUrl,
                events: ['user.login'],
                description: 'Test Webhook'
            })
        });

        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.success).toBe(true);
        expect(json.data.url).toBe(testUrl);
        expect(json.data.secret).toBeDefined();
        webhookId = json.data.id;
    });

    it('should list webhooks', async () => {
        const res = await app.request(`/api/v1/developer/apps/${clientId}/webhooks`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.data).toHaveLength(1);
        expect(json.data[0].id).toBe(webhookId);
    });

    it('should trigger a test event', async () => {
        // Mock triggerEvent to avoid actual axios call during basic integration test
        // typically we'd use nock, but here we want to verify the API response
        const spy = vi.spyOn(webhookService, 'triggerEvent').mockResolvedValue(undefined);

        const res = await app.request(`/api/v1/developer/apps/${clientId}/webhooks/test`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({
                event: 'user.login',
                payload: { userId: '123' }
            })
        });

        expect(res.status).toBe(200);
        expect(spy).toHaveBeenCalledWith(expect.any(String), 'user.login', { userId: '123' });
        spy.mockRestore();
    });

    it('should delete a webhook', async () => {
        const res = await app.request(`/api/v1/developer/apps/${clientId}/webhooks/${webhookId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        expect(res.status).toBe(200);

        // Verify it's gone
        const listRes = await app.request(`/api/v1/developer/apps/${clientId}/webhooks`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const listJson = await listRes.json();
        expect(listJson.data).toHaveLength(0);
    });
});
