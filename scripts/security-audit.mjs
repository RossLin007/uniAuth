#!/usr/bin/env node

/**
 * Security Audit Script
 * 安全审计脚本
 * 
 * Checks the codebase for common security issues
 * 检查代码库中的常见安全问题
 * 
 * Usage: node scripts/security-audit.js
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

// ANSI colors
const colors = {
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    reset: '\x1b[0m',
};

const log = {
    info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
    success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
    warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
    error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
};

let issueCount = 0;
let warningCount = 0;

console.log(`
╔════════════════════════════════════════════════════════════╗
║                  🔐 Security Audit                         ║
║                  UniAuth Project                           ║
╚════════════════════════════════════════════════════════════╝
`);

// ============================================
// 1. Check npm audit
// ============================================
console.log('\n📦 Checking npm dependencies for vulnerabilities...\n');

try {
    execSync('pnpm audit --audit-level=moderate', {
        cwd: rootDir,
        stdio: 'inherit',
        encoding: 'utf-8'
    });
    log.success('No moderate or higher vulnerabilities found');
} catch (error) {
    log.warning('Some vulnerabilities found - review the output above');
    warningCount++;
}

// ============================================
// 2. Check for hardcoded secrets
// ============================================
console.log('\n🔑 Checking for hardcoded secrets...\n');

const secretPatterns = [
    { pattern: /password\s*[:=]\s*['"][^'"]+['"]/gi, name: 'Hardcoded password' },
    { pattern: /api[_-]?key\s*[:=]\s*['"][^'"]+['"]/gi, name: 'Hardcoded API key' },
    { pattern: /secret\s*[:=]\s*['"][^'"]{10,}['"]/gi, name: 'Hardcoded secret' },
    { pattern: /private[_-]?key\s*[:=]\s*['"][^'"]+['"]/gi, name: 'Hardcoded private key' },
    { pattern: /-----BEGIN (RSA |EC )?PRIVATE KEY-----/g, name: 'Private key in code' },
    { pattern: /Bearer\s+[a-zA-Z0-9_-]{20,}/g, name: 'Hardcoded bearer token' },
];

const filesToCheck = [];
const excludeDirs = ['node_modules', 'dist', '.git', 'coverage', '.pnpm-store'];

function walkDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
            if (!excludeDirs.includes(file)) {
                walkDir(filePath);
            }
        } else if (/\.(ts|js|tsx|jsx|json|md|yml|yaml)$/.test(file)) {
            filesToCheck.push(filePath);
        }
    }
}

walkDir(rootDir);

let secretsFound = 0;
for (const filePath of filesToCheck) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const relativePath = path.relative(rootDir, filePath);

    // Skip test files, example configs, docs, and scripts
    if (relativePath.includes('.test.') ||
        relativePath.includes('.example') ||
        relativePath.includes('README') ||
        relativePath.includes('docs/') ||
        relativePath.includes('scripts/') ||
        relativePath.includes('i18n') ||
        relativePath.includes('CHANGELOG') ||
        relativePath.endsWith('.md')) {
        continue;
    }

    for (const { pattern, name } of secretPatterns) {
        const matches = content.match(pattern);
        if (matches) {
            // Filter out false positives
            const filtered = matches.filter(m => {
                const lower = m.toLowerCase();
                return !lower.includes('process.env') &&
                    !lower.includes('your_') &&
                    !lower.includes('example') &&
                    !lower.includes('test_') &&
                    !lower.includes('placeholder') &&
                    !lower.includes('config.') &&      // Config properties
                    !lower.includes('appsecret') &&    // Interface property names
                    !lower.includes('app-secret') &&   // Header names
                    !lower.includes('clientsecret') && // OAuth properties
                    !lower.includes('client_secret') && // OAuth properties
                    !lower.includes('password:') &&    // TypeScript interface
                    !lower.includes('password?:') &&   // Optional property
                    !lower.includes('x-app-secret');   // Header references
            });

            if (filtered.length > 0) {
                log.error(`${name} found in ${relativePath}`);
                secretsFound++;
            }
        }
    }
}

if (secretsFound === 0) {
    log.success('No hardcoded secrets found');
} else {
    issueCount += secretsFound;
}

// ============================================
// 3. Check .env files not committed
// ============================================
console.log('\n📄 Checking .env files...\n');

const envFiles = ['.env', '.env.local', '.env.production'];
let envIssues = 0;

for (const envFile of envFiles) {
    const envPath = path.join(rootDir, envFile);
    if (fs.existsSync(envPath)) {
        // Check if in .gitignore
        const gitignorePath = path.join(rootDir, '.gitignore');
        if (fs.existsSync(gitignorePath)) {
            const gitignore = fs.readFileSync(gitignorePath, 'utf-8');
            if (!gitignore.includes(envFile) && !gitignore.includes('.env')) {
                log.error(`${envFile} exists but may not be in .gitignore`);
                envIssues++;
            }
        }
    }
}

if (envIssues === 0) {
    log.success('.env files are properly handled');
} else {
    issueCount += envIssues;
}

// ============================================
// 4. Check for dangerous functions
// ============================================
console.log('\n⚠️  Checking for dangerous patterns...\n');

const dangerousPatterns = [
    { pattern: /eval\s*\(/g, name: 'eval()' },
    { pattern: /Function\s*\(/g, name: 'Function constructor' },
    { pattern: /innerHTML\s*=/g, name: 'innerHTML assignment' },
    { pattern: /dangerouslySetInnerHTML/g, name: 'dangerouslySetInnerHTML' },
    { pattern: /document\.write\s*\(/g, name: 'document.write()' },
    { pattern: /exec\s*\(\s*['"]/g, name: 'Shell exec with string' },
];

let dangerousFound = 0;
for (const filePath of filesToCheck) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const relativePath = path.relative(rootDir, filePath);

    for (const { pattern, name } of dangerousPatterns) {
        if (pattern.test(content)) {
            log.warning(`${name} used in ${relativePath}`);
            warningCount++;
            dangerousFound++;
        }
    }
}

if (dangerousFound === 0) {
    log.success('No dangerous patterns found');
}

// ============================================
// 5. Check security headers configuration
// ============================================
console.log('\n🛡️  Checking security headers...\n');

const indexPath = path.join(rootDir, 'packages/server/src/index.ts');
if (fs.existsSync(indexPath)) {
    const indexContent = fs.readFileSync(indexPath, 'utf-8');

    const headers = [
        { name: 'HSTS', pattern: /strictTransportSecurity/i },
        { name: 'X-Content-Type-Options', pattern: /xContentTypeOptions/i },
        { name: 'X-Frame-Options', pattern: /xFrameOptions/i },
        { name: 'CSP', pattern: /contentSecurityPolicy/i },
    ];

    for (const { name, pattern } of headers) {
        if (pattern.test(indexContent)) {
            log.success(`${name} is configured`);
        } else {
            log.warning(`${name} may not be configured`);
            warningCount++;
        }
    }
}

// ============================================
// 6. Check for SQL injection vulnerabilities
// ============================================
console.log('\n💉 Checking for SQL injection risks...\n');

const sqlPatterns = [
    { pattern: /\$\{.*\}.*(?:SELECT|INSERT|UPDATE|DELETE|FROM|WHERE)/gi, name: 'Template literal in SQL' },
    { pattern: /['"].*\+.*['"].*(?:SELECT|INSERT|UPDATE|DELETE)/gi, name: 'String concatenation in SQL' },
];

let sqlIssues = 0;
for (const filePath of filesToCheck) {
    if (!filePath.includes('.sql') && !filePath.includes('migration')) {
        const content = fs.readFileSync(filePath, 'utf-8');
        const relativePath = path.relative(rootDir, filePath);

        for (const { pattern, name } of sqlPatterns) {
            if (pattern.test(content)) {
                log.warning(`${name} in ${relativePath} - verify parameterized queries`);
                warningCount++;
                sqlIssues++;
            }
        }
    }
}

if (sqlIssues === 0) {
    log.success('No obvious SQL injection patterns found');
}

// ============================================
// Summary
// ============================================
console.log(`
╔════════════════════════════════════════════════════════════╗
║                     Audit Summary                          ║
╠════════════════════════════════════════════════════════════╣
║  Issues:   ${String(issueCount).padEnd(47)}║
║  Warnings: ${String(warningCount).padEnd(47)}║
╚════════════════════════════════════════════════════════════╝
`);

if (issueCount > 0) {
    console.log(`${colors.red}❌ Security audit failed with ${issueCount} issue(s)${colors.reset}`);
    process.exit(1);
} else if (warningCount > 0) {
    console.log(`${colors.yellow}⚠️  Security audit passed with ${warningCount} warning(s)${colors.reset}`);
    process.exit(0);
} else {
    console.log(`${colors.green}✅ Security audit passed${colors.reset}`);
    process.exit(0);
}
