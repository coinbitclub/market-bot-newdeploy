/**
 * 🔒 STANDARDIZED ERROR HANDLING
 * 
 * Sistema de tratamento de erro enterprise padronizado
 */

const { logger } = require('./logger');

// Tipos de erro personalizados
class AppError extends Error {
    constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
        super(message);
        this.name = this.constructor.name;
        this.statusCode = statusCode;
        this.code = code;
        this.isOperational = true;
        
        Error.captureStackTrace(this, this.constructor);
    }
}

class ValidationError extends AppError {
    constructor(message, field = null) {
        super(message, 400, 'VALIDATION_ERROR');
        this.field = field;
    }
}

class AuthenticationError extends AppError {
    constructor(message = 'Authentication failed') {
        super(message, 401, 'AUTHENTICATION_ERROR');
    }
}

class AuthorizationError extends AppError {
    constructor(message = 'Insufficient permissions') {
        super(message, 403, 'AUTHORIZATION_ERROR');
    }
}

class NotFoundError extends AppError {
    constructor(resource = 'Resource') {
        super(`${resource} not found`, 404, 'NOT_FOUND_ERROR');
    }
}

class ExchangeError extends AppError {
    constructor(exchange, message) {
        super(`Exchange ${exchange} error: ${message}`, 502, 'EXCHANGE_ERROR');
        this.exchange = exchange;
    }
}

class TradingError extends AppError {
    constructor(message) {
        super(message, 422, 'TRADING_ERROR');
    }
}

// Handler principal de erros
class ErrorHandler {
    static handleError(error, req = null, res = null) {
        const errorInfo = {
            message: error.message,
            stack: error.stack,
            statusCode: error.statusCode || 500,
            code: error.code || 'INTERNAL_ERROR',
            url: req?.url,
            method: req?.method,
            userAgent: req?.get('User-Agent'),
            ip: req?.ip,
            timestamp: new Date().toISOString()
        };

        // Log do erro
        if (error.statusCode >= 500) {
            logger.error('Server Error', errorInfo);
        } else {
            logger.warn('Client Error', errorInfo);
        }

        // Resposta HTTP se disponível
        if (res && !res.headersSent) {
            const response = {
                error: {
                    message: error.message,
                    code: error.code,
                    statusCode: error.statusCode || 500
                }
            };

            // Não expor stack em produção
            if (process.env.NODE_ENV !== 'production') {
                response.error.stack = error.stack;
            }

            res.status(error.statusCode || 500).json(response);
        }

        return errorInfo;
    }

    static expressErrorHandler(error, req, res, next) {
        ErrorHandler.handleError(error, req, res);
    }

    static asyncHandler(fn) {
        return (req, res, next) => {
            Promise.resolve(fn(req, res, next)).catch(next);
        };
    }

    static handleUncaughtException(error) {
        logger.error('Uncaught Exception', {
            message: error.message,
            stack: error.stack
        });
        
        // Graceful shutdown
        process.exit(1);
    }

    static handleUnhandledRejection(reason, promise) {
        logger.error('Unhandled Rejection', {
            reason,
            promise: promise.toString()
        });
    }
}

// Configurar handlers globais
process.on('uncaughtException', ErrorHandler.handleUncaughtException);
process.on('unhandledRejection', ErrorHandler.handleUnhandledRejection);

module.exports = {
    AppError,
    ValidationError,
    AuthenticationError,
    AuthorizationError,
    NotFoundError,
    ExchangeError,
    TradingError,
    ErrorHandler
};
