#!/usr/bin/env node
/**
 * 🌐 TESTE FINAL RAILWAY
 * ======================
 */

const https = require('https');

console.log('🌐 TESTE FINAL RAILWAY');
console.log('======================');

const BASE_URL = 'coinbitclub-market-bot.up.railway.app';

async function testRailway() {
    const endpoints = [
        '/health',
        '/api/system/status',
        '/'
    ];
    
    console.log('🧪 Testando endpoints básicos na Railway...\n');
    
    let working = 0;
    
    for (const path of endpoints) {
        await new Promise((resolve) => {
            const req = https.get(`https://${BASE_URL}${path}`, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    if (res.statusCode >= 200 && res.statusCode < 400) {
                        console.log(`✅ ${path} [${res.statusCode}] SUCCESS`);
                        working++;
                    } else {
                        console.log(`❌ ${path} [${res.statusCode}] FAILED`);
                    }
                    resolve();
                });
            });
            
            req.on('error', (err) => {
                console.log(`❌ ${path} ERROR: ${err.message}`);
                resolve();
            });
            
            req.setTimeout(10000, () => {
                req.destroy();
                console.log(`❌ ${path} TIMEOUT`);
                resolve();
            });
        });
        
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log('');
    console.log('📊 RESULTADO RAILWAY:');
    console.log(`✅ Funcionando: ${working}/${endpoints.length}`);
    console.log(`🌐 URL: https://${BASE_URL}`);
    
    if (working === endpoints.length) {
        console.log('🎉 Railway está operacional!');
    } else if (working > 0) {
        console.log('⚠️ Railway parcialmente operacional');
    } else {
        console.log('❌ Railway com problemas');
    }
}

testRailway().catch(console.error);
