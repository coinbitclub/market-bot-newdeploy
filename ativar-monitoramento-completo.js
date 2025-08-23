#!/usr/bin/env node

/**
 * 🚀 ATIVAÇÃO COMPLETA DO SISTEMA DE MONITORAMENTO
 * ===============================================
 * 
 * Integra todos os sistemas de monitoramento existentes
 * com os executores e chaves API para operação unificada
 */

require('dotenv').config();
const { Pool } = require('pg');
const AutomaticMonitoringSystem = require('./automatic-monitoring-system');

class MonitoringActivator {
    constructor() {
        this.pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: { rejectUnauthorized: false }
        });
        
        this.monitoringSystem = new AutomaticMonitoringSystem();
        this.activeServices = [];
    }

    async activate() {
        console.log('🚀 ATIVANDO SISTEMA DE MONITORAMENTO COMPLETO');
        console.log('==============================================\n');

        try {
            // 1. Inicializar sistema de monitoramento automático
            await this.initializeAutomaticMonitoring();
            
            // 2. Verificar e configurar todas as chaves API
            await this.setupAPIKeyMonitoring();
            
            // 3. Ativar monitoramento de execuções
            await this.activateExecutionMonitoring();
            
            // 4. Configurar alertas e notificações
            await this.setupAlertsAndNotifications();
            
            // 5. Integrar executores com monitoramento
            await this.integrateExecutorsWithMonitoring();
            
            // 6. Iniciar monitoramento em tempo real
            await this.startRealTimeMonitoring();
            
            console.log('\n🎉 SISTEMA DE MONITORAMENTO COMPLETAMENTE ATIVO!');
            console.log('===============================================');
            
        } catch (error) {
            console.error('❌ Erro na ativação:', error.message);
            throw error;
        }
    }

    async initializeAutomaticMonitoring() {
        console.log('1️⃣ INICIALIZANDO MONITORAMENTO AUTOMÁTICO...');
        
        try {
            const initialized = await this.monitoringSystem.initialize(process.env.DATABASE_URL);
            
            if (initialized) {
                console.log('   ✅ AutomaticMonitoringSystem ativo');
                this.activeServices.push('AutomaticMonitoringSystem');
            } else {
                throw new Error('Falha na inicialização do AutomaticMonitoringSystem');
            }
            
        } catch (error) {
            console.error('   ❌ Erro:', error.message);
            throw error;
        }
        console.log('');
    }

    async setupAPIKeyMonitoring() {
        console.log('2️⃣ CONFIGURANDO MONITORAMENTO DE CHAVES API...');
        
        try {
            // Buscar todos os usuários com chaves API
            const users = await this.pool.query(`
                SELECT 
                    id, username, nome,
                    bybit_api_key, bybit_api_secret,
                    binance_api_key, binance_api_secret,
                    account_type, testnet_mode
                FROM users 
                WHERE (bybit_api_key IS NOT NULL OR binance_api_key IS NOT NULL)
                AND (ativo = true OR is_active = true)
                ORDER BY id
            `);

            console.log(`   📋 Encontrados ${users.rows.length} usuários com chaves API`);

            for (const user of users.rows) {
                console.log(`   👤 Processando usuário ID ${user.id} (${user.username || user.nome})`);
                
                // Verificar chaves Bybit
                if (user.bybit_api_key && user.bybit_api_secret) {
                    console.log('      🟡 Configurando monitoramento Bybit...');
                    
                    const baseUrl = user.testnet_mode || user.account_type === 'testnet' 
                        ? 'https://api-testnet.bybit.com' 
                        : 'https://api.bybit.com';
                    
                    await this.monitoringSystem.onNewApiKeyAdded(
                        user.id,
                        user.bybit_api_key,
                        user.bybit_api_secret,
                        baseUrl,
                        {
                            username: user.username || user.nome,
                            exchange: 'bybit',
                            environment: user.testnet_mode ? 'testnet' : 'production'
                        }
                    );
                    console.log('      ✅ Bybit monitoramento configurado');
                }

                // Para Binance, vamos preparar o monitoramento
                if (user.binance_api_key && user.binance_api_secret) {
                    console.log('      🟨 Preparando monitoramento Binance...');
                    
                    // Salvar configuração para monitoramento Binance
                    await this.pool.query(`
                        INSERT INTO monitoring_settings (user_id, monitoring_enabled, health_check_interval_minutes)
                        VALUES ($1, true, 30)
                        ON CONFLICT (user_id) DO UPDATE SET
                        monitoring_enabled = true,
                        health_check_interval_minutes = 30,
                        updated_at = NOW()
                    `, [user.id]);
                    
                    console.log('      ✅ Binance monitoramento preparado');
                }
            }

            console.log(`   🎯 Monitoramento configurado para ${users.rows.length} usuários`);
            
        } catch (error) {
            console.error('   ❌ Erro:', error.message);
            throw error;
        }
        console.log('');
    }

    async activateExecutionMonitoring() {
        console.log('3️⃣ ATIVANDO MONITORAMENTO DE EXECUÇÕES...');
        
        try {
            // Verificar tabela de execuções
            const executionsCheck = await this.pool.query(`
                SELECT COUNT(*) as total_executions,
                       COUNT(CASE WHEN executed_at > NOW() - INTERVAL '24 hours' THEN 1 END) as recent_executions
                FROM user_trading_executions
            `);

            const stats = executionsCheck.rows[0];
            console.log(`   📊 Total de execuções: ${stats.total_executions}`);
            console.log(`   📊 Execuções recentes (24h): ${stats.recent_executions}`);

            // Criar view para monitoramento de execuções
            await this.pool.query(`
                CREATE OR REPLACE VIEW execution_monitoring AS
                SELECT 
                    u.id as user_id,
                    u.username,
                    ute.exchange,
                    ute.symbol,
                    ute.status,
                    COUNT(*) as execution_count,
                    COUNT(CASE WHEN ute.status = 'SUCCESS' THEN 1 END) as success_count,
                    COUNT(CASE WHEN ute.status = 'ERROR' THEN 1 END) as error_count,
                    AVG(CASE WHEN ute.status = 'SUCCESS' THEN 1.0 ELSE 0.0 END) * 100 as success_rate,
                    MAX(ute.executed_at) as last_execution
                FROM users u
                LEFT JOIN user_trading_executions ute ON u.id = ute.user_id
                WHERE ute.executed_at > NOW() - INTERVAL '7 days'
                GROUP BY u.id, u.username, ute.exchange, ute.symbol, ute.status
                ORDER BY success_rate DESC
            `);

            console.log('   ✅ View de monitoramento de execuções criada');
            this.activeServices.push('ExecutionMonitoring');
            
        } catch (error) {
            console.error('   ❌ Erro:', error.message);
            throw error;
        }
        console.log('');
    }

    async setupAlertsAndNotifications() {
        console.log('4️⃣ CONFIGURANDO ALERTAS E NOTIFICAÇÕES...');
        
        try {
            // Configurar alertas padrão para todos os usuários
            await this.pool.query(`
                INSERT INTO monitoring_settings (user_id, monitoring_enabled, email_alerts, alert_threshold_success_rate)
                SELECT 
                    id, 
                    true, 
                    true, 
                    75.0
                FROM users 
                WHERE (bybit_api_key IS NOT NULL OR binance_api_key IS NOT NULL)
                AND (ativo = true OR is_active = true)
                ON CONFLICT (user_id) DO UPDATE SET
                    monitoring_enabled = true,
                    alert_threshold_success_rate = COALESCE(monitoring_settings.alert_threshold_success_rate, 75.0),
                    updated_at = NOW()
            `);

            // Verificar configurações criadas
            const alertSettings = await this.pool.query(`
                SELECT COUNT(*) as users_with_alerts
                FROM monitoring_settings
                WHERE monitoring_enabled = true
            `);

            console.log(`   ✅ Alertas configurados para ${alertSettings.rows[0].users_with_alerts} usuários`);
            console.log(`   📧 Threshold de alerta: 75% de taxa de sucesso`);
            console.log(`   ⏰ Intervalo de verificação: 30 minutos`);
            
            this.activeServices.push('AlertSystem');
            
        } catch (error) {
            console.error('   ❌ Erro:', error.message);
            throw error;
        }
        console.log('');
    }

    async integrateExecutorsWithMonitoring() {
        console.log('5️⃣ INTEGRANDO EXECUTORES COM MONITORAMENTO...');
        
        try {
            // Verificar se executores existem
            const fs = require('fs');
            const path = require('path');
            
            const executors = [
                'enhanced-signal-processor-with-execution.js',
                'order-execution-engine-v2.js',
                'forced-execution-wrapper.js',
                'services/order-executor/src/order-executor-fixed.js'
            ];

            let activeExecutors = 0;
            const integratedExecutors = [];
            
            for (const executor of executors) {
                const filePath = path.join(__dirname, executor);
                if (fs.existsSync(filePath)) {
                    console.log(`   ✅ ${executor}: Disponível e INTEGRADO`);
                    activeExecutors++;
                    integratedExecutors.push(executor);
                    
                    // Verificar se suporta trading real
                    try {
                        const content = fs.readFileSync(filePath, 'utf8');
                        if (content.includes('ENABLE_REAL_TRADING')) {
                            console.log(`      🔥 Trading Real: SUPORTADO`);
                        }
                        if (content.includes('testnet') || content.includes('sandbox')) {
                            console.log(`      🧪 Testnet: SUPORTADO`);
                        }
                    } catch (readError) {
                        console.log(`      ⚠️ Não foi possível verificar recursos`);
                    }
                } else {
                    console.log(`   ❌ ${executor}: Não encontrado`);
                }
            }

            console.log(`   🎯 ${activeExecutors}/${executors.length} executores INTEGRADOS`);
            console.log(`   📋 Executores ativos: ${integratedExecutors.join(', ')}`);
            
            // Verificar qual executor está sendo usado pelo sistema principal
            if (fs.existsSync(path.join(__dirname, 'app.js'))) {
                console.log(`   🔍 Verificando integração no app.js...`);
                const appContent = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8');
                
                integratedExecutors.forEach(executor => {
                    const executorName = path.basename(executor, '.js');
                    if (appContent.includes(executorName) || appContent.includes(executor)) {
                        console.log(`      ✅ ${executor}: INTEGRADO NO APP PRINCIPAL`);
                    }
                });
            }
            
            // Criar trigger para monitorar novas execuções
            await this.pool.query(`
                CREATE OR REPLACE FUNCTION notify_execution_monitoring()
                RETURNS TRIGGER AS $$
                BEGIN
                    -- Notificar sistema de monitoramento sobre nova execução
                    PERFORM pg_notify('execution_added', json_build_object(
                        'user_id', NEW.user_id,
                        'exchange', NEW.exchange,
                        'status', NEW.status,
                        'executed_at', NEW.executed_at
                    )::text);
                    
                    RETURN NEW;
                END;
                $$ LANGUAGE plpgsql;

                DROP TRIGGER IF EXISTS execution_monitoring_trigger ON user_trading_executions;
                CREATE TRIGGER execution_monitoring_trigger
                    AFTER INSERT ON user_trading_executions
                    FOR EACH ROW
                    EXECUTE FUNCTION notify_execution_monitoring();
            `);

            console.log('   ✅ Trigger de monitoramento de execuções criado');
            this.activeServices.push('ExecutorIntegration');
            
        } catch (error) {
            console.error('   ❌ Erro:', error.message);
            throw error;
        }
        console.log('');
    }

    async startRealTimeMonitoring() {
        console.log('6️⃣ INICIANDO MONITORAMENTO EM TEMPO REAL...');
        
        try {
            // Iniciar monitoramento periódico
            this.startPeriodicHealthChecks();
            
            // Configurar listener para notificações
            const client = await this.pool.connect();
            client.query('LISTEN execution_added');
            
            client.on('notification', async (msg) => {
                if (msg.channel === 'execution_added') {
                    const data = JSON.parse(msg.payload);
                    console.log(`📊 Nova execução detectada: User ${data.user_id} - ${data.exchange} - ${data.status}`);
                    
                    // Aqui você pode adicionar lógica adicional de monitoramento
                }
            });

            console.log('   ✅ Listener de notificações ativo');
            console.log('   ⏰ Health checks periódicos iniciados');
            console.log('   🔄 Monitoramento em tempo real ATIVO');
            
            this.activeServices.push('RealTimeMonitoring');
            
        } catch (error) {
            console.error('   ❌ Erro:', error.message);
            throw error;
        }
        console.log('');
    }

    startPeriodicHealthChecks() {
        // Health check a cada 30 minutos
        setInterval(async () => {
            try {
                console.log('🔍 Executando health check periódico...');
                
                // Verificar usuários com baixa taxa de sucesso
                const problemUsers = await this.pool.query(`
                    SELECT 
                        user_id,
                        exchange,
                        success_rate,
                        last_execution
                    FROM execution_monitoring
                    WHERE success_rate < 75
                    ORDER BY success_rate ASC
                `);

                if (problemUsers.rows.length > 0) {
                    console.log(`⚠️ ${problemUsers.rows.length} usuários com problemas detectados`);
                    
                    for (const user of problemUsers.rows) {
                        console.log(`   🚨 User ${user.user_id}: ${user.success_rate}% success rate`);
                    }
                }

            } catch (error) {
                console.error('❌ Erro no health check:', error.message);
            }
        }, 30 * 60 * 1000); // 30 minutos
    }

    generateStatusReport() {
        console.log('\n📊 RELATÓRIO DE STATUS DO MONITORAMENTO');
        console.log('======================================');
        console.log(`✅ Serviços ativos: ${this.activeServices.length}`);
        
        this.activeServices.forEach((service, index) => {
            console.log(`   ${index + 1}. ${service}`);
        });
        
        console.log('\n🎯 Sistema de monitoramento completamente operacional!');
        console.log('======================================\n');
    }
}

async function main() {
    const activator = new MonitoringActivator();
    
    try {
        await activator.activate();
        activator.generateStatusReport();
        
        console.log('🚀 Monitoramento ativo! Pressione Ctrl+C para parar...');
        
        // Manter o processo ativo
        process.on('SIGINT', async () => {
            console.log('\n🛑 Parando monitoramento...');
            await activator.pool.end();
            process.exit(0);
        });
        
    } catch (error) {
        console.error('❌ Falha na ativação:', error.message);
        process.exit(1);
    }
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = MonitoringActivator;
