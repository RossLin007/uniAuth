import { getSupabase, TABLES } from '../lib/supabase.js';
import {
    sendVerificationSms,
    generateVerificationCode,
    generateTokenPair,
    hashToken,
    parseDuration,
    hashPassword,
    verifyPassword,
    exchangeOAuthCode,
    getOAuthUserInfo,
} from '../lib/index.js';
import { mfaService } from '../lib/mfa.js';
import { VERIFICATION_CODE, MESSAGES, env } from '../config/index.js';
import type {
    User,
    UserPublic,
    VerificationCode,
    RefreshToken,
    DeviceInfo,
    TokenPair,
    OAuthProvider,
    OAuthAccount,
} from '../types/index.js';

/**
 * Authentication Service
 * 认证服务
 */
export class AuthService {
    private supabase = getSupabase();

    // ============================================
    // Phone Authentication / 手机认证
    // ============================================

    /**
     * Send verification code to phone
     * 向手机发送验证码
     */
    async sendPhoneCode(
        phone: string,
        type: 'login' | 'register' | 'reset' = 'login'
    ): Promise<{ success: boolean; message: string; expiresIn?: number; retryAfter?: number }> {
        // Get start of today (UTC)
        const todayStart = new Date();
        todayStart.setUTCHours(0, 0, 0, 0);

        // Check daily quota for this phone number
        const { count: dailyCount } = await this.supabase
            .from(TABLES.VERIFICATION_CODES)
            .select('id', { count: 'exact', head: true })
            .eq('phone', phone)
            .gte('created_at', todayStart.toISOString());

        if (dailyCount && dailyCount >= VERIFICATION_CODE.DAILY_LIMIT_PER_PHONE) {
            return {
                success: false,
                message: MESSAGES.ERROR.DAILY_LIMIT_EXCEEDED,
            };
        }

        // Check if there's a recent code (rate limiting)
        const { data: recentCode } = await this.supabase
            .from(TABLES.VERIFICATION_CODES)
            .select('created_at')
            .eq('phone', phone)
            .gte('created_at', new Date(Date.now() - VERIFICATION_CODE.RETRY_AFTER_SECONDS * 1000).toISOString())
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (recentCode) {
            const createdAt = new Date(recentCode.created_at).getTime();
            const retryAfter = Math.ceil(
                (createdAt + VERIFICATION_CODE.RETRY_AFTER_SECONDS * 1000 - Date.now()) / 1000
            );
            return {
                success: false,
                message: MESSAGES.ERROR.RATE_LIMIT_EXCEEDED,
                retryAfter,
            };
        }

        // Generate verification code
        const code = generateVerificationCode(VERIFICATION_CODE.LENGTH);
        const expiresAt = new Date(Date.now() + VERIFICATION_CODE.EXPIRES_IN_SECONDS * 1000);

        // Store verification code
        const { error: insertError } = await this.supabase
            .from(TABLES.VERIFICATION_CODES)
            .insert({
                phone,
                code,
                type,
                expires_at: expiresAt.toISOString(),
            });

        if (insertError) {
            console.error('Failed to store verification code:', insertError);
            return {
                success: false,
                message: MESSAGES.ERROR.INTERNAL_ERROR,
            };
        }

        // Send SMS
        const smsSent = await sendVerificationSms(phone, code);

        if (!smsSent) {
            return {
                success: false,
                message: MESSAGES.ERROR.SMS_SEND_FAILED,
            };
        }

        return {
            success: true,
            message: MESSAGES.SUCCESS.CODE_SENT,
            expiresIn: VERIFICATION_CODE.EXPIRES_IN_SECONDS,
            retryAfter: VERIFICATION_CODE.RETRY_AFTER_SECONDS,
        };
    }

