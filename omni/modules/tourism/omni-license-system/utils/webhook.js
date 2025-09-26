/**
 * Webhook System za Omni License System
 * Pošiljanje obvestil o licenčnih dogodkih
 */

const crypto = require('crypto');
const axios = require('axios');
const AuditLogger = require('./audit');

class WebhookManager {
    constructor() {
        this.auditLogger = new AuditLogger();
        this.webhookSecret = process.env.WEBHOOK_SECRET || 'omni-webhook-secret-2024';
        this.maxRetries = 3;
        this.retryDelay = 1000; // 1 sekunda
    }

    /**
     * Registracija webhook endpointa
     */
    async registerWebhook(clientId, webhookUrl, events = []) {
        const webhook = {
            client_id: clientId,
            url: webhookUrl,
            events: events.length > 0 ? events : ['all'],
            created_at: new Date().toISOString(),
            active: true,
            secret: this.generateWebhookSecret(clientId)
        };

        // V produkciji bi to shranili v bazo podatkov
        console.log('Webhook registriran:', webhook);
        
        await this.auditLogger.logLicenseActivity('WEBHOOK_REGISTERED', {
            client_id: clientId,
            webhook_url: webhookUrl,
            events: events
        });

        return webhook;
    }

    /**
     * Pošiljanje webhook obvestila
     */
    async sendWebhook(event, data, clientId = null) {
        try {
            // Pridobi registrirane webhook-e za ta dogodek
            const webhooks = await this.getWebhooksForEvent(event, clientId);
            
            const promises = webhooks.map(webhook => 
                this.deliverWebhook(webhook, event, data)
            );

            const results = await Promise.allSettled(promises);
            
            // Beleženje rezultatov
            results.forEach((result, index) => {
                if (result.status === 'rejected') {
                    console.error(`Webhook delivery failed for ${webhooks[index].url}:`, result.reason);
                }
            });

            return results;
        } catch (error) {
            console.error('Napaka pri pošiljanju webhook-ov:', error);
            throw error;
        }
    }

    /**
     * Dostava webhook-a z retry logiko
     */
    async deliverWebhook(webhook, event, data, attempt = 1) {
        try {
            const payload = {
                event: event,
                timestamp: new Date().toISOString(),
                data: data,
                client_id: webhook.client_id
            };

            const signature = this.generateSignature(payload, webhook.secret);
            
            const response = await axios.post(webhook.url, payload, {
                headers: {
                    'Content-Type': 'application/json',
                    'X-Omni-Signature': signature,
                    'X-Omni-Event': event,
                    'X-Omni-Timestamp': payload.timestamp,
                    'User-Agent': 'Omni-License-System/1.0'
                },
                timeout: 10000 // 10 sekund timeout
            });

            await this.auditLogger.logLicenseActivity('WEBHOOK_DELIVERED', {
                client_id: webhook.client_id,
                webhook_url: webhook.url,
                event: event,
                response_code: response.status,
                attempt: attempt
            });

            return {
                success: true,
                status: response.status,
                webhook_url: webhook.url
            };

        } catch (error) {
            console.error(`Webhook delivery attempt ${attempt} failed:`, error.message);

            await this.auditLogger.logSecurityEvent('WEBHOOK_DELIVERY_FAILED', {
                client_id: webhook.client_id,
                webhook_url: webhook.url,
                event: event,
                attempt: attempt,
                error: error.message,
                severity: attempt >= this.maxRetries ? 'high' : 'medium'
            });

            // Retry logika
            if (attempt < this.maxRetries) {
                await this.delay(this.retryDelay * attempt);
                return this.deliverWebhook(webhook, event, data, attempt + 1);
            }

            throw error;
        }
    }

    /**
     * Webhook eventi za različne licenčne aktivnosti
     */
    async notifyLicenseValidation(clientId, licenseKey, result, details = {}) {
        const eventData = {
            client_id: clientId,
            license_key: this.maskLicenseKey(licenseKey),
            validation_result: result,
            timestamp: new Date().toISOString(),
            details: details
        };

        await this.sendWebhook('license.validation', eventData, clientId);
    }

    async notifyLicenseExpiry(clientId, licenseKey, expiryDate) {
        const eventData = {
            client_id: clientId,
            license_key: this.maskLicenseKey(licenseKey),
            expiry_date: expiryDate,
            days_until_expiry: this.calculateDaysUntilExpiry(expiryDate),
            timestamp: new Date().toISOString()
        };

        await this.sendWebhook('license.expiry_warning', eventData, clientId);
    }

