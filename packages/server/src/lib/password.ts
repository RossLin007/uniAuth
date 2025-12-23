import { createHash } from 'crypto';

/**
 * Password hashing utilities
 * 密码哈希工具
 */

/**
 * Hash a password using SHA-256 with salt
 * 使用 SHA-256 和盐值对密码进行哈希
 * 
 * Note: In production, consider using bcrypt or argon2
 * 注意：生产环境建议使用 bcrypt 或 argon2
 */
export function hashPassword(password: string): string {
    const salt = generateSalt();
    const hash = createHash('sha256')
        .update(salt + password)
        .digest('hex');
    return `${salt}:${hash}`;
}

/**
 * Verify a password against a hash
 * 验证密码是否与哈希匹配
 */
export function verifyPassword(password: string, storedHash: string): boolean {
    const [salt, hash] = storedHash.split(':');
    if (!salt || !hash) return false;

    const computedHash = createHash('sha256')
        .update(salt + password)
        .digest('hex');

    return computedHash === hash;
}

/**
 * Generate a random salt
 * 生成随机盐值
 */
function generateSalt(): string {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Validate password strength
 * 验证密码强度
 */
export function validatePasswordStrength(password: string): {
    valid: boolean;
    errors: string[];
} {
    const errors: string[] = [];

    if (password.length < 8) {
        errors.push('Password must be at least 8 characters / 密码至少8个字符');
    }
    if (!/[a-z]/.test(password)) {
        errors.push('Password must contain lowercase letter / 密码必须包含小写字母');
    }
    if (!/[A-Z]/.test(password)) {
        errors.push('Password must contain uppercase letter / 密码必须包含大写字母');
    }
    if (!/[0-9]/.test(password)) {
        errors.push('Password must contain number / 密码必须包含数字');
    }

    return {
        valid: errors.length === 0,
        errors,
    };
}
