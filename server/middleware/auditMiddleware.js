const auditService = require('../services/auditService');

/**
 * Middleware za avtomatsko beleženje API klicev
 */
function auditMiddleware(options = {}) {
    const {
        excludePaths = ['/health', '/api/audit'],
        excludeMethods = ['OPTIONS'],
        logRequestBody = false,
        logResponseBody = false,
        maxBodySize = 1000
    } = options;

    return async (req, res, next) => {
        // Preskoči določene poti in metode
        if (excludePaths.some(path => req.path.startsWith(path)) || 
            excludeMethods.includes(req.method)) {
            return next();
        }

        const startTime = Date.now();
        const originalSend = res.send;
        let responseBody = null;
        let statusCode = null;

        // Prestrezanje odgovora
        res.send = function(body) {
            statusCode = res.statusCode;
            if (logResponseBody && body) {
                try {
                    responseBody = typeof body === 'string' ? 
                        body.substring(0, maxBodySize) : 
                        JSON.stringify(body).substring(0, maxBodySize);
                } catch (error) {
                    responseBody = '[Response body parsing error]';
                }
            }
            return originalSend.call(this, body);
        };

        // Ko se zahteva konča
        res.on('finish', async () => {
            try {
                const duration = Date.now() - startTime;
                const clientIp = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'];
                
                // Določi kategorijo na podlagi poti
                let category = 'api';
                let securityLevel = 'low';
                
                if (req.path.includes('/license')) {
                    category = 'license';
                    securityLevel = 'medium';
                } else if (req.path.includes('/revocation')) {
                    category = 'security';
                    securityLevel = 'high';
                } else if (req.path.includes('/admin')) {
                    category = 'admin';
                    securityLevel = 'high';
                }

                // Določi status na podlagi HTTP status kode
                let status = 'success';
                if (statusCode >= 400 && statusCode < 500) {
                    status = 'failed';
                    securityLevel = 'medium';
                } else if (statusCode >= 500) {
                    status = 'error';
                    securityLevel = 'high';
                }

                // Pripravi podatke za beleženje
                const auditData = {
                    eventType: 'api_call',
                    clientId: req.body?.client_id || req.params?.client_id || req.query?.client_id,
                    userId: req.headers['x-user-id'] || req.body?.user_id,
                    action: `${req.method} ${req.path}`,
                    description: `API call to ${req.method} ${req.path}`,
                    ipAddress: clientIp,
                    userAgent: req.get('User-Agent'),
                    status,
                    category,
                    securityLevel,
                    metadata: {
                        method: req.method,
                        path: req.path,
                        query: req.query,
                        statusCode,
                        duration,
                        contentLength: res.get('Content-Length'),
                        referer: req.get('Referer')
                    }
                };

                // Dodaj podatke zahteve, če je omogočeno
                if (logRequestBody && req.body) {
                    try {
                        auditData.requestData = typeof req.body === 'object' ? 
                            JSON.parse(JSON.stringify(req.body).substring(0, maxBodySize)) : 
                            req.body.toString().substring(0, maxBodySize);
                    } catch (error) {
                        auditData.requestData = '[Request body parsing error]';
                    }
                }

                // Dodaj podatke odgovora, če je omogočeno
                if (logResponseBody && responseBody) {
                    auditData.responseData = responseBody;
                }

                // Beleži dogodek
                await auditService.log(auditData);

            } catch (error) {
                console.error('❌ Napaka v audit middleware:', error);
                // Ne prekinjaj zahteve zaradi napake v beleženju
            }
        });

        next();
    };
}

/**
 * Middleware za beleženje varnostnih dogodkov
 */
function securityAuditMiddleware() {
    return async (req, res, next) => {
        const clientIp = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'];
        const userAgent = req.get('User-Agent');

        // Preveri sumljive vzorce
        const suspiciousPatterns = [
            /\.\.\//g,  // Path traversal
            /<script/gi, // XSS
            /union.*select/gi, // SQL injection
            /javascript:/gi, // JavaScript injection
            /data:text\/html/gi // Data URI XSS
        ];

        const requestString = JSON.stringify({
            url: req.url,
            body: req.body,
            query: req.query,
            headers: req.headers
        });

        // Preveri za sumljive vzorce
        for (const pattern of suspiciousPatterns) {
            if (pattern.test(requestString)) {
                await auditService.logSecurityViolation(
                    'suspicious_request',
                    req.body?.client_id || 'unknown',
                    `Suspicious pattern detected: ${pattern.source}`,
                    clientIp,
                    userAgent,
                    {
                        pattern: pattern.source,
                        url: req.url,
                        method: req.method,
                        matched_content: requestString.match(pattern)?.[0]
                    }
                );
                break;
            }
        }

        // Preveri za preveč zahtev z iste IP
        if (!global.ipRequestCount) {
            global.ipRequestCount = new Map();
        }

        const now = Date.now();
        const windowMs = 60 * 1000; // 1 minuta
        const maxRequests = 100; // Maksimalno 100 zahtev na minuto

        const requests = global.ipRequestCount.get(clientIp) || [];
        const validRequests = requests.filter(time => now - time < windowMs);

        if (validRequests.length >= maxRequests) {
            await auditService.logSecurityViolation(
                'rate_limit_exceeded',
                req.body?.client_id || 'unknown',
                `Rate limit exceeded: ${validRequests.length} requests in 1 minute`,
                clientIp,
                userAgent,
                {
                    request_count: validRequests.length,
                    time_window: '1 minute',
                    limit: maxRequests
                }
            );
        }

        validRequests.push(now);
        global.ipRequestCount.set(clientIp, validRequests);

        next();
    };
}

/**
 * Middleware za beleženje neuspešnih avtentikacij
 */
function authAuditMiddleware() {
    return async (req, res, next) => {
        const originalSend = res.send;
        
        res.send = function(body) {
            // Preveri za neuspešne avtentikacije
            if (res.statusCode === 401 || res.statusCode === 403) {
                const clientIp = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'];
                
                auditService.logSecurityViolation(
                    'authentication_failed',
                    req.body?.client_id || 'unknown',
                    `Authentication failed: ${res.statusCode}`,
                    clientIp,
                    req.get('User-Agent'),
                    {
                        status_code: res.statusCode,
                        path: req.path,
                        method: req.method,
                        provided_credentials: !!req.headers.authorization
                    }
                ).catch(error => {
                    console.error('❌ Napaka pri beleženju neuspešne avtentikacije:', error);
                });
            }
            
            return originalSend.call(this, body);
        };

        next();
    };
}

module.exports = {
    auditMiddleware,
    securityAuditMiddleware,
    authAuditMiddleware
};