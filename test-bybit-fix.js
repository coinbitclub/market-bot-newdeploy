#!/usr/bin/env node

require('dotenv').config({ path: '.env.production' });
const UserExchangeManager = require('./user-exchange-manager');
const ccxt = require('ccxt');

async function testBybitExecution() {
    console.log('🧪 TESTE ESPECÍFICO BYBIT - USUÁRIO 24\n');
    
    const userManager = new UserExchangeManager();
    
    try {
        // 1. Buscar chaves do usuário 24
        console.log('1️⃣ Buscando chaves do usuário 24...');
        const keys = await userManager.getUserApiKeys(24, 'bybit');
        
        if (!keys) {
            console.log('❌ Chaves não encontradas');
            return;
        }
        
        console.log('✅ Chaves encontradas');
        console.log('   Testnet:', keys.testnetMode);
        console.log('   Auto Trading:', keys.autoTradingEnabled);
        
        // 2. Configurar Bybit
        console.log('\n2️⃣ Configurando exchange Bybit...');
        const bybit = new ccxt.bybit({
            apiKey: keys.apiKey,
            secret: keys.apiSecret,
            sandbox: keys.testnetMode,
            enableRateLimit: true,
            options: {
                defaultType: 'linear'
            }
        });
        
        console.log('✅ Bybit configurado');
        
        // 3. Testar conexão
        console.log('\n3️⃣ Testando conexão...');
        const balance = await bybit.fetchBalance();
        console.log('✅ Conexão OK');
        console.log('💰 Saldo USDT:', balance.USDT?.free || 0);
        
        // 4. Testar ordem simples
        console.log('\n4️⃣ Testando ordem de mercado...');
        
        // Buscar ticker para ter preço atual
        const ticker = await bybit.fetchTicker('BTC/USDT:USDT');
        console.log('📊 Preço atual BTC:', ticker.last);
        
        const orderParams = {
            symbol: 'BTC/USDT:USDT', // Formato correto para Bybit
            type: 'market',
            side: 'buy',
            amount: 0.003,
            price: undefined, // Não enviar preço para market order
            params: {
                type: 'market' // Garantir que é market order
            }
        };
        
        console.log('📤 Parâmetros da ordem:', orderParams);
        
        const order = await bybit.createOrder(
            orderParams.symbol,
            orderParams.type,
            orderParams.side,
            orderParams.amount,
            orderParams.price,
            orderParams.params
        );
        
        console.log('✅ ORDEM EXECUTADA NA BYBIT!');
        console.log('🎯 Resultado:', {
            id: order.id,
            symbol: order.symbol,
            side: order.side,
            amount: order.amount,
            price: order.price,
            status: order.status
        });
        
        // 5. Salvar no banco
        await userManager.saveUserTradingExecution(24, null, 'bybit', {
            orderId: order.id,
            symbol: order.symbol,
            side: order.side,
            amount: order.amount,
            price: order.price,
            status: order.status,
            testnetMode: keys.testnetMode,
            rawResponse: order
        });
        
        console.log('✅ Execução salva no banco');
        
    } catch (error) {
        console.error('❌ ERRO DETALHADO:', error.message);
        console.error('📋 Stack:', error.stack);
        
        if (error.response) {
            console.error('📡 Response:', error.response);
        }
    }
    
    process.exit(0);
}

testBybitExecution();
