#!/usr/bin/env node

/**
 * 🧪 SETUP DE USUÁRIOS PARA TESTE MULTI-USUÁRIO
 * =============================================
 */

require('dotenv').config({ path: '.env.production' });
const UserExchangeManager = require('./user-exchange-manager');

async function setupTestUsers() {
    console.log('🧪 CONFIGURANDO USUÁRIOS PARA TESTE MULTI-USUÁRIO\n');
    
    const userManager = new UserExchangeManager();
    
    try {
        // Configurar usuário 23 com chaves Binance
        console.log('👤 Configurando Usuário 23 - Binance');
        await userManager.saveUserApiKeys(
            23, // userId
            'binance',
            'process.env.API_KEY_HERE', // testnet key
            'process.env.API_KEY_HERE', // testnet secret
            true // testnet mode
        );
        
        // Ativar auto trading para usuário 23
        await userManager.enableAutoTrading(23, true);
        
        // Configurar usuário 24 com chaves Bybit
        console.log('👤 Configurando Usuário 24 - Bybit');
        await userManager.saveUserApiKeys(
            24, // userId
            'bybit',
            'lFHeinWdrGvCSPABD4', // testnet key
            'process.env.API_KEY_HERE', // testnet secret
            true // testnet mode
        );
        
        // Ativar auto trading para usuário 24
        await userManager.enableAutoTrading(24, true);
        
        // Buscar usuários configurados
        console.log('\n📊 USUÁRIOS CONFIGURADOS:');
        const activeUsers = await userManager.getAllUsersWithApiKeys();
        
        activeUsers.forEach(user => {
            console.log(`  • ${user.username} (ID: ${user.id})`);
            console.log(`    - Binance: ${user.has_binance ? '✅' : '❌'}`);
            console.log(`    - Bybit: ${user.has_bybit ? '✅' : '❌'}`);
            console.log(`    - Auto Trading: ${user.exchange_auto_trading ? '✅' : '❌'}`);
            console.log(`    - Testnet: ${user.exchange_testnet_mode ? '✅' : '❌'}`);
        });
        
        // Validar chaves
        console.log('\n🔍 VALIDANDO CHAVES...');
        for (const user of activeUsers) {
            if (user.has_binance) {
                const binanceValidation = await userManager.validateUserApiKeys(user.id, 'binance');
                console.log(`  Binance (${user.username}): ${binanceValidation.valid ? '✅ Válido' : '❌ Inválido'}`);
                if (binanceValidation.balance) {
                    console.log(`    Saldo: $${binanceValidation.balance.USDT?.free || 0} USDT`);
                }
            }
            
            if (user.has_bybit) {
                const bybitValidation = await userManager.validateUserApiKeys(user.id, 'bybit');
                console.log(`  Bybit (${user.username}): ${bybitValidation.valid ? '✅ Válido' : '❌ Inválido'}`);
                if (bybitValidation.balance) {
                    console.log(`    Saldo: $${bybitValidation.balance.USDT?.free || 0} USDT`);
                }
            }
        }
        
        console.log('\n🎯 SETUP CONCLUÍDO!');
        console.log('✅ Sistema pronto para operações multi-usuário');
        console.log(`📡 Total de usuários ativos: ${activeUsers.length}`);
        
    } catch (error) {
        console.error('❌ Erro no setup:', error.message);
    }
    
    process.exit(0);
}

setupTestUsers();
