const rateLimit = require('express-rate-limit');

// Lokalna definicija colorLog funkcije
const colorLog = (message, color = 'white') => {
    const colors = {
        red: '\x1b[31m',
        green: '\x1b[32m',
        yellow: '\x1b[33m',
        blue: '\x1b[34m',
        magenta: '\x1b[35m',
        cyan: '\x1b[36m',
        white: '\x1b[37m',
        reset: '\x1b[0m'
    };
    console.log(`${colors[color] || colors.white}${message}${colors.reset}`);
};

// Brute-force protection storage
const bruteForceAttempts = new Map();
const blacklistedIPs = new Set();

// Progressive delay function for brute-force protection
const getProgressiveDelay = (attempts) => {
    if (attempts <= 3) return 0;
    if (attempts <= 5) return 30 * 1000; // 30 seconds
    if (attempts <= 10) return 5 * 60 * 1000; // 5 minutes
    if (attempts <= 20) return 15 * 60 * 1000; // 15 minutes
    return 60 * 60 * 1000; // 1 hour
};

// Advanced brute-force protection middleware
const advancedBruteForceProtection = (req, res, next) => {
    const clientIP = req.ip || req.connection.remoteAddress;
    
    // Check if IP is blacklisted
    if (blacklistedIPs.has(clientIP)) {
        colorLog(`🚨 Blacklisted IP attempt: ${clientIP}`, 'red');
        return res.status(403).json({
            success: false,
            error: 'IP naslov je blokiran',
            message: 'Vaš IP naslov je bil blokiran zaradi sumljivih aktivnosti.',
            error_code: 'IP_BLACKLISTED'
        });
    }

    // Get current attempts for this IP
    const attempts = bruteForceAttempts.get(clientIP) || { count: 0, lastAttempt: Date.now() };
    const timeSinceLastAttempt = Date.now() - attempts.lastAttempt;
    const requiredDelay = getProgressiveDelay(attempts.count);

    // Check if enough time has passed since last attempt
    if (timeSinceLastAttempt < requiredDelay) {
        const remainingTime = Math.ceil((requiredDelay - timeSinceLastAttempt) / 1000);
        colorLog(`⏰ Progressive delay active for IP: ${clientIP}, remaining: ${remainingTime}s`, 'yellow');
        
        return res.status(429).json({
            success: false,
            error: 'Progresivna zaščita aktivna',
            message: `Počakajte ${remainingTime} sekund pred naslednjim poskusom.`,
            error_code: 'PROGRESSIVE_DELAY',
            retry_after: remainingTime,
            attempts: attempts.count
        });
    }

    // Reset attempts if enough time has passed (1 hour)
    if (timeSinceLastAttempt > 60 * 60 * 1000) {
        attempts.count = 0;
    }

    // Store middleware reference for later use
    req.bruteForceAttempts = attempts;
    req.clientIP = clientIP;
    
    next();
};

// Function to record failed attempt
const recordFailedAttempt = (req) => {
    const clientIP = req.clientIP || req.ip;
    const attempts = bruteForceAttempts.get(clientIP) || { count: 0, lastAttempt: Date.now() };
    
    attempts.count++;
    attempts.lastAttempt = Date.now();
    bruteForceAttempts.set(clientIP, attempts);

    colorLog(`🔍 Failed attempt recorded for IP: ${clientIP}, total: ${attempts.count}`, 'yellow');

    // Blacklist IP after 50 failed attempts
    if (attempts.count >= 50) {
        blacklistedIPs.add(clientIP);
        colorLog(`🚨 IP blacklisted due to excessive attempts: ${clientIP}`, 'red');
    }
};

// Function to record successful attempt
const recordSuccessfulAttempt = (req) => {
    const clientIP = req.clientIP || req.ip;
    const attempts = bruteForceAttempts.get(clientIP);
    
    if (attempts && attempts.count > 0) {
        // Reduce attempt count on successful operation
        attempts.count = Math.max(0, attempts.count - 2);
        attempts.lastAttempt = Date.now();
        bruteForceAttempts.set(clientIP, attempts);
        colorLog(`✅ Successful attempt recorded for IP: ${clientIP}, remaining: ${attempts.count}`, 'green');
    }
};

