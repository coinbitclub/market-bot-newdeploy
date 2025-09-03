#!/usr/bin/env node

const { Pool } = require('pg');
const EnterpriseExchangeConnector = require('./enterprise-exchange-connector');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'process.env.DATABASE_URL',
    ssl: { rejectUnauthorized: false }
});

async function testeSimples() {
    console.log('🧪 TESTE SIMPLES DE CONEXÃO COM USUÁRIOS');
    console.log('========================================');

    try {
        // Buscar apenas uma chave para teste
        const resultado = await pool.query(`
            SELECT 
                uak.id,
                u.username,
                uak.exchange,
                uak.environment,
                uak.api_key_encrypted,
                uak.secret_key_encrypted
            FROM user_api_keys uak
            JOIN users u ON uak.user_id = u.id
            WHERE u.is_active = true
            AND uak.is_active = true
            LIMIT 1
        `);

        if (resultado.rows.length === 0) {
            console.log('❌ Nenhuma chave encontrada');
            return;
        }

        const chave = resultado.rows[0];
        console.log(`✅ Testando chave do usuário: ${chave.username}`);
        console.log(`📊 Exchange: ${chave.exchange} ${chave.environment}`);
        console.log(`🔑 API Key: ${chave.api_key_encrypted ? 'PRESENTE' : 'AUSENTE'}`);
        console.log(`🔐 Secret: ${chave.secret_key_encrypted ? 'PRESENTE' : 'AUSENTE'}`);

        if (!chave.api_key_encrypted || !chave.secret_key_encrypted) {
            console.log('❌ Chaves incompletas');
            return;
        }

        // Testar como estão (podem não estar realmente criptografadas)
        const connector = new EnterpriseExchangeConnector();
        
        console.log('\n🔄 Testando chaves...');
        
        const teste = await connector.connectAndValidateExchange(
            1, // user_id genérico
            chave.api_key_encrypted,
            chave.secret_key_encrypted,
            chave.exchange.toLowerCase()
        );

        if (teste.success) {
            console.log('✅ SUCESSO! Chaves funcionaram');
            console.log(`🎯 Exchange detectada: ${teste.exchange} ${teste.environment}`);
        } else {
            console.log('❌ FALHA:');
            console.log(`   🔍 Erro: ${teste.error}`);
            console.log(`   📋 Detalhes: ${teste.details || 'N/A'}`);
        }

    } catch (error) {
        console.error('❌ Erro:', error.message);
    } finally {
        await pool.end();
    }
}

testeSimples();
