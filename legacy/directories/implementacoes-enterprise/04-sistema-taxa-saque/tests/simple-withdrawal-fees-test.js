/**
 * ===============================================
 * 🧪 TESTE SIMPLIFICADO DO SISTEMA DE TAXA DE SAQUE
 * ===============================================
 * CoinBitClub Market Bot - Database-Only Testing
 */

const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');

class SimpleWithdrawalFeesTest {
    constructor() {
        this.dbPool = new Pool({
            connectionString: process.env.DATABASE_URL || 'process.env.DATABASE_URL',
            ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
        });
        
        this.results = { passed: 0, failed: 0, errors: [] };
        
        // UUIDs válidos para teste
        this.testUsers = [
            {
                id: uuidv4(),
                name: 'Usuário BRL Rico',
                prepaid_credits: 1000.00,
                account_balance_usd: 0
            },
            {
                id: uuidv4(),
                name: 'Usuário USD Rico', 
                prepaid_credits: 0,
                account_balance_usd: 500.00
            }
        ];
    }
    
    log(message, type = 'info') {
        const symbols = { info: 'ℹ️', success: '✅', error: '❌' };
        console.log(`${symbols[type]} ${message}`);
    }
    
    assert(condition, message, details = null) {
        if (condition) {
            this.results.passed++;
            this.log(`PASSOU: ${message}`, 'success');
        } else {
            this.results.failed++;
            this.log(`FALHOU: ${message}`, 'error');
            this.results.errors.push(message);
            if (details) console.log('   Detalhes:', details);
        }
    }
    
    async testDatabaseStructure() {
        this.log('Testando estrutura do banco de dados...', 'info');
        
        try {
            // Verificar tabelas
            const tables = await this.dbPool.query(`
                SELECT table_name FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name IN ('withdrawal_fees_config', 'withdrawal_fees_charged')
            `);
            
            this.assert(
                tables.rows.length === 2,
                'Tabelas criadas corretamente'
            );
            
            // Verificar configurações
            const configs = await this.dbPool.query(`
                SELECT currency, fee_amount FROM withdrawal_fees_config WHERE active = true
            `);
            
            this.assert(
                configs.rows.length === 2,
                'Configurações de taxa ativas'
            );
            
            const brlConfig = configs.rows.find(r => r.currency === 'BRL');
            const usdConfig = configs.rows.find(r => r.currency === 'USD');
            
            this.assert(
                brlConfig && parseFloat(brlConfig.fee_amount) === 10.00,
                'Taxa BRL configurada corretamente (R$ 10,00)'
            );
            
            this.assert(
                usdConfig && parseFloat(usdConfig.fee_amount) === 2.00,
                'Taxa USD configurada corretamente ($ 2,00)'
            );
            
            // Verificar funções
            const functions = await this.dbPool.query(`
                SELECT routine_name FROM information_schema.routines 
                WHERE routine_schema = 'public' 
                AND routine_name LIKE '%withdrawal%fee%'
            `);
            
            this.assert(
                functions.rows.length >= 3,
                'Funções de negócio criadas'
            );
            
            return true;
            
        } catch (error) {
            this.assert(false, 'Erro ao verificar estrutura do banco', { error: error.message });
            return false;
        }
    }
    
    async testUserSetup() {
        this.log('Configurando usuários de teste...', 'info');
        
        try {
            for (const user of this.testUsers) {
                await this.dbPool.query(`
                    INSERT INTO users (
                        id, email, password_hash, first_name, last_name,
                        prepaid_credits, account_balance_usd, 
                        saldo_devedor_brl, saldo_devedor_usd
                    )
                    VALUES ($1, $2, $3, $4, $5, $6, $7, 0.00, 0.00)
                    ON CONFLICT (id) DO UPDATE SET
                        prepaid_credits = EXCLUDED.prepaid_credits,
                        account_balance_usd = EXCLUDED.account_balance_usd
                `, [
                    user.id, 
                    `test-${user.id}@marketbot.com`,
                    'test-hash',
                    user.name.split(' ')[0],
                    user.name.split(' ')[1] || 'Test',
                    user.prepaid_credits, 
                    user.account_balance_usd
                ]);
            }
            
            this.assert(true, 'Usuários de teste criados');
            return true;
            
        } catch (error) {
            this.assert(false, 'Erro ao criar usuários de teste', { error: error.message });
            return false;
        }
    }
    
