/**
 * OMNI License System - Licenčni sistem
 * Upravljanje licenc: Free, Premium, Enterprise
 */

class OmniLicenseSystem {
    constructor() {
        this.currentLicense = null;
        this.licenseTypes = {
            FREE: {
                name: 'Free',
                maxRequests: 10,
                maxStorage: 100, // MB
                features: ['basic-ai', 'simple-generation'],
                price: 0,
                duration: null // Brez omejitve časa
            },
            PREMIUM: {
                name: 'Premium',
                maxRequests: 1000,
                maxStorage: 10000, // MB = 10GB
                features: ['advanced-ai', 'multimedia-generation', 'voice-integration', 'cloud-storage'],
                price: 29.99,
                duration: 30 // dni
            },
            ENTERPRISE: {
                name: 'Enterprise',
                maxRequests: -1, // Neomejeno
                maxStorage: -1, // Neomejeno
                features: ['all-features', 'priority-support', 'custom-modules', 'api-access'],
                price: 199.99,
                duration: 365 // dni
            }
        };
        
        this.usage = {
            requests: 0,
            storage: 0,
            lastReset: new Date().toISOString()
        };

        this.notifications = [];
        
        console.log('📜 OMNI License System inicializiran');
        this.loadLicenseFromStorage();
    }

    loadLicenseFromStorage() {
        try {
            const stored = localStorage.getItem('omni_license');
            if (stored) {
                this.currentLicense = JSON.parse(stored);
                this.validateLicense();
            } else {
                // Privzeto nastavi FREE licenco
                this.setFreeLicense();
            }
            
            const storedUsage = localStorage.getItem('omni_usage');
            if (storedUsage) {
                this.usage = JSON.parse(storedUsage);
                this.checkUsageReset();
            }
        } catch (error) {
            console.warn('⚠️ Napaka pri nalaganju licence:', error);
            this.setFreeLicense();
        }
    }

    setFreeLicense() {
        this.currentLicense = {
            type: 'FREE',
            status: 'active',
            activatedAt: new Date().toISOString(),
            expiresAt: null,
            userId: this.generateUserId(),
            features: this.licenseTypes.FREE.features
        };
        this.saveLicenseToStorage();
        console.log('🆓 FREE licenca aktivirana');
    }

    generateUserId() {
        return 'user_' + Math.random().toString(36).substr(2, 9);
    }

    validateLicense() {
        if (!this.currentLicense) {
            this.setFreeLicense();
            return false;
        }

        // Preveri veljavnost licence
        if (this.currentLicense.expiresAt) {
            const expiryDate = new Date(this.currentLicense.expiresAt);
            const now = new Date();
            
            if (now > expiryDate) {
                this.currentLicense.status = 'expired';
                this.addNotification('Licenca je potekla. Preklopi na FREE ali obnovi licenco.', 'warning');
                this.setFreeLicense();
                return false;
            }
        }

        return true;
    }

    getCurrentStatus() {
        if (!this.currentLicense) {
            return { type: 'NONE', status: 'invalid' };
        }

        const licenseInfo = this.licenseTypes[this.currentLicense.type];
        const usage = this.getCurrentUsage();
        
        return {
            type: this.currentLicense.type,
            status: this.currentLicense.status,
            features: this.currentLicense.features,
            usage: usage,
            limits: {
                requests: licenseInfo.maxRequests,
                storage: licenseInfo.maxStorage
            },
            expiresAt: this.currentLicense.expiresAt,
            daysRemaining: this.getDaysRemaining()
        };
    }

    getCurrentUsage() {
        this.checkUsageReset();
        return {
            requests: this.usage.requests,
            storage: this.usage.storage,
            requestsPercentage: this.getUsagePercentage('requests'),
            storagePercentage: this.getUsagePercentage('storage')
        };
    }

    getUsagePercentage(type) {
        const licenseInfo = this.licenseTypes[this.currentLicense.type];
        const limit = type === 'requests' ? licenseInfo.maxRequests : licenseInfo.maxStorage;
        
        if (limit === -1) return 0; // Neomejeno
        
        const used = this.usage[type];
        return Math.round((used / limit) * 100);
    }

