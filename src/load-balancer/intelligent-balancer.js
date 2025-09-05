/**
 * ⚖️ INTELLIGENT LOAD BALANCER - BALANCEADOR DE CARGA INTELIGENTE
 * ================================================================
 * 
 * Sistema avançado de distribuição de carga com health checks
 * Failover automático, sticky sessions e algoritmos inteligentes
 * 
 * @author CoinBitClub Enterprise Team
 * @version 6.0.0 Advanced
 */

const http = require('http');
const https = require('https');
const crypto = require('crypto');

class IntelligentLoadBalancer {
    constructor(options = {}) {
        this.config = {
            algorithm: options.algorithm || 'weighted_round_robin',
            healthCheckInterval: options.healthCheckInterval || 30000,
            healthCheckTimeout: options.healthCheckTimeout || 5000,
            maxRetries: options.maxRetries || 3,
            retryDelay: options.retryDelay || 1000,
            stickySession: options.stickySession || true,
            sessionTTL: options.sessionTTL || 3600000, // 1 hora
            ...options
        };

        this.servers = [];
        this.currentIndex = 0;
        this.sessions = new Map();
        this.healthStatus = new Map();
        this.requestCounts = new Map();
        this.responseTimes = new Map();
        
        this.stats = {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            averageResponseTime: 0,
            uptime: Date.now()
        };

        this.setupServers();
        this.startHealthChecks();
        this.startSessionCleanup();

        console.log('⚖️ Intelligent Load Balancer inicializado');
        console.log(`📊 Algoritmo: ${this.config.algorithm} | Servidores: ${this.servers.length}`);
    }

    /**
     * 🔧 Configurar servidores
     */
    setupServers() {
        const servers = process.env.NGINX_UPSTREAM_SERVERS || 'localhost:3000';
        const serverList = servers.split(',');

        this.servers = serverList.map((server, index) => {
            const [host, port] = server.trim().split(':');
            
            const serverConfig = {
                id: `server_${index}`,
                host: host || 'localhost',
                port: parseInt(port) || 3000,
                weight: 1,
                maxConnections: 100,
                currentConnections: 0,
                totalRequests: 0,
                failedRequests: 0,
                isHealthy: true,
                lastHealthCheck: null,
                averageResponseTime: 0,
                cpu: 0,
                memory: 0
            };

            this.healthStatus.set(serverConfig.id, true);
            this.requestCounts.set(serverConfig.id, 0);
            this.responseTimes.set(serverConfig.id, []);

            return serverConfig;
        });

        console.log(`🔧 ${this.servers.length} servidores configurados`);
    }

    /**
     * 🎯 Selecionar servidor baseado no algoritmo
     */
    selectServer(sessionId = null) {
        const healthyServers = this.servers.filter(server => 
            this.healthStatus.get(server.id) && 
            server.currentConnections < server.maxConnections
        );

        if (healthyServers.length === 0) {
            throw new Error('Nenhum servidor saudável disponível');
        }

        // Sticky session
        if (sessionId && this.config.stickySession) {
            const sessionServer = this.sessions.get(sessionId);
            if (sessionServer && healthyServers.find(s => s.id === sessionServer.serverId)) {
                const server = healthyServers.find(s => s.id === sessionServer.serverId);
                console.log(`🍪 Usando sticky session: ${sessionId} -> ${server.id}`);
                return server;
            }
        }

        let selectedServer;

        switch (this.config.algorithm) {
            case 'round_robin':
                selectedServer = this.roundRobin(healthyServers);
                break;
            case 'weighted_round_robin':
                selectedServer = this.weightedRoundRobin(healthyServers);
                break;
            case 'least_connections':
                selectedServer = this.leastConnections(healthyServers);
                break;
            case 'least_response_time':
                selectedServer = this.leastResponseTime(healthyServers);
                break;
            case 'resource_based':
                selectedServer = this.resourceBased(healthyServers);
                break;
            default:
                selectedServer = this.weightedRoundRobin(healthyServers);
        }

        // Criar sticky session se necessário
        if (sessionId && this.config.stickySession) {
            this.sessions.set(sessionId, {
                serverId: selectedServer.id,
                createdAt: Date.now(),
                requests: 0
            });
        }

        return selectedServer;
    }

