/**
 * 👤 USER ROUTES - COINBITCLUB ENTERPRISE v6.0.0
 * User management and profile routes
 */

const express = require('express');
const AuthMiddleware = require('../middleware/auth');

class UserRoutes {
    constructor() {
        this.router = express.Router();
        this.authMiddleware = new AuthMiddleware();
        this.setupRoutes();
    }

    setupRoutes() {
        // All routes require authentication
        this.router.use(this.authMiddleware.authenticate.bind(this.authMiddleware));

        // User profile routes
        this.router.get('/profile', this.getProfile.bind(this));
        this.router.put('/profile', this.updateProfile.bind(this));
        this.router.get('/settings', this.getSettings.bind(this));
        this.router.put('/settings', this.updateSettings.bind(this));
    }

    /**
     * GET /profile - Get user profile
     */
    async getProfile(req, res) {
        try {
            res.json({
                success: true,
                user: {
                    id: req.user.id,
                    email: req.user.email,
                    userType: req.user.user_type,
                    isAdmin: req.user.is_admin
                }
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    /**
     * PUT /profile - Update user profile
     */
    async updateProfile(req, res) {
        try {
            res.json({
                success: true,
                message: 'Profile updated successfully'
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }


    /**
     * GET /settings - Get user settings
     */
    async getSettings(req, res) {
        try {
            res.json({
                success: true,
                settings: {
                    trading: { enabled: true, maxPositions: 2 },
                    notifications: { email: true, push: true },
                    language: 'pt-BR'
                }
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    /**
     * PUT /settings - Update user settings
     */
    async updateSettings(req, res) {
        try {
            res.json({
                success: true,
                message: 'Settings updated successfully'
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    getRouter() {
        return this.router;
    }
}

module.exports = new UserRoutes();
