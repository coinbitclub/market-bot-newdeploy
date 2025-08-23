// 🔧 VERIFICAÇÃO E CORREÇÃO COMPLETA DO SCHEMA
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: 'postgresql://postgres:ELjbkkgUASRCtdTAXVFgIssOXiLsRCPq@trolley.proxy.rlwy.net:44790/railway',
    ssl: { rejectUnauthorized: false }
});

async function verificarECorrigirSchema() {
    console.log('🔍 VERIFICAÇÃO COMPLETA DO SCHEMA');
    console.log('================================');
    
    try {
        // 1. Verificar tabelas existentes
        console.log('\n📊 TABELAS EXISTENTES:');
        const tabelas = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name
        `);
        
        tabelas.rows.forEach(row => {
            console.log(`   ✅ ${row.table_name}`);
        });

        // 2. Verificar colunas das principais tabelas
        console.log('\n🔍 VERIFICANDO COLUNAS DAS TABELAS:');
        
        const tabelasParaVerificar = [
            'trading_signals', 
            'signal_metrics_log', 
            'market_direction_history', 
            'users'
        ];

        for (const tabela of tabelasParaVerificar) {
            console.log(`\n📋 Tabela: ${tabela}`);
            try {
                const colunas = await pool.query(`
                    SELECT column_name, data_type, is_nullable 
                    FROM information_schema.columns 
                    WHERE table_name = $1 
                    ORDER BY ordinal_position
                `, [tabela]);
                
                if (colunas.rows.length > 0) {
                    colunas.rows.forEach(col => {
                        console.log(`   ${col.column_name} (${col.data_type}) ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
                    });
                } else {
                    console.log(`   ❌ Tabela não encontrada`);
                }
            } catch (error) {
                console.log(`   ❌ Erro ao verificar: ${error.message}`);
            }
        }

        // 3. Corrigir problemas identificados
        console.log('\n🔧 CORRIGINDO PROBLEMAS IDENTIFICADOS:');
        
        // Problema 1: market_direction_history sem coluna allowed_direction
        console.log('\n1️⃣ Verificando market_direction_history...');
        try {
            await pool.query(`
                ALTER TABLE market_direction_history 
                ADD COLUMN IF NOT EXISTS allowed_direction TEXT DEFAULT 'LONG_E_SHORT'
            `);
            console.log('   ✅ Coluna allowed_direction adicionada');
        } catch (error) {
            console.log(`   ❌ Erro: ${error.message}`);
        }

        // Problema 2: trading_signals pode estar faltando colunas
        console.log('\n2️⃣ Verificando trading_signals...');
        try {
            await pool.query(`
                ALTER TABLE trading_signals 
                ADD COLUMN IF NOT EXISTS signal TEXT DEFAULT '',
                ADD COLUMN IF NOT EXISTS symbol TEXT DEFAULT 'BTCUSDT',
                ADD COLUMN IF NOT EXISTS confidence DECIMAL(5,4) DEFAULT 0.5000,
                ADD COLUMN IF NOT EXISTS top100_trend TEXT DEFAULT 'NEUTRAL',
                ADD COLUMN IF NOT EXISTS btc_dominance DECIMAL(5,2) DEFAULT 50.00
            `);
            console.log('   ✅ Colunas de trading_signals verificadas');
        } catch (error) {
            console.log(`   ❌ Erro: ${error.message}`);
        }

        // Problema 3: users sem coluna user_type
        console.log('\n3️⃣ Verificando users...');
        try {
            await pool.query(`
                ALTER TABLE users 
                ADD COLUMN IF NOT EXISTS user_type TEXT DEFAULT 'FREE'
            `);
            console.log('   ✅ Coluna user_type adicionada');
        } catch (error) {
            console.log(`   ❌ Erro: ${error.message}`);
        }

        // 4. Verificar estrutura final
        console.log('\n📊 ESTRUTURA FINAL DAS TABELAS:');
        for (const tabela of tabelasParaVerificar) {
            console.log(`\n📋 ${tabela}:`);
            try {
                const colunas = await pool.query(`
                    SELECT column_name, data_type 
                    FROM information_schema.columns 
                    WHERE table_name = $1 
                    ORDER BY ordinal_position
                `, [tabela]);
                
                colunas.rows.forEach(col => {
                    console.log(`   ✅ ${col.column_name} (${col.data_type})`);
                });
            } catch (error) {
                console.log(`   ❌ Erro: ${error.message}`);
            }
        }

        // 5. Testar as queries problemáticas
        console.log('\n🧪 TESTANDO QUERIES PROBLEMÁTICAS:');
        
        // Teste 1: AI Decisions query
        console.log('\n🔍 Teste 1: AI Decisions...');
        try {
            const result = await pool.query(`
                SELECT 
                    ts.id,
                    ts.ticker as symbol,
                    ts.signal,
                    ts.ai_approved,
                    ts.ai_reason,
                    ts.confidence,
                    ts.created_at,
                    ts.processed_at
                FROM trading_signals ts 
                WHERE ts.processed_at >= NOW() - INTERVAL '24 hours'
                ORDER BY ts.processed_at DESC 
                LIMIT 10
            `);
            console.log(`   ✅ Query funcionou! ${result.rows.length} registros encontrados`);
        } catch (error) {
            console.log(`   ❌ Erro na query AI Decisions: ${error.message}`);
        }

        // Teste 2: Users query
        console.log('\n🔍 Teste 2: Users...');
        try {
            const result = await pool.query(`
                SELECT 
                    u.id,
                    u.username,
                    u.user_type,
                    u.created_at
                FROM users u 
                LIMIT 5
            `);
            console.log(`   ✅ Query funcionou! ${result.rows.length} registros encontrados`);
        } catch (error) {
            console.log(`   ❌ Erro na query Users: ${error.message}`);
        }

        console.log('\n✅ VERIFICAÇÃO CONCLUÍDA!');
        
    } catch (error) {
        console.error('❌ Erro geral:', error);
    } finally {
        await pool.end();
    }
}

// Executar verificação
verificarECorrigirSchema();
