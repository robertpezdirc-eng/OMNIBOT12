#!/usr/bin/env node
/**
 * 🚀 VERCEL INTEGRATION SYSTEM
 * Omogoča dostop do Vercel aplikacije in sinhronizacijo
 * 
 * Avtor: Omni AI Platform
 * Verzija: 1.0.0
 */

const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

class VercelIntegration {
    constructor() {
        this.vercelToken = process.env.VERCEL_TOKEN;
        this.projectId = process.env.VERCEL_PROJECT_ID || 'omnibot-12-wt1w';
        this.teamId = process.env.VERCEL_TEAM_ID;
        this.baseUrl = 'https://api.vercel.com';
        this.appUrl = 'https://omnibot-12-wt1w.vercel.app';
        
        this.headers = {
            'Authorization': `Bearer ${this.vercelToken}`,
            'Content-Type': 'application/json'
        };
    }

    /**
     * 📊 Pridobi informacije o projektu
     */
    async getProjectInfo() {
        try {
            const response = await axios.get(
                `${this.baseUrl}/v9/projects/${this.projectId}`,
                { headers: this.headers }
            );
            
            return {
                success: true,
                data: response.data
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                status: error.response?.status
            };
        }
    }

    /**
     * 🚀 Pridobi deployment informacije
     */
    async getDeployments() {
        try {
            const response = await axios.get(
                `${this.baseUrl}/v6/deployments?projectId=${this.projectId}&limit=10`,
                { headers: this.headers }
            );
            
            return {
                success: true,
                deployments: response.data.deployments
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 📈 Pridobi analytics podatke
     */
    async getAnalytics() {
        try {
            const response = await axios.get(
                `${this.baseUrl}/v1/analytics?projectId=${this.projectId}`,
                { headers: this.headers }
            );
            
            return {
                success: true,
                analytics: response.data
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 🔍 Preveri status aplikacije
     */
    async checkAppStatus() {
        try {
            const response = await axios.get(`${this.appUrl}/api/status`, {
                timeout: 5000
            });
            
            return {
                success: true,
                status: 'online',
                data: response.data,
                responseTime: response.headers['x-response-time'] || 'N/A'
            };
        } catch (error) {
            return {
                success: false,
                status: 'offline',
                error: error.message
            };
        }
    }

    /**
     * 📝 Pridobi logove
     */
    async getLogs() {
        try {
            const deployments = await this.getDeployments();
            if (!deployments.success || !deployments.deployments.length) {
                return { success: false, error: 'No deployments found' };
            }

            const latestDeployment = deployments.deployments[0];
            const response = await axios.get(
                `${this.baseUrl}/v2/deployments/${latestDeployment.uid}/events`,
                { headers: this.headers }
            );
            
            return {
                success: true,
                logs: response.data
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 🔄 Sinhronizacija z lokalnim sistemom
     */
    async syncWithLocal() {
        try {
            // Preveri lokalni sistem
            const localStatus = await this.checkLocalSystem();
            
            // Preveri Vercel aplikacijo
            const vercelStatus = await this.checkAppStatus();
            
            const syncReport = {
                timestamp: new Date().toISOString(),
                local: localStatus,
                vercel: vercelStatus,
                sync_status: localStatus.success && vercelStatus.success ? 'synced' : 'out_of_sync'
            };
            
            // Shrani sync report
            await this.saveSyncReport(syncReport);
            
            return syncReport;
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 🖥️ Preveri lokalni sistem
     */
    async checkLocalSystem() {
        try {
            const response = await axios.get('http://localhost:3002/api/status', {
                timeout: 3000
            });
            
            return {
                success: true,
                status: 'online',
                port: 3002,
                data: response.data
            };
        } catch (error) {
            return {
                success: false,
                status: 'offline',
                error: error.message
            };
        }
    }

    /**
     * 💾 Shrani sync report
     */
    async saveSyncReport(report) {
        try {
            const reportsDir = path.join(__dirname, 'data', 'sync_reports');
            await fs.mkdir(reportsDir, { recursive: true });
            
            const filename = `sync_${new Date().toISOString().split('T')[0]}.json`;
            const filepath = path.join(reportsDir, filename);
            
            await fs.writeFile(filepath, JSON.stringify(report, null, 2));
            
            return { success: true, filepath };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * 📊 Generiraj debug dashboard podatke
     */
    async generateDebugData() {
        try {
            const [projectInfo, deployments, appStatus, logs] = await Promise.all([
                this.getProjectInfo(),
                this.getDeployments(),
                this.checkAppStatus(),
                this.getLogs()
            ]);

            return {
                timestamp: new Date().toISOString(),
                project: projectInfo,
                deployments: deployments,
                app_status: appStatus,
                logs: logs,
                urls: {
                    production: this.appUrl,
                    local: 'http://localhost:3002',
                    debug: 'http://localhost:3333'
                }
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
}

// CLI interface
if (require.main === module) {
    const integration = new VercelIntegration();
    
    const command = process.argv[2];
    
    switch (command) {
        case 'status':
            integration.checkAppStatus().then(console.log);
            break;
        case 'sync':
            integration.syncWithLocal().then(console.log);
            break;
        case 'logs':
            integration.getLogs().then(console.log);
            break;
        case 'debug':
            integration.generateDebugData().then(console.log);
            break;
        default:
            console.log(`
🚀 Vercel Integration CLI

Uporaba:
  node vercel-integration.js <command>

Ukazi:
  status    - Preveri status aplikacije
  sync      - Sinhroniziraj z lokalnim sistemom
  logs      - Pridobi logove
  debug     - Generiraj debug podatke

Primer:
  node vercel-integration.js status
            `);
    }
}

module.exports = VercelIntegration;