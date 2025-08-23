#!/usr/bin/env node

/**
 * 🧪 TESTE COMPLETO DO SISTEMA DE TRATAMENTO DE ERROS
 * ===============================================
 * 
 * Testa automaticamente:
 * - ❌ Database Constraint Error - Chaves duplicadas
 * - ❌ API Key Format Invalid - Chaves malformadas
 */

require('dotenv').config();
const { Pool } = require('pg');
const ErrorHandlingSystem = require('./error-handling-system.js');

class ErrorHandlingTester {
    constructor() {
        this.pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
        });
        
        this.errorHandler = new ErrorHandlingSystem(this.pool, console);
        this.testResults = {
            constraint_tests: [],
            api_key_tests: [],
            total_passed: 0,
            total_failed: 0
        };
    }

    async runAllTests() {
        console.log('🧪 INICIANDO TESTES DO SISTEMA DE TRATAMENTO DE ERROS\n');
        console.log('=' .repeat(60));

        try {
            // 1. Testes de Database Constraints
            await this.testDatabaseConstraints();
            
            // 2. Testes de API Key Format
            await this.testAPIKeyFormats();
            
            // 3. Relatório final
            this.generateReport();

        } catch (error) {
            console.error('💥 Erro durante execução dos testes:', error);
        } finally {
            await this.pool.end();
        }
    }

    async testDatabaseConstraints() {
        console.log('\n1️⃣ TESTANDO DATABASE CONSTRAINT ERRORS');
        console.log('-'.repeat(50));

        // Test 1: Balances duplicados
        await this.testBalancesDuplicate();
        
        // Test 2: Positions duplicadas  
        await this.testPositionsDuplicate();
        
        // Test 3: Users duplicados
        await this.testUsersDuplicate();
    }

    async testBalancesDuplicate() {
        console.log('\n🔍 Teste 1: Balances Duplicados');
        
        try {
            // Limpar dados de teste anteriores
            await this.pool.query(`DELETE FROM balances WHERE user_id = 999`);
            
            const testData = {
                user_id: 999,
                asset: 'TEST_BTCUSDT',
                account_type: 'spot',
                balance: 1.5
            };

            // Inserir primeiro registro
            await this.pool.query(`
                INSERT INTO balances (user_id, asset, account_type, balance, updated_at)
                VALUES ($1, $2, $3, $4, NOW())
            `, [testData.user_id, testData.asset, testData.account_type, testData.balance]);

            console.log('   ✅ Primeiro registro inserido');

            try {
                // Tentar inserir duplicata (deve falhar)
                await this.pool.query(`
                    INSERT INTO balances (user_id, asset, account_type, balance, updated_at)
                    VALUES ($1, $2, $3, $4, NOW())
                `, [testData.user_id, testData.asset, testData.account_type, testData.balance + 0.1]);

                console.log('   ❌ FALHA: Duplicata foi inserida sem erro');
                this.testResults.constraint_tests.push({
                    test: 'Balances Duplicate',
                    result: 'FAILED',
                    reason: 'Constraint not working - duplicate inserted'
                });

            } catch (constraintError) {
                console.log('   🚨 Constraint error capturado:', constraintError.code);
                
                // Testar sistema de tratamento
                const handlingResult = await this.errorHandler.handleConstraintError(constraintError, testData);
                
                if (handlingResult.success) {
                    console.log('   ✅ Erro tratado automaticamente:', handlingResult.action);
                    this.testResults.constraint_tests.push({
                        test: 'Balances Duplicate',
                        result: 'PASSED',
                        handling: handlingResult
                    });
                    this.testResults.total_passed++;
                } else {
                    console.log('   ❌ Erro não foi tratado:', handlingResult.error);
                    this.testResults.constraint_tests.push({
                        test: 'Balances Duplicate',
                        result: 'FAILED',
                        reason: handlingResult.error
                    });
                    this.testResults.total_failed++;
                }
            }

            // Limpar dados de teste
            await this.pool.query(`DELETE FROM balances WHERE user_id = 999`);

        } catch (error) {
            console.log('   ❌ Erro durante teste:', error.message);
            this.testResults.constraint_tests.push({
                test: 'Balances Duplicate',
                result: 'ERROR',
                error: error.message
            });
            this.testResults.total_failed++;
        }
    }

    async testPositionsDuplicate() {
        console.log('\n🔍 Teste 2: Positions Duplicadas');
        
        try {
            // Verificar se tabela positions existe
            const tableCheck = await this.pool.query(`
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_name = 'positions'
                )
            `);

            if (!tableCheck.rows[0].exists) {
                console.log('   ⚠️ Tabela positions não existe - criando mock test');
                this.testResults.constraint_tests.push({
                    test: 'Positions Duplicate',
                    result: 'SKIPPED',
                    reason: 'Table does not exist'
                });
                return;
            }

            const testData = {
                user_id: 999,
                symbol: 'TEST_BTCUSDT'
            };

            // Simular erro de constraint
            const mockError = new Error('duplicate key value violates unique constraint');
            mockError.code = '23505';
            
            const handlingResult = await this.errorHandler.handleConstraintError(mockError, testData);
            
            console.log('   ✅ Sistema de tratamento testado:', handlingResult.success ? 'PASSOU' : 'FALHOU');
            
            this.testResults.constraint_tests.push({
                test: 'Positions Duplicate',
                result: handlingResult.success ? 'PASSED' : 'FAILED',
                handling: handlingResult
            });

            if (handlingResult.success) this.testResults.total_passed++;
            else this.testResults.total_failed++;

        } catch (error) {
            console.log('   ❌ Erro durante teste:', error.message);
            this.testResults.constraint_tests.push({
                test: 'Positions Duplicate',
                result: 'ERROR',
                error: error.message
            });
            this.testResults.total_failed++;
        }
    }

    async testUsersDuplicate() {
        console.log('\n🔍 Teste 3: Users Duplicados');
        
        try {
            // Simular erro de constraint de usuário
            const mockError = new Error('duplicate key value violates unique constraint "users_email_key"');
            mockError.code = '23505';
            
            const testData = {
                email: 'test@coinbitclub.com',
                username: 'testuser999'
            };

            const handlingResult = await this.errorHandler.handleConstraintError(mockError, testData);
            
            console.log('   ✅ Sistema de tratamento testado:', handlingResult.success ? 'PASSOU' : 'FALHOU');
            
            this.testResults.constraint_tests.push({
                test: 'Users Duplicate',
                result: handlingResult.success ? 'PASSED' : 'FAILED',
                handling: handlingResult
            });

            if (handlingResult.success) this.testResults.total_passed++;
            else this.testResults.total_failed++;

        } catch (error) {
            console.log('   ❌ Erro durante teste:', error.message);
            this.testResults.constraint_tests.push({
                test: 'Users Duplicate',
                result: 'ERROR',
                error: error.message
            });
            this.testResults.total_failed++;
        }
    }

    async testAPIKeyFormats() {
        console.log('\n2️⃣ TESTANDO API KEY FORMAT ERRORS');
        console.log('-'.repeat(50));

        const testCases = [
            {
                name: 'Binance - Key Too Short',
                exchange: 'binance',
                api_key: YOUR_API_KEY_HERE,
                api_secret: 'also_too_short',
                expected: 'FAILED'
            },
            {
                name: 'Binance - Valid Format',
                exchange: 'binance', 
                api_key: YOUR_API_KEY_HERE.repeat(64), // 64 caracteres válidos
                api_secret: 'B'.repeat(64),
                expected: 'PASSED'
            },
            {
                name: 'Bybit - Invalid Characters',
                exchange: 'bybit',
                api_key: YOUR_API_KEY_HERE,
                api_secret: 'invalid@secret#symbols',
                expected: 'FAILED'
            },
            {
                name: 'Bybit - Valid Format',
                exchange: 'bybit',
                api_key: YOUR_API_KEY_HERE,
                api_secret: 'validsecret456789012345678901234567890',
                expected: 'PASSED'
            },
            {
                name: 'Empty Keys',
                exchange: 'binance',
                api_key: 'YOUR_API_KEY_HERE',
                expected: 'FAILED'
            }
        ];

        for (const testCase of testCases) {
            console.log(`\n🔍 ${testCase.name}`);
            
            try {
                // Simular erro de API key
                const mockError = new Error(`API key format invalid for ${testCase.exchange}`);
                
                const handlingResult = await this.errorHandler.handleAPIKeyError(mockError, {
                    user_id: 999,
                    exchange: testCase.exchange,
                    api_key: testCase.api_key,
                    api_secret: testCase.api_secret
                });

                const passed = (testCase.expected === 'PASSED') ? handlingResult.success : !handlingResult.success;
                
                console.log(`   ${passed ? '✅' : '❌'} Resultado: ${handlingResult.success ? 'VALID' : 'INVALID'}`);
                if (!handlingResult.success && handlingResult.reason) {
                    console.log(`   📝 Razão: ${handlingResult.reason}`);
                }

                this.testResults.api_key_tests.push({
                    test: testCase.name,
                    result: passed ? 'PASSED' : 'FAILED',
                    expected: testCase.expected,
                    actual: handlingResult.success ? 'VALID' : 'INVALID',
                    handling: handlingResult
                });

                if (passed) this.testResults.total_passed++;
                else this.testResults.total_failed++;

            } catch (error) {
                console.log(`   ❌ Erro durante teste: ${error.message}`);
                this.testResults.api_key_tests.push({
                    test: testCase.name,
                    result: 'ERROR',
                    error: error.message
                });
                this.testResults.total_failed++;
            }
        }
    }

    generateReport() {
        console.log('\n📊 RELATÓRIO FINAL DOS TESTES');
        console.log('=' .repeat(60));
        
        const total = this.testResults.total_passed + this.testResults.total_failed;
        const successRate = total > 0 ? ((this.testResults.total_passed / total) * 100).toFixed(1) : 0;

        console.log(`\n🎯 RESULTADO GERAL:`);
        console.log(`   ✅ Testes Passou: ${this.testResults.total_passed}`);
        console.log(`   ❌ Testes Falhou: ${this.testResults.total_failed}`);
        console.log(`   📈 Taxa de Sucesso: ${successRate}%`);

        console.log(`\n🔧 CONSTRAINT TESTS:`);
        this.testResults.constraint_tests.forEach(test => {
            const icon = test.result === 'PASSED' ? '✅' : test.result === 'SKIPPED' ? '⚠️' : '❌';
            console.log(`   ${icon} ${test.test}: ${test.result}`);
        });

        console.log(`\n🔑 API KEY TESTS:`);
        this.testResults.api_key_tests.forEach(test => {
            const icon = test.result === 'PASSED' ? '✅' : '❌';
            console.log(`   ${icon} ${test.test}: ${test.result}`);
        });

        console.log(`\n📈 ESTATÍSTICAS DO SISTEMA:`);
        const stats = this.errorHandler.getErrorStats();
        console.log(`   🚨 Constraint Violations: ${stats.constraint_violations}`);
        console.log(`   🔑 Invalid API Keys: ${stats.invalid_api_keys}`);
        console.log(`   🔧 Total Handled: ${stats.total_handled}`);

        console.log('\n' + '=' .repeat(60));
        
        if (successRate >= 80) {
            console.log('🎉 SISTEMA DE TRATAMENTO DE ERROS FUNCIONANDO CORRETAMENTE!');
        } else {
            console.log('⚠️ SISTEMA PRECISA DE AJUSTES - TAXA DE SUCESSO BAIXA');
        }
    }
}

// Executar testes se chamado diretamente
if (require.main === module) {
    const tester = new ErrorHandlingTester();
    tester.runAllTests();
}

module.exports = ErrorHandlingTester;
