/**
 * JWKS (JSON Web Key Set) Management
 * Handles RSA key pair generation and JWK export for OIDC
 */

import * as jose from 'jose';
import { logger } from './logger.js';

interface KeyPair {
    publicKey: jose.KeyLike;
    privateKey: jose.KeyLike;
    kid: string; // Key ID
}

let cachedKeyPair: KeyPair | null = null;

/**
 * Get or generate RSA key pair
 * Keys are generated once and cached in memory
 * 
 * In production, keys should be:
 * - Persisted to secure storage (e.g., AWS KMS, HashiCorp Vault)
 * - Rotated periodically
 * - Loaded from environment on startup
 */
export async function getKeyPair(): Promise<KeyPair> {
    if (cachedKeyPair) {
        return cachedKeyPair;
    }

    logger.info('Generating new RSA key pair for JWKS');

    try {
        // Generate 2048-bit RSA key pair
        const { publicKey, privateKey } = await jose.generateKeyPair('RS256', {
            modulusLength: 2048,
        });

        // Generate a unique key ID
        const kid = `uniauth-rsa-${Date.now()}`;

        cachedKeyPair = {
            publicKey,
            privateKey,
            kid,
        };

        logger.info('RSA key pair generated successfully', { kid });
        return cachedKeyPair;
    } catch (error) {
        logger.error('Failed to generate RSA key pair', { error });
        throw new Error('Key pair generation failed');
    }
}

/**
 * Export public key as JWK (JSON Web Key)
 * Used by the JWKS endpoint
 */
export async function exportPublicJWK(): Promise<jose.JWK> {
    const { publicKey, kid } = await getKeyPair();

    const jwk = await jose.exportJWK(publicKey);

    return {
        ...jwk,
        kid,
        use: 'sig', // Key usage: signature
        alg: 'RS256', // Algorithm
    };
}

/**
 * Get JWKS (JSON Web Key Set) response
 * Standard format for /.well-known/jwks.json
 */
export async function getJWKS(): Promise<{ keys: jose.JWK[] }> {
    const jwk = await exportPublicJWK();

    return {
        keys: [jwk],
    };
}

/**
 * Sign a JWT using the private key
 * @param payload - JWT payload
 * @param options - Signing options (issuer, audience, etc.)
 */
export async function signJWT(
    payload: Record<string, unknown>,
    options: {
        issuer: string;
        audience: string;
        subject: string;
        expiresIn: string;
    }
): Promise<string> {
    const { privateKey, kid } = await getKeyPair();

    const jwt = await new jose.SignJWT(payload)
        .setProtectedHeader({ alg: 'RS256', kid })
        .setIssuer(options.issuer)
        .setAudience(options.audience)
        .setSubject(options.subject)
        .setIssuedAt()
        .setExpirationTime(options.expiresIn)
        .sign(privateKey);

    return jwt;
}

/**
 * Verify a JWT using the public key
 * 使用公钥验证 JWT
 * 
 * @param token - JWT token to verify
 * @param options - Verification options (audience, etc.)
 */
export async function verifyJWT(
    token: string,
    options?: jose.JWTVerifyOptions
): Promise<jose.JWTVerifyResult> {
    const { publicKey } = await getKeyPair();
    return jose.jwtVerify(token, publicKey, options);
}

/**
 * Clear cached key pair (for key rotation)
 * In production, implement proper key rotation with overlap period
 */
export function clearKeyCache(): void {
    logger.info('Clearing JWKS key cache');
    cachedKeyPair = null;
}
