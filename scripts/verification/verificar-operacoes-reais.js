/**
 * 🔍 VERIFICADOR DE OPERAÇÕES - ESTRUTURA REAL
 * ============================================
 * 
 * Verifica operações abertas usando a estrutura real das tabelas
 * 
 * @author Sistema Automatizado  
 * @version 2.0
 * @date 07/08/2025 21:26
 */

const { Pool } = require('pg');

class VerificadorOperacoesReal {
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
     * 🔍 VERIFICAR ESTRUTURA DAS TABELAS DE TRADING
     */
    async verificarEstruturaTabelasTrading() {
        this.log('🔍 Verificando estrutura das tabelas de trading...');
        
        try {
            // Verificar colunas das principais tabelas de trading
            const tabelas = [
                'user_trading_executions',
                'trading_orders', 
                'trading_positions',
                'positions',
                'trades',
                'balances'
            ];

            for (const tabela of tabelas) {
                try {
                    const colunas = await this.pool.query(`
                        SELECT column_name, data_type 
                        FROM information_schema.columns 
                        WHERE table_name = $1 
                        AND table_schema = 'public'
                        ORDER BY ordinal_position
                    `, [tabela]);

                    if (colunas.rows.length > 0) {
                        this.log(`📋 Tabela ${tabela}:`);
                        colunas.rows.forEach(col => {
                            this.log(`   • ${col.column_name} (${col.data_type})`);
                        });
                    } else {
                        this.log(`❌ Tabela ${tabela} não encontrada`);
                    }
                    console.log('');
                } catch (error) {
                    this.log(`❌ Erro ao verificar ${tabela}: ${error.message}`, 'ERROR');
                }
            }

            return true;
        } catch (error) {
            this.log(`❌ Erro geral: ${error.message}`, 'ERROR');
            return false;
        }
    }

    /**
     * 🔍 VERIFICAR DADOS REAIS DAS TABELAS
     */
    async verificarDadosReais() {
        this.log('🔍 Verificando dados reais nas tabelas...');
        
        try {
            // 1. User Trading Executions
            const executions = await this.pool.query(`
                SELECT COUNT(*) as total, 
                       COUNT(CASE WHEN status = 'active' THEN 1 END) as ativas,
                       COUNT(CASE WHEN status = 'pending' THEN 1 END) as pendentes
                FROM user_trading_executions
            `);
            this.log(`🔄 Trading Executions: Total ${executions.rows[0].total}, Ativas ${executions.rows[0].ativas}, Pendentes ${executions.rows[0].pendentes}`);

            // 2. Trading Orders  
            const orders = await this.pool.query(`
                SELECT COUNT(*) as total,
                       COUNT(CASE WHEN status IN ('open', 'pending', 'new') THEN 1 END) as abertas
                FROM trading_orders
            `);
            this.log(`📋 Trading Orders: Total ${orders.rows[0].total}, Abertas ${orders.rows[0].abertas}`);

            // 3. Trading Positions
            const positions = await this.pool.query(`
                SELECT COUNT(*) as total,
                       COUNT(CASE WHEN status = 'open' THEN 1 END) as abertas
                FROM trading_positions
            `);
            this.log(`📈 Trading Positions: Total ${positions.rows[0].total}, Abertas ${positions.rows[0].abertas}`);

            // 4. Positions
            const pos = await this.pool.query(`
                SELECT COUNT(*) as total
                FROM positions
            `);
            this.log(`💹 Positions: Total ${pos.rows[0].total}`);

            // 5. Trades
            const trades = await this.pool.query(`
                SELECT COUNT(*) as total,
                       COUNT(CASE WHEN created_at > NOW() - INTERVAL '24 hours' THEN 1 END) as recentes
                FROM trades
            `);
            this.log(`⚡ Trades: Total ${trades.rows[0].total}, Últimas 24h ${trades.rows[0].recentes}`);

            // 6. Balances
            const balances = await this.pool.query(`
                SELECT COUNT(*) as total
                FROM balances
            `);
            this.log(`💰 Balances: Total ${balances.rows[0].total}`);

            return true;
        } catch (error) {
            this.log(`❌ Erro ao verificar dados: ${error.message}`, 'ERROR');
            return false;
        }
    }

