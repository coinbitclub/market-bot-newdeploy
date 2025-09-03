/**
 * 📝 SISTEMA DE LOGGING CENTRALIZADO
 * Logs estruturados com correlationId
 */

const util = require('util');

class CentralizedLogger {
    constructor(serviceName, options = {}) {
        this.serviceName = serviceName;
        this.logLevel = options.logLevel || process.env.LOG_LEVEL || 'info';
        this.enableColors = options.enableColors !== false;
        this.enableTimestamp = options.enableTimestamp !== false;
        
        this.levels = {
            error: 0,
            warn: 1,
            info: 2,
            debug: 3,
            trace: 4
        };

        this.colors = {
            error: '\x1b[31m',  // Red
            warn: '\x1b[33m',   // Yellow
            info: '\x1b[36m',   // Cyan
            debug: '\x1b[37m',  // White
            trace: '\x1b[90m',  // Gray
            reset: '\x1b[0m'
        };
    }

    /**
     * Log de erro
     */
    error(message, meta = {}) {
        this.log('error', message, meta);
    }

    /**
     * Log de warning
     */
    warn(message, meta = {}) {
        this.log('warn', message, meta);
    }

    /**
     * Log de informação
     */
    info(message, meta = {}) {
        this.log('info', message, meta);
    }

    /**
     * Log de debug
     */
    debug(message, meta = {}) {
        this.log('debug', message, meta);
    }

    /**
     * Log de trace
     */
    trace(message, meta = {}) {
        this.log('trace', message, meta);
    }

    /**
     * Método principal de logging
     */
    log(level, message, meta = {}) {
        if (this.levels[level] > this.levels[this.logLevel]) {
            return;
        }

        const logEntry = {
            timestamp: new Date().toISOString(),
            level: level.toUpperCase(),
            service: this.serviceName,
            message,
            ...meta
        };

        // Formato para console
        const consoleMessage = this.formatForConsole(logEntry);
        
        // Output baseado no nível
        if (level === 'error') {
            console.error(consoleMessage);
        } else if (level === 'warn') {
            console.warn(consoleMessage);
        } else {
            console.log(consoleMessage);
        }

        // TODO: Enviar para sistemas de logging externos (ELK, Loki, etc.)
        this.sendToExternalSystems(logEntry);
    }

    /**
     * Formata log para console
     */
    formatForConsole(logEntry) {
        const { timestamp, level, service, message, correlationId, ...meta } = logEntry;
        
        let formatted = '';

        // Timestamp
        if (this.enableTimestamp) {
            formatted += `[${timestamp}] `;
        }

        // Level com cor
        if (this.enableColors) {
            const color = this.colors[level.toLowerCase()] || this.colors.info;
            formatted += `${color}${level.padEnd(5)}${this.colors.reset} `;
        } else {
            formatted += `${level.padEnd(5)} `;
        }

        // Service
        formatted += `[${service}] `;

        // CorrelationId se presente
        if (correlationId) {
            formatted += `[${correlationId}] `;
        }

        // Message
        formatted += message;

        // Metadata adicional
        if (Object.keys(meta).length > 0) {
            formatted += ` ${util.inspect(meta, { depth: 2, colors: this.enableColors })}`;
        }

        return formatted;
    }

    /**
     * Envia logs para sistemas externos
     */
    sendToExternalSystems(logEntry) {
        // TODO: Implementar integração com:
        // - Elasticsearch + Logstash + Kibana (ELK)
        // - Grafana Loki
        // - AWS CloudWatch
        // - Google Cloud Logging
        
        // Por enquanto, apenas estrutura JSON para futuras integrações
        if (process.env.ENABLE_JSON_LOGS === 'true') {
            console.log(JSON.stringify(logEntry));
        }
    }

    /**
     * Cria child logger com contexto adicional
     */
    child(additionalContext = {}) {
        const childLogger = Object.create(this);
        childLogger.defaultContext = { ...this.defaultContext, ...additionalContext };
        return childLogger;
    }

    /**
     * Log de métricas estruturadas
     */
    metric(metricName, value, unit = '', tags = {}) {
        this.info(`METRIC: ${metricName}`, {
            metric: {
                name: metricName,
                value,
                unit,
                tags
            }
        });
    }

    /**
     * Log de eventos de negócio
     */
    event(eventType, data = {}) {
        this.info(`EVENT: ${eventType}`, {
            event: {
                type: eventType,
                data
            }
        });
    }
}

/**
 * Factory function para criar loggers
 */
function createLogger(serviceName, options = {}) {
    return new CentralizedLogger(serviceName, options);
}

module.exports = {
    CentralizedLogger,
    createLogger
};