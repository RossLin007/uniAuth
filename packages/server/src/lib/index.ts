export { getSupabase, TABLES } from './supabase.js';
export { sendVerificationSms, generateVerificationCode } from './sms.js';
export {
    generateAccessToken,
    generateRefreshToken,
    generateTokenPair,
    hashToken,
    verifyAccessToken,
    parseDuration,
} from './jwt.js';
export { hashPassword, verifyPassword, validatePasswordStrength } from './password.js';
export {
    getOAuthAuthUrl,
    exchangeOAuthCode,
    getOAuthUserInfo,
    isOAuthProviderConfigured,
    getConfiguredOAuthProviders,
} from './oauth.js';

// New exports for Phase 1 improvements
export {
    hashClientSecret,
    verifyClientSecret,
    generateSecureToken,
    generateCodeVerifier,
    generateCodeChallenge,
    verifyCodeChallenge,
} from './crypto.js';

export {
    getRedis,
    isRedisAvailable,
    cacheGet,
    cacheSet,
    cacheDelete,
    incrementCounter,
    isLocked,
    setLock,
    getTTL,
    storeVerificationCode,
    getVerificationCode,
    incrementVerificationAttempts,
    deleteVerificationCode,
} from './redis.js';

export {
    logger,
    createLogger,
    authLogger,
    oauth2Logger,
    userLogger,
} from './logger.js';

