const { Pool } = require('pg');

// Teste de conexão simples
async function testConnection() {
    const pool = new Pool({
        connectionString: 'postgresql://postgres:ELjbkkgUASRCtdTAXVFgIssOXiLsRCPq@trolley.proxy.rlwy.net:44790/railway',
        ssl: {
            rejectUnauthorized: false
        }
    });

    try {
        console.log('🔄 Testando conexão com Railway...');
        
        // Teste de conexão básica
        const client = await pool.connect();
        console.log('✅ Conexão estabelecida');
        
        // Verificar se tabela existe
        const tableCheck = await client.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'top100_cryptocurrencies'
            )
        `);
        
        console.log('✅ Tabela top100_cryptocurrencies existe:', tableCheck.rows[0].exists);
        
        // Verificar quantos registros existem
        if (tableCheck.rows[0].exists) {
            const countQuery = await client.query('SELECT COUNT(*) FROM top100_cryptocurrencies');
            console.log('📊 Registros atuais:', countQuery.rows[0].count);
        }
        
        client.release();
        await pool.end();
        
        console.log('✅ Teste de conexão concluído com sucesso');
        
    } catch (error) {
        console.error('❌ Erro de conexão:', error.message);
        console.error('Detalhes:', error.stack);
    }
}

testConnection();
