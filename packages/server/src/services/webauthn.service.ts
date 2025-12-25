/**
 * WebAuthn Service for Passkey Authentication
 * 
 * Handles Passkey registration and authentication using @simplewebauthn/server
 */

import {
    generateRegistrationOptions,
    verifyRegistrationResponse,
    generateAuthenticationOptions,
    verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import type {
    AuthenticatorTransportFuture,
    PublicKeyCredentialCreationOptionsJSON,
    PublicKeyCredentialRequestOptionsJSON,
    RegistrationResponseJSON,
    AuthenticationResponseJSON,
} from '@simplewebauthn/server';
import { getSupabase } from '../lib/supabase.js';
import { env } from '../config/env.js';

// RP (Relying Party) configuration
const rpName = 'UniAuth';
const rpID = env.RP_ID || 'localhost';
const origin = env.RP_ORIGIN || `http://${rpID}:5173`;

// Types for database
interface PasskeyCredential {
    id: string;
    user_id: string;
    credential_id: string;
    public_key: string;
    counter: number;
    device_type: string;
    device_name: string | null;
    transports: string[] | null;
    aaguid: string | null;
    created_at: string;
    last_used_at: string | null;
}

// Challenge storage (in-memory for now, should use Redis in production)
const challengeStore = new Map<string, { challenge: string; expires: number }>();

function storeChallenge(userId: string, challenge: string) {
    challengeStore.set(userId, {
        challenge,
        expires: Date.now() + 5 * 60 * 1000, // 5 minutes
    });
}

function getChallenge(userId: string): string | null {
    const stored = challengeStore.get(userId);
    if (!stored || stored.expires < Date.now()) {
        challengeStore.delete(userId);
        return null;
    }
    return stored.challenge;
}

function clearChallenge(userId: string) {
    challengeStore.delete(userId);
}

/**
 * Generate registration options for a new Passkey
 */
export async function generatePasskeyRegistrationOptions(
    userId: string,
    userName: string,
    userDisplayName?: string
): Promise<PublicKeyCredentialCreationOptionsJSON> {
    const supabase = getSupabase();

    // Get existing credentials to exclude
    const { data: existingCredentials } = await supabase
        .from('passkey_credentials')
        .select('credential_id')
        .eq('user_id', userId);

    const excludeCredentials = (existingCredentials || []).map((cred: { credential_id: string }) => ({
        id: cred.credential_id,
        type: 'public-key' as const,
    }));

    const options = await generateRegistrationOptions({
        rpName,
        rpID,
        userID: new TextEncoder().encode(userId),
        userName,
        userDisplayName: userDisplayName || userName,
        attestationType: 'none', // Don't require attestation for simplicity
        excludeCredentials,
        authenticatorSelection: {
            residentKey: 'preferred',
            userVerification: 'preferred',
            authenticatorAttachment: 'platform', // Prefer platform authenticator (Face ID, fingerprint)
        },
    });

    // Store challenge for verification
    storeChallenge(userId, options.challenge);

    return options;
}

/**
 * Verify registration response and store credential
 */
export async function verifyPasskeyRegistration(
    userId: string,
    response: RegistrationResponseJSON,
    deviceName?: string
): Promise<{ success: boolean; credentialId?: string; error?: string }> {
    const supabase = getSupabase();
    const expectedChallenge = getChallenge(userId);
    if (!expectedChallenge) {
        return { success: false, error: 'Challenge expired or not found' };
    }

    try {
        const verification = await verifyRegistrationResponse({
            response,
            expectedChallenge,
            expectedOrigin: origin,
            expectedRPID: rpID,
        });

        if (!verification.verified || !verification.registrationInfo) {
            return { success: false, error: 'Verification failed' };
        }

        const { credential, credentialDeviceType } = verification.registrationInfo;

        // Convert to base64url strings
        const credentialIdBase64 = uint8ArrayToBase64Url(credential.id);
        const publicKeyBase64 = uint8ArrayToBase64Url(credential.publicKey);

        // Store credential in database
        const { error } = await supabase.from('passkey_credentials').insert({
            user_id: userId,
            credential_id: credentialIdBase64,
            public_key: publicKeyBase64,
            counter: credential.counter,
            device_type: credentialDeviceType,
            device_name: deviceName || 'Passkey',
            transports: response.response.transports || [],
        });

        if (error) {
            console.error('Failed to store credential:', error);
            return { success: false, error: 'Failed to store credential' };
        }

        clearChallenge(userId);

        return {
            success: true,
            credentialId: credentialIdBase64,
        };
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Verification failed';
        console.error('Registration verification error:', err);
        return { success: false, error: message };
    }
}

/**
 * Generate authentication options for Passkey login
 */
export async function generatePasskeyAuthenticationOptions(
    userId?: string
): Promise<PublicKeyCredentialRequestOptionsJSON & { tempUserId?: string }> {
    const supabase = getSupabase();
    let allowCredentials: { id: string; type: 'public-key'; transports?: AuthenticatorTransportFuture[] }[] = [];

    if (userId) {
        // Get user's credentials
        const { data: credentials } = await supabase
            .from('passkey_credentials')
            .select('credential_id, transports')
            .eq('user_id', userId);

        allowCredentials = (credentials || []).map((cred: { credential_id: string; transports?: string[] }) => ({
            id: cred.credential_id,
            type: 'public-key' as const,
            transports: cred.transports as AuthenticatorTransportFuture[] | undefined,
        }));
    }

    const options = await generateAuthenticationOptions({
        rpID,
        userVerification: 'preferred',
        allowCredentials: allowCredentials.length > 0 ? allowCredentials : undefined,
    });

    // Store challenge for verification
    const tempUserId = userId || `anon_${Date.now()}`;
    storeChallenge(tempUserId, options.challenge);

    return { ...options, tempUserId };
}

/**
 * Verify authentication response
 */
export async function verifyPasskeyAuthentication(
    response: AuthenticationResponseJSON,
    expectedUserId?: string
): Promise<{ success: boolean; userId?: string; error?: string }> {
    const supabase = getSupabase();
    // Find credential by ID
    const credentialId = response.id;

    const { data: credential, error: lookupError } = await supabase
        .from('passkey_credentials')
        .select('*')
        .eq('credential_id', credentialId)
        .single();

    if (lookupError || !credential) {
        return { success: false, error: 'Credential not found' };
    }

    // Get challenge
    const userId = expectedUserId || credential.user_id;
    let expectedChallenge = getChallenge(userId);

    // Try anonymous challenge if user challenge not found
    if (!expectedChallenge) {
        const keys = Array.from(challengeStore.keys());
        const anonKey = keys.find(k => k.startsWith('anon_'));
        if (anonKey) {
            expectedChallenge = getChallenge(anonKey);
        }
    }

    if (!expectedChallenge) {
        return { success: false, error: 'Challenge expired or not found' };
    }

    try {
        const verification = await verifyAuthenticationResponse({
            response,
            expectedChallenge,
            expectedOrigin: origin,
            expectedRPID: rpID,
            credential: {
                id: base64UrlToUint8Array(credential.credential_id),
                publicKey: base64UrlToUint8Array(credential.public_key),
                counter: credential.counter,
                transports: credential.transports as AuthenticatorTransportFuture[] | undefined,
            },
        });

        if (!verification.verified) {
            return { success: false, error: 'Verification failed' };
        }

        // Update counter and last_used_at
        await supabase
            .from('passkey_credentials')
            .update({
                counter: verification.authenticationInfo.newCounter,
                last_used_at: new Date().toISOString(),
            })
            .eq('id', credential.id);

        clearChallenge(userId);

        return { success: true, userId: credential.user_id };
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Verification failed';
        console.error('Authentication verification error:', err);
        return { success: false, error: message };
    }
}

/**
 * List user's Passkey credentials
 */
export async function listUserPasskeys(userId: string): Promise<PasskeyCredential[]> {
    const supabase = getSupabase();
    const { data, error } = await supabase
        .from('passkey_credentials')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Failed to list passkeys:', error);
        return [];
    }

    return data || [];
}

