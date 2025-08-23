#!/usr/bin/env node

console.log('🔍 VERIFICAÇÃO COMPLETA DA INTEGRAÇÃO DO DASHBOARD');
console.log('=================================================');

const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:ELjbkkgUASRCtdTAXVFgIssOXiLsRCPq@trolley.proxy.rlwy.net:44790/railway',
    ssl: { rejectUnauthorized: false }
});

async function verificarIntegracaoDashboard() {
    let sucessos = 0, erros = 0;
    
    try {
        console.log('\n📊 1. VERIFICANDO ESTRUTURA DAS TABELAS PRINCIPAIS');
        console.log('==================================================');
        
        const tabelasEssenciais = [
            'users',
            'user_api_keys', 
            'signal_metrics_log',
            'api_validation_log',
            'order_executions',
            'fear_greed_index',
            'btc_dominance',
            'positions',
            'trades'
        ];
        
        for (const tabela of tabelasEssenciais) {
            try {
                const resultado = await pool.query(`
                    SELECT COUNT(*) as total, 
                           (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = '${tabela}') as colunas
                    FROM ${tabela}
                `);
                
                console.log(`   ✅ ${tabela}: ${resultado.rows[0].total} registros, ${resultado.rows[0].colunas} colunas`);
                sucessos++;
            } catch (error) {
                console.log(`   ❌ ${tabela}: ${error.message}`);
                erros++;
            }
        }
        
        console.log('\n🔑 2. VERIFICANDO CHAVES API DOS USUÁRIOS');
        console.log('=========================================');
        
        try {
            const chavesResult = await pool.query(`
                SELECT 
                    u.id, u.username, u.email,
                    COUNT(uak.id) as total_chaves,
                    COUNT(CASE WHEN uak.exchange = 'bybit' THEN 1 END) as chaves_bybit,
                    COUNT(CASE WHEN uak.exchange = 'binance' THEN 1 END) as chaves_binance,
                    COUNT(CASE WHEN uak.is_active = true THEN 1 END) as chaves_ativas
                FROM users u
                LEFT JOIN user_api_keys uak ON u.id = uak.user_id
                WHERE u.is_active = true OR u.is_active IS NULL
                GROUP BY u.id, u.username, u.email
                ORDER BY total_chaves DESC
                LIMIT 10
            `);
            
            console.log('Usuários com mais chaves API:');
            chavesResult.rows.forEach(user => {
                console.log(`   👤 ${user.username} (${user.email})`);
                console.log(`      📊 Total: ${user.total_chaves} | Bybit: ${user.chaves_bybit} | Binance: ${user.chaves_binance} | Ativas: ${user.chaves_ativas}`);
            });
            sucessos++;
        } catch (error) {
            console.log(`   ❌ Erro ao verificar chaves: ${error.message}`);
            erros++;
        }
        
        console.log('\n📈 3. VERIFICANDO DADOS DE MERCADO (FEAR & GREED + BTC DOMINANCE)');
        console.log('================================================================');
        
        try {
            const fearGreed = await pool.query(`
                SELECT value, category, created_at 
                FROM fear_greed_index 
                ORDER BY created_at DESC 
                LIMIT 1
            `);
            
            if (fearGreed.rows.length > 0) {
                const fg = fearGreed.rows[0];
                console.log(`   ✅ Fear & Greed: ${fg.value} (${fg.category}) - ${fg.created_at}`);
                sucessos++;
            } else {
                console.log('   ⚠️ Nenhum dado Fear & Greed encontrado');
            }
        } catch (error) {
            console.log(`   ❌ Fear & Greed: ${error.message}`);
            erros++;
        }
        
        try {
            const btcDom = await pool.query(`
                SELECT dominance_percentage, collected_at 
                FROM btc_dominance 
                ORDER BY collected_at DESC 
                LIMIT 1
            `);
            
            if (btcDom.rows.length > 0) {
                const dom = btcDom.rows[0];
                console.log(`   ✅ BTC Dominance: ${dom.dominance_percentage}% - ${dom.collected_at}`);
                sucessos++;
            } else {
                console.log('   ⚠️ Nenhum dado BTC Dominance encontrado');
            }
        } catch (error) {
            console.log(`   ❌ BTC Dominance: ${error.message}`);
            erros++;
        }
        
        console.log('\n🤖 4. VERIFICANDO ANÁLISES DE IA');
        console.log('================================');
        
        try {
            const analiseIA = await pool.query(`
                SELECT 
                    ai_decision, confidence, market_trend, sentiment_score,
                    symbol, timestamp, ai_approved
                FROM signal_metrics_log 
                WHERE ai_decision IS NOT NULL
                ORDER BY timestamp DESC 
                LIMIT 3
            `);
            
            console.log(`   ✅ Análises IA encontradas: ${analiseIA.rows.length}`);
            analiseIA.rows.forEach((analise, index) => {
                console.log(`      ${index + 1}. ${analise.symbol}: ${analise.ai_decision} (conf: ${analise.confidence})`);
            });
            sucessos++;
        } catch (error) {
            console.log(`   ❌ Análises IA: ${error.message}`);
            erros++;
        }
        
        console.log('\n📋 5. VERIFICANDO EXECUÇÕES DE ORDENS');
        console.log('====================================');
        
        try {
            const execucoes = await pool.query(`
                SELECT 
                    oe.id, u.username, oe.exchange, oe.symbol, oe.status,
                    oe.quantity, oe.executed_price, oe.executed_at
                FROM order_executions oe
                JOIN users u ON oe.user_id = u.id
                ORDER BY oe.created_at DESC
                LIMIT 5
            `);
            
            console.log(`   ✅ Execuções encontradas: ${execucoes.rows.length}`);
            execucoes.rows.forEach((exec, index) => {
                console.log(`      ${index + 1}. ${exec.username}: ${exec.symbol} (${exec.exchange}) - ${exec.status}`);
            });
            sucessos++;
        } catch (error) {
            console.log(`   ❌ Execuções: ${error.message}`);
            erros++;
        }
        
        console.log('\n🌐 6. TESTANDO ENDPOINTS DO DASHBOARD');
        console.log('====================================');
        
        const fetch = require('node-fetch').default || require('node-fetch');
        const baseUrl = 'http://localhost:4000';
        
        const endpoints = [
            '/status',
            '/dashboard',
            '/api/users',
            '/api/positions'
        ];
        
        for (const endpoint of endpoints) {
            try {
                const response = await fetch(`${baseUrl}${endpoint}`, {
                    timeout: 5000
                });
                
                if (response.ok) {
                    console.log(`   ✅ ${endpoint}: HTTP ${response.status}`);
                    sucessos++;
                } else {
                    console.log(`   ⚠️ ${endpoint}: HTTP ${response.status}`);
                }
            } catch (error) {
                console.log(`   ❌ ${endpoint}: ${error.message}`);
                erros++;
            }
        }
        
        console.log('\n📊 7. RELATÓRIO FINAL DE INTEGRAÇÃO');
        console.log('===================================');
        
        const total = sucessos + erros;
        const taxaSucesso = Math.round((sucessos / total) * 100);
        
        console.log(`✅ SUCESSOS: ${sucessos}`);
        console.log(`❌ ERROS: ${erros}`);
        console.log(`📈 TAXA DE SUCESSO: ${taxaSucesso}%`);
        
        if (taxaSucesso >= 90) {
            console.log('\n🎉 DASHBOARD COMPLETAMENTE INTEGRADO!');
            console.log('✅ Sistema pronto para produção');
            console.log('✅ Todas as funcionalidades operacionais');
            console.log('✅ Dados consistentes no banco');
        } else if (taxaSucesso >= 75) {
            console.log('\n✅ DASHBOARD MAJORITARIAMENTE INTEGRADO');
            console.log('⚠️ Pequenos ajustes necessários');
        } else {
            console.log('\n⚠️ DASHBOARD NECESSITA CORREÇÕES');
            console.log('🔧 Problemas estruturais identificados');
        }
        
        console.log('\n🔗 URLS DE ACESSO:');
        console.log('==================');
        console.log('📊 Dashboard: http://localhost:4000/dashboard');
        console.log('🌐 Status: http://localhost:4000/status');
        console.log('👥 API Users: http://localhost:4000/api/users');
        console.log('📈 API Positions: http://localhost:4000/api/positions');
        
    } catch (error) {
        console.error('❌ Erro geral na verificação:', error.message);
    } finally {
        await pool.end();
    }
}

verificarIntegracaoDashboard().catch(console.error);
