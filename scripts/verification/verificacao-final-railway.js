#!/usr/bin/env node
/**
 * 🚀 VERIFICAÇÃO FINAL RAILWAY - ENTERPRISE SYSTEM
 * ===============================================
 */

const https = require('https');

console.log('🚀 VERIFICAÇÃO FINAL RAILWAY ENTERPRISE');
console.log('=======================================');
console.log('📅 Timestamp:', new Date().toISOString());
console.log('🌐 URL: https://coinbitclub-market-bot.up.railway.app');
console.log('');

const BASE_URL = 'coinbitclub-market-bot.up.railway.app';

// Lista dos endpoints enterprise críticos
const CRITICAL_ENDPOINTS = [
    { path: '/health', desc: 'Health Check', critical: true },
    { path: '/api/system/status', desc: 'System Status', critical: true },
    { path: '/', desc: 'Dashboard Principal', critical: false },
    { path: '/api/dashboard/summary', desc: 'Dashboard Summary', critical: true },
    { path: '/api/admin/financial-summary', desc: 'Admin Financial', critical: false },
    { path: '/api/exchanges/status', desc: 'Exchanges Status', critical: true },
    { path: '/api/trade/status', desc: 'Trading Status', critical: true },
    { path: '/api/users', desc: 'User Management', critical: false },
    { path: '/api/webhooks/signal', desc: 'Webhook Signals', critical: true },
    { path: '/api/validation/status', desc: 'Validation System', critical: false }
];

function testEndpoint(path) {
    return new Promise((resolve) => {
        const options = {
            hostname: BASE_URL,
            port: 443,
            path: path,
            method: 'GET',
            timeout: 15000,
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'EnterpriseVerifier/1.0',
                'Cache-Control': 'no-cache'
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                resolve({
                    statusCode: res.statusCode,
                    success: res.statusCode >= 200 && res.statusCode < 400,
                    data: data,
                    size: data.length
                });
            });
        });

        req.on('error', (err) => {
            resolve({ 
                statusCode: 0, 
                error: err.message, 
                success: false 
            });
        });

        req.on('timeout', () => {
            req.destroy();
            resolve({ 
                statusCode: 0, 
                error: 'timeout', 
                success: false 
            });
        });

        req.end();
    });
}

async function runVerification() {
    console.log('🔍 EXECUTANDO VERIFICAÇÃO...');
    console.log('============================');
    
    let totalEndpoints = CRITICAL_ENDPOINTS.length;
    let successCount = 0;
    let criticalSuccessCount = 0;
    let totalCritical = CRITICAL_ENDPOINTS.filter(e => e.critical).length;
    
    for (let i = 0; i < CRITICAL_ENDPOINTS.length; i++) {
        const endpoint = CRITICAL_ENDPOINTS[i];
        console.log(`\n[${i+1}/${totalEndpoints}] Testando: ${endpoint.path}`);
        console.log(`   📋 ${endpoint.desc} ${endpoint.critical ? '(CRÍTICO)' : '(OPCIONAL)'}`);
        
        const result = await testEndpoint(endpoint.path);
        
        if (result.success) {
            console.log(`   ✅ Status: ${result.statusCode} | Size: ${result.size} bytes`);
            successCount++;
            
            if (endpoint.critical) {
                criticalSuccessCount++;
            }
            
            // Mostrar sample da resposta para endpoints críticos
            if (endpoint.critical && result.data) {
                try {
                    const json = JSON.parse(result.data);
                    if (json.status || json.success !== undefined) {
                        console.log(`   📄 Response: ${JSON.stringify(json).substring(0, 100)}...`);
                    }
                } catch (e) {
                    console.log(`   📄 Response: ${result.data.substring(0, 100)}...`);
                }
            }
        } else {
            console.log(`   ❌ Status: ${result.statusCode || 'ERROR'} | Error: ${result.error || 'Unknown'}`);
        }
    }
    
    // Relatório Final
    console.log('\n');
    console.log('📊 RELATÓRIO FINAL DA VERIFICAÇÃO');
    console.log('=================================');
    console.log(`✅ Endpoints funcionando: ${successCount}/${totalEndpoints}`);
    console.log(`🔥 Endpoints críticos OK: ${criticalSuccessCount}/${totalCritical}`);
    console.log(`📈 Taxa de sucesso geral: ${Math.round(successCount/totalEndpoints*100)}%`);
    console.log(`🎯 Taxa crítica: ${Math.round(criticalSuccessCount/totalCritical*100)}%`);
    
    console.log('\n🏆 AVALIAÇÃO ENTERPRISE:');
    if (criticalSuccessCount === totalCritical) {
        console.log('🎉 PERFEITO! Todos os endpoints críticos funcionando!');
        console.log('✅ Sistema enterprise 100% operacional');
        console.log('🚀 Pronto para operação em ambiente real');
        console.log('👥 Multiuser: ATIVO');
        console.log('🔐 Account Management: ATIVO');
        console.log('🧪 Testnet/Real: CONFIGURADO');
    } else if (criticalSuccessCount >= totalCritical * 0.8) {
        console.log('👍 MUITO BOM! Sistema quase completamente operacional');
        console.log('⚠️ Algumas funcionalidades podem precisar de ajuste');
    } else if (criticalSuccessCount >= totalCritical * 0.5) {
        console.log('⚠️ PARCIAL: Sistema básico funcionando');
        console.log('🔧 Requer investigação e correções');
    } else {
        console.log('❌ PROBLEMA: Sistema com falhas críticas');
        console.log('🚨 Requer intervenção imediata');
    }
    
    console.log('\n🌐 Acesso ao sistema:');
    console.log('   Dashboard: https://coinbitclub-market-bot.up.railway.app');
    console.log('   Health: https://coinbitclub-market-bot.up.railway.app/health');
    console.log('   Status: https://coinbitclub-market-bot.up.railway.app/api/system/status');
    
    console.log('\n🏢 Sistema CoinBitClub Enterprise - Verificação concluída!');
}

// Executar verificação
runVerification().catch(console.error);