// General API rate limiter
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: {
        error: 'Preveč zahtev',
        message: 'Presegli ste omejitev zahtev. Poskusite znova čez 15 minut.',
        retry_after: '15 minut'
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        colorLog(`⚠️ Rate limit exceeded for IP: ${req.ip} on ${req.path}`, 'yellow');
        recordFailedAttempt(req);
        res.status(429).json({
            error: 'Preveč zahtev',
            message: 'Presegli ste omejitev zahtev. Poskusite znova čez 15 minut.',
            retry_after: '15 minut',
            limit: 100,
            window: '15 minut'
        });
    }
});

// Strict rate limiter for license validation
const licenseCheckLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 10, // Limit each IP to 10 license checks per minute
    message: {
        error: 'Preveč preverjanj licence',
        message: 'Presegli ste omejitev preverjanj licence. Poskusite znova čez 1 minuto.',
        retry_after: '1 minuta'
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        colorLog(`⚠️ License check rate limit exceeded for IP: ${req.ip}`, 'red');
        recordFailedAttempt(req);
        res.status(429).json({
            valid: false,
            error: 'Preveč preverjanj licence',
            message: 'Presegli ste omejitev preverjanj licence. Poskusite znova čez 1 minuto.',
            error_code: 'RATE_LIMIT_EXCEEDED',
            retry_after: '1 minuta',
            limit: 10,
            window: '1 minuta'
        });
    }
});

// Moderate rate limiter for token operations
const tokenLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 20, // Limit each IP to 20 token operations per 5 minutes
    message: {
        error: 'Preveč token operacij',
        message: 'Presegli ste omejitev token operacij. Poskusite znova čez 5 minut.',
        retry_after: '5 minut'
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        colorLog(`⚠️ Token operation rate limit exceeded for IP: ${req.ip} on ${req.path}`, 'yellow');
        recordFailedAttempt(req);
        res.status(429).json({
            success: false,
            error: 'Preveč token operacij',
            message: 'Presegli ste omejitev token operacij. Poskusite znova čez 5 minut.',
            retry_after: '5 minut',
            limit: 20,
            window: '5 minut'
        });
    }
});

// Strict rate limiter for admin operations
const adminLimiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 50, // Limit each IP to 50 admin operations per 10 minutes
    message: {
        error: 'Preveč admin operacij',
        message: 'Presegli ste omejitev admin operacij. Poskusite znova čez 10 minut.',
        retry_after: '10 minut'
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        colorLog(`⚠️ Admin operation rate limit exceeded for IP: ${req.ip} on ${req.path}`, 'red');
        recordFailedAttempt(req);
        res.status(429).json({
            success: false,
            error: 'Preveč admin operacij',
            message: 'Presegli ste omejitev admin operacij. Poskusite znova čez 10 minut.',
            retry_after: '10 minut',
            limit: 50,
            window: '10 minut'
        });
    }
});

// Very strict rate limiter for license creation
const createLicenseLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5, // Limit each IP to 5 license creations per hour
    message: {
        error: 'Preveč ustvarjanj licenc',
        message: 'Presegli ste omejitev ustvarjanja licenc. Poskusite znova čez 1 uro.',
        retry_after: '1 ura'
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        colorLog(`⚠️ License creation rate limit exceeded for IP: ${req.ip}`, 'red');
        recordFailedAttempt(req);
        res.status(429).json({
            success: false,
            error: 'Preveč ustvarjanj licenc',
            message: 'Presegli ste omejitev ustvarjanja licenc. Poskusite znova čez 1 uro.',
            error_code: 'RATE_LIMIT_EXCEEDED',
            retry_after: '1 ura',
            limit: 5,
            window: '1 ura'
        });
    }
});

// Rate limiter for activity log requests
const activityLimiter = rateLimit({
    windowMs: 2 * 60 * 1000, // 2 minutes
    max: 15, // Limit each IP to 15 activity requests per 2 minutes
    message: {
        error: 'Preveč zahtev za dnevnik',
        message: 'Presegli ste omejitev zahtev za dnevnik aktivnosti. Poskusite znova čez 2 minuti.',
        retry_after: '2 minuti'
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        colorLog(`⚠️ Activity log rate limit exceeded for IP: ${req.ip}`, 'yellow');
        recordFailedAttempt(req);
        res.status(429).json({
            success: false,
            error: 'Preveč zahtev za dnevnik',
            message: 'Presegli ste omejitev zahtev za dnevnik aktivnosti. Poskusite znova čez 2 minuti.',
            retry_after: '2 minuti',
            limit: 15,
            window: '2 minuti'
        });
    }
});

