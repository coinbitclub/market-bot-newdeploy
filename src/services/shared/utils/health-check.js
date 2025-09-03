/**
 * 💓 SISTEMA DE HEALTH CHECK
 * Monitora saúde de todos os serviços
 */

const { createLogger } = require('./logger');

class HealthCheckSystem {
    constructor(orchestrator) {
        this.orchestrator = orchestrator;
        this.logger = createLogger('health-check');
        this.checks = new Map();
        this.intervals = new Map();
    }

    /**
     * Registra health check para um serviço
     */
    registerCheck(serviceName, checkFunction, interval = 30000) {
        this.checks.set(serviceName, {
            checkFunction,
            interval,
            lastCheck: null,
            status: 'unknown',
            consecutiveFailures: 0,
            history: []
        });

        this.startPeriodicCheck(serviceName);
        this.logger.info(`Health check registered for ${serviceName}`);
    }

    /**
     * Inicia verificação periódica para um serviço
     */
    startPeriodicCheck(serviceName) {
        const check = this.checks.get(serviceName);
        if (!check) return;

        const intervalId = setInterval(async () => {
            await this.performCheck(serviceName);
        }, check.interval);

        this.intervals.set(serviceName, intervalId);

        // Primeira verificação imediata
        this.performCheck(serviceName);
    }

    /**
     * Executa health check para um serviço específico
     */
    async performCheck(serviceName) {
        const check = this.checks.get(serviceName);
        if (!check) return;

        try {
            const startTime = Date.now();
            const isHealthy = await check.checkFunction();
            const responseTime = Date.now() - startTime;

            check.lastCheck = Date.now();
            check.status = isHealthy ? 'healthy' : 'unhealthy';

            if (isHealthy) {
                check.consecutiveFailures = 0;
            } else {
                check.consecutiveFailures++;
                this.logger.warn(`Health check failed for ${serviceName} (attempt ${check.consecutiveFailures})`);
            }

            // Manter histórico das últimas 50 verificações
            check.history.push({
                timestamp: check.lastCheck,
                status: check.status,
                responseTime,
                isHealthy
            });

            if (check.history.length > 50) {
                check.history.shift();
            }

            // Alertar se muitas falhas consecutivas
            if (check.consecutiveFailures >= 3) {
                this.handleCriticalFailure(serviceName, check);
            }

        } catch (error) {
            check.status = 'error';
            check.consecutiveFailures++;
            this.logger.error(`Health check error for ${serviceName}:`, error);
        }
    }

    /**
     * Manipula falhas críticas
     */
    handleCriticalFailure(serviceName, check) {
        this.logger.error(`CRITICAL: Service ${serviceName} failed ${check.consecutiveFailures} consecutive health checks`);
        
        // Emitir evento crítico
        this.orchestrator.emit('service:critical', {
            serviceName,
            consecutiveFailures: check.consecutiveFailures,
            lastCheck: check.lastCheck,
            status: check.status
        });

        // TODO: Implementar auto-restart ou outras ações de recuperação
    }

    /**
     * Retorna status de saúde de todos os serviços
     */
    getAllHealthStatus() {
        const status = {};

        for (const [serviceName, check] of this.checks) {
            status[serviceName] = {
                status: check.status,
                lastCheck: check.lastCheck,
                consecutiveFailures: check.consecutiveFailures,
                uptime: this.calculateUptime(check.history),
                avgResponseTime: this.calculateAvgResponseTime(check.history)
            };
        }

        return {
            timestamp: Date.now(),
            overall: this.calculateOverallHealth(status),
            services: status
        };
    }

    /**
     * Calcula uptime baseado no histórico
     */
    calculateUptime(history) {
        if (history.length === 0) return 0;

        const healthyChecks = history.filter(h => h.isHealthy).length;
        return (healthyChecks / history.length) * 100;
    }

    /**
     * Calcula tempo médio de resposta
     */
    calculateAvgResponseTime(history) {
        if (history.length === 0) return 0;

        const totalTime = history.reduce((sum, h) => sum + h.responseTime, 0);
        return totalTime / history.length;
    }

    /**
     * Calcula saúde geral do sistema
     */
    calculateOverallHealth(serviceStatuses) {
        const services = Object.values(serviceStatuses);
        if (services.length === 0) return 'unknown';

        const healthyServices = services.filter(s => s.status === 'healthy').length;
        const healthPercentage = (healthyServices / services.length) * 100;

        if (healthPercentage === 100) return 'healthy';
        if (healthPercentage >= 80) return 'degraded';
        if (healthPercentage >= 50) return 'critical';
        return 'down';
    }

    /**
     * Para todos os health checks
     */
    stopAllChecks() {
        for (const [serviceName, intervalId] of this.intervals) {
            clearInterval(intervalId);
            this.logger.info(`Health check stopped for ${serviceName}`);
        }
        
        this.intervals.clear();
    }
}

module.exports = HealthCheckSystem;