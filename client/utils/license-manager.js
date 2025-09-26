const SecureStorage = require('./secure-storage');
const https = require('https');
const http = require('http');

/**
 * LicenseManager - Upravljanje licenc in komunikacija s strežnikom
 */
class LicenseManager {
    constructor() {
        this.secureStorage = new SecureStorage();
        this.serverUrl = process.env.LICENSE_SERVER_URL || 'http://localhost:3001';
        this.offlineGracePeriod = 24 * 60 * 60 * 1000; // 24 ur v milisekundah
        this.lastCheckTime = null;
        this.licenseData = null;
        this.isOnline = true;
    }

      /**
     * Preveri status preklica licence
     * @returns {Promise<Object>} - Status preklica
     */
    async checkRevocationStatus() {
        try {
            if (!this.licenseData || !this.licenseData.token) {
                return { isRevoked: false, reason: 'no_license_token' };
            }

            // Določi URL strežnika (HTTPS ima prednost)
            const serverUrl = process.env.USE_HTTPS === 'true' 
                ? 'https://localhost:3000' 
                : 'http://localhost:3000';

            const response = await fetch(`${serverUrl}/api/revocation/check/${this.licenseData.token}`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                },
                // Za HTTPS z self-signed certifikati
                ...(process.env.USE_HTTPS === 'true' && {
                    agent: new (require('https').Agent)({
                        rejectUnauthorized: false // Samo za razvoj!
                    })
                })
            });

            if (!response.ok) {
                console.warn(`⚠️ Napaka pri preverjanju preklica: ${response.status}`);
                return { isRevoked: false, reason: 'server_error' };
            }

            const data = await response.json();
            
