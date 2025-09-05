/**
 * 📝 ENTERPRISE LOGGER - SISTEMA DE LOGS ESTRUTURADOS
 * =====================================================
 * 
 * Sistema avançado de logging com níveis, rotação automática
 * Correlation IDs e métricas de performance
 * 
 * @author CoinBitClub Enterprise Team
 * @version 6.0.0 Advanced
 */

const winston = require('winston');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

class EnterpriseLogger {
    constructor(options = {}) {
        this.appName = options.appName || 'CoinBitClub';
        this.environment = process.env.NODE_ENV || 'development';
        this.logLevel = process.env.LOG_LEVEL || 'info';
        this.logFormat = process.env.LOG_FORMAT || 'json';
        this.logDir = options.logDir || path.join(process.cwd(), 'logs');
        
        this.correlationIds = new Map();
        this.requestMetrics = new Map();
        
        this.ensureLogDirectory();
        this.createLogger();
        this.setupCleanup();
        
        console.log('📝 Enterprise Logger inicializado');
        console.log(`📊 Nível: ${this.logLevel} | Formato: ${this.logFormat}`);
    }

    /**
     * 📁 Garantir que diretório de logs existe
     */
    ensureLogDirectory() {
        if (!fs.existsSync(this.logDir)) {
            fs.mkdirSync(this.logDir, { recursive: true });
            console.log(`📁 Diretório de logs criado: ${this.logDir}`);
        }
    }

    /**
     * 🏗️ Criar logger Winston
     */
    createLogger() {
        const customFormat = winston.format.combine(
            winston.format.timestamp(),
            winston.format.errors({ stack: true }),
            winston.format.json(),
            winston.format.printf((info) => {
                return JSON.stringify({
                    timestamp: info.timestamp,
                    level: info.level,
                    message: info.message,
                    service: this.appName,
                    environment: this.environment,
                    correlationId: info.correlationId,
                    userId: info.userId,
                    requestId: info.requestId,
                    duration: info.duration,
                    metadata: info.metadata,
                    stack: info.stack,
                    hostname: require('os').hostname(),
                    pid: process.pid
                });
            })
        );

        const transports = [
            // Console transport
            new winston.transports.Console({
                level: this.logLevel,
                format: this.environment === 'development' 
                    ? winston.format.combine(
                        winston.format.colorize(),
                        winston.format.simple()
                    )
                    : customFormat
            }),

            // Arquivo de logs gerais
            new winston.transports.File({
                filename: path.join(this.logDir, 'application.log'),
                level: this.logLevel,
                format: customFormat,
                maxsize: parseInt(process.env.LOG_MAX_SIZE?.replace('m', '')) * 1024 * 1024 || 10485760,
                maxFiles: parseInt(process.env.LOG_MAX_FILES) || 5,
                tailable: true
            }),

            // Arquivo específico para erros
            new winston.transports.File({
                filename: path.join(this.logDir, 'errors.log'),
                level: 'error',
                format: customFormat,
                maxsize: 10485760,
                maxFiles: 3,
                tailable: true
            }),

            // Arquivo para trading
            new winston.transports.File({
                filename: path.join(this.logDir, 'trading.log'),
                level: 'info',
                format: customFormat,
                maxsize: 20971520, // 20MB
                maxFiles: 7,
                tailable: true
            }),

            // Arquivo para security
            new winston.transports.File({
                filename: path.join(this.logDir, 'security.log'),
                level: 'warn',
                format: customFormat,
                maxsize: 10485760,
                maxFiles: 10,
                tailable: true
            })
        ];

        this.logger = winston.createLogger({
            level: this.logLevel,
            transports: transports,
            exitOnError: false
        });

        // Handler para uncaught exceptions
        this.logger.exceptions.handle(
            new winston.transports.File({
                filename: path.join(this.logDir, 'exceptions.log'),
                format: customFormat
            })
        );

        // Handler para unhandled rejections
        this.logger.rejections.handle(
            new winston.transports.File({
                filename: path.join(this.logDir, 'rejections.log'),
                format: customFormat
            })
        );
    }

    /**
     * 🆔 Gerar correlation ID
     */
    generateCorrelationId() {
        return crypto.randomBytes(16).toString('hex');
    }

    /**
     * 🆔 Definir correlation ID para request
     */
    setCorrelationId(correlationId, metadata = {}) {
        this.correlationIds.set(correlationId, {
            startTime: Date.now(),
            ...metadata
        });
        return correlationId;
    }

    /**
     * 🆔 Obter correlation ID atual
     */
    getCurrentCorrelationId() {
        return require('async_hooks').executionAsyncId().toString();
    }

    /**
     * ⏱️ Iniciar medição de performance
     */
    startTimer(requestId) {
        this.requestMetrics.set(requestId, {
            startTime: process.hrtime.bigint(),
            timestamp: Date.now()
        });
        return requestId;
    }

    /**
     * ⏱️ Finalizar medição de performance
     */
    endTimer(requestId) {
        const metrics = this.requestMetrics.get(requestId);
        if (metrics) {
            const endTime = process.hrtime.bigint();
            const duration = Number(endTime - metrics.startTime) / 1000000; // Convert to milliseconds
            this.requestMetrics.delete(requestId);
            return Math.round(duration * 100) / 100; // Round to 2 decimal places
        }
        return null;
    }

    /**
     * 📊 Log com contexto enriched
     */
    log(level, message, metadata = {}) {
        const correlationId = metadata.correlationId || this.getCurrentCorrelationId();
        
        this.logger.log(level, message, {
            correlationId,
            userId: metadata.userId,
            requestId: metadata.requestId,
            duration: metadata.duration,
            metadata: metadata.data || metadata,
            component: metadata.component,
            action: metadata.action
        });
    }

