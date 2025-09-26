const { ipcMain } = require('electron');
const path = require('path');
const fs = require('fs').promises;

class ModuleManager {
    constructor() {
        this.lockedModules = new Set();
        this.moduleElements = new Map();
        this.isInitialized = false;
        
        this.modules = {
            'ceniki': {
                name: 'Ceniki',
                description: 'Upravljanje cen in cennikov',
                requiredLicense: 'full',
                icon: '💰',
                url: 'http://localhost:4000/ceniki',
                status: 'locked',
                elements: ['.ceniki-module', '#ceniki-dashboard', '[data-module="ceniki"]']
            },
            'blagajna': {
                name: 'Blagajna',
                description: 'Sistem za prodajo in račune',
                requiredLicense: 'full',
                icon: '🛒',
                url: 'http://localhost:4000/blagajna',
                status: 'locked',
                elements: ['.blagajna-module', '#blagajna-system', '[data-module="blagajna"]']
            },
            'zaloge': {
                name: 'Zaloge',
                description: 'Upravljanje zalog in inventarja',
                requiredLicense: 'full',
                icon: '📦',
                url: 'http://localhost:4000/zaloge',
                status: 'locked',
                elements: ['.zaloge-module', '#zaloge-system', '[data-module="zaloge"]']
            },
            'ai-optimizacija': {
                name: 'AI Optimizacija',
                description: 'Napredna AI analitika in optimizacija',
                requiredLicense: 'premium',
                icon: '🤖',
                url: 'http://localhost:4000/ai-optimizacija',
                status: 'locked',
                elements: ['.ai-module', '#ai-dashboard', '[data-module="ai"]']
            },
            'dashboard': {
                name: 'Nadzorna plošča',
                description: 'Osnovni pregled in statistike',
                requiredLicense: 'demo',
                icon: '📊',
                url: 'http://localhost:4002/client-dashboard.html',
                status: 'unlocked',
                elements: ['.dashboard-module', '#main-dashboard', '[data-module="dashboard"]']
            },
            'poročila': {
                name: 'Poročila',
                description: 'Osnovna poročila (demo)',
                requiredLicense: 'demo',
                icon: '📈',
                url: 'http://localhost:4000/porocila-demo',
                status: 'unlocked'
            }
        };

        this.licenseTypes = {
            'demo': {
                name: 'Demo licenca',
                allowedModules: ['dashboard', 'poročila'],
                limitations: {
                    maxRecords: 50,
                    maxUsers: 1,
                    exportFormats: ['PDF'],
                    validityDays: 7
                }
            },
            'full': {
                name: 'Polna licenca',
                allowedModules: ['dashboard', 'poročila', 'ceniki', 'blagajna', 'zaloge'],
                limitations: {
                    maxRecords: 10000,
                    maxUsers: 10,
                    exportFormats: ['PDF', 'Excel', 'CSV'],
                    validityDays: 365
                }
            },
            'premium': {
                name: 'Premium licenca',
                allowedModules: ['dashboard', 'poročila', 'ceniki', 'blagajna', 'zaloge', 'ai-optimizacija'],
                limitations: {
                    maxRecords: -1, // Neomejeno
                    maxUsers: -1,   // Neomejeno
                    exportFormats: ['PDF', 'Excel', 'CSV', 'JSON', 'XML'],
                    validityDays: 365
                }
            }
        };

        this.currentLicense = null;
    }

    /**
     * Odklepanje določenih modulov
     */
    async unlockModules(moduleIds) {
        try {
            console.log('🔓 Unlocking modules:', moduleIds);
            
            if (!Array.isArray(moduleIds)) {
                moduleIds = [moduleIds];
            }
            
            const unlockedModules = [];
            const failedModules = [];
            
            for (const moduleId of moduleIds) {
                try {
                    const success = await this.unlockModule(moduleId);
                    if (success) {
                        unlockedModules.push(moduleId);
                    } else {
                        failedModules.push(moduleId);
                    }
                } catch (error) {
                    console.error(`Error unlocking module ${moduleId}:`, error);
                    failedModules.push(moduleId);
                }
            }
            
            // Update UI
            this.updateModuleUI();
            
            console.log(`✅ Successfully unlocked ${unlockedModules.length} modules`);
            if (failedModules.length > 0) {
                console.warn(`⚠️ Failed to unlock ${failedModules.length} modules:`, failedModules);
            }
            
            return {
                success: unlockedModules,
                failed: failedModules
            };
            
        } catch (error) {
            console.error('❌ Error in unlockModules:', error);
            throw error;
        }
    }

