// server/models/Log.js - MongoDB Model za Dnevnike
import mongoose from 'mongoose';

const { Schema } = mongoose;

// Schema za sistemske dnevnike
const logSchema = new Schema({
    // Osnovni podatki
    timestamp: {
        type: Date,
        default: Date.now,
        required: true,
        index: true
    },
    level: {
        type: String,
        enum: ['debug', 'info', 'warn', 'error', 'critical'],
        default: 'info',
        required: true,
        index: true
    },
    category: {
        type: String,
        enum: [
            'system', 'auth', 'license', 'agent', 'api', 
            'database', 'websocket', 'payment', 'backup',
            'deployment', 'monitoring', 'security'
        ],
        required: true,
        index: true
    },
    
    // Sporočilo in podrobnosti
    message: {
        type: String,
        required: true,
        maxlength: 1000
    },
    details: {
        type: Schema.Types.Mixed,
        default: {}
    },
    
    // Kontekst
    user_id: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        default: null,
        index: true
    },
    license_id: {
        type: Schema.Types.ObjectId,
        ref: 'License',
        default: null,
        index: true
    },
    session_id: {
        type: String,
        default: null,
        index: true
    },
    
    // Tehnični podatki
    ip_address: {
        type: String,
        default: null
    },
    user_agent: {
        type: String,
        default: null,
        maxlength: 500
    },
    request_id: {
        type: String,
        default: null,
        index: true
    },
    
    // Sistemski podatki
    hostname: {
        type: String,
        default: () => require('os').hostname()
    },
    process_id: {
        type: Number,
        default: process.pid
    },
    memory_usage: {
        type: Number,
        default: null
    },
    
    // Napake in stack trace
    error_code: {
        type: String,
        default: null
    },
    stack_trace: {
        type: String,
        default: null,
        maxlength: 5000
    },
    
    // Metapodatki
    tags: [{
        type: String,
        maxlength: 50
    }],
    resolved: {
        type: Boolean,
        default: false
    },
    resolved_at: {
        type: Date,
        default: null
    },
    resolved_by: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        default: null
    }
}, {
    timestamps: true,
    collection: 'logs'
});

// Indeksi za optimizacijo poizvedb
logSchema.index({ timestamp: -1 });
logSchema.index({ level: 1, timestamp: -1 });
logSchema.index({ category: 1, timestamp: -1 });
logSchema.index({ user_id: 1, timestamp: -1 });
logSchema.index({ license_id: 1, timestamp: -1 });
logSchema.index({ resolved: 1, level: 1 });

// TTL indeks za avtomatsko brisanje starih dnevnikov (90 dni)
logSchema.index({ timestamp: 1 }, { expireAfterSeconds: 7776000 });

// Statične metode
logSchema.statics.createLog = function(level, category, message, details = {}, context = {}) {
    const logEntry = new this({
        level,
        category,
        message,
        details,
        user_id: context.user_id || null,
        license_id: context.license_id || null,
        session_id: context.session_id || null,
        ip_address: context.ip_address || null,
        user_agent: context.user_agent || null,
        request_id: context.request_id || null,
        error_code: context.error_code || null,
        stack_trace: context.stack_trace || null,
        tags: context.tags || [],
        memory_usage: process.memoryUsage().heapUsed
    });
    
    return logEntry.save();
};

// Metode za različne nivoje logiranja
logSchema.statics.debug = function(category, message, details, context) {
    return this.createLog('debug', category, message, details, context);
};

logSchema.statics.info = function(category, message, details, context) {
    return this.createLog('info', category, message, details, context);
};

logSchema.statics.warn = function(category, message, details, context) {
    return this.createLog('warn', category, message, details, context);
};

logSchema.statics.error = function(category, message, details, context) {
    return this.createLog('error', category, message, details, context);
};

logSchema.statics.critical = function(category, message, details, context) {
    return this.createLog('critical', category, message, details, context);
};

// Poizvedbe za analitiko
logSchema.statics.getErrorStats = function(timeframe = 24) {
    const since = new Date(Date.now() - timeframe * 60 * 60 * 1000);
    
    return this.aggregate([
        { $match: { timestamp: { $gte: since }, level: { $in: ['error', 'critical'] } } },
        { $group: { 
            _id: { category: '$category', level: '$level' },
            count: { $sum: 1 },
            latest: { $max: '$timestamp' }
        }},
        { $sort: { count: -1 } }
    ]);
};

logSchema.statics.getUserActivity = function(userId, limit = 100) {
    return this.find({ user_id: userId })
        .sort({ timestamp: -1 })
        .limit(limit)
        .populate('user_id', 'username email')
        .populate('license_id', 'client_id plan');
};

logSchema.statics.getSystemHealth = function(timeframe = 1) {
    const since = new Date(Date.now() - timeframe * 60 * 60 * 1000);
    
    return this.aggregate([
        { $match: { timestamp: { $gte: since } } },
        { $group: {
            _id: '$level',
            count: { $sum: 1 },
            avgMemory: { $avg: '$memory_usage' }
        }},
        { $sort: { count: -1 } }
    ]);
};

// Instance metode
logSchema.methods.resolve = function(resolvedBy = null) {
    this.resolved = true;
    this.resolved_at = new Date();
    this.resolved_by = resolvedBy;
    return this.save();
};

logSchema.methods.addTag = function(tag) {
    if (!this.tags.includes(tag)) {
        this.tags.push(tag);
        return this.save();
    }
    return Promise.resolve(this);
};

// Middleware za avtomatsko dodajanje konteksta
logSchema.pre('save', function(next) {
    if (this.isNew && !this.hostname) {
        this.hostname = require('os').hostname();
    }
    if (this.isNew && !this.process_id) {
        this.process_id = process.pid;
    }
    next();
});

// Virtualni atribut za formatiran prikaz
logSchema.virtual('formatted').get(function() {
    return `[${this.timestamp.toISOString()}] ${this.level.toUpperCase()} [${this.category}] ${this.message}`;
});

export default mongoose.model('Log', logSchema);