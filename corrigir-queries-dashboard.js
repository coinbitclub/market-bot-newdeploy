// 🔧 CORREÇÃO COMPLETA DAS QUERIES DO DASHBOARD
const fs = require('fs');
const path = require('path');

function corrigirQueriesDashboard() {
    console.log('🔧 CORRIGINDO QUERIES DO DASHBOARD');
    console.log('==================================');
    
    const arquivoDashboard = path.join(__dirname, 'dashboard-completo.js');
    let conteudo = fs.readFileSync(arquivoDashboard, 'utf8');
    
    console.log('📝 Aplicando correções...');
    
    // 1. CORREÇÃO: getDecissoesIA - Problema com ts.signal e joins incorretos
    console.log('1️⃣ Corrigindo getDecissoesIA...');
    const queryDecissoesIACorrigida = `
    async getDecissoesIA(req, res) {
        try {
            const { limit = 30 } = req.query;

            // Query corrigida usando signal_metrics_log que tem todos os dados necessários
            const decisoesIA = await this.pool.query(\`
                SELECT 
                    sm.id as signal_id,
                    sm.signal_data as signal,
                    sm.symbol,
                    sm.received_at as signal_time,
                    sm.ai_approved,
                    sm.ai_reason,
                    sm.market_direction,
                    sm.confidence,
                    sm.is_strong_signal,
                    sm.execution_time_ms,
                    sm.users_affected,
                    sm.orders_created,
                    
                    -- Tempo de processamento
                    EXTRACT(EPOCH FROM (sm.processed_at - sm.received_at)) as processing_time_seconds,
                    
                    -- Status da decisão
                    CASE 
                        WHEN sm.ai_approved = true THEN 'APROVADO'
                        WHEN sm.ai_approved = false THEN 'REJEITADO'
                        ELSE 'PROCESSANDO'
                    END as decision_result,
                    
                    -- Dados contextuais
                    sm.fear_greed_value,
                    sm.top100_trend,
                    sm.btc_dominance,
                    sm.status
                    
                FROM signal_metrics_log sm
                WHERE sm.processed_at >= NOW() - INTERVAL '24 hours'
                  AND sm.ai_approved IS NOT NULL
                ORDER BY sm.processed_at DESC
                LIMIT $1
            \`, [limit]);

            // Estatísticas das decisões da IA
            const estatisticasIA = await this.pool.query(\`
                SELECT 
                    COUNT(*) as total_decisions,
                    COUNT(CASE WHEN ai_approved = true THEN 1 END) as approved_count,
                    COUNT(CASE WHEN ai_approved = false THEN 1 END) as rejected_count,
                    AVG(confidence) as avg_confidence,
                    COUNT(CASE WHEN is_strong_signal = true THEN 1 END) as strong_signal_count,
                    AVG(execution_time_ms) as avg_processing_time_ms
                FROM signal_metrics_log
                WHERE processed_at >= NOW() - INTERVAL '24 hours'
                  AND ai_approved IS NOT NULL
            \`);

            res.json({
                success: true,
                data: {
                    decisions: decisoesIA.rows,
                    statistics: estatisticasIA.rows[0],
                    timestamp: new Date().toISOString()
                }
            });

        } catch (error) {
            console.error('❌ Erro ao buscar decisões da IA:', error);
            res.status(500).json({ error: error.message });
        }
    }`;

    // 2. CORREÇÃO: getPerformanceUsuarios - Problema com colunas admin_credits_*
    console.log('2️⃣ Corrigindo getPerformanceUsuarios...');
    const queryUsuariosCorrigida = `
    async getPerformanceUsuarios(req, res) {
        try {
            const performanceUsuarios = await this.pool.query(\`
                SELECT 
                    u.id,
                    u.email,
                    u.plan_type,
                    u.user_type,
                    u.created_at as user_since,
                    u.last_login,
                    
                    -- Estatísticas de trading
                    COUNT(to_.id) as total_orders,
                    COUNT(CASE WHEN to_.status = 'FILLED' THEN 1 END) as successful_orders,
                    COUNT(CASE WHEN to_.status = 'FAILED' THEN 1 END) as failed_orders,
                    SUM(CASE WHEN to_.status = 'FILLED' THEN to_.quantity ELSE 0 END) as total_volume,
                    AVG(CASE WHEN to_.filled_at IS NOT NULL THEN EXTRACT(EPOCH FROM (to_.filled_at - to_.created_at)) END) as avg_execution_time,
                    
                    -- Saldos atuais (colunas que existem)
                    u.balance_brl,
                    u.balance_usd,
                    u.balance_admin_brl,
                    u.balance_admin_usd,
                    
                    -- Última atividade
                    MAX(to_.created_at) as last_order_time,
                    
                    -- Performance ratio
                    CASE 
                        WHEN COUNT(to_.id) > 0 THEN 
                            ROUND((COUNT(CASE WHEN to_.status = 'FILLED' THEN 1 END)::numeric / COUNT(to_.id)::numeric) * 100, 2)
                        ELSE 0 
                    END as success_rate_percentage
                    
                FROM users u
                LEFT JOIN trading_orders to_ ON u.id = to_.user_id AND to_.created_at >= NOW() - INTERVAL '30 days'
                WHERE u.is_active = true
                GROUP BY u.id, u.email, u.plan_type, u.user_type, u.created_at, u.last_login, 
                         u.balance_brl, u.balance_usd, u.balance_admin_brl, u.balance_admin_usd
                ORDER BY total_orders DESC, success_rate_percentage DESC
                LIMIT 100
            \`);

            // Estatísticas gerais de usuários
            const estatisticasUsuarios = await this.pool.query(\`
                SELECT 
                    COUNT(*) as total_active_users,
                    COUNT(CASE WHEN last_login >= CURRENT_DATE THEN 1 END) as users_active_today,
                    COUNT(CASE WHEN plan_type = 'VIP' THEN 1 END) as vip_users,
                    COUNT(CASE WHEN plan_type = 'PREMIUM' THEN 1 END) as premium_users,
                    COUNT(CASE WHEN plan_type = 'BASIC' THEN 1 END) as basic_users,
                    AVG(COALESCE(balance_brl, 0) + COALESCE(balance_usd, 0)) as avg_balance
                FROM users
                WHERE is_active = true
            \`);

            res.json({
                success: true,
                data: {
                    userPerformance: performanceUsuarios.rows,
                    userStatistics: estatisticasUsuarios.rows[0],
                    timestamp: new Date().toISOString()
                }
            });

        } catch (error) {
            console.error('❌ Erro ao buscar performance de usuários:', error);
            res.status(500).json({ error: error.message });
        }
    }`;

    // Aplicar as correções no arquivo
    console.log('💾 Aplicando correções no arquivo...');
    
    // Buscar e substituir getDecissoesIA
    const regexDecissoesIA = /async getDecissoesIA\(req, res\) \{[\s\S]*?^\s{4}\}/m;
    if (regexDecissoesIA.test(conteudo)) {
        conteudo = conteudo.replace(regexDecissoesIA, queryDecissoesIACorrigida.trim());
        console.log('   ✅ getDecissoesIA corrigida');
    } else {
        console.log('   ❌ Não foi possível encontrar getDecissoesIA');
    }
    
    // Buscar e substituir getPerformanceUsuarios
    const regexUsuarios = /async getPerformanceUsuarios\(req, res\) \{[\s\S]*?^\s{4}\}/m;
    if (regexUsuarios.test(conteudo)) {
        conteudo = conteudo.replace(regexUsuarios, queryUsuariosCorrigida.trim());
        console.log('   ✅ getPerformanceUsuarios corrigida');
    } else {
        console.log('   ❌ Não foi possível encontrar getPerformanceUsuarios');
    }
    
    // Salvar o arquivo corrigido
    console.log('💾 Salvando arquivo corrigido...');
    fs.writeFileSync(arquivoDashboard, conteudo, 'utf8');
    
    console.log('✅ CORREÇÕES APLICADAS COM SUCESSO!');
    console.log('\n📋 RESUMO DAS CORREÇÕES:');
    console.log('   ✅ getDecissoesIA: Queries corrigidas para usar signal_metrics_log');
    console.log('   ✅ getPerformanceUsuarios: Colunas de saldo corrigidas');
    console.log('   ✅ Eliminados JOINs problemáticos');
    console.log('   ✅ Referências de colunas corrigidas');
}

// Executar correções
corrigirQueriesDashboard();
