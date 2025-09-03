#!/usr/bin/env node

/**
 * 🔧 CORREÇÃO DA COLUNA unrealised_pnl → unrealized_pnl
 * ===================================================
 * 
 * Corrige a nomenclatura da coluna no banco de dados
 */

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function corrigirColunaPnL() {
    console.log('🔧 CORRIGINDO ESTRUTURA DA TABELA active_positions');
    console.log('================================================\n');

    try {
        // 1. Verificar se a tabela existe
        const tableCheck = await pool.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'active_positions'
            );
        `);

        if (!tableCheck.rows[0].exists) {
            console.log('❌ Tabela active_positions não existe - criando...');
            
            await pool.query(`
                CREATE TABLE active_positions (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER REFERENCES users(id),
                    exchange VARCHAR(20) NOT NULL,
                    symbol VARCHAR(20) NOT NULL,
                    side VARCHAR(10) NOT NULL,
                    position_size DECIMAL(20,8) DEFAULT 0,
                    entry_price DECIMAL(20,8) DEFAULT 0,
                    mark_price DECIMAL(20,8) DEFAULT 0,
                    unrealized_pnl DECIMAL(20,8) DEFAULT 0,
                    position_value DECIMAL(20,8) DEFAULT 0,
                    leverage INTEGER DEFAULT 1,
                    created_at TIMESTAMP DEFAULT NOW(),
                    updated_at TIMESTAMP DEFAULT NOW(),
                    is_active BOOLEAN DEFAULT true,
                    UNIQUE(user_id, exchange, symbol)
                );
            `);
            
            console.log('✅ Tabela active_positions criada!');
            return;
        }

        // 2. Verificar colunas existentes
        const columnsCheck = await pool.query(`
            SELECT column_name, data_type
            FROM information_schema.columns 
            WHERE table_name = 'active_positions' 
            ORDER BY column_name;
        `);

        const existingColumns = columnsCheck.rows.map(row => row.column_name);
        console.log('📋 Colunas encontradas:', existingColumns);

        // 3. Colunas necessárias
        const requiredColumns = [
            { name: 'mark_price', type: 'DECIMAL(20,8)', default: '0' },
            { name: 'unrealized_pnl', type: 'DECIMAL(20,8)', default: '0' },
            { name: 'position_value', type: 'DECIMAL(20,8)', default: '0' },
            { name: 'leverage', type: 'INTEGER', default: '1' },
            { name: 'is_active', type: 'BOOLEAN', default: 'true' }
        ];

        // 4. Adicionar colunas faltantes
        for (const column of requiredColumns) {
            if (!existingColumns.includes(column.name)) {
                console.log(`🔄 Adicionando coluna ${column.name}...`);
                
                await pool.query(`
                    ALTER TABLE active_positions 
                    ADD COLUMN ${column.name} ${column.type} DEFAULT ${column.default};
                `);
                
                console.log(`✅ Coluna ${column.name} adicionada!`);
            }
        }

        // 5. Corrigir unrealised_pnl → unrealized_pnl se necessário
        if (existingColumns.includes('unrealised_pnl') && !existingColumns.includes('unrealized_pnl')) {
            console.log('🔄 Renomeando unrealised_pnl para unrealized_pnl...');
            
            await pool.query(`
                ALTER TABLE active_positions 
                RENAME COLUMN unrealised_pnl TO unrealized_pnl;
            `);
            
            console.log('✅ Coluna renomeada!');
        }

        // 4. Verificar resultado final
        const finalCheck = await pool.query(`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = 'active_positions' 
            AND column_name = 'unrealized_pnl';
        `);

        if (finalCheck.rows.length > 0) {
            const col = finalCheck.rows[0];
            console.log('\n📊 COLUNA FINAL:');
            console.log(`   Nome: ${col.column_name}`);
            console.log(`   Tipo: ${col.data_type}`);
            console.log(`   Permite NULL: ${col.is_nullable}`);
            console.log(`   Padrão: ${col.column_default}`);
        }

        // 5. Testar uma query
        console.log('\n🔍 TESTANDO QUERY...');
        const testResult = await pool.query(`
            SELECT COUNT(*) as total, 
                   AVG(COALESCE(unrealized_pnl, 0)) as avg_pnl
            FROM active_positions;
        `);

        console.log(`✅ Query funcionou! Total: ${testResult.rows[0].total}, Avg PnL: ${testResult.rows[0].avg_pnl}`);

        console.log('\n🎉 CORREÇÃO CONCLUÍDA COM SUCESSO!');
        console.log('==================================');

    } catch (error) {
        console.error('❌ Erro na correção:', error.message);
        console.error('   Detail:', error.detail);
        console.error('   Hint:', error.hint);
        throw error;
    }
}

async function main() {
    try {
        await corrigirColunaPnL();
    } catch (error) {
        console.error('❌ Falha na execução:', error.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = { corrigirColunaPnL };
