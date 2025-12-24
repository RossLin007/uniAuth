import { getSupabase, TABLES } from '../lib/supabase.js';
import { logger } from '../lib/logger.js';
import crypto from 'crypto';
import axios from 'axios';

export interface WebhookConfig {
    id: string;
    app_id: string;
    url: string;
    secret: string | null;
    events: string[];
    is_active: boolean;
}

export interface WebhookDelivery {
    id: string;
    webhook_id: string;
    event: string;
    payload: any;
    status: 'pending' | 'success' | 'failed' | 'retrying';
    response_status?: number;
    response_body?: string;
    attempt_count: number;
    next_retry_at?: string;
}

export class WebhookService {
    private static instance: WebhookService;
    private isWorkerRunning: boolean = false;

    private constructor() { }

    public static getInstance(): WebhookService {
        if (!WebhookService.instance) {
            WebhookService.instance = new WebhookService();
        }
        return WebhookService.instance;
    }

    /**
     * Trigger an event for a specific application
     */
    async triggerEvent(appId: string, event: string, payload: any) {
        const supabase = getSupabase();

        // 1. Find active webhooks for this app subscribed to this event
        const { data: webhooks, error } = await supabase
            .from('webhooks')
            .select('*')
            .eq('app_id', appId)
            .eq('is_active', true)
            .contains('events', [event]);

        if (error) {
            logger.error('Failed to fetch webhooks', { appId, event, error });
            return;
        }

        if (!webhooks || webhooks.length === 0) {
            return;
        }

        logger.info(`Dispatching event ${event} to ${webhooks.length} webhooks`, { appId });

        // 2. Create delivery records
        const deliveries = webhooks.map(wh => ({
            webhook_id: wh.id,
            event: event,
            payload: payload,
            status: 'pending',
            attempt_count: 0,
            next_retry_at: new Date().toISOString() // Immediate
        }));

        const { error: insertError } = await supabase
            .from('webhook_deliveries')
            .insert(deliveries);

        if (insertError) {
            logger.error('Failed to insert webhook deliveries', { error: insertError });
        }
    }

    /**
     * Generate HMAC Signature
     * SHA256(payload, secret)
     */
    generateSignature(payload: any, secret: string): string {
        const hmac = crypto.createHmac('sha256', secret);
        const digest = hmac.update(JSON.stringify(payload)).digest('hex');
        return `sha256=${digest}`;
    }

    /**
     * Process pending deliveries (Worker Loop)
     */
    async processQueue() {
        if (this.isWorkerRunning) return;
        this.isWorkerRunning = true;

        try {
            await this.processBatch();
        } catch (err) {
            logger.error('Webhook worker error', { err });
        } finally {
            this.isWorkerRunning = false;
        }
    }

    private async processBatch() {
        const supabase = getSupabase();

        // Fetch items due for retry or pending
        const { data: deliveries, error } = await supabase
            .from('webhook_deliveries')
            .select(`
                *,
                webhook:webhooks (
                    url,
                    secret
                )
            `)
            .in('status', ['pending', 'retrying'])
            .lte('next_retry_at', new Date().toISOString())
            .limit(10); // Process 10 at a time

        if (error || !deliveries || deliveries.length === 0) {
            return;
        }

        for (const delivery of deliveries) {
            await this.deliver(delivery);
        }

        // If we processed a full batch, check immediately again
        if (deliveries.length === 10) {
            await this.processBatch();
        }
    }

    private async deliver(delivery: any) {
        const supabase = getSupabase();
        const { id, payload, event, attempt_count, webhook } = delivery;

        if (!webhook) {
            // Webhook deleted? result as failed
            await supabase.from('webhook_deliveries').update({ status: 'failed', response_body: 'Webhook deleted' }).eq('id', id);
            return;
        }

        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            'User-Agent': 'UniAuth-Webhook/1.0',
            'X-UniAuth-Event': event,
            'X-UniAuth-Delivery': id,
        };

        if (webhook.secret) {
            headers['X-UniAuth-Signature'] = this.generateSignature(payload, webhook.secret);
        }

        try {
            const response = await axios.post(webhook.url, payload, {
                headers,
                timeout: 5000 // 5s timeout
            });

            await supabase
                .from('webhook_deliveries')
                .update({
                    status: 'success',
                    response_status: response.status,
                    response_body: JSON.stringify(response.data)?.substring(0, 1000), // persist limited body
                    updated_at: new Date().toISOString()
                })
                .eq('id', id);

        } catch (err: any) {
            const nextAttempt = attempt_count + 1;
            const maxAttempts = 5;
            let status = 'retrying';
            let nextRetry = new Date(Date.now() + Math.pow(2, nextAttempt) * 1000 * 60); // Exponential backoff: 1m, 2m, 4m, 8m..

            if (nextAttempt >= maxAttempts) {
                status = 'failed';
                nextRetry = undefined as any;
            }

            const responseStatus = err.response?.status || 0;
            const responseBody = err.response?.data ? JSON.stringify(err.response.data) : err.message;

            await supabase
                .from('webhook_deliveries')
                .update({
                    status,
                    attempt_count: nextAttempt,
                    next_retry_at: nextRetry ? nextRetry.toISOString() : null,
                    response_status: responseStatus,
                    response_body: String(responseBody).substring(0, 1000),
                    updated_at: new Date().toISOString()
                })
                .eq('id', id);
        }
    }

    /**
     * Start the background worker
     */
    startWorker(intervalMs: number = 10000) {
        setInterval(() => {
            this.processQueue();
        }, intervalMs);
        logger.info('Webhook worker started');
    }
}

export const webhookService = WebhookService.getInstance();