    /**
     * Odklepanje posameznega modula
     */
    async unlockModule(moduleId) {
        try {
            const module = this.modules[moduleId];
            
            if (!module) {
                console.warn(`⚠️ Module not found: ${moduleId}`);
                return false;
            }
            
            // Update module status
            module.status = 'unlocked';
            this.lockedModules.delete(moduleId);
            
            // Enable DOM elements if available
            if (typeof document !== 'undefined' && module.elements) {
                for (const selector of module.elements) {
                    const elements = document.querySelectorAll(selector);
                    elements.forEach(element => this.enableElement(element));
                }
            }
            
            console.log(`🔓 Module unlocked: ${moduleId}`);
            return true;
            
        } catch (error) {
            console.error(`Error unlocking module ${moduleId}:`, error);
            return false;
        }
    }

    /**
     * Blokada vseh modulov
     */
    async lockAllModules() {
        try {
            console.log('🔒 Locking all modules...');
            
            const lockedModules = [];
            
            for (const moduleId of Object.keys(this.modules)) {
                try {
                    await this.lockModule(moduleId);
                    lockedModules.push(moduleId);
                } catch (error) {
                    console.error(`Error locking module ${moduleId}:`, error);
                }
            }
            
            // Update UI
            this.updateModuleUI();
            
            console.log(`🔒 Successfully locked ${lockedModules.length} modules`);
            return lockedModules;
            
        } catch (error) {
            console.error('❌ Error in lockAllModules:', error);
            throw error;
        }
    }

    /**
     * Blokada posameznega modula
     */
    async lockModule(moduleId) {
        try {
            const module = this.modules[moduleId];
            
            if (!module) {
                console.warn(`⚠️ Module not found: ${moduleId}`);
                return false;
            }
            
            // Update module status
            module.status = 'locked';
            this.lockedModules.add(moduleId);
            
            // Disable DOM elements if available
            if (typeof document !== 'undefined' && module.elements) {
                for (const selector of module.elements) {
                    const elements = document.querySelectorAll(selector);
                    elements.forEach(element => this.disableElement(element));
                }
            }
            
            console.log(`🔒 Module locked: ${moduleId}`);
            return true;
            
        } catch (error) {
            console.error(`Error locking module ${moduleId}:`, error);
            return false;
        }
    }

    /**
     * Omogočanje elementa
     */
    enableElement(element) {
        try {
            // Remove disabled attributes and classes
            element.removeAttribute('disabled');
            element.classList.remove('module-locked', 'disabled');
            element.classList.add('module-unlocked', 'enabled');
            
            // Enable form elements
            if (element.tagName === 'INPUT' || element.tagName === 'BUTTON' || element.tagName === 'SELECT' || element.tagName === 'TEXTAREA') {
                element.disabled = false;
            }
            
            // Show element if hidden
            if (element.style.display === 'none') {
                element.style.display = '';
            }
            
            // Remove overlay if exists
            const overlay = element.querySelector('.module-lock-overlay');
            if (overlay) {
                overlay.remove();
            }
            
        } catch (error) {
            console.error('Error enabling element:', error);
        }
    }

    /**
     * Onemogočanje elementa
     */
    disableElement(element) {
        try {
            // Add disabled attributes and classes
            element.setAttribute('disabled', 'true');
            element.classList.add('module-locked', 'disabled');
            element.classList.remove('module-unlocked', 'enabled');
            
            // Disable form elements
            if (element.tagName === 'INPUT' || element.tagName === 'BUTTON' || element.tagName === 'SELECT' || element.tagName === 'TEXTAREA') {
                element.disabled = true;
            }
            
            // Add visual overlay
            this.addLockOverlay(element);
            
        } catch (error) {
            console.error('Error disabling element:', error);
        }
    }

    /**
     * Dodajanje vizualnega prekritja za zaklenjene module
     */
    addLockOverlay(element) {
        try {
            // Check if overlay already exists
            if (element.querySelector('.module-lock-overlay')) {
                return;
            }
            
            // Create overlay
            const overlay = document.createElement('div');
            overlay.className = 'module-lock-overlay';
            overlay.innerHTML = `
                <div class="lock-message">
                    <div class="lock-icon">🔒</div>
                    <div class="lock-text">Module Locked</div>
                    <div class="lock-subtext">Upgrade your license to access this feature</div>
                </div>
            `;
            
            // Style overlay
            overlay.style.cssText = `
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.7);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 1000;
                color: white;
                text-align: center;
                font-family: Arial, sans-serif;
            `;
            
            // Make parent relative if not already
            const computedStyle = window.getComputedStyle(element);
            if (computedStyle.position === 'static') {
                element.style.position = 'relative';
            }
            
            element.appendChild(overlay);
            
        } catch (error) {
            console.error('Error adding lock overlay:', error);
        }
    }

