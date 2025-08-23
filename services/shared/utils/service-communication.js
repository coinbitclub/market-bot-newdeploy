/**
 * 📡 UTILIDADES DE COMUNICAÇÃO ENTRE SERVIÇOS
 * Padrões e helpers para comunicação via orquestrador
 */

class ServiceCommunication {
    constructor(orchestrator, serviceName) {
        this.orchestrator = orchestrator;
        this.serviceName = serviceName;
    }

    /**
     * Envia mensagem para outro serviço
     */
    async sendMessage(targetService, action, payload = {}) {
        return await this.orchestrator.routeMessage(
            this.serviceName,
            targetService,
            action,
            payload
        );
    }

    /**
     * Faz broadcast para múltiplos serviços
     */
    async broadcast(targetServices, action, payload = {}) {
        const results = {};
        
        for (const service of targetServices) {
            try {
                results[service] = await this.sendMessage(service, action, payload);
            } catch (error) {
                results[service] = { error: error.message };
            }
        }
        
        return results;
    }

    /**
     * Aguarda resposta de serviço com timeout
     */
    async sendMessageWithTimeout(targetService, action, payload = {}, timeout = 5000) {
        return new Promise(async (resolve, reject) => {
            const timer = setTimeout(() => {
                reject(new Error(`Timeout waiting for ${targetService} response`));
            }, timeout);

            try {
                const result = await this.sendMessage(targetService, action, payload);
                clearTimeout(timer);
                resolve(result);
            } catch (error) {
                clearTimeout(timer);
                reject(error);
            }
        });
    }
}

/**
 * Padrões de mensagem padronizados
 */
class MessagePatterns {
    static createRequest(action, data = {}) {
        return {
            type: 'request',
            action,
            data,
            timestamp: Date.now(),
            id: this.generateMessageId()
        };
    }

    static createResponse(requestId, data = {}, error = null) {
        return {
            type: 'response',
            requestId,
            data,
            error,
            timestamp: Date.now()
        };
    }

    static createEvent(eventType, data = {}) {
        return {
            type: 'event',
            eventType,
            data,
            timestamp: Date.now(),
            id: this.generateMessageId()
        };
    }

    static generateMessageId() {
        return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}

module.exports = {
    ServiceCommunication,
    MessagePatterns
};