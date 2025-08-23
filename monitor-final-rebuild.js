#!/usr/bin/env node

/**
 * 🚨 MONITOR FINAL - FORCE REBUILD
 * ===============================
 * 
 * Última tentativa com Dockerfile completamente novo
 */

const axios = require('axios');

async function monitorFinalRebuild() {
    console.log('🚨 MONITOR FINAL - FORCE REBUILD DEPLOYED');
    console.log('=' .repeat(50));
    console.log('💥 Mudanças RADICAIS aplicadas:');
    console.log('   • Dockerfile COMPLETAMENTE novo (node:18-slim)');
    console.log('   • package-lock.json REMOVIDO do git');
    console.log('   • Cache bust com timestamp');
    console.log('   • npm install sem lock file');
    console.log('');
    console.log('🎯 Railway DEVE usar npm install agora!');
    console.log('⏰ Aguardando build com força total...');
    
    let tentativas = 0;
    const maxTentativas = 30; // 15 minutos
    let ultimoStatus = null;
    let buildIniciado = false;
    
    const interval = setInterval(async () => {
        tentativas++;
        
        console.log(`\n🔍 Tentativa ${tentativas}/${maxTentativas} - ${new Date().toLocaleTimeString()}`);
        
        try {
            const response = await axios.get('https://coinbitclub-market-bot-production.up.railway.app/health', { 
                timeout: 20000,
                validateStatus: () => true
            });
            
            if (response.status !== ultimoStatus) {
                ultimoStatus = response.status;
                console.log(`📊 MUDANÇA DE STATUS: ${response.status}`);
                
                if (response.status === 502 || response.status === 503) {
                    buildIniciado = true;
                    console.log('🔄 BUILD DETECTADO! Railway está reconstruindo...');
                }
            }
            
            if (response.status === 200) {
                console.log('\n🎉🎉🎉 SUCESSO TOTAL! 🎉🎉🎉');
                console.log('✅ Force rebuild funcionou!');
                console.log('✅ npm install resolvido!');
                console.log('✅ Railway: ONLINE');
                
                // Verificar dados da resposta
                try {
                    console.log('📊 Resposta:', response.data);
                } catch (e) {
                    console.log('📊 Railway respondendo (dados não JSON)');
                }
                
                // Testar Ngrok imediatamente
                console.log('\n🌐 Verificando Ngrok tunnel...');
                try {
                    const ngrokResponse = await axios.get('https://coinbitclub-bot.ngrok.io/health', { 
                        timeout: 20000,
                        validateStatus: () => true
                    });
                    
                    if (ngrokResponse.status === 200) {
                        console.log('🎯🎯🎯 DEPLOY 100% COMPLETO! 🎯🎯🎯');
                        console.log('✅ Railway: FUNCIONANDO');
                        console.log('✅ Ngrok: CONECTADO');
                        console.log('✅ IP Fixo: https://coinbitclub-bot.ngrok.io');
                        
                        console.log('\n🚀 SISTEMA PRONTO PARA USO!');
                        console.log('📋 Configure nas exchanges:');
                        console.log('   • Bybit whitelist: coinbitclub-bot.ngrok.io');
                        console.log('   • Binance whitelist: coinbitclub-bot.ngrok.io');
                        
                    } else {
                        console.log(`✅ Railway OK | ⏳ Ngrok status: ${ngrokResponse.status}`);
                    }
                } catch (e) {
                    console.log('✅ Railway OK | ⏳ Ngrok inicializando...');
                }
                
                clearInterval(interval);
                process.exit(0);
                
            } else if (response.status === 404) {
                if (buildIniciado) {
                    console.log('🔄 Build em progresso - Railway reconstruindo...');
                } else {
                    console.log('⏳ Aguardando Railway detectar mudanças...');
                }
            } else if (response.status === 502 || response.status === 503) {
                buildIniciado = true;
                console.log('🔄 Servidor reiniciando - Build ativo!');
            } else if (response.status === 500) {
                console.log('⚠️ Erro 500 - Aplicação pode estar inicializando...');
            } else {
                console.log(`📊 Status ${response.status} - Monitorando...`);
            }
            
        } catch (error) {
            if (error.code === 'ECONNREFUSED') {
                console.log('⏳ Conexão recusada - Build em andamento...');
                buildIniciado = true;
            } else if (error.code === 'ENOTFOUND') {
                console.log('⏳ DNS não resolvido - Railway processando...');
            } else if (error.code === 'ETIMEDOUT') {
                console.log('⏳ Timeout - Build ainda em progresso...');
                buildIniciado = true;
            } else {
                console.log(`⏳ ${error.message}`);
            }
        }
        
        // Status de progresso
        if (buildIniciado) {
            console.log('💪 Build detectado - aguardando conclusão...');
        }
        
        if (tentativas >= maxTentativas) {
            console.log('\n⚠️ TIMEOUT FINAL ATINGIDO');
            if (buildIniciado) {
                console.log('✅ Build foi detectado, mas ainda não concluiu');
                console.log('📊 Último status: ' + (ultimoStatus || 'Sem resposta'));
                console.log('⏰ Aguarde mais alguns minutos manualmente');
            } else {
                console.log('❌ Build não foi detectado');
                console.log('🔗 Verificar Railway Dashboard manually');
            }
            console.log('🔗 https://railway.app/dashboard');
            clearInterval(interval);
            process.exit(1);
        }
        
    }, 30000); // A cada 30 segundos
    
    console.log('⏳ Primeira verificação em 30 segundos...\n');
}

monitorFinalRebuild().catch(console.error);
