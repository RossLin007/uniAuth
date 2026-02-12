/**
 * UniAuth Server SDK Tests
 * UniAuth 服务端 SDK 测试
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { UniAuthServer } from './index.js';

describe('UniAuthServer', () => {
    beforeEach(() => {
        vi.stubGlobal('fetch', vi.fn());
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        vi.resetAllMocks();
    });

    describe('Configuration', () => {
        it('should create server with required config', () => {
            const server = new UniAuthServer({
                baseUrl: 'https://auth.example.com',
                appKey: 'test-app-key',
                appSecret: 'test-app-secret',
            });

            expect(server).toBeDefined();
        });
    });

    describe('verifyToken', () => {
        it('should verify token successfully', async () => {
            const mockPayload = {
                sub: 'user-123',
                phone: '+8613800138000',
                iat: Math.floor(Date.now() / 1000),
                exp: Math.floor(Date.now() / 1000) + 3600,
            };

            vi.mocked(fetch).mockResolvedValueOnce({
                ok: true,
                json: async () => ({ success: true, data: mockPayload }),
            } as Response);

            const server = new UniAuthServer({
                baseUrl: 'https://auth.example.com',
                appKey: 'test-key',
                appSecret: 'test-secret',
            });

            const result = await server.verifyToken('test-token');

            expect(result.sub).toBe('user-123');
            expect(result.phone).toBe('+8613800138000');
        });

        it('should throw error for invalid token', async () => {
            vi.mocked(fetch).mockResolvedValueOnce({
                ok: false,
                json: async () => ({
                    success: false,
                    error: { code: 'INVALID_TOKEN', message: 'Token is invalid' },
                }),
            } as Response);

            const server = new UniAuthServer({
                baseUrl: 'https://auth.example.com',
                appKey: 'test-key',
                appSecret: 'test-secret',
            });

            await expect(server.verifyToken('invalid-token')).rejects.toThrow('Token is invalid');
        });

        it('should cache verified tokens', async () => {
            const mockPayload = {
                sub: 'user-123',
                phone: '+8613800138000',
                iat: Math.floor(Date.now() / 1000),
                exp: Math.floor(Date.now() / 1000) + 3600,
            };

            vi.mocked(fetch).mockResolvedValueOnce({
                ok: true,
                json: async () => ({ success: true, data: mockPayload }),
            } as Response);

            const server = new UniAuthServer({
                baseUrl: 'https://auth.example.com',
                appKey: 'test-key',
                appSecret: 'test-secret',
            });

            // First call - should make HTTP request
            await server.verifyToken('cached-token');

            // Second call - should use cache
            await server.verifyToken('cached-token');

            // fetch should only be called once due to caching
            expect(fetch).toHaveBeenCalledTimes(1);
        });

        it('should fallback to introspection when /auth/verify returns network error', async () => {
            const mockIntrospectionResult = {
                active: true,
                sub: 'user-456',
                iss: 'https://auth.example.com',
                aud: 'test-client',
                iat: Math.floor(Date.now() / 1000),
                exp: Math.floor(Date.now() / 1000) + 3600,
                scope: 'openid profile',
                client_id: 'test-client',
            };

            // First call to /auth/verify fails with network error
            vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'));

            // Second call to /oauth2/introspect succeeds
            vi.mocked(fetch).mockResolvedValueOnce({
                ok: true,
                json: async () => mockIntrospectionResult,
            } as Response);

            const server = new UniAuthServer({
                baseUrl: 'https://auth.example.com',
                appKey: 'test-key',
                appSecret: 'test-secret',
            });

            const result = await server.verifyToken('test-token');

            expect(result.sub).toBe('user-456');
            expect(result.scope).toBe('openid profile');
            expect(fetch).toHaveBeenCalledTimes(2);
        });

        it('should not fallback when /auth/verify returns explicit auth error', async () => {
            // /auth/verify returns 401 with structured error (ServerAuthError)
            vi.mocked(fetch).mockResolvedValueOnce({
                ok: false,
                json: async () => ({
                    success: false,
                    error: { code: 'TOKEN_EXPIRED', message: 'Token has expired' },
                }),
            } as Response);

            const server = new UniAuthServer({
                baseUrl: 'https://auth.example.com',
                appKey: 'test-key',
                appSecret: 'test-secret',
            });

            // Should throw directly, no fallback for explicit auth errors
            await expect(server.verifyToken('expired-token')).rejects.toThrow('Token has expired');

            // Should only call /auth/verify, not introspect
            expect(fetch).toHaveBeenCalledTimes(1);
        });

        it('should send correct headers to /auth/verify', async () => {
            const mockPayload = {
                sub: 'user-789',
                iat: Math.floor(Date.now() / 1000),
                exp: Math.floor(Date.now() / 1000) + 3600,
            };

            vi.mocked(fetch).mockResolvedValueOnce({
                ok: true,
                json: async () => ({ success: true, data: mockPayload }),
            } as Response);

            const server = new UniAuthServer({
                baseUrl: 'https://auth.example.com',
                appKey: 'my-app-key',
                appSecret: 'my-app-secret',
            });

            await server.verifyToken('some-token');

            expect(fetch).toHaveBeenCalledWith(
                'https://auth.example.com/api/v1/auth/verify',
                expect.objectContaining({
                    method: 'POST',
                    headers: expect.objectContaining({
                        'X-App-Key': 'my-app-key',
                        'X-App-Secret': 'my-app-secret',
                        'Content-Type': 'application/json',
                    }),
                    body: JSON.stringify({ token: 'some-token' }),
                })
            );
        });
    });

    describe('getUser', () => {
        it('should get user info successfully', async () => {
            const mockUser = {
                id: 'user-123',
                phone: '+8613800138000',
                nickname: 'Test User',
                avatar_url: null,
                phone_verified: true,
            };

            vi.mocked(fetch).mockResolvedValueOnce({
                ok: true,
                json: async () => ({ success: true, data: mockUser }),
            } as Response);

            const server = new UniAuthServer({
                baseUrl: 'https://auth.example.com',
                appKey: 'test-key',
                appSecret: 'test-secret',
            });

            const result = await server.getUser('user-123');

            expect(result.id).toBe('user-123');
            expect(result.nickname).toBe('Test User');
        });

        it('should throw error when user not found', async () => {
            vi.mocked(fetch).mockResolvedValueOnce({
                ok: false,
                status: 404,
                json: async () => ({
                    success: false,
                    error: { code: 'USER_NOT_FOUND', message: 'User not found' },
                }),
            } as Response);

            const server = new UniAuthServer({
                baseUrl: 'https://auth.example.com',
                appKey: 'test-key',
                appSecret: 'test-secret',
            });

            await expect(server.getUser('unknown-user')).rejects.toThrow('User not found');
        });
    });

    describe('clearCache', () => {
        it('should clear the token cache', async () => {
            const mockPayload = {
                sub: 'user-123',
                phone: '+8613800138000',
                iat: Math.floor(Date.now() / 1000),
                exp: Math.floor(Date.now() / 1000) + 3600,
            };

            vi.mocked(fetch).mockResolvedValue({
                ok: true,
                json: async () => ({ success: true, data: mockPayload }),
            } as Response);

            const server = new UniAuthServer({
                baseUrl: 'https://auth.example.com',
                appKey: 'test-key',
                appSecret: 'test-secret',
            });

            // First call
            await server.verifyToken('test-token');
            expect(fetch).toHaveBeenCalledTimes(1);

            // Clear cache
            server.clearCache();

            // Second call - should make new HTTP request
            await server.verifyToken('test-token');
            expect(fetch).toHaveBeenCalledTimes(2);
        });
    });

    describe('middleware (Express)', () => {
        const serverConfig = {
            baseUrl: 'https://auth.example.com',
            appKey: 'test-key',
            appSecret: 'test-secret',
        };

        const mockPayload = {
            sub: 'user-123',
            phone: '+8613800138000',
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + 3600,
        };

        const mockUser = {
            id: 'user-123',
            phone: '+8613800138000',
            nickname: 'Test User',
            avatar_url: null,
        };

        it('should create middleware function', () => {
            const server = new UniAuthServer(serverConfig);
            const middleware = server.middleware();
            expect(typeof middleware).toBe('function');
        });

        it('should reject requests without authorization header', async () => {
            const server = new UniAuthServer(serverConfig);
            const middleware = server.middleware();

            const mockReq = { headers: {} };
            const mockRes = {
                status: vi.fn().mockReturnThis(),
                json: vi.fn(),
            };
            const mockNext = vi.fn();

            await middleware(mockReq as any, mockRes as any, mockNext);

            expect(mockRes.status).toHaveBeenCalledWith(401);
            expect(mockRes.json).toHaveBeenCalledWith({
                success: false,
                error: {
                    code: 'UNAUTHORIZED',
                    message: expect.stringContaining('Authorization header'),
                },
            });
            expect(mockNext).not.toHaveBeenCalled();
        });

        it('should reject non-Bearer authorization header', async () => {
            const server = new UniAuthServer(serverConfig);
            const middleware = server.middleware();

            const mockReq = { headers: { authorization: 'Basic dXNlcjpwYXNz' } };
            const mockRes = {
                status: vi.fn().mockReturnThis(),
                json: vi.fn(),
            };
            const mockNext = vi.fn();

            await middleware(mockReq as any, mockRes as any, mockNext);

            expect(mockRes.status).toHaveBeenCalledWith(401);
            expect(mockNext).not.toHaveBeenCalled();
        });

        it('should authenticate valid token and attach user info', async () => {
            // Mock verifyToken
            vi.mocked(fetch).mockResolvedValueOnce({
                ok: true,
                json: async () => ({ success: true, data: mockPayload }),
            } as Response);

            // Mock getUser
            vi.mocked(fetch).mockResolvedValueOnce({
                ok: true,
                json: async () => ({ success: true, data: mockUser }),
            } as Response);

            const server = new UniAuthServer(serverConfig);
            const middleware = server.middleware();

            const mockReq = { headers: { authorization: 'Bearer valid-token' } } as any;
            const mockRes = {
                status: vi.fn().mockReturnThis(),
                json: vi.fn(),
            };
            const mockNext = vi.fn();

            await middleware(mockReq, mockRes as any, mockNext);

            expect(mockNext).toHaveBeenCalled();
            expect(mockReq.authPayload).toBeDefined();
            expect(mockReq.authPayload.sub).toBe('user-123');
            expect(mockReq.user).toBeDefined();
            expect(mockReq.user.id).toBe('user-123');
        });

        it('should call next even when getUser fails (user info optional)', async () => {
            // Mock verifyToken success
            vi.mocked(fetch).mockResolvedValueOnce({
                ok: true,
                json: async () => ({ success: true, data: mockPayload }),
            } as Response);

            // Mock getUser failure
            vi.mocked(fetch).mockResolvedValueOnce({
                ok: false,
                status: 404,
                json: async () => ({ success: false, error: { code: 'USER_NOT_FOUND', message: 'Not found' } }),
            } as Response);

            const server = new UniAuthServer(serverConfig);
            const middleware = server.middleware();

            const mockReq = { headers: { authorization: 'Bearer valid-token' } } as any;
            const mockRes = {
                status: vi.fn().mockReturnThis(),
                json: vi.fn(),
            };
            const mockNext = vi.fn();

            await middleware(mockReq, mockRes as any, mockNext);

            expect(mockNext).toHaveBeenCalled();
            expect(mockReq.authPayload).toBeDefined();
            // user may be undefined since getUser failed
        });

        it('should return 401 for invalid token', async () => {
            vi.mocked(fetch).mockResolvedValueOnce({
                ok: false,
                json: async () => ({
                    success: false,
                    error: { code: 'INVALID_TOKEN', message: 'Token is invalid' },
                }),
            } as Response);

            const server = new UniAuthServer(serverConfig);
            const middleware = server.middleware();

            const mockReq = { headers: { authorization: 'Bearer invalid-token' } };
            const mockRes = {
                status: vi.fn().mockReturnThis(),
                json: vi.fn(),
            };
            const mockNext = vi.fn();

            await middleware(mockReq as any, mockRes as any, mockNext);

            expect(mockRes.status).toHaveBeenCalledWith(401);
            expect(mockRes.json).toHaveBeenCalledWith({
                success: false,
                error: expect.objectContaining({
                    code: expect.any(String),
                }),
            });
            expect(mockNext).not.toHaveBeenCalled();
        });
    });

    describe('honoMiddleware', () => {
        const serverConfig = {
            baseUrl: 'https://auth.example.com',
            appKey: 'test-key',
            appSecret: 'test-secret',
        };

        const mockPayload = {
            sub: 'user-123',
            phone: '+8613800138000',
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + 3600,
        };

        const mockUser = {
            id: 'user-123',
            phone: '+8613800138000',
            nickname: 'Test User',
            avatar_url: null,
        };

        function createMockHonoContext(authHeader?: string) {
            const store = new Map<string, unknown>();
            return {
                req: {
                    header: (name: string) => {
                        if (name.toLowerCase() === 'authorization') return authHeader;
                        return undefined;
                    },
                },
                set: (key: string, value: unknown) => store.set(key, value),
                get: (key: string) => store.get(key),
                json: vi.fn((data: unknown, status?: number) => {
                    return new Response(JSON.stringify(data), { status: status || 200 });
                }),
                _store: store,
            };
        }

        it('should create Hono middleware function', () => {
            const server = new UniAuthServer(serverConfig);
            const middleware = server.honoMiddleware();
            expect(typeof middleware).toBe('function');
        });

        it('should reject requests without authorization header', async () => {
            const server = new UniAuthServer(serverConfig);
            const middleware = server.honoMiddleware();
            const ctx = createMockHonoContext();

            await middleware(ctx as any, vi.fn());

            expect(ctx.json).toHaveBeenCalledWith(
                {
                    success: false,
                    error: {
                        code: 'UNAUTHORIZED',
                        message: expect.stringContaining('Authorization header'),
                    },
                },
                401
            );
        });

        it('should reject non-Bearer authorization header', async () => {
            const server = new UniAuthServer(serverConfig);
            const middleware = server.honoMiddleware();
            const ctx = createMockHonoContext('Basic dXNlcjpwYXNz');

            await middleware(ctx as any, vi.fn());

            expect(ctx.json).toHaveBeenCalledWith(
                expect.objectContaining({ success: false }),
                401
            );
        });

        it('should authenticate valid token and set user in context', async () => {
            // Mock verifyToken
            vi.mocked(fetch).mockResolvedValueOnce({
                ok: true,
                json: async () => ({ success: true, data: mockPayload }),
            } as Response);

            // Mock getUser
            vi.mocked(fetch).mockResolvedValueOnce({
                ok: true,
                json: async () => ({ success: true, data: mockUser }),
            } as Response);

            const server = new UniAuthServer(serverConfig);
            const middleware = server.honoMiddleware();
            const ctx = createMockHonoContext('Bearer valid-token');
            const mockNext = vi.fn();

            await middleware(ctx as any, mockNext);

            expect(mockNext).toHaveBeenCalled();
            expect(ctx._store.get('authPayload')).toBeDefined();
            expect((ctx._store.get('authPayload') as any).sub).toBe('user-123');
            expect(ctx._store.get('user')).toBeDefined();
            expect((ctx._store.get('user') as any).id).toBe('user-123');
        });

        it('should call next even when getUser fails (user info optional)', async () => {
            // Mock verifyToken success
            vi.mocked(fetch).mockResolvedValueOnce({
                ok: true,
                json: async () => ({ success: true, data: mockPayload }),
            } as Response);

            // Mock getUser failure
            vi.mocked(fetch).mockResolvedValueOnce({
                ok: false,
                status: 404,
                json: async () => ({ success: false, error: { code: 'USER_NOT_FOUND', message: 'Not found' } }),
            } as Response);

            const server = new UniAuthServer(serverConfig);
            const middleware = server.honoMiddleware();
            const ctx = createMockHonoContext('Bearer valid-token');
            const mockNext = vi.fn();

            await middleware(ctx as any, mockNext);

            expect(mockNext).toHaveBeenCalled();
            expect(ctx._store.get('authPayload')).toBeDefined();
        });

        it('should return 401 JSON for invalid token', async () => {
            vi.mocked(fetch).mockResolvedValueOnce({
                ok: false,
                json: async () => ({
                    success: false,
                    error: { code: 'INVALID_TOKEN', message: 'Token is invalid' },
                }),
            } as Response);

            const server = new UniAuthServer(serverConfig);
            const middleware = server.honoMiddleware();
            const ctx = createMockHonoContext('Bearer invalid-token');
            const mockNext = vi.fn();

            await middleware(ctx as any, mockNext);

            expect(ctx.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    error: expect.objectContaining({
                        code: expect.any(String),
                    }),
                }),
                401
            );
            expect(mockNext).not.toHaveBeenCalled();
        });
    });
});
