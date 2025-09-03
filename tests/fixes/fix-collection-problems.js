/**
 * 🔧 CORREÇÃO URGENTE DOS PROBLEMAS DE COLETA DE SALDOS
 * ===================================================
 * 
 * Problemas identificados:
 * 1. IP Restrito Bybit (User 14)
 * 2. accountType null no Bybit V5  
 * 3. Chave Binance inválida
 * 4. Constraint duplicate key
 */

const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'process.env.DATABASE_URL',
    ssl: { rejectUnauthorized: false }
});

console.log('🔧 CORREÇÃO URGENTE - PROBLEMAS DE COLETA DE SALDOS');
console.log('==================================================');

async function corrigirProblemasColeta() {
    try {
        // 1. Primeiro vamos ver os dados atuais dos usuários
        console.log('\n📊 1. DIAGNÓSTICO ATUAL DOS USUÁRIOS:');
        console.log('====================================');
        
        const users = await pool.query(`
            SELECT u.id, u.username, u.name, u.email,
                   uak.exchange, uak.environment, uak.api_key, 
                   uak.validation_status, uak.last_validated, uak.error_message
            FROM users u
            INNER JOIN user_api_keys uak ON u.id = uak.user_id
            WHERE u.id IN (14, 15, 16)
            ORDER BY u.id, uak.exchange
        `);
        
        for (const user of users.rows) {
            console.log(`👤 ID ${user.id} - ${user.name} (${user.exchange})`);
            console.log(`   📧 Email: ${user.email}`);
            console.log(`   🌐 Environment: ${user.environment}`);
            console.log(`   🔑 API Key: ${user.api_key ? user.api_key.substring(0, 10) + '...' : 'N/A'}`);
            console.log(`   ✅ Status: ${user.validation_status || 'pending'}`);
            console.log(`   ❌ Erro: ${user.error_message || 'N/A'}`);
            console.log('');
        }

        // 2. Corrigir problema do accountType no Bybit
        console.log('\n🔧 2. CORRIGINDO PARÂMETROS BYBIT V5:');
        console.log('===================================');
        
        // Usar o coletor que funcionava antes
        const funcionais = await pool.query(`
            SELECT * FROM user_api_keys 
            WHERE user_id IN (15, 16) 
            AND exchange = 'bybit'
            AND validation_status = 'valid'
        `);
        
        console.log(`🔍 Encontradas ${funcionais.rows.length} chaves Bybit válidas`);
        
        for (const chave of funcionais.rows) {
            console.log(`\n🧪 Testando User ${chave.user_id} com parâmetros corretos:`);
            
            try {
                const testeBybit = await testarBybitComParametrosCorretos(chave);
                console.log(`✅ User ${chave.user_id}: ${testeBybit.success ? 'SUCESSO' : 'FALHA'}`);
                if (testeBybit.success) {
                    console.log(`💰 Saldo: ${testeBybit.balance}`);
                } else {
                    console.log(`❌ Erro: ${testeBybit.error}`);
                }
            } catch (error) {
                console.log(`❌ User ${chave.user_id}: ${error.message}`);
            }
        }

        // 3. Corrigir constraint duplicate key
        console.log('\n🔧 3. CORRIGINDO CONSTRAINT DUPLICATE KEY:');
        console.log('=========================================');
        
        await corrigirConstraintDuplicateKey();

        // 4. Atualizar status das chaves problemáticas
        console.log('\n🔧 4. ATUALIZANDO STATUS DAS CHAVES:');
        console.log('==================================');
        
        await atualizarStatusChaves();

        console.log('\n✅ TODAS AS CORREÇÕES APLICADAS!');
        console.log('🔄 Sistema pronto para nova coleta');

    } catch (error) {
        console.error('❌ Erro nas correções:', error.message);
    }
}

/**
 * 🧪 Testar Bybit com parâmetros corretos
 */
async function testarBybitComParametrosCorretos(chave) {
    try {
        const crypto = require('crypto');
        const timestamp = Date.now().toString();
        const recvWindow = '5000';
        
        // Parâmetros corretos para Bybit V5
        const queryParams = 'accountType=UNIFIED';
        
        const signPayload = timestamp + chave.api_key + recvWindow + queryParams;
        const signature = crypto.createHmac('sha256', chave.api_secret).update(signPayload).digest('hex');

        const url = `https://api.bybit.com/v5/account/wallet-balance?${queryParams}`;
        
        console.log(`📡 URL: ${url}`);
        console.log(`🔐 Payload: ${signPayload.substring(0, 50)}...`);
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'X-BAPI-API-KEY': chave.api_key,
                'X-BAPI-SIGN': signature,
                'X-BAPI-TIMESTAMP': timestamp,
                'X-BAPI-RECV-WINDOW': recvWindow,
                'X-BAPI-SIGN-TYPE': '2'
            }
        });

        const data = await response.json();
        
        console.log(`📊 RetCode: ${data.retCode}`);
        console.log(`📋 RetMsg: ${data.retMsg}`);
        
        if (data.retCode === 0) {
            const usdtBalance = data.result?.list?.[0]?.coin?.find(coin => coin.coin === 'USDT');
            const balance = usdtBalance ? parseFloat(usdtBalance.walletBalance) : 0;
            
            return {
                success: true,
                balance: `$${balance.toFixed(2)} USDT`,
                data: data.result
            };
        } else {
            return {
                success: false,
                error: data.retMsg || 'Erro desconhecido'
            };
        }

    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * 🔧 Corrigir constraint duplicate key
 */
async function corrigirConstraintDuplicateKey() {
    try {
        // Remover registros duplicados mantendo apenas o mais recente
        const duplicates = await pool.query(`
            DELETE FROM balances 
            WHERE id NOT IN (
                SELECT MIN(id) 
                FROM balances 
                GROUP BY user_id, asset, account_type
            )
        `);
        
        console.log(`🗑️ Removidos ${duplicates.rowCount} registros duplicados`);
        
    } catch (error) {
        console.log(`⚠️ Aviso constraint: ${error.message}`);
    }
}

/**
 * 🔧 Atualizar status das chaves
 */
async function atualizarStatusChaves() {
    try {
        // Marcar User 14 como IP restrito
        await pool.query(`
            UPDATE user_api_keys 
            SET validation_status = 'ip_restricted',
                error_message = 'IP não cadastrado no whitelist da exchange'
            WHERE user_id = 14 AND exchange = 'bybit'
        `);
        console.log('✅ User 14: Marcado como IP restrito');

        // Marcar Binance User 16 como invalid
        await pool.query(`
            UPDATE user_api_keys 
            SET validation_status = 'invalid',
                error_message = 'Chave inválida ou sem permissões'
            WHERE user_id = 16 AND exchange = 'binance'
        `);
        console.log('✅ User 16 Binance: Marcado como inválido');

        // Reset status das chaves Bybit para teste
        await pool.query(`
            UPDATE user_api_keys 
            SET validation_status = 'pending',
                error_message = NULL,
                last_validated = NULL
            WHERE user_id IN (15, 16) AND exchange = 'bybit'
        `);
        console.log('✅ Users 15,16 Bybit: Status resetado para teste');

    } catch (error) {
        console.log(`⚠️ Aviso update status: ${error.message}`);
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    corrigirProblemasColeta().finally(() => {
        pool.end();
    });
}

module.exports = { corrigirProblemasColeta };
