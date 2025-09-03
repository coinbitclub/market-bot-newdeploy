/**
 * 🚀 COINBITCLUB MARKET BOT - SERVIDOR SIMPLIFICADO PARA TESTE
 */

console.log('🚀 Iniciando versão simplificada...');

const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

// Health check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        version: '5.1.2-simplified'
    });
});

// Importar e testar coletores
console.log('📦 Importando coletores...');
const RobustBalanceCollector = require('./coletor-saldos-robusto.js');
const FearGreedCollector = require('./coletor-fear-greed-coinstats.js');

console.log('🔧 Criando instâncias...');
const balanceCollector = new RobustBalanceCollector();
const fearGreedCollector = new FearGreedCollector();

console.log('✅ Coletores criados');

// Iniciar servidor
app.listen(port, '0.0.0.0', () => {
    console.log('🎯 SERVIDOR SIMPLIFICADO ATIVO!');
    console.log(`📡 Servidor rodando em: http://localhost:${port}`);
    console.log('📋 Endpoints: /health');
    
    // Testar coletores
    console.log('🔄 Testando coletores...');
    
    if (balanceCollector && typeof balanceCollector.start === 'function') {
        console.log('💰 Iniciando coletor de saldos...');
        balanceCollector.start();
        console.log('✅ Coletor de saldos iniciado!');
    } else {
        console.log('❌ Coletor de saldos não disponível');
    }
    
    if (fearGreedCollector && typeof fearGreedCollector.collectFearGreedData === 'function') {
        console.log('😱 Iniciando coletor Fear & Greed...');
        fearGreedCollector.collectFearGreedData();
        console.log('✅ Coletor Fear & Greed iniciado!');
    } else {
        console.log('❌ Coletor Fear & Greed não disponível');
    }
    
    console.log('🎉 SISTEMA SIMPLIFICADO 100% OPERACIONAL!');
});

console.log('🏁 Script finalizado - aguardando servidor...');
