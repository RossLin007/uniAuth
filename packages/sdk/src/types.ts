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
}

export interface SendCodeResult {
    success: boolean;
    message: string;
    expires_in?: number;
    retry_after?: number;
}
