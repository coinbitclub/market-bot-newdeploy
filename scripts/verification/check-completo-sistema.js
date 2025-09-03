#!/usr/bin/env node

/**
 * 🔍 CHECK COMPLETO DO SISTEMA - EXECUTORES E CHAVES
 * ===================================================
 * 
 * Verifica todo o sistema: chaves, executores, monitoramento e configurações
 */

require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

console.log('🔍 CHECK COMPLETO DO SISTEMA');
console.log('============================\n');

class SystemCompleteCheck {
    constructor() {
        this.issues = [];
        this.successes = [];
    }

    async runFullCheck() {
        try {
            await this.checkDatabase();
            await this.checkAPIKeys();
            await this.checkExecutors();
            await this.checkMonitoring();
            await this.checkExecutions();
            await this.checkConfigurations();
            await this.checkDualSystem();
            
            this.generateReport();
            
        } catch (error) {
            console.error('❌ Erro no check completo:', error.message);
        }
    }

    async checkDatabase() {
        console.log('📊 1. VERIFICANDO DATABASE...');
        try {
            const result = await pool.query('SELECT NOW()');
            this.successes.push('Database: Conectado');
            
            // Verificar tabelas principais
            const tables = await pool.query(`
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public'
                AND table_name IN ('users', 'trades', 'positions', 'signals', 'user_trading_executions')
            `);
            
            const expectedTables = ['users', 'trades', 'positions', 'signals', 'user_trading_executions'];
            const existingTables = tables.rows.map(r => r.table_name);
            
            expectedTables.forEach(table => {
                if (existingTables.includes(table)) {
                    this.successes.push(`Tabela ${table}: Existe`);
                } else {
                    this.issues.push(`Tabela ${table}: FALTANDO`);
                }
            });
            
        } catch (error) {
            this.issues.push(`Database: ERRO - ${error.message}`);
        }
        console.log('');
    }

    async checkAPIKeys() {
        console.log('🔑 2. VERIFICANDO CHAVES API...');
        try {
            const keys = await pool.query(`
                SELECT 
                    id, username, nome,
                    CASE WHEN bybit_api_key IS NOT NULL THEN 'SIM' ELSE 'NÃO' END as tem_bybit_key,
                    CASE WHEN bybit_api_secret IS NOT NULL THEN 'SIM' ELSE 'NÃO' END as tem_bybit_secret,
                    CASE WHEN binance_api_key IS NOT NULL THEN 'SIM' ELSE 'NÃO' END as tem_binance_key,
                    CASE WHEN binance_api_secret IS NOT NULL THEN 'SIM' ELSE 'NÃO' END as tem_binance_secret,
                    account_type, testnet_mode
                FROM users 
                WHERE (bybit_api_key IS NOT NULL OR binance_api_key IS NOT NULL)
                AND (ativo = true OR is_active = true)
                ORDER BY id
            `);

            console.log(`   📋 Total de usuários com chaves: ${keys.rows.length}`);
            
            let bybitCount = 0;
            let binanceCount = 0;
            let testnetCount = 0;
            let managementCount = 0;

            keys.rows.forEach(user => {
                console.log(`   👤 ID ${user.id} (${user.username || user.nome}):`);
                
                if (user.tem_bybit_key === 'SIM' && user.tem_bybit_secret === 'SIM') {
                    console.log(`      🟡 Bybit: COMPLETO`);
                    bybitCount++;
                } else if (user.tem_bybit_key === 'SIM') {
                    console.log(`      🟡 Bybit: INCOMPLETO (sem secret)`);
                    this.issues.push(`User ${user.id}: Bybit key sem secret`);
                }
                
                if (user.tem_binance_key === 'SIM' && user.tem_binance_secret === 'SIM') {
                    console.log(`      🟨 Binance: COMPLETO`);
                    binanceCount++;
                } else if (user.tem_binance_key === 'SIM') {
                    console.log(`      🟨 Binance: INCOMPLETO (sem secret)`);
                    this.issues.push(`User ${user.id}: Binance key sem secret`);
                }
                
                const isTestnet = user.account_type === 'testnet' || user.testnet_mode === true;
                console.log(`      🏷️ Tipo: ${isTestnet ? 'TESTNET' : 'MANAGEMENT'}`);
                
                if (isTestnet) testnetCount++;
                else managementCount++;
                
                console.log('');
            });

            console.log(`   📊 RESUMO DAS CHAVES:`);
            console.log(`      🟡 Bybit completas: ${bybitCount}`);
            console.log(`      🟨 Binance completas: ${binanceCount}`);
            console.log(`      🧪 Testnet: ${testnetCount}`);
            console.log(`      💼 Management: ${managementCount}`);
            
            this.successes.push(`Chaves API: ${bybitCount + binanceCount} configuradas`);
            
        } catch (error) {
            this.issues.push(`Chaves API: ERRO - ${error.message}`);
        }
        console.log('');
    }

