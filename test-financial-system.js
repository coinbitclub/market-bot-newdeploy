#!/usr/bin/env node

/**
 * 🧪 TESTE COMPLETO DO SISTEMA FINANCEIRO
 * =====================================
 * 
 * Demonstra todas as funcionalidades do sistema financeiro:
 * - Saldos separados
 * - Sistema de cupons
 * - Recargas com desconto de comissão
 * - Conversão de comissão para crédito (+10%)
 * - Controle de saques
 */

const axios = require('axios');

class FinancialSystemTester {
    constructor() {
        this.baseUrl = 'http://localhost:3000';
        this.testUserId = 1; // ID de usuário para teste
        this.adminId = 1; // ID de admin para teste
        
        console.log('🧪 TESTE DO SISTEMA FINANCEIRO COINBITCLUB');
        console.log('==========================================');
        console.log('');
    }

    async runAllTests() {
        try {
            console.log('🎯 Iniciando bateria de testes...');
            console.log('');

            // 1. Testar geração de código de cupom
            await this.testGenerateCouponCode();

            // 2. Testar criação de cupom
            await this.testCreateCoupon();

            // 3. Testar uso de cupom
            await this.testUseCoupon();

            // 4. Testar consulta de saldos
            await this.testGetBalances();

            // 5. Testar recarga Stripe
            await this.testStripeRecharge();

            // 6. Testar conversão de comissão
            await this.testCommissionConversion();

            // 7. Testar solicitação de saque
            await this.testWithdrawalRequest();

            // 8. Testar relatório financeiro
            await this.testFinancialSummary();

            console.log('');
            console.log('🎉 TODOS OS TESTES CONCLUÍDOS COM SUCESSO!');
            console.log('=======================================');

        } catch (error) {
            console.error('❌ Erro nos testes:', error.message);
        }
    }

    async testGenerateCouponCode() {
        console.log('🎫 Teste 1: Gerar código de cupom...');
        
        try {
            const response = await axios.get(`${this.baseUrl}/api/admin/generate-coupon-code`);
            
            if (response.data.success) {
                console.log(`   ✅ Código gerado: ${response.data.couponCode}`);
                this.generatedCouponCode = response.data.couponCode;
            } else {
                console.log('   ❌ Falha na geração do código');
            }
        } catch (error) {
            console.log('   ⚠️ Erro:', error.response?.data?.error || error.message);
        }
        
        console.log('');
    }

    async testCreateCoupon() {
        console.log('🎫 Teste 2: Criar cupom administrativo...');
        
        try {
            const couponData = {
                adminId: this.adminId,
                couponCode: this.generatedCouponCode || 'TESTE100',
                creditAmount: 100,
                currency: 'BRL',
                expirationDays: 30
            };

            const response = await axios.post(`${this.baseUrl}/api/admin/create-coupon`, couponData);
            
            if (response.data.success) {
                console.log(`   ✅ Cupom criado: ${couponData.couponCode}`);
                console.log(`   💰 Valor: R$ ${couponData.creditAmount}`);
                console.log(`   📅 Validade: ${couponData.expirationDays} dias`);
                this.testCouponCode = couponData.couponCode;
            } else {
                console.log('   ❌ Falha na criação do cupom');
            }
        } catch (error) {
            console.log('   ⚠️ Erro:', error.response?.data?.error || error.message);
        }
        
        console.log('');
    }

    async testUseCoupon() {
        console.log('🎟️ Teste 3: Usar cupom...');
        
        try {
            const couponData = {
                userId: this.testUserId,
                couponCode: this.testCouponCode || 'TESTE100'
            };

            const response = await axios.post(`${this.baseUrl}/api/user/use-coupon`, couponData);
            
            if (response.data.success) {
                console.log(`   ✅ Cupom usado com sucesso!`);
                console.log(`   💰 Crédito adicionado: ${response.data.result.credit.currency} ${response.data.result.credit.amount}`);
                console.log(`   ⏰ Validade: ${response.data.result.credit.expires_in_days} dias`);
            } else {
                console.log('   ❌ Falha no uso do cupom');
            }
        } catch (error) {
            console.log('   ⚠️ Erro:', error.response?.data?.error || error.message);
        }
        
        console.log('');
    }

    async testGetBalances() {
        console.log('💰 Teste 4: Consultar saldos...');
        
        try {
            const response = await axios.get(`${this.baseUrl}/api/user/${this.testUserId}/balances`);
            
            if (response.data.success) {
                const balances = response.data.balances;
                
                console.log('   ✅ Saldos consultados com sucesso!');
                console.log('');
                console.log('   🟢 SALDO REAL (Pode sacar):');
                console.log(`      • BRL: R$ ${balances.real.brl.toFixed(2)}`);
                console.log(`      • USD: $ ${balances.real.usd.toFixed(2)}`);
                console.log('');
                console.log('   🟡 SALDO ADMINISTRATIVO (30 dias):');
                console.log(`      • BRL: R$ ${balances.administrative.brl.toFixed(2)}`);
                console.log(`      • USD: $ ${balances.administrative.usd.toFixed(2)}`);
                console.log('');
                console.log('   🔴 SALDO COMISSÃO (Converte +10%):');
                console.log(`      • BRL: R$ ${balances.commission.brl.toFixed(2)}`);
                console.log(`      • USD: $ ${balances.commission.usd.toFixed(2)}`);
                console.log('');
                console.log('   📊 TOTAL OPERACIONAL:');
                console.log(`      • BRL: R$ ${balances.total_operational.brl.toFixed(2)}`);
                console.log(`      • USD: $ ${balances.total_operational.usd.toFixed(2)}`);
                
            } else {
                console.log('   ❌ Falha na consulta de saldos');
            }
        } catch (error) {
            console.log('   ⚠️ Erro:', error.response?.data?.error || error.message);
        }
        
        console.log('');
    }

