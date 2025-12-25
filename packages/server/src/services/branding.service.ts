/**
 * Branding Service for White-Label Customization
 * 
 * Manages application-specific branding configuration
 */

import { getSupabase } from '../lib/supabase.js';

// Branding configuration interface
export interface BrandingConfig {
    id: string;
    application_id: string;
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
    created_at: string;
    updated_at: string;
}

// Update request interface
export interface UpdateBrandingRequest {
    logo_url?: string | null;
    favicon_url?: string | null;
    background_image_url?: string | null;
    primary_color?: string;
    secondary_color?: string;
    background_color?: string;
    text_color?: string;
    card_color?: string;
    error_color?: string;
    font_family?: string;
    custom_css?: string | null;
    login_title?: string | null;
    login_subtitle?: string | null;
    footer_text?: string | null;
    show_social_login?: boolean;
    show_powered_by?: boolean;
    default_locale?: string;
}

// Default branding values
const DEFAULT_BRANDING: Omit<BrandingConfig, 'id' | 'application_id' | 'created_at' | 'updated_at'> = {
    logo_url: null,
    favicon_url: null,
    background_image_url: null,
    primary_color: '#3b82f6',
    secondary_color: '#8b5cf6',
    background_color: '#0f172a',
    text_color: '#f8fafc',
    card_color: '#1e293b',
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
 * Get branding configuration for an application
 */
export async function getBranding(applicationId: string): Promise<BrandingConfig | null> {
    const supabase = getSupabase();

    const { data, error } = await supabase
        .from('application_branding')
        .select('*')
        .eq('application_id', applicationId)
        .single();

    if (error || !data) {
        return null;
    }

    return data as BrandingConfig;
}

/**
 * Get branding configuration by client_id (for login page rendering)
 */
export async function getBrandingByClientId(clientId: string): Promise<BrandingConfig | null> {
    const supabase = getSupabase();

    // First get application ID
    const { data: app, error: appError } = await supabase
        .from('applications')
        .select('id')
        .eq('client_id', clientId)
        .single();

    if (appError || !app) {
        return null;
    }

    return getBranding(app.id);
}

/**
 * Get branding with defaults filled in
 */
export async function getBrandingWithDefaults(applicationId: string): Promise<Omit<BrandingConfig, 'id' | 'application_id' | 'created_at' | 'updated_at'>> {
    const branding = await getBranding(applicationId);

    if (!branding) {
        return { ...DEFAULT_BRANDING };
    }

    // Merge with defaults for any null values
    return {
        logo_url: branding.logo_url,
        favicon_url: branding.favicon_url,
        background_image_url: branding.background_image_url,
        primary_color: branding.primary_color || DEFAULT_BRANDING.primary_color,
        secondary_color: branding.secondary_color || DEFAULT_BRANDING.secondary_color,
        background_color: branding.background_color || DEFAULT_BRANDING.background_color,
        text_color: branding.text_color || DEFAULT_BRANDING.text_color,
        card_color: branding.card_color || DEFAULT_BRANDING.card_color,
        error_color: branding.error_color || DEFAULT_BRANDING.error_color,
        font_family: branding.font_family || DEFAULT_BRANDING.font_family,
        custom_css: branding.custom_css,
        login_title: branding.login_title,
        login_subtitle: branding.login_subtitle,
        footer_text: branding.footer_text,
        show_social_login: branding.show_social_login ?? DEFAULT_BRANDING.show_social_login,
        show_powered_by: branding.show_powered_by ?? DEFAULT_BRANDING.show_powered_by,
        default_locale: branding.default_locale || DEFAULT_BRANDING.default_locale,
    };
}

/**
 * Create or update branding configuration
 */
export async function upsertBranding(
    applicationId: string,
    updates: UpdateBrandingRequest
): Promise<{ success: boolean; data?: BrandingConfig; error?: string }> {
    const supabase = getSupabase();

    // Validate hex colors
    const colorFields = ['primary_color', 'secondary_color', 'background_color', 'text_color', 'card_color', 'error_color'] as const;
    for (const field of colorFields) {
        const value = updates[field];
        if (value && !/^#[0-9A-Fa-f]{6}$/.test(value)) {
            return { success: false, error: `Invalid color format for ${field}. Use hex format (e.g., #3b82f6)` };
        }
    }

    // Check if branding already exists
    const existing = await getBranding(applicationId);

    if (existing) {
        // Update
        const { data, error } = await supabase
            .from('application_branding')
            .update(updates)
            .eq('application_id', applicationId)
            .select()
            .single();

        if (error) {
            return { success: false, error: error.message };
        }

        return { success: true, data: data as BrandingConfig };
    } else {
        // Insert
        const { data, error } = await supabase
            .from('application_branding')
            .insert({
                application_id: applicationId,
                ...updates,
            })
            .select()
            .single();

        if (error) {
            return { success: false, error: error.message };
        }

        return { success: true, data: data as BrandingConfig };
    }
}

/**
 * Delete branding configuration (revert to defaults)
 */
export async function deleteBranding(applicationId: string): Promise<{ success: boolean; error?: string }> {
    const supabase = getSupabase();

    const { error } = await supabase
        .from('application_branding')
        .delete()
        .eq('application_id', applicationId);

    if (error) {
        return { success: false, error: error.message };
    }

    return { success: true };
}

/**
 * Generate CSS variables from branding config
 */
export function generateCssVariables(branding: Partial<BrandingConfig>): string {
    const vars: Record<string, string> = {};

    if (branding.primary_color) vars['--color-primary'] = branding.primary_color;
    if (branding.secondary_color) vars['--color-secondary'] = branding.secondary_color;
    if (branding.background_color) vars['--color-background'] = branding.background_color;
    if (branding.text_color) vars['--color-text'] = branding.text_color;
    if (branding.card_color) vars['--color-card'] = branding.card_color;
    if (branding.error_color) vars['--color-error'] = branding.error_color;
    if (branding.font_family) vars['--font-family'] = branding.font_family;

    return Object.entries(vars)
        .map(([key, value]) => `${key}: ${value};`)
        .join('\n');
}
