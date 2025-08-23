const { Pool } = require('pg');

const pool = new Pool({
    user: 'postgres',
    host: 'junction.proxy.rlwy.net',
    database: 'railway',
    password: 'kZWzZnCPrXVGJrpRKKlKnePUPFlgBNdz',
    port: 26822,
    ssl: { rejectUnauthorized: false }
});

async function verificarEstrutura() {
    try {
        const result = await pool.query(`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = 'api_key_validations'
            ORDER BY ordinal_position
        `);
        
        console.log('📋 Estrutura atual da tabela api_key_validations:');
        result.rows.forEach(col => {
            console.log(`   - ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'})`);
        });

        // Tornar colunas nullable se necessário
        console.log('\n🛠️ Ajustando constraints...');
        
        await pool.query(`ALTER TABLE api_key_validations ALTER COLUMN exchange DROP NOT NULL`);
        console.log('   ✅ Coluna exchange agora permite NULL');
        
        await pool.query(`ALTER TABLE api_key_validations ALTER COLUMN api_key DROP NOT NULL`);
        console.log('   ✅ Coluna api_key agora permite NULL');
        
        await pool.query(`ALTER TABLE api_key_validations ALTER COLUMN secret_key DROP NOT NULL`);
        console.log('   ✅ Coluna secret_key agora permite NULL');

        console.log('\n✅ Constraints ajustadas com sucesso!');

    } catch (error) {
        console.error('❌ Erro:', error.message);
    } finally {
        await pool.end();
        process.exit(0);
    }
}

verificarEstrutura();
