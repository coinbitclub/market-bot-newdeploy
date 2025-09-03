#!/usr/bin/env node

/**
 * MONITOR DE IP RAILWAY - SISTEMA TEMPORÁRIO
 * Detecta mudanças de IP e notifica para atualização nas exchanges
 */

const axios = require('axios');
const fs = require('fs');

class RailwayIPMonitor {
    constructor() {
        this.railwayUrl = 'https://coinbitclub-backend.railway.app';
        this.ipHistoryFile = 'railway-ip-history.json';
        this.currentIP = null;
        this.history = this.loadHistory();
    }

    loadHistory() {
        try {
            return JSON.parse(fs.readFileSync(this.ipHistoryFile, 'utf8'));
        } catch {
            return { ips: [], changes: [] };
        }
    }

    saveHistory() {
        fs.writeFileSync(this.ipHistoryFile, JSON.stringify(this.history, null, 2));
    }

    async getCurrentIP() {
        try {
            // Método 1: Via railway health check
            const response = await axios.get(`${this.railwayUrl}/health`, {
                timeout: 10000,
                headers: { 'User-Agent': 'CoinBitClub-Monitor' }
            });

            // Extrair IP do header ou resposta
            const ip = response.headers['x-real-ip'] || 
                      response.headers['x-forwarded-for'] || 
                      await this.getIPFromExternal();

            return ip;
        } catch (error) {
            console.log('⚠️ Erro ao obter IP do Railway:', error.message);
            return await this.getIPFromExternal();
        }
    }

    async getIPFromExternal() {
        try {
            const response = await axios.get('https://api.ipify.org?format=json');
            return response.data.ip;
        } catch {
            return 'Não detectado';
        }
    }

    async monitorChanges() {
        console.log('🔍 MONITOR DE IP RAILWAY ATIVO');
        console.log('==============================');
        console.log('');

        const newIP = await this.getCurrentIP();
        const timestamp = new Date().toISOString();

        console.log(`🌐 IP atual: ${newIP}`);
        console.log(`⏰ Verificado em: ${new Date().toLocaleString()}`);

        // Verificar se IP mudou
        if (this.currentIP && this.currentIP !== newIP) {
            console.log('');
            console.log('🚨 MUDANÇA DE IP DETECTADA!');
            console.log(`   IP anterior: ${this.currentIP}`);
            console.log(`   IP novo: ${newIP}`);
            console.log('');
            console.log('📋 AÇÕES NECESSÁRIAS:');
            console.log('1. 🔄 Atualizar IP nas exchanges:');
            console.log('   • Bybit: https://www.bybit.com/app/user/api-management');
            console.log('   • Binance: https://www.binance.com/en/my/settings/api-management');
            console.log(`   • Novo IP: ${newIP}`);
            console.log('');

            // Salvar mudança no histórico
            this.history.changes.push({
                from: this.currentIP,
                to: newIP,
                timestamp: timestamp,
                action_required: 'Update exchange IP restrictions'
            });
        }

        // Atualizar IP atual
        this.currentIP = newIP;
        
        // Adicionar ao histórico
        this.history.ips.push({
            ip: newIP,
            timestamp: timestamp,
            source: 'railway_monitor'
        });

        // Manter apenas últimos 50 registros
        if (this.history.ips.length > 50) {
            this.history.ips = this.history.ips.slice(-50);
        }

        this.saveHistory();

        console.log(`📊 Total de verificações: ${this.history.ips.length}`);
        console.log(`🔄 Mudanças detectadas: ${this.history.changes.length}`);
        
        return newIP;
    }

    async startMonitoring(intervalMinutes = 5) {
        console.log('🚀 INICIANDO MONITORAMENTO CONTÍNUO');
        console.log(`⏱️ Intervalo: ${intervalMinutes} minutos`);
        console.log('▶️ Pressione Ctrl+C para parar');
        console.log('');

        // Verificação inicial
        await this.monitorChanges();

        // Monitoramento contínuo
        setInterval(async () => {
            console.log('\n' + '='.repeat(40));
            await this.monitorChanges();
        }, intervalMinutes * 60 * 1000);
    }

    generateReport() {
        console.log('📊 RELATÓRIO DE MONITORAMENTO IP');
        console.log('=================================');
        console.log('');
        
        if (this.history.ips.length > 0) {
            const latest = this.history.ips[this.history.ips.length - 1];
            console.log(`🌐 IP atual: ${latest.ip}`);
            console.log(`⏰ Última verificação: ${new Date(latest.timestamp).toLocaleString()}`);
        }

        console.log(`📊 Total verificações: ${this.history.ips.length}`);
        console.log(`🔄 Mudanças de IP: ${this.history.changes.length}`);

        if (this.history.changes.length > 0) {
            console.log('\n📈 HISTÓRICO DE MUDANÇAS:');
            this.history.changes.forEach((change, i) => {
                console.log(`   ${i + 1}. ${change.from} → ${change.to}`);
                console.log(`      Data: ${new Date(change.timestamp).toLocaleString()}`);
            });
        }
    }
}

// Executar
if (require.main === module) {
    const monitor = new RailwayIPMonitor();
    
    const action = process.argv[2] || 'check';
    
    switch (action) {
        case 'start':
            monitor.startMonitoring(5); // 5 minutos
            break;
        case 'report':
            monitor.generateReport();
            break;
        default:
            monitor.monitorChanges();
    }
}

module.exports = RailwayIPMonitor;