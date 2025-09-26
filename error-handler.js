// Error Handler Module for Omnia AI Platform
// Provides comprehensive error handling and fallback mechanisms

class ErrorHandler {
    constructor() {
        this.errorLog = [];
        this.maxLogSize = 100;
        this.setupGlobalErrorHandlers();
    }

    setupGlobalErrorHandlers() {
        // Handle uncaught exceptions
        process.on('uncaughtException', (error) => {
            this.logError('UNCAUGHT_EXCEPTION', error);
            console.error('Uncaught Exception:', error);
            // Don't exit the process, try to recover
            this.attemptRecovery();
        });

        // Handle unhandled promise rejections
        process.on('unhandledRejection', (reason, promise) => {
            this.logError('UNHANDLED_REJECTION', reason);
            console.error('Unhandled Rejection at:', promise, 'reason:', reason);
            this.attemptRecovery();
        });

        // Handle warnings
        process.on('warning', (warning) => {
            this.logError('WARNING', warning);
            console.warn('Warning:', warning.message);
        });
    }

    logError(type, error) {
        const errorEntry = {
            timestamp: new Date().toISOString(),
            type: type,
            message: error.message || error,
            stack: error.stack || 'No stack trace available',
            pid: process.pid
        };

        this.errorLog.push(errorEntry);

        // Keep log size manageable
        if (this.errorLog.length > this.maxLogSize) {
            this.errorLog.shift();
        }

        // Write to file for persistence
        this.writeErrorToFile(errorEntry);
    }

    writeErrorToFile(errorEntry) {
        const fs = require('fs');
        const path = require('path');
        
        try {
            const logFile = path.join(__dirname, 'error.log');
            const logLine = `${errorEntry.timestamp} [${errorEntry.type}] ${errorEntry.message}\n${errorEntry.stack}\n---\n`;
            
            fs.appendFileSync(logFile, logLine);
        } catch (writeError) {
            console.error('Failed to write error to file:', writeError);
        }
    }

    attemptRecovery() {
        console.log('Attempting system recovery...');
        
        // Clear any problematic intervals or timeouts
        this.clearAllTimers();
        
        // Reset any global state if needed
        this.resetGlobalState();
        
        // Garbage collection if available
        if (global.gc) {
            global.gc();
        }
        
        console.log('Recovery attempt completed');
    }

    clearAllTimers() {
        // Clear all active timers (this is a simplified approach)
        const highestTimeoutId = setTimeout(() => {}, 0);
        for (let i = 0; i < highestTimeoutId; i++) {
            clearTimeout(i);
        }
        
        const highestIntervalId = setInterval(() => {}, 1000);
        clearInterval(highestIntervalId);
        for (let i = 0; i < highestIntervalId; i++) {
            clearInterval(i);
        }
    }

    resetGlobalState() {
        // Reset any global variables or state that might be corrupted
        if (global.appState) {
            global.appState = {};
        }
    }

    // Wrapper for async functions with error handling
    async safeAsync(asyncFunction, fallbackValue = null) {
        try {
            return await asyncFunction();
        } catch (error) {
            this.logError('SAFE_ASYNC_ERROR', error);
            console.error('Safe async error:', error.message);
            return fallbackValue;
        }
    }

    // Wrapper for sync functions with error handling
    safeSync(syncFunction, fallbackValue = null) {
        try {
            return syncFunction();
        } catch (error) {
            this.logError('SAFE_SYNC_ERROR', error);
            console.error('Safe sync error:', error.message);
            return fallbackValue;
        }
    }

    // Express error middleware
    expressErrorHandler() {
        return (error, req, res, next) => {
            this.logError('EXPRESS_ERROR', error);
            
            // Don't expose internal errors to client
            const statusCode = error.statusCode || 500;
            const message = statusCode === 500 ? 'Internal Server Error' : error.message;
            
            res.status(statusCode).json({
                error: true,
                message: message,
                timestamp: new Date().toISOString()
            });
        };
    }

    // Get error statistics
    getErrorStats() {
        const stats = {
            totalErrors: this.errorLog.length,
            errorTypes: {},
            recentErrors: this.errorLog.slice(-10)
        };

        this.errorLog.forEach(error => {
            stats.errorTypes[error.type] = (stats.errorTypes[error.type] || 0) + 1;
        });

        return stats;
    }

    // Health check endpoint data
    getHealthStatus() {
        const recentErrors = this.errorLog.filter(
            error => new Date() - new Date(error.timestamp) < 300000 // Last 5 minutes
        );

        return {
            status: recentErrors.length > 10 ? 'unhealthy' : 'healthy',
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            recentErrorCount: recentErrors.length,
            lastError: this.errorLog.length > 0 ? this.errorLog[this.errorLog.length - 1] : null
        };
    }
}

// Create singleton instance
const errorHandler = new ErrorHandler();

module.exports = errorHandler;