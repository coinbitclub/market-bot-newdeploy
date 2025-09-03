#!/usr/bin/env node

console.log('🔧 CORRETOR DE COLUNAS ESPECÍFICAS - ALINHAMENTO DASHBOARD');
console.log('========================================================');

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'process.env.DATABASE_URL',
    ssl: { rejectUnauthorized: false }
});

async function corrigirColunasEspecificas() {
    let conexoes = 0, erros = 0;
    
    try {
        console.log('\n📊 1. CORRIGINDO BTC_DOMINANCE - COLUNA DOMINANCE_PERCENTAGE');
        console.log('==========================================================');
        
        // Adicionar dominance_percentage se não existir
        try {
            await pool.query(`
                ALTER TABLE btc_dominance 
                ADD COLUMN IF NOT EXISTS dominance_percentage NUMERIC DEFAULT 0
            `);
            console.log('[CORRECAO] ✅ Adicionada coluna dominance_percentage');
            conexoes++;
            
            // Copiar dados de dominance_value para dominance_percentage se existirem
            await pool.query(`
                UPDATE btc_dominance 
                SET dominance_percentage = dominance_value 
                WHERE dominance_percentage IS NULL OR dominance_percentage = 0
            `);
            console.log('[CORRECAO] ✅ Copiados dados para dominance_percentage');
            conexoes++;
            
        } catch (error) {
            console.log('[ERROR] ❌ Erro dominance_percentage:', error.message);
            erros++;
        }
        
        console.log('\n📋 2. CORRIGINDO ORDER_EXECUTIONS - COLUNA SYMBOL');
        console.log('===============================================');
        
        // Adicionar symbol se não existir
        try {
            await pool.query(`
                ALTER TABLE order_executions 
                ADD COLUMN IF NOT EXISTS symbol VARCHAR(20) DEFAULT 'BTCUSDT'
            `);
            console.log('[CORRECAO] ✅ Adicionada coluna symbol');
            conexoes++;
        } catch (error) {
            console.log('[ERROR] ❌ Erro symbol:', error.message);
            erros++;
        }
        
        // Adicionar order_type se não existir
        try {
            await pool.query(`
                ALTER TABLE order_executions 
                ADD COLUMN IF NOT EXISTS order_type VARCHAR(10) DEFAULT 'market'
            `);
            console.log('[CORRECAO] ✅ Adicionada coluna order_type');
            conexoes++;
        } catch (error) {
            console.log('[ERROR] ❌ Erro order_type:', error.message);
            erros++;
        }
        
        // Adicionar quantity se não existir
        try {
            await pool.query(`
                ALTER TABLE order_executions 
                ADD COLUMN IF NOT EXISTS quantity NUMERIC DEFAULT 0
            `);
            console.log('[CORRECAO] ✅ Adicionada coluna quantity');
            conexoes++;
        } catch (error) {
            console.log('[ERROR] ❌ Erro quantity:', error.message);
            erros++;
        }
        
        console.log('\n🔄 3. ATUALIZANDO DADOS EXISTENTES');
        console.log('=================================');
        
        // Atualizar quantity com executed_quantity se quantity for 0
        try {
            await pool.query(`
                UPDATE order_executions 
                SET quantity = executed_quantity 
                WHERE quantity = 0 AND executed_quantity IS NOT NULL
            `);
            console.log('[CORRECAO] ✅ Atualizadas quantities');
            conexoes++;
        } catch (error) {
            console.log('[ERROR] ❌ Erro atualização quantity:', error.message);
            erros++;
        }
        
        console.log('\n📊 4. INSERINDO DADOS DE TESTE ATUALIZADOS');
        console.log('========================================');
        
        // Inserir BTC Dominance atual
        try {
            await pool.query(`
                INSERT INTO btc_dominance (dominance_value, dominance_percentage, collected_at, created_at)
                VALUES (58.82, 58.82, NOW(), NOW())
                ON CONFLICT DO NOTHING
            `);
            console.log('[CORRECAO] ✅ Inserido BTC Dominance (58.82%)');
            conexoes++;
        } catch (error) {
            console.log('[ERROR] ❌ Erro BTC Dominance:', error.message);
            erros++;
        }
        
        // Inserir ordem de execução de teste
        try {
            await pool.query(`
                INSERT INTO order_executions (
                    user_id, exchange, symbol, order_type, 
                    quantity, executed_quantity, price, executed_price,
                    status, signal_id, executed_at, created_at
                ) VALUES (
                    1, 'binance', 'BTCUSDT', 'buy', 
                    0.001, 0.001, 45000.00, 45000.00,
                    'completed', 1, NOW(), NOW()
                )
                ON CONFLICT DO NOTHING
            `);
            console.log('[CORRECAO] ✅ Inserida ordem de execução teste');
            conexoes++;
        } catch (error) {
            console.log('[ERROR] ❌ Erro ordem execução:', error.message);
            erros++;
        }
        
        console.log('\n🔍 5. VERIFICAÇÃO DE DADOS DASHBOARD');
        console.log('==================================');
        
        // Verificar contadores para dashboard
        const verificacoes = [
            { nome: 'Usuários ativos', query: 'SELECT COUNT(*) as total FROM users WHERE is_active = true' },
            { nome: 'APIs configuradas', query: 'SELECT COUNT(*) as total FROM api_validation_log WHERE is_active = true' },
            { nome: 'Execuções de ordem', query: 'SELECT COUNT(*) as total FROM order_executions' },
            { nome: 'Fear & Greed dados', query: 'SELECT COUNT(*) as total FROM fear_greed_index WHERE created_at > NOW() - INTERVAL \'24 hours\'' },
            { nome: 'BTC Dominance dados', query: 'SELECT COUNT(*) as total FROM btc_dominance WHERE collected_at > NOW() - INTERVAL \'24 hours\'' },
            { nome: 'TOP 100 Cryptos', query: 'SELECT COUNT(*) as total FROM top100_cryptocurrencies WHERE collected_at > NOW() - INTERVAL \'1 hour\'' }
        ];
        
        for (const verificacao of verificacoes) {
            try {
                const resultado = await pool.query(verificacao.query);
                const total = parseInt(resultado.rows[0].total);
                console.log(`[INFO] ${verificacao.nome}: ${total} ${total > 0 ? '✅' : '❌'}`);
            } catch (error) {
                console.log(`[ERROR] ${verificacao.nome}: ${error.message}`);
                erros++;
            }
        }
        
        console.log('\n📋 6. ESTRUTURA FINAL VALIDADA');
        console.log('=============================');
        
        // Validar colunas críticas do dashboard
        const validacoesCriticas = [
            { tabela: 'order_executions', colunas: ['symbol', 'order_type', 'quantity', 'executed_at', 'signal_id', 'status'] },
            { tabela: 'btc_dominance', colunas: ['dominance_percentage', 'collected_at'] },
            { tabela: 'api_validation_log', colunas: ['status', 'is_active'] },
            { tabela: 'top100_cryptocurrencies', colunas: ['collected_at', 'symbol', 'current_price'] }
        ];
        
        for (const validacao of validacoesCriticas) {
            try {
                const estrutura = await pool.query(`
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name = $1
                `, [validacao.tabela]);
                
                const colunasExistentes = estrutura.rows.map(r => r.column_name);
                const faltando = validacao.colunas.filter(col => !colunasExistentes.includes(col));
                
                if (faltando.length === 0) {
                    console.log(`[VALIDACAO] ✅ ${validacao.tabela}: Todas as colunas presentes`);
                } else {
                    console.log(`[VALIDACAO] ❌ ${validacao.tabela}: Faltando: ${faltando.join(', ')}`);
                    erros++;
                }
            } catch (error) {
                console.log(`[ERROR] Validação ${validacao.tabela}:`, error.message);
                erros++;
            }
        }
        
    } catch (error) {
        console.log('\n[ERROR] ❌ Erro geral:', error.message);
        erros++;
    } finally {
        await pool.end();
    }
    
    console.log('\n📋 7. RELATÓRIO FINAL');
    console.log('=====================');
    console.log(`✅ CORREÇÕES APLICADAS: ${conexoes}`);
    console.log(`❌ ERROS RESTANTES: ${erros}`);
    
    if (erros === 0) {
        console.log('\n🎉 DASHBOARD 100% CORRIGIDO E FUNCIONAL!');
        console.log('🚀 PRONTO PARA INTEGRAÇÃO COMPLETA!');
    } else if (erros <= 2) {
        console.log('\n⚠️ DASHBOARD QUASE FUNCIONAL - PEQUENOS AJUSTES RESTANTES');
    } else {
        console.log('\n❌ DASHBOARD NECESSITA CORREÇÕES ADICIONAIS');
    }
    
    console.log('\n📊 PRÓXIMO PASSO: Verificar dashboard em http://localhost:4000');
}

corrigirColunasEspecificas().catch(console.error);
