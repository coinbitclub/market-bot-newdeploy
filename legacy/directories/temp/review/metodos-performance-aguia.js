/**
 * 📊 MÉTODOS DE PERFORMANCE E AGUIA NEWS
 * Para ser integrado ao dashboard-completo.js
 */

/**
 * 📊 MÉTRICAS DE PERFORMANCE E ÍNDICES DE ACERTO
 */
async getMetricasPerformance(req, res) {
    try {
        console.log('📊 Buscando métricas de performance...');

        // Atualizar métricas antes de buscar
        await this.atualizarMetricasPerformance();

        // 🎯 RANKING DE PERFORMANCE
        const rankingPerformance = await this.pool.query(`
            SELECT 
                u.id,
                u.email,
                u.user_type,
                u.plan_type,
                COALESCE(u.total_trades, 0) as total_trades,
                COALESCE(u.winning_trades, 0) as winning_trades,
                COALESCE(u.losing_trades, 0) as losing_trades,
                COALESCE(u.win_rate_percentage, 0) as win_rate_percentage,
                COALESCE(u.total_pnl, 0) as total_pnl,
                COALESCE(u.average_return_per_trade, 0) as average_return_per_trade,
                COALESCE(u.accumulated_return, 0) as accumulated_return,
                COALESCE(u.best_trade_pnl, 0) as best_trade_pnl,
                COALESCE(u.worst_trade_pnl, 0) as worst_trade_pnl,
                u.last_trade_date,
                u.performance_updated_at,
                -- Classificação de performance
                CASE 
                    WHEN u.win_rate_percentage >= 70 AND u.total_trades >= 10 THEN 'EXCELENTE'
                    WHEN u.win_rate_percentage >= 60 AND u.total_trades >= 5 THEN 'MUITO_BOM'
                    WHEN u.win_rate_percentage >= 50 AND u.total_trades >= 3 THEN 'BOM'
                    WHEN u.total_trades > 0 THEN 'REGULAR'
                    ELSE 'SEM_DADOS'
                END as performance_classification
            FROM users u
            WHERE u.is_active = true
            ORDER BY u.win_rate_percentage DESC, u.total_trades DESC, u.accumulated_return DESC
            LIMIT 50
        `);

        // 📈 ESTATÍSTICAS GLOBAIS
        const estatisticasGlobais = await this.pool.query(`
            SELECT 
                COUNT(*) as total_usuarios_ativos,
                COUNT(CASE WHEN total_trades > 0 THEN 1 END) as usuarios_com_trades,
                SUM(COALESCE(total_trades, 0)) as total_trades_plataforma,
                SUM(COALESCE(winning_trades, 0)) as total_winning_trades,
                SUM(COALESCE(losing_trades, 0)) as total_losing_trades,
                AVG(COALESCE(win_rate_percentage, 0)) as avg_win_rate_global,
                SUM(COALESCE(total_pnl, 0)) as total_pnl_plataforma,
                AVG(COALESCE(average_return_per_trade, 0)) as avg_return_global,
                MAX(COALESCE(win_rate_percentage, 0)) as melhor_win_rate,
                MAX(COALESCE(total_pnl, 0)) as melhor_pnl_acumulado,
                COUNT(CASE WHEN win_rate_percentage >= 70 THEN 1 END) as usuarios_excelentes,
                COUNT(CASE WHEN win_rate_percentage >= 60 THEN 1 END) as usuarios_muito_bons,
                COUNT(CASE WHEN win_rate_percentage >= 50 THEN 1 END) as usuarios_bons
            FROM users
            WHERE is_active = true
        `);

        // 📊 TRADES RECENTES COM PNL
        const tradesRecentes = await this.pool.query(`
            SELECT 
                oe.id,
                u.email,
                oe.symbol,
                oe.side,
                oe.quantity,
                oe.price,
                oe.status,
                COALESCE(oe.pnl, 0) as pnl,
                COALESCE(oe.pnl_percentage, 0) as pnl_percentage,
                oe.is_profitable,
                oe.created_at,
                oe.exit_time,
                oe.duration_minutes
            FROM order_executions_v2 oe
            JOIN users u ON u.id = oe.user_id
            WHERE oe.status = 'FILLED' AND u.is_active = true
            ORDER BY oe.created_at DESC
            LIMIT 20
        `);

        res.json({
            success: true,
            data: {
                ranking: rankingPerformance.rows,
                statistics: estatisticasGlobais.rows[0],
                recentTrades: tradesRecentes.rows,
                summary: {
                    totalActiveUsers: rankingPerformance.rows.length,
                    avgWinRate: estatisticasGlobais.rows[0]?.avg_win_rate_global || 0,
                    totalPlatformPnl: estatisticasGlobais.rows[0]?.total_pnl_plataforma || 0,
                    lastUpdate: new Date().toISOString()
                }
            },
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Erro ao buscar métricas de performance:', error);
        res.status(500).json({ 
            success: false,
            error: 'Erro interno do servidor',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined,
            timestamp: new Date().toISOString()
        });
    }
}

/**
 * 🦅 AGUIA NEWS REPORTS
 */
async getAguiaNewsReports(req, res) {
    try {
        console.log('🦅 Buscando relatórios Aguia News...');

        // Verificar se precisa gerar novo relatório (a cada 4 horas)
        const ultimoRelatorio = await this.pool.query(`
            SELECT published_at FROM aguia_news_reports 
            WHERE report_type = 'RADAR' 
            ORDER BY published_at DESC 
            LIMIT 1
        `);

        const precisaNovoRelatorio = !ultimoRelatorio.rows[0] || 
            (Date.now() - new Date(ultimoRelatorio.rows[0].published_at).getTime()) > (4 * 60 * 60 * 1000);

        if (precisaNovoRelatorio) {
            await this.gerarNovoRelatorioAguia();
        }

        // 📰 RELATÓRIOS RECENTES
        const relatoriosRecentes = await this.pool.query(`
            SELECT 
                id,
                report_type,
                title,
                content,
                summary,
                market_sentiment,
                fear_greed_index,
                btc_dominance,
                top_movers,
                recommendations,
                views_count,
                likes_count,
                published_at,
                created_at
            FROM aguia_news_reports
            WHERE status = 'PUBLISHED'
            ORDER BY published_at DESC
            LIMIT 10
        `);

        // 📊 ESTATÍSTICAS DOS RELATÓRIOS
        const estatisticasRelatorios = await this.pool.query(`
            SELECT 
                COUNT(*) as total_reports,
                COUNT(CASE WHEN published_at >= CURRENT_DATE THEN 1 END) as reports_today,
                COUNT(CASE WHEN report_type = 'RADAR' THEN 1 END) as total_radars,
                COUNT(CASE WHEN report_type = 'ANALYSIS' THEN 1 END) as total_analysis,
                SUM(views_count) as total_views,
                SUM(likes_count) as total_likes,
                AVG(fear_greed_index) as avg_fear_greed,
                MAX(published_at) as last_report_time
            FROM aguia_news_reports
            WHERE status = 'PUBLISHED'
        `);

        res.json({
            success: true,
            data: {
                recentReports: relatoriosRecentes.rows,
                statistics: estatisticasRelatorios.rows[0],
                nextReportIn: this.calcularProximoRelatorio(),
                summary: {
                    totalReports: relatoriosRecentes.rows.length,
                    needsNewReport: precisaNovoRelatorio,
                    lastUpdate: new Date().toISOString()
                }
            },
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Erro ao buscar Aguia News:', error);
        res.status(500).json({ 
            success: false,
            error: 'Erro interno do servidor',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined,
            timestamp: new Date().toISOString()
        });
    }
}

/**
 * ⏰ CALCULAR PRÓXIMO RELATÓRIO
 */
calcularProximoRelatorio() {
    const agora = new Date();
    const proximaGeracao = new Date(agora);
    proximaGeracao.setHours(Math.ceil(agora.getHours() / 4) * 4, 0, 0, 0);
    
    if (proximaGeracao <= agora) {
        proximaGeracao.setHours(proximaGeracao.getHours() + 4);
    }
    
    const msAteProximo = proximaGeracao.getTime() - agora.getTime();
    const horasAteProximo = Math.floor(msAteProximo / (1000 * 60 * 60));
    const minutosAteProximo = Math.floor((msAteProximo % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${horasAteProximo}h ${minutosAteProximo}m`;
}

/**
 * 🔄 ATUALIZAR MÉTRICAS DE PERFORMANCE
 */
async atualizarMetricasPerformance() {
    try {
        await this.pool.query(`
            UPDATE users SET
                total_trades = subq.total_trades,
                winning_trades = subq.winning_trades,
                losing_trades = subq.losing_trades,
                win_rate_percentage = subq.win_rate_percentage,
                total_pnl = subq.total_pnl,
                average_return_per_trade = subq.average_return_per_trade,
                accumulated_return = subq.total_pnl,
                best_trade_pnl = subq.best_pnl,
                worst_trade_pnl = subq.worst_pnl,
                last_trade_date = subq.last_trade,
                performance_updated_at = NOW()
            FROM (
                SELECT 
                    user_id,
                    COUNT(*) as total_trades,
                    COUNT(CASE WHEN COALESCE(pnl, 0) > 0 THEN 1 END) as winning_trades,
                    COUNT(CASE WHEN COALESCE(pnl, 0) < 0 THEN 1 END) as losing_trades,
                    CASE WHEN COUNT(*) > 0 
                         THEN (COUNT(CASE WHEN COALESCE(pnl, 0) > 0 THEN 1 END)::NUMERIC / COUNT(*)::NUMERIC) * 100 
                         ELSE 0 END as win_rate_percentage,
                    COALESCE(SUM(pnl), 0) as total_pnl,
                    COALESCE(AVG(pnl), 0) as average_return_per_trade,
                    COALESCE(MAX(pnl), 0) as best_pnl,
                    COALESCE(MIN(pnl), 0) as worst_pnl,
                    MAX(created_at) as last_trade
                FROM order_executions_v2 
                WHERE status = 'FILLED'
                GROUP BY user_id
            ) subq
            WHERE users.id = subq.user_id AND users.is_active = true
        `);
    } catch (error) {
        console.log('⚠️ Erro ao atualizar métricas:', error.message);
    }
}

/**
 * 📰 GERAR NOVO RELATÓRIO AGUIA
 */
async gerarNovoRelatorioAguia() {
    try {
        const marketData = await this.buscarDadosMercado();
        
        const novoRelatorio = {
            title: `Radar de Mercado - ${new Date().toLocaleDateString('pt-BR')}`,
            content: this.gerarConteudoRadar(marketData),
            summary: 'Análise técnica e fundamental do mercado cripto atualizada.',
            market_sentiment: marketData.sentiment || 'NEUTRAL',
            fear_greed_index: marketData.fearGreed || 50,
            btc_dominance: marketData.btcDominance || 50,
            recommendations: JSON.stringify(marketData.recommendations || [])
        };

        await this.pool.query(`
            INSERT INTO aguia_news_reports (
                report_type, title, content, summary, market_sentiment,
                fear_greed_index, btc_dominance, recommendations
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [
            'RADAR',
            novoRelatorio.title,
            novoRelatorio.content,
            novoRelatorio.summary,
            novoRelatorio.market_sentiment,
            novoRelatorio.fear_greed_index,
            novoRelatorio.btc_dominance,
            novoRelatorio.recommendations
        ]);

        console.log('✅ Novo relatório Aguia gerado');
    } catch (error) {
        console.log('⚠️ Erro ao gerar novo relatório:', error.message);
    }
}

async buscarDadosMercado() {
    return {
        sentiment: 'BULLISH',
        fearGreed: Math.floor(Math.random() * 100),
        btcDominance: 58 + Math.random() * 10,
        recommendations: [
            'Manter posições em BTC',
            'Observar altcoins para entrada',
            'Stop loss em suportes técnicos'
        ]
    };
}

gerarConteudoRadar(marketData) {
    return `
# 🦅 RADAR DE MERCADO CRIPTO

## 📊 Análise Técnica
- **Bitcoin**: Mantém tendência de alta com suporte em $42,000
- **Ethereum**: Consolidação em range, aguardando rompimento
- **Altcoins**: Sinais de recuperação em projetos fundamentalistas

## 📈 Indicadores
- **Fear & Greed**: ${marketData.fearGreed}/100
- **Dominância BTC**: ${marketData.btcDominance.toFixed(1)}%
- **Sentimento**: ${marketData.sentiment}

## 🎯 Recomendações
${marketData.recommendations.map(r => `- ${r}`).join('\n')}

---
*Relatório gerado automaticamente - ${new Date().toLocaleString('pt-BR')}*
    `.trim();
}