    /**
     * Verify phone code and login/register user
     * 验证手机验证码并登录/注册用户
     */
    async verifyPhoneCode(
        phone: string,
        code: string,
        deviceInfo?: DeviceInfo,
        ipAddress?: string
    ): Promise<{
        success: boolean;
        message: string;
        user?: UserPublic;
        tokens?: TokenPair;
        isNewUser?: boolean;
        mfaRequired?: boolean;
        mfaToken?: string;
    }> {
        // Find valid verification code
        const { data: verificationCode, error: findError } = await this.supabase
            .from(TABLES.VERIFICATION_CODES)
            .select('*')
            .eq('phone', phone)
            .eq('used', false)
            .gt('expires_at', new Date().toISOString())
            .order('created_at', { ascending: false })
            .limit(1)
            .single<VerificationCode>();

        if (findError || !verificationCode) {
            return {
                success: false,
                message: MESSAGES.ERROR.CODE_EXPIRED,
            };
        }

        // Check max attempts
        if (verificationCode.attempts >= VERIFICATION_CODE.MAX_ATTEMPTS) {
            return {
                success: false,
                message: MESSAGES.ERROR.TOO_MANY_ATTEMPTS,
            };
        }

        // Increment attempts
        await this.supabase
            .from(TABLES.VERIFICATION_CODES)
            .update({ attempts: verificationCode.attempts + 1 })
            .eq('id', verificationCode.id);

        // Verify code
        if (verificationCode.code !== code) {
            return {
                success: false,
                message: MESSAGES.ERROR.INVALID_CODE,
            };
        }

        // Mark code as used
        await this.supabase
            .from(TABLES.VERIFICATION_CODES)
            .update({ used: true })
            .eq('id', verificationCode.id);

        // Find or create user
        return this.findOrCreateUserByPhone(phone, deviceInfo, ipAddress);
    }

    // ============================================
    // Email Authentication / 邮箱认证
    // ============================================

    /**
     * Register with email and password
     * 使用邮箱和密码注册
     */
    async registerWithEmail(
        email: string,
        password: string,
        nickname?: string,
        deviceInfo?: DeviceInfo,
        ipAddress?: string
    ): Promise<{
        success: boolean;
        message: string;
        user?: UserPublic;
        tokens?: TokenPair;
    }> {
        // Check if email already exists
        const { data: existingUser } = await this.supabase
            .from(TABLES.USERS)
            .select('id')
            .eq('email', email)
            .single();

        if (existingUser) {
            return {
                success: false,
                message: '该邮箱已被注册 / This email is already registered',
            };
        }

        // Hash password
        const passwordHash = hashPassword(password);

        // Create user
        const { data: user, error: createError } = await this.supabase
            .from(TABLES.USERS)
            .insert({
                email,
                password_hash: passwordHash,
                nickname: nickname || null,
                email_verified: false,
            })
            .select()
            .single<User>();

        if (createError || !user) {
            console.error('Failed to create user:', createError);
            return {
                success: false,
                message: MESSAGES.ERROR.INTERNAL_ERROR,
            };
        }

        // Generate tokens
        // Generate tokens
        const tokens = await generateTokenPair(user);

        // Store refresh token
        await this.storeRefreshToken(user.id, tokens.refresh_token, deviceInfo, ipAddress);

        // Log audit event
        await this.logAudit(user.id, 'register_email', ipAddress, deviceInfo?.user_agent);

        return {
            success: true,
            message: '注册成功 / Registration successful',
            user: this.toUserPublic(user),
            tokens,
        };
    }

    /**
     * Login with email and password
     * 使用邮箱和密码登录
     */
    async loginWithEmail(
        email: string,
        password: string,
        deviceInfo?: DeviceInfo,
        ipAddress?: string
    ): Promise<{
        success: boolean;
        message: string;
        user?: UserPublic;
        tokens?: TokenPair;
    }> {
        // Find user by email
        const { data: user, error } = await this.supabase
            .from(TABLES.USERS)
            .select('*')
            .eq('email', email)
            .single<User>();

        if (error || !user) {
            return {
                success: false,
                message: '邮箱或密码错误 / Invalid email or password',
            };
        }

        // Check user status
        if (user.status === 'suspended') {
            return {
                success: false,
                message: MESSAGES.ERROR.USER_SUSPENDED,
            };
        }

        // Verify password
        if (!user.password_hash || !verifyPassword(password, user.password_hash)) {
            return {
                success: false,
                message: '邮箱或密码错误 / Invalid email or password',
            };
        }

        // Generate tokens
        // Generate tokens
        const tokens = await generateTokenPair(user);

        // Store refresh token
        await this.storeRefreshToken(user.id, tokens.refresh_token, deviceInfo, ipAddress);

        // Log audit event
        await this.logAudit(user.id, 'login_email', ipAddress, deviceInfo?.user_agent);

        return {
            success: true,
            message: MESSAGES.SUCCESS.LOGIN_SUCCESS,
            user: this.toUserPublic(user),
            tokens,
        };
    }

