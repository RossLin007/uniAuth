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

export interface ApiResponse<T> {
    success: boolean;
    data: T;
    message?: string;
}

const API_BASE = '/api/v1/developer';

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
    getWebhookDeliveries: (clientId: string) => fetchWithAuth<Array<{ id: string; status: string; created_at: string }>>(`/apps/${clientId}/webhooks/deliveries`),
};
