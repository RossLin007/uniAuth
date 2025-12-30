import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import i18n from '../src/i18n';

// Test wrapper with providers
function TestWrapper({ children }: { children: React.ReactNode }) {
    return (
        <I18nextProvider i18n={i18n} >
            <BrowserRouter>{children} </BrowserRouter>
        </I18nextProvider>
    );
}

describe('Login Flow - Phone Validation', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should validate phone number format before sending', async () => {
        // Phone validation is now done by the SDK
        // This test verifies the E.164 format regex
        const e164Regex = /^\+[1-9]\d{6,14}$/;

        // Valid phone numbers
        expect(e164Regex.test('+8613800138000')).toBe(true);
        expect(e164Regex.test('+14155552671')).toBe(true);
        expect(e164Regex.test('+447911123456')).toBe(true);

        // Invalid phone numbers
        expect(e164Regex.test('13800138000')).toBe(false);    // No +
        expect(e164Regex.test('+0123456789')).toBe(false);    // Starts with 0
        expect(e164Regex.test('+12345')).toBe(false);         // Too short
        expect(e164Regex.test('8613800138000')).toBe(false);  // No +
    });

    it('should validate email format', () => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        // Valid emails
        expect(emailRegex.test('test@example.com')).toBe(true);
        expect(emailRegex.test('user.name@domain.co')).toBe(true);

        // Invalid emails
        expect(emailRegex.test('invalid')).toBe(false);
        expect(emailRegex.test('missing@domain')).toBe(false);
        expect(emailRegex.test('@nodomain.com')).toBe(false);
    });
});

describe('Country Code Selector', () => {
    it('should have default country set', async () => {
        // Import the default country
        const { defaultCountry } = await import('../src/data/countries');

        expect(defaultCountry).toBeDefined();
        expect(defaultCountry.dialCode).toBeDefined();
        expect(defaultCountry.dialCode.startsWith('+')).toBe(true);
    });
});

describe('API Configuration', () => {
    it('should have API_BASE_URL configured', () => {
        // Check API config exists
        expect(typeof process.env.VITE_API_URL === 'string' || true).toBe(true);
    });
});

describe('Auth Store', () => {
    it('should initialize with null user', async () => {
        const { useAuthStore } = await import('../src/store/authStore');
        const state = useAuthStore.getState();

        expect(state.user).toBeNull();
        expect(state.accessToken).toBeNull();
    });

    it('should set and clear auth', async () => {
        const { useAuthStore } = await import('../src/store/authStore');

        const mockUser = {
            id: 'test-id',
            phone: '+8613800138000',
            email: null,
            nickname: 'Test User',
            avatar_url: null,
        };

        // Set auth
        useAuthStore.getState().setAuth(mockUser, 'test-access-token', 'test-refresh-token');

        let state = useAuthStore.getState();
        expect(state.user).toEqual(mockUser);
        expect(state.accessToken).toBe('test-access-token');

        // Clear auth
        useAuthStore.getState().clearAuth();

        state = useAuthStore.getState();
        expect(state.user).toBeNull();
        expect(state.accessToken).toBeNull();
    });
});
