#!/usr/bin/env node

/**
 * 🔍 VERIFICAÇÃO DE ESTRUTURA DE TABELAS
 * =====================================
 */

const { Pool } = require('pg');
require('dotenv').config({ path: '.env.production' });

async function checkTableStructures() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log('🔍 VERIFICANDO ESTRUTURAS DAS TABELAS');
        console.log('=====================================');

        // Verificar signals
        console.log('\n📋 TABELA: signals');
        const signalsColumns = await pool.query(`
            SELECT column_name, data_type, is_nullable 
            FROM information_schema.columns 
            WHERE table_name = 'signals' 
            ORDER BY ordinal_position
        `);
        
        signalsColumns.rows.forEach(row => {
            console.log(`   ${row.column_name}: ${row.data_type} ${row.is_nullable === 'YES' ? '(NULL)' : '(NOT NULL)'}`);
        });

        // Verificar users
        console.log('\n📋 TABELA: users');
        const usersColumns = await pool.query(`
            SELECT column_name, data_type, is_nullable 
            FROM information_schema.columns 
            WHERE table_name = 'users' 
            ORDER BY ordinal_position
        `);
        
        usersColumns.rows.forEach(row => {
            console.log(`   ${row.column_name}: ${row.data_type} ${row.is_nullable === 'YES' ? '(NULL)' : '(NOT NULL)'}`);
        });

        // Verificar user_api_keys
        console.log('\n📋 TABELA: user_api_keys');
        const apiKeysColumns = await pool.query(`
            SELECT column_name, data_type, is_nullable 
            FROM information_schema.columns 
            WHERE table_name = 'user_api_keys' 
            ORDER BY ordinal_position
        `);
        
        apiKeysColumns.rows.forEach(row => {
            console.log(`   ${row.column_name}: ${row.data_type} ${row.is_nullable === 'YES' ? '(NULL)' : '(NOT NULL)'}`);
        });

        // Verificar quais dados estão NULL nos signals
        console.log('\n🔍 ANÁLISE DE DADOS NULL EM SIGNALS');
        const signalsData = await pool.query(`
            SELECT 
                COUNT(*) as total,
                COUNT(CASE WHEN symbol IS NULL THEN 1 END) as symbol_null,
                COUNT(CASE WHEN action IS NULL THEN 1 END) as action_null,
                COUNT(CASE WHEN signal_type IS NULL THEN 1 END) as signal_type_null,
                COUNT(CASE WHEN ticker IS NULL THEN 1 END) as ticker_null
            FROM signals
        `);
        
        const data = signalsData.rows[0];
        console.log(`   Total: ${data.total}`);
        console.log(`   symbol NULL: ${data.symbol_null}`);
        console.log(`   action NULL: ${data.action_null}`);
        console.log(`   signal_type NULL: ${data.signal_type_null}`);
        console.log(`   ticker NULL: ${data.ticker_null}`);

        // Exemplo de dados da signals
        console.log('\n📄 EXEMPLOS DE DADOS EM SIGNALS');
        const sampleSignals = await pool.query(`
            SELECT id, symbol, action, signal_type, ticker, timestamp 
            FROM signals 
            ORDER BY timestamp DESC 
            LIMIT 5
        `);
        
        sampleSignals.rows.forEach(row => {
            console.log(`   ID: ${row.id}, Symbol: ${row.symbol}, Action: ${row.action}, Type: ${row.signal_type}, Ticker: ${row.ticker}`);
        });

    } catch (error) {
        console.error('❌ Erro:', error.message);
    } finally {
        await pool.end();
    }
}

checkTableStructures();