    checkUsageReset() {
        const lastReset = new Date(this.usage.lastReset);
        const now = new Date();
        const daysSinceReset = (now - lastReset) / (1000 * 60 * 60 * 24);
        
        // Reset uporabe vsak mesec
        if (daysSinceReset >= 30) {
            this.usage.requests = 0;
            this.usage.lastReset = now.toISOString();
            this.saveUsageToStorage();
            console.log('🔄 Uporaba ponastavljena');
        }
    }

    getDaysRemaining() {
        if (!this.currentLicense.expiresAt) return null;
        
        const expiryDate = new Date(this.currentLicense.expiresAt);
        const now = new Date();
        const diffTime = expiryDate - now;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        return Math.max(0, diffDays);
    }

    canUseFeature(featureName) {
        if (!this.validateLicense()) return false;
        
        const hasFeature = this.currentLicense.features.includes(featureName) ||
                          this.currentLicense.features.includes('all-features');
        
        if (!hasFeature) {
            this.addNotification(`Funkcija "${featureName}" ni na voljo v vaši licenci.`, 'info');
            return false;
        }
        
        return true;
    }

    canMakeRequest() {
        if (!this.validateLicense()) return false;
        
        const licenseInfo = this.licenseTypes[this.currentLicense.type];
        
        if (licenseInfo.maxRequests === -1) return true; // Neomejeno
        
        if (this.usage.requests >= licenseInfo.maxRequests) {
            this.addNotification('Dosegli ste omejitev zahtev za ta mesec.', 'warning');
            return false;
        }
        
        return true;
    }

    recordRequest() {
        if (this.canMakeRequest()) {
            this.usage.requests++;
            this.saveUsageToStorage();
            
            // Opozorilo pri 80% uporabe
            const percentage = this.getUsagePercentage('requests');
            if (percentage >= 80 && percentage < 90) {
                this.addNotification(`Uporabili ste ${percentage}% mesečnih zahtev.`, 'info');
            } else if (percentage >= 90) {
                this.addNotification(`Uporabili ste ${percentage}% mesečnih zahtev. Razmislite o nadgradnji.`, 'warning');
            }
            
            return true;
        }
        return false;
    }

    recordStorageUsage(sizeInMB) {
        const licenseInfo = this.licenseTypes[this.currentLicense.type];
        
        if (licenseInfo.maxStorage === -1) {
            this.usage.storage += sizeInMB;
            this.saveUsageToStorage();
            return true;
        }
        
        if (this.usage.storage + sizeInMB > licenseInfo.maxStorage) {
            this.addNotification('Dosegli ste omejitev shranjevanja.', 'warning');
            return false;
        }
        
        this.usage.storage += sizeInMB;
        this.saveUsageToStorage();
        
        // Opozorilo pri 80% uporabe
        const percentage = this.getUsagePercentage('storage');
        if (percentage >= 80 && percentage < 90) {
            this.addNotification(`Uporabili ste ${percentage}% prostora za shranjevanje.`, 'info');
        } else if (percentage >= 90) {
            this.addNotification(`Uporabili ste ${percentage}% prostora. Razmislite o nadgradnji.`, 'warning');
        }
        
        return true;
    }

    async upgradeLicense(newType, paymentInfo = null) {
        if (!this.licenseTypes[newType]) {
            throw new Error('Neveljaven tip licence');
        }

        // Simulacija plačila
        if (newType !== 'FREE') {
            const paymentResult = await this.processPayment(newType, paymentInfo);
            if (!paymentResult.success) {
                throw new Error('Plačilo ni uspešno: ' + paymentResult.error);
            }
        }

        const licenseInfo = this.licenseTypes[newType];
        const now = new Date();
        
        this.currentLicense = {
            type: newType,
            status: 'active',
            activatedAt: now.toISOString(),
            expiresAt: licenseInfo.duration ? 
                new Date(now.getTime() + licenseInfo.duration * 24 * 60 * 60 * 1000).toISOString() : 
                null,
            userId: this.currentLicense.userId,
            features: licenseInfo.features,
            paymentId: paymentInfo?.paymentId || null
        };

        this.saveLicenseToStorage();
        this.addNotification(`Licenca nadgrajena na ${licenseInfo.name}!`, 'success');
        
        console.log(`✅ Licenca nadgrajena na ${newType}`);
        return true;
    }

