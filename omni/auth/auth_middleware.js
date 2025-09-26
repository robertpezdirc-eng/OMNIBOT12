class AuthMiddleware {
    constructor(userManager) {
        this.userManager = userManager;
    }

    // Middleware za avtentifikacijo
    authenticate() {
        return (req, res, next) => {
            try {
                // Pridobivanje tokena iz headerja ali query parametra
                let token = req.headers.authorization;
                
                if (token && token.startsWith('Bearer ')) {
                    token = token.slice(7);
                } else if (req.query.token) {
                    token = req.query.token;
                } else {
                    return res.status(401).json({
                        success: false,
                        message: 'Dostop zavrnjen - manjka avtentifikacijski token'
                    });
                }

                // Preverjanje tokena
                const decoded = this.userManager.verifyToken(token);
                const user = this.userManager.getUserById(decoded.userId);

                if (!user || !user.isActive) {
                    return res.status(401).json({
                        success: false,
                        message: 'Dostop zavrnjen - neveljaven uporabnik'
                    });
                }

                // Dodajanje uporabnika v request
                req.user = user;
                req.userPermissions = decoded.permissions;
                
                next();
            } catch (error) {
                return res.status(401).json({
                    success: false,
                    message: 'Dostop zavrnjen - neveljaven token',
                    error: error.message
                });
            }
        };
    }

    // Middleware za avtorizacijo (preverjanje dovoljenj)
    authorize(requiredPermission) {
        return (req, res, next) => {
            if (!req.user) {
                return res.status(401).json({
                    success: false,
                    message: 'Dostop zavrnjen - niste prijavljeni'
                });
            }

            if (!this.userManager.hasPermission(req.user.id, requiredPermission)) {
                return res.status(403).json({
                    success: false,
                    message: `Dostop zavrnjen - potrebno dovoljenje: ${requiredPermission}`
                });
            }

            next();
        };
    }

    // Middleware za preverjanje vloge
    requireRole(requiredRole) {
        return (req, res, next) => {
            if (!req.user) {
                return res.status(401).json({
                    success: false,
                    message: 'Dostop zavrnjen - niste prijavljeni'
                });
            }

            if (req.user.role !== requiredRole) {
                return res.status(403).json({
                    success: false,
                    message: `Dostop zavrnjen - potrebna vloga: ${requiredRole}`
                });
            }

            next();
        };
    }

    // Middleware za preverjanje več vlog
    requireAnyRole(allowedRoles) {
        return (req, res, next) => {
            if (!req.user) {
                return res.status(401).json({
                    success: false,
                    message: 'Dostop zavrnjen - niste prijavljeni'
                });
            }

            if (!allowedRoles.includes(req.user.role)) {
                return res.status(403).json({
                    success: false,
                    message: `Dostop zavrnjen - potrebna ena od vlog: ${allowedRoles.join(', ')}`
                });
            }

            next();
        };
    }

    // Opcijski middleware za avtentifikacijo (ne zavrne zahteve, če ni tokena)
    optionalAuth() {
        return (req, res, next) => {
            try {
                let token = req.headers.authorization;
                
                if (token && token.startsWith('Bearer ')) {
                    token = token.slice(7);
                    const decoded = this.userManager.verifyToken(token);
                    const user = this.userManager.getUserById(decoded.userId);

                    if (user && user.isActive) {
                        req.user = user;
                        req.userPermissions = decoded.permissions;
                    }
                }
            } catch (error) {
                // Tiho ignoriranje napak pri opcijski avtentifikaciji
            }
            
            next();
        };
    }

    // Middleware za beleženje aktivnosti
    logActivity() {
        return (req, res, next) => {
            if (req.user) {
                console.log(`📊 ${req.user.username} (${req.user.role}): ${req.method} ${req.path}`);
            }
            next();
        };
    }

    // Middleware za rate limiting po uporabniku
    rateLimitByUser(maxRequests = 100, windowMs = 60000) {
        const userRequests = new Map();

        return (req, res, next) => {
            if (!req.user) {
                return next();
            }

            const userId = req.user.id;
            const now = Date.now();
            const windowStart = now - windowMs;

            // Pridobivanje ali ustvarjanje seznama zahtev za uporabnika
            if (!userRequests.has(userId)) {
                userRequests.set(userId, []);
            }

            const requests = userRequests.get(userId);
            
            // Odstranjevanje starih zahtev
            const recentRequests = requests.filter(timestamp => timestamp > windowStart);
            userRequests.set(userId, recentRequests);

            // Preverjanje limita
            if (recentRequests.length >= maxRequests) {
                return res.status(429).json({
                    success: false,
                    message: 'Preveč zahtev - poskusite znova pozneje',
                    retryAfter: Math.ceil(windowMs / 1000)
                });
            }

            // Dodajanje trenutne zahteve
            recentRequests.push(now);
            
            next();
        };
    }

    // Middleware za preverjanje IP naslova
    checkIPWhitelist(allowedIPs = []) {
        return (req, res, next) => {
            if (allowedIPs.length === 0) {
                return next();
            }

            const clientIP = req.ip || req.connection.remoteAddress || req.socket.remoteAddress;
            
            if (!allowedIPs.includes(clientIP)) {
                console.log(`🚫 Dostop zavrnjen za IP: ${clientIP}`);
                return res.status(403).json({
                    success: false,
                    message: 'Dostop zavrnjen - IP naslov ni dovoljen'
                });
            }

            next();
        };
    }

    // Middleware za CORS z avtentifikacijo
    corsWithAuth() {
        return (req, res, next) => {
            // Osnovni CORS headerji
            res.header('Access-Control-Allow-Origin', '*');
            res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
            res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');

            // Preflight zahteve
            if (req.method === 'OPTIONS') {
                return res.sendStatus(200);
            }

            next();
        };
    }

    // Middleware za varnostne headerje
    securityHeaders() {
        return (req, res, next) => {
            res.header('X-Content-Type-Options', 'nosniff');
            res.header('X-Frame-Options', 'DENY');
            res.header('X-XSS-Protection', '1; mode=block');
            res.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
            res.header('Referrer-Policy', 'strict-origin-when-cross-origin');
            
            next();
        };
    }

    // Kombiniran middleware za osnovne varnostne funkcije
    basicSecurity() {
        return [
            this.corsWithAuth(),
            this.securityHeaders(),
            this.logActivity()
        ];
    }

    // Kombiniran middleware za polno avtentifikacijo in avtorizacijo
    fullAuth(requiredPermission) {
        return [
            this.authenticate(),
            this.authorize(requiredPermission),
            this.rateLimitByUser()
        ];
    }

    // Middleware za admin dostop
    adminOnly() {
        return [
            this.authenticate(),
            this.requireRole('admin')
        ];
    }

    // Middleware za manager ali admin dostop
    managerOrAdmin() {
        return [
            this.authenticate(),
            this.requireAnyRole(['manager', 'admin'])
        ];
    }
}

module.exports = AuthMiddleware;