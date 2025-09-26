const rateLimit = require('express-rate-limit');

// General API rate limiter
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: 'Preveč zahtev',
    message: 'Presegli ste omejitev zahtev. Poskusite znova čez 15 minut.',
    retry_after: '15 minut'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req, res) => {
    console.warn(`⚠️ Rate limit exceeded for IP: ${req.ip} on ${req.path}`);
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
    console.warn(`⚠️ License check rate limit exceeded for IP: ${req.ip}`);
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
    console.warn(`⚠️ Token operation rate limit exceeded for IP: ${req.ip} on ${req.path}`);
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
    console.warn(`⚠️ Admin operation rate limit exceeded for IP: ${req.ip} on ${req.path}`);
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
    console.warn(`⚠️ License creation rate limit exceeded for IP: ${req.ip}`);
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
    console.warn(`⚠️ Activity log rate limit exceeded for IP: ${req.ip}`);
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

module.exports = {
  generalLimiter,
  licenseCheckLimiter,
  tokenLimiter,
  adminLimiter,
  createLicenseLimiter,
  activityLimiter
};