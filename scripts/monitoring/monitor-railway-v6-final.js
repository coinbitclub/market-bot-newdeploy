#!/usr/bin/env node
/**
 * 🚀 MONITOR FINAL RAILWAY V6.0
 * =============================
 */

const https = require('https');

console.log('🚀 MONITOR RAILWAY V6.0 - ENTERPRISE REAL MODE');
console.log('==============================================');

async function makeRequest(path) {
    return new Promise((resolve) => {
        const req = https.request({
            hostname: 'coinbitclub-market-bot.up.railway.app',
            port: 443,
            path: path,
            method: 'GET',
            timeout: 8000,
            headers: { 'Accept': 'application/json' }
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve({ status: res.statusCode, data }));
        });
        req.on('error', () => resolve({ status: 0, error: 'connection_error' }));
        req.on('timeout', () => { req.destroy(); resolve({ status: 0, error: 'timeout' }); });
        req.end();
    });
}

async function checkRailway() {
    console.log(`⏰ ${new Date().toLocaleTimeString()} - Verificando Railway...`);
    
    // 1. Verificar versão e health
    const health = await makeRequest('/health');
    if (health.status === 200) {
        try {
            const info = JSON.parse(health.data);
            console.log(`📊 Status: ONLINE | Version: ${info.version || 'unknown'} | Mode: ${info.mode || 'unknown'}`);
        } catch (e) {
            console.log('📊 Status: ONLINE (parsing error)');
        }
    } else {
        console.log(`❌ Health check failed: ${health.status}`);
        return false;
    }
    
    // 2. Verificar sistema
    const system = await makeRequest('/api/system/status');
    if (system.status === 200) {
        try {
            const sysInfo = JSON.parse(system.data);
            const mode = sysInfo.trading?.mode || 'unknown';
            const realTrading = sysInfo.trading?.real_trading;
            
            const modeIcon = mode === 'real' ? '🔥' : '🧪';
            console.log(`${modeIcon} Trading Mode: ${mode.toUpperCase()} | Real Trading: ${realTrading}`);
            
            if (mode === 'real' && realTrading === true) {
                console.log('🎉 REAL MODE CONFIRMED!');
            } else {
                console.log('⏳ Still in testnet mode...');
            }
        } catch (e) {
            console.log('⚠️ System status parse error');
        }
    }
    
    // 3. Testar endpoints enterprise
    const enterpriseTests = [
        '/api/dashboard/summary',
        '/api/webhooks/signal',
        '/api/current-mode',
        '/ativar-chaves-reais'
    ];
    
    console.log('\n🧪 Testing enterprise endpoints:');
    let enterpriseActive = 0;
    
    for (const endpoint of enterpriseTests) {
        const result = await makeRequest(endpoint);
        const icon = result.status === 200 ? '✅' : result.status === 404 ? '❌' : '⚠️';
        console.log(`${icon} ${endpoint} [${result.status}]`);
        
        if (result.status === 200) {
            enterpriseActive++;
            
            // Check specific endpoints for real mode
            if (endpoint === '/api/current-mode' || endpoint === '/ativar-chaves-reais') {
                try {
                    const data = JSON.parse(result.data);
                    if (data.mode === 'real' || data.activated === true) {
                        console.log(`   🔥 REAL MODE DETECTED in ${endpoint}`);
                    }
                } catch (e) {}
            }
        }
    }
    
    console.log(`\n📈 Enterprise endpoints active: ${enterpriseActive}/${enterpriseTests.length}`);
    
    // 4. Conclusão
    if (enterpriseActive === enterpriseTests.length) {
        const currentMode = await makeRequest('/api/current-mode');
        if (currentMode.status === 200) {
            try {
                const modeData = JSON.parse(currentMode.data);
                if (modeData.mode === 'real') {
                    console.log('\n🎉🔥 DEPLOY V6.0 COMPLETO!');
                    console.log('✅ Todos endpoints enterprise ATIVOS');
                    console.log('🔥 REAL MODE CONFIRMADO');
                    console.log('🚀 Sistema pronto para produção!');
                    return true;
                }
            } catch (e) {}
        }
        
        console.log('\n👍 Enterprise endpoints active, aguardando real mode...');
    } else {
        console.log('\n⏳ Aguardando enterprise deploy...');
    }
    
    return false;
}

async function monitor() {
    console.log('🔄 Iniciando monitoramento v6.0...\n');
    
    let attempts = 0;
    const maxAttempts = 15; // 7.5 minutos
    
    while (attempts < maxAttempts) {
        const completed = await checkRailway();
        
        if (completed) {
            console.log('\n🏁 MONITORAMENTO CONCLUÍDO - SISTEMA V6.0 ATIVO!');
            break;
        }
        
        attempts++;
        console.log(`\n⏱️  Tentativa ${attempts}/${maxAttempts} - Aguardando 30s...\n`);
        
        if (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 30000));
        }
    }
    
    if (attempts >= maxAttempts) {
        console.log('\n⚠️ Timeout: Deploy pode precisar de mais tempo');
        console.log('💡 Sugestão: Verificar logs da Railway ou restart manual');
    }
}

monitor().catch(console.error);
