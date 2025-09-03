// 🔍 AUDITORIA COMPLETA DO SISTEMA OPERACIONAL
// Análise de TODOS os componentes críticos para operação real

const { Pool } = require('pg');
const fs = require('fs');

const pool = new Pool({
    connectionString: 'process.env.DATABASE_URL',
    ssl: { rejectUnauthorized: false }
});

async function auditoriaCompletaOperacional() {
    console.log('🔍 AUDITORIA COMPLETA DO SISTEMA OPERACIONAL');
    console.log('=============================================');
    console.log('📊 Análise de TODOS os componentes críticos para operação real\n');
    
    const relatorio = {
        timestamp: new Date().toISOString(),
        componentes: {},
        problemas: [],
        recomendacoes: []
    };
    
    try {
        // ============================================
        // 1. ANÁLISE DO FLUXO DE DADOS FINANCEIROS
        // ============================================
        console.log('💰 1. ANÁLISE DO FLUXO FINANCEIRO');
        console.log('================================');
        
        // 1.1 Verificar TOP 100 - Como está sendo coletado?
        console.log('\n📊 1.1 TOP 100 CRYPTOCURRENCIES - Fonte de Dados');
        
        // Verificar onde estão os dados do TOP 100
        try {
            const top100Data = await pool.query(`
                SELECT 
                    COUNT(*) as total_records,
                    MAX(created_at) as last_update,
                    MIN(created_at) as first_record,
                    COUNT(DISTINCT symbol) as unique_symbols
                FROM trading_signals 
                WHERE top100_trend IS NOT NULL
            `);
            
            console.log(`   📈 Registros TOP 100: ${top100Data.rows[0].total_records}`);
            console.log(`   🕐 Última atualização: ${top100Data.rows[0].last_update || 'NUNCA'}`);
            console.log(`   🔢 Símbolos únicos: ${top100Data.rows[0].unique_symbols}`);
            
            if (top100Data.rows[0].total_records === '0') {
                relatorio.problemas.push('🚨 TOP 100: Não há dados sendo coletados!');
                relatorio.recomendacoes.push('Implementar API para coleta de TOP 100 cryptocurrencies');
            }
        } catch (error) {
            console.log(`   ❌ Erro ao verificar TOP 100: ${error.message}`);
            relatorio.problemas.push(`TOP 100 Error: ${error.message}`);
        }
        
        // 1.2 Verificar Fear & Greed Index
        console.log('\n😱 1.2 FEAR & GREED INDEX - Integração');
        try {
            const fearGreedData = await pool.query(`
                SELECT 
                    COUNT(*) as total_records,
                    MAX(fear_greed_value) as max_value,
                    MIN(fear_greed_value) as min_value,
                    AVG(fear_greed_value) as avg_value,
                    MAX(created_at) as last_update
                FROM signal_metrics_log 
                WHERE fear_greed_value IS NOT NULL
            `);
            
            console.log(`   📊 Registros F&G: ${fearGreedData.rows[0].total_records}`);
            console.log(`   📈 Valor atual: ${fearGreedData.rows[0].max_value || 'NULL'}`);
            console.log(`   📉 Média: ${fearGreedData.rows[0].avg_value || 'NULL'}`);
            console.log(`   🕐 Última atualização: ${fearGreedData.rows[0].last_update || 'NUNCA'}`);
            
            if (!fearGreedData.rows[0].max_value) {
                relatorio.problemas.push('🚨 FEAR & GREED: Valores NULL ou não sendo coletados!');
                relatorio.recomendacoes.push('Verificar API do Fear & Greed Index');
            }
        } catch (error) {
            console.log(`   ❌ Erro ao verificar F&G: ${error.message}`);
            relatorio.problemas.push(`Fear & Greed Error: ${error.message}`);
        }
        
        // 1.3 Verificar BTC Dominance
        console.log('\n₿ 1.3 BTC DOMINANCE - Monitoramento');
        try {
            const btcDominanceData = await pool.query(`
                SELECT 
                    COUNT(*) as total_records,
                    MAX(btc_dominance) as current_dominance,
                    AVG(btc_dominance) as avg_dominance,
                    MAX(created_at) as last_update
                FROM signal_metrics_log 
                WHERE btc_dominance IS NOT NULL
            `);
            
            console.log(`   📊 Registros BTC Dom: ${btcDominanceData.rows[0].total_records}`);
            console.log(`   📈 Dominância atual: ${btcDominanceData.rows[0].current_dominance || 'NULL'}%`);
            console.log(`   📊 Média: ${btcDominanceData.rows[0].avg_dominance || 'NULL'}%`);
            console.log(`   🕐 Última atualização: ${btcDominanceData.rows[0].last_update || 'NUNCA'}`);
            
            if (!btcDominanceData.rows[0].current_dominance) {
                relatorio.problemas.push('🚨 BTC DOMINANCE: Valores NULL ou não sendo coletados!');
                relatorio.recomendacoes.push('Verificar API de dominância do Bitcoin');
            }
        } catch (error) {
            console.log(`   ❌ Erro ao verificar BTC Dominance: ${error.message}`);
            relatorio.problemas.push(`BTC Dominance Error: ${error.message}`);
        }
        
        // ============================================
        // 2. ANÁLISE DO FLUXO DE SINAIS
        // ============================================
        console.log('\n📡 2. ANÁLISE DO FLUXO DE SINAIS');
        console.log('===============================');
        
        // 2.1 Verificar fonte dos sinais
        console.log('\n🔍 2.1 FONTES DE SINAIS');
        try {
            const fontesSignals = await pool.query(`
                SELECT 
                    source,
                    COUNT(*) as total_signals,
                    COUNT(CASE WHEN ai_approved = true THEN 1 END) as approved,
                    COUNT(CASE WHEN ai_approved = false THEN 1 END) as rejected,
                    MAX(received_at) as last_signal
                FROM signal_metrics_log 
                WHERE received_at >= NOW() - INTERVAL '7 days'
                GROUP BY source
                ORDER BY total_signals DESC
            `);
            
            console.log('   📊 Fontes ativas (últimos 7 dias):');
            fontesSignals.rows.forEach(row => {
                console.log(`      ${row.source}: ${row.total_signals} sinais (${row.approved} aprovados, ${row.rejected} rejeitados)`);
                console.log(`         Último sinal: ${row.last_signal}`);
            });
            
            if (fontesSignals.rows.length === 0) {
                relatorio.problemas.push('🚨 SINAIS: Nenhuma fonte de sinais ativa nos últimos 7 dias!');
                relatorio.recomendacoes.push('Verificar integrações com TradingView, Binance, etc.');
            }
        } catch (error) {
            console.log(`   ❌ Erro ao verificar fontes: ${error.message}`);
            relatorio.problemas.push(`Signal Sources Error: ${error.message}`);
        }
        
        // 2.2 Verificar processamento de sinais
        console.log('\n⚙️ 2.2 PROCESSAMENTO DE SINAIS');
        try {
            const processamentoStats = await pool.query(`
                SELECT 
                    COUNT(*) as total_processed,
                    COUNT(CASE WHEN execution_time_ms IS NOT NULL THEN 1 END) as with_timing,
                    AVG(execution_time_ms) as avg_processing_time,
                    COUNT(CASE WHEN users_affected > 0 THEN 1 END) as signals_affecting_users,
                    COUNT(CASE WHEN orders_created > 0 THEN 1 END) as signals_creating_orders
                FROM signal_metrics_log 
                WHERE processed_at >= NOW() - INTERVAL '24 hours'
            `);
            
            console.log(`   📊 Sinais processados (24h): ${processamentoStats.rows[0].total_processed}`);
            console.log(`   ⏱️ Tempo médio processamento: ${processamentoStats.rows[0].avg_processing_time || 'N/A'}ms`);
            console.log(`   👥 Sinais afetando usuários: ${processamentoStats.rows[0].signals_affecting_users}`);
            console.log(`   📋 Sinais criando ordens: ${processamentoStats.rows[0].signals_creating_orders}`);
            
            if (processamentoStats.rows[0].total_processed === '0') {
                relatorio.problemas.push('🚨 PROCESSAMENTO: Nenhum sinal processado nas últimas 24h!');
                relatorio.recomendacoes.push('Verificar multi-user-signal-processor');
            }
        } catch (error) {
            console.log(`   ❌ Erro ao verificar processamento: ${error.message}`);
            relatorio.problemas.push(`Signal Processing Error: ${error.message}`);
        }
        
        // ============================================
        // 3. ANÁLISE DAS OPERAÇÕES FINANCEIRAS
        // ============================================
        console.log('\n💰 3. ANÁLISE DAS OPERAÇÕES FINANCEIRAS');
        console.log('=======================================');
        
        // 3.1 Verificar ordens de trading
        console.log('\n📋 3.1 ORDENS DE TRADING');
        try {
            const ordensStats = await pool.query(`
                SELECT 
                    COUNT(*) as total_orders,
                    COUNT(CASE WHEN status = 'FILLED' THEN 1 END) as filled_orders,
                    COUNT(CASE WHEN status = 'PENDING' THEN 1 END) as pending_orders,
                    COUNT(CASE WHEN status = 'FAILED' THEN 1 END) as failed_orders,
                    SUM(CASE WHEN status = 'FILLED' THEN quantity * price ELSE 0 END) as total_volume,
                    MAX(created_at) as last_order
                FROM trading_orders 
                WHERE created_at >= NOW() - INTERVAL '7 days'
            `);
            
            console.log(`   📊 Total ordens (7d): ${ordensStats.rows[0].total_orders}`);
            console.log(`   ✅ Ordens executadas: ${ordensStats.rows[0].filled_orders}`);
            console.log(`   ⏳ Ordens pendentes: ${ordensStats.rows[0].pending_orders}`);
            console.log(`   ❌ Ordens falhadas: ${ordensStats.rows[0].failed_orders}`);
            console.log(`   💰 Volume total: $${ordensStats.rows[0].total_volume || 0}`);
            console.log(`   🕐 Última ordem: ${ordensStats.rows[0].last_order || 'NUNCA'}`);
            
            if (ordensStats.rows[0].total_orders === '0') {
                relatorio.problemas.push('🚨 ORDENS: Nenhuma ordem de trading nos últimos 7 dias!');
                relatorio.recomendacoes.push('Verificar integração com exchanges (Bybit, Binance)');
            }
        } catch (error) {
            console.log(`   ❌ Erro ao verificar ordens: ${error.message}`);
            relatorio.problemas.push(`Trading Orders Error: ${error.message}`);
        }
        
        // 3.2 Verificar saldos dos usuários
        console.log('\n💳 3.2 SALDOS DOS USUÁRIOS');
        try {
            const saldosStats = await pool.query(`
                SELECT 
                    COUNT(*) as total_users,
                    COUNT(CASE WHEN balance_brl > 0 OR balance_usd > 0 THEN 1 END) as users_with_balance,
                    SUM(balance_brl) as total_brl,
                    SUM(balance_usd) as total_usd,
                    COUNT(CASE WHEN trading_active = true THEN 1 END) as active_traders
                FROM users 
                WHERE is_active = true
            `);
            
            console.log(`   👥 Total usuários ativos: ${saldosStats.rows[0].total_users}`);
            console.log(`   💰 Usuários com saldo: ${saldosStats.rows[0].users_with_balance}`);
            console.log(`   💵 Total BRL: R$ ${saldosStats.rows[0].total_brl || 0}`);
            console.log(`   💲 Total USD: $ ${saldosStats.rows[0].total_usd || 0}`);
            console.log(`   📈 Traders ativos: ${saldosStats.rows[0].active_traders}`);
            
            if (saldosStats.rows[0].users_with_balance === '0') {
                relatorio.problemas.push('🚨 SALDOS: Nenhum usuário com saldo ativo!');
                relatorio.recomendacoes.push('Verificar sistema de depósitos e créditos');
            }
        } catch (error) {
            console.log(`   ❌ Erro ao verificar saldos: ${error.message}`);
            relatorio.problemas.push(`User Balances Error: ${error.message}`);
        }
        
        // ============================================
        // 4. ANÁLISE DAS INTEGRAÇÕES EXTERNAS
        // ============================================
        console.log('\n🔗 4. ANÁLISE DAS INTEGRAÇÕES EXTERNAS');
        console.log('=====================================');
        
        // 4.1 Verificar chaves de API dos usuários
        console.log('\n🔐 4.1 CHAVES DE API DOS USUÁRIOS');
        try {
            const apiKeysStats = await pool.query(`
                SELECT 
                    COUNT(*) as total_users,
                    COUNT(CASE WHEN bybit_api_key IS NOT NULL THEN 1 END) as users_with_bybit,
                    COUNT(CASE WHEN binance_api_key_encrypted IS NOT NULL THEN 1 END) as users_with_binance,
                    COUNT(CASE WHEN api_validation_status = 'VALID' THEN 1 END) as valid_apis,
                    COUNT(CASE WHEN exchange_auto_trading = true THEN 1 END) as auto_trading_enabled
                FROM users 
                WHERE is_active = true
            `);
            
            console.log(`   👥 Total usuários: ${apiKeysStats.rows[0].total_users}`);
            console.log(`   🟡 Usuários c/ Bybit: ${apiKeysStats.rows[0].users_with_bybit}`);
            console.log(`   🟨 Usuários c/ Binance: ${apiKeysStats.rows[0].users_with_binance}`);
            console.log(`   ✅ APIs válidas: ${apiKeysStats.rows[0].valid_apis}`);
            console.log(`   🤖 Auto-trading ativo: ${apiKeysStats.rows[0].auto_trading_enabled}`);
            
            if (apiKeysStats.rows[0].valid_apis === '0') {
                relatorio.problemas.push('🚨 APIs: Nenhuma chave de API válida!');
                relatorio.recomendacoes.push('Verificar validação de chaves e conectividade com exchanges');
            }
        } catch (error) {
            console.log(`   ❌ Erro ao verificar APIs: ${error.message}`);
            relatorio.problemas.push(`API Keys Error: ${error.message}`);
        }
        
        // 4.2 Verificar logs de erros
        console.log('\n📋 4.2 LOGS DE ERROS E FALHAS');
        try {
            const errorLogs = await pool.query(`
                SELECT 
                    COUNT(*) as total_errors,
                    COUNT(CASE WHEN created_at >= NOW() - INTERVAL '1 hour' THEN 1 END) as errors_last_hour,
                    COUNT(CASE WHEN created_at >= NOW() - INTERVAL '24 hours' THEN 1 END) as errors_last_24h
                FROM system_logs 
                WHERE log_level = 'ERROR'
            `);
            
            console.log(`   📊 Total erros: ${errorLogs.rows[0].total_errors}`);
            console.log(`   🔴 Erros última hora: ${errorLogs.rows[0].errors_last_hour}`);
            console.log(`   🟠 Erros últimas 24h: ${errorLogs.rows[0].errors_last_24h}`);
            
            if (parseInt(errorLogs.rows[0].errors_last_hour) > 10) {
                relatorio.problemas.push('🚨 ERROS: Muitos erros na última hora!');
                relatorio.recomendacoes.push('Investigar logs de erro imediatamente');
            }
        } catch (error) {
            console.log(`   ❌ Tabela system_logs não existe ou erro: ${error.message}`);
            relatorio.problemas.push('Sistema de logs não implementado');
        }
        
        // ============================================
        // 5. ANÁLISE DE ARQUIVOS CRÍTICOS
        // ============================================
        console.log('\n📁 5. ANÁLISE DE ARQUIVOS CRÍTICOS');
        console.log('==================================');
        
        const arquivosCriticos = [
            'multi-user-signal-processor.js',
            'signal-metrics-monitor.js',
            'signal-history-analyzer.js',
            'market-direction-monitor.js',
            'btc-dominance-analyzer.js',
            'rsi-overheated-monitor.js',
            'exchange-key-validator.js',
            'order-manager.js'
        ];
        
        for (const arquivo of arquivosCriticos) {
            try {
                if (fs.existsSync(arquivo)) {
                    const stats = fs.statSync(arquivo);
                    const conteudo = fs.readFileSync(arquivo, 'utf8');
                    
                    console.log(`   ✅ ${arquivo} (${Math.round(stats.size/1024)}KB, modificado: ${stats.mtime.toISOString().split('T')[0]})`);
                    
                    // Verificar se contém conexão com banco
                    if (conteudo.includes('postgresql://')) {
                        console.log(`      🔗 Contém conexão DB`);
                    }
                    
                    // Verificar se contém tratamento de erro
                    if (conteudo.includes('try {') && conteudo.includes('catch')) {
                        console.log(`      🛡️ Contém tratamento de erro`);
                    }
                    
                } else {
                    console.log(`   ❌ ${arquivo} - ARQUIVO NÃO ENCONTRADO!`);
                    relatorio.problemas.push(`Arquivo crítico ausente: ${arquivo}`);
                }
            } catch (error) {
                console.log(`   ❌ Erro ao verificar ${arquivo}: ${error.message}`);
                relatorio.problemas.push(`Erro ao acessar ${arquivo}: ${error.message}`);
            }
        }
        
        // ============================================
        // 6. RELATÓRIO FINAL E RECOMENDAÇÕES
        // ============================================
        console.log('\n📋 6. RELATÓRIO FINAL');
        console.log('====================');
        
        console.log(`\n🕐 Auditoria concluída em: ${new Date().toISOString()}`);
        console.log(`📊 Total de problemas encontrados: ${relatorio.problemas.length}`);
        
        if (relatorio.problemas.length > 0) {
            console.log('\n🚨 PROBLEMAS CRÍTICOS ENCONTRADOS:');
            relatorio.problemas.forEach((problema, index) => {
                console.log(`   ${index + 1}. ${problema}`);
            });
        }
        
        if (relatorio.recomendacoes.length > 0) {
            console.log('\n💡 RECOMENDAÇÕES PRIORITÁRIAS:');
            relatorio.recomendacoes.forEach((rec, index) => {
                console.log(`   ${index + 1}. ${rec}`);
            });
        }
        
        // Salvar relatório
        const nomeRelatorio = `auditoria-completa-${new Date().toISOString().split('T')[0]}.json`;
        fs.writeFileSync(nomeRelatorio, JSON.stringify(relatorio, null, 2));
        console.log(`\n💾 Relatório salvo em: ${nomeRelatorio}`);
        
        // Status geral
        const statusGeral = relatorio.problemas.length === 0 ? '✅ SISTEMA OPERACIONAL' : 
                          relatorio.problemas.length <= 3 ? '⚠️ REQUER ATENÇÃO' : '🚨 CRÍTICO';
        
        console.log(`\n🎯 STATUS GERAL DO SISTEMA: ${statusGeral}`);
        
    } catch (error) {
        console.error('❌ Erro geral na auditoria:', error);
    } finally {
        await pool.end();
    }
}

// Executar auditoria completa
auditoriaCompletaOperacional();
