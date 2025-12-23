/**
 * MFA Service - TOTP-based Two-Factor Authentication
 * MFA 服务 - 基于 TOTP 的双因素认证
 */
import * as OTPAuth from 'otpauth';
import QRCode from 'qrcode';
import { getSupabase, TABLES } from './supabase.js';
import crypto from 'crypto';

const MFA_ISSUER = 'UniAuth';
const TOTP_PERIOD = 30;
const TOTP_DIGITS = 6;
const TOTP_ALGORITHM = 'SHA1';
const RECOVERY_CODE_COUNT = 10;
const RECOVERY_CODE_LENGTH = 8;

/**
 * MFA Secret stored in database
 */
export interface MFASecret {
    id: string;
    user_id: string;
    secret: string;
    enabled: boolean;
    created_at: string;
    verified_at: string | null;
}

/**
 * MFA Recovery Code
 */
export interface MFARecoveryCode {
    id: string;
    user_id: string;
    code_hash: string;
    used: boolean;
    used_at: string | null;
    created_at: string;
}

/**
 * Generate a new TOTP secret
 */
export function generateTOTPSecret(): string {
    return OTPAuth.Secret.fromHex(crypto.randomBytes(20).toString('hex')).base32;
}

/**
 * Create TOTP instance
 */
function createTOTP(secret: string, label: string): OTPAuth.TOTP {
    return new OTPAuth.TOTP({
        issuer: MFA_ISSUER,
        label: label,
        algorithm: TOTP_ALGORITHM,
        digits: TOTP_DIGITS,
        period: TOTP_PERIOD,
        secret: OTPAuth.Secret.fromBase32(secret),
    });
}

/**
 * Generate QR code data URL for authenticator app
 */
export async function generateQRCode(secret: string, label: string): Promise<string> {
    const totp = createTOTP(secret, label);
    const uri = totp.toString();
    return await QRCode.toDataURL(uri);
}

/**
 * Verify TOTP code
 */
export function verifyTOTP(secret: string, code: string, label: string): boolean {
    const totp = createTOTP(secret, label);
    const delta = totp.validate({ token: code, window: 1 });
    return delta !== null;
}

/**
 * Generate recovery codes
 */
export function generateRecoveryCodes(): string[] {
    const codes: string[] = [];
    for (let i = 0; i < RECOVERY_CODE_COUNT; i++) {
        const code = crypto.randomBytes(RECOVERY_CODE_LENGTH / 2).toString('hex').toUpperCase();
        codes.push(code);
    }
    return codes;
}

/**
 * Hash a recovery code
 */
export function hashRecoveryCode(code: string): string {
    return crypto.createHash('sha256').update(code.toUpperCase()).digest('hex');
}

/**
 * MFA Service class
 */
export class MFAService {
    private supabase = getSupabase();

    /**
     * Check if user has MFA enabled
     */
    async isMFAEnabled(userId: string): Promise<boolean> {
        const { data } = await this.supabase
            .from('mfa_secrets')
            .select('enabled')
            .eq('user_id', userId)
            .eq('enabled', true)
            .single();

        return !!data;
    }

    /**
     * Get MFA status for user
     */
    async getMFAStatus(userId: string): Promise<{
        enabled: boolean;
        verifiedAt: string | null;
        recoveryCodes: number;
    }> {
        const { data: mfaSecret } = await this.supabase
            .from('mfa_secrets')
            .select('enabled, verified_at')
            .eq('user_id', userId)
            .single();

        if (!mfaSecret || !mfaSecret.enabled) {
            return { enabled: false, verifiedAt: null, recoveryCodes: 0 };
        }

        const { count } = await this.supabase
            .from('mfa_recovery_codes')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('used', false);

        return {
            enabled: true,
            verifiedAt: mfaSecret.verified_at,
            recoveryCodes: count || 0,
        };
    }

    /**
     * Start MFA setup - generate secret and QR code
     */
    async setupMFA(userId: string, userEmail: string): Promise<{
        success: boolean;
        secret?: string;
        qrCode?: string;
        message?: string;
    }> {
        // Check if MFA is already enabled
        const isEnabled = await this.isMFAEnabled(userId);
        if (isEnabled) {
            return {
                success: false,
                message: 'MFA is already enabled / MFA 已启用',
            };
        }

        // Generate new secret
        const secret = generateTOTPSecret();

        // Delete any existing unverified MFA setup
        await this.supabase
            .from('mfa_secrets')
            .delete()
            .eq('user_id', userId)
            .eq('enabled', false);

        // Save new secret (not enabled yet)
        const { error } = await this.supabase
            .from('mfa_secrets')
            .insert({
                user_id: userId,
                secret: secret,
                enabled: false,
            });

        if (error) {
            console.error('Failed to save MFA secret:', error);
            return {
                success: false,
                message: 'Failed to setup MFA / MFA 设置失败',
            };
        }

        // Generate QR code
        const label = userEmail || userId.substring(0, 8);
        const qrCode = await generateQRCode(secret, label);

        return {
            success: true,
            secret,
            qrCode,
        };
    }

