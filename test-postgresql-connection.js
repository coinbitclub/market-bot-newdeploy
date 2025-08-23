const { Client } = require('pg');

async function testPostgreSQLConnection() {
    console.log('🔍 Testando conexão PostgreSQL Railway...');
    
    const connectionString = 'postgresql://postgres:ELjbkkgUASRCtdTAXVFgIssOXiLsRCPq@trolley.proxy.rlwy.net:44790/railway';
    
    const client = new Client({
        connectionString: connectionString,
        ssl: {
            rejectUnauthorized: false
        }
    });

    try {
        console.log('📡 Conectando ao banco...');
        await client.connect();
        console.log('✅ Conexão estabelecida com sucesso!');
        
        // Testar uma query simples
        const result = await client.query('SELECT NOW() as current_time');
        console.log('⏰ Hora do servidor:', result.rows[0].current_time);
        
        // Verificar tabelas existentes
        const tables = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name
        `);
        
        console.log('📋 Tabelas encontradas:');
        tables.rows.forEach(row => {
            console.log(`   - ${row.table_name}`);
        });
        
        // Verificar usuários com chaves API
        try {
            const users = await client.query(`
                SELECT id, username, binance_api_key IS NOT NULL as has_binance, 
                       bybit_api_key IS NOT NULL as has_bybit
                FROM users 
                WHERE binance_api_key IS NOT NULL OR bybit_api_key IS NOT NULL
                LIMIT 5
            `);
            
            console.log('👥 Usuários com chaves API:');
            if (users.rows.length > 0) {
                users.rows.forEach(user => {
                    console.log(`   - ID: ${user.id}, User: ${user.username}, Binance: ${user.has_binance}, Bybit: ${user.has_bybit}`);
                });
            } else {
                console.log('   ⚠️ Nenhum usuário com chaves API encontrado');
            }
        } catch (error) {
            console.log('⚠️ Erro ao verificar usuários:', error.message);
        }
        
    } catch (error) {
        console.error('❌ Erro na conexão:', error.message);
        console.error('🔧 Código do erro:', error.code);
        
        if (error.code === 'ENOTFOUND') {
            console.log('🌐 Problema de DNS - verificando conectividade...');
        } else if (error.code === 'ECONNREFUSED') {
            console.log('🚫 Conexão recusada - servidor pode estar down');
        } else if (error.code === '28000') {
            console.log('🔑 Problema de autenticação - credenciais inválidas');
        }
    } finally {
        try {
            await client.end();
            console.log('🔌 Conexão fechada');
        } catch (e) {
            // Ignorar erro de fechamento
        }
    }
}

testPostgreSQLConnection();
