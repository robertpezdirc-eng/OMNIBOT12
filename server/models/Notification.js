const mongoose = require('mongoose');

/**
 * Notification Schema - za shranjevanje obvestil o licencah
 */
const notificationSchema = new mongoose.Schema({
    // Identifikacija
    client_id: {
        type: String,
        required: true,
        index: true
    },
    license_token: {
        type: String,
        required: true,
        index: true
    },
    
    // Tip notifikacije
    type: {
        type: String,
        required: true,
        enum: [
            'license_expiring_soon',    // Licenca bo kmalu potekla
            'license_expired',          // Licenca je potekla
            'demo_expiring_soon',       // Demo bo kmalu potekel
            'demo_expired',             // Demo je potekel
            'license_revoked',          // Licenca je bila preklicana
            'payment_failed',           // Plačilo ni uspelo
            'renewal_reminder',         // Opomnik za podaljšanje
            'upgrade_available'         // Na voljo je nadgradnja
        ]
    },
    
    // Vsebina notifikacije
    title: {
        type: String,
        required: true,
        maxlength: 200
    },
    message: {
        type: String,
        required: true,
        maxlength: 1000
    },
    
    // Prioriteta
    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical'],
        default: 'medium'
    },
    
    // Status
    status: {
        type: String,
        enum: ['pending', 'sent', 'delivered', 'read', 'dismissed'],
        default: 'pending'
    },
    
    // Kanali pošiljanja
    channels: {
        email: {
            enabled: { type: Boolean, default: true },
            sent_at: Date,
            delivered_at: Date,
            error: String
        },
        in_app: {
            enabled: { type: Boolean, default: true },
            shown_at: Date,
            dismissed_at: Date
        },
        push: {
            enabled: { type: Boolean, default: false },
            sent_at: Date,
            delivered_at: Date,
            error: String
        }
    },
    
    // Časovni podatki
    scheduled_for: {
        type: Date,
        default: Date.now
    },
    sent_at: Date,
    read_at: Date,
    dismissed_at: Date,
    
    // Dodatni podatki
    metadata: {
        license_type: String,
        expires_at: Date,
        days_until_expiry: Number,
        action_required: Boolean,
        action_url: String,
        retry_count: { type: Number, default: 0 },
        max_retries: { type: Number, default: 3 }
    }
}, {
    timestamps: true,
    collection: 'notifications'
});

// Indeksi za optimizacijo
notificationSchema.index({ client_id: 1, type: 1 });
notificationSchema.index({ scheduled_for: 1, status: 1 });
notificationSchema.index({ createdAt: 1 });
notificationSchema.index({ 'metadata.expires_at': 1 });

/**
 * Statične metode
 */

// Ustvari notifikacijo za potek licence
notificationSchema.statics.createExpiryNotification = async function(licenseData, daysUntilExpiry) {
    const isDemo = licenseData.type === 'demo';
    const isExpired = daysUntilExpiry <= 0;
    
    let type, title, message, priority;
    
    if (isDemo) {
        if (isExpired) {
            type = 'demo_expired';
            title = 'Demo licenca je potekla';
            message = 'Vaša demo licenca je potekla. Za nadaljevanje uporabe aplikacije potrebujete veljavno licenco.';
            priority = 'critical';
        } else {
            type = 'demo_expiring_soon';
            title = `Demo licenca bo potekla čez ${daysUntilExpiry} dni`;
            message = `Vaša demo licenca bo potekla čez ${daysUntilExpiry} dni. Priporočamo, da si zagotovite polno licenco.`;
            priority = daysUntilExpiry <= 3 ? 'high' : 'medium';
        }
    } else {
        if (isExpired) {
            type = 'license_expired';
            title = 'Licenca je potekla';
            message = 'Vaša licenca je potekla. Prosimo, podaljšajte naročnino za nadaljevanje uporabe.';
            priority = 'critical';
        } else {
            type = 'license_expiring_soon';
            title = `Licenca bo potekla čez ${daysUntilExpiry} dni`;
            message = `Vaša licenca bo potekla čez ${daysUntilExpiry} dni. Priporočamo, da jo podaljšate pravočasno.`;
            priority = daysUntilExpiry <= 7 ? 'high' : 'medium';
        }
    }
    
    return await this.create({
        client_id: licenseData.client_id,
        license_token: licenseData.token,
        type,
        title,
        message,
        priority,
        metadata: {
            license_type: licenseData.type,
            expires_at: licenseData.expires_at,
            days_until_expiry: daysUntilExpiry,
            action_required: true,
            action_url: isDemo ? '/license/purchase' : '/license/renew'
        }
    });
};

// Ustvari notifikacijo za preklic licence
notificationSchema.statics.createRevocationNotification = async function(licenseData, reason) {
    return await this.create({
        client_id: licenseData.client_id,
        license_token: licenseData.token,
        type: 'license_revoked',
        title: 'Licenca je bila preklicana',
        message: `Vaša licenca je bila preklicana. Razlog: ${reason}`,
        priority: 'critical',
        metadata: {
            license_type: licenseData.type,
            action_required: true,
            action_url: '/license/support'
        }
    });
};

// Pridobi neobdelane notifikacije
notificationSchema.statics.getPendingNotifications = async function(limit = 50) {
    return await this.find({
        status: 'pending',
        scheduled_for: { $lte: new Date() }
    })
    .sort({ priority: -1, scheduled_for: 1 })
    .limit(limit);
};

// Pridobi notifikacije za odjemalca
notificationSchema.statics.getClientNotifications = async function(clientId, options = {}) {
    const {
        status = null,
        type = null,
        limit = 20,
        skip = 0,
        unreadOnly = false
    } = options;
    
    const query = { client_id: clientId };
    
    if (status) query.status = status;
    if (type) query.type = type;
    if (unreadOnly) query.read_at = { $exists: false };
    
    return await this.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);
};

// Označi kot prebrano
notificationSchema.methods.markAsRead = async function() {
    this.status = 'read';
    this.read_at = new Date();
    return await this.save();
};

// Označi kot poslano
notificationSchema.methods.markAsSent = async function(channel = 'email') {
    this.status = 'sent';
    this.sent_at = new Date();
    
    if (this.channels[channel]) {
        this.channels[channel].sent_at = new Date();
    }
    
    return await this.save();
};

// Označi kot dostavljeno
notificationSchema.methods.markAsDelivered = async function(channel = 'email') {
    this.status = 'delivered';
    
    if (this.channels[channel]) {
        this.channels[channel].delivered_at = new Date();
    }
    
    return await this.save();
};

// Zavrni notifikacijo
notificationSchema.methods.dismiss = async function() {
    this.status = 'dismissed';
    this.dismissed_at = new Date();
    this.channels.in_app.dismissed_at = new Date();
    return await this.save();
};

module.exports = mongoose.model('Notification', notificationSchema);