    /**
     * Send email verification code
     * 发送邮箱验证码
     */
    async sendEmailCode(
        email: string,
        type: 'login' | 'register' | 'reset' | 'email_verify' = 'email_verify',
        ipAddress?: string
    ): Promise<{ success: boolean; message: string; expiresIn?: number; retryAfter?: number }> {
        // Import email service dynamically to avoid circular dependencies
        const { sendVerificationEmail } = await import('../lib/email.js');

        // Get start of today (UTC)
        const todayStart = new Date();
        todayStart.setUTCHours(0, 0, 0, 0);

        // Check daily quota for this email
        const { count: dailyCount } = await this.supabase
            .from(TABLES.VERIFICATION_CODES)
            .select('id', { count: 'exact', head: true })
            .eq('email', email)
            .gte('created_at', todayStart.toISOString());

        if (dailyCount && dailyCount >= VERIFICATION_CODE.DAILY_LIMIT_PER_PHONE) {
            return {
                success: false,
                message: MESSAGES.ERROR.DAILY_LIMIT_EXCEEDED,
            };
        }

        // Check daily quota for this IP address
        if (ipAddress) {
            const { count: ipDailyCount } = await this.supabase
                .from(TABLES.VERIFICATION_CODES)
                .select('id', { count: 'exact', head: true })
                .eq('ip_address', ipAddress)
                .gte('created_at', todayStart.toISOString());

            if (ipDailyCount && ipDailyCount >= VERIFICATION_CODE.DAILY_LIMIT_PER_IP) {
                return {
                    success: false,
                    message: MESSAGES.ERROR.DAILY_LIMIT_EXCEEDED,
                };
            }
        }

        // Check if there's a recent code (rate limiting)
        const { data: recentCode } = await this.supabase
            .from(TABLES.VERIFICATION_CODES)
            .select('created_at')
            .eq('email', email)
            .gte('created_at', new Date(Date.now() - VERIFICATION_CODE.RETRY_AFTER_SECONDS * 1000).toISOString())
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (recentCode) {
            const createdAt = new Date(recentCode.created_at).getTime();
            const retryAfter = Math.ceil(
                (createdAt + VERIFICATION_CODE.RETRY_AFTER_SECONDS * 1000 - Date.now()) / 1000
            );
            return {
                success: false,
                message: MESSAGES.ERROR.RATE_LIMIT_EXCEEDED,
                retryAfter,
            };
        }

        // Generate verification code
        const code = generateVerificationCode(VERIFICATION_CODE.LENGTH);
        const expiresAt = new Date(Date.now() + VERIFICATION_CODE.EXPIRES_IN_SECONDS * 1000);

        // Store verification code
        const { error: insertError } = await this.supabase
            .from(TABLES.VERIFICATION_CODES)
            .insert({
                email,
                code,
                type,
                expires_at: expiresAt.toISOString(),
            });

        if (insertError) {
            console.error('Failed to store verification code:', insertError);
            return {
                success: false,
                message: MESSAGES.ERROR.INTERNAL_ERROR,
            };
        }

        // Send email
        const emailSent = await sendVerificationEmail(email, code, type);

        if (!emailSent) {
            return {
                success: false,
                message: '邮件发送失败 / Failed to send email',
            };
        }

        return {
            success: true,
            message: '验证码已发送到邮箱 / Verification code sent to email',
            expiresIn: VERIFICATION_CODE.EXPIRES_IN_SECONDS,
            retryAfter: VERIFICATION_CODE.RETRY_AFTER_SECONDS,
        };
    }

    /**
     * Verify email code
     * 验证邮箱验证码
     */
    async verifyEmailCode(
        email: string,
        code: string,
        userId?: string
    ): Promise<{
        success: boolean;
        message: string;
    }> {
        // Find valid verification code
        const { data: verificationCode, error: findError } = await this.supabase
            .from(TABLES.VERIFICATION_CODES)
            .select('*')
            .eq('email', email)
            .eq('used', false)
            .gt('expires_at', new Date().toISOString())
            .order('created_at', { ascending: false })
            .limit(1)
            .single<VerificationCode>();

        if (findError || !verificationCode) {
            return {
                success: false,
                message: MESSAGES.ERROR.CODE_EXPIRED,
            };
        }

        // Check max attempts
        if (verificationCode.attempts >= VERIFICATION_CODE.MAX_ATTEMPTS) {
            return {
                success: false,
                message: MESSAGES.ERROR.TOO_MANY_ATTEMPTS,
            };
        }

        // Increment attempts
        await this.supabase
            .from(TABLES.VERIFICATION_CODES)
            .update({ attempts: verificationCode.attempts + 1 })
            .eq('id', verificationCode.id);

        // Verify code
        if (verificationCode.code !== code) {
            return {
                success: false,
                message: MESSAGES.ERROR.INVALID_CODE,
            };
        }

        // Mark code as used
        await this.supabase
            .from(TABLES.VERIFICATION_CODES)
            .update({ used: true })
            .eq('id', verificationCode.id);

        // If userId provided, update email_verified status
        if (userId) {
            await this.supabase
                .from(TABLES.USERS)
                .update({ email_verified: true })
                .eq('id', userId);
        } else {
            // Find user by email and update
            await this.supabase
                .from(TABLES.USERS)
                .update({ email_verified: true })
                .eq('email', email);
        }

        return {
            success: true,
            message: '邮箱验证成功 / Email verified successfully',
        };
    }

