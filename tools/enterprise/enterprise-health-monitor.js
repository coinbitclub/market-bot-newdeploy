/**
 * 🏢 ENTERPRISE HEALTH MONITOR - COINBITCLUB MARKET BOT
 * ====================================================
 * 
 * Sistema de monitoramento enterprise para tracking de performance,
 * saúde do sistema e métricas de negócio em tempo real.
 * 
 * Implementação imediata para otimização enterprise.
 */

const EventEmitter = require('events');
const { Pool } = require('pg');
const axios = require('axios');

class EnterpriseHealthMonitor extends EventEmitter {
    constructor() {
        super();
        
        this.metrics = {
            trading: {
                status: 'unknown',
                lastCheck: null,
                signalsReceived: 0,
                tradesExecuted: 0,
                successRate: 0,
                avgLatency: 0
            },
            database: {
                status: 'unknown',
                connections: 0,
                queryLatency: 0,
                activeUsers: 0,
                lastBackup: null
            },
            apis: {
                binance: { status: 'unknown', latency: 0, errorRate: 0 },
                bybit: { status: 'unknown', latency: 0, errorRate: 0 },
                coinstats: { status: 'unknown', latency: 0, errorRate: 0 },
                openai: { status: 'unknown', latency: 0, errorRate: 0 }
            },
            users: {
                total: 0,
                active: 0,
                trading: 0,
                premiumUsers: 0,
                apiCallsPerMinute: 0
            },
            performance: {
                cpuUsage: 0,
                memoryUsage: 0,
                diskUsage: 0,
                networkLatency: 0,
                uptime: 0
            },
            financial: {
                totalBalance: 0,
                pnlToday: 0,
                commissionsEarned: 0,
                revenueThisMonth: 0
            },
            system: {
                version: '6.0.0',
                environment: process.env.NODE_ENV || 'development',
                region: 'BR-South',
                deployment: 'Railway',
                lastRestart: new Date()
            }
        };
        
        this.alerts = [];
        this.thresholds = {
            criticalLatency: 1000,
            warningLatency: 500,
            minUptime: 99.5,
            maxErrorRate: 5.0,
            minSuccessRate: 85.0
        };
        
        this.isMonitoring = false;
        this.intervals = [];
        
        console.log('🏢 Enterprise Health Monitor inicializado');
    }

    /**
     * Inicia monitoramento enterprise
     */
    async startMonitoring() {
        if (this.isMonitoring) {
            console.log('⚠️ Monitoramento já está ativo');
            return;
        }

        console.log('🚀 INICIANDO ENTERPRISE HEALTH MONITORING...');
        console.log('============================================');

        this.isMonitoring = true;
        this.metrics.system.lastRestart = new Date();

        // Métricas principais a cada 30 segundos
        this.intervals.push(setInterval(() => {
            this.collectCoreMetrics();
        }, 30000));

        // Métricas de APIs a cada 60 segundos
        this.intervals.push(setInterval(() => {
            this.checkExternalAPIs();
        }, 60000));

        // Métricas de usuários a cada 2 minutos
        this.intervals.push(setInterval(() => {
            this.collectUserMetrics();
        }, 120000));

        // Métricas financeiras a cada 5 minutos
        this.intervals.push(setInterval(() => {
            this.collectFinancialMetrics();
        }, 300000));

        // Relatório de saúde a cada 15 minutos
        this.intervals.push(setInterval(() => {
            this.generateHealthReport();
        }, 900000));

        // Primeira coleta imediata
        await this.performInitialHealthCheck();
        
        console.log('✅ Enterprise Health Monitor ATIVO');
        console.log('📊 Métricas sendo coletadas em tempo real');
        
        this.emit('monitoring-started');
    }

    /**
     * Verificação inicial completa
     */
    async performInitialHealthCheck() {
        console.log('\n🔍 VERIFICAÇÃO INICIAL DE SAÚDE...');
        
        try {
            await Promise.all([
                this.collectCoreMetrics(),
                this.checkExternalAPIs(),
                this.collectUserMetrics(),
                this.collectFinancialMetrics()
            ]);
            
            console.log('✅ Verificação inicial concluída');
            
        } catch (error) {
            console.error('❌ Erro na verificação inicial:', error.message);
            this.addAlert('critical', 'health-check-failed', error.message);
        }
    }

