import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from root .env
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });
// Override with .env.local if exists
dotenv.config({ path: path.resolve(process.cwd(), '../../.env.local'), override: true });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
    }
});

async function main() {
    console.log('Update developer_console redirect_uris...');

    // Check current state
    const { data: current, error: fetchError } = await supabase
        .from('applications')
        .select('redirect_uris')
        .eq('client_id', 'developer_console')
        .single();

    if (fetchError) {
        console.error('Error fetching application:', fetchError);
        // It might not exist?
    } else {
        console.log('Current redirect_uris:', current.redirect_uris);
    }

    // Update
    const redirectUris = [
        'http://localhost:5173/host/callback',
        'http://localhost:5173/auth/callback',
        'http://localhost:5174/auth/callback',
        'https://console.55387.xyz/auth/callback'
    ];

    const { data, error } = await supabase
        .from('applications')
        .update({ redirect_uris: redirectUris })
        .eq('client_id', 'developer_console')
        .select();

    if (error) {
        console.error('Failed to update:', error);
        process.exit(1);
    }

    console.log('Update successful:', data);
}

main().catch(err => {
    console.error('Unhandled error:', err);
    process.exit(1);
});
