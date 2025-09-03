/**
 * 🏗️ DEPENDENCY INJECTION CONTAINER
 * 
 * Container IoC para gerenciamento de dependências enterprise
 */

class DIContainer {
    constructor() {
        this.services = new Map();
        this.singletons = new Map();
        this.factories = new Map();
    }

    // Registrar serviço como singleton
    registerSingleton(name, implementation) {
        this.services.set(name, {
            type: 'singleton',
            implementation,
            instance: null
        });
        return this;
    }

    // Registrar serviço como transient
    registerTransient(name, implementation) {
        this.services.set(name, {
            type: 'transient',
            implementation,
            instance: null
        });
        return this;
    }

    // Registrar factory
    registerFactory(name, factory) {
        this.factories.set(name, factory);
        return this;
    }

    // Resolver dependência
    resolve(name) {
        // Verificar factory primeiro
        if (this.factories.has(name)) {
            return this.factories.get(name)(this);
        }

        const service = this.services.get(name);
        if (!service) {
            throw new Error(`Serviço '${name}' não registrado no container DI`);
        }

        // Singleton - retorna mesma instância
        if (service.type === 'singleton') {
            if (!service.instance) {
                service.instance = new service.implementation(this);
            }
            return service.instance;
        }

        // Transient - nova instância sempre
        return new service.implementation(this);
    }

    // Verificar se serviço está registrado
    isRegistered(name) {
        return this.services.has(name) || this.factories.has(name);
    }

    // Listar todos os serviços
    listServices() {
        return {
            services: Array.from(this.services.keys()),
            factories: Array.from(this.factories.keys())
        };
    }
}

// Singleton global do container
const container = new DIContainer();

module.exports = { DIContainer, container };
