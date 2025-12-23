import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createLogger, type Logger } from '../../src/lib/logger.js';

describe('Logger', () => {
    let consoleSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => { });
    });

    afterEach(() => {
        consoleSpy.mockRestore();
    });

    describe('createLogger', () => {
        it('should create a logger instance', () => {
            const logger = createLogger();

            expect(logger).toBeDefined();
            expect(typeof logger.debug).toBe('function');
            expect(typeof logger.info).toBe('function');
            expect(typeof logger.warn).toBe('function');
            expect(typeof logger.error).toBe('function');
            expect(typeof logger.child).toBe('function');
        });

        it('should log info messages', () => {
            const logger = createLogger();

            logger.info('Test message');

            expect(consoleSpy).toHaveBeenCalled();
        });

        it('should log with additional data', () => {
            const logger = createLogger();

            logger.info('Test message', { userId: '123', action: 'test' });

            expect(consoleSpy).toHaveBeenCalled();
        });

        it('should create child logger with context', () => {
            const logger = createLogger({ module: 'test' });
            const childLogger = logger.child({ requestId: 'abc123' });

            childLogger.info('Child message');

            expect(consoleSpy).toHaveBeenCalled();
            const logCall = consoleSpy.mock.calls[0][0];
            expect(logCall).toContain('abc123');
        });

        it('should log different levels', () => {
            const logger = createLogger();

            logger.debug('Debug message');
            logger.info('Info message');
            logger.warn('Warn message');
            logger.error('Error message');

            // At least info, warn, error should be logged (debug depends on level)
            expect(consoleSpy.mock.calls.length).toBeGreaterThanOrEqual(3);
        });
    });
});
