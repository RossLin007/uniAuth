/**
 * API Configuration for Developer Console
 * 开发者控制台 API 配置
 * 
 * - Production: 使用 VITE_API_URL 环境变量
 * - Development: 使用本地服务器地址
 */

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

/**
 * Get full API URL for a given endpoint
 * @param endpoint - API endpoint path (e.g., '/api/v1/developer/apps')
 * @returns Full URL
 */
export function getApiUrl(endpoint: string): string {
    return `${API_BASE_URL}${endpoint}`;
}
