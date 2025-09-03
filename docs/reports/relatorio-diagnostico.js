/**
 * 📋 RELATÓRIO DE DIAGNÓSTICO - CHAVES ENCONTRADAS
 * ===============================================
 * 
 * ✅ CONFIRMADO: 4 chaves cadastradas no banco
 * ❌ PROBLEMA: 0% de conexões bem-sucedidas
 * 🎯 CAUSA PROVÁVEL: IPs não configurados nas exchanges
 */

console.log('📋 RELATÓRIO DE DIAGNÓSTICO DETALHADO');
console.log('====================================');

const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'process.env.DATABASE_URL',
    ssl: { rejectUnauthorized: false }
});

async function gerarRelatorio() {
    try {
        console.log('\n🔍 DETALHES DAS CHAVES ENCONTRADAS:');
        console.log('==================================');

        const chaves = await pool.query(`
            SELECT 
                u.id as user_id,
                u.username,
                u.email,
                uak.id as key_id,
                uak.exchange,
                uak.environment,
                LEFT(uak.api_key, 16) as api_key_preview,
                uak.validation_status,
                uak.validation_error,
                uak.last_validated_at,
                uak.created_at
            FROM users u
            JOIN user_api_keys uak ON u.id = uak.user_id
            WHERE u.is_active = true AND uak.is_active = true
            ORDER BY u.id, uak.exchange, uak.environment
        `);

        console.log(`📊 Total de chaves: ${chaves.rows.length}`);

        chaves.rows.forEach((chave, index) => {
            console.log(`\n${index + 1}. 🔑 CHAVE ${chave.key_id}`);
            console.log(`   👤 Usuário: ${chave.username} (${chave.email})`);
            console.log(`   🏢 Exchange: ${chave.exchange.toUpperCase()}`);
            console.log(`   🌐 Ambiente: ${chave.environment}`);
            console.log(`   🔐 API Key: ${chave.api_key_preview}...`);
            console.log(`   📊 Status: ${chave.validation_status || 'PENDING'}`);
            if (chave.validation_error) {
                console.log(`   ❌ Erro: ${chave.validation_error}`);
            }
            console.log(`   📅 Criada: ${chave.created_at}`);
            if (chave.last_validated_at) {
                console.log(`   🕐 Última validação: ${chave.last_validated_at}`);
            }
        });

        console.log('\n🎯 ANÁLISE DOS PROBLEMAS:');
        console.log('========================');

        // Contar erros por tipo
        const erros = await pool.query(`
            SELECT 
                validation_error,
                COUNT(*) as count
            FROM user_api_keys 
            WHERE validation_status = 'FAILED'
            GROUP BY validation_error
        `);

        if (erros.rows.length > 0) {
            console.log('📊 Tipos de erro encontrados:');
            erros.rows.forEach(erro => {
                console.log(`   ${erro.count}x: ${erro.validation_error}`);
            });
        }

        console.log('\n🔧 AÇÕES NECESSÁRIAS:');
        console.log('=====================');
        console.log('IP atual detectado: 132.255.160.131');
        console.log('IP Railway: 131.0.31.147');
        console.log('');
        console.log('📋 CONFIGURE OS IPs NAS EXCHANGES:');
        console.log('');

        // Instruções específicas por exchange
        const exchanges = await pool.query(`
            SELECT DISTINCT exchange, environment
            FROM user_api_keys 
            WHERE is_active = true
            ORDER BY exchange, environment
        `);

        exchanges.rows.forEach(ex => {
            if (ex.exchange === 'bybit') {
                console.log(`🟣 BYBIT ${ex.environment.toUpperCase()}:`);
                if (ex.environment === 'testnet') {
                    console.log('   1. Acesse: https://testnet.bybit.com/app/user/api-management');
                } else {
                    console.log('   1. Acesse: https://www.bybit.com/app/user/api-management');
                }
                console.log('   2. Edite sua API Key');
                console.log('   3. Na seção "IP Restrictions", adicione:');
                console.log('      ✅ 131.0.31.147 (Railway)');
                console.log('      ➕ 132.255.160.131 (IP atual)');
                console.log('   4. Salve as alterações');
                console.log('');
            } else if (ex.exchange === 'binance') {
                console.log(`🟡 BINANCE ${ex.environment.toUpperCase()}:`);
                if (ex.environment === 'testnet') {
                    console.log('   1. Acesse: https://testnet.binance.vision/');
                } else {
                    console.log('   1. Acesse: https://www.binance.com/en/my/settings/api-management');
                }
                console.log('   2. Edite sua API Key');
                console.log('   3. Na seção "IP Access Restrictions", adicione:');
                console.log('      ✅ 131.0.31.147 (Railway)');
                console.log('      ➕ 132.255.160.131 (IP atual)');
                console.log('   4. Salve as alterações');
                console.log('');
            }
        });

        console.log('⚠️ IMPORTANTE:');
        console.log('- Aguarde alguns minutos após configurar os IPs');
        console.log('- As mudanças podem levar de 1-5 minutos para entrar em vigor');
        console.log('');
        console.log('🧪 APÓS CONFIGURAR OS IPs:');
        console.log('1. Execute: node teste-conexao-simples.js');
        console.log('2. Execute: node teste-trade-real.js');
        console.log('3. Execute: node emergency-exchange-connector.js');

    } catch (error) {
        console.error('❌ Erro ao gerar relatório:', error.message);
    } finally {
        await pool.end();
    }
}

gerarRelatorio();
