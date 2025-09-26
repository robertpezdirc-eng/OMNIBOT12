const mongoose = require('mongoose');

/**
 * Audit Log Schema za beleženje vseh aktivnosti v licenčnem sistemu
 */
const auditLogSchema = new mongoose.Schema({
    // Osnovne informacije o dogodku
    eventType: {
        type: String,
        required: true,
        enum: [
            'license_activation',
            'license_deactivation', 
            'license_validation',
            'license_renewal',
            'license_revocation',
            'license_modification',
            'client_registration',
            'client_deregistration',
            'payment_processed',
            'payment_failed',
            'notification_sent',
            'system_access',
            'security_violation',
            'admin_action',
            'api_access',
            'error_occurred'
        ]
    },
    
    // Kdo je izvedel dejanje
    userId: {
        type: String,
        required: false // Lahko je sistemsko dejanje
    },
    
    clientId: {
        type: String,
        required: false
    },
    
    // Kaj se je zgodilo
    action: {
        type: String,
        required: true,
        maxlength: 500
    },
    
    description: {
        type: String,
        maxlength: 2000
    },
    
    // Podrobnosti o licenci (če je relevantno)
    licenseInfo: {
        licenseKey: String,
        licenseType: String,
        expiresAt: Date,
        status: String
    },
    
    // Sistemske informacije
    ipAddress: {
        type: String,
        required: false
    },
    
    userAgent: {
        type: String,
        required: false
    },
    
    // Podatki o zahtevi
    requestData: {
        type: mongoose.Schema.Types.Mixed,
        required: false
    },
    
    // Podatki o odgovoru
    responseData: {
        type: mongoose.Schema.Types.Mixed,
        required: false
    },
    
    // Status dogodka
    status: {
        type: String,
        required: true,
        enum: ['success', 'failure', 'warning', 'info'],
        default: 'info'
    },
    
    // Koda napake (če je relevantno)
    errorCode: {
        type: String,
        required: false
    },
    
    errorMessage: {
        type: String,
        required: false
    },
    
    // Časovni podatki
    timestamp: {
        type: Date,
        default: Date.now,
        required: true
    },
    
    duration: {
        type: Number, // v milisekundah
        required: false
    },
    
    // Metapodatki
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        required: false
    },
    
    // Varnostni nivo
    securityLevel: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical'],
        default: 'low'
    },
    
    // Kategorija za lažje filtriranje
    category: {
        type: String,
        enum: ['license', 'payment', 'security', 'system', 'user', 'api', 'notification'],
        required: true
    },
    
    // Povezava z drugimi zapisi
    relatedLogId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'AuditLog',
        required: false
    },
    
    // Označuje, ali je zapis arhiviran
    archived: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true,
    collection: 'audit_logs'
});

// Indeksi za boljšo performanco
auditLogSchema.index({ timestamp: -1 });
auditLogSchema.index({ eventType: 1, timestamp: -1 });
auditLogSchema.index({ clientId: 1, timestamp: -1 });
auditLogSchema.index({ userId: 1, timestamp: -1 });
auditLogSchema.index({ category: 1, timestamp: -1 });
auditLogSchema.index({ securityLevel: 1, timestamp: -1 });
auditLogSchema.index({ status: 1, timestamp: -1 });
auditLogSchema.index({ archived: 1, timestamp: -1 });

// Compound indeksi
auditLogSchema.index({ eventType: 1, clientId: 1, timestamp: -1 });
auditLogSchema.index({ category: 1, status: 1, timestamp: -1 });

/**
 * Statične metode za ustvarjanje audit zapisov
 */
auditLogSchema.statics.logLicenseActivation = function(clientId, licenseKey, licenseType, userId = null, metadata = {}) {
    return this.create({
        eventType: 'license_activation',
        userId,
        clientId,
        action: 'License activated',
        description: `License ${licenseKey} activated for client ${clientId}`,
        licenseInfo: {
            licenseKey,
            licenseType,
            status: 'active'
        },
        status: 'success',
        category: 'license',
        securityLevel: 'medium',
        metadata
    });
};

