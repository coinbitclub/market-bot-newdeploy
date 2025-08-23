#!/usr/bin/env node

/**
 * 🚀 TESTE COMPLEMENTAR - STATUS ATUAL
 */

const https = require('https');

function singleTest(path) {
    return new Promise((resolve) => {
        console.log(`🔍 Testando ${path}...`);
        
        const req = https.request({
            hostname: 'coinbitclub-market-bot.up.railway.app',
            port: 443,
            path: path,
            method: 'GET'
        }, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                console.log(`   Status: ${res.statusCode}`);
                if (res.statusCode === 200) {
                    console.log(`   ✅ SUCESSO!`);
                    try {
                        const parsed = JSON.parse(data);
                        if (parsed.mode) console.log(`   Mode: ${parsed.mode}`);
                        if (parsed.summary) console.log(`   Summary: ${JSON.stringify(parsed.summary).slice(0, 100)}`);
                    } catch (e) {}
                } else {
                    console.log(`   ❌ PROBLEMA`);
                }
                resolve();
            });
        });
        
        req.on('error', (err) => {
            console.log(`   💥 ERRO: ${err.message}`);
            resolve();
        });
        
        req.setTimeout(8000, () => {
            console.log(`   ⏰ TIMEOUT`);
            req.destroy();
            resolve();
        });
        
        req.end();
    });
}

async function testNow() {
    console.log('🧪 TESTE IMEDIATO - STATUS ATUAL\n');
    
    await singleTest('/status');
    console.log('');
    await singleTest('/api/dashboard/summary');
    
    console.log('\n🎯 Teste concluído!');
}

testNow();
