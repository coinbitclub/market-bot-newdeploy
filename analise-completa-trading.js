#!/usr/bin/env node

/**
 * 🔍 ANÁLISE COMPLETA - POR QUE NÃO EXECUTAMOS OPERAÇÕES REAIS?
 * =============================================================
 * Investigação detalhada do fluxo de trading
 */

const { Pool } = require('pg');
const fs = require('fs');

console.log(`
🔍 ===================================================
   ANÁLISE COMPLETA DO SISTEMA DE TRADING
   Por que não estamos executando operações reais?
===================================================
`);

class TradingFlowAnalyzer {
    constructor() {
        this.pool = new Pool({
            connectionString: process.env.DATABASE_URL || 'postgresql://postgres:ELjbkkgUASRCtdTAXVFgIssOXiLsRCPq@trolley.proxy.rlwy.net:44790/railway',
            ssl: { rejectUnauthorized: false }
        });
        
        this.findings = [];
        this.recommendations = [];
    }

    async analyze() {
        console.log('🔍 Iniciando análise completa...\n');
        
        await this.checkEnvironmentVariables();
        await this.checkWebhookFlow();
        await this.checkSignalProcessor();
        await this.checkDatabaseTables();
        await this.checkSignalsReceived();
        await this.checkRealExecutionSettings();
        await this.checkUserAPIKeys();
        await this.checkExchangeConnectivity();
        await this.checkExecutionLogs();
        
        this.generateReport();
    }

    async checkEnvironmentVariables() {
        console.log('1️⃣ VERIFICANDO VARIÁVEIS DE AMBIENTE...');
        console.log('─'.repeat(50));
        
        const criticalVars = [
            'ENABLE_REAL_TRADING',
            'NODE_ENV',
            'DATABASE_URL"postgresql://username:password@host:port/database"BYBIT_API_KEYYOUR_API_KEY_HEREBYBIT_API_SECRET',
            'BINANCE_API_KEYYOUR_API_KEY_HEREBINANCE_API_SECRET'
        ];
        
        const envStatus = {};
        
        criticalVars.forEach(varName => {
            const value = process.env[varName];
            envStatus[varName] = {
                exists: !!value,
                value: value ? (varName.includes('SECRET') || varName.includes('KEY') ? '***HIDDEN***' : value) : 'NOT_SET',
                isCorrect: this.validateEnvVar(varName, value)
            };
            
            console.log(`  ${varName}: ${envStatus[varName].exists ? '✅' : '❌'} ${envStatus[varName].value}`);
        });
        
        // PRINCIPAL PROBLEMA - ENABLE_REAL_TRADING
        if (process.env.ENABLE_REAL_TRADING !== 'true') {
            this.findings.push({
                severity: 'CRITICAL',
                issue: 'ENABLE_REAL_TRADING não está definido como "true"',
                current: process.env.ENABLE_REAL_TRADING || 'undefined',
                impact: 'Sistema está em modo SIMULAÇÃO - não executa operações reais'
            });
            
            this.recommendations.push({
                priority: 'HIGH',
                action: 'Configurar ENABLE_REAL_TRADING=true no Railway',
                steps: [
                    '1. Acessar Railway dashboard',
                    '2. Ir em Variables',
                    '3. Adicionar ENABLE_REAL_TRADING=true',
                    '4. Redeploy da aplicação'
                ]
            });
        }
        
        console.log('');
        return envStatus;
    }

    async checkWebhookFlow() {
        console.log('2️⃣ VERIFICANDO FLUXO DE WEBHOOK...');
        console.log('─'.repeat(50));
        
        // Verificar se webhook está configurado corretamente
        try {
            const appJsContent = fs.readFileSync('./app.js', 'utf8');
            
            // Verificar rotas de webhook
            const webhookRoutes = [];
            if (appJsContent.includes("app.post('/webhook'")) webhookRoutes.push('/webhook');
            if (appJsContent.includes("app.post('/api/webhooks/signal'")) webhookRoutes.push('/api/webhooks/signal');
            
            console.log(`  Rotas de webhook encontradas: ${webhookRoutes.length}`);
            webhookRoutes.forEach(route => console.log(`    ✅ ${route}`));
            
            // Verificar qual signal processor está sendo usado
            if (appJsContent.includes('MultiUserSignalProcessor')) {
                console.log('  🔄 Usando: MultiUserSignalProcessor (STUB MODE)');
                
                this.findings.push({
                    severity: 'CRITICAL',
                    issue: 'Sistema está usando MultiUserSignalProcessor em STUB MODE',
                    current: 'STUB MODE - não executa operações reais',
                    impact: 'Sinais são processados mas não geram execuções'
                });
                
                this.recommendations.push({
                    priority: 'HIGH',
                    action: 'Trocar para EnhancedSignalProcessorWithExecution',
                    steps: [
                        '1. Alterar import no app.js',
                        '2. Usar EnhancedSignalProcessorWithExecution',
                        '3. Configurar ENABLE_REAL_TRADING=true'
                    ]
                });
            } else if (appJsContent.includes('EnhancedSignalProcessorWithExecution')) {
                console.log('  ✅ Usando: EnhancedSignalProcessorWithExecution');
            } else {
                console.log('  ❌ Signal processor não identificado');
            }
            
        } catch (error) {
            console.log(`  ❌ Erro ao ler app.js: ${error.message}`);
        }
        
        console.log('');
    }

