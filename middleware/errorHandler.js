const fs = require('fs');
const path = require('path');

// Barvni izpis za konzolo
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    green: '\x1b[32m',
    cyan: '\x1b[36m',
    magenta: '\x1b[35m'
};

class ErrorHandler {
    constructor() {
        this.logFile = path.join(__dirname, '../logs/errors.log');
        this.ensureLogDirectory();
    }

    ensureLogDirectory() {
        const logDir = path.dirname(this.logFile);
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }
    }

    logError(error, req = null) {
        const timestamp = new Date().toISOString();
        const errorInfo = {
            timestamp,
            message: error.message,
            stack: error.stack,
            url: req ? req.url : null,
            method: req ? req.method : null,
            ip: req ? req.ip : null,
            userAgent: req ? req.get('User-Agent') : null
        };

        // Barvni izpis v konzolo
        console.log(`${colors.red}❌ NAPAKA [${timestamp}]${colors.reset}`);
        console.log(`${colors.yellow}📍 URL: ${errorInfo.url || 'N/A'}${colors.reset}`);
        console.log(`${colors.blue}🔧 Metoda: ${errorInfo.method || 'N/A'}${colors.reset}`);
        console.log(`${colors.magenta}💬 Sporočilo: ${error.message}${colors.reset}`);
        
        if (process.env.NODE_ENV === 'development') {
            console.log(`${colors.cyan}📚 Stack trace:${colors.reset}`);
            console.log(error.stack);
        }

        // Zapis v datoteko
        fs.appendFileSync(this.logFile, JSON.stringify(errorInfo) + '\n');
    }

    // Middleware funkcija za Express
    middleware() {
        return (error, req, res, next) => {
            this.logError(error, req);

            // Določi status kodo
            let statusCode = error.statusCode || error.status || 500;
            
            // Posebno obravnavanje različnih tipov napak
            if (error.name === 'ValidationError') {
                statusCode = 400;
            } else if (error.name === 'UnauthorizedError') {
                statusCode = 401;
            } else if (error.name === 'CastError') {
                statusCode = 400;
            }

            // Pripravi odgovor
            const errorResponse = {
                success: false,
                error: {
                    message: error.message,
                    type: error.name || 'ServerError',
                    timestamp: new Date().toISOString()
                }
            };

            // V development načinu dodaj stack trace
            if (process.env.NODE_ENV === 'development') {
                errorResponse.error.stack = error.stack;
                errorResponse.error.details = error.details || null;
            }

            res.status(statusCode).json(errorResponse);
        };
    }

    // Async error wrapper
    asyncHandler(fn) {
        return (req, res, next) => {
            Promise.resolve(fn(req, res, next)).catch(next);
        };
    }

    // 404 handler
    notFoundHandler() {
        return (req, res, next) => {
            const error = new Error(`Pot ${req.originalUrl} ni najdena`);
            error.statusCode = 404;
            next(error);
        };
    }

    // Unhandled promise rejection handler
    handleUnhandledRejection() {
        process.on('unhandledRejection', (reason, promise) => {
            console.log(`${colors.red}🚨 Unhandled Promise Rejection:${colors.reset}`, reason);
            this.logError(new Error(`Unhandled Promise Rejection: ${reason}`));
        });
    }

    // Uncaught exception handler
    handleUncaughtException() {
        process.on('uncaughtException', (error) => {
            console.log(`${colors.red}💥 Uncaught Exception:${colors.reset}`, error);
            this.logError(error);
            process.exit(1);
        });
    }
}

// Singleton instance
const errorHandler = new ErrorHandler();

module.exports = {
    ErrorHandler,
    errorHandler,
    asyncHandler: errorHandler.asyncHandler.bind(errorHandler),
    middleware: errorHandler.middleware.bind(errorHandler),
    notFoundHandler: errorHandler.notFoundHandler.bind(errorHandler)
};