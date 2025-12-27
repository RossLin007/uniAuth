
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { accountLinkingRouter } from '../../src/routes/account-linking.routes.js';

// Mock dependencies
const mockLinkAccount = vi.fn();
const mockExchangeOAuthCode = vi.fn();
const mockGetOAuthUserInfo = vi.fn();

// Mock account-linking.service
vi.mock('../../src/services/account-linking.service.js', () => ({
    accountLinkingService: {
        getLinkedAccounts: vi.fn(),
        getAvailableProviders: vi.fn(),
        linkAccount: (...args: any[]) => mockLinkAccount(...args),
        unlinkAccount: vi.fn(),
        findExistingLink: vi.fn(),
    },
}));

// Mock oauth library
vi.mock('../../src/lib/oauth.js', () => ({
    exchangeOAuthCode: (...args: any[]) => mockExchangeOAuthCode(...args),
    getOAuthUserInfo: (...args: any[]) => mockGetOAuthUserInfo(...args),
}));

// Mock supabase lib
vi.mock('../../src/lib/supabase.js', () => ({
    getSupabase: vi.fn(),
    TABLES: {},
}));

// Mock auth middleware
vi.mock('../../src/middlewares/auth.middleware.js', () => ({
    authMiddleware: () => async (c: any, next: any) => {
        c.set('user', { id: 'test-user-id' });
        await next();
    },
}));

describe('Account Linking Integration', () => {
    let app: Hono<{ Variables: any }>;

    beforeEach(() => {
        vi.clearAllMocks();
        app = new Hono();
        app.route('/api/v1/account', accountLinkingRouter);
    });

    it('should successfully link an account via OAuth', async () => {
        // Setup mocks
        mockExchangeOAuthCode.mockResolvedValue({
            accessToken: 'mock-access-token',
            idToken: 'mock-id-token',
        });

        mockGetOAuthUserInfo.mockResolvedValue({
            id: 'mock-provider-user-id',
            email: 'test@example.com',
            raw: { some: 'data' },
        });

        mockLinkAccount.mockResolvedValue({
            success: true,
            account: {
                provider: 'google',
                provider_email: 'test@example.com',
                created_at: new Date().toISOString(),
            },
        });

        // Make request
        const res = await app.request('/api/v1/account/link-oauth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                provider: 'google',
                code: 'mock-auth-code',
                redirect_uri: 'http://localhost/callback',
            }),
        });

        // Verify response
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.success).toBe(true);
        expect(body.account.provider).toBe('google');

        // Verify service calls
        expect(mockExchangeOAuthCode).toHaveBeenCalledWith('google', 'mock-auth-code', 'http://localhost/callback');
        expect(mockLinkAccount).toHaveBeenCalledWith(
            'test-user-id',
            'google',
            'mock-provider-user-id',
            'test@example.com',
            { some: 'data' }
        );
    });

    it('should handle OAuth exchange failure', async () => {
        mockExchangeOAuthCode.mockResolvedValue(null);

        const res = await app.request('/api/v1/account/link-oauth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                provider: 'google',
                code: 'invalid-code',
                redirect_uri: 'http://localhost/callback',
            }),
        });

        expect(res.status).toBe(400);
        const body = await res.json();
        expect(body.error).toBe('oauth_error');
    });

    it('should handle linking conflict', async () => {
        mockExchangeOAuthCode.mockResolvedValue({ accessToken: 'token' });
        mockGetOAuthUserInfo.mockResolvedValue({ id: 'user-id' });

        mockLinkAccount.mockResolvedValue({
            success: false,
            conflict: { message: 'Already linked' },
        });

        const res = await app.request('/api/v1/account/link-oauth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                provider: 'google',
                code: 'code',
                redirect_uri: 'uri',
            }),
        });

        expect(res.status).toBe(409);
        const body = await res.json();
        expect(body.error).toBe('link_failed');
    });
});
