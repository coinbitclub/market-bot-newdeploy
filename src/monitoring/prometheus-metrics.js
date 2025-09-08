/**
 * 📊 PROMETHEUS METRICS - MONITORAMENTO ENTERPRISE
 * =================================================
 * 
 * Sistema avançado de métricas para Prometheus/Grafana
 * Métricas customizadas, alertas e dashboards automatizados
 * 
 * @author CoinBitClub Enterprise Team
 * @version 6.0.0 Advanced
 */

const client = require('prom-client');

class PrometheusMetrics {
    constructor(options = {}) {
        this.appName = options.appName || 'coinbitclub';
        this.environment = process.env.NODE_ENV || 'development';
        this.metricsPrefix = options.prefix || 'coinbitclub_';
        
        this.register = new client.Registry();
        this.setupDefaultMetrics();
        this.createCustomMetrics();
        this.startMetricsCollection();
        
        console.log('📊 Prometheus Metrics inicializado');
        console.log(`📈 Prefix: ${this.metricsPrefix} | Env: ${this.environment}`);
    }

    /**
     * 🔧 Configurar métricas padrão
     */
    setupDefaultMetrics() {
        // Métricas padrão do Node.js
        client.collectDefaultMetrics({
            register: this.register,
            prefix: this.metricsPrefix,
        });

        // Labels globais
        this.register.setDefaultLabels({
            app: this.appName,
            environment: this.environment,
            instance: require('os').hostname(),
            version: process.env.npm_package_version || '6.0.0'
        });
    }

