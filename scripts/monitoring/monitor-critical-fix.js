#!/usr/bin/env node

/**
 * 🔥 MONITOR CRITICAL FIX
 * =======================
 * 
 * Acompanha o build após regenerar package-lock.json
 */

const axios = require('axios');

async function monitorCriticalFix() {
    console.log('🔥 MONITOR CRITICAL FIX - PACKAGE-LOCK.JSON REGENERADO');
    console.log('=' .repeat(60));
    console.log('📦 package-lock.json foi regenerado do ZERO');
    console.log('🚀 Push realizado para clean-deploy branch');
    console.log('⏰ Aguardando Railway detectar a correção...');
    
    let tentativas = 0;
    const maxTentativas = 25; // 12.5 minutos
    let ultimoStatus = null;
    
    const interval = setInterval(async () => {
        tentativas++;
        
        console.log(`\n🔍 Tentativa ${tentativas}/${maxTentativas} - ${new Date().toLocaleTimeString()}`);
        
        try {
            const response = await axios.get('https://coinbitclub-market-bot-production.up.railway.app/health', { 
                timeout: 15000,
                validateStatus: () => true
            });
            
            if (response.status !== ultimoStatus) {
                ultimoStatus = response.status;
                console.log(`📊 Mudança de status: ${response.status}`);
            }
            
            if (response.status === 200) {
                console.log('\n🎉🎉🎉 SUCESSO! RAILWAY ONLINE! 🎉🎉🎉');
                console.log('✅ package-lock.json fix funcionou!');
                console.log('✅ npm ci resolvido!');
                console.log('🔗 Railway: https://coinbitclub-market-bot-production.up.railway.app');
                
                // Testar Ngrok
                console.log('\n🌐 Testando Ngrok tunnel...');
                try {
                    const ngrokResponse = await axios.get('https://coinbitclub-bot.ngrok.io/health', { 
                        timeout: 15000,
                        validateStatus: () => true
                    });
                    
                    if (ngrokResponse.status === 200) {
                        console.log('🎯🎯🎯 DEPLOY COMPLETO! 🎯🎯🎯');
                        console.log('✅ Railway: ONLINE');
                        console.log('✅ Ngrok: CONECTADO');
                        console.log('✅ IP Fixo: coinbitclub-bot.ngrok.io');
                        
                        console.log('\n📋 PRÓXIMOS PASSOS:');
                        console.log('   1. Configurar whitelist nas exchanges:');
                        console.log('      • Bybit: coinbitclub-bot.ngrok.io');
                        console.log('      • Binance: coinbitclub-bot.ngrok.io');
                        console.log('   2. Testar execução de trades');
                        console.log('   3. Verificar logs de funcionamento');
                        
                    } else {
                        console.log(`✅ Railway OK | ⏳ Ngrok conectando... (${ngrokResponse.status})`);
                    }
                } catch (e) {
                    console.log('✅ Railway OK | ⏳ Ngrok ainda inicializando...');
                }
                
                clearInterval(interval);
                process.exit(0);
                
            } else if (response.status === 404) {
                console.log('⏳ Build em progresso - Railway ainda processando...');
            } else if (response.status === 500) {
                console.log('⚠️ Erro 500 - Aplicação pode estar iniciando...');
            } else {
                console.log(`📊 Status ${response.status} - Aguardando estabilização...`);
            }
            
        } catch (error) {
            if (error.code === 'ECONNREFUSED') {
                console.log('⏳ Conexão recusada - Build ainda em progresso...');
            } else if (error.code === 'ENOTFOUND') {
                console.log('⏳ DNS não resolvido - Railway ainda processando...');
            } else {
                console.log(`⏳ ${error.message}`);
            }
        }
        
        if (tentativas >= maxTentativas) {
            console.log('\n⚠️ TIMEOUT - Verificação manual necessária');
            console.log('🔗 Railway Dashboard: https://railway.app/dashboard');
            console.log('📋 Verificar logs de build detalhados');
            console.log('📊 Status final: ' + (ultimoStatus || 'Sem resposta'));
            clearInterval(interval);
            process.exit(1);
        }
        
    }, 30000); // A cada 30 segundos
    
    console.log('⏳ Primeira verificação em 30 segundos...\n');
}

monitorCriticalFix().catch(console.error);
