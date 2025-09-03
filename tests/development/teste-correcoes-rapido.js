#!/usr/bin/env node
/**
 * 🔥 TESTE RÁPIDO CORREÇÕES ENTERPRISE
 * ====================================
 */

const http = require('http');

console.log('🔥 TESTE RÁPIDO - CORREÇÕES ENTERPRISE');
console.log('=====================================');

const endpoints = [
    '/health',
    '/api/system/status',
    '/api/current-mode',
    '/ativar-chaves-reais',
    '/api/trade/status'
];

async function makeRequest(path) {
    return new Promise((resolve) => {
        const req = http.request({
            hostname: 'localhost',
            port: 3000,
            path: path,
            method: 'GET',
            timeout: 3000
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

async function testCorrections() {
    console.log('🧪 Testando correções...\n');
    
    for (const endpoint of endpoints) {
        console.log(`🔍 ${endpoint}`);
        const result = await makeRequest(endpoint);
        
        if (result.status === 200) {
            try {
                const parsed = JSON.parse(result.data);
                
                // Verificar modo trading
                if (parsed.trading?.mode) {
                    const mode = parsed.trading.mode;
                    const icon = mode === 'real' ? '🔥' : '🧪';
                    console.log(`   ${icon} Trading Mode: ${mode.toUpperCase()}`);
                }
                
                if (parsed.mode) {
                    const mode = parsed.mode;
                    const icon = mode === 'real' ? '🔥' : '🧪';
                    console.log(`   ${icon} Mode: ${mode.toUpperCase()}`);
                }
                
                if (parsed.activated !== undefined) {
                    const icon = parsed.activated ? '✅' : '❌';
                    console.log(`   ${icon} Real Keys: ${parsed.activated ? 'ACTIVATED' : 'INACTIVE'}`);
                }
                
                if (parsed.message) {
                    console.log(`   💬 Message: ${parsed.message}`);
                }
                
                console.log(`   ✅ Status: ${result.status}`);
                
            } catch (e) {
                console.log(`   ✅ Status: ${result.status} (HTML response)`);
            }
        } else {
            console.log(`   ❌ Status: ${result.status}`);
        }
        console.log('');
    }
    
    console.log('🎯 VERIFICAÇÃO DE CORREÇÕES COMPLETA!');
}

// Aguardar servidor estar pronto
setTimeout(testCorrections, 3000);