    /**
     * Login with email and verification code (passwordless)
     * 使用邮箱和验证码登录（无密码模式）
     * 
     * This method verifies the code and automatically creates a new user if not exists.
     * 此方法验证验证码，如果用户不存在则自动创建。
     */
    async loginWithEmailCode(
        email: string,
        code: string,
        deviceInfo?: DeviceInfo,
        ipAddress?: string
    ): Promise<{
        success: boolean;
        message: string;
        user?: UserPublic;
        tokens?: TokenPair;
        mfaRequired?: boolean;
        mfaToken?: string;
    }> {
        // Find valid verification code
        const { data: verificationCode, error: findError } = await this.supabase
            .from(TABLES.VERIFICATION_CODES)
            .select('*')
            .eq('email', email)
            .eq('used', false)
            .gt('expires_at', new Date().toISOString())
            .order('created_at', { ascending: false })
            .limit(1)
            .single<VerificationCode>();

        if (findError || !verificationCode) {
            return {
                success: false,
                message: MESSAGES.ERROR.CODE_EXPIRED,
            };
        }

        // Check max attempts
        if (verificationCode.attempts >= VERIFICATION_CODE.MAX_ATTEMPTS) {
            return {
                success: false,
                message: MESSAGES.ERROR.TOO_MANY_ATTEMPTS,
            };
        }

        // Increment attempts
        await this.supabase
            .from(TABLES.VERIFICATION_CODES)
            .update({ attempts: verificationCode.attempts + 1 })
            .eq('id', verificationCode.id);

        // Verify code
        if (verificationCode.code !== code) {
            return {
                success: false,
                message: MESSAGES.ERROR.INVALID_CODE,
            };
        }

        // Mark code as used
        await this.supabase
            .from(TABLES.VERIFICATION_CODES)
            .update({ used: true })
            .eq('id', verificationCode.id);

        // Find or create user by email
        return this.findOrCreateUserByEmail(email, deviceInfo, ipAddress);
    }

    /**
     * Find or create user by email
     * 根据邮箱查找或创建用户
     */
    private async findOrCreateUserByEmail(
        email: string,
        deviceInfo?: DeviceInfo,
        ipAddress?: string
    ): Promise<{
        success: boolean;
        message: string;
        user?: UserPublic;
        tokens?: TokenPair;
        mfaRequired?: boolean;
        mfaToken?: string;
    }> {
        // Check if user exists
        const { data: existingUser } = await this.supabase
            .from(TABLES.USERS)
            .select('*')
            .eq('email', email)
            .single<User>();

        let user: User;
        let isNewUser = false;

        if (existingUser) {
            user = existingUser;

            // Check if user is suspended
            if (user.status === 'suspended') {
                return {
                    success: false,
                    message: '账户已被停用 / Account suspended',
                };
            }

            // Mark email as verified
            await this.supabase
                .from(TABLES.USERS)
                .update({ email_verified: true })
                .eq('id', user.id);
            user.email_verified = true;
        } else {
            // Create new user
            const { data: newUser, error: createError } = await this.supabase
                .from(TABLES.USERS)
                .insert({
                    email,
                    email_verified: true,
                    status: 'active',
                })
                .select()
                .single<User>();

            if (createError || !newUser) {
                console.error('Failed to create user:', createError);
                return {
                    success: false,
                    message: MESSAGES.ERROR.INTERNAL_ERROR,
                };
            }

            user = newUser;
            isNewUser = true;
        }

        // Check if MFA is enabled for this user (skip for new users)
        if (!isNewUser) {
            const mfaEnabled = await mfaService.isMFAEnabled(user.id);
            if (mfaEnabled) {
                // Return MFA required instead of tokens
                await this.logAudit(user.id, 'login_email_mfa_required', ipAddress, deviceInfo?.user_agent);

                return {
                    success: true,
                    message: 'MFA verification required / 需要 MFA 验证',
                    user: this.toUserPublic(user),
                    mfaRequired: true,
                    mfaToken: await this.generateMFAToken(user.id),
                };
            }
        }

        // Generate tokens
        const tokens = await generateTokenPair(user);

        // Store refresh token
        await this.storeRefreshToken(user.id, tokens.refresh_token, deviceInfo, ipAddress);

        // Log audit event
        await this.logAudit(
            user.id,
            isNewUser ? 'register_email' : 'login_email',
            ipAddress,
            deviceInfo?.user_agent,
            { method: 'email_code', email }
        );

        return {
            success: true,
            message: isNewUser ? '注册成功 / Registration successful' : MESSAGES.SUCCESS.LOGIN_SUCCESS,
            user: this.toUserPublic(user),
            tokens,
        };
    }

