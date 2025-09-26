const jwt = require('jsonwebtoken');
const crypto = require('crypto');

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

class TokenRotationManager {
    constructor() {
        this.activeTokens = new Map(); // Store active tokens with metadata
        this.rotationSchedule = new Map(); // Store rotation schedules
        this.blacklistedTokens = new Set(); // Store revoked tokens
        this.rotationInterval = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds
        this.gracePeriod = 7 * 24 * 60 * 60 * 1000; // 7 days grace period
        
        // Start automatic rotation scheduler
        this.startRotationScheduler();
        
        colorLog('🔄 Token Rotation Manager initialized', 'green');
    }

    // Generate secure JWT secret
    generateSecureSecret() {
        return crypto.randomBytes(64).toString('hex');
    }

    // Create new JWT token with rotation metadata
    createToken(payload, options = {}) {
        const tokenId = crypto.randomUUID();
        const currentTime = Date.now();
        const expiresIn = options.expiresIn || '30d';
        
        // Enhanced payload with rotation metadata
        const enhancedPayload = {
            ...payload,
            tokenId,
            issuedAt: currentTime,
            rotationDue: currentTime + this.rotationInterval,
            version: this.getTokenVersion()
        };

        // Use environment secret or generate new one
        const secret = process.env.JWT_SECRET || this.generateSecureSecret();
        
        const token = jwt.sign(enhancedPayload, secret, {
            expiresIn,
            issuer: 'omniscient-ai-platform',
            audience: 'license-system'
        });

        // Store token metadata
        this.activeTokens.set(tokenId, {
            token,
            payload: enhancedPayload,
            createdAt: currentTime,
            rotationDue: currentTime + this.rotationInterval,
            status: 'active',
            rotationCount: 0
        });

        // Schedule rotation
        this.scheduleRotation(tokenId, currentTime + this.rotationInterval);

        colorLog(`🔑 New token created: ${tokenId.substring(0, 8)}...`, 'green');
        return { token, tokenId, rotationDue: currentTime + this.rotationInterval };
    }

    // Verify and validate token
    verifyToken(token, options = {}) {
        try {
            const secret = process.env.JWT_SECRET || this.generateSecureSecret();
            const decoded = jwt.verify(token, secret, {
                issuer: 'omniscient-ai-platform',
                audience: 'license-system'
            });

            // Check if token is blacklisted
            if (this.blacklistedTokens.has(decoded.tokenId)) {
                throw new Error('Token has been revoked');
            }

            // Check if token needs rotation
            const tokenMetadata = this.activeTokens.get(decoded.tokenId);
            if (tokenMetadata) {
                const needsRotation = Date.now() > decoded.rotationDue;
                const inGracePeriod = Date.now() < (decoded.rotationDue + this.gracePeriod);

                return {
                    valid: true,
                    decoded,
                    needsRotation,
                    inGracePeriod,
                    metadata: tokenMetadata
                };
            }

            return { valid: true, decoded, needsRotation: false, inGracePeriod: false };
        } catch (error) {
            colorLog(`❌ Token verification failed: ${error.message}`, 'red');
            return { valid: false, error: error.message };
        }
    }

    // Rotate existing token
    async rotateToken(oldTokenId, additionalPayload = {}) {
        const tokenMetadata = this.activeTokens.get(oldTokenId);
        if (!tokenMetadata) {
            throw new Error('Token not found for rotation');
        }

        // Create new token with updated payload
        const newPayload = {
            ...tokenMetadata.payload,
            ...additionalPayload,
            previousTokenId: oldTokenId,
            rotationCount: tokenMetadata.rotationCount + 1
        };

        const newTokenData = this.createToken(newPayload);

        // Mark old token as rotated (keep in grace period)
        tokenMetadata.status = 'rotated';
        tokenMetadata.rotatedAt = Date.now();
        tokenMetadata.newTokenId = newTokenData.tokenId;

        // Schedule old token for blacklisting after grace period
        setTimeout(() => {
            this.blacklistToken(oldTokenId);
        }, this.gracePeriod);

        colorLog(`🔄 Token rotated: ${oldTokenId.substring(0, 8)}... → ${newTokenData.tokenId.substring(0, 8)}...`, 'blue');
        
        return newTokenData;
    }

    // Blacklist token (revoke)
    blacklistToken(tokenId) {
        this.blacklistedTokens.add(tokenId);
        const tokenMetadata = this.activeTokens.get(tokenId);
        
        if (tokenMetadata) {
            tokenMetadata.status = 'blacklisted';
            tokenMetadata.blacklistedAt = Date.now();
        }

        // Cancel scheduled rotation
        if (this.rotationSchedule.has(tokenId)) {
            clearTimeout(this.rotationSchedule.get(tokenId));
            this.rotationSchedule.delete(tokenId);
        }

        colorLog(`🚫 Token blacklisted: ${tokenId.substring(0, 8)}...`, 'red');
    }

    // Schedule automatic rotation
    scheduleRotation(tokenId, rotationTime) {
        const delay = rotationTime - Date.now();
        
        if (delay > 0) {
            const timeoutId = setTimeout(async () => {
                try {
                    const tokenMetadata = this.activeTokens.get(tokenId);
                    if (tokenMetadata && tokenMetadata.status === 'active') {
                        // Auto-rotate token
                        await this.rotateToken(tokenId);
                        colorLog(`⏰ Automatic token rotation completed: ${tokenId.substring(0, 8)}...`, 'yellow');
                    }
                } catch (error) {
                    colorLog(`❌ Automatic rotation failed for ${tokenId.substring(0, 8)}...: ${error.message}`, 'red');
                }
            }, delay);

            this.rotationSchedule.set(tokenId, timeoutId);
        }
    }

