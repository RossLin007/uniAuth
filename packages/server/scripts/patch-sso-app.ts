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
    console.log('Ensuring SSO Portal application exists...');

    // 1. Check if we have standard columns (post-migration 004) or legacy
    const { data: test, error: testError } = await supabase
        .from('applications')
        .select('*')
        .limit(1);

    if (testError) {
        console.error('Failed to inspect table:', testError);
        return;
    }

    const columns = test && test.length > 0 ? Object.keys(test[0]) : [];
    console.log('Detected columns:', columns);

    const hasClientId = columns.includes('client_id');
    const hasAppKey = columns.includes('app_key');

    const appData: any = {
        name: 'SSO Portal',
        // app_secret renamed to client_secret in 004
        client_secret: 'sso-portal-secret', // Should be hashed in prod
        redirect_uris: ['http://localhost:5173', 'https://sso.55387.xyz'],
        status: 'active',
        // Optional fields if they exist
        ...(columns.includes('app_type') ? { app_type: 'spa' } : {}),
        ...(columns.includes('is_trusted') ? { is_trusted: true } : {}),
        ...(columns.includes('is_public') ? { is_public: true } : {}),
        ...(columns.includes('description') ? { description: 'UniAuth SSO Portal' } : {}),
    };

    if (hasClientId) {
        appData.client_id = 'sso-portal';
        // If app_key is NOT present, we rely on client_id as unique key (or id)
        // But we need to know what to upsert on. 
        // 004 renamed app_key to client_id. So client_id is the unique key.

        console.log('Upserting with client_id=sso-portal...');
        const { error } = await supabase
            .from('applications')
            .upsert(appData, { onConflict: 'client_id' });

        if (error) console.error('Upsert failed:', error);
        else console.log('SSO Portal app upserted successfully');

    } else if (hasAppKey) {
        appData.app_key = 'sso-portal';
        console.log('Legacy schema detected. Upserting with app_key=sso-portal...');
        const { error } = await supabase
            .from('applications')
            .upsert(appData, { onConflict: 'app_key' });

        if (error) console.error('Upsert failed:', error);
        else console.log('SSO Portal app upserted successfully');
    } else {
        console.error('Unknown schema: neither client_id nor app_key found.');
    }
}

main().catch(err => {
    console.error('Unhandled error:', err);
    process.exit(1);
});
