const { Pool } = require('pg');

const pool = new Pool({
    user: 'postgres',
    host: 'junction.proxy.rlwy.net',
    database: 'railway',
    password: 'process.env.API_KEY_HERE',
    port: 26822,
    ssl: { rejectUnauthorized: false }
});

async function recriarTabelaValidacoes() {
    console.log('🛠️ Recriando tabela api_key_validations sem constraints NOT NULL...');
    
    try {
        // Dropar tabela existente
        await pool.query(`DROP TABLE IF EXISTS api_key_validations CASCADE`);
        console.log('   ✅ Tabela api_key_validations removida');

        // Recriar tabela com estrutura simplificada
        await pool.query(`
            CREATE TABLE api_key_validations (
                id SERIAL PRIMARY KEY,
                user_id INTEGER,
                validation_type VARCHAR(50),
                status VARCHAR(20),
                response_data JSONB,
                validated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            )
        `);
        console.log('   ✅ Tabela api_key_validations recriada com estrutura flexível');

        // Verificar estrutura final
        const structureCheck = await pool.query(`
            SELECT column_name, data_type, is_nullable 
            FROM information_schema.columns 
            WHERE table_name = 'api_key_validations'
            ORDER BY ordinal_position
        `);

        console.log('\n📋 Nova estrutura da tabela:');
        structureCheck.rows.forEach(col => {
            console.log(`   - ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'})`);
        });

        console.log('\n✅ Tabela recriada com sucesso!');

    } catch (error) {
        console.error('❌ Erro:', error.message);
    } finally {
        await pool.end();
        process.exit(0);
    }
}

recriarTabelaValidacoes();
