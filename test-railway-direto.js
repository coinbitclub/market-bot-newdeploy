#!/usr/bin/env node

const https = require('https');
const fs = require('fs');

console.log('=== TESTE RAILWAY DIRETO ===');

async function testRailway() {
    try {
        const result = await new Promise((resolve) => {
            const req = https.request({
                hostname: 'coinbitclub-market-bot.up.railway.app',
                port: 443,
                path: '/health',
                method: 'GET',
                timeout: 5000
            }, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => resolve({ status: res.statusCode, data }));
            });
            req.on('error', (err) => resolve({ status: 0, error: err.message }));
            req.end();
        });

        console.log('Status:', result.status);
        console.log('Data:', result.data);
        
        // Salvar em arquivo também
        fs.writeFileSync('railway-test-result.txt', JSON.stringify(result, null, 2));
        
    } catch (error) {
        console.log('Erro:', error.message);
    }
}

testRailway();
