/**
 * UniAuth Client SDK - SSO Tests
 * UniAuth 客户端 SDK - SSO 流程测试
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { UniAuthClient, UniAuthError } from '../index';

// ─── Helpers ─────────────────────────────────────────────────────────
const defaultConfig = {
    baseUrl: 'https://auth.example.com',
    appKey: 'test-key',
    storage: 'memory' as const,
};

const ssoConfig = {
    ssoUrl: 'https://sso.example.com',
    clientId: 'sso-client-id',
    redirectUri: 'https://app.example.com/callback',
};

/** Helper to set window.location.search in jsdom env */
function setLocationSearch(search: string) {
    // jsdom doesn't allow direct assignment to window.location, use a workaround
    const url = new URL(`https://app.example.com/callback${search}`);
    // @ts-ignore — jsdom workaround
    delete (window as any).location;
    (window as any).location = {
        search: url.search,
        pathname: url.pathname,
        href: url.href,
        origin: url.origin,
        hash: '',
        host: url.host,
        hostname: url.hostname,
        port: url.port,
        protocol: url.protocol,
        assign: vi.fn(),
        reload: vi.fn(),
        replace: vi.fn(),
    };
}

// ─── Tests ───────────────────────────────────────────────────────────
describe('UniAuthClient - SSO', () => {
    let client: UniAuthClient;

    beforeEach(() => {
        vi.stubGlobal('fetch', vi.fn());
        const storageStub = {
            getItem: vi.fn(() => null),
            setItem: vi.fn(),
            removeItem: vi.fn(),
            clear: vi.fn(),
        };
        vi.stubGlobal('sessionStorage', storageStub);
        vi.stubGlobal('localStorage', {
            getItem: vi.fn(() => null),
            setItem: vi.fn(),
            removeItem: vi.fn(),
            clear: vi.fn(),
        });
        client = new UniAuthClient(defaultConfig);
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        vi.resetAllMocks();
    });

    // ── configureSso ─────────────────────────────────────────────────
    describe('configureSso', () => {
        it('should store SSO configuration', () => {
            client.configureSso(ssoConfig);
            // After configuring SSO, loginWithSSO should not throw SSO_NOT_CONFIGURED
            expect(() => {
                // loginWithSSO redirects via window.location, so we just check it doesn't throw our config error
                try {
                    client.loginWithSSO({ usePKCE: false });
                } catch (err: any) {
                    // Should NOT be SSO_NOT_CONFIGURED
                    if (err.code === 'SSO_NOT_CONFIGURED') throw err;
                    // Other errors (like redirect issues) are fine
                }
            }).not.toThrow();
        });

        it('should set default scope to "openid profile email"', () => {
            client.configureSso({ ...ssoConfig, scope: undefined });

            // Use setLocationSearch to set up writable location, then capture href
            setLocationSearch('');

            client.loginWithSSO({ usePKCE: false });

            // After loginWithSSO, window.location.href should have been set
            const url = window.location.href;
            expect(url).toContain('scope=openid+profile+email');
        });
    });

    // ── loginWithSSO ─────────────────────────────────────────────────
    describe('loginWithSSO', () => {
        it('should throw SSO_NOT_CONFIGURED when SSO is not configured', () => {
            expect(() => client.loginWithSSO()).toThrow(UniAuthError);
            try {
                client.loginWithSSO();
            } catch (err: any) {
                expect(err.code).toBe('SSO_NOT_CONFIGURED');
            }
        });

        it('should redirect to SSO authorize URL (no PKCE)', () => {
            client.configureSso(ssoConfig);
            setLocationSearch('');

            client.loginWithSSO({ usePKCE: false });

            const url = window.location.href;
            expect(url).toContain('https://sso.example.com/api/v1/oauth2/authorize');
            expect(url).toContain('client_id=sso-client-id');
            expect(url).toContain('redirect_uri=');
            expect(url).toContain('response_type=code');
            expect(url).toContain('state=');
        });
    });

    // ── isSSOCallback ────────────────────────────────────────────────
    describe('isSSOCallback', () => {
        it('should return true when URL has code and state params', () => {
            setLocationSearch('?code=auth-code-123&state=some-state');
            const freshClient = new UniAuthClient(defaultConfig);
            expect(freshClient.isSSOCallback()).toBe(true);
        });

        it('should return false when URL has no code param', () => {
            setLocationSearch('?state=some-state');
            const freshClient = new UniAuthClient(defaultConfig);
            expect(freshClient.isSSOCallback()).toBe(false);
        });

        it('should return false when URL has no state param', () => {
            setLocationSearch('?code=auth-code-123');
            const freshClient = new UniAuthClient(defaultConfig);
            expect(freshClient.isSSOCallback()).toBe(false);
        });

        it('should return false on empty URL', () => {
            setLocationSearch('');
            const freshClient = new UniAuthClient(defaultConfig);
            expect(freshClient.isSSOCallback()).toBe(false);
        });
    });

    // ── handleSSOCallback ────────────────────────────────────────────
    describe('handleSSOCallback', () => {
        it('should throw SSO_NOT_CONFIGURED when not configured', async () => {
            await expect(client.handleSSOCallback()).rejects.toThrow(UniAuthError);
            try {
                await client.handleSSOCallback();
            } catch (err: any) {
                expect(err.code).toBe('SSO_NOT_CONFIGURED');
            }
        });

        it('should throw when URL has error param', async () => {
            client.configureSso(ssoConfig);
            setLocationSearch('?error=access_denied&error_description=User+denied+access');

            try {
                await client.handleSSOCallback();
                expect.fail('Should have thrown');
            } catch (err: any) {
                expect(err).toBeInstanceOf(UniAuthError);
                expect(err.code).toBe('access_denied');
            }
        });

        it('should throw when no authorization code is present', async () => {
            client.configureSso(ssoConfig);
            setLocationSearch('?state=some-state');

            try {
                await client.handleSSOCallback();
                expect.fail('Should have thrown');
            } catch (err: any) {
                expect(err).toBeInstanceOf(UniAuthError);
                expect(err.code).toBe('NO_CODE');
            }
        });

        it('should exchange code for tokens and store them', async () => {
            client.configureSso(ssoConfig);
            setLocationSearch('?code=auth-code-123&state=saved-state');

            // Mock state retrieval from localStorage (return matching state)
            vi.mocked(localStorage.getItem).mockReturnValueOnce('saved-state');

            // Mock token exchange - exchangeSSOCode returns response.json() directly as OAuth2TokenResult
            vi.mocked(fetch)
                .mockResolvedValueOnce({
                    ok: true,
                    json: () => Promise.resolve({
                        access_token: 'new-access-token',
                        refresh_token: 'new-refresh-token',
                        token_type: 'Bearer',
                        expires_in: 3600,
                    }),
                } as Response)
                // Mock getCurrentUser - returns { success, data } format
                .mockResolvedValueOnce({
                    ok: true,
                    json: () => Promise.resolve({
                        success: true,
                        data: {
                            id: 'user-1',
                            phone: '+8613800138000',
                            email: null,
                            nickname: 'Test',
                            avatar_url: null,
                        },
                    }),
                } as Response);

            vi.spyOn(window.history, 'replaceState').mockImplementation(() => { });

            const result = await client.handleSSOCallback();

            expect(result).not.toBeNull();
            expect(result!.access_token).toBe('new-access-token');
            expect(result!.user.id).toBe('user-1');
        });
    });
});
