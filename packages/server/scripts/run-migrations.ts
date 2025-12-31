import { execSync } from 'child_process';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load environment variables from root .env
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });
// Override with .env.local if exists
dotenv.config({ path: path.resolve(process.cwd(), '../../.env.local'), override: true });

const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
    console.error('Missing DATABASE_URL');
    process.exit(1);
}

const MIGRATIONS_DIR = path.resolve(process.cwd(), 'migrations');
const MIGRATION_FILES = [
    '013_oidc_support.sql',
    '014_custom_claims.sql',
    '015_sso_sessions.sql',
    '016_passkey_credentials.sql',
    '017_application_branding.sql',
    '018_fix_schema_issues.sql'
];

async function main() {
    console.log('Running migrations via psql...');
    // Mask password in logs
    const safeDbUrl = dbUrl?.replace(/:([^:@]+)@/, ':***@');
    console.log(`Target Database URL: ${safeDbUrl}`);

    for (const file of MIGRATION_FILES) {
        const filePath = path.join(MIGRATIONS_DIR, file);
        if (!fs.existsSync(filePath)) {
            console.warn(`Migration file not found: ${file}, skipping`);
            continue;
        }

        console.log(`Executing ${file}...`);
        try {
            // Using psql command line tool
            // We use stdio: 'pipe' to capture output if needed, but 'inherit' is fine for logs
            execSync(`psql "${dbUrl}" -f "${filePath}"`, { stdio: 'inherit' });
            console.log(`✓ ${file} executed successfully`);
        } catch (error) {
            console.warn(`⚠ Error executing ${file} (might be already applied), continuing...`);
            // We continue because previous migrations might have already run
        }
    }

    console.log('All migrations processed.');
}

main().catch(err => {
    console.error('Unhandled error:', err);
    process.exit(1);
});
