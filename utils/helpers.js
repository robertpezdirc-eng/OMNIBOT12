const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Barvni izpis
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    blue: '\x1b[34m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    cyan: '\x1b[36m',
    magenta: '\x1b[35m'
};

class Helpers {
    // Generiraj varni naključni ključ
    static generateSecureKey(length = 32) {
        return crypto.randomBytes(length).toString('hex');
    }

    // Hash gesla z soljo
    static hashPassword(password, salt = null) {
        if (!salt) {
            salt = crypto.randomBytes(16).toString('hex');
        }
        const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
        return { hash, salt };
    }

    // Preveri geslo
    static verifyPassword(password, hash, salt) {
        const verifyHash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
        return hash === verifyHash;
    }

    // Formatiraj velikost datoteke
    static formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // Formatiraj čas
    static formatDuration(milliseconds) {
        const seconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) return `${days}d ${hours % 24}h`;
        if (hours > 0) return `${hours}h ${minutes % 60}m`;
        if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
        return `${seconds}s`;
    }

    // Preveri, če je email veljaven
    static isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    // Preveri, če je URL veljaven
    static isValidUrl(url) {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    }

    // Sanitiziraj string za uporabo v datotečnem imenu
    static sanitizeFilename(filename) {
        return filename.replace(/[^a-z0-9.-]/gi, '_').toLowerCase();
    }

    // Ustvari direktorij, če ne obstaja
    static ensureDirectory(dirPath) {
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
            return true;
        }
        return false;
    }

    // Preberi JSON datoteko
    static readJsonFile(filePath, defaultValue = {}) {
        try {
            if (fs.existsSync(filePath)) {
                const data = fs.readFileSync(filePath, 'utf8');
                return JSON.parse(data);
            }
            return defaultValue;
        } catch (error) {
            console.log(`${colors.red}❌ Napaka pri branju JSON datoteke ${filePath}:${colors.reset}`, error);
            return defaultValue;
        }
    }

    // Zapiši JSON datoteko
    static writeJsonFile(filePath, data) {
        try {
            this.ensureDirectory(path.dirname(filePath));
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
            return true;
        } catch (error) {
            console.log(`${colors.red}❌ Napaka pri pisanju JSON datoteke ${filePath}:${colors.reset}`, error);
            return false;
        }
    }

    // Generiraj naključno številko v obsegu
    static randomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    // Generiraj naključen string
    static randomString(length = 10, charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789') {
        let result = '';
        for (let i = 0; i < length; i++) {
            result += charset.charAt(Math.floor(Math.random() * charset.length));
        }
        return result;
    }

    // Debounce funkcija
    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // Throttle funkcija
    static throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    // Retry funkcija z eksponentnim backoff
    static async retry(fn, maxRetries = 3, baseDelay = 1000) {
        for (let i = 0; i < maxRetries; i++) {
            try {
                return await fn();
            } catch (error) {
                if (i === maxRetries - 1) throw error;
                
                const delay = baseDelay * Math.pow(2, i);
                console.log(`${colors.yellow}⏳ Poskus ${i + 1}/${maxRetries} neuspešen, čakam ${delay}ms...${colors.reset}`);
                await this.sleep(delay);
            }
        }
    }

    // Sleep funkcija
    static sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Preveri sistemske vire
    static getSystemInfo() {
        const os = require('os');
        return {
            platform: os.platform(),
            arch: os.arch(),
            cpus: os.cpus().length,
            totalMemory: this.formatFileSize(os.totalmem()),
            freeMemory: this.formatFileSize(os.freemem()),
            uptime: this.formatDuration(os.uptime() * 1000),
            loadAverage: os.loadavg(),
            hostname: os.hostname(),
            nodeVersion: process.version,
            timestamp: new Date().toISOString()
        };
    }

    // Logiranje z barvami
    static log(level, message, data = null) {
        const timestamp = new Date().toISOString();
        let colorCode = colors.reset;
        let icon = '📝';

        switch (level.toLowerCase()) {
            case 'info':
                colorCode = colors.blue;
                icon = 'ℹ️';
                break;
            case 'success':
                colorCode = colors.green;
                icon = '✅';
                break;
            case 'warning':
                colorCode = colors.yellow;
                icon = '⚠️';
                break;
            case 'error':
                colorCode = colors.red;
                icon = '❌';
                break;
            case 'debug':
                colorCode = colors.cyan;
                icon = '🔍';
                break;
        }

        console.log(`${colorCode}${icon} [${timestamp}] ${message}${colors.reset}`);
        if (data) {
            console.log(data);
        }
    }

    // Validacija objekta
    static validateObject(obj, schema) {
        const errors = [];
        
        for (const [key, rules] of Object.entries(schema)) {
            const value = obj[key];
            
            if (rules.required && (value === undefined || value === null)) {
                errors.push(`${key} je obvezen`);
                continue;
            }
            
            if (value !== undefined && value !== null) {
                if (rules.type && typeof value !== rules.type) {
                    errors.push(`${key} mora biti tipa ${rules.type}`);
                }
                
                if (rules.minLength && value.length < rules.minLength) {
                    errors.push(`${key} mora imeti vsaj ${rules.minLength} znakov`);
                }
                
                if (rules.maxLength && value.length > rules.maxLength) {
                    errors.push(`${key} lahko ima največ ${rules.maxLength} znakov`);
                }
                
                if (rules.pattern && !rules.pattern.test(value)) {
                    errors.push(`${key} ni v pravilni obliki`);
                }
            }
        }
        
        return {
            isValid: errors.length === 0,
            errors
        };
    }

    // Rate limiting helper
    static createRateLimiter(maxRequests, windowMs) {
        const requests = new Map();
        
        return (identifier) => {
            const now = Date.now();
            const windowStart = now - windowMs;
            
            // Počisti stare zahteve
            if (requests.has(identifier)) {
                const userRequests = requests.get(identifier).filter(time => time > windowStart);
                requests.set(identifier, userRequests);
            }
            
            const userRequests = requests.get(identifier) || [];
            
            if (userRequests.length >= maxRequests) {
                return {
                    allowed: false,
                    resetTime: userRequests[0] + windowMs
                };
            }
            
            userRequests.push(now);
            requests.set(identifier, userRequests);
            
            return {
                allowed: true,
                remaining: maxRequests - userRequests.length
            };
        };
    }
}

module.exports = Helpers;