    /**
     * 🔄 Round Robin simples
     */
    roundRobin(servers) {
        const server = servers[this.currentIndex % servers.length];
        this.currentIndex++;
        return server;
    }

    /**
     * ⚖️ Weighted Round Robin
     */
    weightedRoundRobin(servers) {
        const totalWeight = servers.reduce((sum, server) => sum + server.weight, 0);
        let randomWeight = Math.random() * totalWeight;
        
        for (const server of servers) {
            randomWeight -= server.weight;
            if (randomWeight <= 0) {
                return server;
            }
        }
        
        return servers[0]; // Fallback
    }

    /**
     * 🔗 Least Connections
     */
    leastConnections(servers) {
        return servers.reduce((least, current) => 
            current.currentConnections < least.currentConnections ? current : least
        );
    }

    /**
     * ⚡ Least Response Time
     */
    leastResponseTime(servers) {
        return servers.reduce((fastest, current) => 
            current.averageResponseTime < fastest.averageResponseTime ? current : fastest
        );
    }

    /**
     * 🖥️ Resource Based (CPU + Memory)
     */
    resourceBased(servers) {
        return servers.reduce((best, current) => {
            const currentLoad = (current.cpu + current.memory) / 2;
            const bestLoad = (best.cpu + best.memory) / 2;
            return currentLoad < bestLoad ? current : best;
        });
    }

