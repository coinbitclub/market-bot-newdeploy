/**
 * 🌐 CORS CONFIGURATION - T1 Implementation
 * Configuração CORS restritiva para integração frontend-backend
 */

const cors = require('cors');

class CorsConfig {
    constructor() {
        this.allowedOrigins = [
            process.env.FRONTEND_ORIGIN || 'http://localhost:3003',
            'http://localhost:3000', // fallback dev
            'http://localhost:3001'  // fallback dev
        ];
    }

    /**
     * 🔧 Configuração CORS restritiva
     */
    getMiddleware() {
        return cors({
            origin: (origin, callback) => {
                // Permitir requests sem origin (Postman, mobile apps, etc.)
                if (!origin) return callback(null, true);
                
                if (this.allowedOrigins.includes(origin)) {
                    callback(null, true);
                } else {
                    console.warn(`🚫 CORS blocked request from: ${origin}`);
                    callback(new Error('Não permitido pelo CORS'));
                }
            },
            credentials: true,
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
            allowedHeaders: [
                'Content-Type', 
                'Authorization', 
                'X-Requested-With',
                'Accept',
                'Origin'
            ],
            exposedHeaders: ['X-Total-Count', 'X-Page-Count']
        });
    }

    /**
     * 📋 Listar origens permitidas
     */
    getAllowedOrigins() {
        return this.allowedOrigins;
    }
}

module.exports = new CorsConfig();