import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UniAuthClient, UniAuthError } from '../src/index';

describe('UniAuthClient - Phone Validation', () => {
    let client: UniAuthClient;

    beforeEach(() => {
        client = new UniAuthClient({
            baseUrl: 'https://test.example.com',
            clientId: 'test-client',
        });
    });

    describe('sendCode phone validation', () => {
        it('should reject empty phone number', async () => {
            await expect(client.sendCode('')).rejects.toThrow(UniAuthError);
            await expect(client.sendCode('')).rejects.toMatchObject({
                code: 'INVALID_PHONE',
            });
        });

        it('should reject phone number without country code', async () => {
            await expect(client.sendCode('13800138000')).rejects.toMatchObject({
                code: 'INVALID_PHONE_FORMAT',
            });
        });

        it('should reject phone number without + prefix', async () => {
            await expect(client.sendCode('8613800138000')).rejects.toMatchObject({
                code: 'INVALID_PHONE_FORMAT',
            });
        });

        // China-specific validation
        it('should reject invalid China phone number (wrong length)', async () => {
            await expect(client.sendCode('+861380013800')).rejects.toMatchObject({
                code: 'INVALID_PHONE_FORMAT',
            });
        });

        it('should reject invalid China phone number (wrong prefix)', async () => {
            await expect(client.sendCode('+8612800138000')).rejects.toMatchObject({
                code: 'INVALID_PHONE_FORMAT',
            });
        });

        // USA-specific validation
        it('should reject invalid USA phone number (wrong format)', async () => {
            await expect(client.sendCode('+11234567890')).rejects.toMatchObject({
                code: 'INVALID_PHONE_FORMAT',
            });
        });

        // Australia-specific validation
        it('should reject invalid Australia phone number (wrong prefix)', async () => {
            await expect(client.sendCode('+61312345678')).rejects.toMatchObject({
                code: 'INVALID_PHONE_FORMAT',
            });
        });

        it('should accept valid country-specific phone numbers', async () => {
            // Mock the fetch to avoid actual API calls
            const mockFetch = vi.fn().mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({
                    success: true,
                    data: { expires_in: 300, retry_after: 60 },
                }),
            });
            global.fetch = mockFetch;

            // Valid phone numbers for each country
            const validNumbers = [
                '+8613800138000',      // China
                '+8619912345678',      // China (new prefix)
                '+14155552671',        // USA
                '+12025551234',        // USA
                '+61412345678',        // Australia
                '+447911123456',       // UK
                '+818012345678',       // Japan
            ];

            for (const phone of validNumbers) {
                mockFetch.mockClear();
                await expect(client.sendCode(phone)).resolves.toBeDefined();
                expect(mockFetch).toHaveBeenCalledWith(
                    expect.stringContaining('/api/v1/auth/phone/send-code'),
                    expect.objectContaining({
                        method: 'POST',
                        body: expect.stringContaining(phone),
                    })
                );
            }
        });
    });
});

describe('UniAuthClient - Email Validation', () => {
    let client: UniAuthClient;

    beforeEach(() => {
        client = new UniAuthClient({
            baseUrl: 'https://test.example.com',
            clientId: 'test-client',
        });
    });

    describe('sendEmailCode', () => {
        it('should accept valid email and make API call', async () => {
            const mockFetch = vi.fn().mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({
                    success: true,
                    data: { expires_in: 300, retry_after: 60 },
                }),
            });
            global.fetch = mockFetch;

            await expect(client.sendEmailCode('test@example.com')).resolves.toBeDefined();
            expect(mockFetch).toHaveBeenCalledWith(
                expect.stringContaining('/api/v1/auth/email/send-code'),
                expect.objectContaining({
                    method: 'POST',
                    body: expect.stringContaining('test@example.com'),
                })
            );
        });
    });
});

describe('UniAuthClient - OAuth Callback', () => {
    let client: UniAuthClient;

    beforeEach(() => {
        // Mock localStorage
        const localStorageMock = {
            getItem: vi.fn(),
            setItem: vi.fn(),
            removeItem: vi.fn(),
            clear: vi.fn(),
        };
        Object.defineProperty(global, 'localStorage', {
            value: localStorageMock,
            writable: true
        });

        client = new UniAuthClient({
            baseUrl: 'https://test.example.com',
            clientId: 'test-client',
        });
    });

    it('should handle OAuth callback with correct URL and parameters', async () => {
        const mockFetch = vi.fn().mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({
                success: true,
                data: {
                    user: { id: '123' },
                    access_token: 'access_token',
                    refresh_token: 'refresh_token',
                },
            }),
        });
        global.fetch = mockFetch;

        const provider = 'google';
        const code = 'auth_code';
        const redirectUri = 'https://app.com/callback';

        await client.handleOAuthCallback(provider, code, redirectUri);

        expect(mockFetch).toHaveBeenCalledWith(
            expect.stringContaining(`/api/v1/auth/oauth/${provider}/callback`),
            expect.objectContaining({
                method: 'POST',
                body: expect.stringContaining('"redirect_uri":"https://app.com/callback"'),
            })
        );

        // Also verify code is present
        expect(mockFetch).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({
                body: expect.stringContaining('"code":"auth_code"'),
            })
        );
    });
});

describe('UniAuthClient - Error Handling', () => {
    let client: UniAuthClient;

    beforeEach(() => {
        client = new UniAuthClient({
            baseUrl: 'https://test.example.com',
            clientId: 'test-client',
        });
    });

    it('should create UniAuthError with correct properties', async () => {
        try {
            await client.sendCode('');
        } catch (error) {
            expect(error).toBeInstanceOf(UniAuthError);
            expect((error as UniAuthError).code).toBe('INVALID_PHONE');
            expect((error as UniAuthError).message).toContain('请输入手机号');
        }
    });

    it('should handle API errors correctly', async () => {
        const mockFetch = vi.fn().mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({
                success: false,
                error: {
                    code: 'DAILY_LIMIT_EXCEEDED',
                    message: '今日发送次数已达上限',
                },
            }),
        });
        global.fetch = mockFetch;

        await expect(client.sendCode('+8613800138000')).rejects.toMatchObject({
            code: 'DAILY_LIMIT_EXCEEDED',
        });
    });
});