    async checkSignalProcessor() {
        console.log('3️⃣ VERIFICANDO SIGNAL PROCESSOR...');
        console.log('─'.repeat(50));
        
        try {
            // Verificar qual signal processor existe
            const processors = [
                { file: 'multi-user-signal-processor.js', name: 'MultiUserSignalProcessor' },
                { file: 'enhanced-signal-processor-with-execution.js', name: 'EnhancedSignalProcessorWithExecution' }
            ];
            
            processors.forEach(processor => {
                if (fs.existsSync(`./${processor.file}`)) {
                    console.log(`  ✅ ${processor.name} - Arquivo existe`);
                    
                    const content = fs.readFileSync(`./${processor.file}`, 'utf8');
                    
                    if (content.includes('STUB MODE') || content.includes('stub mode')) {
                        console.log(`    ⚠️  ${processor.name} está em STUB MODE`);
                        
                        this.findings.push({
                            severity: 'HIGH',
                            issue: `${processor.name} está em modo stub`,
                            current: 'Não executa operações reais',
                            impact: 'Sinais são processados mas ignorados'
                        });
                    } else if (content.includes('executeRealOperation') || content.includes('REAL EXECUTION')) {
                        console.log(`    ✅ ${processor.name} tem capacidade de execução real`);
                    }
                } else {
                    console.log(`  ❌ ${processor.name} - Arquivo não encontrado`);
                }
            });
            
        } catch (error) {
            console.log(`  ❌ Erro ao verificar signal processors: ${error.message}`);
        }
        
        console.log('');
    }

    async checkDatabaseTables() {
        console.log('4️⃣ VERIFICANDO TABELAS DO BANCO...');
        console.log('─'.repeat(50));
        
        try {
            const tables = ['signals', 'trading_executions', 'user_api_keys', 'positions', 'active_positions'];
            
            for (const tableName of tables) {
                const result = await this.pool.query(`
                    SELECT EXISTS (
                        SELECT 1 FROM information_schema.tables 
                        WHERE table_name = $1
                    )
                `, [tableName]);
                
                const exists = result.rows[0].exists;
                console.log(`  ${tableName}: ${exists ? '✅' : '❌'} ${exists ? 'Existe' : 'Não existe'}`);
                
                if (exists && tableName === 'signals') {
                    const count = await this.pool.query('SELECT COUNT(*) as total FROM signals');
                    console.log(`    └─ ${count.rows[0].total} sinais registrados`);
                }
                
                if (exists && tableName === 'trading_executions') {
                    const count = await this.pool.query('SELECT COUNT(*) as total FROM trading_executions');
                    console.log(`    └─ ${count.rows[0].total} execuções registradas`);
                }
            }
            
        } catch (error) {
            console.log(`  ❌ Erro ao verificar tabelas: ${error.message}`);
        }
        
        console.log('');
    }

    async checkSignalsReceived() {
        console.log('5️⃣ VERIFICANDO SINAIS RECEBIDOS...');
        console.log('─'.repeat(50));
        
        try {
            // Verificar últimos sinais
            const recentSignals = await this.pool.query(`
                SELECT * FROM signals 
                ORDER BY processed_at DESC 
                LIMIT 10
            `).catch(() => ({ rows: [] }));
            
            console.log(`  Total de sinais encontrados: ${recentSignals.rows.length}`);
            
            if (recentSignals.rows.length === 0) {
                this.findings.push({
                    severity: 'MEDIUM',
                    issue: 'Nenhum sinal encontrado no banco de dados',
                    current: '0 sinais registrados',
                    impact: 'TradingView pode não estar enviando sinais ou webhook não está funcionando'
                });
                
                this.recommendations.push({
                    priority: 'MEDIUM',
                    action: 'Verificar configuração do TradingView',
                    steps: [
                        '1. Verificar URL do webhook no TradingView',
                        '2. Testar webhook manualmente',
                        '3. Verificar logs do servidor'
                    ]
                });
            } else {
                console.log('  Últimos 5 sinais:');
                recentSignals.rows.slice(0, 5).forEach((signal, index) => {
                    console.log(`    ${index + 1}. ${signal.symbol} ${signal.action} - ${signal.processed_at?.toLocaleString('pt-BR')}`);
                });
            }
            
        } catch (error) {
            console.log(`  ❌ Erro ao verificar sinais: ${error.message}`);
        }
        
        console.log('');
    }