    /**
     * 🔍 BUSCAR REGISTROS ESPECÍFICOS DE OPERAÇÕES
     */
    async buscarOperacoesEspecificas() {
        this.log('🔍 Buscando registros específicos de operações...');
        
        try {
            // Verificar últimas executions com detalhes
            const ultimasExec = await this.pool.query(`
                SELECT * FROM user_trading_executions 
                ORDER BY created_at DESC 
                LIMIT 5
            `);

            if (ultimasExec.rows.length > 0) {
                this.log(`🔄 Últimas ${ultimasExec.rows.length} Trading Executions:`);
                ultimasExec.rows.forEach(exec => {
                    const info = Object.keys(exec).map(key => `${key}: ${exec[key]}`).join(', ');
                    this.log(`   • ID ${exec.id}: ${info}`);
                });
            } else {
                this.log('✅ Nenhuma trading execution encontrada');
            }

            // Verificar últimas orders
            const ultimasOrders = await this.pool.query(`
                SELECT * FROM trading_orders 
                ORDER BY created_at DESC 
                LIMIT 5
            `);

            if (ultimasOrders.rows.length > 0) {
                this.log(`📋 Últimas ${ultimasOrders.rows.length} Trading Orders:`);
                ultimasOrders.rows.forEach(order => {
                    const info = Object.keys(order).map(key => `${key}: ${order[key]}`).join(', ');
                    this.log(`   • ID ${order.id}: ${info}`);
                });
            } else {
                this.log('✅ Nenhuma trading order encontrada');
            }

            // Verificar últimas positions
            const ultimasPos = await this.pool.query(`
                SELECT * FROM trading_positions 
                ORDER BY created_at DESC 
                LIMIT 5
            `);

            if (ultimasPos.rows.length > 0) {
                this.log(`📈 Últimas ${ultimasPos.rows.length} Trading Positions:`);
                ultimasPos.rows.forEach(pos => {
                    const info = Object.keys(pos).map(key => `${key}: ${pos[key]}`).join(', ');
                    this.log(`   • ID ${pos.id}: ${info}`);
                });
            } else {
                this.log('✅ Nenhuma trading position encontrada');
            }

            return true;
        } catch (error) {
            this.log(`❌ Erro ao buscar operações: ${error.message}`, 'ERROR');
            return false;
        }
    }

    /**
     * 📊 EXECUTAR VERIFICAÇÃO COMPLETA
     */
    async executar() {
        this.log('📊 INICIANDO VERIFICAÇÃO COMPLETA DE OPERAÇÕES', 'SUCCESS');
        console.log('='.repeat(70));
        
        try {
            // 1. Verificar estrutura
            await this.verificarEstruturaTabelasTrading();
            console.log('');

            // 2. Verificar dados gerais
            await this.verificarDadosReais();
            console.log('');

            // 3. Buscar operações específicas
            await this.buscarOperacoesEspecificas();

            console.log('='.repeat(70));
            this.log('🎯 VERIFICAÇÃO CONCLUÍDA!', 'SUCCESS');

        } catch (error) {
            this.log(`❌ ERRO CRÍTICO: ${error.message}`, 'ERROR');
            throw error;
        } finally {
            await this.pool.end();
        }
    }
}

// 🚀 EXECUÇÃO
if (require.main === module) {
    const verificador = new VerificadorOperacoesReal();
    verificador.executar().then(() => {
        console.log('\n✅ Verificação finalizada!');
        process.exit(0);
    }).catch(error => {
        console.error('❌ ERRO:', error.message);
        process.exit(1);
    });
}

module.exports = VerificadorOperacoesReal;
