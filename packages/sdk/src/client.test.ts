import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UniAuthClient } from '../src/client';
import axios from 'axios';

// Mock axios
vi.mock('axios');

describe('UniAuthClient', () => {
    let client: UniAuthClient;
    let mockPost: ReturnType<typeof vi.fn>;

    const mockOptions = {
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
        baseUrl: 'https://auth.example.com',
    };

    beforeEach(() => {
        // Reset mocks
        vi.clearAllMocks();

        // Setup axios create mock
        mockPost = vi.fn();
        const mockAxiosInstance = {
            post: mockPost,
            get: vi.fn(),
        };
        (axios.create as any).mockReturnValue(mockAxiosInstance);
        (axios.isAxiosError as any) = (error: any) => error?.isAxiosError === true;

        client = new UniAuthClient(mockOptions);
    });

    describe('constructor', () => {
        it('should create axios instance with correct config', () => {
            expect(axios.create).toHaveBeenCalledWith({
                baseURL: mockOptions.baseUrl,
                timeout: 10000,
                headers: {
                    'Content-Type': 'application/json',
                    'X-Client-Id': mockOptions.clientId,
                    'X-Client-Secret': mockOptions.clientSecret,
                },
            });
        });

        it('should use default baseUrl if not provided', () => {
            vi.clearAllMocks();
            new UniAuthClient({ clientId: 'test' });
            expect(axios.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    baseURL: 'https://auth.uniauth.com',
                })
            );
        });
    });

    describe('sendPhoneCode', () => {
        it('should call API with correct parameters', async () => {
            const mockResponse = {
                data: {
                    message: 'Code sent',
                    data: { expires_in: 300 }
                }
            };
            mockPost.mockResolvedValue(mockResponse);

            const result = await client.sendPhoneCode('+8613800138000', 'login');

            expect(mockPost).toHaveBeenCalledWith('/api/v1/auth/trusted/phone/send-code', {
                phone: '+8613800138000',
                type: 'login',
            });

            expect(result).toEqual({
                success: true,
                message: 'Code sent',
                expires_in: 300,
                retry_after: undefined,
            });
        });

        it('should handle error response', async () => {
            const axiosError = new Error('Request failed') as any;
            axiosError.isAxiosError = true;
            axiosError.response = {
                status: 400,
                data: { error: { message: 'Invalid phone number' } }
            };
            mockPost.mockRejectedValue(axiosError);

            const result = await client.sendPhoneCode('invalid', 'login');
            expect(result.success).toBe(false);
            // The SDK stores error object, not error.message directly
            expect(result.message).toBe('Invalid phone number');
        });
    });

    describe('loginWithPhoneCode', () => {
        it('should call API with correct parameters', async () => {
            const mockResponse = {
                data: {
                    success: true,
                    data: {
                        access_token: 'at123',
                        refresh_token: 'rt456',
                        expires_in: 3600,
                        user: { id: 'user1', phone: '+8613800138000' }
                    }
                }
            };
            mockPost.mockResolvedValue(mockResponse);

            const result = await client.loginWithPhoneCode('+8613800138000', '123456');

            expect(mockPost).toHaveBeenCalledWith('/api/v1/auth/trusted/phone/verify', {
                phone: '+8613800138000',
                code: '123456',
            });

            expect(result.success).toBe(true);
            expect(result.access_token).toBe('at123');
            expect(result.refresh_token).toBe('rt456');
        });

        it('should handle MFA required response', async () => {
            const mockResponse = {
                data: {
                    success: true,
                    data: {
                        mfa_required: true,
                        mfa_token: 'mfa123'
                    }
                }
            };
            mockPost.mockResolvedValue(mockResponse);

            const result = await client.loginWithPhoneCode('+8613800138000', '123456');

            // MFA data is in result.data
            expect(result.data?.mfa_required).toBe(true);
            expect(result.data?.mfa_token).toBe('mfa123');
        });
    });

    describe('sendEmailCode', () => {
        it('should call API with correct parameters', async () => {
            const mockResponse = {
                data: {
                    message: 'Code sent to email',
                    data: { expires_in: 600 }
                }
            };
            mockPost.mockResolvedValue(mockResponse);

            const result = await client.sendEmailCode('test@example.com', 'email_verify');

            expect(mockPost).toHaveBeenCalledWith('/api/v1/auth/trusted/email/send-code', {
                email: 'test@example.com',
                type: 'email_verify',
            });

            expect(result.success).toBe(true);
            expect(result.expires_in).toBe(600);
        });
    });

    describe('loginWithEmailCode', () => {
        it('should call API with correct parameters', async () => {
            const mockResponse = {
                data: {
                    success: true,
                    data: {
                        access_token: 'at789',
                        refresh_token: 'rt012',
                        expires_in: 3600,
                        user: { id: 'user2', email: 'test@example.com' }
                    }
                }
            };
            mockPost.mockResolvedValue(mockResponse);

            const result = await client.loginWithEmailCode('test@example.com', '654321');

            expect(mockPost).toHaveBeenCalledWith('/api/v1/auth/trusted/email/verify', {
                email: 'test@example.com',
                code: '654321',
            });

            expect(result.success).toBe(true);
            expect(result.access_token).toBe('at789');
        });
    });

    describe('loginWithEmailPassword', () => {
        it('should call API with correct parameters', async () => {
            const mockResponse = {
                data: {
                    success: true,
                    data: {
                        access_token: 'at_email',
                        refresh_token: 'rt_email',
                        expires_in: 3600
                    }
                }
            };
            mockPost.mockResolvedValue(mockResponse);

            const result = await client.loginWithEmailPassword('user@test.com', 'password123');

            expect(mockPost).toHaveBeenCalledWith('/api/v1/auth/trusted/email/login', {
                email: 'user@test.com',
                password: 'password123',
            });

            expect(result.success).toBe(true);
        });
    });

    describe('verifyMFA', () => {
        it('should call API with correct parameters', async () => {
            const mockResponse = {
                data: {
                    success: true,
                    data: {
                        access_token: 'at_mfa',
                        refresh_token: 'rt_mfa',
                        expires_in: 3600
                    }
                }
            };
            mockPost.mockResolvedValue(mockResponse);

            const result = await client.verifyMFA('mfa_token_123', '123456');

            expect(mockPost).toHaveBeenCalledWith('/api/v1/auth/trusted/mfa/verify', {
                mfa_token: 'mfa_token_123',
                code: '123456',
            });

            expect(result.success).toBe(true);
            expect(result.access_token).toBe('at_mfa');
        });
    });

    describe('refreshToken', () => {
        it('should call API with correct parameters', async () => {
            const mockResponse = {
                data: {
                    success: true,
                    data: {
                        access_token: 'new_at',
                        refresh_token: 'new_rt',
                        expires_in: 3600
                    }
                }
            };
            mockPost.mockResolvedValue(mockResponse);

            const result = await client.refreshToken('old_refresh_token');

            expect(mockPost).toHaveBeenCalledWith('/api/v1/auth/trusted/token/refresh', {
                refresh_token: 'old_refresh_token',
            });

            expect(result.success).toBe(true);
            expect(result.access_token).toBe('new_at');
            expect(result.refresh_token).toBe('new_rt');
        });
    });

    describe('getAuthorizeUrl', () => {
        it('should generate correct URL with state', () => {
            const url = client.getAuthorizeUrl('https://example.com/cb', 'openid email', 'xyz');
            expect(url).toBe('https://auth.example.com/api/v1/oauth2/authorize?response_type=code&client_id=test-client-id&redirect_uri=https%3A%2F%2Fexample.com%2Fcb&scope=openid+email&state=xyz');
        });

        it('should generate URL without state when not provided', () => {
            const url = client.getAuthorizeUrl('https://example.com/cb', 'openid');
            expect(url).toContain('client_id=test-client-id');
            expect(url).toContain('scope=openid');
            // State is optional - SDK doesn't auto-generate it
        });
    });

    describe('loginWithClientCredentials', () => {
        it('should call API with correct parameters', async () => {
            const mockResponse = {
                data: {
                    access_token: 'at123',
                    token_type: 'Bearer',
                    expires_in: 3600
                }
            };
            mockPost.mockResolvedValue(mockResponse);

            const result = await client.loginWithClientCredentials('scope1 scope2');

            expect(mockPost).toHaveBeenCalledWith('/api/v1/oauth2/token', {
                grant_type: 'client_credentials',
                client_id: mockOptions.clientId,
                client_secret: mockOptions.clientSecret,
                scope: 'scope1 scope2',
            });
            expect(result.access_token).toBe('at123');
        });

        it('should pass array of scopes as-is', async () => {
            const mockResponse = { data: { access_token: 'at456' } };
            mockPost.mockResolvedValue(mockResponse);

            await client.loginWithClientCredentials(['read', 'write']);

            // SDK passes array as-is - not joining them
            expect(mockPost).toHaveBeenCalledWith('/api/v1/oauth2/token',
                expect.objectContaining({
                    scope: ['read', 'write'],
                })
            );
        });
    });

    describe('introspectToken', () => {
        it('should call API with correct parameters', async () => {
            const mockResponse = {
                data: {
                    active: true,
                    client_id: 'abc',
                    sub: 'user123',
                    scope: 'openid email'
                }
            };
            mockPost.mockResolvedValue(mockResponse);

            const result = await client.introspectToken('token123', 'access_token');

            expect(mockPost).toHaveBeenCalledWith('/api/v1/oauth2/introspect', {
                token: 'token123',
                token_type_hint: 'access_token',
                client_id: mockOptions.clientId,
                client_secret: mockOptions.clientSecret,
            });
            expect(result.active).toBe(true);
            expect(result.sub).toBe('user123');
        });

        it('should return inactive for invalid token', async () => {
            const mockResponse = { data: { active: false } };
            mockPost.mockResolvedValue(mockResponse);

            const result = await client.introspectToken('invalid_token');
            expect(result.active).toBe(false);
        });
    });

    describe('error handling', () => {
        it('should handle network errors', async () => {
            const networkError = new Error('Network Error') as any;
            networkError.isAxiosError = true;
            // No response - pure network error
            mockPost.mockRejectedValue(networkError);

            const result = await client.sendPhoneCode('+8613800138000', 'login');
            expect(result.success).toBe(false);
            expect(result.message).toBe('Network Error');
        });

        it('should extract error message from response', async () => {
            const axiosError = new Error('Request failed') as any;
            axiosError.isAxiosError = true;
            axiosError.response = {
                status: 401,
                data: { error: { message: 'Unauthorized', code: 'UNAUTHORIZED' } }
            };
            mockPost.mockRejectedValue(axiosError);

            const result = await client.loginWithPhoneCode('+8613800138000', 'wrong');
            expect(result.success).toBe(false);
            expect(result.message).toBe('Unauthorized');
        });
    });
});
