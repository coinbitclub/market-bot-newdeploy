/**
 * 📊 PERFORMANCE METRICS SYSTEM
 * 
 * Sistema de métricas de performance enterprise
 */

const { logger } = require('./logger');

class MetricsCollector {
    constructor() {
        this.metrics = {
            requests: 0,
            responses: 0,
            errors: 0,
            responseTime: [],
            memoryUsage: [],
            cpuUsage: [],
            tradingOperations: 0,
            successfulTrades: 0,
            failedTrades: 0
        };
        
        this.startTime = Date.now();
        this.isCollecting = false;
    }

    startCollection(interval = 60000) {
        if (this.isCollecting) return;
        
        this.isCollecting = true;
        logger.info('Sistema de métricas iniciado', { interval });
        
        this.intervalId = setInterval(() => {
            this.collectSystemMetrics();
        }, interval);
    }

    stopCollection() {
        if (!this.isCollecting) return;
        
        clearInterval(this.intervalId);
        this.isCollecting = false;
        logger.info('Sistema de métricas parado');
    }

    collectSystemMetrics() {
        const memUsage = process.memoryUsage();
        const cpuUsage = process.cpuUsage();
        
        this.metrics.memoryUsage.push({
            timestamp: Date.now(),
            rss: memUsage.rss,
            heapUsed: memUsage.heapUsed,
            heapTotal: memUsage.heapTotal,
            external: memUsage.external
        });
        
        this.metrics.cpuUsage.push({
            timestamp: Date.now(),
            user: cpuUsage.user,
            system: cpuUsage.system
        });
        
        // Manter apenas últimas 100 entradas
        if (this.metrics.memoryUsage.length > 100) {
            this.metrics.memoryUsage = this.metrics.memoryUsage.slice(-100);
        }
        
        if (this.metrics.cpuUsage.length > 100) {
            this.metrics.cpuUsage = this.metrics.cpuUsage.slice(-100);
        }
    }

    recordRequest() {
        this.metrics.requests++;
    }

    recordResponse(responseTime) {
        this.metrics.responses++;
        this.metrics.responseTime.push({
            timestamp: Date.now(),
            time: responseTime
        });
        
        // Manter apenas últimas 1000 entradas
        if (this.metrics.responseTime.length > 1000) {
            this.metrics.responseTime = this.metrics.responseTime.slice(-1000);
        }
    }

    recordError() {
        this.metrics.errors++;
    }

    recordTradingOperation(success = true) {
        this.metrics.tradingOperations++;
        if (success) {
            this.metrics.successfulTrades++;
        } else {
            this.metrics.failedTrades++;
        }
    }

    getMetricsSummary() {
        const uptime = Date.now() - this.startTime;
        const avgResponseTime = this.calculateAverageResponseTime();
        const avgMemoryUsage = this.calculateAverageMemoryUsage();
        const successRate = this.calculateSuccessRate();
        
        return {
            uptime: {
                milliseconds: uptime,
                seconds: Math.floor(uptime / 1000),
                minutes: Math.floor(uptime / 60000),
                hours: Math.floor(uptime / 3600000)
            },
            
            requests: {
                total: this.metrics.requests,
                responses: this.metrics.responses,
                errors: this.metrics.errors,
                errorRate: this.metrics.requests > 0 ? (this.metrics.errors / this.metrics.requests) * 100 : 0
            },
            
            performance: {
                averageResponseTime: avgResponseTime,
                averageMemoryUsage: avgMemoryUsage
            },
            
            trading: {
                totalOperations: this.metrics.tradingOperations,
                successful: this.metrics.successfulTrades,
                failed: this.metrics.failedTrades,
                successRate
            }
        };
    }

    calculateAverageResponseTime() {
        if (this.metrics.responseTime.length === 0) return 0;
        
        const total = this.metrics.responseTime.reduce((sum, entry) => sum + entry.time, 0);
        return total / this.metrics.responseTime.length;
    }

    calculateAverageMemoryUsage() {
        if (this.metrics.memoryUsage.length === 0) return 0;
        
        const total = this.metrics.memoryUsage.reduce((sum, entry) => sum + entry.heapUsed, 0);
        return total / this.metrics.memoryUsage.length;
    }

    calculateSuccessRate() {
        if (this.metrics.tradingOperations === 0) return 0;
        return (this.metrics.successfulTrades / this.metrics.tradingOperations) * 100;
    }

    // Middleware Express para coleta automática
    expressMiddleware() {
        return (req, res, next) => {
            const startTime = Date.now();
            this.recordRequest();
            
            res.on('finish', () => {
                const responseTime = Date.now() - startTime;
                this.recordResponse(responseTime);
                
                if (res.statusCode >= 400) {
                    this.recordError();
                }
            });
            
            next();
        };
    }

    // Gerar relatório detalhado
    generateReport() {
        const summary = this.getMetricsSummary();
        
        const report = {
            timestamp: new Date().toISOString(),
            summary,
            rawMetrics: {
                responseTimeHistory: this.metrics.responseTime.slice(-50), // Últimas 50
                memoryUsageHistory: this.metrics.memoryUsage.slice(-50),   // Últimas 50
                cpuUsageHistory: this.metrics.cpuUsage.slice(-50)          // Últimas 50
            }
        };
        
        logger.info('Relatório de métricas gerado', summary);
        return report;
    }
}

// Instância global
const metrics = new MetricsCollector();

module.exports = { MetricsCollector, metrics };
