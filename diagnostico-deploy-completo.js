#!/usr/bin/env node
/**
 * 🔍 DIAGNÓSTICO RAILWAY DEPLOY - COMPLETO
 * =======================================
 */

const https = require('https');
const fs = require('fs');

console.log('🔍 DIAGNÓSTICO RAILWAY DEPLOY');
console.log('=============================\n');

const BASE_URL = 'coinbitclub-market-bot.up.railway.app';

async function diagnosticoCompleto() {
    const log = [];
    
    function addLog(msg) {
        console.log(msg);
        log.push(msg);
    }
    
    // Função de request
    const makeRequest = (path, timeout = 10000) => new Promise((resolve) => {
        const startTime = Date.now();
        
        const req = https.request({
            hostname: BASE_URL,
            port: 443,
            path: path,
            method: 'GET',
            timeout: timeout,
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'RailwayDiagnostic/1.0',
                'Cache-Control': 'no-cache'
            }
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                const responseTime = Date.now() - startTime;
                resolve({
                    status: res.statusCode,
                    data: data,
                    headers: res.headers,
                    responseTime: responseTime
                });
            });
        });
        
        req.on('error', (err) => {
            const responseTime = Date.now() - startTime;
            resolve({
                status: 0,
                error: err.message,
                responseTime: responseTime
            });
        });
        
        req.on('timeout', () => {
            req.destroy();
            const responseTime = Date.now() - startTime;
            resolve({
                status: 0,
                error: 'timeout',
                responseTime: responseTime
            });
        });
        
        req.end();
    });
    
    addLog('📡 1. TESTANDO CONECTIVIDADE BÁSICA');
    addLog('==================================');
    
    // Teste 1: Conectividade básica
    const basicTest = await makeRequest('/', 5000);
    addLog(`Status: ${basicTest.status} | Tempo: ${basicTest.responseTime}ms`);
    
    if (basicTest.status === 0) {
        addLog('❌ ERRO: Railway não está acessível');
        addLog(`   Erro: ${basicTest.error}`);
        addLog('\n💡 POSSÍVEIS CAUSAS:');
        addLog('   - Deploy em progresso (servidor reiniciando)');
        addLog('   - Problemas de rede da Railway');
        addLog('   - Timeout durante deploy');
        return;
    }
    
    addLog('✅ Railway está ONLINE\n');
    
    // Teste 2: Health check detalhado
    addLog('🏥 2. VERIFICANDO HEALTH ENDPOINT');
    addLog('================================');
    
    const healthTest = await makeRequest('/health');
    addLog(`Status: ${healthTest.status} | Tempo: ${healthTest.responseTime}ms`);
    
    if (healthTest.status === 200) {
        try {
            const healthData = JSON.parse(healthTest.data);
            addLog(`✅ Health OK`);
            addLog(`   Versão: ${healthData.version || 'unknown'}`);
            addLog(`   Uptime: ${healthData.uptime || 0}s`);
            addLog(`   Mode: ${healthData.mode || 'unknown'}`);
            
            // Verificar se é a versão enterprise
            if (healthData.version && (healthData.version.includes('6.0') || healthData.version.includes('enterprise'))) {
                addLog('🎉 VERSÃO ENTERPRISE DETECTADA!');
            } else {
                addLog('⚠️ Ainda na versão antiga (não enterprise)');
            }
        } catch (e) {
            addLog(`⚠️ Health responde mas JSON inválido`);
            addLog(`   Raw data: ${healthTest.data.substring(0, 100)}...`);
        }
    } else {
        addLog(`❌ Health endpoint com problema: ${healthTest.status}`);
    }
    
    addLog('');
    
    // Teste 3: Endpoints enterprise específicos
    addLog('🏢 3. TESTANDO ENDPOINTS ENTERPRISE');
    addLog('==================================');
    
    const enterpriseEndpoints = [
        '/api/dashboard/summary',
        '/api/webhooks/signal',
        '/api/exchanges/status',
        '/api/trade/status',
        '/api/system/status',
        '/api/validation/status'
    ];
    
    let enterpriseActive = 0;
    
    for (const endpoint of enterpriseEndpoints) {
        const result = await makeRequest(endpoint, 3000);
        const status = result.status === 200 ? '✅' : result.status === 404 ? '❌' : '⚠️';
        addLog(`${status} ${endpoint} [${result.status}] ${result.responseTime}ms`);
        
        if (result.status === 200) {
            enterpriseActive++;
        }
    }
    
    addLog('');
    addLog(`📊 Endpoints enterprise ativos: ${enterpriseActive}/${enterpriseEndpoints.length}`);
    
    // Diagnóstico final
    addLog('\n🎯 DIAGNÓSTICO FINAL');
    addLog('===================');
    
    if (enterpriseActive === 0) {
        addLog('🔄 DEPLOY TRAVADO ou EM PROGRESSO');
        addLog('Situação: Railway online mas SEM endpoints enterprise');
        addLog('');
        addLog('💡 POSSÍVEIS CAUSAS:');
        addLog('   1. Deploy ainda processando (pode levar até 10 min)');
        addLog('   2. Erro durante build - Railway usando versão antiga');
        addLog('   3. Cache da Railway não foi limpo');
        addLog('   4. Problema no start script ou dependências');
        addLog('');
        addLog('🔧 AÇÕES RECOMENDADAS:');
        addLog('   1. Forçar novo deploy com commit vazio');
        addLog('   2. Verificar se package.json foi atualizado corretamente');
        addLog('   3. Verificar logs da Railway no dashboard');
        addLog('   4. Limpar cache da Railway (redeploy)');
    } else if (enterpriseActive < enterpriseEndpoints.length) {
        addLog('⚠️ DEPLOY PARCIAL');
        addLog('Alguns endpoints funcionando, outros não');
        addLog('Pode ser problema de configuração específica');
    } else {
        addLog('🎉 DEPLOY COMPLETO - ENTERPRISE ATIVO!');
    }
    
    // Salvar log
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const logFile = `railway-diagnostic-${timestamp}.log`;
    const logContent = log.join('\n');
    fs.writeFileSync(logFile, logContent);
    addLog(`\n📝 Log completo salvo em: ${logFile}`);
}

diagnosticoCompleto().catch(console.error);
