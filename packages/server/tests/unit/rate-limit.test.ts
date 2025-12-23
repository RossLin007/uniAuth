import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock Redis before importing
vi.mock('../../src/lib/redis.js', () => ({
    incrementCounter: vi.fn().mockResolvedValue(1),
    isLocked: vi.fn().mockResolvedValue(false),
    setLock: vi.fn().mockResolvedValue(undefined),
    getTTL: vi.fn().mockResolvedValue(60),
    cacheDelete: vi.fn().mockResolvedValue(undefined),
}));

import {
    checkVerificationLock,
    recordFailedVerification,
    clearVerificationAttempts,
} from '../../src/middlewares/rate-limit.middleware.js';
import { incrementCounter, isLocked, setLock, cacheDelete } from '../../src/lib/redis.js';

describe('Rate Limiting', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('checkVerificationLock', () => {
        it('should return not locked when key does not exist', async () => {
            vi.mocked(isLocked).mockResolvedValue(false);

            const result = await checkVerificationLock('test@example.com');

            expect(result.locked).toBe(false);
            expect(result.retryAfter).toBeUndefined();
        });

        it('should return locked with retry time when locked', async () => {
            vi.mocked(isLocked).mockResolvedValue(true);

            const result = await checkVerificationLock('test@example.com');

            expect(result.locked).toBe(true);
            expect(result.retryAfter).toBe(60);
        });
    });

    describe('recordFailedVerification', () => {
        it('should increment attempt counter', async () => {
            vi.mocked(incrementCounter).mockResolvedValue(1);

            const result = await recordFailedVerification('test@example.com');

            expect(result.attempts).toBe(1);
            expect(result.locked).toBe(false);
            expect(incrementCounter).toHaveBeenCalled();
        });

        it('should lock after max attempts', async () => {
            vi.mocked(incrementCounter).mockResolvedValue(5);

            const result = await recordFailedVerification('test@example.com');

            expect(result.attempts).toBe(5);
            expect(result.locked).toBe(true);
            expect(result.retryAfter).toBe(900); // 15 minutes
            expect(setLock).toHaveBeenCalled();
        });

        it('should not lock before max attempts', async () => {
            vi.mocked(incrementCounter).mockResolvedValue(4);

            const result = await recordFailedVerification('test@example.com');

            expect(result.locked).toBe(false);
            expect(setLock).not.toHaveBeenCalled();
        });
    });

    describe('clearVerificationAttempts', () => {
        it('should clear both attempt and lock keys', async () => {
            await clearVerificationAttempts('test@example.com');

            expect(cacheDelete).toHaveBeenCalledTimes(2);
        });
    });
});