    async processPayment(licenseType, paymentInfo) {
        // Simulacija procesiranja plačila
        return new Promise((resolve) => {
            setTimeout(() => {
                if (paymentInfo && paymentInfo.cardNumber) {
                    resolve({
                        success: true,
                        paymentId: 'pay_' + Math.random().toString(36).substr(2, 9),
                        amount: this.licenseTypes[licenseType].price
                    });
                } else {
                    resolve({
                        success: false,
                        error: 'Manjkajo podatki o plačilu'
                    });
                }
            }, 1000);
        });
    }

    getLicenseOptions() {
        return Object.entries(this.licenseTypes).map(([key, info]) => ({
            type: key,
            name: info.name,
            price: info.price,
            duration: info.duration,
            features: info.features,
            maxRequests: info.maxRequests,
            maxStorage: info.maxStorage,
            recommended: key === 'PREMIUM'
        }));
    }

    addNotification(message, type = 'info') {
        const notification = {
            id: Date.now(),
            message,
            type,
            timestamp: new Date().toISOString(),
            read: false
        };
        
        this.notifications.unshift(notification);
        
        // Obdrži samo zadnjih 10 obvestil
        if (this.notifications.length > 10) {
            this.notifications = this.notifications.slice(0, 10);
        }
        
        // Prikaži obvestilo v UI
        this.showNotificationInUI(notification);
    }

    showNotificationInUI(notification) {
        // Ustvari obvestilo v UI
        const notificationEl = document.createElement('div');
        notificationEl.className = `omni-notification omni-notification-${notification.type}`;
        notificationEl.innerHTML = `
            <div class="notification-content">
                <span class="notification-message">${notification.message}</span>
                <button class="notification-close" onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
        `;
        
        // Dodaj CSS če še ni
        if (!document.getElementById('omni-notification-styles')) {
            const styles = document.createElement('style');
            styles.id = 'omni-notification-styles';
            styles.textContent = `
                .omni-notification {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    background: white;
                    border-radius: 8px;
                    padding: 1rem;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                    z-index: 10000;
                    max-width: 300px;
                    animation: slideIn 0.3s ease;
                }
                .omni-notification-info { border-left: 4px solid #3498db; }
                .omni-notification-success { border-left: 4px solid #27ae60; }
                .omni-notification-warning { border-left: 4px solid #f39c12; }
                .omni-notification-error { border-left: 4px solid #e74c3c; }
                .notification-content { display: flex; justify-content: space-between; align-items: center; }
                .notification-close { background: none; border: none; font-size: 1.2rem; cursor: pointer; }
                @keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
            `;
            document.head.appendChild(styles);
        }
        
        document.body.appendChild(notificationEl);
        
        // Avtomatsko odstrani po 5 sekundah
        setTimeout(() => {
            if (notificationEl.parentElement) {
                notificationEl.remove();
            }
        }, 5000);
    }

    getNotifications() {
        return this.notifications;
    }

    markNotificationAsRead(notificationId) {
        const notification = this.notifications.find(n => n.id === notificationId);
        if (notification) {
            notification.read = true;
        }
    }

    saveLicenseToStorage() {
        try {
            localStorage.setItem('omni_license', JSON.stringify(this.currentLicense));
        } catch (error) {
            console.warn('⚠️ Napaka pri shranjevanju licence:', error);
        }
    }

    saveUsageToStorage() {
        try {
            localStorage.setItem('omni_usage', JSON.stringify(this.usage));
        } catch (error) {
            console.warn('⚠️ Napaka pri shranjevanju uporabe:', error);
        }
    }

    // Javni API za preverjanje licenc
    checkFeatureAccess(featureName) {
        return {
            allowed: this.canUseFeature(featureName),
            licenseType: this.currentLicense?.type,
            upgradeRequired: !this.canUseFeature(featureName)
        };
    }

    getLicenseInfo() {
        return {
            current: this.getCurrentStatus(),
            options: this.getLicenseOptions(),
            notifications: this.getNotifications().filter(n => !n.read)
        };
    }

    // Metode za testiranje
    simulateUsage(requests = 5, storageMB = 10) {
        for (let i = 0; i < requests; i++) {
            this.recordRequest();
        }
        this.recordStorageUsage(storageMB);
    }

    resetUsage() {
        this.usage = {
            requests: 0,
            storage: 0,
            lastReset: new Date().toISOString()
        };
        this.saveUsageToStorage();
        console.log('🔄 Uporaba ponastavljena');
    }
}

// Globalna instanca licenčnega sistema
window.omniLicense = new OmniLicenseSystem();

console.log('📜 OMNI License System naložen');