    async testFeeCalculation() {
        this.log('Testando cálculo de taxas...', 'info');
        
        try {
            // Teste BRL
            const brlCalc = await this.dbPool.query(
                'SELECT calculate_withdrawal_fee($1, $2) as result',
                ['BRL', 100]
            );
            
            const brlResult = brlCalc.rows[0].result;
            
            this.assert(
                brlResult.success === true,
                'Cálculo BRL executado com sucesso'
            );
            
            this.assert(
                brlResult.fee_amount === 10,
                'Taxa BRL calculada corretamente (R$ 10,00)'
            );
            
            this.assert(
                brlResult.total_amount === 110,
                'Total BRL correto (R$ 110,00)'
            );
            
            // Teste USD
            const usdCalc = await this.dbPool.query(
                'SELECT calculate_withdrawal_fee($1, $2) as result',
                ['USD', 50]
            );
            
            const usdResult = usdCalc.rows[0].result;
            
            this.assert(
                usdResult.success === true,
                'Cálculo USD executado com sucesso'
            );
            
            this.assert(
                usdResult.fee_amount === 2,
                'Taxa USD calculada corretamente ($ 2,00)'
            );
            
            this.assert(
                usdResult.total_amount === 52,
                'Total USD correto ($ 52,00)'
            );
            
            return true;
            
        } catch (error) {
            this.assert(false, 'Erro no teste de cálculo', { error: error.message });
            return false;
        }
    }
    
    async testWithdrawalValidation() {
        this.log('Testando validação de saques...', 'info');
        
        try {
            const richUserBRL = this.testUsers[0]; // 1000 BRL
            const richUserUSD = this.testUsers[1]; // 500 USD
            
            // Teste: usuário com saldo suficiente BRL
            const validBRL = await this.dbPool.query(
                'SELECT validate_withdrawal_with_fee($1, $2, $3) as result',
                [richUserBRL.id, 'BRL', 100]
            );
            
            const brlValidation = validBRL.rows[0].result;
            
            this.assert(
                brlValidation.success === true,
                'Validação BRL executada'
            );
            
            this.assert(
                brlValidation.can_withdraw === true,
                'Usuário rico pode sacar BRL (saldo suficiente)'
            );
            
            // Teste: usuário com saldo suficiente USD
            const validUSD = await this.dbPool.query(
                'SELECT validate_withdrawal_with_fee($1, $2, $3) as result',
                [richUserUSD.id, 'USD', 100]
            );
            
            const usdValidation = validUSD.rows[0].result;
            
            this.assert(
                usdValidation.success === true,
                'Validação USD executada'
            );
            
            this.assert(
                usdValidation.can_withdraw === true,
                'Usuário rico pode sacar USD (saldo suficiente)'
            );
            
            // Teste: saque maior que saldo
            const invalidBRL = await this.dbPool.query(
                'SELECT validate_withdrawal_with_fee($1, $2, $3) as result',
                [richUserBRL.id, 'BRL', 2000] // 2000 + 10 > 1000
            );
            
            const invalidValidation = invalidBRL.rows[0].result;
            
            this.assert(
                invalidValidation.can_withdraw === false,
                'Saque maior que saldo rejeitado corretamente'
            );
            
            return true;
            
        } catch (error) {
            this.assert(false, 'Erro no teste de validação', { error: error.message });
            return false;
        }
    }
    
    async testWithdrawalProcessing() {
        this.log('Testando processamento de saque...', 'info');
        
        try {
            const testUser = this.testUsers[0];
            const withdrawalAmount = 50;
            const expectedFee = 10;
            const expectedTotal = 60;
            
            // Saldo inicial
            const initialBalance = await this.dbPool.query(
                'SELECT prepaid_credits FROM users WHERE id = $1',
                [testUser.id]
            );
            
            const initialCredits = parseFloat(initialBalance.rows[0].prepaid_credits);
            
            // Processar saque
            const processing = await this.dbPool.query(
                'SELECT process_withdrawal_with_fee($1, $2, $3, $4) as result',
                [testUser.id, 'BRL', withdrawalAmount, testUser.id] // usuário aprova próprio saque para teste
            );
            
            const processResult = processing.rows[0].result;
            
            this.assert(
                processResult.success === true,
                'Saque processado com sucesso'
            );
            
            this.assert(
                processResult.fee_charged === expectedFee,
                'Taxa cobrada corretamente'
            );
            
            // Verificar saldo após saque
            const finalBalance = await this.dbPool.query(
                'SELECT prepaid_credits FROM users WHERE id = $1',
                [testUser.id]
            );
            
            const finalCredits = parseFloat(finalBalance.rows[0].prepaid_credits);
            const expectedFinalBalance = initialCredits - expectedTotal;
            
            this.assert(
                Math.abs(finalCredits - expectedFinalBalance) < 0.01,
                'Saldo debitado corretamente'
            );
            
            // Verificar registro na tabela de taxas
            const feeRecord = await this.dbPool.query(
                'SELECT * FROM withdrawal_fees_charged WHERE user_id = $1 ORDER BY charged_at DESC LIMIT 1',
                [testUser.id]
            );
            
            this.assert(
                feeRecord.rows.length > 0,
                'Taxa registrada no histórico'
            );
            
            this.assert(
                parseFloat(feeRecord.rows[0].fee_amount) === expectedFee,
                'Valor da taxa registrado corretamente'
            );
            
            return true;
            
        } catch (error) {
            this.assert(false, 'Erro no teste de processamento', { error: error.message });
            return false;
        }
    }
    
