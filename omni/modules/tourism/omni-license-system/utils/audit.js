/**
 * Audit Logging System za Omni License System
 * Sledenje in beleženje vseh licenčnih aktivnosti
 */

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

class AuditLogger {
    constructor() {
        this.logDir = path.join(__dirname, '..', 'logs');
        this.auditFile = path.join(this.logDir, 'audit.log');
        this.securityFile = path.join(this.logDir, 'security.log');
        this.initializeLogDirectory();
    }

    async initializeLogDirectory() {
        try {
            await fs.mkdir(this.logDir, { recursive: true });
        } catch (error) {
            console.error('Napaka pri ustvarjanju log direktorija:', error);
        }
    }

    /**
     * Beleženje licenčnih aktivnosti
     */
    async logLicenseActivity(activity, details = {}) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            type: 'LICENSE_ACTIVITY',
            activity: activity,
            client_id: details.client_id || 'unknown',
            license_key: details.license_key ? this.maskLicenseKey(details.license_key) : null,
            ip_address: details.ip_address || 'unknown',
            user_agent: details.user_agent || 'unknown',
            result: details.result || 'unknown',
            details: details.additional_info || {},
            session_id: details.session_id || this.generateSessionId()
        };

        await this.writeToFile(this.auditFile, logEntry);
        
        // Če je aktivnost kritična, zapiši tudi v security log
        if (this.isCriticalActivity(activity)) {
            await this.writeToFile(this.securityFile, logEntry);
        }
    }

    /**
     * Beleženje varnostnih dogodkov
     */
    async logSecurityEvent(event, details = {}) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            type: 'SECURITY_EVENT',
            event: event,
            severity: details.severity || 'medium',
            client_id: details.client_id || 'unknown',
            ip_address: details.ip_address || 'unknown',
            user_agent: details.user_agent || 'unknown',
            details: details.additional_info || {},
            hash: this.generateEventHash(event, details)
        };

        await this.writeToFile(this.securityFile, logEntry);
        
        // Če je dogodek visoke prioritete, pošlji opozorilo
        if (details.severity === 'high' || details.severity === 'critical') {
            await this.sendSecurityAlert(logEntry);
        }
    }

    /**
     * Beleženje API klicev
     */
    async logApiCall(endpoint, method, details = {}) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            type: 'API_CALL',
            endpoint: endpoint,
            method: method,
            client_id: details.client_id || 'unknown',
            ip_address: details.ip_address || 'unknown',
            user_agent: details.user_agent || 'unknown',
            response_code: details.response_code || 'unknown',
            response_time: details.response_time || 0,
            request_size: details.request_size || 0,
            response_size: details.response_size || 0
        };

        await this.writeToFile(this.auditFile, logEntry);
    }

    /**
     * Pridobivanje audit logov
     */
    async getAuditLogs(filters = {}) {
        try {
            const data = await fs.readFile(this.auditFile, 'utf8');
            const logs = data.split('\n')
                .filter(line => line.trim())
                .map(line => JSON.parse(line))
                .filter(log => this.matchesFilters(log, filters))
                .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

            return logs;
        } catch (error) {
            console.error('Napaka pri branju audit logov:', error);
            return [];
        }
    }

    /**
     * Pridobivanje varnostnih logov
     */
    async getSecurityLogs(filters = {}) {
        try {
            const data = await fs.readFile(this.securityFile, 'utf8');
            const logs = data.split('\n')
                .filter(line => line.trim())
                .map(line => JSON.parse(line))
                .filter(log => this.matchesFilters(log, filters))
                .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

            return logs;
        } catch (error) {
            console.error('Napaka pri branju security logov:', error);
            return [];
        }
    }

    /**
     * Generiranje poročila
     */
    async generateReport(startDate, endDate, type = 'all') {
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        const auditLogs = await this.getAuditLogs({
            start_date: start,
            end_date: end
        });

        const securityLogs = await this.getSecurityLogs({
            start_date: start,
            end_date: end
        });

        const report = {
            period: {
                start: startDate,
                end: endDate
            },
            summary: {
                total_audit_events: auditLogs.length,
                total_security_events: securityLogs.length,
                license_validations: auditLogs.filter(log => log.activity === 'LICENSE_VALIDATION').length,
                failed_validations: auditLogs.filter(log => log.activity === 'LICENSE_VALIDATION' && log.result === 'failed').length,
                unique_clients: [...new Set(auditLogs.map(log => log.client_id))].length
            },
            top_activities: this.getTopActivities(auditLogs),
            security_alerts: securityLogs.filter(log => log.severity === 'high' || log.severity === 'critical'),
            client_activity: this.getClientActivity(auditLogs)
        };

        return report;
    }

    /**
     * Čiščenje starih logov
     */
    async cleanupOldLogs(daysToKeep = 90) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

        await this.cleanupLogFile(this.auditFile, cutoffDate);
        await this.cleanupLogFile(this.securityFile, cutoffDate);
    }

    // Pomožne funkcije
    maskLicenseKey(licenseKey) {
        if (!licenseKey || licenseKey.length < 8) return '***';
        return licenseKey.substring(0, 4) + '***' + licenseKey.substring(licenseKey.length - 4);
    }

    generateSessionId() {
        return crypto.randomBytes(16).toString('hex');
    }

    generateEventHash(event, details) {
        const data = JSON.stringify({ event, details, timestamp: Date.now() });
        return crypto.createHash('sha256').update(data).digest('hex').substring(0, 16);
    }

    isCriticalActivity(activity) {
        const criticalActivities = [
            'LICENSE_VALIDATION_FAILED',
            'INVALID_LICENSE_KEY',
            'EXPIRED_LICENSE_ACCESS',
            'MULTIPLE_FAILED_ATTEMPTS',
            'SUSPICIOUS_ACTIVITY'
        ];
        return criticalActivities.includes(activity);
    }

    async writeToFile(filePath, logEntry) {
        try {
            const logLine = JSON.stringify(logEntry) + '\n';
            await fs.appendFile(filePath, logLine);
        } catch (error) {
            console.error('Napaka pri pisanju v log datoteko:', error);
        }
    }

    matchesFilters(log, filters) {
        if (filters.client_id && log.client_id !== filters.client_id) return false;
        if (filters.activity && log.activity !== filters.activity) return false;
        if (filters.start_date && new Date(log.timestamp) < filters.start_date) return false;
        if (filters.end_date && new Date(log.timestamp) > filters.end_date) return false;
        if (filters.severity && log.severity !== filters.severity) return false;
        return true;
    }

    getTopActivities(logs) {
        const activities = {};
        logs.forEach(log => {
            if (log.activity) {
                activities[log.activity] = (activities[log.activity] || 0) + 1;
            }
        });
        
        return Object.entries(activities)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10)
            .map(([activity, count]) => ({ activity, count }));
    }

    getClientActivity(logs) {
        const clients = {};
        logs.forEach(log => {
            if (log.client_id && log.client_id !== 'unknown') {
                if (!clients[log.client_id]) {
                    clients[log.client_id] = {
                        total_requests: 0,
                        successful_validations: 0,
                        failed_validations: 0,
                        last_activity: null
                    };
                }
                
                clients[log.client_id].total_requests++;
                if (log.activity === 'LICENSE_VALIDATION') {
                    if (log.result === 'success') {
                        clients[log.client_id].successful_validations++;
                    } else {
                        clients[log.client_id].failed_validations++;
                    }
                }
                
                if (!clients[log.client_id].last_activity || 
                    new Date(log.timestamp) > new Date(clients[log.client_id].last_activity)) {
                    clients[log.client_id].last_activity = log.timestamp;
                }
            }
        });
        
        return clients;
    }

    async cleanupLogFile(filePath, cutoffDate) {
        try {
            const data = await fs.readFile(filePath, 'utf8');
            const lines = data.split('\n').filter(line => line.trim());
            
            const filteredLines = lines.filter(line => {
                try {
                    const log = JSON.parse(line);
                    return new Date(log.timestamp) >= cutoffDate;
                } catch {
                    return false;
                }
            });
            
            await fs.writeFile(filePath, filteredLines.join('\n') + '\n');
        } catch (error) {
            console.error('Napaka pri čiščenju log datoteke:', error);
        }
    }

    async sendSecurityAlert(logEntry) {
        // Implementacija pošiljanja opozoril (email, webhook, itd.)
        console.warn('🚨 VARNOSTNO OPOZORILO:', logEntry);
        
        // Tukaj bi implementirali pošiljanje email-a ali webhook-a
        // await this.sendEmailAlert(logEntry);
        // await this.sendWebhookAlert(logEntry);
    }
}

module.exports = AuditLogger;