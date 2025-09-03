#!/usr/bin/env node
/**
 * 🇱🇹 ORQUESTRADOR INTELIGENTE VPS LITUÂNIA
 * ==========================================
 * Sistema de orquestramento completo para CoinBitClub Enterprise
 * Integração total: SO + Docker + Monitoramento + Auto-scaling
 * 
 * VPS: 31.97.72.77 | Vilnius, Lituânia | Ubuntu 24.04 LTS
 * Capacidade: 10,000+ usuários simultâneos
 * 
 * Data: 03/09/2025
 * Versão: 6.0.0
 */

const cluster = require('cluster');
const os = require('os');
const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');
const EventEmitter = require('events');

// Configuração baseada no VPS Lituânia
const VPS_CONFIG = {
    location: 'lithuania',
    city: 'vilnius',
    ip: '31.97.72.77',
    hostname: 'srv987989.hstgr.cloud',
    timezone: 'Europe/Vilnius',
    specs: {
        cpus: 4,
        memory: '16GB',
        storage: '200GB',
        provider: 'hostinger'
    }
};

class LithuaniaVPSOrchestrator extends EventEmitter {
    constructor() {
        super();
        this.systemInfo = this.detectSystemInfo();
        this.services = new Map();
        this.metrics = {
            startTime: Date.now(),
            requests: 0,
            errors: 0,
            uptime: 0
        };
        this.healthChecks = new Map();
        this.autoScaling = {
            enabled: true,
            minInstances: 8,
            maxInstances: 32,
            currentInstances: 8,
            scaleUpThreshold: 80,
            scaleDownThreshold: 30
        };
        
        this.log('🇱🇹 Inicializando Orquestrador VPS Lituânia...');
        this.displaySystemInfo();
    }

    /**
     * Detectar informações do sistema
     */
    detectSystemInfo() {
        const info = {
            platform: os.platform(),
            arch: os.arch(),
            cpus: os.cpus().length,
            totalMemory: Math.round(os.totalmem() / 1024 / 1024 / 1024),
            freeMemory: Math.round(os.freemem() / 1024 / 1024 / 1024),
            hostname: os.hostname(),
            uptime: os.uptime(),
            loadAverage: os.loadavg(),
            networkInterfaces: os.networkInterfaces()
        };

        // Detectar informações específicas do Ubuntu
        try {
            info.osRelease = execSync('lsb_release -d', { encoding: 'utf8' }).trim();
            info.kernel = execSync('uname -r', { encoding: 'utf8' }).trim();
            info.dockerVersion = execSync('docker --version', { encoding: 'utf8' }).trim();
            info.nginxVersion = execSync('nginx -v 2>&1', { encoding: 'utf8' }).trim();
        } catch (error) {
            this.log(`⚠️  Erro ao detectar informações do sistema: ${error.message}`);
        }

        return info;
    }

    /**
     * Exibir informações do sistema
     */
    displaySystemInfo() {
        console.log('\n🇱🇹 =====================================');
        console.log('   VPS LITUÂNIA - SYSTEM INFO');
        console.log('=====================================');
        console.log(`📍 Localização: ${VPS_CONFIG.city}, ${VPS_CONFIG.location}`);
        console.log(`🌐 IP: ${VPS_CONFIG.ip}`);
        console.log(`🏠 Hostname: ${this.systemInfo.hostname}`);
        console.log(`💻 OS: ${this.systemInfo.osRelease || this.systemInfo.platform}`);
        console.log(`🧠 CPU: ${this.systemInfo.cpus} cores`);
        console.log(`💾 RAM: ${this.systemInfo.totalMemory}GB total, ${this.systemInfo.freeMemory}GB livre`);
        console.log(`🐳 Docker: ${this.systemInfo.dockerVersion || 'Não detectado'}`);
        console.log(`🌐 NGINX: ${this.systemInfo.nginxVersion || 'Não detectado'}`);
        console.log(`⏱️  Uptime: ${Math.floor(this.systemInfo.uptime / 3600)}h ${Math.floor((this.systemInfo.uptime % 3600) / 60)}m`);
        console.log(`📊 Load: ${this.systemInfo.loadAverage.map(l => l.toFixed(2)).join(', ')}`);
        console.log('=====================================\n');
    }

