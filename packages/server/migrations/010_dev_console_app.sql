-- Insert the Developer Console application if it doesn't exist
INSERT INTO applications (
    name, 
    description, 
    client_id, 
    client_secret, 
    app_type, 
    allowed_grants, 
    is_trusted, 
    redirect_uris
)
VALUES (
    'Developer Console',
    'Official UniAuth Developer Console',
    'developer_console',
    'dev_console_secret_123',
    'spa',
    ARRAY['authorization_code', 'trusted_client'],
    true,
    ARRAY['http://localhost:5173']
)
ON CONFLICT (client_id) DO NOTHING;
