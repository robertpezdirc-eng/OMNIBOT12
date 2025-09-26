/**
 * Omnija System Lock - Zaščita pred spremembami
 * Preprečuje nepooblaščene spremembe sistema
 */

class SystemLock {
    constructor() {
        this.isLocked = false;
        this.lockKey = this.generateLockKey();
        this.protectedFiles = [
            'server.js',
            'unified-search.html',
            'mobile-app-integration.js',
            'system-lock.js'
        ];
        this.lockTimestamp = new Date().toISOString();
        this.lockReason = 'Sistem je zaklenjen za zaščito pred nepooblaščenimi spremembami';
        
        console.log('🔒 System Lock initialized');
        this.activateLock();
    }

    generateLockKey() {
        return 'OMNIJA_LOCK_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
    }

    activateLock() {
        this.isLocked = true;
        
        // Zaščiti kritične funkcije
        this.protectSystemFunctions();
        
        // Nastavi opozorila
        this.setupWarnings();
        
        // Logiraj aktivacijo
        console.log('🔒 System Lock ACTIVATED');
        console.log('🔑 Lock Key:', this.lockKey);
        console.log('📅 Lock Time:', this.lockTimestamp);
        
        return {
            success: true,
            lockKey: this.lockKey,
            timestamp: this.lockTimestamp,
            protectedFiles: this.protectedFiles
        };
    }

    protectSystemFunctions() {
        // Zaščiti fs operacije
        if (typeof require !== 'undefined') {
            try {
                const originalWriteFile = require('fs').writeFile;
                const originalWriteFileSync = require('fs').writeFileSync;
                
                require('fs').writeFile = (...args) => {
                    if (this.isProtectedOperation(args[0])) {
                        console.warn('🚫 SYSTEM LOCK: Write operation blocked for protected file');
                        return;
                    }
                    return originalWriteFile.apply(this, args);
                };
                
                require('fs').writeFileSync = (...args) => {
                    if (this.isProtectedOperation(args[0])) {
                        console.warn('🚫 SYSTEM LOCK: WriteSync operation blocked for protected file');
                        return;
                    }
                    return originalWriteFileSync.apply(this, args);
                };
            } catch (error) {
                console.log('⚠️ Could not protect fs operations:', error.message);
            }
        }
    }

    isProtectedOperation(filePath) {
        if (!filePath || typeof filePath !== 'string') return false;
        
        return this.protectedFiles.some(protectedFile => 
            filePath.includes(protectedFile)
        );
    }

    setupWarnings() {
        // Nastavi interval za opozorila
        setInterval(() => {
            if (this.isLocked) {
                console.log('🔒 SYSTEM LOCK ACTIVE - Sistem je zaščiten');
            }
        }, 300000); // Vsakih 5 minut
    }

    checkLockStatus() {
        return {
            isLocked: this.isLocked,
            lockKey: this.lockKey,
            timestamp: this.lockTimestamp,
            protectedFiles: this.protectedFiles,
            lockReason: this.lockReason,
            uptime: Date.now() - new Date(this.lockTimestamp).getTime()
        };
    }

    attemptUnlock(providedKey, reason = '') {
        if (!providedKey) {
            console.warn('🚫 UNLOCK ATTEMPT: No key provided');
            return {
                success: false,
                error: 'Unlock key required'
            };
        }

        if (providedKey !== this.lockKey) {
            console.warn('🚫 UNLOCK ATTEMPT: Invalid key provided');
            return {
                success: false,
                error: 'Invalid unlock key'
            };
        }

        // Dodatna varnostna preverjanja
        if (!reason || reason.length < 10) {
            console.warn('🚫 UNLOCK ATTEMPT: Insufficient reason provided');
            return {
                success: false,
                error: 'Valid reason required (min 10 characters)'
            };
        }

        // Uspešno odklepanje
        this.isLocked = false;
        const unlockTime = new Date().toISOString();
        
        console.log('🔓 SYSTEM UNLOCKED');
        console.log('📅 Unlock Time:', unlockTime);
        console.log('📝 Reason:', reason);

        return {
            success: true,
            unlockTime: unlockTime,
            reason: reason,
            previousLockDuration: Date.now() - new Date(this.lockTimestamp).getTime()
        };
    }

    emergencyOverride(adminCode) {
        // Samo za skrajne primere
        const validAdminCodes = [
            'OMNIJA_EMERGENCY_2024',
            'SYSTEM_CRITICAL_OVERRIDE'
        ];

        if (!validAdminCodes.includes(adminCode)) {
            console.error('🚨 EMERGENCY OVERRIDE FAILED: Invalid admin code');
            return {
                success: false,
                error: 'Invalid emergency admin code'
            };
        }

        this.isLocked = false;
        console.log('🚨 EMERGENCY OVERRIDE ACTIVATED');
        
        return {
            success: true,
            type: 'emergency_override',
            timestamp: new Date().toISOString()
        };
    }

    getSystemInfo() {
        return {
            systemName: 'Omnija AI Platform',
            version: '2.0.0',
            lockStatus: this.checkLockStatus(),
            capabilities: [
                'Global Information Access',
                'Mobile App Integration', 
                'AI-Powered Search',
                'Multi-Modal Results',
                'Real-Time Data'
            ],
            securityLevel: 'HIGH',
            lastUpdate: this.lockTimestamp
        };
    }
}

// Avtomatska aktivacija ob nalaganju
const systemLock = new SystemLock();

// Export za uporabo
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SystemLock;
}

// Global dostop v brskalniku
if (typeof window !== 'undefined') {
    window.SystemLock = SystemLock;
    window.omnijaSysLock = systemLock;
}

console.log('🔒 Omnija System Lock loaded and active');