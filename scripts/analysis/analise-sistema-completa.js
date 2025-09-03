#!/usr/bin/env node

console.log('🔍 ANÁLISE COMPLETA DO SISTEMA - DIAGNÓSTICO DETALHADO');
console.log('====================================================');

const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'process.env.DATABASE_URL',
    ssl: { rejectUnauthorized: false }
});

async function analiseSistemaCompleta() {
    try {
        console.log('\n📊 1. VERIFICANDO USUÁRIOS E CHAVES API:');
        console.log('========================================');
        
        const usuarios = await pool.query(`
            SELECT 
                u.id, u.username, u.email, u.is_active,
                uak.exchange, uak.api_key, uak.is_active as api_ativa,
                uak.environment, uak.last_validated,
                uak.validation_status
            FROM users u
            LEFT JOIN user_api_keys uak ON u.id = uak.user_id
            WHERE u.id IN (14, 15, 16)
            ORDER BY u.id, uak.exchange
        `);
        
        let usuarioAtual = null;
        usuarios.rows.forEach(row => {
            if (row.id !== usuarioAtual) {
                console.log(`\n👤 USUÁRIO ${row.id}: ${row.username || row.email || 'SEM NOME'}`);
                console.log(`   Status: ${row.is_active ? '✅ ATIVO' : '❌ INATIVO'}`);
                usuarioAtual = row.id;
            }
            if (row.exchange) {
                console.log(`   📊 ${row.exchange}:`);
                console.log(`      API Key: ${row.api_key ? row.api_key.substring(0, 10) + '...' : '❌ SEM CHAVE'}`);
                console.log(`      Status API: ${row.api_ativa ? '✅ ATIVA' : '❌ INATIVA'}`);
                console.log(`      Ambiente: ${row.environment || 'N/A'}`);
                console.log(`      Última validação: ${row.last_validated || 'NUNCA'}`);
                console.log(`      Status validação: ${row.validation_status || 'PENDENTE'}`);
            } else {
                console.log('   ⚠️ SEM CHAVES API CONFIGURADAS');
            }
        });

        console.log('\n📊 2. VERIFICANDO TOP 100 E FEAR & GREED:');
        console.log('=========================================');
        
        // Verificar Fear & Greed Index
        const fearGreed = await pool.query(`
            SELECT value, fear_greed_value, category, collected_at 
            FROM fear_greed_index 
            ORDER BY collected_at DESC 
            LIMIT 1
        `);
        
        if (fearGreed.rows.length > 0) {
            const fg = fearGreed.rows[0];
            console.log(`Fear & Greed Index: ${fg.value || fg.fear_greed_value} (${fg.category})`);
            console.log(`Última atualização: ${fg.collected_at}`);
        } else {
            console.log('❌ SEM DADOS DO FEAR & GREED INDEX');
        }
        
        // Verificar BTC Dominance
        const btcDom = await pool.query(`
            SELECT dominance_percentage, collected_at 
            FROM btc_dominance 
            ORDER BY collected_at DESC 
            LIMIT 1
        `);
        
        if (btcDom.rows.length > 0) {
            const dom = btcDom.rows[0];
            console.log(`BTC Dominance: ${dom.dominance_percentage}%`);
            console.log(`Última atualização: ${dom.collected_at}`);
        } else {
            console.log('❌ SEM DADOS DO BTC DOMINANCE');
        }

        console.log('\n📊 3. VERIFICANDO MARKET DIRECTION:');
        console.log('==================================');
        
        const marketDir = await pool.query(`
            SELECT current_direction, last_updated, top100_percentage_up, top100_percentage_down
            FROM market_direction 
            ORDER BY last_updated DESC 
            LIMIT 1
        `);
        
        if (marketDir.rows.length > 0) {
            const md = marketDir.rows[0];
            console.log(`Direção atual: ${md.current_direction}`);
            console.log(`TOP 100 em alta: ${md.top100_percentage_up}%`);
            console.log(`TOP 100 em baixa: ${md.top100_percentage_down}%`);
            console.log(`Última atualização: ${md.last_updated}`);
        } else {
            console.log('❌ SEM DADOS DE MARKET DIRECTION');
        }

        console.log('\n📊 4. ANALISANDO SINAIS REJEITADOS:');
        console.log('===================================');
        
        const sinaisRejeitados = await pool.query(`
            SELECT 
                signal_type, ticker, ai_decision, ai_reason,
                condition_1_market_direction, condition_1_details,
                condition_2_top100_aligned, condition_2_details,
                condition_3_confidence_adequate, condition_3_details,
                condition_4_history_favorable, condition_4_details,
                market_direction, top100_percentage, confidence_score,
                processed_at
            FROM signal_metrics_log 
            WHERE ai_decision = false
            ORDER BY processed_at DESC 
            LIMIT 3
        `);
        
        sinaisRejeitados.rows.forEach((sinal, index) => {
            console.log(`\n🔍 SINAL REJEITADO ${index + 1}:`);
            console.log(`   Tipo: ${sinal.signal_type} (${sinal.ticker})`);
            console.log(`   Razão: ${sinal.ai_reason}`);
            console.log(`   Condição 1 (Market Direction): ${sinal.condition_1_market_direction ? '✅' : '❌'}`);
            console.log(`      ${sinal.condition_1_details}`);
            console.log(`   Condição 2 (TOP 100): ${sinal.condition_2_top100_aligned ? '✅' : '❌'}`);
            console.log(`      ${sinal.condition_2_details}`);
            console.log(`   Condição 3 (Confiança): ${sinal.condition_3_confidence_adequate ? '✅' : '❌'}`);
            console.log(`      ${sinal.condition_3_details}`);
            console.log(`   Condição 4 (Histórico): ${sinal.condition_4_history_favorable ? '✅' : '❌'}`);
            console.log(`      ${sinal.condition_4_details}`);
            console.log(`   Market Direction: ${sinal.market_direction}`);
            console.log(`   TOP 100: ${sinal.top100_percentage}%`);
            console.log(`   Confiança: ${sinal.confidence_score}`);
        });

        console.log('\n📊 5. VERIFICANDO POSIÇÕES E EXECUÇÕES:');
        console.log('======================================');
        
        const posicoes = await pool.query(`
            SELECT COUNT(*) as total FROM positions WHERE user_id IN (14, 15, 16)
        `);
        
        const execucoes = await pool.query(`
            SELECT COUNT(*) as total FROM order_executions WHERE user_id IN (14, 15, 16)
        `);
        
        console.log(`Posições abertas (usuários 14,15,16): ${posicoes.rows[0].total}`);
        console.log(`Execuções de ordem (usuários 14,15,16): ${execucoes.rows[0].total}`);

        console.log('\n📊 6. VERIFICANDO SALDOS DOS USUÁRIOS:');
        console.log('=====================================');
        
        try {
            const saldos = await pool.query(`
                SELECT user_id, exchange, balance_usd, last_update
                FROM user_balances 
                WHERE user_id IN (14, 15, 16)
                ORDER BY user_id, exchange
            `);
            
            if (saldos.rows.length > 0) {
                saldos.rows.forEach(saldo => {
                    console.log(`Usuário ${saldo.user_id} (${saldo.exchange}): $${saldo.balance_usd} - ${saldo.last_update}`);
                });
            } else {
                console.log('❌ SEM DADOS DE SALDOS');
            }
        } catch (error) {
            console.log('❌ Tabela user_balances não existe');
        }

        console.log('\n📊 7. VERIFICANDO CONFIGURAÇÕES DO SISTEMA:');
        console.log('==========================================');
        
        // Verificar se há configurações que impedem execução
        try {
            const configs = await pool.query(`
                SELECT * FROM system_config WHERE active = true
            `);
            
            if (configs.rows.length > 0) {
                configs.rows.forEach(config => {
                    console.log(`Config: ${config.config_key} = ${config.config_value}`);
                });
            } else {
                console.log('✅ Nenhuma configuração restritiva ativa');
            }
        } catch (error) {
            console.log('✅ Tabela system_config não existe (sem restrições)');
        }

        console.log('\n🎯 RESUMO DOS PROBLEMAS IDENTIFICADOS:');
        console.log('=====================================');
        
        // Análise do problema principal
        if (marketDir.rows.length === 0) {
            console.log('❌ PROBLEMA 1: Market Direction não está sendo atualizado');
        }
        
        if (sinaisRejeitados.rows.length > 0) {
            const ultimoSinal = sinaisRejeitados.rows[0];
            if (ultimoSinal.condition_1_details.includes('UNKNOWN')) {
                console.log('❌ PROBLEMA 2: Signal_type sendo interpretado como UNKNOWN');
            }
            if (ultimoSinal.top100_percentage === '0' || ultimoSinal.top100_percentage === 0) {
                console.log('❌ PROBLEMA 3: TOP 100 percentage está zerado');
            }
        }
        
        if (usuarios.rows.filter(u => u.validation_status !== 'valid').length > 0) {
            console.log('❌ PROBLEMA 4: APIs não estão sendo validadas corretamente');
        }
        
        console.log('\n🔧 RECOMENDAÇÕES DE CORREÇÃO:');
        console.log('============================');
        console.log('1. Corrigir interpretação do signal_type (COMPRA LONGA -> BUY_LONG)');
        console.log('2. Verificar atualização do Market Direction');
        console.log('3. Corrigir cálculo do TOP 100 percentage');
        console.log('4. Validar chaves API dos usuários 14, 15, 16');
        console.log('5. Verificar sistema de execução de ordens');

    } catch (error) {
        console.error('❌ Erro na análise:', error.message);
    } finally {
        await pool.end();
    }
}

analiseSistemaCompleta().catch(console.error);