            return {
                isRevoked: data.isRevoked,
                revokedAt: data.revokedAt,
                reason: data.reason,
                description: data.description
            };

        } catch (error) {
            console.warn('⚠️ Napaka pri preverjanju preklica:', error.message);
            return { isRevoked: false, reason: 'network_error' };
        }
    }

  /**
     * Inicializacija license manager-ja
     * Preveri shranjeno licenco in jo validira
     */
    async initialize() {
        try {
            console.log('🔐 Inicializacija License Manager...');

            // Preberi shranjeno licenco
            this.licenseData = await this.secureStorage.retrieveLicenseToken();
            
            if (!this.licenseData) {
                console.log('❌ Ni shranjene licence - potrebna je aktivacija');
                return { valid: false, reason: 'no_license' };
            }

            // Preveri veljavnost shranjene licence
            const validationResult = await this.validateLicense();
            
            if (validationResult.valid) {
                console.log('✅ Licenca je veljavna');
                return validationResult;
            } else {
                console.log('❌ Licenca ni veljavna:', validationResult.reason);
                return validationResult;
            }

        } catch (error) {
            console.error('❌ Napaka pri inicializaciji License Manager:', error);
            return { valid: false, reason: 'initialization_error', error: error.message };
        }
    }

    /**
     * Validira licenco s strežnikom
     * @param {boolean} forceOnline - Prisili online preverjanje
     * @returns {Promise<Object>} - Rezultat validacije
     */
    async validateLicense(forceOnline = false) {
        try {
            if (!this.licenseData) {
                return { valid: false, reason: 'no_license_data' };
            }

            // Preveri revocation status, če imamo licenčni žeton
            if (this.licenseData.token) {
                const revocationStatus = await this.checkRevocationStatus(this.licenseData.token);
                if (revocationStatus.isRevoked) {
                    console.log('❌ Licenca je preklicana:', revocationStatus.reason);
                    
                    // Počisti shranjene podatke
                    await this.secureStorage.clearLicenseData();
                    this.licenseData = null;
                    
                    return { 
                        valid: false, 
                        reason: 'license_revoked',
                        revokedAt: revocationStatus.revokedAt,
                        revokedReason: revocationStatus.reason,
                        description: revocationStatus.description
                    };
                }
            }

            // Preveri, ali je potrebno online preverjanje
            const needsOnlineCheck = forceOnline || this.shouldCheckOnline();

            if (needsOnlineCheck) {
                console.log('🌐 Preverjam licenco s strežnikom...');
                
                const onlineResult = await this.checkLicenseOnline();
                
                if (onlineResult.success) {
                    this.isOnline = true;
                    this.lastCheckTime = Date.now();
                    
                    // Posodobi shranjene podatke
                    if (onlineResult.licenseData) {
                        await this.updateStoredLicense(onlineResult.licenseData);
                    }
                    
                    return { 
                        valid: onlineResult.valid, 
                        reason: onlineResult.reason,
                        licenseData: onlineResult.licenseData,
                        mode: 'online'
                    };
                } else {
                    console.warn('⚠️ Online preverjanje ni uspelo, preklapljam na offline način');
                    this.isOnline = false;
                }
            }

            // Offline validacija
            return await this.validateLicenseOffline();

        } catch (error) {
            console.error('❌ Napaka pri validaciji licence:', error);
            return { valid: false, reason: 'validation_error', error: error.message };
        }
    }

    /**
     * Preveri licenco s strežnikom (online)
     * @returns {Promise<Object>} - Rezultat online preverjanja
     */
    async checkLicenseOnline() {
        try {
            if (!this.licenseData || !this.licenseData.token || !this.licenseData.clientId) {
                return { success: false, reason: 'missing_license_data' };
            }

            // Določi URL strežnika (HTTPS ima prednost)
            const serverUrl = process.env.USE_HTTPS === 'true' 
                ? 'https://localhost:3000' 
                : 'http://localhost:3000';

            const response = await fetch(`${serverUrl}/api/license/check`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    client_id: this.licenseData.clientId,
                    license_token: this.licenseData.token
                }),
                // Za HTTPS z self-signed certifikati
                ...(process.env.USE_HTTPS === 'true' && {
                    agent: new (require('https').Agent)({
                        rejectUnauthorized: false // Samo za razvoj!
                    })
                })
            });

            if (!response.ok) {
                console.warn(`⚠️ Strežnik je vrnil status ${response.status}`);
                return { success: false, reason: 'server_error', status: response.status };
            }

            const data = await response.json();
            
            if (data.valid) {
                console.log('✅ Online validacija uspešna');
                return {
                    success: true,
                    valid: true,
                    reason: 'online_validation_success',
                    licenseData: data.license
                };
            } else {
                console.log('❌ Online validacija neuspešna:', data.reason);
                return {
                    success: true,
                    valid: false,
                    reason: data.reason || 'online_validation_failed'
                };
            }

        } catch (error) {
            console.warn('⚠️ Napaka pri online preverjanju:', error.message);
            return { success: false, reason: 'network_error', error: error.message };
        }
    }

    /**
     * Validira licenco offline (brez internetne povezave)
     * @returns {Promise<Object>} - Rezultat offline validacije
     */
    async validateLicenseOffline() {
        try {
            console.log('📴 Offline validacija licence...');

            // Preveri, ali je licenca v grace period-u
            const timeSinceLastCheck = Date.now() - (this.lastCheckTime || this.licenseData.storedAt);
            
            if (timeSinceLastCheck > this.offlineGracePeriod) {
                return {
                    valid: false,
                    reason: 'offline_grace_period_expired',
                    mode: 'offline',
                    gracePeriodExpired: true
                };
            }

            // Osnovne offline validacije
            if (!this.licenseData.token || !this.licenseData.clientId) {
                return {
                    valid: false,
                    reason: 'invalid_license_data',
                    mode: 'offline'
                };
            }

            // Če imamo shranjene podatke o poteku, jih preverimo
            if (this.licenseData.expiresAt && this.licenseData.expiresAt < Date.now()) {
                return {
                    valid: false,
                    reason: 'license_expired',
                    mode: 'offline'
                };
            }

            console.log('✅ Offline validacija uspešna');
            return {
                valid: true,
                reason: 'offline_validation_success',
                mode: 'offline',
                licenseData: this.licenseData
            };

        } catch (error) {
            console.error('❌ Napaka pri offline validaciji:', error);
            return {
                valid: false,
                reason: 'offline_validation_error',
                mode: 'offline',
                error: error.message
            };
        }
    }

    /**
     * Preveri, ali je potrebno online preverjanje
     * @returns {boolean} - Ali je potrebno online preverjanje
     */
    shouldCheckOnline() {
        // Če ni bilo še nobenega preverjanja
        if (!this.lastCheckTime) {
            return true;
        }

        // Preveri vsaj enkrat na dan
        const dayInMs = 24 * 60 * 60 * 1000;
        const timeSinceLastCheck = Date.now() - this.lastCheckTime;
        
        return timeSinceLastCheck > dayInMs;
    }

    /**
     * Posodobi shranjeno licenco z novimi podatki
     * @param {Object} newLicenseData - Novi podatki o licenci
     */
    async updateStoredLicense(newLicenseData) {
        try {
            const updatedData = {
                ...this.licenseData,
                ...newLicenseData,
                lastValidated: Date.now()
            };

            await this.secureStorage.storeLicenseToken(
                updatedData.token || updatedData.license_token,
                updatedData.clientId || updatedData.client_id
            );

            this.licenseData = updatedData;
            console.log('✅ Licenčni podatki posodobljeni');

        } catch (error) {
            console.error('❌ Napaka pri posodabljanju licence:', error);
        }
    }

    /**
     * Aktivira novo licenco
     * @param {string} licenseToken - Licenčni žeton
     * @param {string} clientId - ID odjemalca
     * @returns {Promise<Object>} - Rezultat aktivacije
     */
    async activateLicense(licenseToken, clientId) {
        try {
            console.log('🔑 Aktivacija nove licence...');

            // Shrani novo licenco
            const success = await this.secureStorage.storeLicenseToken(licenseToken, clientId);
            
            if (!success) {
                return { success: false, reason: 'storage_failed' };
            }

            // Nastavi nove podatke
            this.licenseData = {
                token: licenseToken,
                clientId: clientId,
                storedAt: Date.now()
            };

            // Validira novo licenco
            const validationResult = await this.validateLicense(true);
            
            if (validationResult.valid) {
                console.log('✅ Licenca uspešno aktivirana');
                return { success: true, licenseData: validationResult.licenseData };
            } else {
                console.log('❌ Aktivacija licence ni uspela:', validationResult.reason);
                // Izbriši neveljavno licenco
                await this.secureStorage.deleteLicenseToken();
                this.licenseData = null;
                return { success: false, reason: validationResult.reason };
            }

        } catch (error) {
            console.error('❌ Napaka pri aktivaciji licence:', error);
            return { success: false, reason: 'activation_error', error: error.message };
        }
    }

    /**
     * Deaktivira trenutno licenco
     * @returns {Promise<boolean>} - Uspešnost deaktivacije
     */
    async deactivateLicense() {
        try {
            console.log('🔓 Deaktivacija licence...');
            
            const success = await this.secureStorage.deleteLicenseToken();
            this.licenseData = null;
            this.lastCheckTime = null;
            
            console.log('✅ Licenca deaktivirana');
            return success;

        } catch (error) {
            console.error('❌ Napaka pri deaktivaciji licence:', error);
            return false;
        }
    }

    /**
     * Pridobi informacije o trenutni licenci
     * @returns {Object|null} - Podatki o licenci
     */
    getLicenseInfo() {
        if (!this.licenseData) {
            return null;
        }

        return {
            clientId: this.licenseData.clientId,
            hasToken: !!this.licenseData.token,
            storedAt: this.licenseData.storedAt,
            lastValidated: this.licenseData.lastValidated,
            isOnline: this.isOnline,
            expiresAt: this.licenseData.expiresAt
        };
    }

    /**
     * Preveri stanje internetne povezave
     * @returns {Promise<boolean>} - Ali je internetna povezava na voljo
     */
    async checkInternetConnection() {
        try {
            const result = await this.checkLicenseOnline();
            this.isOnline = result.success;
            return result.success;
        } catch (error) {
            this.isOnline = false;
            return false;
        }
    }

    /**
     * Prisilno osveži licenco s strežnikom
     * @returns {Promise<Object>} - Rezultat osvežitve
     */
    async refreshLicense() {
        try {
            console.log('🔄 Osvežujem licenco...');
            return await this.validateLicense(true);
        } catch (error) {
            console.error('❌ Napaka pri osvežitvi licence:', error);
            return { valid: false, reason: 'refresh_error', error: error.message };
        }
    }
}

module.exports = LicenseManager;