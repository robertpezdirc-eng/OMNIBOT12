/**
 * 🔗 Omni IoT Core Registration
 * Registracija avtonomnega IoT sistema v OmniCore
 */

const axios = require('axios');
const path = require('path');

class OmniIoTRegistration {
    constructor() {
        this.iotModuleName = 'iot_autonomous';
        this.iotApiUrl = 'http://localhost:5001';
        this.registered = false;
        
        console.log('🔗 Omni IoT Registration inicializiran');
    }
    
    /**
     * Registriraj IoT modul v OmniCore
     */
    async registerIoTModule() {
        try {
            // Preveri če je IoT API dostopen
            const healthCheck = await this.checkIoTHealth();
            if (!healthCheck) {
                console.log('⚠️ IoT API ni dostopen, poskušam znova...');
                return false;
            }
            
            // Registriraj modul
            const moduleInfo = {
                name: this.iotModuleName,
                type: 'iot_system',
                version: '1.0.0',
                description: 'Avtonomni IoT sistem za Omni',
                api_url: this.iotApiUrl,
                capabilities: [
                    'device_monitoring',
                    'autonomous_control',
                    'auto_actions',
                    'real_time_alerts',
                    'energy_optimization',
                    'predictive_maintenance'
                ],
                endpoints: {
                    status: '/api/status',
                    devices: '/api/devices',
                    control: '/api/devices/{device_id}/control',
                    monitoring: '/api/monitoring/start',
                    autonomous: '/api/autonomous/start',
                    dashboard: '/api/dashboard'
                },
                status: 'active'
            };
            
            // Dodaj v globalni omni objekt
            if (typeof global !== 'undefined' && global.omni) {
                if (!global.omni.modules) {
                    global.omni.modules = {};
                }
                
                global.omni.modules[this.iotModuleName] = {
                    ...moduleInfo,
                    
                    // Funkcije za upravljanje
                    async startAutonomy() {
                        try {
                            const response = await axios.post(`${moduleInfo.api_url}/api/autonomous/start`);
                            return response.data;
                        } catch (error) {
                            console.error('❌ Napaka pri zagonu avtonomije:', error.message);
                            return { success: false, error: error.message };
                        }
                    },
                    
                    async stopAutonomy() {
                        try {
                            const response = await axios.post(`${moduleInfo.api_url}/api/autonomous/stop`);
                            return response.data;
                        } catch (error) {
                            console.error('❌ Napaka pri ustavljanju avtonomije:', error.message);
                            return { success: false, error: error.message };
                        }
                    },
                    
                    async startMonitoring(devices = null) {
                        try {
                            const payload = devices ? { devices } : {};
                            const response = await axios.post(`${moduleInfo.api_url}/api/monitoring/start`, payload);
                            return response.data;
                        } catch (error) {
                            console.error('❌ Napaka pri zagonu spremljanja:', error.message);
                            return { success: false, error: error.message };
                        }
                    },
                    
                    async stopMonitoring() {
                        try {
                            const response = await axios.post(`${moduleInfo.api_url}/api/monitoring/stop`);
                            return response.data;
                        } catch (error) {
                            console.error('❌ Napaka pri ustavljanju spremljanja:', error.message);
                            return { success: false, error: error.message };
                        }
                    },
                    
                    async startFullSystem() {
                        try {
                            const response = await axios.post(`${moduleInfo.api_url}/api/system/full-start`);
                            return response.data;
                        } catch (error) {
                            console.error('❌ Napaka pri zagonu celotnega sistema:', error.message);
                            return { success: false, error: error.message };
                        }
                    },
                    
                    async stopFullSystem() {
                        try {
                            const response = await axios.post(`${moduleInfo.api_url}/api/system/full-stop`);
                            return response.data;
                        } catch (error) {
                            console.error('❌ Napaka pri ustavljanju celotnega sistema:', error.message);
                            return { success: false, error: error.message };
                        }
                    },
                    
                    async getStatus() {
                        try {
                            const response = await axios.get(`${moduleInfo.api_url}/api/status`);
                            return response.data;
                        } catch (error) {
                            console.error('❌ Napaka pri pridobivanju statusa:', error.message);
                            return { success: false, error: error.message };
                        }
                    },
                    
                    async getDevices() {
                        try {
                            const response = await axios.get(`${moduleInfo.api_url}/api/devices`);
                            return response.data;
                        } catch (error) {
                            console.error('❌ Napaka pri pridobivanju naprav:', error.message);
                            return { success: false, error: error.message };
                        }
                    },
                    
                    async controlDevice(deviceId, action, params = {}) {
                        try {
                            const response = await axios.post(
                                `${moduleInfo.api_url}/api/devices/${deviceId}/control`,
                                { action, params }
                            );
                            return response.data;
                        } catch (error) {
                            console.error(`❌ Napaka pri upravljanju naprave ${deviceId}:`, error.message);
                            return { success: false, error: error.message };
                        }
                    },
                    
                    async getDashboardData() {
                        try {
                            const response = await axios.get(`${moduleInfo.api_url}/api/dashboard`);
                            return response.data;
                        } catch (error) {
                            console.error('❌ Napaka pri pridobivanju dashboard podatkov:', error.message);
                            return { success: false, error: error.message };
                        }
                    }
                };
                
                this.registered = true;
                console.log('✅ IoT modul uspešno registriran v OmniCore');
                console.log(`📡 API dostopen na: ${this.iotApiUrl}`);
                
                return true;
            } else {
                console.log('⚠️ Global omni objekt ni dostopen');
                return false;
            }
            
        } catch (error) {
            console.error('❌ Napaka pri registraciji IoT modula:', error.message);
            return false;
        }
    }
    
