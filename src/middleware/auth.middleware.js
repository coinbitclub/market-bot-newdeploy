/**
 * 🔐 AUTHENTICATION MIDDLEWARE
 * JWT verification and user authentication with rate limiting
 */

const jwt = require('jsonwebtoken');
const { authenticationError, authorizationError } = require('./error-handler');

class AuthMiddleware {
    constructor() {
        // CRITICAL: Enforce JWT secrets in production
        if (process.env.NODE_ENV === 'production') {
            if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
                throw new Error('FATAL: JWT_SECRET must be set and at least 32 characters in production');
            }
            if (!process.env.JWT_REFRESH_SECRET || process.env.JWT_REFRESH_SECRET.length < 32) {
                throw new Error('FATAL: JWT_REFRESH_SECRET must be set and at least 32 characters in production');
            }
        }

        this.jwtSecret = process.env.JWT_SECRET || (process.env.NODE_ENV === 'development' ? 'dev-jwt-secret-CHANGE-IN-PRODUCTION' : null);
        this.jwtRefreshSecret = process.env.JWT_REFRESH_SECRET || (process.env.NODE_ENV === 'development' ? 'dev-refresh-secret-CHANGE-IN-PRODUCTION' : null);

        if (!this.jwtSecret || !this.jwtRefreshSecret) {
            throw new Error('FATAL: JWT secrets not configured');
        }
    }

    /**
     * Verify JWT token middleware
     */
    verifyToken() {
        return async (req, res, next) => {
            try {
                // Get token from header
                const authHeader = req.headers.authorization;

                if (!authHeader || !authHeader.startsWith('Bearer ')) {
                    throw authenticationError('No token provided');
                }

                const token = authHeader.substring(7); // Remove 'Bearer ' prefix

                // Verify token
                const decoded = jwt.verify(token, this.jwtSecret);

                // Attach user info to request
                req.user = {
                    id: decoded.userId || decoded.id,
                    email: decoded.email,
                    userType: decoded.userType || decoded.user_type,
                    permissions: decoded.permissions || []
                };

                // Attach token expiry info
                req.tokenExp = decoded.exp;

                next();
            } catch (error) {
                if (error.name === 'TokenExpiredError') {
                    return next(authenticationError('Token expired'));
                }
                if (error.name === 'JsonWebTokenError') {
                    return next(authenticationError('Invalid token'));
                }
                next(error);
            }
        };
    }

    /**
     * Verify refresh token
     */
    verifyRefreshToken() {
        return async (req, res, next) => {
            try {
                const refreshToken = req.body.refreshToken || req.headers['x-refresh-token'];

                if (!refreshToken) {
                    throw authenticationError('No refresh token provided');
                }

                // Verify refresh token
                const decoded = jwt.verify(refreshToken, this.jwtRefreshSecret);

                req.user = {
                    id: decoded.userId || decoded.id,
                    email: decoded.email,
                    userType: decoded.userType || decoded.user_type
                };

                next();
            } catch (error) {
                if (error.name === 'TokenExpiredError') {
                    return next(authenticationError('Refresh token expired'));
                }
                if (error.name === 'JsonWebTokenError') {
                    return next(authenticationError('Invalid refresh token'));
                }
                next(error);
            }
        };
    }

    /**
     * Check if user has required role
     */
    requireRole(...allowedRoles) {
        return (req, res, next) => {
            if (!req.user) {
                return next(authenticationError('User not authenticated'));
            }

            const userRole = req.user.userType;

            if (!allowedRoles.includes(userRole)) {
                return next(authorizationError(
                    `Insufficient permissions. Required: ${allowedRoles.join(' or ')}`
                ));
            }

            next();
        };
    }

    /**
     * Check if user has specific permission
     */
    requirePermission(...requiredPermissions) {
        return (req, res, next) => {
            if (!req.user) {
                return next(authenticationError('User not authenticated'));
            }

            const userPermissions = req.user.permissions || [];

            // Check if user has all required permissions
            const hasAllPermissions = requiredPermissions.every(
                permission => userPermissions.includes(permission)
            );

            if (!hasAllPermissions) {
                return next(authorizationError(
                    `Missing required permissions: ${requiredPermissions.join(', ')}`
                ));
            }

            next();
        };
    }

    /**
     * Optional authentication (doesn't fail if no token)
     */
    optionalAuth() {
        return async (req, res, next) => {
            try {
                const authHeader = req.headers.authorization;

                if (authHeader && authHeader.startsWith('Bearer ')) {
                    const token = authHeader.substring(7);
                    const decoded = jwt.verify(token, this.jwtSecret);

                    req.user = {
                        id: decoded.userId || decoded.id,
                        email: decoded.email,
                        userType: decoded.userType || decoded.user_type,
                        permissions: decoded.permissions || []
                    };
                }

                next();
            } catch (error) {
                // Continue without user (optional auth)
                next();
            }
        };
    }

    /**
     * Check if user is active
     */
    requireActiveUser() {
        return async (req, res, next) => {
            if (!req.user) {
                return next(authenticationError('User not authenticated'));
            }

            // TODO: Check user active status from database
            // For now, assume all authenticated users are active

            next();
        };
    }

    /**
     * Check API key authentication (for webhook/API integrations)
     */
    requireAPIKey() {
        return (req, res, next) => {
            const apiKey = req.headers['x-api-key'] || req.query.api_key;

            if (!apiKey) {
                return next(authenticationError('API key required'));
            }

            // TODO: Validate API key against database
            const validAPIKey = process.env.ADMIN_API_KEY;

            if (apiKey !== validAPIKey) {
                return next(authenticationError('Invalid API key'));
            }

            // Attach API key info to request
            req.apiKey = {
                key: apiKey,
                type: 'admin' // or get from database
            };

            next();
        };
    }

    /**
     * Rate limiting for authentication endpoints
     * (Uses SecurityConfig rate limiters)
     */
    static authRateLimit() {
        const { securityConfig } = require('../core/security');
        return securityConfig.getRateLimiter('auth');
    }

    /**
     * Check if token is about to expire (within 5 minutes)
     */
    checkTokenExpiry() {
        return (req, res, next) => {
            if (req.tokenExp) {
                const expiresIn = req.tokenExp * 1000 - Date.now();
                const fiveMinutes = 5 * 60 * 1000;

                if (expiresIn < fiveMinutes && expiresIn > 0) {
                    // Set header to indicate token is expiring soon
                    res.setHeader('X-Token-Expiring-Soon', 'true');
                    res.setHeader('X-Token-Expires-In', Math.floor(expiresIn / 1000));
                }
            }
            next();
        };
    }
}

// Create singleton instance
const authMiddleware = new AuthMiddleware();

// Export middleware functions
module.exports = {
    AuthMiddleware,
    verifyToken: authMiddleware.verifyToken.bind(authMiddleware),
    verifyRefreshToken: authMiddleware.verifyRefreshToken.bind(authMiddleware),
    requireRole: authMiddleware.requireRole.bind(authMiddleware),
    requirePermission: authMiddleware.requirePermission.bind(authMiddleware),
    optionalAuth: authMiddleware.optionalAuth.bind(authMiddleware),
    requireActiveUser: authMiddleware.requireActiveUser.bind(authMiddleware),
    requireAPIKey: authMiddleware.requireAPIKey.bind(authMiddleware),
    checkTokenExpiry: authMiddleware.checkTokenExpiry.bind(authMiddleware),
    authRateLimit: AuthMiddleware.authRateLimit
};
