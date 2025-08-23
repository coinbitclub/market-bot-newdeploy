#!/usr/bin/env node

console.log('🔧 CORRIGINDO ERRO DO DASHBOARD');
console.log('==============================');

const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:ELjbkkgUASRCtdTAXVFgIssOXiLsRCPq@trolley.proxy.rlwy.net:44790/railway',
    ssl: { rejectUnauthorized: false }
});

async function corrigirDashboard() {
    try {
        // 1. Verificar estrutura da tabela fear_greed_index
        console.log('\n📊 1. VERIFICANDO TABELA FEAR_GREED_INDEX:');
        console.log('==========================================');
        
        const colunas = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'fear_greed_index' 
            ORDER BY ordinal_position
        `);
        
        console.log('Colunas existentes:');
        colunas.rows.forEach(col => {
            console.log(`   ${col.column_name}: ${col.data_type}`);
        });
        
        // 2. Verificar se a coluna value existe
        const temValue = colunas.rows.find(col => col.column_name === 'value');
        const temFearGreedValue = colunas.rows.find(col => col.column_name === 'fear_greed_value');
        
        console.log(`\n🔍 Coluna 'value': ${temValue ? '✅ EXISTE' : '❌ NÃO EXISTE'}`);
        console.log(`🔍 Coluna 'fear_greed_value': ${temFearGreedValue ? '✅ EXISTE' : '❌ NÃO EXISTE'}`);
        
        // 3. Se não tem fear_greed_value mas tem value, criar alias ou renomear
        if (!temFearGreedValue && temValue) {
            console.log('\n🔧 Adicionando coluna fear_greed_value...');
            await pool.query(`
                ALTER TABLE fear_greed_index 
                ADD COLUMN IF NOT EXISTS fear_greed_value INTEGER
            `);
            
            // Copiar dados de value para fear_greed_value
            await pool.query(`
                UPDATE fear_greed_index 
                SET fear_greed_value = value 
                WHERE fear_greed_value IS NULL
            `);
            
            console.log('✅ Coluna fear_greed_value criada e dados copiados');
        }
        
        // 4. Se não tem nenhuma das duas, criar estrutura completa
        if (!temValue && !temFearGreedValue) {
            console.log('\n🔧 Criando estrutura completa da tabela...');
            await pool.query(`
                CREATE TABLE IF NOT EXISTS fear_greed_index (
                    id SERIAL PRIMARY KEY,
                    value INTEGER NOT NULL,
                    fear_greed_value INTEGER NOT NULL,
                    category VARCHAR(20) NOT NULL,
                    collected_at TIMESTAMP DEFAULT NOW(),
                    created_at TIMESTAMP DEFAULT NOW()
                )
            `);
            
            // Inserir dados de exemplo
            await pool.query(`
                INSERT INTO fear_greed_index (value, fear_greed_value, category) 
                VALUES (45, 45, 'Fear'), (62, 62, 'Greed'), (38, 38, 'Extreme Fear')
                ON CONFLICT DO NOTHING
            `);
            
            console.log('✅ Tabela fear_greed_index criada com dados');
        }
        
        // 5. Testar query do dashboard
        console.log('\n📊 2. TESTANDO QUERY DO DASHBOARD:');
        console.log('==================================');
        
        try {
            const teste = await pool.query(`
                SELECT fear_greed_value, category, collected_at 
                FROM fear_greed_index 
                ORDER BY collected_at DESC 
                LIMIT 1
            `);
            
            console.log('✅ Query do dashboard funcionando!');
            console.log('Dados:', teste.rows[0] || 'Nenhum registro');
            
        } catch (error) {
            console.log('❌ Query ainda com erro:', error.message);
            
            // Alternativa: usar a coluna value se existir
            if (temValue) {
                console.log('\n🔄 Testando com coluna "value"...');
                const testeValue = await pool.query(`
                    SELECT value as fear_greed_value, category, collected_at 
                    FROM fear_greed_index 
                    ORDER BY collected_at DESC 
                    LIMIT 1
                `);
                
                console.log('✅ Query alternativa funcionando!');
                console.log('Dados:', testeValue.rows[0] || 'Nenhum registro');
            }
        }
        
        console.log('\n🎯 CORREÇÃO CONCLUÍDA!');
        
    } catch (error) {
        console.error('❌ Erro:', error.message);
    } finally {
        await pool.end();
    }
}

corrigirDashboard().catch(console.error);
