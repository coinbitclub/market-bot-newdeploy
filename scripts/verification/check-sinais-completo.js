#!/usr/bin/env node

/**
 * VERIFICAÇÃO COMPLETA DE SINAIS - Análise detalhada de recebidos vs processados
 * Este script investiga todos os sinais na tabela 'signals'
 */

const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function verificarSinaisCompleto() {
    console.log('🔍 ANÁLISE COMPLETA DE SINAIS - TradingView → Sistema → Execução\n');
    
    try {
        // 1. CONTAGEM GERAL
        console.log('📊 CONTAGEM GERAL DE SINAIS:');
        const totalQuery = await pool.query(`
            SELECT 
                COUNT(*) as total_sinais,
                MIN(created_at) as primeiro_sinal,
                MAX(created_at) as ultimo_sinal,
                COUNT(DISTINCT symbol) as symbols_unicos,
                COUNT(DISTINCT DATE(created_at)) as dias_ativos
            FROM signals
        `);
        console.log(totalQuery.rows[0]);
        console.log('');

        // 2. ANÁLISE POR STATUS/PROCESSAMENTO
        console.log('🔄 ANÁLISE DE PROCESSAMENTO:');
        const statusQuery = await pool.query(`
            SELECT 
                status,
                processed,
                COUNT(*) as quantidade,
                ROUND((COUNT(*) * 100.0 / SUM(COUNT(*)) OVER()), 2) as percentual
            FROM signals 
            GROUP BY status, processed
            ORDER BY quantidade DESC
        `);
        console.table(statusQuery.rows);

        // 3. ANÁLISE POR TIPO DE SINAL
        console.log('📈 ANÁLISE POR TIPO DE SINAL:');
        const tipoQuery = await pool.query(`
            SELECT 
                CASE 
                    WHEN action = 'BUY' OR signal_type ILIKE '%LONG%' OR signal_type ILIKE '%BUY%' THEN 'BUY/LONG'
                    WHEN action = 'SELL' OR signal_type ILIKE '%SHORT%' OR signal_type ILIKE '%SELL%' THEN 'SELL/SHORT'
                    ELSE COALESCE(action, signal_type, 'UNKNOWN')
                END as tipo_sinal,
                COUNT(*) as quantidade,
                COUNT(CASE WHEN processed = true THEN 1 END) as processados,
                COUNT(CASE WHEN processed = false OR processed IS NULL THEN 1 END) as pendentes
            FROM signals 
            GROUP BY 1
            ORDER BY quantidade DESC
        `);
        console.table(tipoQuery.rows);

        // 4. ANÁLISE TEMPORAL (ÚLTIMOS 7 DIAS)
        console.log('📅 SINAIS DOS ÚLTIMOS 7 DIAS:');
        const temporalQuery = await pool.query(`
            SELECT 
                DATE(created_at) as data,
                COUNT(*) as sinais_recebidos,
                COUNT(CASE WHEN processed = true THEN 1 END) as processados,
                COUNT(CASE WHEN processed = false OR processed IS NULL THEN 1 END) as pendentes,
                ROUND(COUNT(CASE WHEN processed = true THEN 1 END) * 100.0 / COUNT(*), 1) as taxa_processamento
            FROM signals 
            WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
            GROUP BY DATE(created_at)
            ORDER BY data DESC
        `);
        console.table(temporalQuery.rows);

        // 5. ÚLTIMOS 10 SINAIS DETALHADOS
        console.log('📋 ÚLTIMOS 10 SINAIS DETALHADOS:');
        const detailQuery = await pool.query(`
            SELECT 
                id,
                symbol,
                action,
                signal_type,
                price,
                status,
                processed,
                created_at,
                source
            FROM signals 
            ORDER BY created_at DESC 
            LIMIT 10
        `);
        console.table(detailQuery.rows);

        // 6. PROBLEMAS IDENTIFICADOS
        console.log('⚠️ POSSÍVEIS PROBLEMAS:');
        
        const nullQuery = await pool.query(`
            SELECT 
                'Sinais com symbol NULL' as problema,
                COUNT(*) as quantidade
            FROM signals WHERE symbol IS NULL
            UNION ALL
            SELECT 
                'Sinais com action NULL' as problema,
                COUNT(*) as quantidade  
            FROM signals WHERE action IS NULL
            UNION ALL
            SELECT 
                'Sinais sem status' as problema,
                COUNT(*) as quantidade
            FROM signals WHERE status IS NULL
            UNION ALL
            SELECT 
                'Sinais antigos não processados' as problema,
                COUNT(*) as quantidade
            FROM signals 
            WHERE (processed = false OR processed IS NULL) 
            AND created_at < CURRENT_TIMESTAMP - INTERVAL '1 hour'
        `);
        console.table(nullQuery.rows);

        // 7. RESUMO EXECUTIVO
        console.log('\n🎯 RESUMO EXECUTIVO:');
        const resumoQuery = await pool.query(`
            SELECT 
                COUNT(*) as total_recebidos,
                COUNT(CASE WHEN processed = true THEN 1 END) as total_processados,
                COUNT(CASE WHEN processed = false OR processed IS NULL THEN 1 END) as total_pendentes,
                ROUND(COUNT(CASE WHEN processed = true THEN 1 END) * 100.0 / COUNT(*), 1) as taxa_sucesso_geral,
                COUNT(CASE WHEN created_at >= CURRENT_DATE THEN 1 END) as sinais_hoje,
                COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as sinais_semana
            FROM signals
        `);
        
        const resumo = resumoQuery.rows[0];
        console.log(`✅ Total Recebidos: ${resumo.total_recebidos}`);
        console.log(`🔄 Total Processados: ${resumo.total_processados}`);
        console.log(`⏳ Total Pendentes: ${resumo.total_pendentes}`);
        console.log(`📊 Taxa de Sucesso: ${resumo.taxa_sucesso_geral}%`);
        console.log(`📅 Sinais Hoje: ${resumo.sinais_hoje}`);
        console.log(`📈 Sinais esta Semana: ${resumo.sinais_semana}`);

    } catch (error) {
        console.error('❌ Erro ao verificar sinais:', error.message);
    } finally {
        await pool.end();
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    verificarSinaisCompleto();
}

module.exports = { verificarSinaisCompleto };
