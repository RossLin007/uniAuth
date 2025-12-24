import { UniAuthClient } from '@uniauth/sdk';

export const uniauth = new UniAuthClient({
    baseUrl: import.meta.env.VITE_API_URL || 'http://localhost:3000',
    clientId: 'developer_console',
    clientSecret: 'dev_console_secret_123', // In a real SPA we wouldn't use secret like this, usually via proxy or PKCE. 
    // But here we enabled trusted_client for 'spa' type for internal console usage.
});
