/**
 * 🧹 LIMPEZA DEFINITIVA DOS DADOS DE TESTE - USER 7
 * =================================================
 * 
 * Remove TODOS os dados de teste do User 7 e positions falsas
 * 
 * @author Sistema Automatizado
 * @version 1.0
 * @date 07/08/2025 21:33
 */

const { Pool } = require('pg');

class LimpezaUser7 {
    constructor() {
        this.pool = new Pool({
            host: 'trolley.proxy.rlwy.net',
            port: 44790,
            database: 'railway',
            user: 'postgres',
            password: 'ELjbkkgUASRCtdTAXVFgIssOXiLsRCPq',
            ssl: {
                rejectUnauthorized: false
            }
        });
    }

    log(message, level = 'INFO') {
        const timestamp = new Date().toLocaleString('pt-BR', { 
            timeZone: 'America/Sao_Paulo',
            day: '2-digit',
            month: '2-digit', 
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        const prefix = {
            'INFO': '[📊]',
            'WARNING': '[⚠️ ]',
            'SUCCESS': '[✅]',
            'ERROR': '[❌]',
            'CLEAN': '[🧹]'
        }[level] || '[📊]';
        
        console.log(`[${timestamp}] ${prefix} ${message}`);
    }

    /**
     * 🔍 VERIFICAR SE USER 7 EXISTE REALMENTE
     */
    async verificarUser7() {
        this.log('🔍 Verificando se User 7 é real ou teste...');
        
        try {
            const user = await this.pool.query(`
                SELECT id, username, email, created_at, is_active 
                FROM users 
                WHERE id = 7
            `);

            if (user.rows.length > 0) {
                const userData = user.rows[0];
                this.log(`👤 User 7 encontrado:`);
                this.log(`   • Username: ${userData.username}`);
                this.log(`   • Email: ${userData.email}`);
                this.log(`   • Criado: ${userData.created_at}`);
                this.log(`   • Ativo: ${userData.is_active}`);

                // Verificar se é teste
                const isTest = userData.username?.toLowerCase().includes('test') ||
                              userData.email?.toLowerCase().includes('test') ||
                              userData.username?.toLowerCase().includes('demo') ||
                              userData.email?.toLowerCase().includes('demo');

                if (isTest) {
                    this.log('⚠️  User 7 identificado como TESTE - pode ser removido', 'WARNING');
                    return { exists: true, isTest: true, data: userData };
                } else {
                    this.log('👤 User 7 parece ser real - verificação manual necessária', 'WARNING');
                    return { exists: true, isTest: false, data: userData };
                }
            } else {
                this.log('❌ User 7 NÃO EXISTE - positions são órfãs', 'ERROR');
                return { exists: false, isTest: true, data: null };
            }
        } catch (error) {
            this.log(`❌ Erro ao verificar User 7: ${error.message}`, 'ERROR');
            return { exists: false, isTest: true, data: null };
        }
    }

    /**
     * 🧹 LIMPAR DADOS DO USER 7
     */
    async limparDadosUser7() {
        this.log('🧹 Iniciando limpeza completa do User 7...', 'CLEAN');
        
        try {
            await this.pool.query('BEGIN');

            // 1. Limpar positions
            const positions = await this.pool.query(`
                DELETE FROM positions WHERE user_id = 7
            `);
            this.log(`✅ Positions removidas: ${positions.rowCount}`, 'SUCCESS');

            // 2. Limpar trading_positions
            const tradingPos = await this.pool.query(`
                DELETE FROM trading_positions WHERE user_id = 7
            `);
            this.log(`✅ Trading positions removidas: ${tradingPos.rowCount}`, 'SUCCESS');

            // 3. Limpar trades
            const trades = await this.pool.query(`
                DELETE FROM trades WHERE user_id = 7
            `);
            this.log(`✅ Trades removidos: ${trades.rowCount}`, 'SUCCESS');

            // 4. Limpar trading_orders
            const orders = await this.pool.query(`
                DELETE FROM trading_orders WHERE user_id = 7
            `);
            this.log(`✅ Trading orders removidas: ${orders.rowCount}`, 'SUCCESS');

            // 5. Limpar user_trading_executions
            const executions = await this.pool.query(`
                DELETE FROM user_trading_executions WHERE user_id = 7
            `);
            this.log(`✅ Trading executions removidas: ${executions.rowCount}`, 'SUCCESS');

            // 6. Limpar balances
            const balances = await this.pool.query(`
                DELETE FROM balances WHERE user_id = 7
            `);
            this.log(`✅ Balances removidos: ${balances.rowCount}`, 'SUCCESS');

            // 7. Limpar notificações
            const notifications = await this.pool.query(`
                DELETE FROM user_notifications WHERE user_id = 7
            `);
            this.log(`✅ Notificações removidas: ${notifications.rowCount}`, 'SUCCESS');

            // 8. Finalmente, remover o próprio user se for teste
            const userCheck = await this.verificarUser7();
            if (userCheck.exists && userCheck.isTest) {
                const user = await this.pool.query(`
                    DELETE FROM users WHERE id = 7
                `);
                this.log(`✅ User 7 (teste) removido: ${user.rowCount}`, 'SUCCESS');
            }

            await this.pool.query('COMMIT');
            this.log('🎉 LIMPEZA COMPLETA DO USER 7 CONCLUÍDA!', 'SUCCESS');
            return true;

        } catch (error) {
            await this.pool.query('ROLLBACK');
            this.log(`❌ Erro na limpeza: ${error.message}`, 'ERROR');
            return false;
        }
    }

    /**
     * 📊 VERIFICAR RESULTADO DA LIMPEZA
     */
    async verificarResultado() {
        this.log('📊 Verificando resultado da limpeza...');
        
        try {
            const positions = await this.pool.query('SELECT COUNT(*) FROM positions WHERE user_id = 7');
            const trades = await this.pool.query('SELECT COUNT(*) FROM trades WHERE user_id = 7');
            const users = await this.pool.query('SELECT COUNT(*) FROM users WHERE id = 7');

            this.log(`📈 Positions User 7: ${positions.rows[0].count}`, 'INFO');
            this.log(`⚡ Trades User 7: ${trades.rows[0].count}`, 'INFO');
            this.log(`👤 User 7 existe: ${users.rows[0].count > 0 ? 'SIM' : 'NÃO'}`, 'INFO');

            if (positions.rows[0].count === '0' && trades.rows[0].count === '0') {
                this.log('✅ LIMPEZA BEM-SUCEDIDA: Todos os dados de teste removidos!', 'SUCCESS');
                return true;
            } else {
                this.log('⚠️  Ainda existem dados do User 7', 'WARNING');
                return false;
            }
        } catch (error) {
            this.log(`❌ Erro na verificação: ${error.message}`, 'ERROR');
            return false;
        }
    }

    /**
     * 🚀 EXECUTAR LIMPEZA COMPLETA
     */
    async executar() {
        this.log('🚀 INICIANDO LIMPEZA DEFINITIVA DO USER 7', 'SUCCESS');
        console.log('='.repeat(60));
        
        try {
            // 1. Verificar User 7
            const userInfo = await this.verificarUser7();
            console.log('');

            // 2. Confirmar limpeza
            console.log('⚠️  ATENÇÃO: Esta operação irá REMOVER COMPLETAMENTE o User 7!');
            console.log('🗑️  Incluindo: positions, trades, orders, executions, balances, notifications');
            console.log('⏳ Aguardando 3 segundos...\n');
            await new Promise(resolve => setTimeout(resolve, 3000));

            // 3. Executar limpeza
            const limpezaOk = await this.limparDadosUser7();
            if (!limpezaOk) {
                throw new Error('Falha na limpeza');
            }

            // 4. Verificar resultado
            await this.verificarResultado();

            console.log('='.repeat(60));
            this.log('🎯 LIMPEZA CONCLUÍDA COM SUCESSO!', 'SUCCESS');

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
    const limpeza = new LimpezaUser7();
    limpeza.executar().then(() => {
        console.log('\n✅ Limpeza finalizada!');
        process.exit(0);
    }).catch(error => {
        console.error('❌ ERRO:', error.message);
        process.exit(1);
    });
}

module.exports = LimpezaUser7;