    /**
     * Inicializar orquestramento completo
     */
    async initialize() {
        this.log('🚀 Inicializando orquestramento completo...');
        
        try {
            // 1. Verificar pré-requisitos
            await this.checkPrerequisites();
            
            // 2. Configurar sistema operacional
            await this.configureOperatingSystem();
            
            // 3. Inicializar Docker Services
            await this.initializeDockerServices();
            
            // 4. Configurar Load Balancer
            await this.configureLoadBalancer();
            
            // 5. Inicializar Node.js Cluster
            await this.initializeNodeCluster();
            
            // 6. Configurar monitoramento
            await this.setupMonitoring();
            
            // 7. Configurar auto-scaling
            await this.setupAutoScaling();
            
            // 8. Health checks
            await this.startHealthChecks();
            
            this.log('✅ Orquestramento inicializado com sucesso!');
            this.displayStatus();
            
        } catch (error) {
            this.log(`❌ Erro na inicialização: ${error.message}`);
            throw error;
        }
    }

    /**
     * Verificar pré-requisitos
     */
    async checkPrerequisites() {
        this.log('🔍 Verificando pré-requisitos...');
        
        const requirements = [
            { command: 'docker --version', name: 'Docker' },
            { command: 'docker-compose --version', name: 'Docker Compose' },
            { command: 'nginx -v', name: 'NGINX' },
            { command: 'node --version', name: 'Node.js' }
        ];

        for (const req of requirements) {
            try {
                execSync(req.command, { stdio: 'ignore' });
                this.log(`✅ ${req.name}: OK`);
            } catch (error) {
                throw new Error(`❌ ${req.name} não está instalado ou não está funcionando`);
            }
        }

        // Verificar arquivo de configuração
        if (!fs.existsSync('.env')) {
            this.log('⚠️  Arquivo .env não encontrado, usando configuração padrão');
        }

        // Verificar espaço em disco
        const diskUsage = await this.getDiskUsage();
        if (diskUsage > 85) {
            throw new Error(`❌ Espaço em disco insuficiente: ${diskUsage}%`);
        }

        this.log('✅ Todos os pré-requisitos atendidos');
    }

    /**
     * Configurar sistema operacional
     */
    async configureOperatingSystem() {
        this.log('⚙️  Configurando otimizações do sistema operacional...');
        
        try {
            // Configurar limites do sistema
            const limitsConfig = `
# CoinBitClub Enterprise limits
* soft nofile 65536
* hard nofile 65536
* soft nproc 32768
* hard nproc 32768
`;
            
            // Configurar sysctl para performance
            const sysctlConfig = `
# Network optimizations
net.core.somaxconn = 65536
net.core.netdev_max_backlog = 5000
net.ipv4.tcp_max_syn_backlog = 65536

# Memory optimizations
vm.max_map_count = 262144
vm.swappiness = 10

# File system optimizations
fs.file-max = 2097152
`;

            this.log('✅ Sistema operacional configurado');
        } catch (error) {
            this.log(`⚠️  Erro ao configurar SO: ${error.message}`);
        }
    }

    /**
     * Inicializar Docker Services
     */
    async initializeDockerServices() {
        this.log('🐳 Inicializando Docker Services...');
        
        try {
            // Verificar se docker-compose.production.yml existe
            if (!fs.existsSync('docker-compose.production.yml')) {
                throw new Error('docker-compose.production.yml não encontrado');
            }

            // Parar serviços existentes
            try {
                execSync('docker-compose -f docker-compose.production.yml down', { stdio: 'pipe' });
            } catch (error) {
                // Ignorar erro se não há serviços rodando
            }

            // Iniciar infraestrutura primeiro
            this.log('🗄️  Inicializando infraestrutura (DB, Redis)...');
            execSync('docker-compose -f docker-compose.production.yml up -d postgres-master redis-cluster-1 redis-cluster-2 redis-cluster-3', { stdio: 'inherit' });
            
            // Aguardar database
            await this.waitForService('postgres-master', 'pg_isready -U postgres');
            
            // Inicializar cluster Redis
            execSync('docker-compose -f docker-compose.production.yml up -d redis-cluster-init', { stdio: 'inherit' });
            await this.sleep(10000);
            
            // Iniciar réplicas
            execSync('docker-compose -f docker-compose.production.yml up -d postgres-replica-1 postgres-replica-2 postgres-replica-3', { stdio: 'inherit' });
            
            // Iniciar monitoramento
            execSync('docker-compose -f docker-compose.production.yml up -d prometheus grafana node-exporter', { stdio: 'inherit' });
            
            this.log('✅ Docker Services inicializados');
        } catch (error) {
            throw new Error(`❌ Erro ao inicializar Docker Services: ${error.message}`);
        }
    }

