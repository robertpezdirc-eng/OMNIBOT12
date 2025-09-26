const mongoose = require('mongoose');

const licenseSchema = new mongoose.Schema({
    client_id: { 
        type: String, 
        required: true, 
        unique: true,
        index: true
    },
    license_token: { 
        type: String, 
        required: true,
        unique: true
    },
    plan: { 
        type: String, 
        enum: ['demo', 'basic', 'premium'], 
        default: 'demo',
        required: true
    },
    expires_at: { 
        type: Date, 
        required: true,
        index: true
    },
    status: { 
        type: String, 
        enum: ['active', 'inactive', 'expired'], 
        default: 'active',
        required: true
    },
    active_modules: {
        type: [String],
        default: function() {
            switch(this.plan) {
                case 'demo':
                    return ['ceniki'];
                case 'basic':
                    return ['ceniki', 'blagajna'];
                case 'premium':
                    return ['ceniki', 'blagajna', 'zaloge', 'AI_optimizacija'];
                default:
                    return [];
            }
        }
    },
    last_check: { 
        type: Date, 
        default: Date.now,
        index: true
    },
    created_at: {
        type: Date,
        default: Date.now
    },
    updated_at: {
        type: Date,
        default: Date.now
    },
    // Dodatni metadata
    company_name: {
        type: String,
        default: ''
    },
    contact_email: {
        type: String,
        default: ''
    },
    max_users: {
        type: Number,
        default: function() {
            switch(this.plan) {
                case 'demo': return 1;
                case 'basic': return 5;
                case 'premium': return 50;
                default: return 1;
            }
        }
    },
    // Statistike uporabe
    usage_stats: {
        total_api_calls: { type: Number, default: 0 },
        last_api_call: { type: Date, default: null },
        total_logins: { type: Number, default: 0 },
        last_login: { type: Date, default: null }
    },
    // Aktivnost in povezljivost
    last_activity: { 
        type: Date, 
        default: null,
        index: true
    },
    activity_log: [{
        timestamp: { type: Date, default: Date.now },
        action: { type: String, required: true },
        ip_address: { type: String, default: null },
        user_agent: { type: String, default: null },
        details: { type: mongoose.Schema.Types.Mixed, default: {} }
    }]
}, {
    timestamps: true, // Avtomatsko doda createdAt in updatedAt
    collection: 'licenses'
});

// Middleware za posodobitev updated_at
licenseSchema.pre('save', function(next) {
    this.updated_at = new Date();
    next();
});

// Middleware za preverjanje poteka licence
licenseSchema.pre('save', function(next) {
    if (this.expires_at < new Date() && this.status === 'active') {
        this.status = 'expired';
    }
    next();
});

// Virtualni atribut za preverjanje veljavnosti
licenseSchema.virtual('is_valid').get(function() {
    return this.status === 'active' && this.expires_at > new Date();
});

// Virtualni atribut za dni do poteka
licenseSchema.virtual('days_until_expiry').get(function() {
    const now = new Date();
    const expiry = new Date(this.expires_at);
    const diffTime = expiry - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
});

// Statične metode
licenseSchema.statics.findByClientId = function(client_id) {
    return this.findOne({ client_id: client_id });
};

licenseSchema.statics.findActiveLicenses = function() {
    return this.find({ 
        status: 'active',
        expires_at: { $gt: new Date() }
    });
};

licenseSchema.statics.findExpiringSoon = function(days = 7) {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);
    
    return this.find({
        status: 'active',
        expires_at: { 
            $gt: new Date(),
            $lte: futureDate
        }
    });
};

// Instance metode
licenseSchema.methods.extend = function(days) {
    const newExpiry = new Date(this.expires_at);
    newExpiry.setDate(newExpiry.getDate() + days);
    this.expires_at = newExpiry;
    
    if (this.status === 'expired') {
        this.status = 'active';
    }
    
    return this.save();
};

licenseSchema.methods.deactivate = function() {
    this.status = 'inactive';
    return this.save();
};

licenseSchema.methods.activate = function() {
    if (this.expires_at > new Date()) {
        this.status = 'active';
    }
    return this.save();
};

licenseSchema.methods.updateUsageStats = function(type) {
    if (type === 'api_call') {
        this.usage_stats.total_api_calls += 1;
        this.usage_stats.last_api_call = new Date();
    } else if (type === 'login') {
        this.usage_stats.total_logins += 1;
        this.usage_stats.last_login = new Date();
    }
    
    // Update last activity
    this.last_activity = new Date();
    
    return this.save();
};

// Metoda za beleženje aktivnosti
licenseSchema.methods.logActivity = function(action, ipAddress = null, userAgent = null, details = {}) {
    const activityEntry = {
        timestamp: new Date(),
        action: action,
        ip_address: ipAddress,
        user_agent: userAgent,
        details: details
    };
    
    // Dodaj v activity log (obdrži samo zadnjih 100 vnosov)
    this.activity_log.push(activityEntry);
    if (this.activity_log.length > 100) {
        this.activity_log = this.activity_log.slice(-100);
    }
    
    // Posodobi last_activity
    this.last_activity = new Date();
    
    return this.save();
};

// Metoda za pridobitev nedavne aktivnosti
licenseSchema.methods.getRecentActivity = function(limit = 10) {
    return this.activity_log
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, limit);
};

// Indeksi za optimizacijo
licenseSchema.index({ client_id: 1, status: 1 });
licenseSchema.index({ expires_at: 1, status: 1 });
licenseSchema.index({ plan: 1, status: 1 });

module.exports = mongoose.model('License', licenseSchema);