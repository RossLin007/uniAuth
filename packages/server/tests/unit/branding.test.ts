import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as brandingService from '../../src/services/branding.service.js';

// Mock Supabase
vi.mock('../../src/lib/supabase.js', () => ({
    getSupabase: vi.fn(() => ({
        from: vi.fn((table: string) => ({
            select: vi.fn().mockReturnThis(),
            insert: vi.fn().mockReturnThis(),
            update: vi.fn().mockReturnThis(),
            delete: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn(),
        })),
    })),
}));

describe('Branding Service', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.resetAllMocks();
    });

    describe('generateCssVariables', () => {
        it('should generate CSS variables from branding config', () => {
            const branding = {
                id: '1',
                application_id: 'app1',
                logo_url: null,
                favicon_url: null,
                background_image_url: null,
                primary_color: '#0ea5e9',
                secondary_color: '#8b5cf6',
                background_color: '#0f172a',
                text_color: '#f8fafc',
                card_color: '#ffffff',
                error_color: '#ef4444',
                font_family: 'Inter, system-ui, sans-serif',
                custom_css: null,
                login_title: null,
                login_subtitle: null,
                footer_text: null,
                show_social_login: true,
                show_powered_by: true,
                default_locale: 'en',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            };

            const css = brandingService.generateCssVariables(branding);

            expect(css).toContain('--color-primary: #0ea5e9;');
            expect(css).toContain('--color-secondary: #8b5cf6;');
            expect(css).toContain('--color-background: #0f172a;');
            expect(css).toContain('--color-text: #f8fafc;');
            expect(css).toContain('--color-card: #ffffff;');
            expect(css).toContain('--color-error: #ef4444;');
            expect(css).toContain('--font-family: Inter, system-ui, sans-serif;');
        });

        it('should handle partial branding config', () => {
            const branding = {
                primary_color: '#ff0000',
            };

            const css = brandingService.generateCssVariables(branding);

            expect(css).toContain('--color-primary: #ff0000;');
        });

        it('should return valid CSS variable format', () => {
            const branding = {
                primary_color: '#123456',
                secondary_color: '#abcdef',
            };

            const css = brandingService.generateCssVariables(branding);

            // Should contain CSS variable declarations
            expect(css).toContain('--color-primary: #123456;');
            expect(css).toContain('--color-secondary: #abcdef;');
        });
    });

    describe('Service exports', () => {
        it('should export required functions', () => {
            expect(typeof brandingService.generateCssVariables).toBe('function');
            expect(typeof brandingService.getBranding).toBe('function');
            expect(typeof brandingService.getBrandingByClientId).toBe('function');
            expect(typeof brandingService.getBrandingWithDefaults).toBe('function');
            expect(typeof brandingService.upsertBranding).toBe('function');
            expect(typeof brandingService.deleteBranding).toBe('function');
        });
    });
});