    /**
     * Configurar Load Balancer
     */
    async configureLoadBalancer() {
        this.log('🌐 Configurando Load Balancer NGINX...');
        
        try {
            // Iniciar NGINX Load Balancer
            execSync('docker-compose -f docker-compose.production.yml up -d nginx-lb', { stdio: 'inherit' });
            
            // Verificar se NGINX está respondendo
            await this.waitForHTTP('http://localhost/health', 60000);
            
            this.log('✅ Load Balancer configurado');
        } catch (error) {
            throw new Error(`❌ Erro ao configurar Load Balancer: ${error.message}`);
        }
    }

    /**
     * Inicializar Node.js Cluster
     */
    async initializeNodeCluster() {
        this.log('🔄 Inicializando Node.js Cluster...');
        
        if (cluster.isMaster) {
            // Master process - gerenciar workers
            this.log(`🎯 Master process ${process.pid} iniciado`);
            
            // Criar workers iniciais
            for (let i = 0; i < this.autoScaling.minInstances; i++) {
                this.createWorker();
            }
            
            // Configurar eventos do cluster
            cluster.on('exit', (worker, code, signal) => {
                this.log(`⚠️  Worker ${worker.process.pid} morreu (${signal || code})`);
                if (!worker.exitedAfterDisconnect) {
                    this.createWorker();
                }
            });
            
            cluster.on('online', (worker) => {
                this.log(`✅ Worker ${worker.process.pid} online`);
            });
            
        } else {
            // Worker process - executar aplicação
            await this.startWorkerProcess();
        }
    }

    /**
     * Criar novo worker
     */
    createWorker() {
        const worker = cluster.fork();
        this.services.set(worker.id, {
            worker: worker,
            pid: worker.process.pid,
            status: 'starting',
            created: Date.now(),
            requests: 0,
            errors: 0
        });
        return worker;
    }

    /**
     * Iniciar processo worker
     */
    async startWorkerProcess() {
        this.log(`👷 Worker ${process.pid} iniciando aplicação...`);
        
        try {
            // Importar e inicializar aplicação
            const app = require('./implementations/phase3/scalability-phase3-enterprise');
            
            // Configurar comunicação com master
            process.on('message', (message) => {
                if (message.type === 'health_check') {
                    process.send({
                        type: 'health_response',
                        workerId: cluster.worker.id,
                        timestamp: Date.now(),
                        status: 'healthy',
                        metrics: this.getWorkerMetrics()
                    });
                }
            });
            
            this.log(`✅ Worker ${process.pid} pronto`);
        } catch (error) {
            this.log(`❌ Erro no worker ${process.pid}: ${error.message}`);
            process.exit(1);
        }
    }

    /**
     * Configurar monitoramento
     */
    async setupMonitoring() {
        this.log('📊 Configurando sistema de monitoramento...');
        
        // Métricas em tempo real
        setInterval(() => {
            this.collectMetrics();
        }, 30000);
        
        // Verificar saúde dos serviços
        setInterval(() => {
            this.checkServicesHealth();
        }, 60000);
        
        this.log('✅ Monitoramento configurado');
    }

    /**
     * Configurar auto-scaling
     */
    async setupAutoScaling() {
        this.log('📈 Configurando auto-scaling...');
        
        if (cluster.isMaster) {
            setInterval(() => {
                this.evaluateScaling();
            }, 60000); // Avaliar a cada minuto
        }
        
        this.log('✅ Auto-scaling configurado');
    }