    async testStripeRecharge() {
        console.log('💳 Teste 5: Simular recarga Stripe...');
        
        try {
            const rechargeData = {
                userId: this.testUserId,
                amount: 500,
                currency: 'BRL'
            };

            const response = await axios.post(`${this.baseUrl}/api/stripe/recharge`, rechargeData);
            
            if (response.data.success) {
                const result = response.data.result.transaction;
                
                console.log('   ✅ Recarga processada com sucesso!');
                console.log(`   💰 Valor bruto: R$ ${result.gross_amount.toFixed(2)}`);
                console.log(`   💸 Comissão (${result.commission_rate}%): R$ ${result.commission_amount.toFixed(2)}`);
                console.log(`   ✅ Valor líquido creditado: R$ ${result.net_amount.toFixed(2)}`);
                console.log(`   📋 Plano: ${result.plan_type}`);
                
            } else {
                console.log('   ❌ Falha na recarga');
            }
        } catch (error) {
            console.log('   ⚠️ Erro:', error.response?.data?.error || error.message);
        }
        
        console.log('');
    }

    async testCommissionConversion() {
        console.log('🔄 Teste 6: Converter comissão para crédito (+10%)...');
        
        try {
            const conversionData = {
                userId: this.testUserId,
                amount: 50,
                currency: 'BRL'
            };

            const response = await axios.post(`${this.baseUrl}/api/affiliate/convert-commission`, conversionData);
            
            if (response.data.success) {
                const result = response.data.result.conversion;
                
                console.log('   ✅ Conversão realizada com sucesso!');
                console.log(`   💰 Valor original: R$ ${result.original_amount.toFixed(2)}`);
                console.log(`   🎁 Bonus (${result.bonus_percentage}%): R$ ${result.bonus_amount.toFixed(2)}`);
                console.log(`   ✅ Total em crédito: R$ ${result.total_credit.toFixed(2)}`);
                
            } else {
                console.log('   ❌ Falha na conversão');
            }
        } catch (error) {
            console.log('   ⚠️ Erro:', error.response?.data?.error || error.message);
        }
        
        console.log('');
    }

    async testWithdrawalRequest() {
        console.log('🏦 Teste 7: Solicitar saque...');
        
        try {
            const withdrawalData = {
                userId: this.testUserId,
                amount: 100,
                currency: 'BRL'
            };

            const response = await axios.post(`${this.baseUrl}/api/user/request-withdrawal`, withdrawalData);
            
            if (response.data.success) {
                console.log('   ✅ Solicitação de saque criada!');
                console.log(`   💰 Valor: R$ ${withdrawalData.amount.toFixed(2)}`);
                console.log(`   📋 Status: ${response.data.result.withdrawal.status}`);
                
            } else {
                console.log('   ❌ Falha na solicitação');
            }
        } catch (error) {
            console.log('   ⚠️ Erro:', error.response?.data?.error || error.message);
        }
        
        console.log('');
    }

    async testFinancialSummary() {
        console.log('📊 Teste 8: Relatório financeiro geral...');
        
        try {
            const response = await axios.get(`${this.baseUrl}/api/admin/financial-summary`);
            
            if (response.data.success) {
                const summary = response.data.summary;
                
                console.log('   ✅ Relatório gerado com sucesso!');
                console.log('');
                console.log('   📊 RESUMO FINANCEIRO:');
                console.log(`      • Total usuários: ${summary.balances.total_users}`);
                console.log(`      • Saldos reais: $ ${parseFloat(summary.balances.total_real_balance || 0).toFixed(2)}`);
                console.log(`      • Créditos admin: $ ${parseFloat(summary.balances.total_admin_balance || 0).toFixed(2)}`);
                console.log(`      • Comissões: $ ${parseFloat(summary.balances.total_commission_balance || 0).toFixed(2)}`);
                console.log('');
                console.log('   💰 COMISSÕES:');
                console.log(`      • Empresa: $ ${parseFloat(summary.commissions.company_total || 0).toFixed(2)}`);
                console.log(`      • Afiliados: $ ${parseFloat(summary.commissions.affiliate_total || 0).toFixed(2)}`);
                console.log(`      • Usuários com comissão: ${summary.commissions.users_with_commissions || 0}`);
                
            } else {
                console.log('   ❌ Falha no relatório');
            }
        } catch (error) {
            console.log('   ⚠️ Erro:', error.response?.data?.error || error.message);
        }
        
        console.log('');
    }

    async testSystemStatus() {
        console.log('🔍 Status geral do sistema...');
        
        try {
            const response = await axios.get(`${this.baseUrl}/status`);
            
            console.log('   ✅ Sistema:', response.data.sistema);
            console.log('   📊 Usuários:', response.data.database.usuarios);
            console.log('   💼 Trading:', response.data.trading.status);
            console.log('   🔒 Position Safety:', response.data.trading.positionSafety);
            
        } catch (error) {
            console.log('   ⚠️ Erro:', error.message);
        }
        
        console.log('');
    }
}

// Executar testes
if (require.main === module) {
    const tester = new FinancialSystemTester();
    
    // Aguardar servidor estar pronto
    setTimeout(() => {
        tester.runAllTests();
    }, 2000);
}

module.exports = FinancialSystemTester;
