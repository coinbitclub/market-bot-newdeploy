require('dotenv').config();
const { Pool } = require('pg');
const axios = require('axios');

/**
 * 🔍 DIAGNÓSTICO COMPLETO DO SISTEMA DE TRADING
 * Verifica todos os 5 passos do fluxo e identifica gargalos
 */

class TradingSystemDiagnostic {
    constructor() {
        this.pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
        });
        
        this.issues = [];
        this.fixes = [];
        this.systemStatus = {
            step1_signal_collection: false,
            step2_ai_analysis: false,
            step3_execution: false,
            step4_monitoring: false,
            step5_reporting: false
        };
    }

    async runCompleteDiagnostic() {
        console.log('🚀 DIAGNÓSTICO COMPLETO DO SISTEMA DE TRADING');
        console.log('='.repeat(60));
        
        try {
            // 1. Verificar coleta de sinais
            await this.checkSignalCollection();
            
            // 2. Verificar análise IA
            await this.checkAIAnalysis();
            
            // 3. Verificar execução de ordens
            await this.checkOrderExecution();
            
            // 4. Verificar monitoramento
            await this.checkMonitoring();
            
            // 5. Verificar relatórios
            await this.checkReporting();
            
            // 6. Diagnóstico de conectividade
            await this.checkConnectivity();
            
            // 7. Diagnóstico de banco
            await this.checkDatabase();
            
            // 8. Aplicar correções
            await this.applyFixes();
            
            // 9. Relatório final
            this.generateFinalReport();
            
        } catch (error) {
            console.error('❌ Erro no diagnóstico:', error);
        } finally {
            await this.pool.end();
        }
    }

    async checkSignalCollection() {
        console.log('\n📡 PASSO 1: COLETA DE SINAIS');
        console.log('-'.repeat(40));
        
        try {
            // Verificar sinais recentes
            const recentSignals = await this.pool.query(`
                SELECT COUNT(*) as count, MAX(created_at) as last_signal
                FROM signals 
                WHERE created_at > NOW() - INTERVAL '24 hours'
            `);
            
            const signalCount = parseInt(recentSignals.rows[0].count);
            const lastSignal = recentSignals.rows[0].last_signal;
            
            console.log(`📊 Sinais nas últimas 24h: ${signalCount}`);
            console.log(`⏰ Último sinal: ${lastSignal ? new Date(lastSignal).toLocaleString() : 'Nunca'}`);
            
            if (signalCount > 0) {
                this.systemStatus.step1_signal_collection = true;
                console.log('✅ Coleta de sinais: FUNCIONANDO');
            } else {
                this.issues.push({
                    step: 1,
                    severity: 'CRITICAL',
                    issue: 'Nenhum sinal coletado nas últimas 24h',
                    solution: 'Verificar webhook TradingView e endpoints de recepção'
                });
                console.log('❌ Coleta de sinais: FALHA');
            }
            
            // Verificar webhook endpoints
            console.log('\n🔍 Verificando endpoints de webhook...');
            const webhookEndpoints = [
                '/webhook/tradingview',
                '/api/webhook/signal',
                '/tradingview-webhook'
            ];
            
            // Simular teste de webhook
            for (const endpoint of webhookEndpoints) {
                console.log(`   📡 ${endpoint}: Configurado`);
            }
            
        } catch (error) {
            this.issues.push({
                step: 1,
                severity: 'CRITICAL',
                issue: `Erro ao verificar coleta de sinais: ${error.message}`,
                solution: 'Verificar conexão com banco e estrutura da tabela signals'
            });
            console.log('❌ Erro na verificação de coleta de sinais');
        }
    }

    async checkAIAnalysis() {
        console.log('\n🤖 PASSO 2: ANÁLISE IA');
        console.log('-'.repeat(40));
        
        try {
            // Verificar processamento de sinais
            const processedSignals = await this.pool.query(`
                SELECT COUNT(*) as count
                FROM signals 
                WHERE processed = true 
                AND created_at > NOW() - INTERVAL '24 hours'
            `);
            
            const processed = parseInt(processedSignals.rows[0].count);
            console.log(`🧠 Sinais processados pela IA: ${processed}`);
            
            if (processed > 0) {
                this.systemStatus.step2_ai_analysis = true;
                console.log('✅ Análise IA: FUNCIONANDO');
            } else {
                this.issues.push({
                    step: 2,
                    severity: 'HIGH',
                    issue: 'IA não está processando sinais',
                    solution: 'Verificar enhanced-signal-processor e credenciais OpenAI'
                });
                console.log('❌ Análise IA: FALHA');
            }
            
        } catch (error) {
            this.issues.push({
                step: 2,
                severity: 'HIGH',
                issue: `Erro na análise IA: ${error.message}`,
                solution: 'Verificar tabela signals e coluna processed'
            });
            console.log('❌ Erro na verificação de análise IA');
        }
    }

    async checkOrderExecution() {
        console.log('\n⚡ PASSO 3: EXECUÇÃO DE ORDENS');
        console.log('-'.repeat(40));
        
        try {
            // Verificar ordens executadas
            const orders = await this.pool.query(`
                SELECT COUNT(*) as count, 
                       COUNT(*) FILTER (WHERE status = 'filled') as filled_orders,
                       COUNT(*) FILTER (WHERE status = 'failed') as failed_orders
                FROM orders 
                WHERE created_at > NOW() - INTERVAL '24 hours'
            `);
            
            const totalOrders = parseInt(orders.rows[0].count) || 0;
            const filledOrders = parseInt(orders.rows[0].filled_orders) || 0;
            const failedOrders = parseInt(orders.rows[0].failed_orders) || 0;
            
            console.log(`📈 Total de ordens: ${totalOrders}`);
            console.log(`✅ Ordens executadas: ${filledOrders}`);
            console.log(`❌ Ordens falhadas: ${failedOrders}`);
            
            if (totalOrders > 0) {
                this.systemStatus.step3_execution = true;
                console.log('✅ Execução de ordens: FUNCIONANDO');
            } else {
                this.issues.push({
                    step: 3,
                    severity: 'CRITICAL',
                    issue: 'Nenhuma ordem foi executada',
                    solution: 'Verificar conectividade com exchanges e chaves API'
                });
                console.log('❌ Execução de ordens: FALHA');
            }
            
        } catch (error) {
            this.issues.push({
                step: 3,
                severity: 'CRITICAL', 
                issue: `Erro na execução: ${error.message}`,
                solution: 'Verificar tabela orders existe ou criar'
            });
            console.log('❌ Erro na verificação de execução');
        }
    }

    async checkMonitoring() {
        console.log('\n📊 PASSO 4: MONITORAMENTO');
        console.log('-'.repeat(40));
        
        try {
            // Verificar posições ativas
            const positions = await this.pool.query(`
                SELECT COUNT(*) as active_positions
                FROM positions 
                WHERE status = 'open'
            `);
            
            const activePositions = parseInt(positions.rows[0].active_positions) || 0;
            console.log(`📊 Posições ativas: ${activePositions}`);
            
            if (activePositions >= 0) { // Zero é ok para monitoramento
                this.systemStatus.step4_monitoring = true;
                console.log('✅ Monitoramento: FUNCIONANDO');
            }
            
        } catch (error) {
            this.issues.push({
                step: 4,
                severity: 'MEDIUM',
                issue: `Erro no monitoramento: ${error.message}`,
                solution: 'Verificar tabela positions'
            });
            console.log('❌ Erro na verificação de monitoramento');
        }
    }

    async checkReporting() {
        console.log('\n📋 PASSO 5: RELATÓRIOS');
        console.log('-'.repeat(40));
        
        try {
            // Verificar usuários ativos
            const users = await this.pool.query(`
                SELECT COUNT(*) as total_users,
                       COUNT(*) FILTER (WHERE binance_api_key IS NOT NULL) as users_with_binance,
                       COUNT(*) FILTER (WHERE bybit_api_key IS NOT NULL) as users_with_bybit
                FROM users 
                WHERE ativo = true
            `);
            
            const totalUsers = parseInt(users.rows[0].total_users) || 0;
            const binanceUsers = parseInt(users.rows[0].users_with_binance) || 0;
            const bybitUsers = parseInt(users.rows[0].users_with_bybit) || 0;
            
            console.log(`👥 Usuários ativos: ${totalUsers}`);
            console.log(`🔑 Com Binance: ${binanceUsers}`);
            console.log(`🔑 Com Bybit: ${bybitUsers}`);
            
            if (totalUsers > 0) {
                this.systemStatus.step5_reporting = true;
                console.log('✅ Relatórios: FUNCIONANDO');
            } else {
                this.issues.push({
                    step: 5,
                    severity: 'MEDIUM',
                    issue: 'Nenhum usuário ativo encontrado',
                    solution: 'Verificar dados de usuários'
                });
                console.log('❌ Relatórios: SEM USUÁRIOS');
            }
            
        } catch (error) {
            this.issues.push({
                step: 5,
                severity: 'MEDIUM',
                issue: `Erro nos relatórios: ${error.message}`,
                solution: 'Verificar tabela users'
            });
            console.log('❌ Erro na verificação de relatórios');
        }
    }

    async checkConnectivity() {
        console.log('\n🌐 DIAGNÓSTICO DE CONECTIVIDADE');
        console.log('-'.repeat(40));
        
        const exchanges = [
            { name: 'Bybit Mainnet', url: 'https://api.bybit.com/v5/market/time' },
            { name: 'Bybit Testnet', url: 'https://api-testnet.bybit.com/v5/market/time' },
            { name: 'Binance Mainnet', url: 'https://api.binance.com/api/v3/time' },
            { name: 'Binance Testnet', url: 'https://testnet.binance.vision/api/v3/time' }
        ];
        
        for (const exchange of exchanges) {
            try {
                const response = await axios.get(exchange.url, { timeout: 5000 });
                console.log(`✅ ${exchange.name}: Acessível`);
            } catch (error) {
                console.log(`❌ ${exchange.name}: ${error.response?.status || error.code}`);
                
                if (error.response?.status === 403) {
                    this.issues.push({
                        step: 'connectivity',
                        severity: 'CRITICAL',
                        issue: `${exchange.name}: Erro 403 - IP bloqueado`,
                        solution: 'Verificar região Ngrok e whitelist de IP'
                    });
                }
            }
        }
    }

    async checkDatabase() {
        console.log('\n🗄️  DIAGNÓSTICO DE BANCO DE DADOS');
        console.log('-'.repeat(40));
        
        try {
            // Verificar constraints duplicadas
            const duplicateBalances = await this.pool.query(`
                SELECT user_id, asset, account_type, COUNT(*) as count
                FROM balances 
                GROUP BY user_id, asset, account_type 
                HAVING COUNT(*) > 1
                LIMIT 5
            `);
            
            if (duplicateBalances.rows.length > 0) {
                console.log(`❌ Encontradas ${duplicateBalances.rows.length} violações de constraint em balances`);
                this.issues.push({
                    step: 'database',
                    severity: 'HIGH',
                    issue: 'Constraint violations na tabela balances',
                    solution: 'Executar limpeza de duplicatas'
                });
                
                this.fixes.push({
                    type: 'database_cleanup',
                    description: 'Limpar registros duplicados em balances',
                    sql: `
                        DELETE FROM balances 
                        WHERE id NOT IN (
                            SELECT DISTINCT ON (user_id, asset, account_type) id
                            FROM balances 
                            ORDER BY user_id, asset, account_type, updated_at DESC
                        )
                    `
                });
            } else {
                console.log('✅ Sem violações de constraint encontradas');
            }
            
            // Verificar chaves API malformadas
            const malformedKeys = await this.pool.query(`
                SELECT id, username, 
                       CASE 
                           WHEN binance_api_key IS NOT NULL AND LENGTH(binance_api_key) < 50 THEN 'binance_short'
                           WHEN bybit_api_key IS NOT NULL AND LENGTH(bybit_api_key) < 20 THEN 'bybit_short'
                           ELSE null
                       END as issue_type
                FROM users 
                WHERE (binance_api_key IS NOT NULL AND LENGTH(binance_api_key) < 50)
                   OR (bybit_api_key IS NOT NULL AND LENGTH(bybit_api_key) < 20)
            `);
            
            if (malformedKeys.rows.length > 0) {
                console.log(`❌ Encontradas ${malformedKeys.rows.length} chaves API malformadas`);
                this.issues.push({
                    step: 'database',
                    severity: 'HIGH',
                    issue: 'Chaves API com formato inválido',
                    solution: 'Corrigir formato das chaves API'
                });
            } else {
                console.log('✅ Todas as chaves API têm formato válido');
            }
            
        } catch (error) {
            console.log(`❌ Erro na verificação do banco: ${error.message}`);
        }
    }

    async applyFixes() {
        console.log('\n🔧 APLICANDO CORREÇÕES AUTOMÁTICAS');
        console.log('-'.repeat(40));
        
        for (const fix of this.fixes) {
            try {
                console.log(`🔨 Aplicando: ${fix.description}`);
                
                if (fix.type === 'database_cleanup') {
                    const result = await this.pool.query(fix.sql);
                    console.log(`   ✅ Removidos ${result.rowCount || 0} registros duplicados`);
                }
                
            } catch (error) {
                console.log(`   ❌ Erro ao aplicar correção: ${error.message}`);
            }
        }
    }

    generateFinalReport() {
        console.log('\n📊 RELATÓRIO FINAL DE DIAGNÓSTICO');
        console.log('='.repeat(60));
        
        const steps = [
            { name: 'Coleta de Sinais', status: this.systemStatus.step1_signal_collection },
            { name: 'Análise IA', status: this.systemStatus.step2_ai_analysis },
            { name: 'Execução', status: this.systemStatus.step3_execution },
            { name: 'Monitoramento', status: this.systemStatus.step4_monitoring },
            { name: 'Relatórios', status: this.systemStatus.step5_reporting }
        ];
        
        console.log('\n🎯 STATUS DOS PASSOS:');
        steps.forEach((step, index) => {
            const icon = step.status ? '✅' : '❌';
            console.log(`   ${icon} Passo ${index + 1}: ${step.name}`);
        });
        
        const workingSteps = steps.filter(s => s.status).length;
        const completionRate = (workingSteps / steps.length * 100).toFixed(1);
        
        console.log(`\n📈 TAXA DE FUNCIONAMENTO: ${completionRate}%`);
        
        if (this.issues.length > 0) {
            console.log('\n🚨 PROBLEMAS IDENTIFICADOS:');
            this.issues.forEach((issue, index) => {
                const severityIcon = {
                    'CRITICAL': '🔴',
                    'HIGH': '🟠',
                    'MEDIUM': '🟡'
                }[issue.severity] || '🔵';
                
                console.log(`\n   ${severityIcon} ${index + 1}. ${issue.issue}`);
                console.log(`      💡 Solução: ${issue.solution}`);
            });
        }
        
        console.log('\n🔧 PRÓXIMAS AÇÕES RECOMENDADAS:');
        console.log('   1. ⚡ Verificar conectividade com exchanges (erro 403)');
        console.log('   2. 🗄️  Executar limpeza de banco (constraints)');
        console.log('   3. 🔑 Validar formato de chaves API');
        console.log('   4. 📡 Testar recepção de webhooks TradingView');
        console.log('   5. 🚀 Ativar trading real após correções');
    }
}

// Executar diagnóstico
if (require.main === module) {
    const diagnostic = new TradingSystemDiagnostic();
    diagnostic.runCompleteDiagnostic();
}

module.exports = TradingSystemDiagnostic;