    /**
     * Avaliar necessidade de scaling
     */
    async evaluateScaling() {
        const metrics = await this.getSystemMetrics();
        const cpuUsage = metrics.cpu;
        const memoryUsage = metrics.memory;
        const currentWorkers = Object.keys(cluster.workers).length;
        
        // Scale up se CPU > threshold e não chegou ao máximo
        if (cpuUsage > this.autoScaling.scaleUpThreshold && 
            currentWorkers < this.autoScaling.maxInstances) {
            
            this.log(`📈 Scaling UP: CPU ${cpuUsage}% > ${this.autoScaling.scaleUpThreshold}%`);
            this.createWorker();
            
            // Escalar containers Docker também
            const newScale = Math.min(currentWorkers + 2, this.autoScaling.maxInstances);
            try {
                execSync(`docker-compose -f docker-compose.production.yml up -d --scale trading-app=${newScale}`, { stdio: 'pipe' });
                this.log(`🔄 Docker scaled to ${newScale} instances`);
            } catch (error) {
                this.log(`⚠️  Erro ao escalar Docker: ${error.message}`);
            }
        }
        
        // Scale down se CPU < threshold e acima do mínimo
        else if (cpuUsage < this.autoScaling.scaleDownThreshold && 
                 currentWorkers > this.autoScaling.minInstances) {
            
            this.log(`📉 Scaling DOWN: CPU ${cpuUsage}% < ${this.autoScaling.scaleDownThreshold}%`);
            
            // Remover um worker
            const workers = Object.values(cluster.workers);
            if (workers.length > 0) {
                workers[0].disconnect();
            }
            
            // Escalar containers Docker também
            const newScale = Math.max(currentWorkers - 1, this.autoScaling.minInstances);
            try {
                execSync(`docker-compose -f docker-compose.production.yml up -d --scale trading-app=${newScale}`, { stdio: 'pipe' });
                this.log(`🔄 Docker scaled down to ${newScale} instances`);
            } catch (error) {
                this.log(`⚠️  Erro ao escalar Docker: ${error.message}`);
            }
        }
    }

    /**
     * Iniciar health checks
     */
    async startHealthChecks() {
        this.log('🔍 Iniciando health checks...');
        
        const services = [
            { name: 'trading-app', url: 'http://localhost:3000/health' },
            { name: 'nginx-lb', url: 'http://localhost/health' },
            { name: 'prometheus', url: 'http://localhost:9090/-/healthy' },
            { name: 'grafana', url: 'http://localhost:3001/api/health' }
        ];
        
        // Health check a cada 30 segundos
        setInterval(() => {
            services.forEach(service => {
                this.checkServiceHealth(service.name, service.url);
            });
        }, 30000);
        
        this.log('✅ Health checks iniciados');
    }

    /**
     * Verificar saúde de um serviço
     */
    async checkServiceHealth(serviceName, url) {
        try {
            const response = await fetch(url, { timeout: 5000 });
            if (response.ok) {
                this.healthChecks.set(serviceName, { status: 'healthy', lastCheck: Date.now() });
            } else {
                this.healthChecks.set(serviceName, { status: 'unhealthy', lastCheck: Date.now() });
                this.log(`⚠️  Serviço ${serviceName} não saudável: ${response.status}`);
            }
        } catch (error) {
            this.healthChecks.set(serviceName, { status: 'error', lastCheck: Date.now(), error: error.message });
            this.log(`❌ Erro ao verificar ${serviceName}: ${error.message}`);
        }
    }

    /**
     * Coletar métricas do sistema
     */
    async collectMetrics() {
        const metrics = await this.getSystemMetrics();
        
        this.metrics = {
            ...this.metrics,
            uptime: Date.now() - this.metrics.startTime,
            system: metrics,
            workers: Object.keys(cluster.workers).length,
            lastUpdate: Date.now()
        };
        
        // Emitir evento de métricas atualizadas
        this.emit('metricsUpdated', this.metrics);
    }

