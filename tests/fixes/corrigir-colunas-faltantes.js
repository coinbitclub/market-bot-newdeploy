const { Pool } = require('pg');
require('dotenv').config();

// Configuração do banco de dados
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function corrigirColunasTabelas() {
    console.log('🛠️ CORRIGINDO COLUNAS FALTANTES NAS TABELAS');
    console.log('============================================');

    try {
        // 1. Adicionar coluna custom_config na tabela users
        console.log('\n📊 Corrigindo tabela users...');
        try {
            await pool.query(`
                ALTER TABLE users 
                ADD COLUMN IF NOT EXISTS custom_config JSONB DEFAULT '{}'
            `);
            console.log('   ✅ Coluna custom_config adicionada à tabela users');
        } catch (error) {
            console.log(`   ⚠️ Erro na tabela users: ${error.message}`);
        }

        // 2. Adicionar colunas faltantes na tabela market_direction_history
        console.log('\n📊 Corrigindo tabela market_direction_history...');
        try {
            await pool.query(`
                ALTER TABLE market_direction_history 
                ADD COLUMN IF NOT EXISTS top100_percentage_up DECIMAL(5,2) DEFAULT 50.0
            `);
            console.log('   ✅ Coluna top100_percentage_up adicionada');
        } catch (error) {
            console.log(`   ⚠️ Erro na tabela market_direction_history: ${error.message}`);
        }

        // 3. Adicionar colunas faltantes na tabela btc_dominance_analysis
        console.log('\n📊 Corrigindo tabela btc_dominance_analysis...');
        try {
            await pool.query(`
                ALTER TABLE btc_dominance_analysis 
                ADD COLUMN IF NOT EXISTS alerts JSONB DEFAULT '[]'
            `);
            console.log('   ✅ Coluna alerts adicionada à tabela btc_dominance_analysis');
        } catch (error) {
            console.log(`   ⚠️ Erro na tabela btc_dominance_analysis: ${error.message}`);
        }

        // 4. Adicionar colunas faltantes na tabela rsi_overheated_log
        console.log('\n📊 Corrigindo tabela rsi_overheated_log...');
        try {
            await pool.query(`
                ALTER TABLE rsi_overheated_log 
                ADD COLUMN IF NOT EXISTS recommendation VARCHAR(50) DEFAULT 'NEUTRAL'
            `);
            console.log('   ✅ Coluna recommendation adicionada à tabela rsi_overheated_log');
        } catch (error) {
            console.log(`   ⚠️ Erro na tabela rsi_overheated_log: ${error.message}`);
        }

        // 5. Adicionar coluna received_at nas tabelas de histórico se não existir
        console.log('\n📊 Corrigindo coluna received_at...');
        try {
            // Verificar se a tabela trading_signals tem received_at
            const checkReceived = await pool.query(`
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'trading_signals' 
                AND column_name = 'received_at'
            `);
            
            if (checkReceived.rows.length === 0) {
                await pool.query(`
                    ALTER TABLE trading_signals 
                    ADD COLUMN received_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                `);
                console.log('   ✅ Coluna received_at adicionada à tabela trading_signals');
            } else {
                console.log('   ✅ Coluna received_at já existe na tabela trading_signals');
            }
        } catch (error) {
            console.log(`   ⚠️ Erro na coluna received_at: ${error.message}`);
        }

        // 6. Verificar estrutura final das tabelas críticas
        console.log('\n🔍 VERIFICANDO ESTRUTURAS FINAIS...');
        
        const tables = ['users', 'market_direction_history', 'btc_dominance_analysis', 'rsi_overheated_log'];
        
        for (const table of tables) {
            try {
                const result = await pool.query(`
                    SELECT column_name, data_type, is_nullable 
                    FROM information_schema.columns 
                    WHERE table_name = $1 
                    ORDER BY ordinal_position
                `, [table]);
                
                console.log(`\n📋 Estrutura de ${table}:`);
                result.rows.forEach(col => {
                    console.log(`   - ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'})`);
                });
            } catch (error) {
                console.log(`   ❌ Erro ao verificar ${table}: ${error.message}`);
            }
        }

        console.log('\n✅ CORREÇÕES DE ESTRUTURA FINALIZADAS!');
        console.log('🔄 Reinicie o sistema para aplicar as mudanças');

    } catch (error) {
        console.error('❌ Erro geral:', error.message);
    } finally {
        await pool.end();
        process.exit(0);
    }
}

corrigirColunasTabelas();
