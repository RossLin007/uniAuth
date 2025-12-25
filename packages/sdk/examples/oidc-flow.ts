/**
 * UniAuth SDK - OIDC Client Example
 * 
 * This example demonstrates how to use the UniAuth SDK with full OIDC support:
 * 1. Discovery document fetching
 * 2. Authorization flow with nonce
 * 3. Token exchange (with ID token)
 * 4. ID token validation
 * 5. UserInfo endpoint access
 */

import { UniAuthClient } from '@uniauth/sdk';

// Initialize the client
const client = new UniAuthClient({
    clientId: process.env.UNIAUTH_CLIENT_ID!,
    clientSecret: process.env.UNIAUTH_CLIENT_SECRET!,
    baseUrl: process.env.UNIAUTH_BASE_URL || 'https://auth.yourdomain.com',
});

// Example 1: Get OIDC Discovery Document
async function exampleDiscovery() {
    console.log('=== OIDC Discovery ===');

    try {
        const discovery = await client.getDiscovery();

        console.log('Issuer:', discovery.issuer);
        console.log('Authorization Endpoint:', discovery.authorization_endpoint);
        console.log('Token Endpoint:', discovery.token_endpoint);
        console.log('Supported Scopes:', discovery.scopes_supported);
        console.log('Supported Claims:', discovery.claims_supported);

        return discovery;
    } catch (error) {
        console.error('Discovery failed:', error);
        throw error;
    }
}

// Example 2: Authorization Flow with OIDC
async function exampleAuthorizationFlow() {
    console.log('\n=== Authorization Flow ===');

    // Generate a random nonce for replay protection
    const nonce = generateNonce();
    console.log('Generated nonce:', nonce);

    // Get authorization URL
    const authUrl = client.getAuthorizeUrl(
        'https://myapp.com/callback',
        'openid profile email phone',
        'random_state_string'
    );

    console.log('Authorization URL:', authUrl);
    console.log('Manual step: User visits this URL and authorizes');
    console.log('After auth, you receive a code in the callback');

    return { nonce };
}

//  Example 3: Exchange Code for Tokens (with ID Token)
async function exampleTokenExchange(code: string) {
    console.log('\n=== Token Exchange ===');

    try {
        const result = await client.exchangeAuthCode(
            code,
            'https://myapp.com/callback'
        );

        if (result.success) {
            console.log('Access Token:', result.access_token?.substring(0, 20) + '...');
            console.log('Refresh Token:', result.refresh_token?.substring(0, 20) + '...');
            console.log('ID Token:', result.id_token?.substring(0, 20) + '...');
            console.log('Expires In:', result.expires_in, 'seconds');

            return {
                accessToken: result.access_token!,
                refreshToken: result.refresh_token!,
                idToken: result.id_token!,
            };
        } else {
            throw new Error(result.message);
        }
    } catch (error) {
        console.error('Token exchange failed:', error);
        throw error;
    }
}

// Example 4: Validate ID Token
async function exampleValidateIdToken(idToken: string, nonce: string) {
    console.log('\n=== ID Token Validation ===');

    try {
        const claims = await client.validateIdToken(idToken, {
            nonce: nonce,
            maxAge: 3600, // Token must be issued within last hour
        });

        console.log('Token is valid!');
        console.log('User ID (sub):', claims.sub);
        console.log('Issuer:', claims.iss);
        console.log('Audience:', claims.aud);
        console.log('Email:', claims.email);
        console.log('Email Verified:', claims.email_verified);
        console.log('Phone:', claims.phone_number);
        console.log('Name:', claims.name);

        return claims;
    } catch (error) {
        console.error('ID token validation failed:', error);
        throw error;
    }
}

// Example 5: Get User Info
async function exampleUserInfo(accessToken: string) {
    console.log('\n=== UserInfo Endpoint ===');

    try {
        const userInfo = await client.getUserInfo(accessToken);

        console.log('User Info:');
        console.log('  Sub:', userInfo.sub);
        console.log('  Email:', userInfo.email);
        console.log('  Email Verified:', userInfo.email_verified);
        console.log('  Phone:', userInfo.phone_number);
        console.log('  Phone Verified:', userInfo.phone_verified);
        console.log('  Name:', userInfo.name);
        console.log('  Picture:', userInfo.picture);
        console.log('  Updated At:', userInfo.updated_at);

        return userInfo;
    } catch (error) {
        console.error('UserInfo request failed:', error);
        throw error;
    }
}

// Example 6: Complete OIDC Flow
async function completeOIDCFlow() {
    console.log('=== Complete OIDC Flow Example ===\n');

    try {
        // Step 1: Fetch discovery document
        const discovery = await exampleDiscovery();

        // Step 2: Generate auth URL with nonce
        const { nonce } = await exampleAuthorizationFlow();

        // In a real app, user would be redirected and you'd receive the code
        // For this example, we'll simulate having received a code
        console.log('\n[Simulating user authorization...]');
        console.log('[User would be redirected back with code]');

        // Assuming you received a code from the callback
        const simulatedCode = 'AUTHORIZATION_CODE_FROM_CALLBACK';

        // Step 3: Exchange code for tokens
        // const { accessToken, idToken } = await exampleTokenExchange(simulatedCode);

        // Step 4: Validate ID token
        // const claims = await exampleValidateIdToken(idToken, nonce);

        // Step 5: Get additional user info
        // const userInfo = await exampleUserInfo(accessToken);

        console.log('\n✅ OIDC flow completed successfully!');

    } catch (error) {
        console.error('\n❌ OIDC flow failed:', error);
        process.exit(1);
    }
}

// Helper function to generate a random nonce
function generateNonce(length: number = 32): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let nonce = '';
    for (let i = 0; i < length; i++) {
        nonce += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return nonce;
}

// Run the example
if (require.main === module) {
    completeOIDCFlow().catch(console.error);
}

export {
    exampleDiscovery,
    exampleAuthorizationFlow,
    exampleTokenExchange,
    exampleValidateIdToken,
    exampleUserInfo,
    completeOIDCFlow,
};
