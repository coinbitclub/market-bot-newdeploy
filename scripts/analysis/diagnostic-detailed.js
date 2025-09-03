#!/usr/bin/env node

/**
 * 🔍 DIAGNÓSTICO AVANÇADO - DETECTAR PROBLEMA
 */

const https = require('https');

function detailedTest(path) {
    return new Promise((resolve) => {
        console.log(`\n🔍 TESTE DETALHADO: ${path}`);
        console.log('='.repeat(50));
        
        const req = https.request({
            hostname: 'coinbitclub-market-bot.up.railway.app',
            port: 443,
            path: path,
            method: 'GET'
        }, (res) => {
            console.log(`📊 Status Code: ${res.statusCode}`);
            console.log(`📋 Headers:`);
            Object.keys(res.headers).forEach(key => {
                if (['content-type', 'x-powered-by', 'server'].includes(key)) {
                    console.log(`   ${key}: ${res.headers[key]}`);
                }
            });
            
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                console.log(`📄 Response (primeiros 200 chars):`);
                console.log(`   ${data.slice(0, 200)}${data.length > 200 ? '...' : ''}`);
                
                if (res.statusCode === 200) {
                    try {
                        const parsed = JSON.parse(data);
                        console.log(`✅ JSON válido`);
                        if (parsed.mode) console.log(`🔧 Mode: ${parsed.mode}`);
                    } catch (e) {
                        console.log(`⚠️ Não é JSON válido`);
                    }
                } else {
                    console.log(`❌ Endpoint falhou`);
                }
                resolve();
            });
        });
        
        req.on('error', (err) => {
            console.log(`💥 ERRO DE CONEXÃO: ${err.message}`);
            resolve();
        });
        
        req.setTimeout(10000, () => {
            console.log(`⏰ TIMEOUT após 10 segundos`);
            req.destroy();
            resolve();
        });
        
        req.end();
    });
}

async function runDiagnostic() {
    console.log('🔍 DIAGNÓSTICO AVANÇADO - ANÁLISE DETALHADA');
    console.log('===========================================');
    
    await detailedTest('/health');
    await detailedTest('/status');
    await detailedTest('/api/dashboard/summary');
    await detailedTest('/api/system/status');
    
    console.log('\n🎯 ANÁLISE CONCLUÍDA!');
    console.log('Se /health funciona mas /status não, pode ser problema de rota duplicada.');
    console.log('Se todos falham, pode ser problema de deploy ou cache do Railway.');
}

runDiagnostic();
