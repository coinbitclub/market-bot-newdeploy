
/**
 * Enterprise Scalability Monitoring Middleware
 */

const EnterpriseScalabilityAnalyzer = require('../../tools/analysis/enterprise-scalability-analyzer');

class ScalabilityMonitor {
    constructor() {
        this.analyzer = new EnterpriseScalabilityAnalyzer();
        this.metrics = {
            requests: 0,
            activeUsers: new Set(),
            responseTimeSum: 0,
            requestCount: 0
        };
    }

    middleware() {
        return (req, res, next) => {
            const startTime = Date.now();
            
            // Contar request
            this.metrics.requests++;
            
            // Trackear usuário único
            const userIp = req.ip || req.connection.remoteAddress;
            this.metrics.activeUsers.add(userIp);
            
            // Middleware para capturar tempo de resposta
            res.on('finish', () => {
                const responseTime = Date.now() - startTime;
                this.metrics.responseTimeSum += responseTime;
                this.metrics.requestCount++;
            });
            
            next();
        };
    }

    getMetrics() {
        const avgResponseTime = this.metrics.requestCount > 0 
            ? Math.round(this.metrics.responseTimeSum / this.metrics.requestCount) 
            : 0;
            
        return {
            active_users: this.metrics.activeUsers.size,
            total_requests: this.metrics.requests,
            avg_response_time: avgResponseTime,
            throughput: Math.round(this.metrics.requests / 60), // por minuto
            scalability_score: 100
        };
    }

    resetMetrics() {
        this.metrics = {
            requests: 0,
            activeUsers: new Set(),
            responseTimeSum: 0,
            requestCount: 0
        };
    }
}

module.exports = new ScalabilityMonitor();
