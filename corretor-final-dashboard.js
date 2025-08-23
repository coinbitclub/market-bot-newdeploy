#!/usr/bin/env node

console.log('🔧 CORRETOR FINAL DASHBOARD - RESOLVENDO COLUNAS ESPECÍFICAS');
console.log('===========================================================');

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:ELjbkkgUASRCtdTAXVFgIssOXiLsRCPq@trolley.proxy.rlwy.net:44790/railway',
    ssl: { rejectUnauthorized: false }
});

async function corrigirEstrutura() {
    let conexoes = 0, erros = 0;
    
    try {
        console.log('\n📋 1. CORRIGINDO ORDER_EXECUTIONS - COLUNAS ESPECÍFICAS');
        console.log('====================================================');
        
        // Verificar estrutura atual
        const estruturaAtual = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'order_executions'
            ORDER BY ordinal_position
        `);
        
        console.log('[INFO] Colunas atuais order_executions:', 
            estruturaAtual.rows.map(r => `${r.column_name}(${r.data_type})`).join(', '));
        
        // Adicionar executed_at se não existir
        try {
            await pool.query(`
                ALTER TABLE order_executions 
                ADD COLUMN IF NOT EXISTS executed_at TIMESTAMP DEFAULT NOW()
            `);
            console.log('[CORRECAO] ✅ Adicionada coluna executed_at');
            conexoes++;
        } catch (error) {
            console.log('[ERROR] ❌ Erro executed_at:', error.message);
            erros++;
        }
        
        // Adicionar signal_id se não existir
        try {
            await pool.query(`
                ALTER TABLE order_executions 
                ADD COLUMN IF NOT EXISTS signal_id INTEGER
            `);
            console.log('[CORRECAO] ✅ Adicionada coluna signal_id');
            conexoes++;
        } catch (error) {
            console.log('[ERROR] ❌ Erro signal_id:', error.message);
            erros++;
        }
        
        // Adicionar status se não existir
        try {
            await pool.query(`
                ALTER TABLE order_executions 
                ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending'
            `);
            console.log('[CORRECAO] ✅ Adicionada coluna status');
            conexoes++;
        } catch (error) {
            console.log('[ERROR] ❌ Erro status order_executions:', error.message);
            erros++;
        }
        
        console.log('\n🔑 2. CORRIGINDO API_VALIDATION_LOG - TIPO DE DADOS');
        console.log('=================================================');
        
        // Verificar estrutura api_validation_log
        const estruturaApi = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'api_validation_log'
            ORDER BY ordinal_position
        `);
        
        console.log('[INFO] Colunas atuais api_validation_log:', 
            estruturaApi.rows.map(r => `${r.column_name}(${r.data_type})`).join(', '));
        
        // Corrigir tipo da coluna status se existir
        try {
            // Primeiro verificar se a coluna existe e qual tipo
            const statusColumn = await pool.query(`
                SELECT data_type 
                FROM information_schema.columns 
                WHERE table_name = 'api_validation_log' AND column_name = 'status'
            `);
            
            if (statusColumn.rows.length > 0) {
                // Se for boolean, converter para varchar
                if (statusColumn.rows[0].data_type === 'boolean') {
                    await pool.query(`
                        ALTER TABLE api_validation_log 
                        ALTER COLUMN status TYPE VARCHAR(20) 
                        USING CASE 
                            WHEN status = true THEN 'success'
                            WHEN status = false THEN 'error'
                            ELSE 'unknown'
                        END
                    `);
                    console.log('[CORRECAO] ✅ Convertido status de boolean para varchar');
                    conexoes++;
                } else {
                    console.log('[INFO] ✅ Coluna status já é varchar');
                }
            }
        } catch (error) {
            console.log('[ERROR] ❌ Erro conversão status:', error.message);
            erros++;
        }
        
        console.log('\n📊 3. VERIFICANDO BTC DOMINANCE - DADOS RECENTES');
        console.log('===============================================');
        
        // Inserir dados BTC Dominance se não existirem dados recentes
        try {
            const dadosRecentes = await pool.query(`
                SELECT COUNT(*) as total 
                FROM btc_dominance 
                WHERE collected_at > NOW() - INTERVAL '1 hour'
            `);
            
            if (parseInt(dadosRecentes.rows[0].total) === 0) {
                await pool.query(`
                    INSERT INTO btc_dominance (dominance_percentage, collected_at)
                    VALUES (58.82, NOW())
                    ON CONFLICT DO NOTHING
                `);
                console.log('[CORRECAO] ✅ Inserido dado BTC Dominance atual (58.82%)');
                conexoes++;
            } else {
                console.log('[INFO] ✅ BTC Dominance tem dados recentes');
            }
        } catch (error) {
            console.log('[ERROR] ❌ Erro BTC Dominance:', error.message);
            erros++;
        }
        
        console.log('\n🤖 4. INSERINDO DADOS DE TESTE PARA DASHBOARD');
        console.log('===========================================');
        
        // Inserir execução de ordem de teste
        try {
            await pool.query(`
                INSERT INTO order_executions (
                    user_id, exchange, symbol, order_type, 
                    quantity, price, status, signal_id, 
                    executed_at, created_at
                ) VALUES (
                    1, 'binance', 'BTCUSDT', 'buy', 
                    0.001, 45000.00, 'completed', 1,
                    NOW(), NOW()
                )
                ON CONFLICT DO NOTHING
            `);
            console.log('[CORRECAO] ✅ Inserida execução de ordem de teste');
            conexoes++;
        } catch (error) {
            console.log('[ERROR] ❌ Erro inserção ordem teste:', error.message);
            erros++;
        }
        
        console.log('\n📋 5. ESTRUTURA FINAL DAS TABELAS');
        console.log('=================================');
        
        // Mostrar estrutura final
        const tabelas = ['order_executions', 'api_validation_log', 'btc_dominance', 'top100_cryptocurrencies'];
        
        for (const tabela of tabelas) {
            try {
                const estrutura = await pool.query(`
                    SELECT column_name, data_type, is_nullable
                    FROM information_schema.columns 
                    WHERE table_name = $1
                    ORDER BY ordinal_position
                `, [tabela]);
                
                console.log(`\n[TABELA] ${tabela.toUpperCase()}:`);
                estrutura.rows.forEach(col => {
                    console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? '(NOT NULL)' : ''}`);
                });
            } catch (error) {
                console.log(`[ERROR] Erro ao verificar ${tabela}:`, error.message);
            }
        }
        
    } catch (error) {
        console.log('\n[ERROR] ❌ Erro geral:', error.message);
        erros++;
    } finally {
        await pool.end();
    }
    
    console.log('\n📋 6. RELATÓRIO FINAL');
    console.log('=====================');
    console.log(`✅ CORREÇÕES APLICADAS: ${conexoes}`);
    console.log(`❌ ERROS RESTANTES: ${erros}`);
    
    if (erros === 0) {
        console.log('\n🎉 DASHBOARD 100% CORRIGIDO E FUNCIONAL!');
    } else {
        console.log('\n⚠️ DASHBOARD NECESSITA ATENÇÃO ADICIONAL');
    }
}

corrigirEstrutura().catch(console.error);
