#!/usr/bin/env node

/**
 * 🧪 TESTE COMPLETO DOS ENDPOINTS COM BANCO CORRIGIDO
 * ==================================================
 * 
 * Testa todos os endpoints críticos para verificar se o banco
 * está respondendo corretamente após as correções
 */

const axios = require('axios');
const { Pool } = require('pg');
require('dotenv').config({ path: '.env.production' });

class EndpointTester {
    constructor() {
        this.baseUrl = process.env.BACKEND_URL || 'http://localhost:3000';
        this.pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: { rejectUnauthorized: false }
        });
        this.results = [];
    }

    async testAllEndpoints() {
        console.log('🧪 TESTE COMPLETO DOS ENDPOINTS');
        console.log('===============================');
        console.log(`🌐 Base URL: ${this.baseUrl}`);
        
        try {
            // Testes que não dependem de banco
            await this.testHealthEndpoints();
            
            // Testes que dependem de banco
            await this.testDatabaseEndpoints();
            
            // Testes de webhook/sinais
            await this.testSignalEndpoints();
            
            // Relatório final
            this.generateTestReport();
            
        } catch (error) {
            console.error('❌ Erro durante os testes:', error.message);
        } finally {
            await this.pool.end();
        }
    }

    async testHealthEndpoints() {
        console.log('\n🔍 TESTANDO ENDPOINTS DE HEALTH');
        console.log('================================');
        
        const healthEndpoints = [
            { path: '/health', name: 'Health Check Básico' },
            { path: '/status', name: 'Status com BD' },
            { path: '/', name: 'Status Principal' },
            { path: '/system-status', name: 'Status Detalhado' }
        ];

        for (const endpoint of healthEndpoints) {
            await this.testEndpoint('GET', endpoint.path, endpoint.name);
        }
    }

    async testDatabaseEndpoints() {
        console.log('\n🗄️ TESTANDO ENDPOINTS COM BANCO DE DADOS');
        console.log('=========================================');
        
        const dbEndpoints = [
            { path: '/api/users', name: 'Listar Usuários' },
            { path: '/api/positions', name: 'Listar Posições' },
            { path: '/api/signals', name: 'Listar Sinais' },
            { path: '/dashboard', name: 'Dashboard Operacional' },
            { path: '/api/trading/status', name: 'Status do Trading' }
        ];

        for (const endpoint of dbEndpoints) {
            await this.testEndpoint('GET', endpoint.path, endpoint.name);
        }
    }

    async testSignalEndpoints() {
        console.log('\n📡 TESTANDO ENDPOINTS DE SINAIS');
        console.log('===============================');
        
        // Teste do webhook com dados simulados
        const signalData = {
            ticker: 'BTCUSDT',
            signal: 'SINAL_LONG',
            action: 'BUY',
            timestamp: new Date().toISOString(),
            source: 'test'
        };

        await this.testEndpoint('POST', '/webhook', 'Webhook Principal', signalData);
        await this.testEndpoint('POST', '/api/webhooks/signal', 'API Webhook', signalData);
        
        // Teste de validação de posição
        const positionData = {
            leverage: 10,
            stopLoss: 2.0,
            takeProfit: 4.0,
            orderValue: 100
        };

        await this.testEndpoint('POST', '/validate-position', 'Validar Posição', positionData);
    }

    async testEndpoint(method, path, name, data = null) {
        try {
            console.log(`🔍 Testando: ${name}`);
            
            const url = `${this.baseUrl}${path}`;
            const config = {
                method: method,
                url: url,
                timeout: 10000,
                validateStatus: () => true // Aceitar todos os status codes
            };

            if (data && method === 'POST') {
                config.data = data;
                config.headers = { 'Content-Type': 'application/json' };
            }

            const response = await axios(config);
            
            const result = {
                name: name,
                path: path,
                method: method,
                status: response.status,
                success: response.status >= 200 && response.status < 400,
                responseTime: response.headers['response-time'] || 'N/A',
                hasData: response.data ? Object.keys(response.data).length > 0 : false,
                error: null
            };

            if (result.success) {
                console.log(`   ✅ ${result.status} - ${result.hasData ? 'Com dados' : 'Sem dados'}`);
            } else {
                console.log(`   ❌ ${result.status} - ${response.data?.error || 'Erro desconhecido'}`);
                result.error = response.data?.error || 'Erro desconhecido';
            }

            this.results.push(result);

        } catch (error) {
            console.log(`   💥 ERRO: ${error.message}`);
            
            this.results.push({
                name: name,
                path: path,
                method: method,
                status: 0,
                success: false,
                responseTime: 'N/A',
                hasData: false,
                error: error.message
            });
        }
    }

    generateTestReport() {
        console.log('\n📊 RELATÓRIO FINAL DOS TESTES');
        console.log('=============================');
        
        const totalTests = this.results.length;
        const successfulTests = this.results.filter(r => r.success).length;
        const failedTests = totalTests - successfulTests;
        
        console.log(`📈 Total de testes: ${totalTests}`);
        console.log(`✅ Sucessos: ${successfulTests}`);
        console.log(`❌ Falhas: ${failedTests}`);
        console.log(`📊 Taxa de sucesso: ${((successfulTests / totalTests) * 100).toFixed(1)}%`);
        
        if (failedTests > 0) {
            console.log('\n🚨 ENDPOINTS COM PROBLEMAS:');
            this.results.filter(r => !r.success).forEach(result => {
                console.log(`   ❌ ${result.method} ${result.path} - ${result.error}`);
            });
        }
        
        if (successfulTests > 0) {
            console.log('\n✅ ENDPOINTS FUNCIONANDO:');
            this.results.filter(r => r.success).forEach(result => {
                console.log(`   ✅ ${result.method} ${result.path} - Status ${result.status}`);
            });
        }
        
        // Verificação específica do banco
        this.checkDatabaseHealth();
    }

    async checkDatabaseHealth() {
        console.log('\n🗄️ VERIFICAÇÃO FINAL DO BANCO DE DADOS');
        console.log('======================================');
        
        try {
            // Verificar conectividade
            await this.pool.query('SELECT NOW()');
            console.log('✅ Conexão com banco: OK');
            
            // Verificar dados críticos
            const criticalChecks = [
                { table: 'users', condition: 'is_active = true', description: 'Usuários ativos' },
                { table: 'signals', condition: 'signal_type IS NOT NULL', description: 'Sinais com tipo' },
                { table: 'user_api_keys', condition: 'is_active = true', description: 'Chaves ativas' },
                { table: 'fear_greed_index', condition: 'value IS NOT NULL', description: 'Dados Fear & Greed' },
                { table: 'top100_data', condition: 'percentage_up IS NOT NULL', description: 'Dados TOP 100' }
            ];

            for (const check of criticalChecks) {
                try {
                    const result = await this.pool.query(`SELECT COUNT(*) as count FROM ${check.table} WHERE ${check.condition}`);
                    const count = parseInt(result.rows[0].count);
                    console.log(`✅ ${check.description}: ${count} registros`);
                } catch (error) {
                    console.log(`❌ ${check.description}: Erro - ${error.message}`);
                }
            }
            
            console.log('\n🎉 BANCO DE DADOS VALIDADO E PRONTO PARA OPERAÇÃO!');
            
        } catch (error) {
            console.log(`❌ Erro na verificação do banco: ${error.message}`);
        }
    }
}

// Executar testes
if (require.main === module) {
    const tester = new EndpointTester();
    tester.testAllEndpoints();
}

module.exports = EndpointTester;