    async checkRealExecutionSettings() {
        console.log('6️⃣ VERIFICANDO CONFIGURAÇÕES DE EXECUÇÃO REAL...');
        console.log('─'.repeat(50));
        
        const tradingEnabled = process.env.ENABLE_REAL_TRADING === 'true';
        const nodeEnv = process.env.NODE_ENV;
        const positionSafety = process.env.POSITION_SAFETY_ENABLED;
        
        console.log(`  ENABLE_REAL_TRADING: ${tradingEnabled ? '✅ TRUE' : '❌ FALSE/UNDEFINED'}`);
        console.log(`  NODE_ENV: ${nodeEnv || 'undefined'}`);
        console.log(`  POSITION_SAFETY_ENABLED: ${positionSafety || 'undefined'}`);
        
        if (!tradingEnabled) {
            this.findings.push({
                severity: 'CRITICAL',
                issue: 'Trading real não está habilitado',
                current: 'ENABLE_REAL_TRADING = false/undefined',
                impact: 'Sistema processa sinais mas não executa operações'
            });
        }
        
        console.log('');
    }

    async checkUserAPIKeys() {
        console.log('7️⃣ VERIFICANDO CHAVES API DOS USUÁRIOS...');
        console.log('─'.repeat(50));
        
        try {
            const apiKeys = await this.pool.query(`
                SELECT 
                    COUNT(*) as total,
                    COUNT(CASE WHEN is_active = true THEN 1 END) as active,
                    COUNT(CASE WHEN exchange = 'bybit' THEN 1 END) as bybit_keys,
                    COUNT(CASE WHEN exchange = 'binance' THEN 1 END) as binance_keys
                FROM user_api_keys 
                WHERE api_key IS NOT NULL AND api_key != ''
            `).catch(() => ({ rows: [{ total: 0, active: 0, bybit_keys: 0, binance_keys: 0 }] }));
            
            const stats = apiKeys.rows[0];
            
            console.log(`  Total de chaves: ${stats.total}`);
            console.log(`  Chaves ativas: ${stats.active}`);
            console.log(`  Bybit: ${stats.bybit_keys}`);
            console.log(`  Binance: ${stats.binance_keys}`);
            
            if (stats.active === 0) {
                this.findings.push({
                    severity: 'HIGH',
                    issue: 'Nenhuma chave API ativa encontrada',
                    current: '0 chaves ativas',
                    impact: 'Não é possível executar operações sem chaves API válidas'
                });
                
                this.recommendations.push({
                    priority: 'HIGH',
                    action: 'Configurar chaves API dos usuários',
                    steps: [
                        '1. Verificar tabela user_api_keys',
                        '2. Inserir chaves válidas dos usuários',
                        '3. Marcar is_active = true'
                    ]
                });
            }
            
        } catch (error) {
            console.log(`  ❌ Erro ao verificar chaves API: ${error.message}`);
        }
        
        console.log('');
    }

    async checkExchangeConnectivity() {
        console.log('8️⃣ VERIFICANDO CONECTIVIDADE COM EXCHANGES...');
        console.log('─'.repeat(50));
        
        const ccxt = require('ccxt');
        
        const exchanges = [
            { name: 'Bybit Testnet', url: 'https://api-testnet.bybit.com/v5/market/time' },
            { name: 'Binance Testnet', url: 'https://testnet.binance.vision/api/v3/time' }
        ];
        
        for (const exchange of exchanges) {
            try {
                const axios = require('axios');
                const response = await axios.get(exchange.url, { timeout: 5000 });
                console.log(`  ${exchange.name}: ✅ Conectado (${response.status})`);
                
            } catch (error) {
                console.log(`  ${exchange.name}: ❌ Erro (${error.message})`);
                
                this.findings.push({
                    severity: 'HIGH',
                    issue: `Conectividade com ${exchange.name} com problemas`,
                    current: error.message,
                    impact: 'Não é possível executar operações nesta exchange'
                });
            }
        }
        
        console.log('');
    }

