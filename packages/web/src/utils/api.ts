import { useAuthStore } from '../store/authStore';
import { API_BASE_URL } from '../config/api';

export const api = {
    async fetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
        const { accessToken } = useAuthStore.getState();

        const headers = {
            'Content-Type': 'application/json',
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
            ...options.headers,
        };

        const response = await fetch(`${API_BASE_URL}/api/v1${endpoint}`, {
            ...options,
            headers,
        });

        const data = await response.json();

        if (!response.ok) {
            // Handle 401 - Unauthorized (token expired or invalid)
            if (response.status === 401) {
                const { clearAuth } = useAuthStore.getState();
                clearAuth();
                // Redirect to login page
                window.location.href = '/login';
                throw new Error('Session expired, please login again / 会话已过期，请重新登录');
            }
            throw new Error(data.error?.message || 'Request failed');
        }

        return data.data as T;
    },

    get<T>(endpoint: string) {
        return this.fetch<T>(endpoint, { method: 'GET' });
    },

    post<T>(endpoint: string, body: unknown) {
        return this.fetch<T>(endpoint, {
            method: 'POST',
            body: JSON.stringify(body),
        });
    },

    patch<T>(endpoint: string, body: unknown) {
        return this.fetch<T>(endpoint, {
            method: 'PATCH',
            body: JSON.stringify(body),
        });
    },

    delete<T>(endpoint: string, body?: unknown) {
        return this.fetch<T>(endpoint, {
            method: 'DELETE',
            ...(body ? { body: JSON.stringify(body) } : {}),
        });
    },
};
