/**
 * UniAuth React SDK Tests
 * UniAuth React SDK 测试
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { UniAuthProvider, useUniAuth } from '../UniAuthProvider';
import type { UniAuthProviderConfig } from '../types';

// ─── Mock UniAuthClient ──────────────────────────────────────────────
const mockOnAuthStateChange = vi.fn(() => vi.fn()); // returns unsubscribe fn
const mockGetCurrentUser = vi.fn();
const mockIsSSOCallback = vi.fn(() => false);
const mockHandleSSOCallback = vi.fn();
const mockLoginWithSSO = vi.fn();
const mockLogout = vi.fn();
const mockUpdateProfile = vi.fn();
const mockConfigureSso = vi.fn();
const mockGetAccessTokenSync = vi.fn(() => null);

vi.mock('@55387.ai/uniauth-client', () => ({
    UniAuthClient: vi.fn().mockImplementation(function (this: any) {
        this.isSSOCallback = mockIsSSOCallback;
        this.handleSSOCallback = mockHandleSSOCallback;
        this.getCurrentUser = mockGetCurrentUser;
        this.onAuthStateChange = mockOnAuthStateChange;
        this.loginWithSSO = mockLoginWithSSO;
        this.logout = mockLogout;
        this.updateProfile = mockUpdateProfile;
        this.configureSso = mockConfigureSso;
        this.getAccessTokenSync = mockGetAccessTokenSync;
        this.isAuthenticated = vi.fn(() => false);
    }),
}));

// ─── Helper ──────────────────────────────────────────────────────────
const defaultConfig: UniAuthProviderConfig = {
    baseUrl: 'https://auth.example.com',
    appKey: 'test-key',
};

function TestConsumer() {
    const { user, isAuthenticated, isLoading, error, login, logout, getToken } = useUniAuth();
    return (
        <div>
            <span data-testid="loading">{String(isLoading)}</span>
            <span data-testid="authenticated">{String(isAuthenticated)}</span>
            <span data-testid="user">{user ? user.nickname : 'null'}</span>
            <span data-testid="error">{error ? error.message : 'null'}</span>
            <button data-testid="login-btn" onClick={() => login()}>Login</button>
            <button data-testid="logout-btn" onClick={() => logout()}>Logout</button>
            <span data-testid="token">{getToken() ?? 'null'}</span>
        </div>
    );
}

// ─── Tests ───────────────────────────────────────────────────────────
describe('UniAuth React SDK', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockGetCurrentUser.mockResolvedValue(null);
        mockOnAuthStateChange.mockReturnValue(vi.fn());
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    // ── useUniAuth outside Provider ──────────────────────────────────
    describe('useUniAuth', () => {
        it('should throw when used outside of UniAuthProvider', () => {
            // Suppress console.error for expected error
            const spy = vi.spyOn(console, 'error').mockImplementation(() => { });

            expect(() => {
                render(<TestConsumer />);
            }).toThrow('useUniAuth must be used within a UniAuthProvider');

            spy.mockRestore();
        });
    });

    // ── Provider rendering ──────────────────────────────────────────
    describe('UniAuthProvider', () => {
        it('should render children', async () => {
            render(
                <UniAuthProvider config={defaultConfig}>
                    <div data-testid="child">Hello</div>
                </UniAuthProvider>,
            );

            await waitFor(() => {
                expect(screen.getByTestId('child')).toBeInTheDocument();
                expect(screen.getByTestId('child')).toHaveTextContent('Hello');
            });
        });

        it('should show loadingComponent when loading', () => {
            // Make getCurrentUser never resolve so isLoading stays true
            mockGetCurrentUser.mockReturnValue(new Promise(() => { }));

            render(
                <UniAuthProvider
                    config={defaultConfig}
                    loadingComponent={<div data-testid="loader">Loading...</div>}
                >
                    <div data-testid="content">Content</div>
                </UniAuthProvider>,
            );

            expect(screen.getByTestId('loader')).toBeInTheDocument();
            expect(screen.queryByTestId('content')).not.toBeInTheDocument();
        });

        it('should show children after loading completes with no user', async () => {
            mockGetCurrentUser.mockResolvedValue(null);

            render(
                <UniAuthProvider
                    config={defaultConfig}
                    loadingComponent={<div data-testid="loader">Loading...</div>}
                >
                    <div data-testid="content">Content</div>
                </UniAuthProvider>,
            );

            await waitFor(() => {
                expect(screen.getByTestId('content')).toBeInTheDocument();
            });
        });

        it('should set authenticated = true and user when getCurrentUser returns user', async () => {
            const mockUser = {
                id: 'user-1',
                phone: '+8613800138000',
                email: null,
                nickname: 'Test User',
                avatar_url: null,
            };
            mockGetCurrentUser.mockResolvedValue(mockUser);

            render(
                <UniAuthProvider config={defaultConfig}>
                    <TestConsumer />
                </UniAuthProvider>,
            );

            await waitFor(() => {
                expect(screen.getByTestId('authenticated')).toHaveTextContent('true');
                expect(screen.getByTestId('user')).toHaveTextContent('Test User');
            });
        });

        it('should configure SSO when sso config is provided', async () => {
            const ssoConfig = {
                ssoUrl: 'https://sso.example.com',
                clientId: 'sso-client-id',
                redirectUri: 'https://app.example.com/callback',
            };

            render(
                <UniAuthProvider config={{ ...defaultConfig, sso: ssoConfig }}>
                    <div>Child</div>
                </UniAuthProvider>,
            );

            expect(mockConfigureSso).toHaveBeenCalledWith(ssoConfig);
        });

        it('should handle SSO callback on mount', async () => {
            mockIsSSOCallback.mockReturnValue(true);
            mockHandleSSOCallback.mockResolvedValue(undefined);

            const replaceStateSpy = vi.spyOn(window.history, 'replaceState').mockImplementation(() => { });

            render(
                <UniAuthProvider config={defaultConfig}>
                    <TestConsumer />
                </UniAuthProvider>,
            );

            await waitFor(() => {
                expect(mockHandleSSOCallback).toHaveBeenCalled();
                expect(replaceStateSpy).toHaveBeenCalledWith(
                    {},
                    document.title,
                    window.location.pathname,
                );
            });

            replaceStateSpy.mockRestore();
        });

        it('should set error when SSO callback fails', async () => {
            mockIsSSOCallback.mockReturnValue(true);
            const ssoError = new Error('SSO callback failed');
            mockHandleSSOCallback.mockRejectedValue(ssoError);

            vi.spyOn(console, 'error').mockImplementation(() => { });

            render(
                <UniAuthProvider config={defaultConfig}>
                    <TestConsumer />
                </UniAuthProvider>,
            );

            await waitFor(() => {
                expect(screen.getByTestId('error')).toHaveTextContent('SSO callback failed');
            });
        });

        it('should subscribe to auth state changes', async () => {
            render(
                <UniAuthProvider config={defaultConfig}>
                    <TestConsumer />
                </UniAuthProvider>,
            );

            expect(mockOnAuthStateChange).toHaveBeenCalled();
        });

        it('should unsubscribe on unmount', async () => {
            const unsubscribe = vi.fn();
            mockOnAuthStateChange.mockReturnValue(unsubscribe);

            const { unmount } = render(
                <UniAuthProvider config={defaultConfig}>
                    <div>Child</div>
                </UniAuthProvider>,
            );

            unmount();
            expect(unsubscribe).toHaveBeenCalled();
        });
    });

    // ── User actions ────────────────────────────────────────────────
    describe('User Actions', () => {
        it('should call loginWithSSO when login is invoked', async () => {
            render(
                <UniAuthProvider config={defaultConfig}>
                    <TestConsumer />
                </UniAuthProvider>,
            );

            await waitFor(() => {
                expect(screen.getByTestId('loading')).toHaveTextContent('false');
            });

            act(() => {
                screen.getByTestId('login-btn').click();
            });

            expect(mockLoginWithSSO).toHaveBeenCalled();
        });

        it('should set error when login throws', async () => {
            const loginError = new Error('Login failed');
            mockLoginWithSSO.mockImplementation(() => {
                throw loginError;
            });

            vi.spyOn(console, 'error').mockImplementation(() => { });

            render(
                <UniAuthProvider config={defaultConfig}>
                    <TestConsumer />
                </UniAuthProvider>,
            );

            await waitFor(() => {
                expect(screen.getByTestId('loading')).toHaveTextContent('false');
            });

            act(() => {
                screen.getByTestId('login-btn').click();
            });

            expect(screen.getByTestId('error')).toHaveTextContent('Login failed');
        });

        it('should call client.logout when logout is invoked', async () => {
            mockLogout.mockResolvedValue(undefined);

            render(
                <UniAuthProvider config={defaultConfig}>
                    <TestConsumer />
                </UniAuthProvider>,
            );

            await waitFor(() => {
                expect(screen.getByTestId('loading')).toHaveTextContent('false');
            });

            await act(async () => {
                screen.getByTestId('logout-btn').click();
            });

            expect(mockLogout).toHaveBeenCalled();
        });

        it('should return token from getToken', async () => {
            mockGetAccessTokenSync.mockReturnValue('my-access-token');

            render(
                <UniAuthProvider config={defaultConfig}>
                    <TestConsumer />
                </UniAuthProvider>,
            );

            await waitFor(() => {
                expect(screen.getByTestId('token')).toHaveTextContent('my-access-token');
            });
        });
    });

    // ── Auth state change listener ──────────────────────────────────
    describe('Auth State Change', () => {
        it('should update user and isAuthenticated when auth state changes', async () => {
            let authChangeCallback: ((user: any, isAuth: boolean) => void) | null = null;
            mockOnAuthStateChange.mockImplementation((cb) => {
                authChangeCallback = cb;
                return vi.fn();
            });

            render(
                <UniAuthProvider config={defaultConfig}>
                    <TestConsumer />
                </UniAuthProvider>,
            );

            await waitFor(() => {
                expect(screen.getByTestId('loading')).toHaveTextContent('false');
            });

            expect(screen.getByTestId('authenticated')).toHaveTextContent('false');

            // Simulate auth state change
            act(() => {
                authChangeCallback!({
                    id: 'user-2',
                    phone: '+8613800138000',
                    email: null,
                    nickname: 'New User',
                    avatar_url: null,
                }, true);
            });

            expect(screen.getByTestId('authenticated')).toHaveTextContent('true');
            expect(screen.getByTestId('user')).toHaveTextContent('New User');
        });
    });
});