    // ============================================
    // OAuth Authentication / OAuth 认证
    // ============================================

    /**
     * Handle OAuth callback
     * 处理 OAuth 回调
     */
    async handleOAuthCallback(
        provider: OAuthProvider,
        code: string,
        deviceInfo?: DeviceInfo,
        ipAddress?: string,
        redirectUri?: string
    ): Promise<{
        success: boolean;
        message: string;
        user?: UserPublic;
        tokens?: TokenPair;
        isNewUser?: boolean;
        mfaRequired?: boolean;
        mfaToken?: string;
    }> {
        // Exchange code for tokens
        const oauthTokens = await exchangeOAuthCode(provider, code, redirectUri);
        if (!oauthTokens) {
            return {
                success: false,
                message: 'OAuth 授权失败 / OAuth authorization failed',
            };
        }

        // Get user info from provider
        const oauthUserInfo = await getOAuthUserInfo(provider, oauthTokens.accessToken, undefined, oauthTokens.idToken);
        if (!oauthUserInfo) {
            return {
                success: false,
                message: '无法获取用户信息 / Failed to get user info',
            };
        }

        // Check if OAuth account exists
        const { data: existingOAuth } = await this.supabase
            .from(TABLES.OAUTH_ACCOUNTS)
            .select('*, users(*)')
            .eq('provider', provider)
            .eq('provider_user_id', oauthUserInfo.id)
            .single<OAuthAccount & { users: User }>();

        let user: User;
        let isNewUser = false;

        if (existingOAuth) {
            // Existing OAuth account, get user
            user = existingOAuth.users;

            // Check user status
            if (user.status === 'suspended') {
                return {
                    success: false,
                    message: MESSAGES.ERROR.USER_SUSPENDED,
                };
            }

            // Update user profile with OAuth data if fields are empty
            const updateFields: Record<string, unknown> = {};
            if (!user.nickname && oauthUserInfo.name) {
                updateFields.nickname = oauthUserInfo.name;
            }
            if (!user.avatar_url && oauthUserInfo.avatar) {
                updateFields.avatar_url = oauthUserInfo.avatar;
            }

            if (Object.keys(updateFields).length > 0) {
                const { data: updatedUser } = await this.supabase
                    .from(TABLES.USERS)
                    .update(updateFields)
                    .eq('id', user.id)
                    .select()
                    .single<User>();
                if (updatedUser) {
                    user = updatedUser;
                }
            }
        } else {
            // New OAuth account
            // Check if user exists with same email
            let existingUser: User | null = null;

            if (oauthUserInfo.email) {
                const { data } = await this.supabase
                    .from(TABLES.USERS)
                    .select('*')
                    .eq('email', oauthUserInfo.email)
                    .single<User>();
                existingUser = data;
            }

            if (existingUser) {
                // Link OAuth account to existing user
                user = existingUser;

                // Update user profile with OAuth data if fields are empty
                const updateFields: Record<string, unknown> = {};
                if (!user.nickname && oauthUserInfo.name) {
                    updateFields.nickname = oauthUserInfo.name;
                }
                if (!user.avatar_url && oauthUserInfo.avatar) {
                    updateFields.avatar_url = oauthUserInfo.avatar;
                }
                if (!user.email_verified && oauthUserInfo.email) {
                    updateFields.email_verified = true;
                }

                if (Object.keys(updateFields).length > 0) {
                    const { data: updatedUser } = await this.supabase
                        .from(TABLES.USERS)
                        .update(updateFields)
                        .eq('id', user.id)
                        .select()
                        .single<User>();
                    if (updatedUser) {
                        user = updatedUser;
                    }
                }
            } else {
                // Create new user
                const { data: newUser, error: createError } = await this.supabase
                    .from(TABLES.USERS)
                    .insert({
                        email: oauthUserInfo.email || null,
                        email_verified: !!oauthUserInfo.email, // Consider OAuth email as verified
                        nickname: oauthUserInfo.name || null,
                        avatar_url: oauthUserInfo.avatar || null,
                    })
                    .select()
                    .single<User>();

                if (createError || !newUser) {
                    console.error('Failed to create user:', createError);
                    return {
                        success: false,
                        message: MESSAGES.ERROR.INTERNAL_ERROR,
                    };
                }

                user = newUser;
                isNewUser = true;
            }

            // Create OAuth account record
            await this.supabase.from(TABLES.OAUTH_ACCOUNTS).insert({
                user_id: user.id,
                provider,
                provider_user_id: oauthUserInfo.id,
                provider_email: oauthUserInfo.email || null,
                provider_data: oauthUserInfo.raw || null,
            });
        }

        // Check if MFA is enabled for this user (skip for new users)
        if (!isNewUser) {
            const mfaEnabled = await mfaService.isMFAEnabled(user.id);
            if (mfaEnabled) {
                // Return MFA required instead of tokens
                await this.logAudit(user.id, `login_oauth_${provider}_mfa_required`, ipAddress, deviceInfo?.user_agent);

                return {
                    success: true,
                    message: 'MFA verification required / 需要 MFA 验证',
                    user: this.toUserPublic(user),
                    mfaRequired: true,
                    mfaToken: await this.generateMFAToken(user.id),
                    isNewUser: false,
                };
            }
        }

        // Generate tokens
        // Generate tokens
        const tokens = await generateTokenPair(user);

        // Store refresh token
        await this.storeRefreshToken(user.id, tokens.refresh_token, deviceInfo, ipAddress);

        // Log audit event
        await this.logAudit(user.id, `login_oauth_${provider}`, ipAddress, deviceInfo?.user_agent, {
            is_new_user: isNewUser,
        });

        return {
            success: true,
            message: MESSAGES.SUCCESS.LOGIN_SUCCESS,
            user: this.toUserPublic(user),
            tokens,
            isNewUser,
        };
    }

