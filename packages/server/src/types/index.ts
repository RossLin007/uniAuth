/**
 * Type definitions for UniAuth
 * UniAuth 类型定义
 */

// User types
export interface User {
    id: string;
    phone: string | null;
    email: string | null;
    phone_verified: boolean;
    email_verified: boolean;
    password_hash: string | null;
    nickname: string | null;
    avatar_url: string | null;
    status: 'active' | 'suspended' | 'deleted';
    created_at: string;
    updated_at: string;
}

export type UserPublic = Pick<User, 'id' | 'phone' | 'email' | 'nickname' | 'avatar_url'>;

// Verification code types
export interface VerificationCode {
    id: string;
    phone: string | null;
    email: string | null;
    code: string;
    type: 'login' | 'register' | 'reset' | 'email_verify';
    expires_at: string;
    used: boolean;
    attempts: number;
    created_at: string;
}

// Refresh token types
export interface RefreshToken {
    id: string;
    user_id: string;
    token_hash: string;
    device_info: DeviceInfo | null;
    ip_address: string | null;
    expires_at: string;
    revoked: boolean;
    created_at: string;
}

export interface DeviceInfo {
    user_agent?: string;
    platform?: string;
    browser?: string;
}

// OAuth types
export interface OAuthAccount {
    id: string;
    user_id: string;
    provider: OAuthProvider;
    provider_user_id: string;
    provider_email: string | null;
    provider_data: Record<string, unknown> | null;
    created_at: string;
    updated_at: string;
}

export type OAuthProvider = 'google' | 'github' | 'wechat' | 'apple';

export interface OAuthUserInfo {
    id: string;
    email?: string;
    name?: string;
    avatar?: string;
    raw?: Record<string, unknown>;
}

// Application types
export type AppType = 'web' | 'spa' | 'native' | 'm2m';
export type GrantType = 'authorization_code' | 'trusted_client' | 'client_credentials' | 'refresh_token';

export interface Application {
    id: string;
    client_id: string;
    client_secret: string;
    name: string;
    description: string | null;
    logo_url: string | null;
    homepage_url: string | null;
    redirect_uris: string[];
    is_trusted: boolean;
    app_type: AppType;
    allowed_grants: GrantType[];
    status: 'active' | 'suspended';
    created_at: string;
    updated_at: string;
}

// Authorization Code types
export interface AuthorizationCode {
    code: string;
    client_id: string;
    user_id: string;
    redirect_uri: string;
    scope: string | null;
    expires_at: string;
    used_at: string | null;
    created_at: string;
}

// OAuth2 API Types
export interface OAuth2AuthorizeRequest {
    client_id: string;
    redirect_uri: string;
    response_type: 'code';
    scope?: string;
    state?: string;
}

export interface OAuth2TokenRequest {
    grant_type: 'authorization_code' | 'client_credentials' | 'refresh_token' | 'password';
    client_id: string;
    client_secret?: string;
    code?: string;
    redirect_uri?: string;
    refresh_token?: string;
    username?: string;
    password?: string;
    scope?: string;
    code_verifier?: string;
}

export interface OAuth2TokenResponse {
    access_token: string;
    token_type: 'Bearer';
    expires_in: number;
    refresh_token?: string;
    id_token?: string; // OIDC ID Token
    scope?: string;
}

// Audit log types
export interface AuditLog {
    id: string;
    user_id: string | null;
    action: string;
    ip_address: string | null;
    user_agent: string | null;
    metadata: Record<string, unknown> | null;
    created_at: string;
}

// Token types
export interface TokenPair {
    access_token: string;
    refresh_token: string;
    expires_in: number;
}

export interface JWTPayload {
    sub: string; // user id
    aud?: string; // audience (client_id)
    azp?: string; // authorized party
    iss?: string; // issuer
    phone?: string;
    email?: string;
    scope?: string;
    iat: number;
    exp: number;
}

/**
 * ID Token Payload (OIDC)
 * ID Token 载荷（OpenID Connect）
 */
export interface IDTokenPayload {
    iss: string; // issuer
    sub: string; // subject (user id)
    aud: string; // audience (client_id)
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
}

// API types
export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    message?: string;
    error?: {
        code: string;
        message: string;
    };
}

// Phone auth types
export interface SendCodeRequest {
    phone?: string;
    email?: string;
    type?: 'login' | 'register' | 'reset' | 'email_verify';
}

export interface SendCodeResponse {
    expires_in: number;
    retry_after: number;
}

export interface VerifyCodeRequest {
    phone?: string;
    email?: string;
    code: string;
}

export interface VerifyCodeResponse {
    user: UserPublic;
    access_token: string;
    refresh_token: string;
    expires_in: number;
    is_new_user: boolean;
}

// Email auth types
export interface EmailRegisterRequest {
    email: string;
    password: string;
    nickname?: string;
}

export interface EmailLoginRequest {
    email: string;
    password: string;
}

// OAuth types
export interface OAuthCallbackRequest {
    provider: OAuthProvider;
    code: string;
    state?: string;
}

export interface OAuthLoginResponse {
    user: UserPublic;
    access_token: string;
    refresh_token: string;
    expires_in: number;
    is_new_user: boolean;
}

// Token refresh types
export interface RefreshTokenRequest {
    refresh_token: string;
}

export interface RefreshTokenResponse {
    access_token: string;
    refresh_token: string;
    expires_in: number;
}

export interface UpdateUserRequest {
    nickname?: string | null;
    avatar_url?: string | null;
}

// Session types
export interface Session {
    id: string;
    device_info: DeviceInfo | null;
    ip_address: string | null;
    created_at: string;
    is_current: boolean;
}

// Hono context variables
export interface HonoVariables {
    user: User;
    jwtPayload: JWTPayload;
    requestId: string;
}

// PKCE types for OAuth2
export interface PKCEChallenge {
    code_challenge: string;
    code_challenge_method: 'S256' | 'plain';
}

// Extended Authorization Code with PKCE support
export interface AuthorizationCodeWithPKCE extends AuthorizationCode {
    code_challenge?: string;
    code_challenge_method?: 'S256' | 'plain';
    nonce?: string; // OIDC nonce parameter
}

// Extended Application with security fields
export interface ApplicationExtended extends Application {
    client_secret_hash?: string;
    is_public?: boolean;
}

// Rate limit info
export interface RateLimitInfo {
    limit: number;
    remaining: number;
    reset: number;
}

// IP Blacklist entry
export interface IPBlacklistEntry {
    id: string;
    ip_address: string;
    reason: string | null;
    blocked_until: string | null;
    is_permanent: boolean;
    created_at: string;
}

