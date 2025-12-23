import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import { nanoid } from 'nanoid';

// Load env
config({ path: resolve(process.cwd(), '.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function createInternalApp() {
    console.log('🚀 Creating internal test application...');

    const clientId = `app_${nanoid(16)}`;
    const clientSecret = `sk_${nanoid(32)}`;

    // Example for a localhost app (e.g. Soul OS dev environment)
    const appName = 'Soul OS (Dev)';
    const redirectUris = [
        'http://localhost:3001/api/auth/callback/uniauth', // NextAuth / Auth.js default
        'http://localhost:8080/auth/callback'
    ];

    const { data, error } = await supabase
        .from('applications')
        .insert({
            name: appName,
            description: 'Internal development application',
            client_id: clientId,
            client_secret: clientSecret,
            redirect_uris: redirectUris,
            is_trusted: true // Trusted apps might skip the "Authorize?" consent screen
        })
        .select()
        .single();

    if (error) {
        console.error('❌ Failed to create app:', error.message);
        return;
    }

    console.log('\n✅ Application created successfully!');
    console.log('------------------------------------------------');
    console.log('Name:         ', data.name);
    console.log('Client ID:    ', data.client_id);
    console.log('Client Secret:', data.client_secret);
    console.log('Redirect URIs:', data.redirect_uris);
    console.log('------------------------------------------------');
    console.log('\n💾 Please save these credentials for your third-party app.');
}

createInternalApp();
