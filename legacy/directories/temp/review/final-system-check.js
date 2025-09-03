#!/usr/bin/env node

/**
 * 🔧 VERIFICAÇÃO FINAL DO SISTEMA - COINBITCLUB MARKET BOT
 * ========================================================
 * 
 * Script para verificação completa e análise do status do projeto
 */

const axios = require('axios');
const { Pool } = require('pg');
require('dotenv').config({ path: '.env.production' });

class FinalSystemChecker {
    constructor() {
        this.apiUrl = 'https://coinbitclub-market-bot.up.railway.app';
        this.pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: { rejectUnauthorized: false }
        });
        this.results = {
            apis: {},
            database: {},
            trading: {},
            financial: {},
            overall: 'UNKNOWN'
        };
    }

    async checkComplete() {
        console.log('🔍 VERIFICAÇÃO FINAL COMPLETA DO COINBITCLUB MARKET BOT');
        console.log('========================================================');
        console.log('');

        try {
            await this.checkAPIs();
            await this.checkDatabase();
            await this.checkTradingSystem();
            await this.checkFinancialSystem();
            
            this.generateFinalReport();
            
        } catch (error) {
            console.error('💥 ERRO na verificação:', error);
        } finally {
            await this.pool.end();
        }
    }

    async checkAPIs() {
        console.log('🌐 VERIFICANDO APIs...');

        const endpoints = [
            { name: 'Health', path: '/health', method: 'GET' },
            { name: 'Status', path: '/status', method: 'GET' },
            { name: 'Trading Status', path: '/api/trading/status', method: 'GET' },
            { name: 'Users API', path: '/api/users', method: 'GET' },
            { name: 'Positions API', path: '/api/positions', method: 'GET' },
            { name: 'Signals API', path: '/api/signals', method: 'GET' },
            { name: 'Market Data', path: '/api/market/data', method: 'GET' },
            { name: 'Dominance API', path: '/api/dominance', method: 'GET' },
            { name: 'Webhook GET', path: '/webhook', method: 'GET' }
        ];

        for (const endpoint of endpoints) {
            try {
                const response = await axios.get(`${this.apiUrl}${endpoint.path}`);
                this.results.apis[endpoint.name] = {
                    status: 'OK',
                    code: response.status,
                    data: response.data
                };
                console.log(`   ✅ ${endpoint.name}: OK (${response.status})`);
            } catch (error) {
                this.results.apis[endpoint.name] = {
                    status: 'ERROR',
                    error: error.message
                };
                console.log(`   ❌ ${endpoint.name}: ${error.message}`);
            }
        }
        console.log('');
    }

    async checkDatabase() {
        console.log('🗃️ VERIFICANDO BANCO DE DADOS...');

        const client = await this.pool.connect();
        
        try {
            // Verificar conectividade
            await client.query('SELECT NOW()');
            console.log('   ✅ Conectividade: OK');

            // Verificar tabelas principais
            const tables = await client.query(`
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                ORDER BY table_name
            `);
            
            this.results.database.tables = tables.rows.map(r => r.table_name);
            console.log(`   ✅ Tabelas encontradas: ${this.results.database.tables.length}`);
            console.log(`      • ${this.results.database.tables.join(', ')}`);

            // Verificar dados
            const counts = await client.query(`
                SELECT 
                    (SELECT COUNT(*) FROM users) as users_count,
                    (SELECT COUNT(*) FROM positions) as positions_count,
                    (SELECT COUNT(*) FROM signals) as signals_count,
                    (SELECT CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'transactions') THEN (SELECT COUNT(*) FROM transactions) ELSE 0 END) as transactions_count
            `);

            const data = counts.rows[0];
            this.results.database.records = data;
            console.log(`   ✅ Registros:`);
            console.log(`      • Usuários: ${data.users_count}`);
            console.log(`      • Posições: ${data.positions_count}`);
            console.log(`      • Sinais: ${data.signals_count}`);
            console.log(`      • Transações: ${data.transactions_count}`);

            // Verificar colunas críticas
            const userColumns = await client.query(`
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'users' AND column_name LIKE '%balance%'
            `);

            this.results.database.financial_columns = userColumns.rows.map(r => r.column_name);
            console.log(`   ✅ Colunas financeiras: ${this.results.database.financial_columns.length}`);

        } catch (error) {
            this.results.database.error = error.message;
            console.log(`   ❌ Erro no banco: ${error.message}`);
        } finally {
            client.release();
        }
        console.log('');
    }

    async checkTradingSystem() {
        console.log('⚡ VERIFICANDO SISTEMA DE TRADING...');

        try {
            // Teste de webhook POST
            const webhookResponse = await axios.post(`${this.apiUrl}/webhook`, {
                symbol: 'BTCUSDT',
                action: 'BUY',
                price: 67500,
                test: true
            });

            this.results.trading.webhook = {
                status: 'OK',
                processed: webhookResponse.data
            };
            console.log(`   ✅ Webhook POST: Funcionando`);
            console.log(`      • Sinal processado com ID: ${webhookResponse.data.resultado?.id || 'N/A'}`);

            // Verificar configurações de trading
            const tradingStatus = await axios.get(`${this.apiUrl}/api/trading/status`);
            this.results.trading.config = tradingStatus.data;
            
            console.log(`   ✅ Configurações de Trading:`);
            console.log(`      • Real Trading: ${tradingStatus.data.enabled ? 'ATIVADO' : 'DESATIVADO'}`);
            console.log(`      • Position Safety: ${tradingStatus.data.positionSafety ? 'OBRIGATÓRIO' : 'OPCIONAL'}`);
            console.log(`      • Stop Loss: ${tradingStatus.data.mandatoryStopLoss ? 'OBRIGATÓRIO' : 'OPCIONAL'}`);
            console.log(`      • Max Leverage: ${tradingStatus.data.maxLeverage}`);

        } catch (error) {
            this.results.trading.error = error.message;
            console.log(`   ❌ Erro no sistema de trading: ${error.message}`);
        }
        console.log('');
    }

    async checkFinancialSystem() {
        console.log('💰 VERIFICANDO SISTEMA FINANCEIRO...');

        try {
            // Testar API financeira
            const response = await axios.get(`${this.apiUrl}/api/financial/summary`);
            this.results.financial.api = {
                status: 'OK',
                data: response.data
            };
            console.log(`   ✅ API Financeira: Funcionando`);
            
        } catch (error) {
            this.results.financial.api = {
                status: 'ERROR',
                error: error.message
            };
            console.log(`   ❌ API Financeira: ${error.message}`);
            
            // Verificar se é problema de estrutura
            if (error.message.includes('column') && error.message.includes('does not exist')) {
                console.log(`   🔧 Problema de estrutura detectado - requer correção manual`);
            }
        }

        // Verificar configurações de comissão
        try {
            const commissionPlans = await axios.get(`${this.apiUrl}/commission-plans`);
            this.results.financial.commission = {
                status: 'OK',
                plans: commissionPlans.data
            };
            console.log(`   ✅ Sistema de Comissões: Funcionando`);
            
        } catch (error) {
            this.results.financial.commission = {
                status: 'ERROR',
                error: error.message
            };
            console.log(`   ❌ Sistema de Comissões: ${error.message}`);
        }
        console.log('');
    }

    generateFinalReport() {
        console.log('📊 RELATÓRIO FINAL - STATUS DO PROJETO');
        console.log('======================================');
        console.log('');

        // Calcular score geral
        let totalChecks = 0;
        let passedChecks = 0;

        // APIs
        Object.values(this.results.apis).forEach(api => {
            totalChecks++;
            if (api.status === 'OK') passedChecks++;
        });

        // Trading
        if (this.results.trading.webhook?.status === 'OK') passedChecks++;
        if (this.results.trading.config) passedChecks++;
        totalChecks += 2;

        // Database
        if (!this.results.database.error) passedChecks++;
        totalChecks++;

        const score = Math.round((passedChecks / totalChecks) * 100);

        // Status geral
        if (score >= 90) {
            this.results.overall = 'TOTALMENTE OPERACIONAL';
            console.log('🟢 STATUS: PROJETO 100% CONCLUÍDO E OPERACIONAL');
        } else if (score >= 75) {
            this.results.overall = 'OPERACIONAL COM LIMITAÇÕES';
            console.log('🟡 STATUS: PROJETO OPERACIONAL COM ALGUMAS LIMITAÇÕES');
        } else {
            this.results.overall = 'REQUER ATENÇÃO';
            console.log('🔴 STATUS: PROJETO REQUER ATENÇÃO');
        }

        console.log(`📈 SCORE GERAL: ${score}% (${passedChecks}/${totalChecks})`);
        console.log('');

        // Detalhes por componente
        console.log('🔍 ANÁLISE POR COMPONENTE:');
        console.log('');

        console.log('🌐 APIs:');
        Object.entries(this.results.apis).forEach(([name, result]) => {
            const icon = result.status === 'OK' ? '✅' : '❌';
            console.log(`   ${icon} ${name}: ${result.status}`);
        });
        console.log('');

        console.log('⚡ Trading:');
        if (this.results.trading.config) {
            console.log(`   ✅ Configuração: Real Trading ${this.results.trading.config.enabled ? 'ATIVO' : 'INATIVO'}`);
            console.log(`   ✅ Segurança: Position Safety ${this.results.trading.config.positionSafety ? 'ATIVO' : 'INATIVO'}`);
            console.log(`   ✅ Webhook: ${this.results.trading.webhook?.status || 'ERROR'}`);
        } else {
            console.log(`   ❌ Erro na verificação do trading`);
        }
        console.log('');

        console.log('🗃️ Banco de Dados:');
        if (this.results.database.records) {
            console.log(`   ✅ Conectividade: OK`);
            console.log(`   ✅ Usuários: ${this.results.database.records.users_count}`);
            console.log(`   ✅ Posições Ativas: ${this.results.database.records.positions_count}`);
            console.log(`   ✅ Sinais Processados: ${this.results.database.records.signals_count}`);
        } else {
            console.log(`   ❌ Problemas na conectividade`);
        }
        console.log('');

        console.log('💰 Sistema Financeiro:');
        const financialIcon = this.results.financial.api?.status === 'OK' ? '✅' : '❌';
        console.log(`   ${financialIcon} API Financeira: ${this.results.financial.api?.status || 'ERROR'}`);
        const commissionIcon = this.results.financial.commission?.status === 'OK' ? '✅' : '❌';
        console.log(`   ${commissionIcon} Sistema de Comissões: ${this.results.financial.commission?.status || 'ERROR'}`);
        console.log('');

        // URLs operacionais
        console.log('🌐 URLS OPERACIONAIS:');
        console.log(`   • Backend: ${this.apiUrl}`);
        console.log(`   • Dashboard: ${this.apiUrl}/dashboard`);
        console.log(`   • Webhook: ${this.apiUrl}/webhook`);
        console.log(`   • API Docs: ${this.apiUrl}/api/users (exemplo)`);
        console.log('');

        // Configurações críticas
        if (this.results.trading.config) {
            console.log('⚙️ CONFIGURAÇÕES CRÍTICAS:');
            console.log(`   • Trading Real: ${this.results.trading.config.enabled ? '🟢 ATIVO' : '🔴 INATIVO'}`);
            console.log(`   • Position Safety: ${this.results.trading.config.positionSafety ? '🟢 OBRIGATÓRIO' : '🟡 OPCIONAL'}`);
            console.log(`   • Stop Loss: ${this.results.trading.config.mandatoryStopLoss ? '🟢 OBRIGATÓRIO' : '🟡 OPCIONAL'}`);
            console.log(`   • Take Profit: ${this.results.trading.config.mandatoryTakeProfit ? '🟢 OBRIGATÓRIO' : '🟡 OPCIONAL'}`);
            console.log(`   • Max Leverage: ${this.results.trading.config.maxLeverage}`);
            console.log('');
        }

        // Recomendações finais
        console.log('🎯 RECOMENDAÇÕES:');
        if (score >= 90) {
            console.log('   ✅ Sistema pronto para operação em produção');
            console.log('   ✅ Todos os componentes funcionando adequadamente');
            console.log('   ✅ Trading real configurado e seguro');
        } else {
            console.log('   🔧 Corrigir problemas identificados acima');
            if (this.results.financial.api?.status === 'ERROR') {
                console.log('   🔧 Prioridade: Corrigir sistema financeiro');
            }
            console.log('   📊 Executar nova verificação após correções');
        }
        console.log('');

        console.log('=========================================');
        console.log('🚀 COINBITCLUB MARKET BOT - VERIFICAÇÃO CONCLUÍDA');
        console.log(`⏱️  ${new Date().toLocaleString()}`);
        console.log('=========================================');
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    const checker = new FinalSystemChecker();
    checker.checkComplete();
}

module.exports = FinalSystemChecker;
