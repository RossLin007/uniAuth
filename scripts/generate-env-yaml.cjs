// scripts/generate-env-yaml.js
// Generate env.yaml from .env for Cloud Run deployment

const fs = require('fs');
const path = require('path');

try {
    const envPath = path.resolve('.env');
    if (!fs.existsSync(envPath)) {
        console.log('No .env file found, skipping.');
        process.exit(0);
    }

    const envContent = fs.readFileSync(envPath, 'utf8');
    const lines = envContent.split('\n');
    const envVars = {};

    lines.forEach(line => {
        line = line.trim();
        if (!line || line.startsWith('#')) return;

        const idx = line.indexOf('=');
        if (idx === -1) return;

        const key = line.substring(0, idx).trim();
        let value = line.substring(idx + 1).trim();

        // Remove surrounding quotes if present
        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
        }

        // Filter out local-only vars and Cloud Run reserved vars
        if (key === 'REDIS_URL' || key.startsWith('UPSTASH_') || key === 'PORT') return;

        envVars[key] = value;
    });

    // Add Upstash vars explicitly (extracting from file again to handle commented ones)
    const rawContent = fs.readFileSync(envPath, 'utf8');
    const upstashUrlMatch = rawContent.match(/UPSTASH_REDIS_URL=["']?([^"'\n]+)["']?/);
    const upstashTokenMatch = rawContent.match(/UPSTASH_REDIS_TOKEN=["']?([^"'\n]+)["']?/);

    if (upstashUrlMatch) envVars['UPSTASH_REDIS_URL'] = upstashUrlMatch[1].trim();
    if (upstashTokenMatch) envVars['UPSTASH_REDIS_TOKEN'] = upstashTokenMatch[1].trim();

    // Ensure NODE_ENV is production
    envVars['NODE_ENV'] = 'production';

    // Write to env.yaml
    let yamlContent = '';
    for (const [k, v] of Object.entries(envVars)) {
        // Simple YAML escaping: explicit string structure
        yamlContent += `${k}: "${v.replace(/"/g, '\\"')}"\n`;
    }

    fs.writeFileSync('env.yaml', yamlContent);
    console.log('env.yaml generated successfully.');

} catch (e) {
    console.error('Error generating env.yaml:', e);
    process.exit(1);
}