    /**
     * Posodobitev UI modulov
     */
    updateModuleUI() {
        try {
            // Update module status display
            const statusElement = document.getElementById('module-status-display');
            if (statusElement) {
                const unlockedModules = Object.entries(this.modules)
                    .filter(([id, module]) => module.status === 'unlocked')
                    .map(([id, module]) => ({ id, name: module.name }));
                
                const lockedModules = Object.entries(this.modules)
                    .filter(([id, module]) => module.status === 'locked')
                    .map(([id, module]) => ({ id, name: module.name }));
                
                statusElement.innerHTML = `
                    <div class="module-status-info">
                        <h3>Module Status</h3>
                        <div class="unlocked-modules">
                            <h4>Unlocked Modules (${unlockedModules.length})</h4>
                            ${unlockedModules.length > 0 
                                ? unlockedModules.map(m => `<div class="module-item unlocked">✅ ${m.name}</div>`).join('')
                                : '<div class="no-modules">No modules unlocked</div>'
                            }
                        </div>
                        <div class="locked-modules">
                            <h4>Locked Modules (${lockedModules.length})</h4>
                            ${lockedModules.length > 0 
                                ? lockedModules.map(m => `<div class="module-item locked">🔒 ${m.name}</div>`).join('')
                                : '<div class="no-modules">No modules locked</div>'
                            }
                        </div>
                    </div>
                `;
            }
            
        } catch (error) {
            console.error('Error updating module UI:', error);
        }
    }

    /**
     * Pridobivanje seznama odklenjenjih modulov
     */
    getUnlockedModules() {
        return Object.entries(this.modules)
            .filter(([id, module]) => module.status === 'unlocked')
            .map(([id, module]) => id);
    }

    /**
     * Pridobivanje seznama zaklenjenjih modulov
     */
    getLockedModules() {
        return Object.entries(this.modules)
            .filter(([id, module]) => module.status === 'locked')
            .map(([id, module]) => id);
    }

    /**
     * Preverjanje, ali je modul odklenjen
     */
    isModuleUnlocked(moduleId) {
        const module = this.modules[moduleId];
        return module ? module.status === 'unlocked' : false;
    }

    /**
     * Nastavi trenutno licenco
     */
    setLicense(licenseData) {
        this.currentLicense = licenseData;
        this.updateModuleStatus();
    }

    /**
     * Posodobi status modulov na podlagi licence
     */
    updateModuleStatus() {
        if (!this.currentLicense) {
            // Brez licence - vsi moduli zaklenjeni razen demo
            Object.keys(this.modules).forEach(moduleId => {
                if (this.modules[moduleId].requiredLicense === 'demo') {
                    this.modules[moduleId].status = 'unlocked';
                } else {
                    this.modules[moduleId].status = 'locked';
                }
            });
            return;
        }

        const licenseType = this.licenseTypes[this.currentLicense.type];
        if (!licenseType) {
            console.error('Neznana vrsta licence:', this.currentLicense.type);
            return;
        }

        // Posodobi status modulov
        Object.keys(this.modules).forEach(moduleId => {
            if (licenseType.allowedModules.includes(moduleId)) {
                this.modules[moduleId].status = 'unlocked';
            } else {
                this.modules[moduleId].status = 'locked';
            }
        });

        // Preveri veljavnost demo licence
        if (this.currentLicense.type === 'demo' && this.currentLicense.expiresAt) {
            if (Date.now() > this.currentLicense.expiresAt) {
                console.log('Demo licenca je potekla, zaklepanje modulov...');
                Object.keys(this.modules).forEach(moduleId => {
                    this.modules[moduleId].status = 'expired';
                });
            }
        }

        console.log('Status modulov posodobljen za licenco:', this.currentLicense.type);
    }

    /**
     * Pridobi seznam vseh modulov z njihovim statusom
     */
    getModules() {
        return {
            modules: this.modules,
            license: this.currentLicense,
            licenseInfo: this.currentLicense ? this.licenseTypes[this.currentLicense.type] : null
        };
    }