    async notifyLicenseRenewal(clientId, oldLicenseKey, newLicenseKey, newExpiryDate) {
        const eventData = {
            client_id: clientId,
            old_license_key: this.maskLicenseKey(oldLicenseKey),
            new_license_key: this.maskLicenseKey(newLicenseKey),
            new_expiry_date: newExpiryDate,
            timestamp: new Date().toISOString()
        };

        await this.sendWebhook('license.renewed', eventData, clientId);
    }

    async notifySecurityAlert(clientId, alertType, details) {
        const eventData = {
            client_id: clientId,
            alert_type: alertType,
            severity: details.severity || 'medium',
            details: details,
            timestamp: new Date().toISOString()
        };

        await this.sendWebhook('security.alert', eventData, clientId);
    }

    /**
     * Preverjanje webhook podpisa
     */
    verifyWebhookSignature(payload, signature, secret) {
        const expectedSignature = this.generateSignature(payload, secret);
        return crypto.timingSafeEqual(
            Buffer.from(signature, 'hex'),
            Buffer.from(expectedSignature, 'hex')
        );
    }

    /**
     * Testiranje webhook endpointa
     */
    async testWebhook(webhookUrl, clientId) {
        const testPayload = {
            event: 'webhook.test',
            timestamp: new Date().toISOString(),
            data: {
                message: 'This is a test webhook from Omni License System',
                client_id: clientId
            },
            client_id: clientId
        };

        try {
            const response = await axios.post(webhookUrl, testPayload, {
                headers: {
                    'Content-Type': 'application/json',
                    'X-Omni-Event': 'webhook.test',
                    'X-Omni-Timestamp': testPayload.timestamp,
                    'User-Agent': 'Omni-License-System/1.0'
                },
                timeout: 10000
            });

            await this.auditLogger.logLicenseActivity('WEBHOOK_TEST', {
                client_id: clientId,
                webhook_url: webhookUrl,
                response_code: response.status,
                result: 'success'
            });

            return {
                success: true,
                status: response.status,
                message: 'Webhook test successful'
            };

        } catch (error) {
            await this.auditLogger.logLicenseActivity('WEBHOOK_TEST', {
                client_id: clientId,
                webhook_url: webhookUrl,
                error: error.message,
                result: 'failed'
            });

            return {
                success: false,
                error: error.message,
                message: 'Webhook test failed'
            };
        }
    }

    /**
     * Pridobivanje webhook statistik
     */
    async getWebhookStats(clientId, startDate, endDate) {
        const auditLogs = await this.auditLogger.getAuditLogs({
            client_id: clientId,
            start_date: new Date(startDate),
            end_date: new Date(endDate)
        });

        const webhookLogs = auditLogs.filter(log => 
            log.activity && log.activity.startsWith('WEBHOOK_')
        );

        const stats = {
            total_webhooks: webhookLogs.length,
            successful_deliveries: webhookLogs.filter(log => 
                log.activity === 'WEBHOOK_DELIVERED'
            ).length,
            failed_deliveries: webhookLogs.filter(log => 
                log.activity === 'WEBHOOK_DELIVERY_FAILED'
            ).length,
            test_webhooks: webhookLogs.filter(log => 
                log.activity === 'WEBHOOK_TEST'
            ).length,
            events_by_type: this.groupWebhooksByEvent(webhookLogs),
            average_response_time: this.calculateAverageResponseTime(webhookLogs)
        };

        return stats;
    }

    // Pomožne funkcije
    generateWebhookSecret(clientId) {
        return crypto.createHmac('sha256', this.webhookSecret)
            .update(clientId + Date.now())
            .digest('hex')
            .substring(0, 32);
    }

    generateSignature(payload, secret) {
        const payloadString = typeof payload === 'string' ? payload : JSON.stringify(payload);
        return crypto.createHmac('sha256', secret)
            .update(payloadString)
            .digest('hex');
    }

    maskLicenseKey(licenseKey) {
        if (!licenseKey || licenseKey.length < 8) return '***';
        return licenseKey.substring(0, 4) + '***' + licenseKey.substring(licenseKey.length - 4);
    }

    calculateDaysUntilExpiry(expiryDate) {
        const expiry = new Date(expiryDate);
        const now = new Date();
        const diffTime = expiry - now;
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async getWebhooksForEvent(event, clientId) {
        // V produkciji bi to pridobili iz baze podatkov
        // Za demo vrnemo prazen array
        return [];
    }

    groupWebhooksByEvent(logs) {
        const events = {};
        logs.forEach(log => {
            if (log.event) {
                events[log.event] = (events[log.event] || 0) + 1;
            }
        });
        return events;
    }

    calculateAverageResponseTime(logs) {
        const responseTimes = logs
            .filter(log => log.response_time)
            .map(log => log.response_time);
        
        if (responseTimes.length === 0) return 0;
        
        return responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
    }
}

module.exports = WebhookManager;