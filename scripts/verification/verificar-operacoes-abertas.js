/**
 * 🔍 VERIFICADOR DE OPERAÇÕES ABERTAS
 * ====================================
 * 
 * Verifica se existem operações de trading reais em aberto
 * no sistema de produção.
 * 
 * @author Sistema Automatizado
 * @version 1.0
 * @date 07/08/2025 21:25
 */

const { Pool } = require('pg');

class VerificadorOperacoes {
    constructor() {
        this.pool = new Pool({
            host: 'trolley.proxy.rlwy.net',
            port: 44790,
            database: 'railway',
            user: 'postgres',
            password: 'process.env.API_KEY_HERE',
            ssl: {
                rejectUnauthorized: false
            }
        });
    }

    /**
     * 📝 LOG FORMATADO
     */
    log(message, level = 'INFO') {
        const timestamp = new Date().toLocaleString('pt-BR');
        const prefix = {
            'INFO': '[INFO]',
            'WARNING': '[⚠️ ]',
            'SUCCESS': '[✅]',
            'ERROR': '[❌]'
        }[level] || '[INFO]';
        
        console.log(`[${timestamp}] ${prefix} ${message}`);
    }

    /**
     * 🔍 VERIFICAR TRADING EXECUTIONS ATIVAS
     */
    async verificarTradingExecutions() {
        this.log('🔍 Verificando trading executions ativas...');
        
        try {
            const execucoes = await this.pool.query(`
                SELECT 
                    id,
                    user_id,
                    symbol,
                    side,
                    quantity,
                    price,
                    status,
                    created_at,
                    updated_at
                FROM user_trading_executions 
                WHERE status IN ('pending', 'executing', 'partially_filled', 'active')
                ORDER BY created_at DESC
            `);

            if (execucoes.rows.length > 0) {
                this.log(`⚠️  ${execucoes.rows.length} trading executions ativas encontradas:`, 'WARNING');
                execucoes.rows.forEach(exec => {
                    this.log(`   • ID ${exec.id} - User ${exec.user_id} - ${exec.symbol} ${exec.side} ${exec.quantity} @ ${exec.price} - Status: ${exec.status}`);
                });
            } else {
                this.log('✅ Nenhuma trading execution ativa encontrada');
            }

            return execucoes.rows;
        } catch (error) {
            this.log(`❌ Erro ao verificar trading executions: ${error.message}`, 'ERROR');
            return [];
        }
    }

    /**
     * 🔍 VERIFICAR TRADING ORDERS ATIVAS
     */
    async verificarTradingOrders() {
        this.log('🔍 Verificando trading orders ativas...');
        
        try {
            const orders = await this.pool.query(`
                SELECT 
                    id,
                    user_id,
                    symbol,
                    side,
                    quantity,
                    price,
                    status,
                    order_type,
                    created_at
                FROM trading_orders 
                WHERE status IN ('pending', 'open', 'partially_filled', 'active', 'new')
                ORDER BY created_at DESC
            `);

            if (orders.rows.length > 0) {
                this.log(`⚠️  ${orders.rows.length} trading orders ativas encontradas:`, 'WARNING');
                orders.rows.forEach(order => {
                    this.log(`   • ID ${order.id} - User ${order.user_id} - ${order.symbol} ${order.side} ${order.quantity} @ ${order.price} - Status: ${order.status}`);
                });
            } else {
                this.log('✅ Nenhuma trading order ativa encontrada');
            }

            return orders.rows;
        } catch (error) {
            this.log(`❌ Erro ao verificar trading orders: ${error.message}`, 'ERROR');
            return [];
        }
    }

    /**
     * 🔍 VERIFICAR POSIÇÕES ABERTAS
     */
    async verificarPosicoesAbertas() {
        this.log('🔍 Verificando posições abertas...');
        
        try {
            const posicoes = await this.pool.query(`
                SELECT 
                    id,
                    user_id,
                    symbol,
                    side,
                    size,
                    entry_price,
                    unrealized_pnl,
                    status,
                    created_at
                FROM trading_positions 
                WHERE status IN ('open', 'active')
                ORDER BY created_at DESC
            `);

            if (posicoes.rows.length > 0) {
                this.log(`⚠️  ${posicoes.rows.length} posições abertas encontradas:`, 'WARNING');
                posicoes.rows.forEach(pos => {
                    const pnl = pos.unrealized_pnl ? `PnL: ${pos.unrealized_pnl}` : 'PnL: N/A';
                    this.log(`   • ID ${pos.id} - User ${pos.user_id} - ${pos.symbol} ${pos.side} ${pos.size} @ ${pos.entry_price} - ${pnl}`);
                });
            } else {
                this.log('✅ Nenhuma posição aberta encontrada');
            }

            return posicoes.rows;
        } catch (error) {
            this.log(`❌ Erro ao verificar posições: ${error.message}`, 'ERROR');
            return [];
        }
    }

