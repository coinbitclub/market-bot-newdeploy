/**
 * 🛡️ CENTRALIZED ERROR HANDLER MIDDLEWARE
 * Handles all errors consistently across the application
 */

class ErrorHandler {
    /**
     * Error types for categorization
     */
    static ErrorTypes = {
        VALIDATION: 'ValidationError',
        AUTHENTICATION: 'AuthenticationError',
        AUTHORIZATION: 'AuthorizationError',
        NOT_FOUND: 'NotFoundError',
        DATABASE: 'DatabaseError',
        EXTERNAL_API: 'ExternalAPIError',
        RATE_LIMIT: 'RateLimitError',
        BUSINESS_LOGIC: 'BusinessLogicError',
        INTERNAL: 'InternalError'
    };

    /**
     * Main error handling middleware
     */
    static handle() {
        return (err, req, res, next) => {
            // Log error (will be replaced with Winston later)
            console.error('❌ Error caught by error handler:', {
                type: err.type || 'UnknownError',
                message: err.message,
                stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
                path: req.path,
                method: req.method,
                ip: req.ip,
                timestamp: new Date().toISOString()
            });

            // Determine status code
            const statusCode = err.statusCode || err.status || 500;

            // Categorize error
            const errorCategory = ErrorHandler.categorizeError(err);

            // Build response
            const response = {
                success: false,
                error: {
                    type: errorCategory,
                    message: ErrorHandler.getSafeErrorMessage(err, statusCode),
                    code: err.code || 'UNKNOWN_ERROR'
                },
                timestamp: new Date().toISOString()
            };

            // Add request ID if available
            if (req.id) {
                response.requestId = req.id;
            }

            // Add validation errors if present
            if (err.errors && Array.isArray(err.errors)) {
                response.error.details = err.errors;
            }

            // Add stack trace in development
            if (process.env.NODE_ENV === 'development') {
                response.error.stack = err.stack;
            }

            // Send response
            res.status(statusCode).json(response);
        };
    }

    /**
     * Async error wrapper for route handlers
     * Usage: router.get('/path', asyncHandler(async (req, res) => { ... }))
     */
    static asyncHandler(fn) {
        return (req, res, next) => {
            Promise.resolve(fn(req, res, next)).catch(next);
        };
    }

    /**
     * Categorize error based on type and properties
     */
    static categorizeError(err) {
        // Check explicit type first
        if (err.type) return err.type;

        // Database errors
        if (err.name === 'SequelizeError' || err.name === 'QueryError' || err.code === 'ECONNREFUSED') {
            return ErrorHandler.ErrorTypes.DATABASE;
        }

        // Validation errors
        if (err.name === 'ValidationError' || err.name === 'ValidatorError') {
            return ErrorHandler.ErrorTypes.VALIDATION;
        }

        // JWT errors
        if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
            return ErrorHandler.ErrorTypes.AUTHENTICATION;
        }

        // Not found
        if (err.statusCode === 404 || err.status === 404) {
            return ErrorHandler.ErrorTypes.NOT_FOUND;
        }

        // Unauthorized
        if (err.statusCode === 401 || err.status === 401) {
            return ErrorHandler.ErrorTypes.AUTHENTICATION;
        }

        // Forbidden
        if (err.statusCode === 403 || err.status === 403) {
            return ErrorHandler.ErrorTypes.AUTHORIZATION;
        }

        // Rate limit
        if (err.statusCode === 429 || err.status === 429) {
            return ErrorHandler.ErrorTypes.RATE_LIMIT;
        }

        // External API errors
        if (err.name === 'AxiosError' || err.isAxiosError) {
            return ErrorHandler.ErrorTypes.EXTERNAL_API;
        }

        // Default to internal error
        return ErrorHandler.ErrorTypes.INTERNAL;
    }

    /**
     * Get safe error message (don't expose internal details in production)
     */
    static getSafeErrorMessage(err, statusCode) {
        // In development, show actual error message
        if (process.env.NODE_ENV === 'development') {
            return err.message || 'An error occurred';
        }

        // In production, use generic messages for server errors
        if (statusCode >= 500) {
            return 'Internal server error. Please try again later.';
        }

        // Client errors can show specific messages
        if (err.isOperational || err.isSafe) {
            return err.message;
        }

        // Default safe message
        return err.message || 'An error occurred';
    }

    /**
     * Create custom error classes
     */
    static createError(type, message, statusCode = 500, code = null) {
        const error = new Error(message);
        error.type = type;
        error.statusCode = statusCode;
        error.code = code;
        error.isOperational = true; // Safe to show to user
        return error;
    }

    /**
     * 404 Not Found handler
     */
    static notFound() {
        return (req, res, next) => {
            const error = ErrorHandler.createError(
                ErrorHandler.ErrorTypes.NOT_FOUND,
                `Route not found: ${req.method} ${req.path}`,
                404,
                'ROUTE_NOT_FOUND'
            );
            next(error);
        };
    }

    /**
     * Validation error creator
     */
    static validationError(message, errors = []) {
        const error = ErrorHandler.createError(
            ErrorHandler.ErrorTypes.VALIDATION,
            message,
            400,
            'VALIDATION_ERROR'
        );
        error.errors = errors;
        return error;
    }

    /**
     * Authentication error creator
     */
    static authenticationError(message = 'Authentication required') {
        return ErrorHandler.createError(
            ErrorHandler.ErrorTypes.AUTHENTICATION,
            message,
            401,
            'AUTHENTICATION_REQUIRED'
        );
    }

    /**
     * Authorization error creator
     */
    static authorizationError(message = 'Insufficient permissions') {
        return ErrorHandler.createError(
            ErrorHandler.ErrorTypes.AUTHORIZATION,
            message,
            403,
            'INSUFFICIENT_PERMISSIONS'
        );
    }

    /**
     * Database error creator
     */
    static databaseError(message = 'Database operation failed', originalError = null) {
        const error = ErrorHandler.createError(
            ErrorHandler.ErrorTypes.DATABASE,
            message,
            500,
            'DATABASE_ERROR'
        );
        if (originalError) {
            error.originalError = originalError.message;
        }
        return error;
    }

    /**
     * External API error creator
     */
    static externalAPIError(message = 'External service unavailable', service = 'unknown') {
        const error = ErrorHandler.createError(
            ErrorHandler.ErrorTypes.EXTERNAL_API,
            message,
            503,
            'EXTERNAL_SERVICE_ERROR'
        );
        error.service = service;
        return error;
    }

    /**
     * Business logic error creator
     */
    static businessError(message, code = 'BUSINESS_LOGIC_ERROR') {
        return ErrorHandler.createError(
            ErrorHandler.ErrorTypes.BUSINESS_LOGIC,
            message,
            400,
            code
        );
    }
}

// Export error handler and utilities
module.exports = {
    ErrorHandler,
    asyncHandler: ErrorHandler.asyncHandler.bind(ErrorHandler),
    createError: ErrorHandler.createError.bind(ErrorHandler),
    validationError: ErrorHandler.validationError.bind(ErrorHandler),
    authenticationError: ErrorHandler.authenticationError.bind(ErrorHandler),
    authorizationError: ErrorHandler.authorizationError.bind(ErrorHandler),
    databaseError: ErrorHandler.databaseError.bind(ErrorHandler),
    externalAPIError: ErrorHandler.externalAPIError.bind(ErrorHandler),
    businessError: ErrorHandler.businessError.bind(ErrorHandler)
};
