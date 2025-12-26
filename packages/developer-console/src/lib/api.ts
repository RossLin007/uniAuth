// API Types
export interface App {
    id: string;
    name: string;
    client_id: string;
    client_secret: string;
    app_type: 'web' | 'spa' | 'native' | 'm2m';
    owner_id: string;
    redirect_uris?: string[];
    description?: string;
    homepage_url?: string;
    logo_url?: string;
}

export interface CreateAppRequest {
    name: string;
    description?: string;
    app_type: 'web' | 'spa' | 'native' | 'm2m';
}

export interface UpdateAppRequest {
    name?: string;
    description?: string;
    redirect_uris?: string[];
    homepage_url?: string;
    logo_url?: string;
}

export interface Webhook {
    id: string;
    url: string;
    events: string[];
    is_active: boolean;
    secret?: string;
    created_at: string;
}

export interface CreateWebhookRequest {
    url: string;
    events: string[];
}

export interface UpdateWebhookRequest {
    url?: string;
    events?: string[];
    is_active?: boolean;
}

export interface WebhookDelivery {
    id: string;
    webhook_id: string;
    event: string;
    status: 'pending' | 'success' | 'failed';
    response_status?: number;
    created_at: string;
}

export interface ApiResponse<T> {
    success: boolean;
    data: T;
    message?: string;
}

export interface CustomClaim {
    id: string;
    application_id: string;
    claim_name: string;
    claim_source: 'user_attribute' | 'static' | 'computed';
    source_field?: string;
    static_value?: string;
    computed_expression?: string;
    transform_function?: 'none' | 'uppercase' | 'lowercase' | 'hash_sha256' | 'base64_encode' | 'json_stringify';
    required_scope?: string;
    enabled: boolean;
    description?: string;
}

import { API_BASE_URL } from '../config/api';

export type CreateClaimRequest = Omit<CustomClaim, 'id' | 'application_id'>;
export type UpdateClaimRequest = Partial<CreateClaimRequest>;

const API_BASE = `${API_BASE_URL}/api/v1/developer`;

async function fetchWithAuth<T>(url: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    const token = localStorage.getItem('access_token');
    const headers = {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...options.headers,
    };

    const response = await fetch(`${API_BASE}${url}`, {
        ...options,
        headers,
    });

    // Handle 401 Unauthorized by clearing token (simple logout)
    if (response.status === 401) {
        localStorage.removeItem('access_token');
        window.location.href = '/login';
        throw new Error('Unauthorized');
    }

    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.error || 'API Request Failed');
    }
    return data;
}

export const api = {
    // Apps
    getApps: () => fetchWithAuth<App[]>('/apps'),
    createApp: (data: CreateAppRequest) => fetchWithAuth<App>('/apps', {
        method: 'POST',
        body: JSON.stringify(data),
    }),
    getApp: (clientId: string) => fetchWithAuth<App>(`/apps/${clientId}`),
    updateApp: (clientId: string, data: UpdateAppRequest) => fetchWithAuth<App>(`/apps/${clientId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
    }),
    rotateSecret: (clientId: string) => fetchWithAuth<App>(`/apps/${clientId}/secret`, {
        method: 'POST',
    }),
    deleteApp: (clientId: string) => fetchWithAuth<void>(`/apps/${clientId}`, {
        method: 'DELETE',
    }),

    // Webhooks
    getWebhooks: (clientId: string) => fetchWithAuth<Webhook[]>(`/apps/${clientId}/webhooks`),
    createWebhook: (clientId: string, data: CreateWebhookRequest) => fetchWithAuth<Webhook>(`/apps/${clientId}/webhooks`, {
        method: 'POST',
        body: JSON.stringify(data),
    }),
    updateWebhook: (clientId: string, webhookId: string, data: UpdateWebhookRequest) => fetchWithAuth<Webhook>(`/apps/${clientId}/webhooks/${webhookId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
    }),
    deleteWebhook: (clientId: string, webhookId: string) => fetchWithAuth<void>(`/apps/${clientId}/webhooks/${webhookId}`, {
        method: 'DELETE',
    }),
    testWebhook: (clientId: string, data: { event: string; payload?: Record<string, unknown> }) => fetchWithAuth<{ delivered: boolean }>(`/apps/${clientId}/webhooks/test`, {
        method: 'POST',
        body: JSON.stringify(data),
    }),
    getWebhookDeliveries: (clientId: string) => fetchWithAuth<WebhookDelivery[]>(`/apps/${clientId}/webhooks/deliveries`),

    // Custom Claims
    getClaims: (clientId: string) => fetchWithAuth<CustomClaim[]>(`/apps/${clientId}/claims`),
    createClaim: (clientId: string, data: CreateClaimRequest) => fetchWithAuth<CustomClaim>(`/apps/${clientId}/claims`, {
        method: 'POST',
        body: JSON.stringify(data),
    }),
    updateClaim: (clientId: string, claimId: string, data: UpdateClaimRequest) => fetchWithAuth<CustomClaim>(`/apps/${clientId}/claims/${claimId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
    }),
    deleteClaim: (clientId: string, claimId: string) => fetchWithAuth<void>(`/apps/${clientId}/claims/${claimId}`, {
        method: 'DELETE',
    }),

    // Branding
    getBranding: (clientId: string) => fetchWithAuth<BrandingConfig>(`/apps/${clientId}/branding`),
    updateBranding: (clientId: string, data: UpdateBrandingRequest) => fetchWithAuth<BrandingConfig>(`/apps/${clientId}/branding`, {
        method: 'PUT',
        body: JSON.stringify(data),
    }),
    deleteBranding: (clientId: string) => fetchWithAuth<void>(`/apps/${clientId}/branding`, {
        method: 'DELETE',
    }),
};

// Branding types
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
