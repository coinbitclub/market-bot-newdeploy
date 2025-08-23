#!/usr/bin/env node

/**
 * 🔍 INVESTIGAÇÃO DO BANCO DE DADOS REAL
 * =====================================
 */

const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:ELjbkkgUASRCtdTAXVFgIssOXiLsRCPq@trolley.proxy.rlwy.net:44790/railway',
    ssl: { rejectUnauthorized: false }
});

async function investigateDatabase() {
    try {
        console.log('🔍 INVESTIGANDO ESTRUTURA REAL DO BANCO...');
        console.log('==========================================');
        console.log('');

        // 1. Listar todas as tabelas
        const tablesQuery = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name
        `);

        console.log('📊 TABELAS EXISTENTES:');
        const tables = tablesQuery.rows.map(row => row.table_name);
        tables.forEach(table => console.log(`  • ${table}`));
        
        console.log('');
        console.log('🔍 VERIFICANDO CONTEÚDO DAS TABELAS...');
        console.log('');

        // 2. Verificar tabelas principais
        const tablesToCheck = [
            'users',
            'trading_signals', 
            'admin_logs',
            'active_positions',
            'ai_market_analysis',
            'signal_metrics_log',
            'market_direction_history',
            'ticker_performance_metrics',
            'user_balances',
            'balance_history',
            'btc_dominance_analysis',
            'rsi_overheated_log',
            'fear_greed_index',
            'trades',
            'positions'
        ];

        for (const table of tablesToCheck) {
            try {
                const result = await pool.query(`SELECT COUNT(*) as count FROM ${table}`);
                console.log(`📋 ${table}: ${result.rows[0].count} registros`);
            } catch (error) {
                console.log(`❌ ${table}: não existe ou erro (${error.message.split('\n')[0]})`);
            }
        }

        console.log('');
        console.log('🔍 ANALISANDO ESTRUTURA DOS DADOS REAIS...');
        console.log('');

        // 3. Verificar estrutura da tabela users
        try {
            const usersStructure = await pool.query(`
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = 'users' 
                ORDER BY ordinal_position
            `);
            
            console.log('👥 ESTRUTURA DA TABELA USERS:');
            usersStructure.rows.forEach(col => {
                console.log(`  • ${col.column_name}: ${col.data_type}`);
            });
        } catch (error) {
            console.log('❌ Erro ao verificar estrutura users:', error.message);
        }

        console.log('');

        // 4. Verificar últimos sinais de trading
        try {
            const recentSignals = await pool.query(`
                SELECT ticker, signal_type, created_at 
                FROM trading_signals 
                ORDER BY created_at DESC 
                LIMIT 5
            `);
            
            console.log('📡 ÚLTIMOS SINAIS DE TRADING:');
            recentSignals.rows.forEach(signal => {
                console.log(`  • ${signal.ticker} - ${signal.signal_type} - ${signal.created_at}`);
            });
        } catch (error) {
            console.log('❌ Erro ao buscar sinais:', error.message);
        }

        console.log('');

        // 5. Verificar logs administrativos recentes
        try {
            const recentLogs = await pool.query(`
                SELECT event_type, description, created_at 
                FROM admin_logs 
                ORDER BY created_at DESC 
                LIMIT 5
            `);
            
            console.log('📜 LOGS ADMINISTRATIVOS RECENTES:');
            recentLogs.rows.forEach(log => {
                console.log(`  • ${log.event_type}: ${log.description?.substring(0, 50)}... - ${log.created_at}`);
            });
        } catch (error) {
            console.log('❌ Erro ao buscar logs:', error.message);
        }

        console.log('');

        // 6. Verificar posições ativas
        try {
            const activePos = await pool.query(`
                SELECT user_id, ticker, side, status, pnl, created_at 
                FROM active_positions 
                WHERE status = 'ACTIVE'
                ORDER BY created_at DESC 
                LIMIT 5
            `);
            
            console.log('📈 POSIÇÕES ATIVAS:');
            activePos.rows.forEach(pos => {
                console.log(`  • User ${pos.user_id}: ${pos.ticker} ${pos.side} - PnL: ${pos.pnl} - ${pos.created_at}`);
            });
        } catch (error) {
            console.log('❌ Erro ao buscar posições:', error.message);
        }

        console.log('');
        console.log('✅ INVESTIGAÇÃO CONCLUÍDA!');

    } catch (error) {
        console.error('❌ Erro geral:', error.message);
    } finally {
        await pool.end();
    }
}

investigateDatabase();
