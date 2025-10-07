/**
 * 📝 WINSTON LOGGING CONFIGURATION
 * Production-ready logging with rotation and multiple transports
 */

const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Ensure logs directory exists
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

/**
 * Custom log format with colors and timestamp
 */
const customFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.metadata({ fillExcept: ['message', 'level', 'timestamp'] }),
    winston.format.printf(({ level, message, timestamp, metadata, stack }) => {
        let log = `${timestamp} [${level.toUpperCase()}]: ${message}`;

        // Add metadata if present
        if (metadata && Object.keys(metadata).length > 0) {
            log += `\n  Metadata: ${JSON.stringify(metadata, null, 2)}`;
        }

        // Add stack trace for errors
        if (stack) {
            log += `\n  Stack: ${stack}`;
        }

        return log;
    })
);

/**
 * Production log format (JSON for easy parsing)
 */
const productionFormat = winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.metadata({ fillExcept: ['message', 'level', 'timestamp'] }),
    winston.format.json()
);

/**
 * Development log format (with colors)
 */
const developmentFormat = winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.metadata({ fillExcept: ['message', 'level', 'timestamp'] }),
    winston.format.printf(({ level, message, timestamp, metadata, stack }) => {
        let log = `${timestamp} ${level}: ${message}`;

        if (metadata && Object.keys(metadata).length > 0) {
            log += ` ${JSON.stringify(metadata)}`;
        }

        if (stack) {
            log += `\n${stack}`;
        }

        return log;
    })
);

/**
 * Create logger instance
 */
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
    format: process.env.NODE_ENV === 'production' ? productionFormat : developmentFormat,
    defaultMeta: {
        service: 'coinbitclub-enterprise',
        environment: process.env.NODE_ENV || 'development',
        version: '6.0.0'
    },
    transports: [
        // Console transport
        new winston.transports.Console({
            format: process.env.NODE_ENV === 'production' ? productionFormat : developmentFormat
        }),

        // Error log file
        new winston.transports.File({
            filename: path.join(logsDir, 'error.log'),
            level: 'error',
            maxsize: 10485760, // 10MB
            maxFiles: 10,
            format: productionFormat
        }),

        // Combined log file
        new winston.transports.File({
            filename: path.join(logsDir, 'combined.log'),
            maxsize: 10485760, // 10MB
            maxFiles: 10,
            format: productionFormat
        }),

        // Warning log file
        new winston.transports.File({
            filename: path.join(logsDir, 'warn.log'),
            level: 'warn',
            maxsize: 5242880, // 5MB
            maxFiles: 5,
            format: productionFormat
        })
    ],

    // Handle exceptions
    exceptionHandlers: [
        new winston.transports.File({
            filename: path.join(logsDir, 'exceptions.log'),
            maxsize: 10485760,
            maxFiles: 5
        })
    ],

    // Handle rejections
    rejectionHandlers: [
        new winston.transports.File({
            filename: path.join(logsDir, 'rejections.log'),
            maxsize: 10485760,
            maxFiles: 5
        })
    ],

    // Exit on error
    exitOnError: false
});

/**
 * Create specialized loggers for different components
 */
const createComponentLogger = (component) => {
    return {
        error: (message, meta = {}) => logger.error(message, { component, ...meta }),
        warn: (message, meta = {}) => logger.warn(message, { component, ...meta }),
        info: (message, meta = {}) => logger.info(message, { component, ...meta }),
        debug: (message, meta = {}) => logger.debug(message, { component, ...meta }),
        http: (message, meta = {}) => logger.http(message, { component, ...meta })
    };
};

/**
 * HTTP request logger (for Morgan)
 */
const httpLogger = {
    write: (message) => {
        logger.http(message.trim());
    }
};

/**
 * Database query logger
 */
const dbLogger = createComponentLogger('database');

/**
 * Trading logger
 */
const tradingLogger = createComponentLogger('trading');

/**
 * Webhook logger
 */
const webhookLogger = createComponentLogger('webhook');

/**
 * Authentication logger
 */
const authLogger = createComponentLogger('auth');

/**
 * Affiliate logger
 */
const affiliateLogger = createComponentLogger('affiliate');

/**
 * Security logger (for rate limiting, blocked IPs, etc.)
 */
const securityLogger = createComponentLogger('security');

/**
 * Performance logger
 */
const performanceLogger = createComponentLogger('performance');

/**
 * Log request/response for debugging
 */
const logRequest = (req) => {
    logger.http('HTTP Request', {
        method: req.method,
        url: req.url,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        userId: req.user?.id
    });
};

const logResponse = (req, res, responseTime) => {
    logger.http('HTTP Response', {
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        responseTime: `${responseTime}ms`,
        userId: req.user?.id
    });
};

/**
 * Log database query
 */
const logQuery = (query, params, duration) => {
    dbLogger.debug('Database Query', {
        query: query.substring(0, 200), // Limit query length
        params: params ? JSON.stringify(params).substring(0, 100) : null,
        duration: `${duration}ms`
    });
};

/**
 * Log trading activity
 */
const logTrade = (action, symbol, userId, details = {}) => {
    tradingLogger.info(`Trade ${action}`, {
        action,
        symbol,
        userId,
        ...details
    });
};

/**
 * Log webhook event
 */
const logWebhook = (source, event, data = {}) => {
    webhookLogger.info(`Webhook ${event}`, {
        source,
        event,
        ...data
    });
};

/**
 * Log authentication event
 */
const logAuth = (event, userId, success = true, details = {}) => {
    const logLevel = success ? 'info' : 'warn';
    authLogger[logLevel](`Auth ${event}`, {
        event,
        userId,
        success,
        ...details
    });
};

/**
 * Log security event
 */
const logSecurity = (event, severity = 'info', details = {}) => {
    securityLogger[severity](`Security ${event}`, {
        event,
        ...details
    });
};

/**
 * Log performance metric
 */
const logPerformance = (metric, value, unit = 'ms', details = {}) => {
    performanceLogger.info(`Performance metric: ${metric}`, {
        metric,
        value,
        unit,
        ...details
    });
};

// Export logger and utilities
module.exports = {
    logger,
    httpLogger,
    dbLogger,
    tradingLogger,
    webhookLogger,
    authLogger,
    affiliateLogger,
    securityLogger,
    performanceLogger,
    createComponentLogger,
    logRequest,
    logResponse,
    logQuery,
    logTrade,
    logWebhook,
    logAuth,
    logSecurity,
    logPerformance
};
