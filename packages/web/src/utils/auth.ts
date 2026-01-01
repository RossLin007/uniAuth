import { UniAuthClient } from '@55387.ai/uniauth-client';
import { API_BASE_URL } from '../config/api';

// Create a singleton instance of the UniAuth client
export const authClient = new UniAuthClient({
    baseUrl: API_BASE_URL,
    // Using default storage (localStorage)
    // No specific clientId needed for internal frontend
});

// Configure global auth listener to keep store in sync
// This will be set up in the store or main app
