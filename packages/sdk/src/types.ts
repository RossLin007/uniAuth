export interface UniAuthOptions {
    clientId: string;
    clientSecret: string;
    baseUrl?: string;
    timeout?: number;
}

export interface User {
    id: string;
    email?: string;
    phone?: string;
    nickname?: string;
    avatar_url?: string;
    created_at?: string;
    updated_at?: string;
}

export interface TokenPair {
    access_token: string;
    refresh_token: string;
    expires_in: number;
}

export interface AuthResult {
    success: boolean;
    message: string;
    user?: User;
    data?: {
        user?: User;
        access_token?: string;
        refresh_token?: string;
        expires_in?: number;
        is_new_user?: boolean;
        // For send code
        expires_in_seconds?: number;
        retry_after?: number;
        // For MFA
        mfa_required?: boolean;
        mfa_token?: string;
    };
    // Flattened for convenience
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    id_token?: string; // OIDC ID Token
}

export interface SendCodeResult {
    success: boolean;
    message: string;
    expires_in?: number;
    retry_after?: number;
}

/**
 * OIDC Discovery Document
 * OpenID Connect Provider Configuration
 */
export interface OIDCDiscovery {
    issuer: string;
    authorization_endpoint: string;
    token_endpoint: string;
    userinfo_endpoint: string;
    jwks_uri?: string;
    response_types_supported: string[];
    grant_types_supported: string[];
    subject_types_supported: string[];
    id_token_signing_alg_values_supported: string[];
    scopes_supported: string[];
    token_endpoint_auth_methods_supported: string[];
    claims_supported: string[];
    code_challenge_methods_supported?: string[];
}

/**
 * ID Token Claims (OIDC)
 * ID Token 载荷声明
 */
export interface IDTokenClaims {
    iss: string; // issuer
    sub: string; // subject (user id)
    aud: string | string[]; // audience (client_id)
    exp: number; // expiration time
    iat: number; // issued at
    nonce?: string; // nonce for replay protection
    auth_time?: number; // authentication time
    email?: string;
    email_verified?: boolean;
    phone_number?: string;
    phone_verified?: boolean;
    name?: string;
    picture?: string;
    [key: string]: any; // Allow additional claims
}

/**
 * UserInfo Response (OIDC)
 * UserInfo 端点响应
 */
export interface UserInfo {
    sub: string;
    email?: string;
    email_verified?: boolean;
    phone_number?: string;
    phone_verified?: boolean;
    name?: string;
    picture?: string;
    updated_at?: number;
    [key: string]: any; // Allow additional claims
}

/**
 * OAuth2/OIDC Token Response
 * 令牌响应
 */
export interface TokenResponse {
    access_token: string;
    token_type: 'Bearer';
    expires_in: number;
    refresh_token?: string;
    id_token?: string; // OIDC ID Token
    scope?: string;
}
