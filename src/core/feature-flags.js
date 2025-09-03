/**
 * 🎛️ FEATURE FLAGS SYSTEM
 * 
 * Sistema de feature flags para controle de funcionalidades
 */

const { logger } = require('./logger');

class FeatureFlagManager {
    constructor() {
        this.flags = new Map();
        this.environment = process.env.NODE_ENV || 'development';
        this.loadDefaultFlags();
    }

    loadDefaultFlags() {
        // Flags padrão do sistema
        const defaultFlags = {
            // Trading Features
            'enable-real-trading': {
                enabled: this.environment === 'production',
                description: 'Habilita trading com dinheiro real',
                environments: ['production']
            },
            
            'enable-paper-trading': {
                enabled: true,
                description: 'Habilita paper trading (simulação)',
                environments: ['development', 'staging', 'production']
            },
            
            'enable-ai-analysis': {
                enabled: true,
                description: 'Habilita análise de IA',
                environments: ['development', 'staging', 'production']
            },
            
            // Security Features
            'enable-2fa': {
                enabled: this.environment === 'production',
                description: 'Habilita autenticação de dois fatores',
                environments: ['production']
            },
            
            'enable-ip-whitelist': {
                enabled: this.environment === 'production',
                description: 'Habilita whitelist de IPs',
                environments: ['production']
            },
            
            // Monitoring Features
            'enable-detailed-metrics': {
                enabled: true,
                description: 'Habilita métricas detalhadas',
                environments: ['development', 'staging', 'production']
            },
            
            'enable-real-time-alerts': {
                enabled: this.environment !== 'development',
                description: 'Habilita alertas em tempo real',
                environments: ['staging', 'production']
            },
            
            // UI Features
            'enable-advanced-dashboard': {
                enabled: true,
                description: 'Habilita dashboard avançado',
                environments: ['development', 'staging', 'production']
            },
            
            'enable-dark-mode': {
                enabled: true,
                description: 'Habilita modo escuro',
                environments: ['development', 'staging', 'production']
            },
            
            // API Features
            'enable-api-v2': {
                enabled: this.environment !== 'production',
                description: 'Habilita API v2 (beta)',
                environments: ['development', 'staging']
            },
            
            'enable-webhook-notifications': {
                enabled: true,
                description: 'Habilita notificações via webhook',
                environments: ['staging', 'production']
            }
        };

        // Carregar flags do ambiente
        for (const [key, config] of Object.entries(defaultFlags)) {
            const envKey = `FEATURE_${key.toUpperCase().replace(/-/g, '_')}`;
            const envValue = process.env[envKey];
            
            if (envValue !== undefined) {
                config.enabled = envValue === 'true';
                logger.debug(`Feature flag override: ${key} = ${config.enabled}`);
            }
            
            this.flags.set(key, config);
        }
    }

    isEnabled(flagName) {
        const flag = this.flags.get(flagName);
        if (!flag) {
            logger.warn(`Feature flag '${flagName}' not found, defaulting to false`);
            return false;
        }

        // Verificar se a flag é suportada no ambiente atual
        if (!flag.environments.includes(this.environment)) {
            return false;
        }

        return flag.enabled;
    }

    enable(flagName) {
        const flag = this.flags.get(flagName);
        if (flag) {
            flag.enabled = true;
            logger.info(`Feature flag '${flagName}' enabled`);
        }
    }

    disable(flagName) {
        const flag = this.flags.get(flagName);
        if (flag) {
            flag.enabled = false;
            logger.info(`Feature flag '${flagName}' disabled`);
        }
    }

    getAll() {
        const result = {};
        for (const [key, flag] of this.flags.entries()) {
            result[key] = {
                enabled: flag.enabled,
                description: flag.description,
                supportedEnvironments: flag.environments,
                currentlyAvailable: flag.environments.includes(this.environment)
            };
        }
        return result;
    }

    // Middleware Express para injetar flags no request
    middleware() {
        return (req, res, next) => {
            req.featureFlags = {
                isEnabled: (flagName) => this.isEnabled(flagName),
                getAll: () => this.getAll()
            };
            next();
        };
    }
}

// Instância global
const featureFlags = new FeatureFlagManager();

module.exports = { FeatureFlagManager, featureFlags };