// Enhanced brute-force protection for authentication
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 failed login attempts per 15 minutes
    skipSuccessfulRequests: true, // Don't count successful requests
    message: {
        error: 'Preveč poskusov prijave',
        message: 'Presegli ste omejitev poskusov prijave. Poskusite znova čez 15 minut.',
        retry_after: '15 minut'
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        colorLog(`🚨 Brute-force attempt detected for IP: ${req.ip}`, 'red');
        recordFailedAttempt(req);
        res.status(429).json({
            success: false,
            error: 'Preveč poskusov prijave',
            message: 'Presegli ste omejitev poskusov prijave. Poskusite znova čez 15 minut.',
            error_code: 'BRUTE_FORCE_PROTECTION',
            retry_after: '15 minut',
            limit: 5,
            window: '15 minut'
        });
    }
});

// Batch operations rate limiter
const batchLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 10, // Limit each IP to 10 batch operations per 5 minutes
    message: {
        error: 'Preveč množičnih operacij',
        message: 'Presegli ste omejitev množičnih operacij. Poskusite znova čez 5 minut.',
        retry_after: '5 minut'
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        colorLog(`⚠️ Batch operation rate limit exceeded for IP: ${req.ip}`, 'yellow');
        recordFailedAttempt(req);
        res.status(429).json({
            success: false,
            error: 'Preveč množičnih operacij',
            message: 'Presegli ste omejitev množičnih operacij. Poskusite znova čez 5 minut.',
            retry_after: '5 minut',
            limit: 10,
            window: '5 minut'
        });
    }
});

// Suspicious activity detector
const suspiciousActivityLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 50, // Very high limit for detection
    message: {
        error: 'Sumljiva aktivnost',
        message: 'Zaznana je bila sumljiva aktivnost. Dostop je začasno omejen.',
        retry_after: '5 minut'
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        colorLog(`🚨 Suspicious activity detected for IP: ${req.ip}`, 'red');
        recordFailedAttempt(req);
        
        // Add to temporary blacklist for 5 minutes
        const tempBlacklist = setTimeout(() => {
            blacklistedIPs.delete(req.ip);
            colorLog(`🔓 Temporary blacklist removed for IP: ${req.ip}`, 'green');
        }, 5 * 60 * 1000);
        
        blacklistedIPs.add(req.ip);
        
        res.status(429).json({
            success: false,
            error: 'Sumljiva aktivnost',
            message: 'Zaznana je bila sumljiva aktivnost. Dostop je začasno omejen.',
            error_code: 'SUSPICIOUS_ACTIVITY',
            retry_after: '5 minut'
        });
    }
});

// Admin function to manage blacklist
const manageBlacklist = {
    add: (ip) => {
        blacklistedIPs.add(ip);
        colorLog(`🚫 IP manually blacklisted: ${ip}`, 'red');
    },
    remove: (ip) => {
        blacklistedIPs.delete(ip);
        bruteForceAttempts.delete(ip);
        colorLog(`✅ IP removed from blacklist: ${ip}`, 'green');
    },
    list: () => Array.from(blacklistedIPs),
    clear: () => {
        blacklistedIPs.clear();
        bruteForceAttempts.clear();
        colorLog(`🧹 Blacklist and attempts cleared`, 'blue');
    },
    getAttempts: (ip) => bruteForceAttempts.get(ip) || { count: 0, lastAttempt: 0 }
};

module.exports = {
    generalLimiter,
    licenseCheckLimiter,
    tokenLimiter,
    adminLimiter,
    createLicenseLimiter,
    activityLimiter,
    authLimiter,
    batchLimiter,
    suspiciousActivityLimiter,
    advancedBruteForceProtection,
    recordFailedAttempt,
    recordSuccessfulAttempt,
    manageBlacklist
};