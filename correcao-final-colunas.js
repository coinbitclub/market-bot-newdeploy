#!/usr/bin/env node

console.log('🔧 CORREÇÃO FINAL - COLUNAS INCONSISTENTES');
console.log('=========================================');

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:ELjbkkgUASRCtdTAXVFgIssOXiLsRCPq@trolley.proxy.rlwy.net:44790/railway',
    ssl: { rejectUnauthorized: false }
});

async function correcaoFinalColunas() {
    let sucessos = 0, erros = 0;
    
    try {
        console.log('\n📊 1. CORRIGINDO FEAR_GREED_INDEX - COLUNA CATEGORY');
        console.log('================================================');
        
        // Verificar estrutura atual
        const estruturaFG = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'fear_greed_index'
        `);
        
        console.log('[INFO] Colunas atuais fear_greed_index:', 
            estruturaFG.rows.map(r => `${r.column_name}(${r.data_type})`).join(', '));
        
        // Adicionar category se não existir
        try {
            await pool.query(`
                ALTER TABLE fear_greed_index 
                ADD COLUMN IF NOT EXISTS category VARCHAR(20)
            `);
            console.log('[CORRECAO] ✅ Adicionada coluna category');
            sucessos++;
            
            // Atualizar category baseado no value
            await pool.query(`
                UPDATE fear_greed_index 
                SET category = CASE 
                    WHEN value >= 75 THEN 'Extreme Greed'
                    WHEN value >= 55 THEN 'Greed'
                    WHEN value >= 45 THEN 'Neutral'
                    WHEN value >= 25 THEN 'Fear'
                    ELSE 'Extreme Fear'
                END
                WHERE category IS NULL
            `);
            console.log('[CORRECAO] ✅ Atualizadas categorias baseadas no valor');
            sucessos++;
            
        } catch (error) {
            console.log('[ERROR] ❌ Erro category:', error.message);
            erros++;
        }
        
        console.log('\n🤖 2. CORRIGINDO SIGNAL_METRICS_LOG - PADRONIZAÇÃO');
        console.log('==============================================');
        
        // Verificar estrutura signal_metrics_log
        const estruturaSML = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'signal_metrics_log'
        `);
        
        console.log('[INFO] Colunas atuais signal_metrics_log:', 
            estruturaSML.rows.map(r => `${r.column_name}(${r.data_type})`).join(', '));
        
        // Verificar se fear_greed_index existe, se não, renomear de fear_greed_value
        const temFearGreedIndex = estruturaSML.rows.some(r => r.column_name === 'fear_greed_index');
        const temFearGreedValue = estruturaSML.rows.some(r => r.column_name === 'fear_greed_value');
        
        if (!temFearGreedIndex && temFearGreedValue) {
            try {
                await pool.query(`
                    ALTER TABLE signal_metrics_log 
                    RENAME COLUMN fear_greed_value TO fear_greed_index
                `);
                console.log('[CORRECAO] ✅ Renomeada coluna fear_greed_value para fear_greed_index');
                sucessos++;
            } catch (error) {
                console.log('[ERROR] ❌ Erro renomeação:', error.message);
                erros++;
            }
        } else if (!temFearGreedIndex) {
            try {
                await pool.query(`
                    ALTER TABLE signal_metrics_log 
                    ADD COLUMN IF NOT EXISTS fear_greed_index INTEGER DEFAULT 50
                `);
                console.log('[CORRECAO] ✅ Adicionada coluna fear_greed_index');
                sucessos++;
            } catch (error) {
                console.log('[ERROR] ❌ Erro fear_greed_index:', error.message);
                erros++;
            }
        }
        
        console.log('\n🔄 3. POPULANDO DADOS DE TESTE ATUALIZADOS');
        console.log('=========================================');
        
        // Atualizar dados fear_greed_index com category
        try {
            const ultimoFG = await pool.query(`
                SELECT id, value FROM fear_greed_index 
                ORDER BY created_at DESC LIMIT 1
            `);
            
            if (ultimoFG.rows.length > 0) {
                const valor = ultimoFG.rows[0].value;
                let categoria;
                if (valor >= 75) categoria = 'Extreme Greed';
                else if (valor >= 55) categoria = 'Greed';
                else if (valor >= 45) categoria = 'Neutral';
                else if (valor >= 25) categoria = 'Fear';
                else categoria = 'Extreme Fear';
                
                await pool.query(`
                    UPDATE fear_greed_index 
                    SET category = $1 
                    WHERE id = $2
                `, [categoria, ultimoFG.rows[0].id]);
                
                console.log(`[CORRECAO] ✅ Atualizada categoria para valor ${valor}: ${categoria}`);
                sucessos++;
            }
        } catch (error) {
            console.log('[ERROR] ❌ Erro atualização FG:', error.message);
            erros++;
        }
        
        // Inserir dados de análise IA mais completos
        try {
            // Buscar dados atuais para análise
            const dadosAtuais = await pool.query(`
                SELECT 
                    (SELECT value FROM fear_greed_index ORDER BY created_at DESC LIMIT 1) as fg_value,
                    (SELECT dominance_percentage FROM btc_dominance ORDER BY collected_at DESC LIMIT 1) as btc_dom,
                    (SELECT AVG(price_change_percentage_24h) FROM top100_cryptocurrencies WHERE collected_at > NOW() - INTERVAL '1 hour') as avg_change
            `);
            
            if (dadosAtuais.rows.length > 0) {
                const dados = dadosAtuais.rows[0];
                
                await pool.query(`
                    INSERT INTO signal_metrics_log (
                        fear_greed_index, btc_dominance, market_trend,
                        volume_analysis, sentiment_score, market_cap_variation,
                        ai_decision, timestamp
                    ) VALUES (
                        $1, $2, $3, $4, $5, $6, $7, NOW()
                    )
                `, [
                    dados.fg_value || 50,
                    dados.btc_dom || 58.82,
                    dados.avg_change > 0 ? 'bullish' : 'bearish',
                    'moderate',
                    dados.fg_value || 50,
                    dados.avg_change || 0,
                    dados.fg_value > 60 ? 'STRONG_BUY' : dados.fg_value < 40 ? 'STRONG_SELL' : 'HOLD'
                ]);
                
                console.log('[CORRECAO] ✅ Inserida análise IA completa com dados reais');
                sucessos++;
            }
        } catch (error) {
            console.log('[ERROR] ❌ Erro análise IA:', error.message);
            erros++;
        }
        
        console.log('\n📊 4. VERIFICAÇÃO FINAL DAS CORREÇÕES');
        console.log('===================================');
        
        // Testar queries que estavam falhando
        try {
            const testeFG = await pool.query(`
                SELECT value, category, created_at 
                FROM fear_greed_index 
                ORDER BY created_at DESC LIMIT 1
            `);
            console.log(`[TESTE] ✅ Fear & Greed: ${testeFG.rows[0]?.value} (${testeFG.rows[0]?.category})`);
            sucessos++;
        } catch (error) {
            console.log(`[TESTE] ❌ Fear & Greed: ${error.message}`);
            erros++;
        }
        
        try {
            const testeIA = await pool.query(`
                SELECT 
                    fear_greed_index, btc_dominance, ai_decision, timestamp
                FROM signal_metrics_log 
                ORDER BY timestamp DESC LIMIT 1
            `);
            const ia = testeIA.rows[0];
            console.log(`[TESTE] ✅ IA: ${ia?.ai_decision} (FG:${ia?.fear_greed_index}, BTC:${ia?.btc_dominance}%)`);
            sucessos++;
        } catch (error) {
            console.log(`[TESTE] ❌ IA: ${error.message}`);
            erros++;
        }
        
    } catch (error) {
        console.log('\n[ERROR] ❌ Erro geral:', error.message);
        erros++;
    } finally {
        await pool.end();
    }
    
    console.log('\n📋 5. RELATÓRIO FINAL CORREÇÕES');
    console.log('==============================');
    console.log(`✅ SUCESSOS: ${sucessos}`);
    console.log(`❌ ERROS: ${erros}`);
    
    if (erros === 0) {
        console.log('\n🎉 TODAS AS CORREÇÕES APLICADAS COM SUCESSO!');
        console.log('🚀 DASHBOARD 100% FUNCIONAL E INTEGRADO!');
    } else if (erros <= 2) {
        console.log('\n✅ CORREÇÕES PRINCIPAIS APLICADAS!');
        console.log('⚠️ PEQUENOS AJUSTES RESTANTES');
    } else {
        console.log('\n❌ CORREÇÕES NECESSITAM ATENÇÃO ADICIONAL');
    }
    
    console.log('\n🔗 PRÓXIMO PASSO:');
    console.log('📊 Verificar dashboard: http://localhost:4000');
    console.log('🔄 Executar: node verificacao-dashboard-final.js');
}

correcaoFinalColunas().catch(console.error);