    // ============================================
    // Token Management / 令牌管理
    // ============================================

    /**
     * Refresh access token
     * 刷新访问令牌
     */
    async refreshToken(
        refreshToken: string,
        deviceInfo?: DeviceInfo,
        ipAddress?: string
    ): Promise<{
        success: boolean;
        message: string;
        tokens?: TokenPair;
    }> {
        const tokenHash = hashToken(refreshToken);

        // Find refresh token
        const { data: storedToken, error: findError } = await this.supabase
            .from(TABLES.REFRESH_TOKENS)
            .select('*, users(*)')
            .eq('token_hash', tokenHash)
            .eq('revoked', false)
            .gt('expires_at', new Date().toISOString())
            .single<RefreshToken & { users: User }>();

        if (findError || !storedToken) {
            return {
                success: false,
                message: MESSAGES.ERROR.INVALID_TOKEN,
            };
        }

        const user = storedToken.users;

        if (user.status === 'suspended') {
            return {
                success: false,
                message: MESSAGES.ERROR.USER_SUSPENDED,
            };
        }

        // Revoke old refresh token
        await this.supabase
            .from(TABLES.REFRESH_TOKENS)
            .update({ revoked: true })
            .eq('id', storedToken.id);

        // Generate new tokens
        // Generate new tokens
        const tokens = await generateTokenPair(user);

        // Store new refresh token
        await this.storeRefreshToken(user.id, tokens.refresh_token, deviceInfo, ipAddress);

        // Log audit event
        await this.logAudit(user.id, 'token_refresh', ipAddress, deviceInfo?.user_agent);

        return {
            success: true,
            message: MESSAGES.SUCCESS.TOKEN_REFRESHED,
            tokens,
        };
    }

