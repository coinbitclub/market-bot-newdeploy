#!/usr/bin/env node
/**
 * 👁️ MONITOR TEMPO REAL - RAILWAY DEPLOY V6.0
 * ===========================================
 */

const https = require('https');

console.log('👁️ MONITOR RAILWAY DEPLOY V6.0');
console.log('===============================');
console.log('🎯 Aguardando deploy da versão enterprise...\n');

let attempt = 0;
const maxAttempts = 30; // 15 minutos máximo
let lastVersion = null;
let lastUptime = null;

function makeRequest(path) {
    return new Promise((resolve) => {
        const req = https.request({
            hostname: 'coinbitclub-market-bot.up.railway.app',
            port: 443,
            path: path,
            method: 'GET',
            timeout: 5000,
            headers: { 'Accept': 'application/json', 'Cache-Control': 'no-cache' }
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve({ status: res.statusCode, data }));
        });
        req.on('error', () => resolve({ status: 0 }));
        req.on('timeout', () => { req.destroy(); resolve({ status: 0 }); });
        req.end();
    });
}

async function checkStatus() {
    attempt++;
    const time = new Date().toLocaleTimeString();
    
    console.log(`\n⏰ ${time} - Tentativa ${attempt}/${maxAttempts}`);
    
    // Verificar health
    const health = await makeRequest('/health');
    
    if (health.status === 0) {
        console.log('🔄 Railway reiniciando... (normal durante deploy)');
        return false;
    }
    
    if (health.status !== 200) {
        console.log(`⚠️ Health status: ${health.status}`);
        return false;
    }
    
    try {
        const data = JSON.parse(health.data);
        const version = data.version || 'unknown';
        const uptime = data.uptime || 0;
        
        console.log(`📊 Versão: ${version} | Uptime: ${uptime}s`);
        
        // Detectar mudanças
        if (lastVersion && version !== lastVersion) {
            console.log(`🔄 VERSÃO MUDOU: ${lastVersion} → ${version}`);
        }
        
        if (lastUptime && uptime < lastUptime) {
            console.log(`🔄 SERVIDOR REINICIOU: ${lastUptime}s → ${uptime}s`);
        }
        
        lastVersion = version;
        lastUptime = uptime;
        
        // Verificar se é versão enterprise
        if (version.includes('6.0') || version.includes('enterprise')) {
            console.log('🎉 VERSÃO ENTERPRISE DETECTADA!');
            
            // Testar endpoints enterprise
            console.log('🧪 Testando endpoints enterprise...');
            
            const tests = [
                '/api/dashboard/summary',
                '/api/webhooks/signal', 
                '/api/exchanges/status'
            ];
            
            let working = 0;
            
            for (const test of tests) {
                const result = await makeRequest(test);
                const icon = result.status === 200 ? '✅' : '❌';
                console.log(`${icon} ${test} [${result.status}]`);
                if (result.status === 200) working++;
            }
            
            if (working === tests.length) {
                console.log('\n🎉🎉🎉 DEPLOY ENTERPRISE COMPLETO! 🎉🎉🎉');
                console.log('=======================================');
                console.log('✅ Versão 6.0 ativa');
                console.log('✅ Todos os endpoints enterprise funcionando');
                console.log('✅ Sistema pronto para produção');
                console.log('\n🚀 COINBITCLUB ENTERPRISE OPERACIONAL!');
                return true;
            } else {
                console.log(`⏳ Enterprise parcial: ${working}/${tests.length} endpoints`);
            }
        } else {
            console.log(`⏳ Aguardando... (ainda versão ${version})`);
        }
        
    } catch (e) {
        console.log('⚠️ Erro ao parsear health data');
    }
    
    return false;
}

async function monitor() {
    while (attempt < maxAttempts) {
        const complete = await checkStatus();
        
        if (complete) {
            break;
        }
        
        if (attempt >= maxAttempts) {
            console.log('\n⚠️ TIMEOUT: Deploy demorou mais que o esperado');
            console.log('💡 Possível problema no build ou configuração');
            break;
        }
        
        // Aguardar 30 segundos
        await new Promise(resolve => setTimeout(resolve, 30000));
    }
}

monitor().catch(console.error);
