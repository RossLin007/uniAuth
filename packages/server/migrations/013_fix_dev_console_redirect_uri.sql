-- Force update Developer Console redirect_uris to ensure localhost:5174 is included
UPDATE applications
SET redirect_uris = ARRAY[
    'http://localhost:5173/host/callback',
    'http://localhost:5173/auth/callback',
    'http://localhost:5174/auth/callback',
    'https://console.55387.xyz/auth/callback'
]
WHERE client_id = 'developer_console';