    /**
     * Verify MFA setup with first TOTP code
     */
    async verifyMFASetup(userId: string, code: string): Promise<{
        success: boolean;
        recoveryCodes?: string[];
        message?: string;
    }> {
        // Get the pending MFA secret
        const { data: mfaSecret } = await this.supabase
            .from('mfa_secrets')
            .select('*')
            .eq('user_id', userId)
            .eq('enabled', false)
            .single();

        if (!mfaSecret) {
            return {
                success: false,
                message: 'No pending MFA setup found / 未找到待设置的 MFA',
            };
        }

        // Verify the code
        if (!verifyTOTP(mfaSecret.secret, code, userId)) {
            return {
                success: false,
                message: 'Invalid verification code / 验证码错误',
            };
        }

        // Enable MFA
        const { error: updateError } = await this.supabase
            .from('mfa_secrets')
            .update({
                enabled: true,
                verified_at: new Date().toISOString(),
            })
            .eq('id', mfaSecret.id);

        if (updateError) {
            console.error('Failed to enable MFA:', updateError);
            return {
                success: false,
                message: 'Failed to enable MFA / MFA 启用失败',
            };
        }

        // Generate recovery codes
        const recoveryCodes = generateRecoveryCodes();
        const recoveryCodeRecords = recoveryCodes.map(code => ({
            user_id: userId,
            code_hash: hashRecoveryCode(code),
            used: false,
        }));

        // Delete old recovery codes
        await this.supabase
            .from('mfa_recovery_codes')
            .delete()
            .eq('user_id', userId);

        // Save new recovery codes
        await this.supabase
            .from('mfa_recovery_codes')
            .insert(recoveryCodeRecords);

        return {
            success: true,
            recoveryCodes,
        };
    }

    /**
     * Verify TOTP code for login
     */
    async verifyMFACode(userId: string, code: string): Promise<{
        success: boolean;
        message?: string;
    }> {
        const { data: mfaSecret } = await this.supabase
            .from('mfa_secrets')
            .select('secret')
            .eq('user_id', userId)
            .eq('enabled', true)
            .single();

        if (!mfaSecret) {
            return {
                success: false,
                message: 'MFA not enabled / MFA 未启用',
            };
        }

        if (!verifyTOTP(mfaSecret.secret, code, userId)) {
            return {
                success: false,
                message: 'Invalid code / 验证码错误',
            };
        }

        return { success: true };
    }

    /**
     * Verify recovery code and disable it
     */
    async verifyRecoveryCode(userId: string, code: string): Promise<{
        success: boolean;
        message?: string;
    }> {
        const codeHash = hashRecoveryCode(code);

        const { data: recoveryCode, error } = await this.supabase
            .from('mfa_recovery_codes')
            .select('id')
            .eq('user_id', userId)
            .eq('code_hash', codeHash)
            .eq('used', false)
            .single();

        if (error || !recoveryCode) {
            return {
                success: false,
                message: 'Invalid recovery code / 无效的恢复码',
            };
        }

        // Mark as used
        await this.supabase
            .from('mfa_recovery_codes')
            .update({
                used: true,
                used_at: new Date().toISOString(),
            })
            .eq('id', recoveryCode.id);

        return { success: true };
    }

    /**
     * Disable MFA for user
     */
    async disableMFA(userId: string, code: string): Promise<{
        success: boolean;
        message?: string;
    }> {
        // First verify the code
        const verifyResult = await this.verifyMFACode(userId, code);
        if (!verifyResult.success) {
            // Try recovery code
            const recoveryResult = await this.verifyRecoveryCode(userId, code);
            if (!recoveryResult.success) {
                return {
                    success: false,
                    message: 'Invalid verification code / 验证码错误',
                };
            }
        }

        // Delete MFA secret
        const { error } = await this.supabase
            .from('mfa_secrets')
            .delete()
            .eq('user_id', userId);

        if (error) {
            console.error('Failed to disable MFA:', error);
            return {
                success: false,
                message: 'Failed to disable MFA / MFA 禁用失败',
            };
        }

        // Delete recovery codes
        await this.supabase
            .from('mfa_recovery_codes')
            .delete()
            .eq('user_id', userId);

        return {
            success: true,
            message: 'MFA disabled successfully / MFA 已禁用',
        };
    }

    /**
     * Regenerate recovery codes
     */
    async regenerateRecoveryCodes(userId: string, code: string): Promise<{
        success: boolean;
        recoveryCodes?: string[];
        message?: string;
    }> {
        // Verify current MFA code
        const verifyResult = await this.verifyMFACode(userId, code);
        if (!verifyResult.success) {
            return {
                success: false,
                message: 'Invalid verification code / 验证码错误',
            };
        }

        // Generate new recovery codes
        const recoveryCodes = generateRecoveryCodes();
        const recoveryCodeRecords = recoveryCodes.map(c => ({
            user_id: userId,
            code_hash: hashRecoveryCode(c),
            used: false,
        }));

        // Delete old recovery codes
        await this.supabase
            .from('mfa_recovery_codes')
            .delete()
            .eq('user_id', userId);

        // Save new recovery codes
        await this.supabase
            .from('mfa_recovery_codes')
            .insert(recoveryCodeRecords);

        return {
            success: true,
            recoveryCodes,
        };
    }
}

export const mfaService = new MFAService();
