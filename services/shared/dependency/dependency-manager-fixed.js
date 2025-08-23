/**
 * 🔗 SERVICE DEPENDENCY MANAGER - VERSÃO CORRIGIDA
 * Gerenciamento robusto de dependências entre serviços
 */

const { createLogger } = require('../shared/utils/logger');

class ServiceDependencyManager {
    constructor(orchestrator) {
        this.orchestrator = orchestrator;
        this.logger = createLogger('dependency-manager');
        this.dependencies = new Map();
        this.startOrder = [];
        this.serviceStates = new Map();
    }

    setupDependencies() {
        // Definir dependências entre serviços
        const dependencyMap = {
            'orchestrator': [],
            'database-manager': ['orchestrator'],
            'security-manager': ['orchestrator', 'database-manager'],
            'user-config-manager': ['orchestrator', 'database-manager'],
            'api-key-manager': ['orchestrator', 'database-manager', 'security-manager'],
            'financial-manager': ['orchestrator', 'database-manager', 'security-manager'],
            'fg-index-manager': ['orchestrator'],
            'signal-ingestor': ['orchestrator', 'fg-index-manager', 'user-config-manager'],
            'order-manager': ['orchestrator', 'signal-ingestor', 'api-key-manager'],
            'order-executor': ['orchestrator', 'order-manager', 'api-key-manager'],
            'commission-manager': ['orchestrator', 'financial-manager', 'order-executor'],
            'affiliate-manager': ['orchestrator', 'financial-manager', 'commission-manager'],
            'metrics-collector': ['orchestrator'],
            'audit-manager': ['orchestrator', 'database-manager']
        };

        for (const [service, deps] of Object.entries(dependencyMap)) {
            this.dependencies.set(service, deps);
            this.serviceStates.set(service, 'stopped');
        }

        // Calcular ordem de inicialização
        this.startOrder = this.calculateStartOrder();
        
        this.logger.info(`Dependency graph setup for ${this.dependencies.size} services`);
        this.logger.info(`Start order: ${this.startOrder.join(' -> ')}`);
    }

    calculateStartOrder() {
        const visited = new Set();
        const visiting = new Set();
        const order = [];

        const visit = (serviceName) => {
            if (visited.has(serviceName)) return;
            if (visiting.has(serviceName)) {
                throw new Error(`Circular dependency detected involving: ${serviceName}`);
            }

            visiting.add(serviceName);

            const dependencies = this.dependencies.get(serviceName) || [];
            for (const dep of dependencies) {
                visit(dep);
            }

            visiting.delete(serviceName);
            visited.add(serviceName);
            order.push(serviceName);
        };

        for (const serviceName of this.dependencies.keys()) {
            visit(serviceName);
        }

        return order;
    }

    async validateDependencies(serviceName) {
        const dependencies = this.dependencies.get(serviceName) || [];
        const failedDeps = [];

        for (const dep of dependencies) {
            const state = this.serviceStates.get(dep);
            if (state !== 'running') {
                failedDeps.push({ service: dep, state });
            }
        }

        if (failedDeps.length > 0) {
            throw new Error(`Service '${serviceName}' dependencies not ready: ${failedDeps.map(d => `${d.service}(${d.state})`).join(', ')}`);
        }

        return true;
    }

    async startService(serviceName, serviceInstance) {
        try {
            this.logger.info(`Starting service: ${serviceName}`);
            
            // Validar dependências
            await this.validateDependencies(serviceName);
            
            // Marcar como starting
            this.serviceStates.set(serviceName, 'starting');
            
            // Iniciar serviço
            if (serviceInstance && serviceInstance.start) {
                await serviceInstance.start();
            }
            
            // Marcar como running
            this.serviceStates.set(serviceName, 'running');
            
            this.logger.info(`Service started successfully: ${serviceName}`);
            return true;

        } catch (error) {
            this.serviceStates.set(serviceName, 'failed');
            this.logger.error(`Failed to start service '${serviceName}':`, error);
            throw error;
        }
    }

    async stopService(serviceName, serviceInstance) {
        try {
            this.logger.info(`Stopping service: ${serviceName}`);
            
            // Marcar como stopping
            this.serviceStates.set(serviceName, 'stopping');
            
            // Parar serviço
            if (serviceInstance && serviceInstance.stop) {
                await serviceInstance.stop();
            }
            
            // Marcar como stopped
            this.serviceStates.set(serviceName, 'stopped');
            
            this.logger.info(`Service stopped successfully: ${serviceName}`);
            return true;

        } catch (error) {
            this.serviceStates.set(serviceName, 'error');
            this.logger.error(`Failed to stop service '${serviceName}':`, error);
            throw error;
        }
    }

    async startAllInOrder(services) {
        this.logger.info('Starting all services in dependency order...');
        
        for (const serviceName of this.startOrder) {
            const serviceInstance = services.get(serviceName);
            if (serviceInstance) {
                await this.startService(serviceName, serviceInstance);
                
                // Aguardar um pouco entre inicializações
                await this.sleep(1000);
            }
        }
        
        this.logger.info('All services started successfully');
    }

    async stopAllInOrder(services) {
        this.logger.info('Stopping all services in reverse dependency order...');
        
        const stopOrder = [...this.startOrder].reverse();
        
        for (const serviceName of stopOrder) {
            const serviceInstance = services.get(serviceName);
            if (serviceInstance) {
                await this.stopService(serviceName, serviceInstance);
            }
        }
        
        this.logger.info('All services stopped successfully');
    }

    getServiceState(serviceName) {
        return this.serviceStates.get(serviceName) || 'unknown';
    }

    getAllServiceStates() {
        const states = {};
        for (const [service, state] of this.serviceStates) {
            states[service] = state;
        }
        return states;
    }

    getDependents(serviceName) {
        const dependents = [];
        for (const [service, deps] of this.dependencies) {
            if (deps.includes(serviceName)) {
                dependents.push(service);
            }
        }
        return dependents;
    }

    validateCircularDependencies() {
        try {
            this.calculateStartOrder();
            return { valid: true, message: 'No circular dependencies found' };
        } catch (error) {
            return { valid: false, message: error.message };
        }
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = ServiceDependencyManager;