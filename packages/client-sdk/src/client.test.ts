/**
 * UniAuth Client SDK Tests
 * UniAuth 客户端 SDK 测试
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Test the exported utilities from http.ts
describe('HTTP Utilities', () => {
    describe('PKCE Functions', () => {
        // Mock crypto for Node.js environment
        beforeEach(() => {
            if (typeof globalThis.crypto === 'undefined') {
                // @ts-ignore - Adding mock crypto for testing
                globalThis.crypto = {
                    getRandomValues: (arr: Uint8Array) => {
                        for (let i = 0; i < arr.length; i++) {
                            arr[i] = Math.floor(Math.random() * 256);
                        }
                        return arr;
                    },
                    subtle: {
                        digest: async (_algorithm: string, data: ArrayBuffer) => {
                            // Simple mock - in real scenario would use actual SHA-256
                            const view = new Uint8Array(data);
                            const hash = new Uint8Array(32);
                            for (let i = 0; i < 32; i++) {
                                hash[i] = view[i % view.length] ^ (i * 7);
                            }
                            return hash.buffer;
                        },
                    },
                };
            }
        });

        it('should generate a valid code verifier', async () => {
            const { generateCodeVerifier } = await import('./http.js');
            const verifier = generateCodeVerifier();

            // Should be base64url encoded
            expect(verifier).toMatch(/^[A-Za-z0-9_-]+$/);
            // Should be at least 43 characters (32 bytes base64 encoded)
            expect(verifier.length).toBeGreaterThanOrEqual(43);
        });

        it('should generate different verifiers each time', async () => {
            const { generateCodeVerifier } = await import('./http.js');
            const verifier1 = generateCodeVerifier();
            const verifier2 = generateCodeVerifier();

            expect(verifier1).not.toBe(verifier2);
        });

        it('should generate a valid code challenge from verifier', async () => {
            const { generateCodeVerifier, generateCodeChallenge } =
                await import('./http.js');
            const verifier = generateCodeVerifier();
            const challenge = await generateCodeChallenge(verifier);

            // Should be base64url encoded
            expect(challenge).toMatch(/^[A-Za-z0-9_-]+$/);
            // Should be 43 characters (32 bytes SHA-256 base64 encoded)
            expect(challenge.length).toBe(43);
        });

        it('should generate consistent challenge for same verifier', async () => {
            const { generateCodeChallenge } = await import('./http.js');
            const verifier = 'test-verifier-123';
            const challenge1 = await generateCodeChallenge(verifier);
            const challenge2 = await generateCodeChallenge(verifier);

            expect(challenge1).toBe(challenge2);
        });
    });

    describe('Storage Functions', () => {
        beforeEach(() => {
            // Mock sessionStorage
            const storage: Record<string, string> = {};
            vi.stubGlobal('sessionStorage', {
                getItem: (key: string) => storage[key] || null,
                setItem: (key: string, value: string) => {
                    storage[key] = value;
                },
                removeItem: (key: string) => {
                    delete storage[key];
                },
                clear: () => {
                    Object.keys(storage).forEach((key) => delete storage[key]);
                },
            });
        });

        afterEach(() => {
            vi.unstubAllGlobals();
        });

        it('should store and retrieve code verifier', async () => {
            const { storeCodeVerifier, getAndClearCodeVerifier } =
                await import('./http.js');

            storeCodeVerifier('test-verifier');
            const retrieved = getAndClearCodeVerifier();

            expect(retrieved).toBe('test-verifier');
        });

        it('should clear code verifier after retrieval', async () => {
            const { storeCodeVerifier, getAndClearCodeVerifier } =
                await import('./http.js');

            storeCodeVerifier('test-verifier');
            getAndClearCodeVerifier();
            const secondRetrieval = getAndClearCodeVerifier();

            expect(secondRetrieval).toBeNull();
        });

        it('should support custom storage key', async () => {
            const { storeCodeVerifier, getAndClearCodeVerifier } =
                await import('./http.js');

            storeCodeVerifier('custom-verifier', 'custom_key');
            const retrieved = getAndClearCodeVerifier('custom_key');

            expect(retrieved).toBe('custom-verifier');
        });
    });
});

describe('UniAuthClient', () => {
    beforeEach(() => {
        // Mock localStorage
        const storage: Record<string, string> = {};
        vi.stubGlobal('localStorage', {
            getItem: (key: string) => storage[key] || null,
            setItem: (key: string, value: string) => {
                storage[key] = value;
            },
            removeItem: (key: string) => {
                delete storage[key];
            },
            clear: () => {
                Object.keys(storage).forEach((key) => delete storage[key]);
            },
        });

        // Mock fetch
        vi.stubGlobal('fetch', vi.fn());
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        vi.resetAllMocks();
    });

    describe('Configuration', () => {
        it('should create client with default config', async () => {
            const { UniAuthClient } = await import('./index.js');
            const client = new UniAuthClient({
                baseUrl: 'https://auth.example.com',
            });

            expect(client).toBeDefined();
        });

        it('should create client with custom storage', async () => {
            const { UniAuthClient } = await import('./index.js');
            const client = new UniAuthClient({
                baseUrl: 'https://auth.example.com',
                storage: 'memory',
            });

            expect(client).toBeDefined();
        });
    });

    describe('Authentication State', () => {
        it('should return false for isAuthenticated when no token', async () => {
            const { UniAuthClient } = await import('./index.js');
            const client = new UniAuthClient({
                baseUrl: 'https://auth.example.com',
                storage: 'memory',
            });

            expect(client.isAuthenticated()).toBe(false);
        });
    });

    describe('Send Code', () => {
        it('should send verification code successfully', async () => {
            const mockResponse = {
                success: true,
                data: {
                    expires_in: 300,
                    retry_after: 60,
                },
            };

            vi.mocked(fetch).mockResolvedValueOnce({
                ok: true,
                json: async () => mockResponse,
            } as Response);

            const { UniAuthClient } = await import('./index.js');
            const client = new UniAuthClient({
                baseUrl: 'https://auth.example.com',
                appKey: 'test-key',
                enableRetry: false,
            });

            const result = await client.sendCode('+8613800138000');

            expect(result.expires_in).toBe(300);
            expect(result.retry_after).toBe(60);
        });

        it('should throw error when send code fails', async () => {
            const mockResponse = {
                success: false,
                error: {
                    code: 'RATE_LIMITED',
                    message: 'Too many requests',
                },
            };

            vi.mocked(fetch).mockResolvedValueOnce({
                ok: true,
                json: async () => mockResponse,
            } as Response);

            const { UniAuthClient } = await import('./index.js');
            const client = new UniAuthClient({
                baseUrl: 'https://auth.example.com',
                enableRetry: false,
            });

            await expect(client.sendCode('+8613800138000')).rejects.toThrow(
                'Too many requests'
            );
        });
    });

    describe('Login', () => {
        it('should login with phone code successfully', async () => {
            const mockResponse = {
                success: true,
                data: {
                    user: {
                        id: 'user-123',
                        phone: '+8613800138000',
                        email: null,
                        nickname: 'Test User',
                        avatar_url: null,
                    },
                    access_token: 'access-token-123',
                    refresh_token: 'refresh-token-123',
                    expires_in: 3600,
                    is_new_user: false,
                },
            };

            vi.mocked(fetch).mockResolvedValueOnce({
                ok: true,
                json: async () => mockResponse,
            } as Response);

            const { UniAuthClient } = await import('./index.js');
            const client = new UniAuthClient({
                baseUrl: 'https://auth.example.com',
                storage: 'memory',
                enableRetry: false,
            });

            const result = await client.loginWithCode('+8613800138000', '123456');

            expect(result.user.id).toBe('user-123');
            expect(result.access_token).toBe('access-token-123');
            expect(client.isAuthenticated()).toBe(true);
        });

        it('should login with email code successfully', async () => {
            const mockResponse = {
                success: true,
                data: {
                    user: {
                        id: 'user-456',
                        phone: null,
                        email: 'test@example.com',
                        nickname: 'Email User',
                        avatar_url: null,
                    },
                    access_token: 'email-token-123',
                    refresh_token: 'refresh-token-456',
                    expires_in: 3600,
                    is_new_user: true,
                },
            };

            vi.mocked(fetch).mockResolvedValueOnce({
                ok: true,
                json: async () => mockResponse,
            } as Response);

            const { UniAuthClient } = await import('./index.js');
            const client = new UniAuthClient({
                baseUrl: 'https://auth.example.com',
                storage: 'memory',
                enableRetry: false,
            });

            const result = await client.loginWithEmailCode(
                'test@example.com',
                '654321'
            );

            expect(result.user.email).toBe('test@example.com');
            expect(result.is_new_user).toBe(true);
        });
    });

    describe('OAuth2 Flow', () => {
        it('should generate authorization URL', async () => {
            // Mock crypto for PKCE
            vi.stubGlobal('crypto', {
                getRandomValues: (arr: Uint8Array) => {
                    for (let i = 0; i < arr.length; i++) {
                        arr[i] = i % 256;
                    }
                    return arr;
                },
                subtle: {
                    digest: async () => new Uint8Array(32).buffer,
                },
            });
            vi.stubGlobal('sessionStorage', {
                getItem: () => null,
                setItem: () => { },
                removeItem: () => { },
                clear: () => { },
            });

            const { UniAuthClient } = await import('./index.js');
            const client = new UniAuthClient({
                baseUrl: 'https://auth.example.com',
                clientId: 'my-client-id',
            });

            const url = await client.startOAuth2Flow({
                redirectUri: 'https://myapp.com/callback',
                scope: 'openid profile',
                state: 'random-state',
            });

            expect(url).toContain('client_id=my-client-id');
            expect(url).toContain('redirect_uri=https%3A%2F%2Fmyapp.com%2Fcallback');
            expect(url).toContain('scope=openid+profile');
            expect(url).toContain('state=random-state');
            expect(url).toContain('response_type=code');
        });

        it('should throw error when clientId not configured', async () => {
            const { UniAuthClient } = await import('./index.js');
            const client = new UniAuthClient({
                baseUrl: 'https://auth.example.com',
                // No clientId
            });

            await expect(
                client.startOAuth2Flow({
                    redirectUri: 'https://myapp.com/callback',
                })
            ).rejects.toThrow('clientId is required');
        });
    });

    describe('Logout', () => {
        it('should clear tokens on logout', async () => {
            // Mock login response first
            const mockLoginResponse = {
                success: true,
                data: {
                    user: {
                        id: 'user-123',
                        phone: '+8613800138000',
                        email: null,
                        nickname: 'Test',
                        avatar_url: null,
                    },
                    access_token: 'access-token',
                    refresh_token: 'refresh-token',
                    expires_in: 3600,
                    is_new_user: false,
                },
            };

            vi.mocked(fetch)
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => mockLoginResponse,
                } as Response)
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ success: true }),
                } as Response);

            const { UniAuthClient } = await import('./index.js');
            const client = new UniAuthClient({
                baseUrl: 'https://auth.example.com',
                storage: 'memory',
                enableRetry: false,
            });

            // Login first
            await client.loginWithCode('+8613800138000', '123456');
            expect(client.isAuthenticated()).toBe(true);

            // Then logout
            await client.logout();

            expect(client.isAuthenticated()).toBe(false);
        });
    });
});

describe('Retry Logic', () => {
    beforeEach(() => {
        vi.stubGlobal('fetch', vi.fn());
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        vi.resetAllMocks();
    });

    it('should retry on 503 status', async () => {
        const { fetchWithRetry } = await import('./http.js');

        // First call returns 503, second succeeds
        vi.mocked(fetch)
            .mockResolvedValueOnce({
                status: 503,
                headers: new Map(),
            } as unknown as Response)
            .mockResolvedValueOnce({
                status: 200,
                ok: true,
            } as Response);

        const response = await fetchWithRetry('https://api.test.com', {
            maxRetries: 2,
            baseDelay: 10, // Short delay for testing
        });

        expect(response.status).toBe(200);
        expect(fetch).toHaveBeenCalledTimes(2);
    });

    it('should not retry on 400 status', async () => {
        const { fetchWithRetry } = await import('./http.js');

        vi.mocked(fetch).mockResolvedValueOnce({
            status: 400,
            ok: false,
        } as Response);

        const response = await fetchWithRetry('https://api.test.com', {
            maxRetries: 3,
            baseDelay: 10,
        });

        expect(response.status).toBe(400);
        expect(fetch).toHaveBeenCalledTimes(1);
    });
});
