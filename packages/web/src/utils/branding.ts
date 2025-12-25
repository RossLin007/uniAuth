import { useState, useEffect } from 'react';

export interface BrandingConfig {
    logo_url: string | null;
    favicon_url: string | null;
    background_image_url: string | null;
    primary_color: string;
    secondary_color: string;
    background_color: string;
    text_color: string;
    card_color: string;
    error_color: string;
    font_family: string;
    custom_css: string | null;
    login_title: string | null;
    login_subtitle: string | null;
    footer_text: string | null;
    show_social_login: boolean;
    show_powered_by: boolean;
    default_locale: string;
}

const DEFAULT_BRANDING: BrandingConfig = {
    logo_url: null,
    favicon_url: null,
    background_image_url: null,
    primary_color: '#0ea5e9', // sky-500
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
};

/**
 * Hook to fetch and apply branding for a specific application
 * @param clientId The OAuth client_id from URL query params
 */
export function useBranding(clientId: string | null) {
    const [branding, setBranding] = useState<BrandingConfig>(DEFAULT_BRANDING);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!clientId) {
            setBranding(DEFAULT_BRANDING);
            return;
        }

        const fetchBranding = async () => {
            setLoading(true);
            try {
                const response = await fetch(`/api/v1/branding/${clientId}`);
                if (response.ok) {
                    const data = await response.json();
                    if (data.success && data.data) {
                        setBranding({ ...DEFAULT_BRANDING, ...data.data });
                    }
                }
            } catch (error) {
                console.error('Failed to fetch branding:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchBranding();
    }, [clientId]);

    // Apply CSS variables and favicon
    useEffect(() => {
        const root = document.documentElement;

        root.style.setProperty('--color-primary', branding.primary_color);
        root.style.setProperty('--color-secondary', branding.secondary_color);
        root.style.setProperty('--color-background', branding.background_color);
        root.style.setProperty('--color-text', branding.text_color);
        root.style.setProperty('--color-card', branding.card_color);
        root.style.setProperty('--color-error', branding.error_color);
        root.style.setProperty('--font-family', branding.font_family);

        // Update favicon
        if (branding.favicon_url) {
            const favicon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
            if (favicon) {
                favicon.href = branding.favicon_url;
            }
        }

        // Inject custom CSS
        let styleEl = document.getElementById('branding-custom-css');
        if (branding.custom_css) {
            if (!styleEl) {
                styleEl = document.createElement('style');
                styleEl.id = 'branding-custom-css';
                document.head.appendChild(styleEl);
            }
            styleEl.textContent = branding.custom_css;
        } else if (styleEl) {
            styleEl.remove();
        }

        // Cleanup on unmount
        return () => {
            if (styleEl) {
                styleEl.remove();
            }
        };
    }, [branding]);

    return { branding, loading };
}

/**
 * Get client_id from URL search params
 */
export function getClientIdFromUrl(): string | null {
    const params = new URLSearchParams(window.location.search);
    return params.get('client_id');
}