    /**
     * 🔍 VERIFICAR POSITIONS (TABELA ALTERNATIVA)
     */
    async verificarPositions() {
        this.log('🔍 Verificando positions (tabela alternativa)...');
        
        try {
            const positions = await this.pool.query(`
                SELECT 
                    id,
                    user_id,
                    symbol,
                    position_side,
                    size,
                    entry_price,
                    mark_price,
                    unrealized_pnl,
                    created_at
                FROM positions 
                WHERE size > 0
                ORDER BY created_at DESC
            `);

            if (positions.rows.length > 0) {
                this.log(`⚠️  ${positions.rows.length} positions com size > 0 encontradas:`, 'WARNING');
                positions.rows.forEach(pos => {
                    const pnl = pos.unrealized_pnl ? `PnL: ${pos.unrealized_pnl}` : 'PnL: N/A';
                    this.log(`   • ID ${pos.id} - User ${pos.user_id} - ${pos.symbol} ${pos.position_side} ${pos.size} @ ${pos.entry_price} - ${pnl}`);
                });
            } else {
                this.log('✅ Nenhuma position com size > 0 encontrada');
            }

            return positions.rows;
        } catch (error) {
            this.log(`❌ Erro ao verificar positions: ${error.message}`, 'ERROR');
            return [];
        }
    }

    /**
     * 🔍 VERIFICAR TRADES RECENTES
     */
    async verificarTradesRecentes() {
        this.log('🔍 Verificando trades das últimas 24h...');
        
        try {
            const trades = await this.pool.query(`
                SELECT 
                    id,
                    user_id,
                    symbol,
                    side,
                    quantity,
                    price,
                    status,
                    created_at
                FROM trades 
                WHERE created_at > NOW() - INTERVAL '24 hours'
                ORDER BY created_at DESC
                LIMIT 20
            `);

            if (trades.rows.length > 0) {
                this.log(`📊 ${trades.rows.length} trades nas últimas 24h:`, 'INFO');
                trades.rows.forEach(trade => {
                    this.log(`   • ID ${trade.id} - User ${trade.user_id} - ${trade.symbol} ${trade.side} ${trade.quantity} @ ${trade.price} - ${trade.status}`);
                });
            } else {
                this.log('✅ Nenhum trade nas últimas 24h');
            }

            return trades.rows;
        } catch (error) {
            this.log(`❌ Erro ao verificar trades: ${error.message}`, 'ERROR');
            return [];
        }
    }

    /**
     * 🔍 VERIFICAR BALANCES COM VALORES
     */
    async verificarBalances() {
        this.log('🔍 Verificando balances com valores...');
        
        try {
            const balances = await this.pool.query(`
                SELECT 
                    user_id,
                    asset,
                    free,
                    locked,
                    total,
                    updated_at
                FROM balances 
                WHERE (free > 0 OR locked > 0)
                AND asset IN ('USDT', 'BTC', 'ETH', 'BNB')
                ORDER BY total DESC
                LIMIT 20
            `);

            if (balances.rows.length > 0) {
                this.log(`💰 ${balances.rows.length} balances com valores encontrados:`, 'INFO');
                balances.rows.forEach(bal => {
                    this.log(`   • User ${bal.user_id} - ${bal.asset}: Free ${bal.free}, Locked ${bal.locked}, Total ${bal.total}`);
                });
            } else {
                this.log('✅ Nenhum balance significativo encontrado');
            }

            return balances.rows;
        } catch (error) {
            this.log(`❌ Erro ao verificar balances: ${error.message}`, 'ERROR');
            return [];
        }
    }

    /**
     * 📊 GERAR RELATÓRIO COMPLETO
     */
    async gerarRelatorio() {
        this.log('📊 GERANDO RELATÓRIO DE OPERAÇÕES ABERTAS', 'SUCCESS');
        console.log('='.repeat(60));
        
        try {
            // 1. Trading Executions
            const execucoes = await this.verificarTradingExecutions();
            console.log('');

            // 2. Trading Orders
            const orders = await this.verificarTradingOrders();
            console.log('');

            // 3. Trading Positions
            const posicoes = await this.verificarPosicoesAbertas();
            console.log('');

            // 4. Positions
            const positions = await this.verificarPositions();
            console.log('');

            // 5. Trades Recentes
            const trades = await this.verificarTradesRecentes();
            console.log('');

            // 6. Balances
            const balances = await this.verificarBalances();
            console.log('');

            // Resumo Final
            console.log('='.repeat(60));
            this.log('📋 RESUMO FINAL:', 'SUCCESS');
            this.log(`🔄 Trading Executions Ativas: ${execucoes.length}`);
            this.log(`📋 Trading Orders Ativas: ${orders.length}`);
            this.log(`📈 Trading Positions Abertas: ${posicoes.length}`);
            this.log(`💹 Positions com Size > 0: ${positions.length}`);
            this.log(`⚡ Trades (24h): ${trades.length}`);
            this.log(`💰 Balances com Valor: ${balances.length}`);

            const temOperacoesAbertas = execucoes.length > 0 || orders.length > 0 || posicoes.length > 0 || positions.length > 0;
            
            if (temOperacoesAbertas) {
                this.log('⚠️  ATENÇÃO: Existem operações abertas no sistema!', 'WARNING');
            } else {
                this.log('✅ Nenhuma operação aberta detectada', 'SUCCESS');
            }

            return {
                execucoes,
                orders,
                posicoes,
                positions,
                trades,
                balances,
                temOperacoesAbertas
            };

        } catch (error) {
            this.log(`❌ Erro no relatório: ${error.message}`, 'ERROR');
            throw error;
        } finally {
            await this.pool.end();
        }
    }
}

// 🚀 EXECUÇÃO
if (require.main === module) {
    const verificador = new VerificadorOperacoes();
    verificador.gerarRelatorio().then(resultado => {
        console.log('\n🎯 Verificação concluída!');
        process.exit(0);
    }).catch(error => {
        console.error('❌ ERRO:', error.message);
        process.exit(1);
    });
}

module.exports = VerificadorOperacoes;
