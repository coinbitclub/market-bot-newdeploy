#!/usr/bin/env node

const { Pool } = require('pg');

const pool = new Pool({
    connectionString: 'process.env.DATABASE_URL',
    ssl: { rejectUnauthorized: false }
});

async function checkTable() {
    try {
        console.log('🔍 Verificando estrutura da tabela fear_greed_index...');
        
        const result = await pool.query(`
            SELECT column_name, data_type, is_nullable 
            FROM information_schema.columns 
            WHERE table_name = 'fear_greed_index'
            ORDER BY ordinal_position
        `);
        
        console.log('\n📋 Estrutura da tabela fear_greed_index:');
        result.rows.forEach(col => {
            console.log(`  📊 ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
        });

        // Verificar dados existentes
        const data = await pool.query(`
            SELECT * FROM fear_greed_index ORDER BY collected_at DESC LIMIT 3
        `);
        
        console.log('\n📈 Últimos registros:');
        data.rows.forEach(row => {
            console.log(`  ${row.collected_at}: value=${row.value}, fear_greed_value=${row.fear_greed_value}, category=${row.category}`);
        });

    } catch (error) {
        console.error('❌ Erro:', error.message);
    } finally {
        await pool.end();
    }
}

checkTable().catch(console.error);
