/**
 * 📊 ADVANCED MONITORING SYSTEM
 * 
 * Sistema de monitoramento enterprise avançado
 */

const { logger } = require('./logger');
const { metrics } = require('./metrics');

class AdvancedMonitoringSystem {
    constructor() {
        this.alerts = [];
        this.thresholds = {
            cpu: 80, // 80%
            memory: 85, // 85%
            responseTime: 2000, // 2 segundos
            errorRate: 5, // 5%
            diskSpace: 90 // 90%
        };
        this.isMonitoring = false;
    }

    startAdvancedMonitoring() {
        if (this.isMonitoring) return;
        
        this.isMonitoring = true;
        logger.info('Sistema de monitoramento avançado iniciado');
        
        // Monitoramento de sistema a cada 30 segundos
        this.systemMonitorInterval = setInterval(() => {
            this.checkSystemHealth();
        }, 30000);
        
        // Monitoramento de aplicação a cada 60 segundos
        this.appMonitorInterval = setInterval(() => {
            this.checkApplicationHealth();
        }, 60000);
        
        // Limpeza de alertas antigos a cada 5 minutos
        this.cleanupInterval = setInterval(() => {
            this.cleanupOldAlerts();
        }, 300000);
    }

    stopAdvancedMonitoring() {
        if (!this.isMonitoring) return;
        
        clearInterval(this.systemMonitorInterval);
        clearInterval(this.appMonitorInterval);
        clearInterval(this.cleanupInterval);
        
        this.isMonitoring = false;
        logger.info('Sistema de monitoramento avançado parado');
    }

    checkSystemHealth() {
        const memUsage = process.memoryUsage();
        const cpuUsage = process.cpuUsage();
        
        // Verificar uso de memória
        const memPercentage = (memUsage.heapUsed / memUsage.heapTotal) * 100;
        if (memPercentage > this.thresholds.memory) {
            this.createAlert('HIGH_MEMORY_USAGE', `Uso de memória alto: ${memPercentage.toFixed(2)}%`, 'warning');
        }
        
        // Verificar espaço em disco (simulado)
        const diskUsage = Math.random() * 100; // Implementar verificação real
        if (diskUsage > this.thresholds.diskSpace) {
            this.createAlert('HIGH_DISK_USAGE', `Uso de disco alto: ${diskUsage.toFixed(2)}%`, 'critical');
        }
        
        // Log de saúde do sistema
        logger.debug('System health check', {
            memory: {
                used: memUsage.heapUsed,
                total: memUsage.heapTotal,
                percentage: memPercentage
            },
            cpu: cpuUsage,
            uptime: process.uptime()
        });
    }

    checkApplicationHealth() {
        const metricsData = metrics.getMetricsSummary();
        
        // Verificar taxa de erro
        if (metricsData.requests.errorRate > this.thresholds.errorRate) {
            this.createAlert(
                'HIGH_ERROR_RATE',
                `Taxa de erro alta: ${metricsData.requests.errorRate.toFixed(2)}%`,
                'critical'
            );
        }
        
        // Verificar tempo de resposta
        if (metricsData.performance.averageResponseTime > this.thresholds.responseTime) {
            this.createAlert(
                'HIGH_RESPONSE_TIME',
                `Tempo de resposta alto: ${metricsData.performance.averageResponseTime.toFixed(2)}ms`,
                'warning'
            );
        }
        
        // Log de saúde da aplicação
        logger.info('Application health check', {
            uptime: metricsData.uptime,
            requests: metricsData.requests,
            performance: metricsData.performance
        });
    }

    createAlert(type, message, severity = 'info') {
        const alert = {
            id: Date.now().toString(),
            type,
            message,
            severity,
            timestamp: new Date().toISOString(),
            resolved: false
        };
        
        this.alerts.push(alert);
        
        // Log baseado na severidade
        switch (severity) {
            case 'critical':
                logger.error(`ALERT: ${message}`, { type, alertId: alert.id });
                break;
            case 'warning':
                logger.warn(`ALERT: ${message}`, { type, alertId: alert.id });
                break;
            default:
                logger.info(`ALERT: ${message}`, { type, alertId: alert.id });
        }
        
        // Enviar notificação se configurado
        this.sendNotification(alert);
        
        return alert.id;
    }

    resolveAlert(alertId) {
        const alert = this.alerts.find(a => a.id === alertId);
        if (alert) {
            alert.resolved = true;
            alert.resolvedAt = new Date().toISOString();
            logger.info(`Alert resolved: ${alert.message}`, { alertId });
        }
    }

    sendNotification(alert) {
        // Implementar notificações (webhook, email, SMS)
        // Por enquanto, apenas log
        if (alert.severity === 'critical') {
            logger.error('Critical alert requires immediate attention', alert);
        }
    }

    cleanupOldAlerts() {
        const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
        const beforeCount = this.alerts.length;
        
        this.alerts = this.alerts.filter(alert => {
            const alertTime = new Date(alert.timestamp).getTime();
            return alertTime > oneDayAgo || !alert.resolved;
        });
        
        const removed = beforeCount - this.alerts.length;
        if (removed > 0) {
            logger.debug(`Cleaned up ${removed} old alerts`);
        }
    }

    getActiveAlerts() {
        return this.alerts.filter(alert => !alert.resolved);
    }

    getAllAlerts() {
        return this.alerts;
    }

    updateThresholds(newThresholds) {
        this.thresholds = { ...this.thresholds, ...newThresholds };
        logger.info('Monitoring thresholds updated', this.thresholds);
    }

    getHealthStatus() {
        const activeAlerts = this.getActiveAlerts();
        const criticalAlerts = activeAlerts.filter(a => a.severity === 'critical');
        const warningAlerts = activeAlerts.filter(a => a.severity === 'warning');
        
        let status = 'healthy';
        if (criticalAlerts.length > 0) {
            status = 'critical';
        } else if (warningAlerts.length > 0) {
            status = 'warning';
        }
        
        return {
            status,
            activeAlerts: activeAlerts.length,
            criticalAlerts: criticalAlerts.length,
            warningAlerts: warningAlerts.length,
            lastCheck: new Date().toISOString(),
            uptime: process.uptime(),
            thresholds: this.thresholds
        };
    }
}

// Instância global
const advancedMonitoring = new AdvancedMonitoringSystem();

module.exports = { AdvancedMonitoringSystem, advancedMonitoring };
