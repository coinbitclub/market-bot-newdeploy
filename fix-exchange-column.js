const { Pool } = require('pg');

const pool = new Pool({
    user: 'postgres',
    host: 'junction.proxy.rlwy.net',
    database: 'railway',
    password: 'kZWzZnCPrXVGJrpRKKlKnePUPFlgBNdz',
    port: 26822,
    ssl: { rejectUnauthorized: false }
});

async function ajustarExchangeColumn() {
    console.log('🛠️ Ajustando coluna exchange para permitir NULL...');
    
    try {
        // Primeiro vamos ver a estrutura atual
        const checkConstraints = await pool.query(`
            SELECT 
                column_name, 
                is_nullable, 
                data_type,
                column_default
            FROM information_schema.columns 
            WHERE table_name = 'api_key_validations' 
            AND column_name = 'exchange'
        `);
        
        console.log('📋 Estrutura atual da coluna exchange:');
        checkConstraints.rows.forEach(col => {
            console.log(`   - ${col.column_name}: ${col.data_type}, nullable: ${col.is_nullable}`);
        });

        // Tornar a coluna exchange nullable
        await pool.query(`
            ALTER TABLE api_key_validations 
            ALTER COLUMN exchange DROP NOT NULL
        `);
        
        console.log('   ✅ Coluna exchange agora permite valores NULL');
        
        // Verificar novamente
        const checkAgain = await pool.query(`
            SELECT 
                column_name, 
                is_nullable, 
                data_type
            FROM information_schema.columns 
            WHERE table_name = 'api_key_validations' 
            AND column_name = 'exchange'
        `);
        
        console.log('\n📋 Estrutura após ajuste:');
        checkAgain.rows.forEach(col => {
            console.log(`   - ${col.column_name}: ${col.data_type}, nullable: ${col.is_nullable}`);
        });

        console.log('\n✅ Ajuste concluído com sucesso!');

    } catch (error) {
        console.error('❌ Erro ao ajustar coluna:', error.message);
    } finally {
        await pool.end();
        process.exit(0);
    }
}

ajustarExchangeColumn();