    /**
     * Logout user (revoke refresh token)
     * 登出用户（撤销刷新令牌）
     */
    async logout(
        refreshToken: string,
        userId: string,
        ipAddress?: string,
        userAgent?: string
    ): Promise<{ success: boolean; message: string }> {
        const tokenHash = hashToken(refreshToken);

        // Revoke the refresh token
        await this.supabase
            .from(TABLES.REFRESH_TOKENS)
            .update({ revoked: true })
            .eq('token_hash', tokenHash)
            .eq('user_id', userId);

        // Log audit event
        await this.logAudit(userId, 'logout', ipAddress, userAgent);

        return {
            success: true,
            message: MESSAGES.SUCCESS.LOGOUT_SUCCESS,
        };
    }

    /**
     * Logout from all devices
     * 从所有设备登出
     */
    async logoutAll(
        userId: string,
        ipAddress?: string,
        userAgent?: string
    ): Promise<{ success: boolean; message: string }> {
        // Revoke all refresh tokens for user
        await this.supabase
            .from(TABLES.REFRESH_TOKENS)
            .update({ revoked: true })
            .eq('user_id', userId);

        // Log audit event
        await this.logAudit(userId, 'logout_all', ipAddress, userAgent);

        return {
            success: true,
            message: MESSAGES.SUCCESS.LOGOUT_SUCCESS,
        };
    }

    // ============================================
    // Helper Methods / 辅助方法
    // ============================================

    /**
     * Find or create user by phone
     * 根据手机号查找或创建用户
     */
    private async findOrCreateUserByPhone(
        phone: string,
        deviceInfo?: DeviceInfo,
        ipAddress?: string
    ): Promise<{
        success: boolean;
        message: string;
        user?: UserPublic;
        tokens?: TokenPair;
        isNewUser?: boolean;
        mfaRequired?: boolean;
        mfaToken?: string;
    }> {
        let { data: user } = await this.supabase
            .from(TABLES.USERS)
            .select('*')
            .eq('phone', phone)
            .single<User>();

        let isNewUser = false;

        if (!user) {
            // Create new user
            const { data: newUser, error: createError } = await this.supabase
                .from(TABLES.USERS)
                .insert({
                    phone,
                    phone_verified: true,
                })
                .select()
                .single<User>();

            if (createError || !newUser) {
                console.error('Failed to create user:', createError);
                return {
                    success: false,
                    message: MESSAGES.ERROR.INTERNAL_ERROR,
                };
            }

            user = newUser;
            isNewUser = true;
        } else {
            // Check user status
            if (user.status === 'suspended') {
                return {
                    success: false,
                    message: MESSAGES.ERROR.USER_SUSPENDED,
                };
            }

            // Update phone_verified if not already
            if (!user.phone_verified) {
                await this.supabase
                    .from(TABLES.USERS)
                    .update({ phone_verified: true })
                    .eq('id', user.id);
            }
        }

        // Check if MFA is enabled for this user (skip for new users)
        if (!isNewUser) {
            const mfaEnabled = await mfaService.isMFAEnabled(user.id);
            if (mfaEnabled) {
                // Return MFA required instead of tokens
                // Log audit event
                await this.logAudit(user.id, 'login_phone_mfa_required', ipAddress, deviceInfo?.user_agent);


                return {
                    success: true,
                    message: 'MFA verification required / 需要 MFA 验证',
                    user: this.toUserPublic(user),
                    mfaRequired: true,
                    mfaToken: await this.generateMFAToken(user.id),
                };
            }
        }

        // Generate tokens
        // Generate tokens
        const tokens = await generateTokenPair(user);

        // Store refresh token
        await this.storeRefreshToken(user.id, tokens.refresh_token, deviceInfo, ipAddress);

        // Log audit event
        await this.logAudit(user.id, 'login_phone', ipAddress, deviceInfo?.user_agent, {
            is_new_user: isNewUser,
        });

        return {
            success: true,
            message: MESSAGES.SUCCESS.LOGIN_SUCCESS,
            user: this.toUserPublic(user),
            tokens,
            isNewUser,
        };
    }

    /**
     * Store refresh token
     * 存储刷新令牌
     */
    public async storeRefreshToken(
        userId: string,
        refreshToken: string,
        deviceInfo?: DeviceInfo,
        ipAddress?: string
    ): Promise<void> {
        const refreshTokenExpiry = new Date(
            Date.now() + parseDuration(env.JWT_REFRESH_TOKEN_EXPIRES_IN) * 1000
        );

        await this.supabase.from(TABLES.REFRESH_TOKENS).insert({
            user_id: userId,
            token_hash: hashToken(refreshToken),
            device_info: deviceInfo || null,
            ip_address: ipAddress || null,
            expires_at: refreshTokenExpiry.toISOString(),
        });
    }

