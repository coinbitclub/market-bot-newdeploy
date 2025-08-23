// 🔧 CORREÇÃO ESPECÍFICA DA FUNÇÃO getPerformanceUsuarios
const fs = require('fs');
const path = require('path');

function corrigirFuncaoUsuarios() {
    console.log('🔧 CORRIGINDO FUNÇÃO getPerformanceUsuarios');
    console.log('===========================================');
    
    const arquivoDashboard = path.join(__dirname, 'dashboard-completo.js');
    let conteudo = fs.readFileSync(arquivoDashboard, 'utf8');
    
    // Nova implementação da função completamente corrigida
    const novaFuncao = `    async getPerformanceUsuarios(req, res) {
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
                    SUM(CASE WHEN to_.status = 'FILLED' THEN COALESCE(to_.quantity, 0) ELSE 0 END) as total_volume,
                    AVG(CASE WHEN to_.filled_at IS NOT NULL THEN EXTRACT(EPOCH FROM (to_.filled_at - to_.created_at)) END) as avg_execution_time,
                    
                    -- Saldos atuais (usando colunas que existem)
                    COALESCE(u.balance_brl, 0) as balance_brl,
                    COALESCE(u.balance_usd, 0) as balance_usd,
                    COALESCE(u.balance_admin_brl, 0) as balance_admin_brl,
                    COALESCE(u.balance_admin_usd, 0) as balance_admin_usd,
                    
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

            // Estatísticas gerais de usuários - corrigidas
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

    // Buscar e substituir a função inteira
    const regexFuncaoCompleta = /async getPerformanceUsuarios\(req, res\) \{[\s\S]*?(?=^\s{4}[a-zA-Z]|\s{4}\/\*\*|\s{4}async|$)/m;
    
    if (regexFuncaoCompleta.test(conteudo)) {
        conteudo = conteudo.replace(regexFuncaoCompleta, novaFuncao);
        console.log('✅ Função getPerformanceUsuarios substituída');
    } else {
        console.log('❌ Não foi possível encontrar a função para substituir');
        
        // Tentar abordagem mais simples
        const inicio = conteudo.indexOf('async getPerformanceUsuarios(req, res) {');
        if (inicio !== -1) {
            // Encontrar o final da função
            let braceCount = 0;
            let i = inicio;
            let encontrouPrimeiraBrace = false;
            
            while (i < conteudo.length) {
                if (conteudo[i] === '{') {
                    braceCount++;
                    encontrouPrimeiraBrace = true;
                } else if (conteudo[i] === '}') {
                    braceCount--;
                    if (encontrouPrimeiraBrace && braceCount === 0) {
                        // Encontrou o final da função
                        const fim = i + 1;
                        const funcaoAntiga = conteudo.substring(inicio, fim);
                        conteudo = conteudo.replace(funcaoAntiga, novaFuncao);
                        console.log('✅ Função substituída usando método alternativo');
                        break;
                    }
                }
                i++;
            }
        }
    }
    
    // Salvar arquivo
    fs.writeFileSync(arquivoDashboard, conteudo, 'utf8');
    console.log('💾 Arquivo salvo com sucesso');
}

corrigirFuncaoUsuarios();
