import * as jose from 'jose';
import { env } from '../config/index.js';

interface AppleClientSecretOptions {
    clientId: string;
    teamId: string;
    keyId: string;
    privateKey: string;
    expiresIn?: number; // seconds, max 6 months (15777000s)
}

/**
 * Generate Apple Client Secret (JWT)
 * Apple requires a JWT signed with RS256/ES256 as the client_secret
 * Reference: https://developer.apple.com/documentation/sign_in_with_apple/generate_and_validate_tokens
 */
export async function generateAppleClientSecret(options?: AppleClientSecretOptions): Promise<string | null> {
    const teamId = options?.teamId || env.APPLE_TEAM_ID;
    const keyId = options?.keyId || env.APPLE_KEY_ID;
    const clientId = options?.clientId || env.APPLE_CLIENT_ID;
    const privateKey = options?.privateKey || env.APPLE_PRIVATE_KEY;

    if (!teamId || !keyId || !clientId || !privateKey) {
        console.warn('Apple credentials missing: teamId, keyId, clientId, or privateKey');
        return null;
    }

    try {
        // Format private key properly
        let finalPrivateKey = privateKey;
        if (!privateKey.includes('-----BEGIN PRIVATE KEY-----')) {
            // Assume base64 if not PEM format
            // But jose importPKCS8 usually expects PEM string
            // Let's assume user provides PEM via newline handling in env
            // or we might need to fix formatting
            finalPrivateKey = privateKey.replace(/\\n/g, '\n');
        }

        const pk = await jose.importPKCS8(finalPrivateKey, 'ES256');

        const secret = await new jose.SignJWT({})
            .setProtectedHeader({ alg: 'ES256', kid: keyId })
            .setIssuer(teamId)
            .setIssuedAt()
            .setExpirationTime('1d') // Apple allows up to 6 months
            .setAudience('https://appleid.apple.com')
            .setSubject(clientId)
            .sign(pk);

        return secret;
    } catch (error) {
        console.error('Failed to generate Apple Client Secret:', error);
        return null;
    }
}

/**
 * Verify Apple Identity Token
 * The id_token returned by Apple is a JWT that needs to be verified against Apple's Public Keys (JWKS)
 */
export async function verifyAppleIdToken(idToken: string) {
    // Apple's JWKS URL
    const JWKS_URL = new URL('https://appleid.apple.com/auth/keys');

    try {
        const JWKS = jose.createRemoteJWKSet(JWKS_URL);

        const { payload, protectedHeader } = await jose.jwtVerify(idToken, JWKS, {
            issuer: 'https://appleid.apple.com',
            audience: env.APPLE_CLIENT_ID, // Verify it was issued for our app
        });

        return {
            valid: true,
            payload,
            header: protectedHeader
        };
    } catch (error) {
        console.error('Apple ID Token verification failed:', error);
        return {
            valid: false,
            error
        };
    }
}
