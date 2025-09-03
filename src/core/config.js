/**
 * ⚙️ CONFIGURATION MANAGEMENT
 * 
 * Sistema de configuração centralizada enterprise
 */

const path = require('path');
const { logger } = require('./logger');

class ConfigManager {
    constructor() {
        this.config = {};
        this.environment = process.env.NODE_ENV || 'development';
        this.loaded = false;
    }

    async loadConfig() {
        if (this.loaded) return this.config;

        try {
            // Configuração base
            const baseConfig = {
                app: {
                    name: 'CoinBitClub MarketBot',
                    version: '3.0.0',
                    port: process.env.PORT || 3005,
                    environment: this.environment
                },
                
                database: {
                    url: process.env.POSTGRES_URL,
                    ssl: process.env.NODE_ENV === 'production',
                    poolSize: parseInt(process.env.DB_POOL_SIZE) || 20
                },
                
                security: {
                    jwtSecret: process.env.JWT_SECRET || 'dev-secret',
                    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS) || 12,
                    sessionTimeout: parseInt(process.env.SESSION_TIMEOUT) || 86400
                },
                
                exchanges: {
                    binance: {
                        testnet: process.env.BINANCE_TESTNET === 'true',
                        timeout: parseInt(process.env.BINANCE_TIMEOUT) || 10000
                    }
                },
                
                ai: {
                    openai: {
                        apiKey: process.env.OPENAI_API_KEY,
                        model: process.env.OPENAI_MODEL || 'gpt-4',
                        maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS) || 2000
                    }
                },
                
                notifications: {
                    twilio: {
                        accountSid: process.env.TWILIO_ACCOUNT_SID,
                        authToken: process.env.TWILIO_AUTH_TOKEN,
                        fromNumber: process.env.TWILIO_FROM_NUMBER
                    },
                    email: {
                        service: process.env.EMAIL_SERVICE || 'gmail',
                        user: process.env.EMAIL_USER,
                        password: process.env.EMAIL_PASSWORD
                    }
                },
                
                monitoring: {
                    enabled: process.env.MONITORING_ENABLED !== 'false',
                    interval: parseInt(process.env.MONITORING_INTERVAL) || 30000,
                    alertThreshold: parseFloat(process.env.ALERT_THRESHOLD) || 0.95
                },
                
                performance: {
                    enableMetrics: process.env.ENABLE_METRICS !== 'false',
                    metricsInterval: parseInt(process.env.METRICS_INTERVAL) || 60000,
                    maxMemoryUsage: parseInt(process.env.MAX_MEMORY_MB) || 512
                }
            };

            // Carregar configuração específica do ambiente
            const envConfig = await this.loadEnvironmentConfig();
            
            // Merge das configurações
            this.config = this.mergeConfigs(baseConfig, envConfig);
            
            // Validar configuração
            this.validateConfig();
            
            this.loaded = true;
            logger.info('Configuração carregada com sucesso', { 
                environment: this.environment,
                configKeys: Object.keys(this.config)
            });
            
            return this.config;
            
        } catch (error) {
            logger.error('Erro ao carregar configuração', { error: error.message });
            throw error;
        }
    }

    async loadEnvironmentConfig() {
        try {
            const configPath = path.join(process.cwd(), 'config', 'environments', `${this.environment}.js`);
            return require(configPath);
        } catch (error) {
            logger.warn(`Configuração específica para ${this.environment} não encontrada`);
            return {};
        }
    }

    mergeConfigs(base, env) {
        const merged = { ...base };
        
        for (const [key, value] of Object.entries(env)) {
            if (typeof value === 'object' && !Array.isArray(value)) {
                merged[key] = { ...merged[key], ...value };
            } else {
                merged[key] = value;
            }
        }
        
        return merged;
    }

    validateConfig() {
        const required = [
            'POSTGRES_URL',
            'OPENAI_API_KEY'
        ];

        const missing = required.filter(key => !process.env[key]);
        
        if (missing.length > 0) {
            throw new Error(`Variáveis de ambiente obrigatórias não definidas: ${missing.join(', ')}`);
        }
    }

    get(path, defaultValue = null) {
        if (!this.loaded) {
            throw new Error('Configuração não carregada. Chame loadConfig() primeiro.');
        }

        const keys = path.split('.');
        let current = this.config;
        
        for (const key of keys) {
            if (current[key] === undefined) {
                return defaultValue;
            }
            current = current[key];
        }
        
        return current;
    }

    set(path, value) {
        const keys = path.split('.');
        let current = this.config;
        
        for (let i = 0; i < keys.length - 1; i++) {
            const key = keys[i];
            if (!current[key] || typeof current[key] !== 'object') {
                current[key] = {};
            }
            current = current[key];
        }
        
        current[keys[keys.length - 1]] = value;
    }

    getAll() {
        return this.config;
    }
}

// Instância global
const config = new ConfigManager();

module.exports = { ConfigManager, config };