    /**
     * 📄 Info logs
     */
    info(message, metadata = {}) {
        this.log('info', message, metadata);
    }

    /**
     * ⚠️ Warning logs
     */
    warn(message, metadata = {}) {
        this.log('warn', message, metadata);
    }

    /**
     * ❌ Error logs
     */
    error(message, error = null, metadata = {}) {
        const errorData = error ? {
            error: error.message,
            stack: error.stack,
            code: error.code
        } : {};

        this.log('error', message, {
            ...metadata,
            ...errorData
        });
    }

    /**
     * 🐛 Debug logs
     */
    debug(message, metadata = {}) {
        this.log('debug', message, metadata);
    }

    /**
     * 💰 Trading logs específicos
     */
    trading(action, symbol, data = {}) {
        this.info(`Trading: ${action}`, {
            component: 'trading',
            action: action,
            symbol: symbol,
            data: data
        });
    }

    /**
     * 🔐 Security logs específicos
     */
    security(event, userId, data = {}) {
        this.warn(`Security: ${event}`, {
            component: 'security',
            action: event,
            userId: userId,
            data: data
        });
    }

    /**
     * 💳 Financial logs específicos
     */
    financial(action, amount, currency, data = {}) {
        this.info(`Financial: ${action}`, {
            component: 'financial',
            action: action,
            amount: amount,
            currency: currency,
            data: data
        });
    }

    /**
     * 🤖 AI/ML logs específicos
     */
    ai(model, action, data = {}) {
        this.info(`AI: ${model} - ${action}`, {
            component: 'ai',
            model: model,
            action: action,
            data: data
        });
    }

    /**
     * 🌐 API logs específicos
     */
    api(method, endpoint, statusCode, duration, metadata = {}) {
        const level = statusCode >= 400 ? 'error' : 'info';
        
        this.log(level, `${method} ${endpoint} - ${statusCode}`, {
            component: 'api',
            method: method,
            endpoint: endpoint,
            statusCode: statusCode,
            duration: duration,
            ...metadata
        });
    }

    /**
     * 📊 Performance logs
     */
    performance(operation, duration, metadata = {}) {
        const level = duration > 1000 ? 'warn' : 'info'; // Warn if > 1 second
        
        this.log(level, `Performance: ${operation}`, {
            component: 'performance',
            operation: operation,
            duration: duration,
            ...metadata
        });
    }

    /**
     * 📊 Business metrics logs
     */
    metrics(metric, value, unit = '', metadata = {}) {
        this.info(`Metric: ${metric}`, {
            component: 'metrics',
            metric: metric,
            value: value,
            unit: unit,
            ...metadata
        });
    }

    /**
     * 🔍 Audit logs
     */
    audit(action, userId, resource, data = {}) {
        this.info(`Audit: ${action}`, {
            component: 'audit',
            action: action,
            userId: userId,
            resource: resource,
            data: data
        });
    }

    /**
     * 📊 Obter estatísticas de logs
     */
    getStats() {
        const logFiles = fs.readdirSync(this.logDir);
        const stats = {};

        logFiles.forEach(file => {
            const filePath = path.join(this.logDir, file);
            const stat = fs.statSync(filePath);
            
            stats[file] = {
                size: this.formatBytes(stat.size),
                modified: stat.mtime.toISOString(),
                lines: this.countLines(filePath)
            };
        });

        return {
            logDirectory: this.logDir,
            logLevel: this.logLevel,
            logFormat: this.logFormat,
            files: stats,
            activeCorrelations: this.correlationIds.size,
            activeMetrics: this.requestMetrics.size
        };
    }

    /**
     * 📏 Contar linhas em arquivo
     */
    countLines(filePath) {
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            return content.split('\n').length - 1;
        } catch (error) {
            return 0;
        }
    }

    /**
     * 📊 Formatar bytes
     */
    formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    }

    /**
     * 🧹 Configurar limpeza automática
     */
    setupCleanup() {
        // Limpeza de correlation IDs antigos a cada hora
        setInterval(() => {
            const now = Date.now();
            const oneHour = 60 * 60 * 1000;
            
            for (const [id, data] of this.correlationIds.entries()) {
                if (now - data.startTime > oneHour) {
                    this.correlationIds.delete(id);
                }
            }
            
            // Limpeza de métricas de request antigas
            for (const [id, data] of this.requestMetrics.entries()) {
                if (now - data.timestamp > oneHour) {
                    this.requestMetrics.delete(id);
                }
            }
            
        }, 60 * 60 * 1000); // A cada hora
    }

    /**
     * 🔄 Middleware para Express
     */
    middleware() {
        return (req, res, next) => {
            const correlationId = req.headers['x-correlation-id'] || this.generateCorrelationId();
            const requestId = this.generateCorrelationId();
            
            req.correlationId = correlationId;
            req.requestId = requestId;
            req.startTime = this.startTimer(requestId);
            
            res.setHeader('X-Correlation-ID', correlationId);
            
            // Log da requisição
            this.api(req.method, req.originalUrl, 0, 0, {
                correlationId,
                requestId,
                userAgent: req.headers['user-agent'],
                ip: req.ip,
                body: req.method !== 'GET' ? req.body : undefined
            });

            // Override do res.end para log da resposta
            const originalEnd = res.end;
            res.end = (...args) => {
                const duration = this.endTimer(requestId);
                
                this.api(req.method, req.originalUrl, res.statusCode, duration, {
                    correlationId,
                    requestId,
                    responseSize: res.getHeader('content-length')
                });
                
                originalEnd.apply(res, args);
            };
            
            next();
        };
    }

    /**
     * 🔌 Fechar logger
     */
    close() {
        this.logger.close();
        console.log('📝 Enterprise Logger fechado');
    }
}

module.exports = EnterpriseLogger;
