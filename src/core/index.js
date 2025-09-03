/**
 * 🏗️ CORE ENTERPRISE PATTERNS INDEX
 * 
 * Exporta todos os padrões enterprise centralizados
 */

const { DIContainer, container } = require('./container');
const { Logger, logger } = require('./logger');
const { ErrorHandler, AppError, ValidationError, TradingError } = require('./errors');
const { ConfigManager, config } = require('./config');
const { MetricsCollector, metrics } = require('./metrics');
const { FeatureFlagManager, featureFlags } = require('./feature-flags');
const { SecretsManager, secretsManager } = require('./secrets');
const { SecurityConfig, securityConfig } = require('./security');
const { AdvancedMonitoringSystem, advancedMonitoring } = require('./monitoring');

// Configurar container DI com todos os serviços
container
    .registerSingleton('logger', Logger)
    .registerSingleton('config', ConfigManager)
    .registerSingleton('metrics', MetricsCollector)
    .registerSingleton('featureFlags', FeatureFlagManager)
    .registerSingleton('secretsManager', SecretsManager)
    .registerSingleton('securityConfig', SecurityConfig)
    .registerSingleton('monitoring', AdvancedMonitoringSystem);

module.exports = {
    // Dependency Injection
    DIContainer,
    container,
    
    // Logging
    Logger,
    logger,
    
    // Error Handling
    ErrorHandler,
    AppError,
    ValidationError,
    TradingError,
    
    // Configuration
    ConfigManager,
    config,
    
    // Metrics
    MetricsCollector,
    metrics,
    
    // Feature Flags
    FeatureFlagManager,
    featureFlags,
    
    // Secrets Management
    SecretsManager,
    secretsManager,
    
    // Security
    SecurityConfig,
    securityConfig,
    
    // Advanced Monitoring
    AdvancedMonitoringSystem,
    advancedMonitoring
};
