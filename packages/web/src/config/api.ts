/**
 * API Configuration
 * 根据环境自动配置 API 地址
 * 
 * - Production: 使用 VITE_API_URL 环境变量
 * - Development: 使用相对路径 (由 vite 代理到本地服务器)
 */

export const API_BASE_URL = import.meta.env.VITE_API_URL || '';

/**
 * Get full API URL for a given endpoint
 * @param endpoint - API endpoint path (e.g., '/api/v1/auth/email/send-code')
 * @returns Full URL
 */
export function getApiUrl(endpoint: string): string {
    return `${API_BASE_URL}${endpoint}`;
}
