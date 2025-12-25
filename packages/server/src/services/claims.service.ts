/**
 * Custom Claims Service
 * Manages custom claim configurations and evaluation for OIDC ID tokens
 */

import { getSupabase, TABLES } from '../lib/supabase.js';
import { logger } from '../lib/logger.js';
import { createHash } from 'crypto';

export interface CustomClaim {
    id: string;
    application_id: string;
    claim_name: string;
    claim_source: 'user_attribute' | 'static' | 'computed';
    source_field?: string;
    static_value?: string;
    computed_expression?: string;
    transform_function: 'none' | 'uppercase' | 'lowercase' | 'hash_sha256' | 'base64_encode' | 'json_stringify';
    required_scope?: string;
    enabled: boolean;
    description?: string;
}

interface User {
    id: string;
    email?: string | null;
    phone?: string | null;
    nickname?: string | null;
    avatar_url?: string | null;
    email_verified?: boolean;
    phone_verified?: boolean;
    created_at?: string;
    updated_at?: string;
    [key: string]: unknown;
}

class ClaimsService {
    /**
     * Get all custom claims for an application
     */
    async getClaimsForApp(applicationId: string): Promise<CustomClaim[]> {
        const supabase = getSupabase();

        const { data, error } = await supabase
            .from('custom_claims')
            .select('*')
            .eq('application_id', applicationId)
            .eq('enabled', true);

        if (error) {
            logger.error('Failed to fetch custom claims', { applicationId, error });
            return [];
        }

        return data || [];
    }

    /**
     * Evaluate custom claims for a user and application
     * Returns a Record of claim_name -> value
     */
    async evaluateClaims(
        user: User,
        applicationId: string,
        requestedScopes: string[] = []
    ): Promise<Record<string, unknown>> {
        const claims = await this.getClaimsForApp(applicationId);
        const result: Record<string, unknown> = {};

        for (const claim of claims) {
            // Check scope requirement
            if (claim.required_scope && !requestedScopes.includes(claim.required_scope)) {
                continue;
            }

            try {
                const value = await this.evaluateSingleClaim(claim, user);
                if (value !== undefined && value !== null) {
                    result[claim.claim_name] = value;
                }
            } catch (error) {
                logger.warn('Failed to evaluate claim', {
                    claimName: claim.claim_name,
                    error
                });
            }
        }

        return result;
    }

    /**
     * Evaluate a single claim
     */
    private async evaluateSingleClaim(claim: CustomClaim, user: User): Promise<unknown> {
        let value: unknown;

        switch (claim.claim_source) {
            case 'user_attribute':
                value = this.getUserAttribute(user, claim.source_field || '');
                break;

            case 'static':
                value = claim.static_value;
                break;

            case 'computed':
                value = await this.evaluateComputed(claim.computed_expression || '', user);
                break;

            default:
                return undefined;
        }

        // Apply transform function
        return this.applyTransform(value, claim.transform_function);
    }

    /**
     * Get user attribute by field name
     */
    private getUserAttribute(user: User, field: string): unknown {
        // Map common OIDC claim names to user fields
        const fieldMapping: Record<string, string> = {
            'email': 'email',
            'phone': 'phone',
            'phone_number': 'phone',
            'name': 'nickname',
            'nickname': 'nickname',
            'picture': 'avatar_url',
            'avatar': 'avatar_url',
            'sub': 'id',
            'user_id': 'id',
        };

        const mappedField = fieldMapping[field] || field;
        return user[mappedField];
    }

    /**
     * Evaluate computed expression (simple for now)
     */
    private async evaluateComputed(expression: string, user: User): Promise<unknown> {
        // Simple expression evaluator
        // Supports: ${field}, "literal", number

        if (expression.startsWith('${') && expression.endsWith('}')) {
            const field = expression.slice(2, -1);
            return this.getUserAttribute(user, field);
        }

        // JSON parse for literals
        try {
            return JSON.parse(expression);
        } catch {
            return expression;
        }
    }

    /**
     * Apply transform function to value
     */
    private applyTransform(value: unknown, transform: string): unknown {
        if (value === undefined || value === null) {
            return value;
        }

        const strValue = String(value);

        switch (transform) {
            case 'uppercase':
                return strValue.toUpperCase();

            case 'lowercase':
                return strValue.toLowerCase();

            case 'hash_sha256':
                return createHash('sha256').update(strValue).digest('hex');

            case 'base64_encode':
                return Buffer.from(strValue).toString('base64');

            case 'json_stringify':
                return JSON.stringify(value);

            case 'none':
            default:
                return value;
        }
    }

    // ========== CRUD Operations for Developer Console ==========

    /**
     * Create a new custom claim
     */
    async createClaim(
        applicationId: string,
        claimConfig: Omit<CustomClaim, 'id' | 'application_id'>
    ): Promise<CustomClaim | null> {
        const supabase = getSupabase();

        const { data, error } = await supabase
            .from('custom_claims')
            .insert({
                application_id: applicationId,
                ...claimConfig,
            })
            .select()
            .single();

        if (error) {
            logger.error('Failed to create custom claim', { applicationId, error });
            return null;
        }

        logger.info('Custom claim created', { applicationId, claimName: claimConfig.claim_name });
        return data;
    }

    /**
     * Update a custom claim
     */
    async updateClaim(
        claimId: string,
        applicationId: string,
        updates: Partial<CustomClaim>
    ): Promise<CustomClaim | null> {
        const supabase = getSupabase();

        const { data, error } = await supabase
            .from('custom_claims')
            .update(updates)
            .eq('id', claimId)
            .eq('application_id', applicationId)
            .select()
            .single();

        if (error) {
            logger.error('Failed to update custom claim', { claimId, error });
            return null;
        }

        logger.info('Custom claim updated', { claimId });
        return data;
    }

    /**
     * Delete a custom claim
     */
    async deleteClaim(claimId: string, applicationId: string): Promise<boolean> {
        const supabase = getSupabase();

        const { error } = await supabase
            .from('custom_claims')
            .delete()
            .eq('id', claimId)
            .eq('application_id', applicationId);

        if (error) {
            logger.error('Failed to delete custom claim', { claimId, error });
            return false;
        }

        logger.info('Custom claim deleted', { claimId });
        return true;
    }

    /**
     * List all claims for an application (including disabled)
     */
    async listClaims(applicationId: string): Promise<CustomClaim[]> {
        const supabase = getSupabase();

        const { data, error } = await supabase
            .from('custom_claims')
            .select('*')
            .eq('application_id', applicationId)
            .order('claim_name');

        if (error) {
            logger.error('Failed to list custom claims', { applicationId, error });
            return [];
        }

        return data || [];
    }
}

export const claimsService = new ClaimsService();