    /**
     * Convert User to UserPublic
     * 将 User 转换为 UserPublic
     */
    private toUserPublic(user: User): UserPublic {
        return {
            id: user.id,
            phone: user.phone,
            email: user.email,
            nickname: user.nickname,
            avatar_url: user.avatar_url,
        };
    }

    /**
     * Log audit event
     * 记录审计事件
     */
    private async logAudit(
        userId: string | null,
        action: string,
        ipAddress?: string,
        userAgent?: string,
        metadata?: Record<string, unknown>
    ): Promise<void> {
        try {
            await this.supabase.from(TABLES.AUDIT_LOGS).insert({
                user_id: userId,
                action,
                ip_address: ipAddress || null,
                user_agent: userAgent || null,
                metadata: metadata || null,
            });
        } catch (error) {
            console.error('Failed to log audit event:', error);
        }
    }

    /**
     * Generate a short-lived MFA token for the MFA verification step
     * 生成用于 MFA 验证步骤的短期令牌
     */
    private async generateMFAToken(userId: string): Promise<string> {
        const { SignJWT } = await import('jose');
        const secret = new TextEncoder().encode(env.JWT_SECRET);

        // MFA token is valid for 5 minutes
        const mfaToken = await new SignJWT({ sub: userId, type: 'mfa' })
            .setProtectedHeader({ alg: 'HS256' })
            .setIssuedAt()
            .setExpirationTime('5m')
            .sign(secret);

        return mfaToken;
    }

    /**
     * Verify MFA token and extract user ID
     * 验证 MFA 令牌并提取用户 ID
     */
    public async verifyMFAToken(mfaToken: string): Promise<{ userId: string } | null> {
        try {
            const { jwtVerify } = await import('jose');
            const secret = new TextEncoder().encode(env.JWT_SECRET);

            const { payload } = await jwtVerify(mfaToken, secret);

            if (payload.type !== 'mfa' || !payload.sub) {
                return null;
            }

            return { userId: payload.sub };
        } catch {
            return null;
        }
    }

    /**
     * Complete MFA verification and issue full tokens
     * 完成 MFA 验证并颁发完整令牌
     */
    public async completeMFALogin(
        mfaToken: string,
        mfaCode: string,
        deviceInfo?: DeviceInfo,
        ipAddress?: string
    ): Promise<{
        success: boolean;
        message: string;
        user?: UserPublic;
        tokens?: TokenPair;
    }> {
        // Verify MFA token
        const mfaResult = await this.verifyMFAToken(mfaToken);
        if (!mfaResult) {
            return {
                success: false,
                message: 'Invalid or expired MFA token / MFA 令牌无效或已过期',
            };
        }

        const userId = mfaResult.userId;

        // Verify the MFA code
        const verifyResult = await mfaService.verifyMFACode(userId, mfaCode);
        if (!verifyResult.success) {
            // Also try recovery code
            const recoveryResult = await mfaService.verifyRecoveryCode(userId, mfaCode);
            if (!recoveryResult.success) {
                return {
                    success: false,
                    message: verifyResult.message || 'Invalid MFA code / MFA 验证码错误',
                };
            }
        }

        // Get user
        const { data: user } = await this.supabase
            .from(TABLES.USERS)
            .select('*')
            .eq('id', userId)
            .single<User>();

        if (!user) {
            return {
                success: false,
                message: 'User not found / 用户不存在',
            };
        }

        // Generate tokens
        const tokens = await generateTokenPair(user);

        // Store refresh token
        await this.storeRefreshToken(user.id, tokens.refresh_token, deviceInfo, ipAddress);

        // Log audit event
        await this.logAudit(user.id, 'login_mfa_verified', ipAddress, deviceInfo?.user_agent);

        return {
            success: true,
            message: MESSAGES.SUCCESS.LOGIN_SUCCESS,
            user: this.toUserPublic(user),
            tokens,
        };
    }
}

// Add OAUTH_ACCOUNTS to TABLES
const OAUTH_ACCOUNTS = 'oauth_accounts';
Object.assign(TABLES, { OAUTH_ACCOUNTS });

// Export singleton instance
export const authService = new AuthService();