auditLogSchema.statics.logLicenseValidation = function(clientId, licenseKey, validationResult, ipAddress = null, metadata = {}) {
    return this.create({
        eventType: 'license_validation',
        clientId,
        action: 'License validation performed',
        description: `License ${licenseKey} validation: ${validationResult.valid ? 'valid' : 'invalid'}`,
        licenseInfo: {
            licenseKey,
            status: validationResult.valid ? 'valid' : 'invalid'
        },
        ipAddress,
        responseData: validationResult,
        status: validationResult.valid ? 'success' : 'warning',
        category: 'license',
        securityLevel: validationResult.valid ? 'low' : 'medium',
        metadata
    });
};

auditLogSchema.statics.logSecurityViolation = function(clientId, violation, ipAddress, userAgent, metadata = {}) {
    return this.create({
        eventType: 'security_violation',
        clientId,
        action: 'Security violation detected',
        description: `Security violation: ${violation}`,
        ipAddress,
        userAgent,
        status: 'failure',
        category: 'security',
        securityLevel: 'critical',
        metadata
    });
};

auditLogSchema.statics.logPaymentEvent = function(clientId, paymentAction, amount, currency, paymentResult, metadata = {}) {
    return this.create({
        eventType: paymentResult.success ? 'payment_processed' : 'payment_failed',
        clientId,
        action: `Payment ${paymentAction}`,
        description: `Payment ${paymentAction} for ${amount} ${currency}: ${paymentResult.success ? 'successful' : 'failed'}`,
        requestData: { amount, currency, action: paymentAction },
        responseData: paymentResult,
        status: paymentResult.success ? 'success' : 'failure',
        category: 'payment',
        securityLevel: 'medium',
        metadata
    });
};

auditLogSchema.statics.logSystemAccess = function(userId, clientId, accessType, ipAddress, userAgent, metadata = {}) {
    return this.create({
        eventType: 'system_access',
        userId,
        clientId,
        action: `System access: ${accessType}`,
        description: `User accessed system via ${accessType}`,
        ipAddress,
        userAgent,
        status: 'success',
        category: 'system',
        securityLevel: 'low',
        metadata
    });
};

auditLogSchema.statics.logError = function(eventType, error, clientId = null, userId = null, metadata = {}) {
    return this.create({
        eventType: 'error_occurred',
        userId,
        clientId,
        action: `Error in ${eventType}`,
        description: `Error occurred: ${error.message}`,
        errorCode: error.code || 'UNKNOWN',
        errorMessage: error.message,
        status: 'failure',
        category: 'system',
        securityLevel: 'medium',
        metadata: {
            ...metadata,
            stack: error.stack,
            originalEventType: eventType
        }
    });
};

/**
 * Metode za poizvedbe in analitiko
 */
auditLogSchema.statics.getSecurityEvents = function(timeRange = 24) {
    const since = new Date(Date.now() - (timeRange * 60 * 60 * 1000));
    return this.find({
        category: 'security',
        timestamp: { $gte: since },
        archived: false
    }).sort({ timestamp: -1 });
};

auditLogSchema.statics.getLicenseActivity = function(clientId, timeRange = 168) { // 7 dni
    const since = new Date(Date.now() - (timeRange * 60 * 60 * 1000));
    return this.find({
        clientId,
        category: 'license',
        timestamp: { $gte: since },
        archived: false
    }).sort({ timestamp: -1 });
};

auditLogSchema.statics.getFailedEvents = function(timeRange = 24) {
    const since = new Date(Date.now() - (timeRange * 60 * 60 * 1000));
    return this.find({
        status: 'failure',
        timestamp: { $gte: since },
        archived: false
    }).sort({ timestamp: -1 });
};

auditLogSchema.statics.archiveOldLogs = function(daysOld = 90) {
    const cutoffDate = new Date(Date.now() - (daysOld * 24 * 60 * 60 * 1000));
    return this.updateMany(
        { 
            timestamp: { $lt: cutoffDate },
            archived: false,
            securityLevel: { $in: ['low', 'medium'] }
        },
        { $set: { archived: true } }
    );
};

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

module.exports = AuditLog;