    /**
     * Coleta métricas principais do sistema
     */
    async collectCoreMetrics() {
        const startTime = Date.now();
        
        try {
            // Database health
            const dbStart = Date.now();
            const pool = new Pool({
                connectionString: process.env.DATABASE_URL,
                ssl: { rejectUnauthorized: false }
            });
            
            const dbResult = await pool.query('SELECT NOW() as server_time, version() as version');
            const dbLatency = Date.now() - dbStart;
            
            this.metrics.database.status = 'healthy';
            this.metrics.database.queryLatency = dbLatency;
            this.metrics.database.lastCheck = new Date();
            
            await pool.end();

            // Performance metrics
            const memUsage = process.memoryUsage();
            this.metrics.performance.memoryUsage = Math.round(memUsage.heapUsed / 1024 / 1024);
            this.metrics.performance.uptime = Math.round(process.uptime());
            
            // Trading status
            this.metrics.trading.status = 'operational';
            this.metrics.trading.lastCheck = new Date();
            this.metrics.trading.avgLatency = Date.now() - startTime;
            
            this.emit('metrics-collected', this.metrics);
            
        } catch (error) {
            console.error('❌ Erro ao coletar métricas core:', error.message);
            this.metrics.database.status = 'error';
            this.addAlert('critical', 'database-error', error.message);
        }
    }

    /**
     * Verifica status das APIs externas
     */
    async checkExternalAPIs() {
        const apiChecks = [
            { name: 'binance', url: 'https://api.binance.com/api/v3/ping' },
            { name: 'bybit', url: 'https://api.bybit.com/v5/market/time' },
            { name: 'coinstats', url: 'https://openapiv1.coinstats.app/coins' }
        ];

        for (const api of apiChecks) {
            try {
                const startTime = Date.now();
                const response = await axios.get(api.url, { timeout: 5000 });
                const latency = Date.now() - startTime;
                
                this.metrics.apis[api.name] = {
                    status: response.status === 200 ? 'healthy' : 'warning',
                    latency: latency,
                    errorRate: 0,
                    lastCheck: new Date()
                };
                
                if (latency > this.thresholds.warningLatency) {
                    this.addAlert('warning', `${api.name}-slow`, `Alta latência: ${latency}ms`);
                }
                
            } catch (error) {
                this.metrics.apis[api.name] = {
                    status: 'error',
                    latency: 0,
                    errorRate: 100,
                    lastCheck: new Date(),
                    error: error.message
                };
                
                this.addAlert('critical', `${api.name}-down`, error.message);
            }
        }
    }

    /**
     * Coleta métricas de usuários
     */
    async collectUserMetrics() {
        try {
            const pool = new Pool({
                connectionString: process.env.DATABASE_URL,
                ssl: { rejectUnauthorized: false }
            });
            
            // Usuários ativos
            const usersResult = await pool.query(`
                SELECT 
                    COUNT(*) as total_users,
                    COUNT(CASE WHEN status = 'active' THEN 1 END) as active_users,
                    COUNT(CASE WHEN plan_type = 'premium' THEN 1 END) as premium_users
                FROM users
            `);
            
            // Usuários com trading ativo
            const tradingResult = await pool.query(`
                SELECT COUNT(DISTINCT user_id) as trading_users
                FROM user_api_keys 
                WHERE is_active = true AND validation_status = 'valid'
            `);
            
            this.metrics.users = {
                total: parseInt(usersResult.rows[0].total_users) || 0,
                active: parseInt(usersResult.rows[0].active_users) || 0,
                premiumUsers: parseInt(usersResult.rows[0].premium_users) || 0,
                trading: parseInt(tradingResult.rows[0].trading_users) || 0,
                lastUpdate: new Date()
            };
            
            await pool.end();
            
        } catch (error) {
            console.error('❌ Erro ao coletar métricas de usuários:', error.message);
        }
    }

    /**
     * Coleta métricas financeiras
     */
    async collectFinancialMetrics() {
        try {
            const pool = new Pool({
                connectionString: process.env.DATABASE_URL,
                ssl: { rejectUnauthorized: false }
            });
            
            // Saldos totais
            const balanceResult = await pool.query(`
                SELECT 
                    SUM(CASE WHEN account_type = 'real' THEN balance_usd END) as total_real,
                    SUM(CASE WHEN account_type = 'commission' THEN balance_usd END) as total_commission
                FROM balances
            `);
            
            const row = balanceResult.rows[0];
            this.metrics.financial = {
                totalBalance: parseFloat(row.total_real) || 0,
                commissionsEarned: parseFloat(row.total_commission) || 0,
                pnlToday: 0, // Calcular baseado em trades do dia
                revenueThisMonth: 0, // Calcular baseado em subscriptions
                lastUpdate: new Date()
            };
            
            await pool.end();
            
        } catch (error) {
            console.error('❌ Erro ao coletar métricas financeiras:', error.message);
        }
    }

    /**
     * Adiciona alerta ao sistema
     */
    addAlert(severity, type, message) {
        const alert = {
            id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            severity: severity, // critical, warning, info
            type: type,
            message: message,
            timestamp: new Date(),
            resolved: false
        };
        
        this.alerts.push(alert);
        
        // Manter apenas últimos 100 alertas
        if (this.alerts.length > 100) {
            this.alerts = this.alerts.slice(-100);
        }
        
        console.log(`🚨 [${severity.toUpperCase()}] ${type}: ${message}`);
        this.emit('alert', alert);
        
        return alert.id;
    }

