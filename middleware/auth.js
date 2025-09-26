// 🌟 Omni AI Platform - Authentication Middleware
// JWT avtentikacija in avtorizacija

const jwt = require('jsonwebtoken');
const User = require('../models/User');

class AuthMiddleware {
    constructor(db, jwtSecret) {
        this.userModel = new User(db);
        this.jwtSecret = jwtSecret || process.env.JWT_SECRET || 'default-secret';
    }

    // Generiraj JWT token
    generateToken(user) {
        const payload = {
            userId: user._id,
            email: user.email,
            role: user.role,
            permissions: user.permissions
        };

        return jwt.sign(payload, this.jwtSecret, {
            expiresIn: '24h',
            issuer: 'omni-platform',
            audience: 'omni-users'
        });
    }

    // Generiraj refresh token
    generateRefreshToken(user) {
        const payload = {
            userId: user._id,
            type: 'refresh'
        };

        return jwt.sign(payload, this.jwtSecret, {
            expiresIn: '7d',
            issuer: 'omni-platform',
            audience: 'omni-users'
        });
    }

    // Middleware za preverjanje JWT tokena
    authenticateToken() {
        return async (req, res, next) => {
            try {
                const authHeader = req.headers['authorization'];
                const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

                if (!token) {
                    return res.status(401).json({
                        success: false,
                        error: 'Dostop zavrnjen - manjka avtentikacijski token'
                    });
                }

                const decoded = jwt.verify(token, this.jwtSecret);
                
                // Preveri, če uporabnik še vedno obstaja in je aktiven
                const user = await this.userModel.getUserById(decoded.userId);
                if (!user || user.status !== 'active') {
                    return res.status(401).json({
                        success: false,
                        error: 'Neveljaven token - uporabnik ni aktiven'
                    });
                }

                // Dodaj uporabniške podatke v request
                req.user = {
                    id: decoded.userId,
                    email: decoded.email,
                    role: decoded.role,
                    permissions: decoded.permissions,
                    fullUser: user
                };

                next();
            } catch (error) {
                if (error.name === 'TokenExpiredError') {
                    return res.status(401).json({
                        success: false,
                        error: 'Token je potekel'
                    });
                } else if (error.name === 'JsonWebTokenError') {
                    return res.status(401).json({
                        success: false,
                        error: 'Neveljaven token'
                    });
                }

                return res.status(500).json({
                    success: false,
                    error: 'Napaka pri avtentikaciji'
                });
            }
        };
    }

    // Middleware za preverjanje vlog
    requireRole(roles) {
        return (req, res, next) => {
            if (!req.user) {
                return res.status(401).json({
                    success: false,
                    error: 'Avtentikacija je potrebna'
                });
            }

            const userRole = req.user.role;
            const allowedRoles = Array.isArray(roles) ? roles : [roles];

            if (!allowedRoles.includes(userRole)) {
                return res.status(403).json({
                    success: false,
                    error: 'Nimate dovoljenj za to dejanje'
                });
            }

            next();
        };
    }

    // Middleware za preverjanje specifičnih dovoljenj
    requirePermission(permission) {
        return async (req, res, next) => {
            if (!req.user) {
                return res.status(401).json({
                    success: false,
                    error: 'Avtentikacija je potrebna'
                });
            }

            try {
                const hasPermission = await this.userModel.hasPermission(req.user.id, permission);
                
                if (!hasPermission) {
                    return res.status(403).json({
                        success: false,
                        error: 'Nimate dovoljenj za to dejanje'
                    });
                }

                next();
            } catch (error) {
                return res.status(500).json({
                    success: false,
                    error: 'Napaka pri preverjanju dovoljenj'
                });
            }
        };
    }

    // Middleware za preverjanje lastništva (uporabnik lahko dostopa samo do svojih podatkov)
    requireOwnership(resourceIdParam = 'id') {
        return (req, res, next) => {
            if (!req.user) {
                return res.status(401).json({
                    success: false,
                    error: 'Avtentikacija je potrebna'
                });
            }

            const resourceId = req.params[resourceIdParam];
            const userId = req.user.id;

            // Admin lahko dostopa do vseh virov
            if (req.user.role === 'admin') {
                return next();
            }

            // Preveri, če uporabnik dostopa do svojih podatkov
            if (resourceId !== userId) {
                return res.status(403).json({
                    success: false,
                    error: 'Dostop dovoljen samo do lastnih podatkov'
                });
            }

            next();
        };
    }

    // Opcijski avtentikacijski middleware (ne zahteva tokena)
    optionalAuth() {
        return async (req, res, next) => {
            try {
                const authHeader = req.headers['authorization'];
                const token = authHeader && authHeader.split(' ')[1];

                if (token) {
                    const decoded = jwt.verify(token, this.jwtSecret);
                    const user = await this.userModel.getUserById(decoded.userId);
                    
                    if (user && user.status === 'active') {
                        req.user = {
                            id: decoded.userId,
                            email: decoded.email,
                            role: decoded.role,
                            permissions: decoded.permissions,
                            fullUser: user
                        };
                    }
                }

                next();
            } catch (error) {
                // Ignoriraj napake in nadaljuj brez avtentikacije
                next();
            }
        };
    }

    // Middleware za beleženje IP naslovov
    logUserActivity() {
        return (req, res, next) => {
            if (req.user) {
                // Dodaj IP naslov v request za kasnejše beleženje
                req.userActivity = {
                    userId: req.user.id,
                    ip: req.ip || req.connection.remoteAddress,
                    userAgent: req.headers['user-agent'],
                    timestamp: new Date(),
                    endpoint: req.originalUrl,
                    method: req.method
                };
            }
            next();
        };
    }

    // Refresh token endpoint
    async refreshToken(refreshToken) {
        try {
            const decoded = jwt.verify(refreshToken, this.jwtSecret);
            
            if (decoded.type !== 'refresh') {
                throw new Error('Neveljaven refresh token');
            }

            const user = await this.userModel.getUserById(decoded.userId);
            if (!user || user.status !== 'active') {
                throw new Error('Uporabnik ni aktiven');
            }

            const newToken = this.generateToken(user);
            const newRefreshToken = this.generateRefreshToken(user);

            return {
                success: true,
                token: newToken,
                refreshToken: newRefreshToken,
                user: {
                    id: user._id,
                    email: user.email,
                    role: user.role,
                    profile: user.profile
                }
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Preveri moč gesla
    validatePasswordStrength(password) {
        const minLength = 8;
        const hasUpperCase = /[A-Z]/.test(password);
        const hasLowerCase = /[a-z]/.test(password);
        const hasNumbers = /\d/.test(password);
        const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

        const errors = [];
        
        if (password.length < minLength) {
            errors.push(`Geslo mora imeti vsaj ${minLength} znakov`);
        }
        if (!hasUpperCase) {
            errors.push('Geslo mora vsebovati vsaj eno veliko črko');
        }
        if (!hasLowerCase) {
            errors.push('Geslo mora vsebovati vsaj eno malo črko');
        }
        if (!hasNumbers) {
            errors.push('Geslo mora vsebovati vsaj eno številko');
        }
        if (!hasSpecialChar) {
            errors.push('Geslo mora vsebovati vsaj en poseben znak');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }
}

module.exports = AuthMiddleware;