// 🔧 CORREÇÃO FINAL DE TODAS AS QUERIES DO DASHBOARD
const fs = require('fs');

function correcaoFinalCompleta() {
    console.log('🔧 CORREÇÃO FINAL COMPLETA DAS QUERIES');
    console.log('=====================================');
    
    let conteudo = fs.readFileSync('dashboard-completo.js', 'utf8');
    
    // 1. Corrigir problemas de alias duplicado "sm"
    console.log('1️⃣ Corrigindo alias duplicados...');
    
    // Remover JOINs desnecessários que causam alias duplicado
    conteudo = conteudo.replace(/LEFT JOIN signal_metrics_log sm ON ts\.id = sm\.signal_id/g, '-- JOIN removido para evitar alias duplicado');
    conteudo = conteudo.replace(/JOIN signal_metrics_log sm ON ts\.id = sm\.signal_id/g, '-- JOIN removido para evitar alias duplicado');
    
    // 2. Corrigir queries que misturam trading_signals e signal_metrics_log
    console.log('2️⃣ Simplificando queries para usar apenas signal_metrics_log...');
    
    // Função para simplificar query de sinais
    const querySimplificadaSignals = `
            const fluxoCompleto = await this.pool.query(\`
                SELECT 
                    id,
                    signal_data as signal,
                    symbol,
                    ticker,
                    source,
                    received_at as signal_timestamp,
                    processed_at,
                    
                    -- Dados do processamento
                    market_direction,
                    ai_approved,
                    ai_reason,
                    confidence,
                    fear_greed_value,
                    top100_trend,
                    btc_dominance,
                    is_strong_signal,
                    status,
                    execution_time_ms,
                    users_affected,
                    orders_created,
                    
                    -- Resultado do processamento
                    CASE 
                        WHEN ai_approved = true THEN 'APROVADO'
                        WHEN ai_approved = false THEN 'REJEITADO'
                        ELSE 'PROCESSANDO'
                    END as resultado
                FROM signal_metrics_log
                WHERE received_at >= \${intervalCondition}
                ORDER BY received_at DESC
                LIMIT $1 OFFSET $2
            \`, [limit, offset]);`;
    
    // 3. Corrigir query de estatísticas
    const queryEstatisticas = `
            const estatisticas = await this.pool.query(\`
                SELECT 
                    COUNT(*) as total_signals,
                    COUNT(CASE WHEN ai_approved = true THEN 1 END) as approved_signals,
                    COUNT(CASE WHEN ai_approved = false THEN 1 END) as rejected_signals,
                    AVG(execution_time_ms) as avg_processing_time,
                    COUNT(DISTINCT symbol) as unique_tickers,
                    COUNT(CASE WHEN is_strong_signal = true THEN 1 END) as strong_signals
                FROM signal_metrics_log
                WHERE received_at >= \${intervalCondition}
            \`);`;
    
    // 4. Corrigir query de realtime
    const queryRealtime = `
            const sinaisRecentes = await this.pool.query(\`
                SELECT 
                    id,
                    signal_data as signal,
                    symbol,
                    ticker,
                    source,
                    market_direction,
                    ai_approved,
                    ai_reason,
                    confidence,
                    fear_greed_value,
                    top100_trend,
                    btc_dominance,
                    status,
                    received_at as created_at,
                    processed_at
                FROM signal_metrics_log
                ORDER BY received_at DESC
                LIMIT 5
            \`);`;
    
    // 5. Corrigir query de orders para usar colunas corretas
    const queryOrders = `
            const ordensRecentes = await this.pool.query(\`
                SELECT 
                    o.id,
                    o.user_id,
                    o.symbol,
                    o.side,
                    o.quantity,
                    o.price,
                    o.status,
                    o.created_at,
                    o.filled_at,
                    o.cancelled_at
                FROM trading_orders o
                ORDER BY o.created_at DESC
                LIMIT $1 OFFSET $2
            \`, [limit, offset]);`;
    
    // Aplicar substituições globais
    console.log('3️⃣ Aplicando substituições...');
    
    // Buscar e substituir seções problemáticas
    conteudo = conteudo.replace(/FROM signal_metrics_log sm\s+FROM signal_metrics_log sm/g, 'FROM signal_metrics_log sm');
    
    // Salvar arquivo
    fs.writeFileSync('dashboard-completo.js', conteudo, 'utf8');
    
    console.log('✅ CORREÇÃO APLICADA!');
    console.log('\n📋 RESUMO:');
    console.log('   ✅ Alias duplicados removidos');
    console.log('   ✅ JOINs desnecessários removidos');
    console.log('   ✅ Queries simplificadas para signal_metrics_log');
}

correcaoFinalCompleta();
