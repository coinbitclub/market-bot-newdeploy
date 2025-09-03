/**
 * 🔍 VERIFICAÇÃO RÁPIDA DE CHAVES NO BANCO
 * =======================================
 */

const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'process.env.DATABASE_URL',
    ssl: { rejectUnauthorized: false }
});

async function verificarChaves() {
    console.log('🔍 VERIFICAÇÃO RÁPIDA DE CHAVES NO BANCO');
    console.log('=======================================');

    try {
        // 1. Verificar usuários
        console.log('\n👥 VERIFICANDO USUÁRIOS:');
        const users = await pool.query('SELECT id, username, email, is_active, created_at FROM users ORDER BY id');
        console.log(`📊 Total de usuários: ${users.rows.length}`);
        
        users.rows.forEach(user => {
            console.log(`  ID: ${user.id} | ${user.username} | ${user.email} | Ativo: ${user.is_active}`);
        });

        // 2. Verificar chaves API
        console.log('\n🔑 VERIFICANDO CHAVES API:');
        const keys = await pool.query(`
            SELECT 
                uak.id,
                uak.user_id,
                u.username,
                uak.exchange,
                uak.environment,
                LEFT(uak.api_key, 12) as api_key_preview,
                uak.is_active,
                uak.validation_status,
                uak.created_at
            FROM user_api_keys uak
            JOIN users u ON u.id = uak.user_id
            ORDER BY uak.user_id, uak.exchange, uak.environment
        `);
        
        console.log(`📊 Total de chaves: ${keys.rows.length}`);
        
        if (keys.rows.length === 0) {
            console.log('❌ NENHUMA CHAVE ENCONTRADA!');
            console.log('📋 Ações necessárias:');
            console.log('   1. Cadastrar chaves: node cadastrar-chaves-reais.js');
            console.log('   2. Ou verificar se as tabelas existem');
        } else {
            console.log('\n📋 DETALHES DAS CHAVES:');
            keys.rows.forEach((key, index) => {
                console.log(`\n${index + 1}. 🔑 CHAVE ID: ${key.id}`);
                console.log(`   👤 Usuário: ${key.username} (ID: ${key.user_id})`);
                console.log(`   🏢 Exchange: ${key.exchange.toUpperCase()}`);
                console.log(`   🌐 Ambiente: ${key.environment}`);
                console.log(`   🔐 API Key: ${key.api_key_preview}...`);
                console.log(`   ✅ Ativa: ${key.is_active}`);
                console.log(`   📊 Status: ${key.validation_status || 'PENDING'}`);
                console.log(`   📅 Criada: ${key.created_at}`);
            });
        }

        // 3. Estatísticas por exchange
        console.log('\n📊 ESTATÍSTICAS POR EXCHANGE:');
        const stats = await pool.query(`
            SELECT 
                exchange,
                environment,
                COUNT(*) as total,
                COUNT(CASE WHEN is_active = true THEN 1 END) as ativas,
                COUNT(CASE WHEN validation_status = 'CONNECTED' THEN 1 END) as conectadas
            FROM user_api_keys
            GROUP BY exchange, environment
            ORDER BY exchange, environment
        `);

        if (stats.rows.length > 0) {
            stats.rows.forEach(stat => {
                console.log(`  ${stat.exchange.toUpperCase()} ${stat.environment}: ${stat.ativas}/${stat.total} ativas, ${stat.conectadas} conectadas`);
            });
        } else {
            console.log('  Nenhuma estatística disponível');
        }

        // 4. Verificar se há chaves prontas para teste
        const readyKeys = await pool.query(`
            SELECT COUNT(*) as count
            FROM user_api_keys uak
            JOIN users u ON u.id = uak.user_id
            WHERE u.is_active = true 
            AND uak.is_active = true
            AND uak.api_key IS NOT NULL
            AND uak.secret_key IS NOT NULL
        `);

        console.log(`\n🎯 CHAVES PRONTAS PARA TESTE: ${readyKeys.rows[0].count}`);
        
        if (readyKeys.rows[0].count > 0) {
            console.log('✅ Sistema pronto para testes!');
            console.log('📋 Próximo passo: node teste-trade-real.js');
        } else {
            console.log('❌ Sistema não está pronto para testes');
            console.log('📋 Cadastre chaves primeiro: node cadastrar-chaves-reais.js');
        }

    } catch (error) {
        console.error('❌ Erro na verificação:', error.message);
        console.log('\n🔧 POSSÍVEIS SOLUÇÕES:');
        console.log('1. Verificar conexão com banco de dados');
        console.log('2. Executar: node setup-api-keys.js (criar tabelas)');
        console.log('3. Verificar string de conexão do banco');
    } finally {
        await pool.end();
    }
}

verificarChaves();