    async checkExecutionLogs() {
        console.log('9️⃣ VERIFICANDO LOGS DE EXECUÇÃO...');
        console.log('─'.repeat(50));
        
        try {
            const executions = await this.pool.query(`
                SELECT 
                    COUNT(*) as total,
                    COUNT(CASE WHEN status = 'SUCCESS' THEN 1 END) as successful,
                    COUNT(CASE WHEN status = 'ERROR' THEN 1 END) as errors,
                    MAX(executed_at) as last_execution
                FROM trading_executions
            `).catch(() => ({ rows: [{ total: 0, successful: 0, errors: 0, last_execution: null }] }));
            
            const stats = executions.rows[0];
            
            console.log(`  Total execuções: ${stats.total}`);
            console.log(`  Sucessos: ${stats.successful}`);
            console.log(`  Erros: ${stats.errors}`);
            console.log(`  Última execução: ${stats.last_execution ? new Date(stats.last_execution).toLocaleString('pt-BR') : 'Nunca'}`);
            
            if (stats.total === 0) {
                this.findings.push({
                    severity: 'CRITICAL',
                    issue: 'Nenhuma execução de trading registrada',
                    current: '0 execuções',
                    impact: 'Sistema nunca executou operações reais'
                });
            }
            
        } catch (error) {
            console.log(`  ❌ Erro ao verificar execuções: ${error.message}`);
        }
        
        console.log('');
    }

    validateEnvVar(varName, value) {
        switch (varName) {
            case 'ENABLE_REAL_TRADING':
                return value === 'true';
            case 'NODE_ENV':
                return ['development', 'production'].includes(value);
            case 'DATABASE_URL"postgresql://username:password@host:port/database"postgresql://');
            default:
                return !!value;
        }
    }

    generateReport() {
        console.log('📊 ===================================================');
        console.log('   RELATÓRIO FINAL DA ANÁLISE');
        console.log('===================================================\n');
        
        console.log('🚨 PROBLEMAS ENCONTRADOS:');
        console.log('─'.repeat(30));
        
        if (this.findings.length === 0) {
            console.log('✅ Nenhum problema crítico encontrado!');
        } else {
            this.findings.forEach((finding, index) => {
                console.log(`${index + 1}. [${finding.severity}] ${finding.issue}`);
                console.log(`   Atual: ${finding.current}`);
                console.log(`   Impacto: ${finding.impact}\n`);
            });
        }
        
        console.log('🔧 RECOMENDAÇÕES:');
        console.log('─'.repeat(20));
        
        if (this.recommendations.length === 0) {
            console.log('✅ Sistema funcionando corretamente!');
        } else {
            this.recommendations.forEach((rec, index) => {
                console.log(`${index + 1}. [${rec.priority}] ${rec.action}`);
                rec.steps.forEach(step => console.log(`   ${step}`));
                console.log('');
            });
        }
        
        console.log('🎯 RESUMO EXECUTIVO:');
        console.log('─'.repeat(20));
        
        const criticalIssues = this.findings.filter(f => f.severity === 'CRITICAL').length;
        const highIssues = this.findings.filter(f => f.severity === 'HIGH').length;
        const mediumIssues = this.findings.filter(f => f.severity === 'MEDIUM').length;
        
        console.log(`• Problemas críticos: ${criticalIssues}`);
        console.log(`• Problemas altos: ${highIssues}`);
        console.log(`• Problemas médios: ${mediumIssues}`);
        
        if (criticalIssues > 0) {
            console.log('\n❌ SISTEMA NÃO ESTÁ EXECUTANDO OPERAÇÕES REAIS');
            console.log('🔧 Corrigir problemas críticos para ativar trading real');
        } else if (highIssues > 0) {
            console.log('\n⚠️  SISTEMA COM LIMITAÇÕES');
            console.log('🔧 Corrigir problemas altos para melhor funcionamento');
        } else {
            console.log('\n✅ SISTEMA OPERACIONAL PARA TRADING REAL');
        }
        
        console.log('\n🚀 PRÓXIMOS PASSOS PRIORITÁRIOS:');
        console.log('1. Configurar ENABLE_REAL_TRADING=true no Railway');
        console.log('2. Verificar/configurar chaves API dos usuários');
        console.log('3. Trocar para EnhancedSignalProcessorWithExecution');
        console.log('4. Testar webhook do TradingView');
        console.log('5. Monitorar execuções em tempo real');
    }
}

// Executar análise
async function runAnalysis() {
    try {
        const analyzer = new TradingFlowAnalyzer();
        await analyzer.analyze();
        process.exit(0);
    } catch (error) {
        console.error('❌ Erro na análise:', error.message);
        process.exit(1);
    }
}

runAnalysis();