    /**
     * 🌐 Fazer proxy da requisição
     */
    async proxyRequest(req, res, options = {}) {
        const sessionId = this.extractSessionId(req);
        const startTime = Date.now();
        
        this.stats.totalRequests++;

        try {
            const server = this.selectServer(sessionId);
            server.currentConnections++;
            server.totalRequests++;

            console.log(`🌐 Proxy request: ${req.method} ${req.url} -> ${server.id}`);

            const proxyOptions = {
                hostname: server.host,
                port: server.port,
                path: req.url,
                method: req.method,
                headers: {
                    ...req.headers,
                    'X-Forwarded-For': req.connection.remoteAddress,
                    'X-Forwarded-Proto': req.connection.encrypted ? 'https' : 'http',
                    'X-Forwarded-Host': req.headers.host,
                    'X-Load-Balancer': 'CoinBitClub-LB',
                    'X-Server-ID': server.id
                },
                timeout: options.timeout || 30000
            };

            const proxyReq = http.request(proxyOptions, (proxyRes) => {
                // Copiar headers da resposta
                res.writeHead(proxyRes.statusCode, proxyRes.headers);
                
                // Pipe da resposta
                proxyRes.pipe(res);
                
                proxyRes.on('end', () => {
                    const duration = Date.now() - startTime;
                    this.recordMetrics(server, duration, true);
                    server.currentConnections--;
                    this.stats.successfulRequests++;
                });
            });

            proxyReq.on('error', (error) => {
                console.error(`❌ Erro no proxy para ${server.id}:`, error.message);
                
                server.currentConnections--;
                server.failedRequests++;
                this.stats.failedRequests++;
                
                // Marcar servidor como não saudável se muitos erros
                const errorRate = server.failedRequests / server.totalRequests;
                if (errorRate > 0.1) { // 10% error rate
                    this.healthStatus.set(server.id, false);
                    console.log(`⚠️ Servidor ${server.id} marcado como não saudável`);
                }

                // Tentar outro servidor
                if (options.retryCount < this.config.maxRetries) {
                    setTimeout(() => {
                        this.proxyRequest(req, res, {
                            ...options,
                            retryCount: (options.retryCount || 0) + 1
                        });
                    }, this.config.retryDelay);
                } else {
                    res.writeHead(502, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({
                        error: 'Bad Gateway',
                        message: 'Todos os servidores estão indisponíveis',
                        timestamp: new Date().toISOString()
                    }));
                }
            });

            proxyReq.on('timeout', () => {
                proxyReq.destroy();
                console.error(`⏱️ Timeout no servidor ${server.id}`);
            });

            // Pipe do corpo da requisição
            req.pipe(proxyReq);

        } catch (error) {
            console.error('❌ Erro no load balancer:', error.message);
            
            res.writeHead(503, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                error: 'Service Unavailable',
                message: error.message,
                timestamp: new Date().toISOString()
            }));
        }
    }

    /**
     * 🍪 Extrair session ID
     */
    extractSessionId(req) {
        // Tentar extrair de cookie
        if (req.headers.cookie) {
            const cookies = req.headers.cookie.split(';');
            for (const cookie of cookies) {
                const [name, value] = cookie.trim().split('=');
                if (name === 'session_id' || name === 'sessionId') {
                    return value;
                }
            }
        }

        // Tentar extrair de header
        if (req.headers['x-session-id']) {
            return req.headers['x-session-id'];
        }

        // Gerar novo session ID
        return crypto.randomBytes(16).toString('hex');
    }

    /**
     * 📊 Registrar métricas
     */
    recordMetrics(server, duration, success) {
        // Atualizar tempo de resposta
        const responseTimes = this.responseTimes.get(server.id);
        responseTimes.push(duration);
        
        // Manter apenas os últimos 100 tempos
        if (responseTimes.length > 100) {
            responseTimes.shift();
        }

        // Calcular média
        server.averageResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
        
        // Atualizar contador de requests
        const currentCount = this.requestCounts.get(server.id);
        this.requestCounts.set(server.id, currentCount + 1);

        // Atualizar estatísticas globais
        this.stats.averageResponseTime = (
            (this.stats.averageResponseTime * (this.stats.totalRequests - 1) + duration) / 
            this.stats.totalRequests
        );
    }

    /**
     * 🏥 Health checks dos servidores
     */
    async performHealthCheck(server) {
        return new Promise((resolve) => {
            const startTime = Date.now();
            
            const options = {
                hostname: server.host,
                port: server.port,
                path: '/health',
                method: 'GET',
                timeout: this.config.healthCheckTimeout
            };

            const req = http.request(options, (res) => {
                const duration = Date.now() - startTime;
                
                if (res.statusCode === 200) {
                    this.healthStatus.set(server.id, true);
                    server.isHealthy = true;
                    server.lastHealthCheck = new Date().toISOString();
                    
                    // Atualizar métricas de recursos se disponível
                    let body = '';
                    res.on('data', chunk => body += chunk);
                    res.on('end', () => {
                        try {
                            const healthData = JSON.parse(body);
                            if (healthData.cpu !== undefined) server.cpu = healthData.cpu;
                            if (healthData.memory !== undefined) server.memory = healthData.memory;
                        } catch (e) {
                            // Ignorar se não for JSON válido
                        }
                    });
                    
                    resolve({ healthy: true, duration });
                } else {
                    this.healthStatus.set(server.id, false);
                    server.isHealthy = false;
                    resolve({ healthy: false, statusCode: res.statusCode });
                }
            });

            req.on('error', (error) => {
                this.healthStatus.set(server.id, false);
                server.isHealthy = false;
                resolve({ healthy: false, error: error.message });
            });

            req.on('timeout', () => {
                req.destroy();
                this.healthStatus.set(server.id, false);
                server.isHealthy = false;
                resolve({ healthy: false, error: 'timeout' });
            });

            req.end();
        });
    }

    /**
     * 🏥 Iniciar health checks periódicos
     */
    startHealthChecks() {
        setInterval(async () => {
            console.log('🏥 Iniciando health checks...');
            
            const healthChecks = this.servers.map(server => 
                this.performHealthCheck(server)
            );

            const results = await Promise.all(healthChecks);
            
            results.forEach((result, index) => {
                const server = this.servers[index];
                console.log(`🏥 ${server.id}: ${result.healthy ? '✅' : '❌'} ${
                    result.duration ? `(${result.duration}ms)` : 
                    result.error ? `(${result.error})` : 
                    result.statusCode ? `(${result.statusCode})` : ''
                }`);
            });

            const healthyCount = results.filter(r => r.healthy).length;
            console.log(`🏥 Health check concluído: ${healthyCount}/${this.servers.length} servidores saudáveis`);

        }, this.config.healthCheckInterval);
    }

    /**
     * 🧹 Limpeza de sessões expiradas
     */
    startSessionCleanup() {
        setInterval(() => {
            const now = Date.now();
            let cleanedSessions = 0;

            for (const [sessionId, session] of this.sessions.entries()) {
                if (now - session.createdAt > this.config.sessionTTL) {
                    this.sessions.delete(sessionId);
                    cleanedSessions++;
                }
            }

            if (cleanedSessions > 0) {
                console.log(`🧹 ${cleanedSessions} sessões expiradas removidas`);
            }

        }, 60000); // A cada minuto
    }

    /**
     * 📊 Obter estatísticas
     */
    getStats() {
        const healthyServers = this.servers.filter(s => this.healthStatus.get(s.id));
        const totalConnections = this.servers.reduce((sum, s) => sum + s.currentConnections, 0);
        const totalRequests = this.servers.reduce((sum, s) => sum + s.totalRequests, 0);

        return {
            general: {
                uptime: Date.now() - this.stats.uptime,
                totalRequests: this.stats.totalRequests,
                successfulRequests: this.stats.successfulRequests,
                failedRequests: this.stats.failedRequests,
                successRate: this.stats.totalRequests > 0 
                    ? ((this.stats.successfulRequests / this.stats.totalRequests) * 100).toFixed(2) + '%'
                    : '0%',
                averageResponseTime: Math.round(this.stats.averageResponseTime) + 'ms'
            },
            servers: {
                total: this.servers.length,
                healthy: healthyServers.length,
                unhealthy: this.servers.length - healthyServers.length,
                totalConnections,
                details: this.servers.map(server => ({
                    id: server.id,
                    host: server.host,
                    port: server.port,
                    healthy: this.healthStatus.get(server.id),
                    connections: server.currentConnections,
                    totalRequests: server.totalRequests,
                    failedRequests: server.failedRequests,
                    averageResponseTime: Math.round(server.averageResponseTime) + 'ms',
                    cpu: server.cpu + '%',
                    memory: server.memory + '%',
                    lastHealthCheck: server.lastHealthCheck
                }))
            },
            sessions: {
                active: this.sessions.size,
                stickySessionEnabled: this.config.stickySession
            },
            config: {
                algorithm: this.config.algorithm,
                healthCheckInterval: this.config.healthCheckInterval + 'ms',
                maxRetries: this.config.maxRetries
            }
        };
    }

    /**
     * 🔧 Atualizar configuração de servidor
     */
    updateServerConfig(serverId, config) {
        const server = this.servers.find(s => s.id === serverId);
        if (server) {
            Object.assign(server, config);
            console.log(`🔧 Configuração do servidor ${serverId} atualizada`);
            return true;
        }
        return false;
    }

    /**
     * 🔌 Middleware para Express
     */
    middleware() {
        return (req, res, next) => {
            this.proxyRequest(req, res);
        };
    }

    /**
     * 🔌 Parar load balancer
     */
    stop() {
        console.log('⚖️ Intelligent Load Balancer parado');
    }
}

module.exports = IntelligentLoadBalancer;
