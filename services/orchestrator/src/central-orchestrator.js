/**
 * 🧠 ORQUESTRADOR CENTRAL
 * Gerencia todos os microserviços do sistema
 */

const EventEmitter = require('events');
const { createLogger } = require('../shared/utils/logger');

class CentralOrchestrator extends EventEmitter {
    constructor() {
        super();
        this.services = new Map();
        this.healthChecks = new Map();
        this.dependencyGraph = new Map();
        this.logger = createLogger('orchestrator');
        this.isRunning = false;
    }

    /**
     * Registra um serviço no orquestrador
     */
    registerService(serviceName, serviceInstance, dependencies = []) {
        this.services.set(serviceName, {
            instance: serviceInstance,
            dependencies: dependencies,
            status: 'registered',
            startTime: null,
            healthStatus: 'unknown'
        });

        this.dependencyGraph.set(serviceName, dependencies);
        this.logger.info(`Service registered: ${serviceName}`);
    }

    /**
     * Inicia todos os serviços na ordem correta de dependências
     */
    async startAllServices() {
        try {
            this.logger.info('Starting orchestrator and all services...');
            this.isRunning = true;

            const startOrder = this.calculateStartOrder();
            
            for (const serviceName of startOrder) {
                await this.startService(serviceName);
            }

            // Iniciar health checks
            await this.startHealthChecks();

            this.logger.info('All services started successfully');
            this.emit('orchestrator:ready');

        } catch (error) {
            this.logger.error('Failed to start services:', error);
            throw error;
        }
    }

    /**
     * Calcula ordem de inicialização baseada em dependências
     */
    calculateStartOrder() {
        const visited = new Set();
        const order = [];

        const visit = (serviceName) => {
            if (visited.has(serviceName)) return;
            
            const dependencies = this.dependencyGraph.get(serviceName) || [];
            for (const dep of dependencies) {
                visit(dep);
            }
            
            visited.add(serviceName);
            order.push(serviceName);
        };

        for (const serviceName of this.services.keys()) {
            visit(serviceName);
        }

        return order;
    }

    /**
     * Inicia um serviço específico
     */
    async startService(serviceName) {
        const service = this.services.get(serviceName);
        if (!service) {
            throw new Error(`Service not found: ${serviceName}`);
        }

        try {
            this.logger.info(`Starting service: ${serviceName}`);
            
            if (service.instance.start) {
                await service.instance.start();
            }

            service.status = 'running';
            service.startTime = Date.now();
            
            this.logger.info(`Service started: ${serviceName}`);
            this.emit('service:started', serviceName);

        } catch (error) {
            service.status = 'failed';
            this.logger.error(`Failed to start ${serviceName}:`, error);
            throw error;
        }
    }

    /**
     * Inicia sistema de health checks
     */
    async startHealthChecks() {
        this.logger.info('Starting health check system...');

        for (const serviceName of this.services.keys()) {
            this.healthChecks.set(serviceName, {
                lastCheck: null,
                status: 'unknown',
                consecutiveFailures: 0
            });
        }

        // Health check a cada 30 segundos
        setInterval(() => {
            this.performHealthChecks();
        }, 30000);

        // Health check inicial
        await this.performHealthChecks();
    }

    /**
     * Executa health checks em todos os serviços
     */
    async performHealthChecks() {
        for (const [serviceName, service] of this.services) {
            try {
                let isHealthy = true;

                if (service.instance.healthCheck) {
                    isHealthy = await service.instance.healthCheck();
                }

                const healthInfo = this.healthChecks.get(serviceName);
                healthInfo.lastCheck = Date.now();
                healthInfo.status = isHealthy ? 'healthy' : 'unhealthy';
                
                if (isHealthy) {
                    healthInfo.consecutiveFailures = 0;
                } else {
                    healthInfo.consecutiveFailures++;
                    
                    if (healthInfo.consecutiveFailures >= 3) {
                        this.logger.error(`Service ${serviceName} failed 3 consecutive health checks`);
                        this.emit('service:critical', serviceName);
                    }
                }

            } catch (error) {
                this.logger.error(`Health check failed for ${serviceName}:`, error);
                const healthInfo = this.healthChecks.get(serviceName);
                healthInfo.status = 'error';
                healthInfo.consecutiveFailures++;
            }
        }
    }

    /**
     * Rota mensagem entre serviços
     */
    async routeMessage(fromService, toService, action, payload) {
        const correlationId = this.generateCorrelationId();
        
        this.logger.info(`Routing message: ${fromService} -> ${toService} (${action})`, {
            correlationId,
            action,
            fromService,
            toService
        });

        const targetService = this.services.get(toService);
        if (!targetService) {
            throw new Error(`Target service not found: ${toService}`);
        }

        if (!targetService.instance.handleMessage) {
            throw new Error(`Service ${toService} does not support message handling`);
        }

        try {
            const result = await targetService.instance.handleMessage(action, payload, {
                correlationId,
                fromService,
                timestamp: Date.now()
            });

            this.logger.info(`Message routed successfully: ${correlationId}`);
            return result;

        } catch (error) {
            this.logger.error(`Failed to route message: ${correlationId}`, error);
            throw error;
        }
    }

    /**
     * Retorna status de todos os serviços
     */
    getSystemStatus() {
        const services = {};
        
        for (const [name, service] of this.services) {
            const health = this.healthChecks.get(name);
            
            services[name] = {
                status: service.status,
                startTime: service.startTime,
                uptime: service.startTime ? Date.now() - service.startTime : 0,
                healthStatus: health?.status || 'unknown',
                lastHealthCheck: health?.lastCheck || null,
                consecutiveFailures: health?.consecutiveFailures || 0
            };
        }

        return {
            orchestrator: {
                status: this.isRunning ? 'running' : 'stopped',
                uptime: this.isRunning ? Date.now() - this.startTime : 0
            },
            services,
            timestamp: Date.now()
        };
    }

    generateCorrelationId() {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Para todos os serviços gracefully
     */
    async stopAllServices() {
        this.logger.info('Stopping all services...');
        this.isRunning = false;

        const stopOrder = this.calculateStartOrder().reverse();
        
        for (const serviceName of stopOrder) {
            await this.stopService(serviceName);
        }

        this.logger.info('All services stopped');
    }

    async stopService(serviceName) {
        const service = this.services.get(serviceName);
        if (!service) return;

        try {
            this.logger.info(`Stopping service: ${serviceName}`);
            
            if (service.instance.stop) {
                await service.instance.stop();
            }

            service.status = 'stopped';
            this.logger.info(`Service stopped: ${serviceName}`);

        } catch (error) {
            this.logger.error(`Failed to stop ${serviceName}:`, error);
        }
    }
}

module.exports = CentralOrchestrator;