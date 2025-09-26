/**
 * License Validator Utility
 * Napredne funkcije za validacijo licenc in upravljanje dostopa do modulov
 */

class LicenseValidator {
    constructor() {
        this.validationRules = {
            // Minimalni čas pred opozorilom o poteku (dni)
            warningDays: 7,
            // Maksimalni čas za grace period po poteku (ure)
            gracePeriodHours: 24,
            // Interval za avtomatsko preverjanje (milisekunde)
            checkInterval: 5 * 60 * 1000 // 5 minut
        };
        
        this.validationTimer = null;
        this.callbacks = {
            onExpired: null,
            onWarning: null,
            onBlocked: null,
            onValid: null
        };
    }

    /**
     * Nastavi callback funkcije za različne dogodke
     */
    setCallbacks(callbacks) {
        this.callbacks = { ...this.callbacks, ...callbacks };
    }

    /**
     * Preveri veljavnost licence z naprednimi pravili
     */
    validateLicense(license) {
        if (!license) {
            return {
                valid: false,
                status: 'missing',
                message: 'Licenca ni najdena',
                action: 'block'
            };
        }

        const now = new Date();
        const expiresAt = new Date(license.expires_at);
        const timeDiff = expiresAt - now;
        const daysRemaining = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
        const hoursRemaining = Math.ceil(timeDiff / (1000 * 60 * 60));

        // Preveri status licence
        if (license.status !== 'active') {
            return {
                valid: false,
                status: 'inactive',
                message: `Licenca je ${license.status}`,
                action: 'block'
            };
        }

        // Licenca je potekla
        if (timeDiff <= 0) {
            // Grace period - dovoli dostop še nekaj ur po poteku
            if (Math.abs(hoursRemaining) <= this.validationRules.gracePeriodHours) {
                return {
                    valid: true,
                    status: 'grace_period',
                    message: `Licenca je potekla, grace period še ${this.validationRules.gracePeriodHours + hoursRemaining} ur`,
                    action: 'warn',
                    daysRemaining: 0,
                    hoursRemaining: this.validationRules.gracePeriodHours + hoursRemaining
                };
            } else {
                return {
                    valid: false,
                    status: 'expired',
                    message: 'Licenca je potekla',
                    action: 'block',
                    daysRemaining: daysRemaining
                };
            }
        }

        // Opozorilo pred potekom
        if (daysRemaining <= this.validationRules.warningDays) {
            return {
                valid: true,
                status: 'warning',
                message: `Licenca poteče čez ${daysRemaining} dni`,
                action: 'warn',
                daysRemaining: daysRemaining
            };
        }

        // Licenca je veljavna
        return {
            valid: true,
            status: 'active',
            message: 'Licenca je veljavna',
            action: 'allow',
            daysRemaining: daysRemaining
        };
    }

    /**
     * Preveri dostop do specifičnega modula
     */
    validateModuleAccess(license, moduleKey, availableModules) {
        const licenseValidation = this.validateLicense(license);
        
        if (!licenseValidation.valid) {
            return {
                allowed: false,
                reason: licenseValidation.message,
                status: licenseValidation.status
            };
        }

        if (!availableModules.includes(moduleKey)) {
            return {
                allowed: false,
                reason: 'Modul ni vključen v vaš licenčni plan',
                status: 'module_not_included'
            };
        }

        return {
            allowed: true,
            reason: 'Dostop dovoljen',
            status: 'allowed'
        };
    }

    /**
     * Zaženi avtomatsko preverjanje licence
     */
    startAutoValidation(license, checkCallback) {
        this.stopAutoValidation();
        
        this.validationTimer = setInterval(() => {
            const validation = this.validateLicense(license);
            
            // Pokliči ustrezni callback
            switch (validation.action) {
                case 'block':
                    if (this.callbacks.onExpired) {
                        this.callbacks.onExpired(validation);
                    }
                    break;
                case 'warn':
                    if (this.callbacks.onWarning) {
                        this.callbacks.onWarning(validation);
                    }
                    break;
                case 'allow':
                    if (this.callbacks.onValid) {
                        this.callbacks.onValid(validation);
                    }
                    break;
            }
            
            if (checkCallback) {
                checkCallback(validation);
            }
            
        }, this.validationRules.checkInterval);
        
        console.log('🔄 Avtomatsko preverjanje licence aktivirano');
    }

    /**
     * Ustavi avtomatsko preverjanje
     */
    stopAutoValidation() {
        if (this.validationTimer) {
            clearInterval(this.validationTimer);
            this.validationTimer = null;
            console.log('⏹️ Avtomatsko preverjanje licence ustavljeno');
        }
    }

    /**
     * Generiraj poročilo o licenci
     */
    generateLicenseReport(license) {
        const validation = this.validateLicense(license);
        const now = new Date();
        
        return {
            timestamp: now.toISOString(),
            client_id: license?.client_id || 'N/A',
            plan: license?.plan || 'N/A',
            status: validation.status,
            valid: validation.valid,
            message: validation.message,
            expires_at: license?.expires_at || 'N/A',
            days_remaining: validation.daysRemaining || 0,
            active_modules: license?.active_modules || [],
            company_name: license?.company_name || 'N/A',
            last_check: now.toLocaleString('sl-SI')
        };
    }

    /**
     * Preveri sistemske zahteve za licenco
     */
    checkSystemRequirements(license) {
        const requirements = {
            minimum_plan: 'demo',
            required_modules: [],
            max_offline_days: 30
        };

        const issues = [];

        // Preveri plan
        const planHierarchy = ['demo', 'basic', 'premium'];
        const currentPlanIndex = planHierarchy.indexOf(license?.plan);
        const requiredPlanIndex = planHierarchy.indexOf(requirements.minimum_plan);
        
        if (currentPlanIndex < requiredPlanIndex) {
            issues.push(`Potreben je vsaj ${requirements.minimum_plan} plan`);
        }

        // Preveri module
        const missingModules = requirements.required_modules.filter(
            module => !license?.active_modules?.includes(module)
        );
        
        if (missingModules.length > 0) {
            issues.push(`Manjkajo moduli: ${missingModules.join(', ')}`);
        }

        return {
            passed: issues.length === 0,
            issues: issues,
            requirements: requirements
        };
    }
}

module.exports = LicenseValidator;