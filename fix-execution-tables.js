#!/usr/bin/env node

/**
 * 🔧 CORREÇÃO FINAL - CRIAR TABELAS DE EXECUÇÃO
 * =============================================
 */

const { Pool } = require('pg');
require('dotenv').config({ path: '.env.production' });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:ELjbkkgUASRCtdTAXVFgIssOXiLsRCPq@trolley.proxy.rlwy.net:44790/railway',
    ssl: { rejectUnauthorized: false }
});

async function criarTabelasExecucao() {
    console.log('🔧 Criando/corrigindo tabelas de execução...\n');
    
    try {
        // Criar tabela trading_executions se não existir
        await pool.query(`
            CREATE TABLE IF NOT EXISTS trading_executions (
                id SERIAL PRIMARY KEY,
                signal_id INTEGER,
                exchange VARCHAR(20),
                order_id VARCHAR(100),
                symbol VARCHAR(20),
                side VARCHAR(10),
                amount DECIMAL(15,8),
                price DECIMAL(15,8),
                status VARCHAR(20),
                error_message TEXT,
                executed_at TIMESTAMP DEFAULT NOW(),
                raw_response JSONB
            )
        `);
        
        console.log('✅ Tabela trading_executions criada/verificada');
        
        // Verificar se signal_id existe na tabela signals
        const signalsCheck = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'signals' 
            AND column_name = 'id'
        `);
        
        if (signalsCheck.rows.length > 0) {
            console.log('✅ Coluna signals.id existe');
            
            // Adicionar foreign key se não existir
            try {
                await pool.query(`
                    ALTER TABLE trading_executions 
                    ADD CONSTRAINT fk_signal_id 
                    FOREIGN KEY (signal_id) REFERENCES signals(id)
                `);
                console.log('✅ Foreign key adicionada');
            } catch (error) {
                if (error.code === '42710') {
                    console.log('✅ Foreign key já existe');
                } else {
                    console.log('⚠️ Erro ao criar foreign key (não crítico):', error.message);
                }
            }
        }
        
        // Testar consulta de sinais recentes
        const testQuery = `
            SELECT 
                s.id, s.symbol, s.action, s.status, s.processed_at,
                COUNT(te.id) as execution_count
            FROM signals s
            LEFT JOIN trading_executions te ON s.id = te.signal_id
            GROUP BY s.id, s.symbol, s.action, s.status, s.processed_at
            ORDER BY s.processed_at DESC 
            LIMIT 5
        `;
        
        const result = await pool.query(testQuery);
        console.log('✅ Query de sinais funcionando');
        console.log('\n📊 SINAIS RECENTES:');
        result.rows.forEach((row, index) => {
            console.log(`${index + 1}. ID:${row.id} | ${row.symbol} ${row.action} | Execuções: ${row.execution_count}`);
        });
        
        console.log('\n🎯 CORREÇÃO CONCLUÍDA! Sistema pronto para operações reais.');
        console.log('\n📋 PRÓXIMOS PASSOS:');
        console.log('1. 🔑 Configurar chaves API reais das exchanges');
        console.log('2. 🚀 Reiniciar o sistema');
        console.log('3. 📡 Testar com sinal real do TradingView');
        
    } catch (error) {
        console.error('❌ Erro:', error.message);
    }
    
    process.exit(0);
}

criarTabelasExecucao();