    /**
     * 📈 Criar métricas customizadas
     */
    createCustomMetrics() {
        // === TRADING METRICS ===
        this.tradingOrdersTotal = new client.Counter({
            name: `${this.metricsPrefix}trading_orders_total`,
            help: 'Total number of trading orders placed',
            labelNames: ['symbol', 'side', 'status', 'exchange']
        });

        this.tradingPositionsActive = new client.Gauge({
            name: `${this.metricsPrefix}trading_positions_active`,
            help: 'Number of active trading positions',
            labelNames: ['symbol', 'exchange']
        });

        this.tradingPnlTotal = new client.Gauge({
            name: `${this.metricsPrefix}trading_pnl_total_usd`,
            help: 'Total P&L in USD',
            labelNames: ['symbol', 'exchange', 'timeframe']
        });

        this.tradingVolume = new client.Counter({
            name: `${this.metricsPrefix}trading_volume_usd`,
            help: 'Total trading volume in USD',
            labelNames: ['symbol', 'exchange']
        });

        this.tradingLatency = new client.Histogram({
            name: `${this.metricsPrefix}trading_latency_seconds`,
            help: 'Trading operation latency',
            buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
            labelNames: ['operation', 'exchange']
        });

        // === API METRICS ===
        this.httpRequestsTotal = new client.Counter({
            name: `${this.metricsPrefix}http_requests_total`,
            help: 'Total number of HTTP requests',
            labelNames: ['method', 'route', 'status_code']
        });

        this.httpRequestDuration = new client.Histogram({
            name: `${this.metricsPrefix}http_request_duration_seconds`,
            help: 'HTTP request duration',
            buckets: [0.01, 0.05, 0.1, 0.2, 0.5, 1, 2, 5],
            labelNames: ['method', 'route']
        });

        this.httpActiveConnections = new client.Gauge({
            name: `${this.metricsPrefix}http_active_connections`,
            help: 'Number of active HTTP connections'
        });

        // === DATABASE METRICS ===
        this.dbConnectionsActive = new client.Gauge({
            name: `${this.metricsPrefix}db_connections_active`,
            help: 'Number of active database connections',
            labelNames: ['pool_type']
        });

        this.dbQueryDuration = new client.Histogram({
            name: `${this.metricsPrefix}db_query_duration_seconds`,
            help: 'Database query duration',
            buckets: [0.001, 0.01, 0.05, 0.1, 0.2, 0.5, 1],
            labelNames: ['operation', 'table']
        });

        this.dbQueriesTotal = new client.Counter({
            name: `${this.metricsPrefix}db_queries_total`,
            help: 'Total number of database queries',
            labelNames: ['operation', 'status']
        });

        // === CACHE METRICS ===
        this.cacheOperations = new client.Counter({
            name: `${this.metricsPrefix}cache_operations_total`,
            help: 'Total number of cache operations',
            labelNames: ['operation', 'result']
        });

        this.cacheHitRatio = new client.Gauge({
            name: `${this.metricsPrefix}cache_hit_ratio`,
            help: 'Cache hit ratio percentage'
        });

        this.cacheSize = new client.Gauge({
            name: `${this.metricsPrefix}cache_size_bytes`,
            help: 'Cache size in bytes',
            labelNames: ['cache_type']
        });

        // === FINANCIAL METRICS ===
        this.userBalances = new client.Gauge({
            name: `${this.metricsPrefix}user_balances_usd`,
            help: 'User balances in USD',
            labelNames: ['currency', 'user_tier']
        });

        this.transactionsTotal = new client.Counter({
            name: `${this.metricsPrefix}transactions_total`,
            help: 'Total number of financial transactions',
            labelNames: ['type', 'status', 'currency']
        });

        this.transactionVolume = new client.Counter({
            name: `${this.metricsPrefix}transaction_volume_usd`,
            help: 'Total transaction volume in USD',
            labelNames: ['type']
        });

        // === SECURITY METRICS ===
        this.authenticationAttempts = new client.Counter({
            name: `${this.metricsPrefix}auth_attempts_total`,
            help: 'Total authentication attempts',
            labelNames: ['method', 'status']
        });

        this.rateLimitHits = new client.Counter({
            name: `${this.metricsPrefix}rate_limit_hits_total`,
            help: 'Total rate limit hits',
            labelNames: ['endpoint', 'user_id']
        });

        this.securityEvents = new client.Counter({
            name: `${this.metricsPrefix}security_events_total`,
            help: 'Total security events',
            labelNames: ['event_type', 'severity']
        });

        // === AI METRICS ===
        this.aiRequestsTotal = new client.Counter({
            name: `${this.metricsPrefix}ai_requests_total`,
            help: 'Total AI requests',
            labelNames: ['model', 'status']
        });

        this.aiLatency = new client.Histogram({
            name: `${this.metricsPrefix}ai_latency_seconds`,
            help: 'AI request latency',
            buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
            labelNames: ['model', 'operation']
        });

        this.aiTokensUsed = new client.Counter({
            name: `${this.metricsPrefix}ai_tokens_used_total`,
            help: 'Total AI tokens used',
            labelNames: ['model']
        });

        // === SYSTEM METRICS ===
        this.errorRate = new client.Counter({
            name: `${this.metricsPrefix}errors_total`,
            help: 'Total number of errors',
            labelNames: ['component', 'error_type']
        });

        this.uptimeSeconds = new client.Gauge({
            name: `${this.metricsPrefix}uptime_seconds`,
            help: 'Application uptime in seconds'
        });

        this.activeUsers = new client.Gauge({
            name: `${this.metricsPrefix}active_users`,
            help: 'Number of active users',
            labelNames: ['timeframe']
        });

        // Registrar todas as métricas
        this.register.registerMetric(this.tradingOrdersTotal);
        this.register.registerMetric(this.tradingPositionsActive);
        this.register.registerMetric(this.tradingPnlTotal);
        this.register.registerMetric(this.tradingVolume);
        this.register.registerMetric(this.tradingLatency);
        this.register.registerMetric(this.httpRequestsTotal);
        this.register.registerMetric(this.httpRequestDuration);
        this.register.registerMetric(this.httpActiveConnections);
        this.register.registerMetric(this.dbConnectionsActive);
        this.register.registerMetric(this.dbQueryDuration);
        this.register.registerMetric(this.dbQueriesTotal);
        this.register.registerMetric(this.cacheOperations);
        this.register.registerMetric(this.cacheHitRatio);
        this.register.registerMetric(this.cacheSize);
        this.register.registerMetric(this.userBalances);
        this.register.registerMetric(this.transactionsTotal);
        this.register.registerMetric(this.transactionVolume);
        this.register.registerMetric(this.authenticationAttempts);
        this.register.registerMetric(this.rateLimitHits);
        this.register.registerMetric(this.securityEvents);
        this.register.registerMetric(this.aiRequestsTotal);
        this.register.registerMetric(this.aiLatency);
        this.register.registerMetric(this.aiTokensUsed);
        this.register.registerMetric(this.errorRate);
        this.register.registerMetric(this.uptimeSeconds);
        this.register.registerMetric(this.activeUsers);
    }

    /**
     * ⏱️ Iniciar coleta de métricas
     */
    startMetricsCollection() {
        const startTime = Date.now();
        
        // Atualizar uptime a cada minuto
        setInterval(() => {
            const uptimeMs = Date.now() - startTime;
            this.uptimeSeconds.set(Math.floor(uptimeMs / 1000));
        }, 60000);

        console.log('⏱️ Coleta de métricas iniciada');
    }

    // === TRADING METRICS METHODS ===
    
    recordTradingOrder(symbol, side, status, exchange = 'binance') {
        this.tradingOrdersTotal.inc({ symbol, side, status, exchange });
    }

    updateActivePositions(symbol, count, exchange = 'binance') {
        this.tradingPositionsActive.set({ symbol, exchange }, count);
    }

    updateTradingPnL(symbol, pnl, exchange = 'binance', timeframe = '24h') {
        this.tradingPnlTotal.set({ symbol, exchange, timeframe }, pnl);
    }

    recordTradingVolume(symbol, volume, exchange = 'binance') {
        this.tradingVolume.inc({ symbol, exchange }, volume);
    }

