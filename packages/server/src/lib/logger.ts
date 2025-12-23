/**
 * Structured Logging Module
 * 结构化日志模块
 * 
 * Provides JSON-formatted logging for production environments
 * 为生产环境提供 JSON 格式的日志输出
 */

import { env } from '../config/env.js';

// Log levels
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVELS: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
};

// Get current log level from environment
const currentLevel = (env.LOG_LEVEL?.toLowerCase() as LogLevel) || 'info';
const currentLevelNum = LOG_LEVELS[currentLevel] ?? LOG_LEVELS.info;

/**
 * Base log entry structure
 */
interface LogEntry {
    timestamp: string;
    level: LogLevel;
    service: string;
    version: string;
    env: string;
    message: string;
    [key: string]: unknown;
}

/**
 * Format log entry for output
 * 格式化日志条目
 */
function formatLogEntry(level: LogLevel, message: string, data?: Record<string, unknown>): LogEntry {
    return {
        timestamp: new Date().toISOString(),
        level,
        service: 'uniauth-api',
        version: process.env.npm_package_version || '1.0.0',
        env: env.NODE_ENV,
        message,
        ...data,
    };
}

/**
 * Output log entry
 * 输出日志条目
 */
function output(level: LogLevel, entry: LogEntry): void {
    const levelNum = LOG_LEVELS[level];
    if (levelNum < currentLevelNum) return;

    // In development, use pretty format; in production, use JSON
    if (env.NODE_ENV === 'development') {
        const timestamp = entry.timestamp.split('T')[1].split('.')[0];
        const levelColor = {
            debug: '\x1b[34m', // blue
            info: '\x1b[32m',  // green
            warn: '\x1b[33m',  // yellow
            error: '\x1b[31m', // red
        }[level];
        const reset = '\x1b[0m';

        const { timestamp: _, level: __, service: ___, version: ____, env: _____, message, ...rest } = entry;
        const dataStr = Object.keys(rest).length > 0 ? ` ${JSON.stringify(rest)}` : '';

        console.log(`${timestamp} ${levelColor}${level.toUpperCase().padEnd(5)}${reset} ${message}${dataStr}`);
    } else {
        // Production: JSON format
        console.log(JSON.stringify(entry));
    }
}

/**
 * Logger interface
 */
export interface Logger {
    debug(message: string, data?: Record<string, unknown>): void;
    info(message: string, data?: Record<string, unknown>): void;
    warn(message: string, data?: Record<string, unknown>): void;
    error(message: string, data?: Record<string, unknown>): void;
    child(context: Record<string, unknown>): Logger;
}

/**
 * Create a logger instance
 * 创建日志实例
 * 
 * @param context - Additional context to include in all log entries
 */
export function createLogger(context: Record<string, unknown> = {}): Logger {
    return {
        debug(message: string, data?: Record<string, unknown>) {
            output('debug', formatLogEntry('debug', message, { ...context, ...data }));
        },
        info(message: string, data?: Record<string, unknown>) {
            output('info', formatLogEntry('info', message, { ...context, ...data }));
        },
        warn(message: string, data?: Record<string, unknown>) {
            output('warn', formatLogEntry('warn', message, { ...context, ...data }));
        },
        error(message: string, data?: Record<string, unknown>) {
            output('error', formatLogEntry('error', message, { ...context, ...data }));
        },
        child(additionalContext: Record<string, unknown>) {
            return createLogger({ ...context, ...additionalContext });
        },
    };
}

// Default logger instance
export const logger = createLogger();

// Module-specific loggers
export const authLogger = createLogger({ module: 'auth' });
export const oauth2Logger = createLogger({ module: 'oauth2' });
export const userLogger = createLogger({ module: 'user' });
