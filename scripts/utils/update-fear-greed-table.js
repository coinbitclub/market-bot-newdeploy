// 📊 ATUALIZAÇÃO DA TABELA FEAR & GREED PARA INCLUIR MARKET CAP
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: 'process.env.DATABASE_URL',
    ssl: { rejectUnauthorized: false }
});

async function updateFearGreedTable() {
    console.log('📊 ATUALIZANDO TABELA FEAR & GREED');
    console.log('==================================');
    
    try {
        // 1. Adicionar colunas para market cap
        console.log('\n🔧 Adicionando colunas para market cap...');
        await pool.query(`
            ALTER TABLE fear_greed_index 
            ADD COLUMN IF NOT EXISTS market_cap_total DECIMAL(20,2),
            ADD COLUMN IF NOT EXISTS market_cap_change_24h DECIMAL(8,4),
            ADD COLUMN IF NOT EXISTS btc_dominance DECIMAL(5,2),
            ADD COLUMN IF NOT EXISTS volume_24h DECIMAL(20,2),
            ADD COLUMN IF NOT EXISTS data_source TEXT DEFAULT 'alternative.me'
        `);
        console.log('   ✅ Colunas adicionadas com sucesso');

        // 2. Verificar estrutura da tabela
        console.log('\n📋 ESTRUTURA ATUALIZADA DA TABELA:');
        const columns = await pool.query(`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = 'fear_greed_index' 
            ORDER BY ordinal_position
        `);
        
        columns.rows.forEach(col => {
            console.log(`   ${col.column_name} (${col.data_type}) ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'} ${col.column_default ? `DEFAULT ${col.column_default}` : ''}`);
        });

        // 3. Criar índices para performance
        console.log('\n🚀 Criando índices para performance...');
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_fear_greed_collected_at ON fear_greed_index(collected_at);
            CREATE INDEX IF NOT EXISTS idx_fear_greed_value ON fear_greed_index(value);
            CREATE INDEX IF NOT EXISTS idx_fear_greed_source ON fear_greed_index(data_source);
        `);
        console.log('   ✅ Índices criados');

        // 4. Verificar dados existentes
        console.log('\n📊 DADOS EXISTENTES:');
        const count = await pool.query('SELECT COUNT(*) FROM fear_greed_index');
        const recent = await pool.query('SELECT * FROM fear_greed_index ORDER BY collected_at DESC LIMIT 3');
        
        console.log(`   📈 Total de registros: ${count.rows[0].count}`);
        console.log('   📋 Registros recentes:');
        recent.rows.forEach((row, i) => {
            console.log(`      ${i+1}. Valor: ${row.value} (${row.value_classification}) - ${row.data_source || 'N/A'}`);
        });

        console.log('\n✅ TABELA FEAR & GREED ATUALIZADA COM SUCESSO!');
        console.log('🎯 Agora inclui: market cap, variação 24h, BTC dominance e volume');
        
    } catch (error) {
        console.error('❌ Erro ao atualizar tabela:', error.message);
    } finally {
        await pool.end();
    }
}

updateFearGreedTable();