    async checkExecutors() {
        console.log('⚡ 3. VERIFICANDO EXECUTORES...');
        
        const executorFiles = [
            'enhanced-signal-processor-with-execution.js',
            'order-execution-engine-v2.js',
            'services/order-executor/src/order-executor-fixed.js',
            'execute-real-operations.js'
        ];

        for (const file of executorFiles) {
            const filePath = path.join(__dirname, file);
            if (fs.existsSync(filePath)) {
                console.log(`   ✅ ${file}: Existe`);
                this.successes.push(`Executor ${file}: Disponível`);
                
                // Verificar se tem ENABLE_REAL_TRADING
                try {
                    const content = fs.readFileSync(filePath, 'utf8');
                    if (content.includes('ENABLE_REAL_TRADING')) {
                        console.log(`      🔥 Suporte a trading real: SIM`);
                    } else {
                        console.log(`      ⚠️ Suporte a trading real: NÃO DETECTADO`);
                    }
                } catch (readError) {
                    console.log(`      ❌ Erro ao ler arquivo: ${readError.message}`);
                }
            } else {
                console.log(`   ❌ ${file}: FALTANDO`);
                this.issues.push(`Executor ${file}: Não encontrado`);
            }
        }
        console.log('');
    }

    async checkMonitoring() {
        console.log('📊 4. VERIFICANDO MONITORAMENTO...');
        
        const monitoringFiles = [
            'automatic-monitoring-system.js',
            'api-key-monitor-fixed.js',
            'monitoramento-chaves-automatico.js'
        ];

        for (const file of monitoringFiles) {
            const filePath = path.join(__dirname, file);
            if (fs.existsSync(filePath)) {
                console.log(`   ✅ ${file}: Disponível`);
                this.successes.push(`Monitor ${file}: Disponível`);
            } else {
                console.log(`   ❌ ${file}: FALTANDO`);
                this.issues.push(`Monitor ${file}: Não encontrado`);
            }
        }

        // Verificar tabelas de monitoramento
        try {
            const monitoringTables = await pool.query(`
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public'
                AND (table_name LIKE '%monitor%' OR table_name LIKE '%diagnostic%')
            `);
            
            console.log(`   📋 Tabelas de monitoramento: ${monitoringTables.rows.length}`);
            monitoringTables.rows.forEach(table => {
                console.log(`      📊 ${table.table_name}`);
            });
            
        } catch (error) {
            this.issues.push(`Tabelas de monitoramento: ERRO - ${error.message}`);
        }
        console.log('');
    }

    async checkExecutions() {
        console.log('🔥 5. VERIFICANDO EXECUÇÕES...');
        try {
            // Últimas execuções
            const executions = await pool.query(`
                SELECT 
                    COUNT(*) as total,
                    COUNT(CASE WHEN status = 'SUCCESS' THEN 1 END) as success_count,
                    COUNT(CASE WHEN status = 'ERROR' THEN 1 END) as error_count,
                    COUNT(CASE WHEN order_id IS NOT NULL THEN 1 END) as with_order_id,
                    MAX(executed_at) as last_execution
                FROM user_trading_executions
                WHERE executed_at > NOW() - INTERVAL '24 hours'
            `);

            if (executions.rows.length > 0) {
                const stats = executions.rows[0];
                console.log(`   📊 Últimas 24h: ${stats.total} execuções`);
                console.log(`   ✅ Sucessos: ${stats.success_count}`);
                console.log(`   ❌ Erros: ${stats.error_count}`);
                console.log(`   🎯 Com Order ID: ${stats.with_order_id}`);
                console.log(`   🕐 Última execução: ${stats.last_execution || 'Nenhuma'}`);
                
                this.successes.push(`Execuções: ${stats.total} nas últimas 24h`);
                
                if (stats.error_count > stats.success_count) {
                    this.issues.push(`Execuções: Mais erros que sucessos (${stats.error_count} vs ${stats.success_count})`);
                }
            } else {
                console.log(`   ⚠️ Nenhuma execução nas últimas 24h`);
                this.issues.push('Execuções: Nenhuma nas últimas 24h');
            }

        } catch (error) {
            this.issues.push(`Execuções: ERRO - ${error.message}`);
        }
        console.log('');
    }

