
// 📊 ENTERPRISE MONITORING DASHBOARD
// Dashboard unificado para monitoramento completo

const RealTimePositionMonitor = require('../../scripts/monitoring/real-time-position-monitor');

class EnterpriseMonitoringDashboard {
    constructor() {
        this.positionMonitor = new RealTimePositionMonitor();
        this.systemMetrics = {
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            cpu: process.cpuUsage()
        };
        
        console.log('📊 Enterprise Monitoring Dashboard iniciado');
    }

    async getDashboardData() {
        return {
            system: {
                uptime: process.uptime(),
                memory: process.memoryUsage(),
                cpu: process.cpuUsage(),
                timestamp: new Date().toISOString()
            },
            trading: {
                activePositions: this.positionMonitor.obterMetricas(),
                performance: await this.getPerformanceMetrics()
            },
            health: await this.getSystemHealth()
        };
    }

    async getPerformanceMetrics() {
        // Métricas de performance já implementadas no position monitor
        return this.positionMonitor.obterMetricas();
    }

    async getSystemHealth() {
        return {
            status: 'operational',
            services: {
                trading_engine: 'operational',
                market_analyzer: 'operational', 
                ai_decision: 'operational',
                position_monitor: 'operational',
                risk_management: 'operational'
            },
            timestamp: new Date().toISOString()
        };
    }
}

module.exports = EnterpriseMonitoringDashboard;
