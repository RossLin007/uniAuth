import { UniAuthClient } from '@55387.ai/uniauth-client';
import { API_BASE_URL } from '../config/api';

export const uniauth = new UniAuthClient({
    baseUrl: API_BASE_URL,
    clientId: 'developer_console',
    clientSecret: 'dev_console_secret_123', // In a real SPA we wouldn't use secret like this, usually via proxy or PKCE. 
    // But here we enabled trusted_client for 'spa' type for internal console usage.
});
