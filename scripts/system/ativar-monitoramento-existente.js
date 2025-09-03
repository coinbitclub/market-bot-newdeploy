#!/usr/bin/env node

/**
 * 🔐 ATIVADOR DO SISTEMA DE MONITORAMENTO EXISTENTE
 * 
 * Usa o AutomaticMonitoringSystem já implementado para verificar as chaves corretamente
 */

require('dotenv').config();
const AutomaticMonitoringSystem = require('./automatic-monitoring-system');

class MonitoringActivator {
    constructor() {
        this.monitoringSystem = new AutomaticMonitoringSystem();
        console.log('🔐 ATIVADOR DO SISTEMA DE MONITORAMENTO');
        console.log('======================================');
    }

    async start() {
        try {
            console.log('\n⚡ Inicializando sistema de monitoramento...');
            
            // Inicializar com banco de dados
            const initialized = await this.monitoringSystem.initialize(process.env.DATABASE_URL);
            
            if (!initialized) {
                throw new Error('Falha na inicialização do sistema');
            }

            console.log('✅ Sistema inicializado com sucesso');

            // Executar verificação manual das chaves existentes
            await this.checkExistingKeys();

            // Iniciar monitoramento contínuo
            await this.monitoringSystem.startSystemMonitoring();

            console.log('\n🚀 SISTEMA DE MONITORAMENTO ATIVO!');
            console.log('📊 Monitorando chaves API automaticamente');
            console.log('⏰ Verificações a cada hora');
            console.log('🔄 Diagnósticos completos conforme necessário');

        } catch (error) {
            console.error('❌ ERRO na ativação:', error.message);
            process.exit(1);
        }
    }

    async checkExistingKeys() {
        console.log('\n🔍 Verificando chaves existentes...');
        
        try {
            // Simular adição de chaves existentes para forçar diagnóstico
            const { Pool } = require('pg');
            const pool = new Pool({
                connectionString: process.env.DATABASE_URL,
                ssl: { rejectUnauthorized: false }
            });

            const existingKeys = await pool.query(`
                SELECT 
                    id, username, bybit_api_key, bybit_api_secret,
                    binance_api_key, binance_api_secret
                FROM users 
                WHERE (bybit_api_key IS NOT NULL OR binance_api_key IS NOT NULL)
                AND (ativo = true OR is_active = true)
                LIMIT 5
            `);

            console.log(`📋 Encontradas ${existingKeys.rows.length} chaves para verificar`);

            for (const user of existingKeys.rows) {
                try {
                    console.log(`\n👤 Verificando usuário: ${user.username} (ID: ${user.id})`);

                    // Verificar Bybit se disponível
                    if (user.bybit_api_key && user.bybit_api_secret) {
                        console.log('   🟡 Executando diagnóstico Bybit...');
                        await this.monitoringSystem.onNewApiKeyAdded(
                            user.id,
                            user.bybit_api_key,
                            user.bybit_api_secret,
                            'https://api.bybit.com',
                            { 
                                username: user.username,
                                exchange: 'bybit',
                                environment: 'production'
                            }
                        );
                    }

                    // Verificar Binance se disponível  
                    if (user.binance_api_key && user.binance_api_secret) {
                        console.log('   🟨 Executando diagnóstico Binance...');
                        await this.monitoringSystem.onNewApiKeyAdded(
                            user.id,
                            user.binance_api_key,
                            user.binance_api_secret,
                            'https://api.binance.com',
                            { 
                                username: user.username,
                                exchange: 'binance',
                                environment: 'production'
                            }
                        );
                    }

                    // Pausa entre verificações
                    await new Promise(resolve => setTimeout(resolve, 2000));

                } catch (userError) {
                    console.log(`   ❌ Erro ao verificar ${user.username}: ${userError.message}`);
                }
            }

            await pool.end();

        } catch (error) {
            console.error('❌ Erro na verificação de chaves:', error.message);
        }
    }

    async getSystemStats() {
        try {
            const stats = await this.monitoringSystem.getMonitoringStats();
            
            console.log('\n📊 ESTATÍSTICAS DO SISTEMA:');
            console.log('===========================');
            console.log(`👥 Usuários monitorados: ${stats.users.total}`);
            console.log(`🔑 Chaves ativas: ${stats.users.withApiKeys}`);
            console.log(`📈 Taxa média de sucesso: ${stats.performance.averageSuccessRate.toFixed(1)}%`);
            console.log(`✅ Excelente: ${stats.performance.excellent}`);
            console.log(`🟨 Bom: ${stats.performance.good}`);
            console.log(`❌ Problemático: ${stats.performance.problematic}`);
            console.log(`🚨 Alertas ativos: ${stats.alerts.unresolved}`);
            console.log(`⚠️ Alertas críticos: ${stats.alerts.critical}`);

            return stats;

        } catch (error) {
            console.error('❌ Erro ao obter estatísticas:', error.message);
            return null;
        }
    }
}

// Executar ativador
async function main() {
    const activator = new MonitoringActivator();
    
    // Configurar handlers de parada
    process.on('SIGINT', async () => {
        console.log('\n🛑 Parando sistema de monitoramento...');
        await activator.monitoringSystem.stopMonitoring();
        process.exit(0);
    });

    process.on('SIGTERM', async () => {
        console.log('\n🛑 Terminando sistema de monitoramento...');
        await activator.monitoringSystem.stopMonitoring();
        process.exit(0);
    });

    // Iniciar sistema
    await activator.start();

    // Mostrar estatísticas a cada 5 minutos
    setInterval(async () => {
        await activator.getSystemStats();
    }, 5 * 60 * 1000);

    // Manter processo ativo
    console.log('\n💡 Pressione Ctrl+C para parar o monitoramento');
}

if (require.main === module) {
    main().catch(error => {
        console.error('💥 FALHA CRÍTICA:', error);
        process.exit(1);
    });
}

module.exports = MonitoringActivator;