    /**
     * Pridobi podatke o določenem modulu
     */
    getModule(moduleId) {
        const module = this.modules[moduleId];
        if (!module) {
            return null;
        }

        return {
            ...module,
            canAccess: module.status === 'unlocked',
            restrictions: this.getModuleRestrictions(moduleId)
        };
    }

    /**
     * Pridobi omejitve za modul
     */
    getModuleRestrictions(moduleId) {
        if (!this.currentLicense) {
            return {
                message: 'Potrebna je veljavna licenca',
                type: 'no_license'
            };
        }

        const module = this.modules[moduleId];
        const licenseInfo = this.licenseTypes[this.currentLicense.type];

        if (module.status === 'expired') {
            return {
                message: 'Demo licenca je potekla',
                type: 'expired',
                action: 'Potrebna je nadgradnja licence'
            };
        }

        if (module.status === 'locked') {
            return {
                message: `Modul zahteva ${module.requiredLicense} licenco`,
                type: 'insufficient_license',
                current: this.currentLicense.type,
                required: module.requiredLicense,
                action: 'Nadgradite licenco za dostop'
            };
        }

        // Vrni omejitve za odklenjene module
        if (licenseInfo && licenseInfo.limitations) {
            return {
                message: 'Modul je na voljo z omejitvami',
                type: 'limited_access',
                limitations: licenseInfo.limitations
            };
        }

        return null;
    }

    /**
     * Preveri, ali je modul dostopen
     */
    canAccessModule(moduleId) {
        const module = this.modules[moduleId];
        return module && module.status === 'unlocked';
    }

    /**
     * Odpre modul (če je dostopen)
     */
    async openModule(moduleId) {
        const module = this.getModule(moduleId);
        
        if (!module) {
            return {
                success: false,
                error: 'Modul ne obstaja',
                code: 'MODULE_NOT_FOUND'
            };
        }

        if (!module.canAccess) {
            return {
                success: false,
                error: 'Dostop do modula ni dovoljen',
                code: 'ACCESS_DENIED',
                restrictions: module.restrictions
            };
        }

        // Simulacija odpiranja modula
        console.log(`Odpiranje modula: ${module.name} (${moduleId})`);
        
        return {
            success: true,
            module: {
                id: moduleId,
                name: module.name,
                url: module.url,
                icon: module.icon
            },
            message: `Modul ${module.name} uspešno odprt`
        };
    }

    /**
     * Pridobi statistike uporabe modulov
     */
    getUsageStats() {
        const totalModules = Object.keys(this.modules).length;
        const unlockedModules = Object.values(this.modules).filter(m => m.status === 'unlocked').length;
        const lockedModules = Object.values(this.modules).filter(m => m.status === 'locked').length;
        const expiredModules = Object.values(this.modules).filter(m => m.status === 'expired').length;

        return {
            total: totalModules,
            unlocked: unlockedModules,
            locked: lockedModules,
            expired: expiredModules,
            accessRate: Math.round((unlockedModules / totalModules) * 100),
            licenseType: this.currentLicense ? this.currentLicense.type : 'none'
        };
    }

    /**
     * Registrira IPC handler-je
     */
    registerIPCHandlers() {
        ipcMain.handle('modules:get-all', () => {
            return this.getModules();
        });

        ipcMain.handle('modules:get', (event, moduleId) => {
            return this.getModule(moduleId);
        });

        ipcMain.handle('modules:can-access', (event, moduleId) => {
            return this.canAccessModule(moduleId);
        });

        ipcMain.handle('modules:open', async (event, moduleId) => {
            return await this.openModule(moduleId);
        });

        ipcMain.handle('modules:get-stats', () => {
            return this.getUsageStats();
        });

        ipcMain.handle('modules:update-license', (event, licenseData) => {
            this.setLicense(licenseData);
            return this.getModules();
        });

        console.log('ModuleManager IPC handlers registrirani');
    }

    /**
     * Inicializacija z licenčnimi podatki
     */
    async initialize(licenseData) {
        console.log('Inicializacija ModuleManager...');
        
        if (licenseData) {
            this.setLicense(licenseData);
        }

        this.registerIPCHandlers();
        
        console.log('ModuleManager inicializiran:', {
            license: this.currentLicense?.type || 'none',
            modules: Object.keys(this.modules).length,
            unlocked: Object.values(this.modules).filter(m => m.status === 'unlocked').length
        });
    }
}

module.exports = ModuleManager;