/**
 * Delete a Passkey credential
 */
export async function deletePasskey(
    userId: string,
    credentialId: string
): Promise<{ success: boolean; error?: string }> {
    const supabase = getSupabase();
    const { error } = await supabase
        .from('passkey_credentials')
        .delete()
        .eq('user_id', userId)
        .eq('id', credentialId);

    if (error) {
        return { success: false, error: error.message };
    }

    return { success: true };
}

/**
 * Rename a Passkey credential
 */
export async function renamePasskey(
    userId: string,
    credentialId: string,
    deviceName: string
): Promise<{ success: boolean; error?: string }> {
    const supabase = getSupabase();
    const { error } = await supabase
        .from('passkey_credentials')
        .update({ device_name: deviceName })
        .eq('user_id', userId)
        .eq('id', credentialId);

    if (error) {
        return { success: false, error: error.message };
    }

    return { success: true };
}

// Helper functions for base64url encoding/decoding
export function uint8ArrayToBase64Url(uint8Array: Uint8Array): string {
    let binary = '';
    for (let i = 0; i < uint8Array.length; i++) {
        binary += String.fromCharCode(uint8Array[i]);
    }
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

export function base64UrlToUint8Array(base64Url: string): Uint8Array {
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const padding = '='.repeat((4 - (base64.length % 4)) % 4);
    const binary = atob(base64 + padding);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
}
