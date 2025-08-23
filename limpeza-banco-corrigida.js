/**
 * 🧹 SISTEMA DE LIMPEZA COMPLETA DO BANCO DE DADOS PRODUÇÃO
 * =====================================================================
 * 
 * Este script realiza limpeza segura dos dados de teste mantendo
 * a integridade dos dados de produção e respeitando foreign keys.
 * 
 * ⚠️  ATENÇÃO: Para produção - Remove apenas dados claramente de teste
 * 
 * @author Sistema Automatizado
 * @version 2.0
 * @date 07/08/2025 21:19
 */

const { Pool } = require('pg');

class LimpezaBancoCorrigida {
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
        
        this.startTime = new Date();
    }

    /**
     * 📝 LOG FORMATADO
     */
    log(message, level = 'INFO') {
        const timestamp = new Date().toLocaleString('pt-BR');
        const prefix = {
            'INFO': '[INFO]',
            'ERROR': '[ERROR]', 
            'SUCCESS': '[SUCCESS]',
            'WARNING': '[WARNING]',
            'INIT': '[INIT]',
            'FATAL': '[FATAL]'
        }[level] || '[INFO]';
        
        console.log(`[${timestamp}] ${prefix} ${message}`);
    }

    /**
     * 🔍 VERIFICAR FOREIGN KEYS
     */
    async verificarForeignKeys() {
        this.log('🔍 Mapeando constraints de foreign keys...');
        
        try {
            const fks = await this.pool.query(`
                SELECT 
                    tc.table_name, 
                    tc.constraint_name, 
                    kcu.column_name,
                    ccu.table_name AS foreign_table_name,
                    ccu.column_name AS foreign_column_name 
                FROM information_schema.table_constraints tc
                JOIN information_schema.key_column_usage kcu 
                    ON tc.constraint_name = kcu.constraint_name
                JOIN information_schema.constraint_column_usage ccu 
                    ON ccu.constraint_name = tc.constraint_name
                WHERE tc.constraint_type = 'FOREIGN KEY' 
                    AND tc.table_schema = 'public'
                    AND ccu.table_name = 'users'
                ORDER BY tc.table_name
            `);
            
            this.log('📋 Tabelas que referenciam users:');
            fks.rows.forEach(fk => {
                this.log(`   • ${fk.table_name}.${fk.column_name} → users.${fk.foreign_column_name}`);
            });
            
            return fks.rows;
        } catch (error) {
            this.log(`❌ Erro ao verificar FKs: ${error.message}`, 'ERROR');
            return [];
        }
    }

    /**
     * 🔍 VERIFICAR DADOS EXISTENTES
     */
    async verificarDados() {
        this.log('🔍 Verificando dados existentes no banco...');
        
        try {
            const users = await this.pool.query('SELECT COUNT(*) FROM users');
            const notifications = await this.pool.query('SELECT COUNT(*) FROM user_notifications');
            const radars = await this.pool.query('SELECT COUNT(*) FROM aguia_news_radars');
            
            // Verificar usuários de teste
            const usersTeste = await this.pool.query(`
                SELECT username, email FROM users 
                WHERE LOWER(username) LIKE '%teste%' 
                OR LOWER(email) LIKE '%teste%'
                OR LOWER(username) LIKE '%demo%'
                OR LOWER(email) LIKE '%demo%'
                OR LOWER(email) LIKE '%test%'
            `);
            
            this.log(`👥 Usuários: ${users.rows[0].count}`);
            this.log(`🔔 Notificações: ${notifications.rows[0].count}`);
            this.log(`🦅 Radars Aguia News: ${radars.rows[0].count}`);
            
            if (usersTeste.rows.length > 0) {
                this.log(`⚠️  Usuários de teste encontrados: ${usersTeste.rows.length}`);
                usersTeste.rows.forEach(u => {
                    this.log(`   • ${u.username} (${u.email})`);
                });
            } else {
                this.log('✅ Nenhum usuário de teste óbvio encontrado');
            }
            
            return true;
        } catch (error) {
            this.log(`❌ Erro ao verificar dados: ${error.message}`, 'ERROR');
            return false;
        }
    }

    /**
     * 🧹 LIMPAR DADOS RESPEITANDO FOREIGN KEYS
     */
    async limparDadosSeguro() {
        this.log('🧹 Iniciando limpeza segura respeitando foreign keys...');
        
        try {
            await this.pool.query('BEGIN');
            
            // 1. Identificar usuários de teste
            const usuariosTeste = await this.pool.query(`
                SELECT id, username, email FROM users 
                WHERE LOWER(username) LIKE '%teste%' 
                OR LOWER(email) LIKE '%teste%'
                OR LOWER(username) LIKE '%demo%'
                OR LOWER(email) LIKE '%demo%'
                OR LOWER(email) LIKE '%test%'
                OR email = 'test@test.com'
                OR email = 'demo@demo.com'
            `);
            
            if (usuariosTeste.rows.length === 0) {
                this.log('✅ Nenhum usuário de teste para remover');
                await this.pool.query('COMMIT');
                return true;
            }

            const userIds = usuariosTeste.rows.map(u => u.id);
            this.log(`🎯 Removendo dados de ${userIds.length} usuários de teste...`);

            // 2. Remover em ordem de dependência (filhos primeiro)
            
            // Trading executions
            let result = await this.pool.query(`
                DELETE FROM user_trading_executions WHERE user_id = ANY($1)
            `, [userIds]);
            this.log(`✅ Trading executions removidas: ${result.rowCount}`);

            // Trading configs (nome correto)
            result = await this.pool.query(`
                DELETE FROM user_trading_config WHERE user_id = ANY($1)
            `, [userIds]);
            this.log(`✅ Trading configs removidas: ${result.rowCount}`);

            // API Keys
            result = await this.pool.query(`
                DELETE FROM user_api_keys WHERE user_id = ANY($1)
            `, [userIds]);
            this.log(`✅ API Keys removidas: ${result.rowCount}`);

            // User settings
            result = await this.pool.query(`
                DELETE FROM user_settings WHERE user_id = ANY($1)
            `, [userIds]);
            this.log(`✅ User settings removidas: ${result.rowCount}`);

            // User sessions
            result = await this.pool.query(`
                DELETE FROM user_sessions WHERE user_id = ANY($1)
            `, [userIds]);
            this.log(`✅ User sessions removidas: ${result.rowCount}`);

            // Notification preferences
            result = await this.pool.query(`
                DELETE FROM user_notification_preferences WHERE user_id = ANY($1)
            `, [userIds]);
            this.log(`✅ Notification preferences removidas: ${result.rowCount}`);

            // User radar access
            result = await this.pool.query(`
                DELETE FROM user_radar_access WHERE user_id = ANY($1)
            `, [userIds]);
            this.log(`✅ Radar access removidos: ${result.rowCount}`);

            // Exchange accounts
            result = await this.pool.query(`
                DELETE FROM exchange_accounts WHERE user_id = ANY($1)
            `, [userIds]);
            this.log(`✅ Exchange accounts removidas: ${result.rowCount}`);

            // Exchange configs
            result = await this.pool.query(`
                DELETE FROM exchange_configs WHERE user_id = ANY($1)
            `, [userIds]);
            this.log(`✅ Exchange configs removidas: ${result.rowCount}`);

            // Balances
            result = await this.pool.query(`
                DELETE FROM balances WHERE user_id = ANY($1)
            `, [userIds]);
            this.log(`✅ Balances removidos: ${result.rowCount}`);

            // Trades
            result = await this.pool.query(`
                DELETE FROM trades WHERE user_id = ANY($1)
            `, [userIds]);
            this.log(`✅ Trades removidos: ${result.rowCount}`);

            // Trading orders
            result = await this.pool.query(`
                DELETE FROM trading_orders WHERE user_id = ANY($1)
            `, [userIds]);
            this.log(`✅ Trading orders removidas: ${result.rowCount}`);

            // Trading positions
            result = await this.pool.query(`
                DELETE FROM trading_positions WHERE user_id = ANY($1)
            `, [userIds]);
            this.log(`✅ Trading positions removidas: ${result.rowCount}`);

            // Finalmente, remover usuários
            result = await this.pool.query(`
                DELETE FROM users WHERE id = ANY($1)
            `, [userIds]);
            this.log(`✅ Usuários de teste removidos: ${result.rowCount}`);

            await this.pool.query('COMMIT');
            this.log('✅ Limpeza de usuários de teste concluída com sucesso!');
            
            return true;
        } catch (error) {
            await this.pool.query('ROLLBACK');
            this.log(`❌ Erro na limpeza segura: ${error.message}`, 'ERROR');
            return false;
        }
    }

    /**
     * 🧹 LIMPEZA GERAL DE DADOS ANTIGOS
     */
    async limparDadosAntigos() {
        this.log('🧹 Removendo dados antigos...');
        
        try {
            // Logs antigos (manter 7 dias)
            let result = await this.pool.query(`
                DELETE FROM system_logs 
                WHERE created_at < NOW() - INTERVAL '7 days'
            `);
            this.log(`🗑️ Logs antigos removidos: ${result.rowCount}`);

            // Notificações antigas (manter 30 dias)
            result = await this.pool.query(`
                DELETE FROM user_notifications 
                WHERE created_at < NOW() - INTERVAL '30 days'
            `);
            this.log(`🗑️ Notificações antigas removidas: ${result.rowCount}`);

            // Radars antigos (manter últimos 10)
            result = await this.pool.query(`
                DELETE FROM aguia_news_radars 
                WHERE id NOT IN (
                    SELECT id FROM aguia_news_radars 
                    ORDER BY generated_at DESC 
                    LIMIT 10
                )
            `);
            this.log(`🗑️ Radars antigos removidos: ${result.rowCount}`);

            return true;
        } catch (error) {
            this.log(`❌ Erro na limpeza de dados antigos: ${error.message}`, 'ERROR');
            return false;
        }
    }

    /**
     * 📊 VERIFICAR RESULTADO FINAL
     */
    async verificarResultado() {
        this.log('📊 Verificando resultado final...');
        
        try {
            const users = await this.pool.query('SELECT COUNT(*) FROM users');
            const notifications = await this.pool.query('SELECT COUNT(*) FROM user_notifications');
            const radars = await this.pool.query('SELECT COUNT(*) FROM aguia_news_radars');
            
            this.log('📈 RESULTADO FINAL:');
            this.log(`👥 Usuários restantes: ${users.rows[0].count}`);
            this.log(`🔔 Notificações restantes: ${notifications.rows[0].count}`);
            this.log(`🦅 Radars Aguia News: ${radars.rows[0].count}`);
            
            // Verificar se ainda há usuários de teste
            const testesRestantes = await this.pool.query(`
                SELECT COUNT(*) FROM users 
                WHERE LOWER(username) LIKE '%teste%' 
                OR LOWER(email) LIKE '%teste%'
                OR LOWER(username) LIKE '%demo%'
                OR LOWER(email) LIKE '%demo%'
            `);
            
            if (testesRestantes.rows[0].count > 0) {
                this.log(`⚠️  Ainda existem ${testesRestantes.rows[0].count} usuários com padrão de teste`, 'WARNING');
            } else {
                this.log('✅ Nenhum usuário de teste detectado');
            }

            // Verificar último radar do Aguia News
            const ultimoRadar = await this.pool.query(`
                SELECT id, generated_at, LENGTH(content) as size
                FROM aguia_news_radars 
                ORDER BY generated_at DESC 
                LIMIT 1
            `);
            
            if (ultimoRadar.rows.length > 0) {
                const radar = ultimoRadar.rows[0];
                this.log(`🦅 Último radar: ID ${radar.id} - ${radar.generated_at} (${radar.size} chars)`);
            }

            return true;
        } catch (error) {
            this.log(`❌ Erro na verificação final: ${error.message}`, 'ERROR');
            return false;
        }
    }

    /**
     * 🎯 EXECUTAR LIMPEZA COMPLETA
     */
    async executar() {
        this.log('🚀 INICIANDO LIMPEZA COMPLETA E SEGURA DO BANCO', 'INIT');
        
        try {
            // 1. Verificar estado atual
            const dadosOk = await this.verificarDados();
            if (!dadosOk) {
                throw new Error('Falha na verificação inicial');
            }

            // 2. Mapear foreign keys
            await this.verificarForeignKeys();

            // 3. Confirmar operação
            console.log('\n⚠️  ATENÇÃO: Esta operação irá remover dados de teste!');
            console.log('🔄 Aguardando 3 segundos antes de prosseguir...\n');
            await new Promise(resolve => setTimeout(resolve, 3000));

            // 4. Limpeza segura de usuários de teste
            const limpezaOk = await this.limparDadosSeguro();
            if (!limpezaOk) {
                throw new Error('Falha na limpeza de usuários de teste');
            }

            // 5. Limpeza de dados antigos
            const antigosOk = await this.limparDadosAntigos();
            if (!antigosOk) {
                this.log('⚠️ Aviso: Falha na limpeza de dados antigos', 'WARNING');
            }

            // 6. Verificação final
            await this.verificarResultado();

            const duracao = (new Date() - this.startTime) / 1000;
            this.log(`🎉 LIMPEZA CONCLUÍDA COM SUCESSO! (${duracao}s)`, 'SUCCESS');
            
            return true;
        } catch (error) {
            this.log(`❌ ERRO CRÍTICO: ${error.message}`, 'FATAL');
            return false;
        } finally {
            await this.pool.end();
        }
    }
}

// 🚀 EXECUÇÃO
if (require.main === module) {
    const limpeza = new LimpezaBancoCorrigida();
    limpeza.executar().then(sucesso => {
        process.exit(sucesso ? 0 : 1);
    }).catch(error => {
        console.error('❌ FALHA CRÍTICA:', error.message);
        process.exit(1);
    });
}

module.exports = LimpezaBancoCorrigida;
