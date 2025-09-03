#!/usr/bin/env node

/**
 * 🔧 TESTE DE CONECTIVIDADE DO BANCO
 */

const { Pool } = require('pg');

// Múltiplas tentativas de conexão
const connectionStrings = [
    process.env.DATABASE_URL,
    'process.env.DATABASE_URL',
    'process.env.DATABASE_URL'
];

async function testarConexoes() {
    console.log('🔍 TESTANDO CONECTIVIDADE DO BANCO...');
    console.log('====================================\n');
    
    for (let i = 0; i < connectionStrings.length; i++) {
        const connStr = connectionStrings[i];
        if (!connStr) {
            console.log(`❌ Conexão ${i + 1}: String vazia`);
            continue;
        }
        
        console.log(`🔗 Testando conexão ${i + 1}...`);
        console.log(`   URL: ${connStr.substring(0, 50)}...`);
        
        const pool = new Pool({
            connectionString: connStr,
            ssl: { rejectUnauthorized: false },
            connectionTimeoutMillis: 10000,
            idleTimeoutMillis: 10000,
            max: 1
        });
        
        try {
            const client = await pool.connect();
            const result = await client.query('SELECT NOW() as current_time, version() as db_version');
            
            console.log(`   ✅ CONECTADO com sucesso!`);
            console.log(`   🕐 Hora: ${result.rows[0].current_time}`);
            console.log(`   📊 Versão: ${result.rows[0].db_version.split(' ')[0]} ${result.rows[0].db_version.split(' ')[1]}`);
            
            // Verificar se as tabelas existem
            const tables = await client.query(`
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name IN ('users', 'user_api_keys')
                ORDER BY table_name
            `);
            
            console.log(`   📋 Tabelas encontradas: ${tables.rows.map(r => r.table_name).join(', ')}`);
            
            if (tables.rows.length >= 2) {
                // Verificar dados dos usuários
                const userData = await client.query(`
                    SELECT u.id, u.username, k.exchange, k.api_key, k.environment
                    FROM users u 
                    LEFT JOIN user_api_keys k ON u.id = k.user_id 
                    WHERE u.id IN (14, 15, 16)
                    ORDER BY u.id, k.exchange
                `);
                
                console.log(`   👥 Usuários encontrados: ${userData.rows.length} registros`);
                for (const row of userData.rows) {
                    console.log(`      ID ${row.id}: ${row.username} - ${row.exchange || 'SEM CHAVE'}`);
                }
            }
            
            client.release();
            await pool.end();
            
            console.log(`\n🎉 CONEXÃO ${i + 1} FUNCIONANDO - USANDO ESTA!\n`);
            return connStr;
            
        } catch (error) {
            console.log(`   ❌ Falhou: ${error.message}`);
            await pool.end();
        }
    }
    
    throw new Error('Nenhuma conexão funcionou');
}

if (require.main === module) {
    testarConexoes()
        .then(workingConnection => {
            console.log('✅ Conexão funcionando encontrada!');
        })
        .catch(error => {
            console.error('💥 Todas as conexões falharam:', error.message);
        });
}

module.exports = { testarConexoes };
