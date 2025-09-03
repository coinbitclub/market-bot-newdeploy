#!/usr/bin/env node

/**
 * 🚨 TESTE URGENTE RAILWAY
 * ========================
 * 
 * Verifica se Railway detectou o novo Dockerfile
 */

const axios = require('axios');

async function testeUrgente() {
    console.log('🚨 TESTE URGENTE - RAILWAY NOVO DOCKERFILE');
    console.log('=' .repeat(50));
    
    console.log('⏰ Aguardando Railway detectar mudanças...');
    console.log('🔄 O push foi feito agora mesmo, aguarde...');
    
    let tentativas = 0;
    const maxTentativas = 20; // 10 minutos
    
    const interval = setInterval(async () => {
        tentativas++;
        
        console.log(`\n🔍 Tentativa ${tentativas}/${maxTentativas} - ${new Date().toLocaleTimeString()}`);
        
        try {
            const response = await axios.get('https://coinbitclub-market-bot-production.up.railway.app/health', { 
                timeout: 10000,
                validateStatus: () => true
            });
            
            if (response.status === 200) {
                console.log('🎉 RAILWAY FUNCIONANDO!');
                console.log('✅ Novo Dockerfile funcionou!');
                console.log('🌐 Testando Ngrok...');
                
                try {
                    const ngrokResponse = await axios.get('https://coinbitclub-bot.ngrok.io/health', { 
                        timeout: 10000,
                        validateStatus: () => true
                    });
                    
                    if (ngrokResponse.status === 200) {
                        console.log('🎉🎉 SUCESSO TOTAL! 🎉🎉');
                        console.log('✅ Railway: Online');
                        console.log('✅ Ngrok: Conectado');
                        console.log('🎯 IP FIXO ATIVO: https://coinbitclub-bot.ngrok.io');
                        console.log('\n📋 CONFIGURE NAS EXCHANGES:');
                        console.log('   • Bybit: coinbitclub-bot.ngrok.io');
                        console.log('   • Binance: coinbitclub-bot.ngrok.io');
                        
                        clearInterval(interval);
                        process.exit(0);
                    } else {
                        console.log('✅ Railway OK, Ngrok conectando...');
                    }
                } catch (e) {
                    console.log('✅ Railway OK, aguardando Ngrok...');
                }
                
            } else if (response.status === 404) {
                console.log('⏳ Railway ainda com 404 - Build pode estar em progresso...');
            } else {
                console.log(`⏳ Railway Status: ${response.status} - Aguardando...`);
            }
            
        } catch (error) {
            if (error.code === 'ECONNREFUSED') {
                console.log('⏳ Railway não respondendo - Build em progresso...');
            } else {
                console.log(`⏳ ${error.message}`);
            }
        }
        
        if (tentativas >= maxTentativas) {
            console.log('\n⚠️ TIMEOUT - Verificar manualmente no Railway Dashboard');
            console.log('🔗 https://railway.app/dashboard');
            console.log('📋 Verificar logs de build');
            clearInterval(interval);
            process.exit(1);
        }
        
    }, 30000); // A cada 30 segundos
    
    console.log('⏳ Primeira verificação em 30 segundos...');
}

testeUrgente().catch(console.error);