    // Start rotation scheduler (runs every hour)
    startRotationScheduler() {
        setInterval(() => {
            this.checkPendingRotations();
            this.cleanupExpiredTokens();
        }, 60 * 60 * 1000); // Every hour

        colorLog('⏰ Token rotation scheduler started', 'blue');
    }

    // Check for tokens that need rotation
    checkPendingRotations() {
        const currentTime = Date.now();
        let rotationCount = 0;

        for (const [tokenId, metadata] of this.activeTokens.entries()) {
            if (metadata.status === 'active' && currentTime > metadata.rotationDue) {
                // Token needs rotation
                this.rotateToken(tokenId).catch(error => {
                    colorLog(`❌ Scheduled rotation failed for ${tokenId.substring(0, 8)}...: ${error.message}`, 'red');
                });
                rotationCount++;
            }
        }

        if (rotationCount > 0) {
            colorLog(`🔄 Processed ${rotationCount} scheduled token rotations`, 'blue');
        }
    }

    // Cleanup expired and old tokens
    cleanupExpiredTokens() {
        const currentTime = Date.now();
        const cleanupThreshold = 90 * 24 * 60 * 60 * 1000; // 90 days
        let cleanupCount = 0;

        for (const [tokenId, metadata] of this.activeTokens.entries()) {
            // Remove tokens older than 90 days
            if (currentTime - metadata.createdAt > cleanupThreshold) {
                this.activeTokens.delete(tokenId);
                this.blacklistedTokens.delete(tokenId);
                
                if (this.rotationSchedule.has(tokenId)) {
                    clearTimeout(this.rotationSchedule.get(tokenId));
                    this.rotationSchedule.delete(tokenId);
                }
                
                cleanupCount++;
            }
        }

        if (cleanupCount > 0) {
            colorLog(`🧹 Cleaned up ${cleanupCount} expired tokens`, 'cyan');
        }
    }

    // Get current token version (for compatibility)
    getTokenVersion() {
        return process.env.TOKEN_VERSION || '1.0';
    }

    // Get token statistics
    getStatistics() {
        const stats = {
            activeTokens: 0,
            rotatedTokens: 0,
            blacklistedTokens: this.blacklistedTokens.size,
            pendingRotations: 0,
            totalTokens: this.activeTokens.size
        };

        const currentTime = Date.now();
        
        for (const metadata of this.activeTokens.values()) {
            switch (metadata.status) {
                case 'active':
                    stats.activeTokens++;
                    if (currentTime > metadata.rotationDue) {
                        stats.pendingRotations++;
                    }
                    break;
                case 'rotated':
                    stats.rotatedTokens++;
                    break;
            }
        }

        return stats;
    }

    // Force rotation of all active tokens (emergency)
    async forceRotateAll() {
        const activeTokenIds = [];
        
        for (const [tokenId, metadata] of this.activeTokens.entries()) {
            if (metadata.status === 'active') {
                activeTokenIds.push(tokenId);
            }
        }

        const results = [];
        for (const tokenId of activeTokenIds) {
            try {
                const newToken = await this.rotateToken(tokenId);
                results.push({ success: true, oldTokenId: tokenId, newTokenId: newToken.tokenId });
            } catch (error) {
                results.push({ success: false, tokenId, error: error.message });
            }
        }

        colorLog(`🚨 Emergency rotation completed: ${results.filter(r => r.success).length}/${results.length} successful`, 'yellow');
        return results;
    }

    // Export token data for backup
    exportTokenData() {
        return {
            activeTokens: Array.from(this.activeTokens.entries()),
            blacklistedTokens: Array.from(this.blacklistedTokens),
            exportedAt: Date.now(),
            version: this.getTokenVersion()
        };
    }

    // Import token data from backup
    importTokenData(data) {
        if (data.version !== this.getTokenVersion()) {
            colorLog(`⚠️ Version mismatch during import: ${data.version} vs ${this.getTokenVersion()}`, 'yellow');
        }

        this.activeTokens = new Map(data.activeTokens);
        this.blacklistedTokens = new Set(data.blacklistedTokens);

        // Reschedule rotations for active tokens
        for (const [tokenId, metadata] of this.activeTokens.entries()) {
            if (metadata.status === 'active' && metadata.rotationDue > Date.now()) {
                this.scheduleRotation(tokenId, metadata.rotationDue);
            }
        }

        colorLog(`📥 Token data imported: ${this.activeTokens.size} tokens, ${this.blacklistedTokens.size} blacklisted`, 'green');
    }
}

// Singleton instance
const tokenRotationManager = new TokenRotationManager();

// Middleware for automatic token rotation check
const tokenRotationMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        const verification = tokenRotationManager.verifyToken(token);
        
        if (verification.valid && verification.needsRotation && verification.inGracePeriod) {
            // Add rotation warning to response headers
            res.set('X-Token-Rotation-Required', 'true');
            res.set('X-Token-Rotation-Due', verification.decoded.rotationDue.toString());
            
            colorLog(`⚠️ Token rotation required for: ${verification.decoded.tokenId.substring(0, 8)}...`, 'yellow');
        }
        
        req.tokenVerification = verification;
    }
    
    next();
};

module.exports = {
    TokenRotationManager,
    tokenRotationManager,
    tokenRotationMiddleware
};