    /**
     * Preveri zdravje IoT API
     */
    async checkIoTHealth() {
        try {
            const response = await axios.get(`${this.iotApiUrl}/api/status`, {
                timeout: 5000
            });
            return response.status === 200;
        } catch (error) {
            return false;
        }
    }
    
    /**
     * Avtomatska registracija z retry logiko
     */
    async autoRegister(maxRetries = 5, retryDelay = 3000) {
        console.log('🔄 Začenjam avtomatsko registracijo IoT modula...');
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            console.log(`📡 Poskus registracije ${attempt}/${maxRetries}...`);
            
            const success = await this.registerIoTModule();
            if (success) {
                console.log('✅ IoT modul uspešno registriran!');
                return true;
            }
            
            if (attempt < maxRetries) {
                console.log(`⏳ Čakam ${retryDelay/1000}s pred naslednjim poskusom...`);
                await new Promise(resolve => setTimeout(resolve, retryDelay));
            }
        }
        
        console.log('❌ Registracija IoT modula neuspešna po vseh poskusih');
        return false;
    }
    
    /**
     * Pridobi informacije o registriranem modulu
     */
    getModuleInfo() {
        if (typeof global !== 'undefined' && global.omni && global.omni.modules && global.omni.modules[this.iotModuleName]) {
            return global.omni.modules[this.iotModuleName];
        }
        return null;
    }
    
    /**
     * Preveri če je modul registriran
     */
    isRegistered() {
        return this.registered && this.getModuleInfo() !== null;
    }
}

// Ustvari globalno instanco
const omniIoTRegistration = new OmniIoTRegistration();

// Avtomatska registracija ob zagonu
if (typeof global !== 'undefined') {
    // Počakaj malo, da se OmniCore inicializira
    setTimeout(() => {
        omniIoTRegistration.autoRegister();
    }, 2000);
}

// Eksportiraj funkcije
module.exports = {
    omniIoTRegistration,
    
    // Glavne funkcije
    async registerIoTModule() {
        return await omniIoTRegistration.registerIoTModule();
    },
    
    async autoRegister(maxRetries = 5, retryDelay = 3000) {
        return await omniIoTRegistration.autoRegister(maxRetries, retryDelay);
    },
    
    getModuleInfo() {
        return omniIoTRegistration.getModuleInfo();
    },
    
    isRegistered() {
        return omniIoTRegistration.isRegistered();
    },
    
    // Kratke funkcije za hitro uporabo
    async startIoTSystem() {
        const module = omniIoTRegistration.getModuleInfo();
        if (module) {
            return await module.startFullSystem();
        }
        return { success: false, error: 'IoT modul ni registriran' };
    },
    
    async stopIoTSystem() {
        const module = omniIoTRegistration.getModuleInfo();
        if (module) {
            return await module.stopFullSystem();
        }
        return { success: false, error: 'IoT modul ni registriran' };
    },
    
    async getIoTStatus() {
        const module = omniIoTRegistration.getModuleInfo();
        if (module) {
            return await module.getStatus();
        }
        return { success: false, error: 'IoT modul ni registriran' };
    },
    
    async getIoTDevices() {
        const module = omniIoTRegistration.getModuleInfo();
        if (module) {
            return await module.getDevices();
        }
        return { success: false, error: 'IoT modul ni registriran' };
    }
};

console.log('🔗 Omni IoT Registration modul naložen');