    /**
     * Gera relatório de saúde completo
     */
    generateHealthReport() {
        console.log('\n📊 RELATÓRIO DE SAÚDE ENTERPRISE');
        console.log('================================');
        console.log(`🕐 Timestamp: ${new Date().toISOString()}`);
        console.log(`⏱️ Uptime: ${Math.round(this.metrics.performance.uptime / 3600)}h`);
        
        // Status geral
        const overallHealth = this.calculateOverallHealth();
        console.log(`🏥 Saúde Geral: ${overallHealth.status} (${overallHealth.score}%)`);
        
        // Métricas principais
        console.log('\n📈 MÉTRICAS PRINCIPAIS:');
        console.log(`   💾 Database: ${this.metrics.database.status} (${this.metrics.database.queryLatency}ms)`);
        console.log(`   👥 Usuários: ${this.metrics.users.active}/${this.metrics.users.total} ativos`);
        console.log(`   💰 Trading: ${this.metrics.users.trading} usuários operando`);
        console.log(`   💵 Saldos: $${this.metrics.financial.totalBalance.toFixed(2)}`);
        
        // APIs externas
        console.log('\n🌐 APIS EXTERNAS:');
        for (const [name, api] of Object.entries(this.metrics.apis)) {
            const statusIcon = api.status === 'healthy' ? '✅' : api.status === 'warning' ? '⚠️' : '❌';
            console.log(`   ${statusIcon} ${name}: ${api.status} (${api.latency}ms)`);
        }
        
        // Alertas ativos
        const activeAlerts = this.alerts.filter(a => !a.resolved);
        if (activeAlerts.length > 0) {
            console.log(`\n🚨 ALERTAS ATIVOS: ${activeAlerts.length}`);
            activeAlerts.slice(0, 5).forEach(alert => {
                console.log(`   ${alert.severity.toUpperCase()}: ${alert.message}`);
            });
        }
        
        console.log('\n================================\n');
        
        this.emit('health-report', {
            timestamp: new Date(),
            overallHealth: overallHealth,
            metrics: this.metrics,
            activeAlerts: activeAlerts.length
        });
    }

    /**
     * Calcula saúde geral do sistema
     */
    calculateOverallHealth() {
        let score = 100;
        let issues = [];
        
        // Verificar database
        if (this.metrics.database.status !== 'healthy') {
            score -= 30;
            issues.push('Database issues');
        }
        
        // Verificar APIs críticas
        if (this.metrics.apis.binance?.status !== 'healthy') {
            score -= 20;
            issues.push('Binance API issues');
        }
        
        if (this.metrics.apis.bybit?.status !== 'healthy') {
            score -= 20;
            issues.push('Bybit API issues');
        }
        
        // Verificar alertas críticos
        const criticalAlerts = this.alerts.filter(a => !a.resolved && a.severity === 'critical');
        score -= criticalAlerts.length * 10;
        
        if (criticalAlerts.length > 0) {
            issues.push(`${criticalAlerts.length} critical alerts`);
        }
        
        // Verificar performance
        if (this.metrics.performance.memoryUsage > 500) {
            score -= 5;
            issues.push('High memory usage');
        }
        
        score = Math.max(0, score);
        
        let status;
        if (score >= 90) status = 'excellent';
        else if (score >= 70) status = 'good';
        else if (score >= 50) status = 'warning';
        else status = 'critical';
        
        return {
            score: score,
            status: status,
            issues: issues
        };
    }

    /**
     * Obtém métricas atuais
     */
    getCurrentMetrics() {
        return {
            ...this.metrics,
            alerts: this.alerts.filter(a => !a.resolved),
            overallHealth: this.calculateOverallHealth(),
            lastUpdate: new Date()
        };
    }

    /**
     * Para o monitoramento
     */
    stopMonitoring() {
        console.log('⏹️ Parando Enterprise Health Monitor...');
        
        this.intervals.forEach(interval => clearInterval(interval));
        this.intervals = [];
        this.isMonitoring = false;
        
        console.log('✅ Enterprise Health Monitor parado');
        this.emit('monitoring-stopped');
    }
}

// Singleton instance
let healthMonitor = null;

function getEnterpriseHealthMonitor() {
    if (!healthMonitor) {
        healthMonitor = new EnterpriseHealthMonitor();
    }
    return healthMonitor;
}

module.exports = {
    EnterpriseHealthMonitor,
    getEnterpriseHealthMonitor
};

// Auto-start se executado diretamente
if (require.main === module) {
    const monitor = new EnterpriseHealthMonitor();
    
    monitor.startMonitoring().then(() => {
        console.log('🏢 Enterprise Health Monitor rodando...');
        console.log('Press Ctrl+C para parar');
        
        // Graceful shutdown
        process.on('SIGINT', () => {
            monitor.stopMonitoring();
            process.exit(0);
        });
        
    }).catch(error => {
        console.error('❌ Erro ao iniciar monitor:', error.message);
        process.exit(1);
    });
}