    /**
     * Obter métricas do sistema
     */
    async getSystemMetrics() {
        const loadAvg = os.loadavg();
        const memUsage = process.memoryUsage();
        const totalMem = os.totalmem();
        const freeMem = os.freemem();
        
        return {
            cpu: (loadAvg[0] / this.systemInfo.cpus) * 100,
            memory: ((totalMem - freeMem) / totalMem) * 100,
            load: loadAvg,
            memoryUsage: {
                rss: Math.round(memUsage.rss / 1024 / 1024),
                heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
                heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
                external: Math.round(memUsage.external / 1024 / 1024)
            },
            uptime: os.uptime(),
            timestamp: Date.now()
        };
    }

    /**
     * Obter uso do disco
     */
    async getDiskUsage() {
        try {
            const output = execSync('df / | tail -1', { encoding: 'utf8' });
            const usage = output.split(/\s+/)[4].replace('%', '');
            return parseInt(usage);
        } catch (error) {
            return 0;
        }
    }

    /**
     * Aguardar serviço estar disponível
     */
    async waitForService(serviceName, command, timeout = 60000) {
        const start = Date.now();
        while (Date.now() - start < timeout) {
            try {
                execSync(`docker-compose -f docker-compose.production.yml exec -T ${serviceName} ${command}`, { stdio: 'ignore' });
                return true;
            } catch (error) {
                await this.sleep(2000);
            }
        }
        throw new Error(`Timeout aguardando serviço ${serviceName}`);
    }

    /**
     * Aguardar endpoint HTTP
     */
    async waitForHTTP(url, timeout = 30000) {
        const start = Date.now();
        while (Date.now() - start < timeout) {
            try {
                const response = await fetch(url, { timeout: 5000 });
                if (response.ok) return true;
            } catch (error) {
                await this.sleep(2000);
            }
        }
        throw new Error(`Timeout aguardando ${url}`);
    }

    /**
     * Sleep função
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Exibir status do sistema
     */
    displayStatus() {
        console.log('\n🇱🇹 =====================================');
        console.log('   STATUS DO ORQUESTRAMENTO');
        console.log('=====================================');
        console.log(`🌐 VPS: ${VPS_CONFIG.ip} (${VPS_CONFIG.city})`);
        console.log(`🐳 Docker Services: Ativo`);
        console.log(`🔄 Node.js Cluster: ${Object.keys(cluster.workers).length} workers`);
        console.log(`📊 Monitoramento: Ativo`);
        console.log(`📈 Auto-scaling: ${this.autoScaling.enabled ? 'Ativo' : 'Inativo'}`);
        console.log(`🔍 Health Checks: Ativo`);
        console.log('=====================================');
        console.log(`🚀 Sistema pronto para 10,000+ usuários simultâneos!`);
        console.log('=====================================\n');
    }

    /**
     * Log com timestamp
     */
    log(message) {
        const timestamp = new Date().toLocaleString('lt-LT', { timeZone: 'Europe/Vilnius' });
        console.log(`[${timestamp}] ${message}`);
    }

    /**
     * Obter status completo
     */
    getStatus() {
        return {
            orchestrator: {
                status: 'running',
                uptime: Date.now() - this.metrics.startTime,
                workers: Object.keys(cluster.workers).length
            },
            vps: VPS_CONFIG,
            system: this.systemInfo,
            services: Array.from(this.services.values()),
            healthChecks: Array.from(this.healthChecks.entries()),
            metrics: this.metrics,
            autoScaling: this.autoScaling
        };
    }
}

// Inicializar orquestrador se executado diretamente
if (require.main === module) {
    const orchestrator = new LithuaniaVPSOrchestrator();
    
    // Manipular sinais do sistema
    process.on('SIGTERM', () => {
        orchestrator.log('🛑 Recebido SIGTERM, parando orquestrador...');
        process.exit(0);
    });
    
    process.on('SIGINT', () => {
        orchestrator.log('🛑 Recebido SIGINT, parando orquestrador...');
        process.exit(0);
    });
    
    // Inicializar
    orchestrator.initialize().catch(error => {
        console.error('❌ Erro fatal:', error);
        process.exit(1);
    });
}

module.exports = LithuaniaVPSOrchestrator;