    async testReportsViews() {
        this.log('Testando views de relatório...', 'info');
        
        try {
            // Testar view de dashboard
            const dashboard = await this.dbPool.query('SELECT * FROM dashboard_withdrawal_fees LIMIT 5');
            
            this.assert(
                dashboard.rows.length >= 0, // Pode estar vazio, mas deve executar
                'View dashboard_withdrawal_fees funcional'
            );
            
            // Testar view de receita
            const revenue = await this.dbPool.query('SELECT * FROM withdrawal_fees_revenue_report LIMIT 5');
            
            this.assert(
                revenue.rows.length >= 0, // Pode estar vazio, mas deve executar
                'View withdrawal_fees_revenue_report funcional'
            );
            
            return true;
            
        } catch (error) {
            this.assert(false, 'Erro no teste de relatórios', { error: error.message });
            return false;
        }
    }
    
    async cleanup() {
        this.log('Limpando dados de teste...', 'info');
        
        try {
            // Remover registros de teste
            await this.dbPool.query(
                'DELETE FROM withdrawal_fees_charged WHERE user_id = ANY($1)',
                [this.testUsers.map(u => u.id)]
            );
            
            // Remover usuários de teste
            await this.dbPool.query(
                'DELETE FROM users WHERE id = ANY($1)',
                [this.testUsers.map(u => u.id)]
            );
            
            this.log('Cleanup concluído', 'success');
            
        } catch (error) {
            this.log(`Erro no cleanup: ${error.message}`, 'error');
        }
    }
    
    async runAllTests() {
        console.log('\n' + '='.repeat(60));
        console.log('🧪 TESTE SIMPLIFICADO - SISTEMA DE TAXA DE SAQUE');
        console.log('='.repeat(60));
        
        const startTime = new Date();
        
        try {
            await this.testDatabaseStructure();
            await this.testUserSetup();
            await this.testFeeCalculation();
            await this.testWithdrawalValidation();
            await this.testWithdrawalProcessing();
            await this.testReportsViews();
            
        } catch (error) {
            console.error('Erro crítico:', error);
        }
        
        const endTime = new Date();
        const duration = (endTime - startTime) / 1000;
        
        console.log('\n' + '='.repeat(60));
        console.log('📋 RELATÓRIO FINAL');
        console.log('='.repeat(60));
        console.log(`⏱️  Duração: ${duration}s`);
        console.log(`✅ Testes que passaram: ${this.results.passed}`);
        console.log(`❌ Testes que falharam: ${this.results.failed}`);
        
        const total = this.results.passed + this.results.failed;
        const successRate = total > 0 ? ((this.results.passed / total) * 100).toFixed(1) : 0;
        console.log(`📊 Taxa de sucesso: ${successRate}%`);
        
        if (this.results.failed > 0) {
            console.log('\n❌ ERROS:');
            this.results.errors.forEach((error, index) => {
                console.log(`   ${index + 1}. ${error}`);
            });
        }
        
        const success = this.results.failed === 0;
        console.log('\n' + '='.repeat(60));
        if (success) {
            console.log('🎉 TODOS OS TESTES PASSARAM - SISTEMA FUNCIONAL!');
        } else {
            console.log('⚠️  ALGUNS TESTES FALHARAM');
        }
        console.log('='.repeat(60));
        
        await this.cleanup();
        return success;
    }
}

// Execução
if (require.main === module) {
    (async () => {
        const test = new SimpleWithdrawalFeesTest();
        
        try {
            const success = await test.runAllTests();
            process.exit(success ? 0 : 1);
        } catch (error) {
            console.error('❌ Erro crítico:', error);
            process.exit(1);
        }
    })();
}

module.exports = SimpleWithdrawalFeesTest;