    async checkConfigurations() {
        console.log('⚙️ 6. VERIFICANDO CONFIGURAÇÕES...');
        
        // Verificar variáveis de ambiente críticas
        const criticalEnvVars = [
            'DATABASE_URL"process.env.DATABASE_URL"ENABLE_REAL_TRADING'
        ];

        criticalEnvVars.forEach(envVar => {
            if (process.env[envVar]) {
                console.log(`   ✅ ${envVar}: Configurado`);
                this.successes.push(`Config ${envVar}: OK`);
            } else {
                console.log(`   ❌ ${envVar}: FALTANDO`);
                this.issues.push(`Config ${envVar}: Não configurado`);
            }
        });

        // Verificar configurações no banco
        try {
            const configs = await pool.query(`
                SELECT config_key, config_value 
                FROM system_config 
                WHERE config_key IN ('DUAL_MODE_ACTIVE', 'ENABLE_REAL_TRADING', 'MINIMUM_BALANCE_BRL')
            `);
            
            console.log(`   📋 Configurações no banco: ${configs.rows.length}`);
            configs.rows.forEach(config => {
                console.log(`      ⚙️ ${config.config_key}: ${config.config_value}`);
            });
            
        } catch (error) {
            this.issues.push(`Configurações DB: ERRO - ${error.message}`);
        }
        console.log('');
    }

    async checkDualSystem() {
        console.log('🔄 7. VERIFICANDO SISTEMA DUAL...');
        
        try {
            const dualCheck = await pool.query(`
                SELECT 
                    account_type,
                    testnet_mode,
                    COUNT(*) as count
                FROM users 
                WHERE (ativo = true OR is_active = true)
                AND account_type IS NOT NULL
                GROUP BY account_type, testnet_mode
                ORDER BY account_type, testnet_mode
            `);

            console.log(`   📊 Distribuição por tipo de conta:`);
            dualCheck.rows.forEach(row => {
                const mode = row.testnet_mode ? 'TESTNET' : 'MANAGEMENT';
                console.log(`      ${row.account_type} (${mode}): ${row.count} usuários`);
            });

            const hasTestnet = dualCheck.rows.some(r => r.testnet_mode === true);
            const hasManagement = dualCheck.rows.some(r => r.testnet_mode === false);

            if (hasTestnet && hasManagement) {
                this.successes.push('Sistema Dual: Configurado (testnet + management)');
            } else if (hasTestnet) {
                this.issues.push('Sistema Dual: Apenas testnet configurado');
            } else if (hasManagement) {
                this.issues.push('Sistema Dual: Apenas management configurado');
            } else {
                this.issues.push('Sistema Dual: Não configurado');
            }

        } catch (error) {
            this.issues.push(`Sistema Dual: ERRO - ${error.message}`);
        }
        console.log('');
    }

    generateReport() {
        console.log('📋 RELATÓRIO FINAL DO SISTEMA');
        console.log('==============================\n');

        console.log('✅ SUCESSOS:');
        this.successes.forEach(success => {
            console.log(`   ✅ ${success}`);
        });

        console.log('\n❌ PROBLEMAS IDENTIFICADOS:');
        if (this.issues.length === 0) {
            console.log('   🎉 Nenhum problema crítico identificado!');
        } else {
            this.issues.forEach(issue => {
                console.log(`   ❌ ${issue}`);
            });
        }

        const healthScore = Math.round((this.successes.length / (this.successes.length + this.issues.length)) * 100);
        
        console.log(`\n🎯 SCORE DE SAÚDE DO SISTEMA: ${healthScore}%`);
        
        if (healthScore >= 90) {
            console.log('🚀 SISTEMA EM EXCELENTE ESTADO!');
        } else if (healthScore >= 70) {
            console.log('⚠️ SISTEMA FUNCIONAL - ALGUNS AJUSTES NECESSÁRIOS');
        } else {
            console.log('🔧 SISTEMA REQUER ATENÇÃO - VÁRIOS PROBLEMAS DETECTADOS');
        }

        console.log('\n==============================');
        console.log('🔍 CHECK COMPLETO FINALIZADO');
    }
}

// Executar check completo
async function main() {
    const checker = new SystemCompleteCheck();
    await checker.runFullCheck();
    await pool.end();
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = SystemCompleteCheck;