    recordTradingLatency(operation, latency, exchange = 'binance') {
        this.tradingLatency.observe({ operation, exchange }, latency / 1000);
    }

    // === API METRICS METHODS ===
    
    recordHttpRequest(method, route, statusCode, duration) {
        this.httpRequestsTotal.inc({ method, route, status_code: statusCode });
        this.httpRequestDuration.observe({ method, route }, duration / 1000);
    }

    updateActiveConnections(count) {
        this.httpActiveConnections.set(count);
    }

    // === DATABASE METRICS METHODS ===
    
    updateDbConnections(poolType, count) {
        this.dbConnectionsActive.set({ pool_type: poolType }, count);
    }

    recordDbQuery(operation, table, duration, status = 'success') {
        this.dbQueryDuration.observe({ operation, table }, duration / 1000);
        this.dbQueriesTotal.inc({ operation, status });
    }

    // === CACHE METRICS METHODS ===
    
    recordCacheOperation(operation, result) {
        this.cacheOperations.inc({ operation, result });
    }

    updateCacheHitRatio(ratio) {
        this.cacheHitRatio.set(ratio);
    }

    updateCacheSize(cacheType, size) {
        this.cacheSize.set({ cache_type: cacheType }, size);
    }

    // === FINANCIAL METRICS METHODS ===
    
    updateUserBalance(currency, tier, balance) {
        this.userBalances.set({ currency, user_tier: tier }, balance);
    }

    recordTransaction(type, status, currency, volume = 0) {
        this.transactionsTotal.inc({ type, status, currency });
        if (volume > 0) {
            this.transactionVolume.inc({ type }, volume);
        }
    }

    // === SECURITY METRICS METHODS ===
    
    recordAuthAttempt(method, status) {
        this.authenticationAttempts.inc({ method, status });
    }

    recordRateLimitHit(endpoint, userId) {
        this.rateLimitHits.inc({ endpoint, user_id: userId });
    }

    recordSecurityEvent(eventType, severity) {
        this.securityEvents.inc({ event_type: eventType, severity });
    }

    // === AI METRICS METHODS ===
    
    recordAiRequest(model, status, latency = 0, tokens = 0) {
        this.aiRequestsTotal.inc({ model, status });
        if (latency > 0) {
            this.aiLatency.observe({ model, operation: 'request' }, latency / 1000);
        }
        if (tokens > 0) {
            this.aiTokensUsed.inc({ model }, tokens);
        }
    }

    // === SYSTEM METRICS METHODS ===
    
    recordError(component, errorType) {
        this.errorRate.inc({ component, error_type: errorType });
    }

    updateActiveUsers(timeframe, count) {
        this.activeUsers.set({ timeframe }, count);
    }

    /**
     * 📊 Middleware para Express
     */
    middleware() {
        return (req, res, next) => {
            const startTime = Date.now();
            
            // Incrementar conexões ativas
            this.updateActiveConnections(1);
            
            res.on('finish', () => {
                const duration = Date.now() - startTime;
                const route = req.route?.path || req.path || 'unknown';
                
                this.recordHttpRequest(
                    req.method,
                    route,
                    res.statusCode,
                    duration
                );
                
                // Decrementar conexões ativas
                this.updateActiveConnections(-1);
            });
            
            next();
        };
    }

    /**
     * 📊 Endpoint de métricas
     */
    async getMetrics() {
        return await this.register.metrics();
    }

    /**
     * 📊 Endpoint de health check
     */
    getHealthMetrics() {
        return {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            cpu: process.cpuUsage(),
            metrics_count: this.register.getSingleMetric ? 
                Object.keys(this.register.getSingleMetric()).length : 
                'unknown'
        };
    }

    /**
     * 📈 Obter resumo de métricas
     */
    async getMetricsSummary() {
        const metrics = await this.getMetrics();
        const lines = metrics.split('\n').filter(line => 
            line.startsWith(this.metricsPrefix) && !line.startsWith('#')
        );

        const summary = {
            total_metrics: lines.length,
            trading: lines.filter(l => l.includes('trading_')).length,
            api: lines.filter(l => l.includes('http_')).length,
            database: lines.filter(l => l.includes('db_')).length,
            cache: lines.filter(l => l.includes('cache_')).length,
            financial: lines.filter(l => l.includes('transaction_') || l.includes('balance_')).length,
            security: lines.filter(l => l.includes('auth_') || l.includes('security_')).length,
            ai: lines.filter(l => l.includes('ai_')).length,
            system: lines.filter(l => l.includes('error_') || l.includes('uptime_')).length
        };

        return summary;
    }

    /**
     * 🔄 Reset métricas (apenas contadores)
     */
    resetCounters() {
        this.register.resetMetrics();
        console.log('🔄 Métricas resetadas');
    }

    /**
     * 🔌 Parar coleta de métricas
     */
    stop() {
        this.register.clear();
        console.log('📊 Prometheus Metrics parado');
    }
}

module.exports = PrometheusMetrics;
