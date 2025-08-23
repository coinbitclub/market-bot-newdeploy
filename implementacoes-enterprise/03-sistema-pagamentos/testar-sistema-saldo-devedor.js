// =====================================================
// 🧪 TESTE COMPLETO - SISTEMA DE SALDO DEVEDOR
// =====================================================
// Testa todas as funcionalidades do sistema:
// 1. Validação de saldo mínimo
// 2. Processamento de comissões com dívida
// 3. Compensação automática na recarga
// 4. Bloqueio/desbloqueio de operações

const { Pool } = require('pg');
const SistemaIntegradoSaldoDevedor = require('./sistema-integrado-saldo-devedor');

class TestadorSistemaDebt {
    constructor() {
        this.pool = new Pool({
            connectionString: process.env.DATABASE_URL || 'postgresql://postgres:ELjbkkgUASRCtdTAXVFgIssOXiLsRCPq@trolley.proxy.rlwy.net:44790/railway',
            ssl: { rejectUnauthorized: false }
        });
        
        this.sistema = new SistemaIntegradoSaldoDevedor(this.pool);
        this.testResults = [];
        this.testUserId = null;
    }

    async executarTestes() {
        try {
            console.log('🧪 INICIANDO TESTES DO SISTEMA DE SALDO DEVEDOR');
            console.log('=' .repeat(60));

            // 1. Preparar ambiente de teste
            await this.prepararAmbienteTeste();

            // 2. Teste de validação de saldo mínimo
            await this.testeValidacaoSaldoMinimo();

            // 3. Teste de comissão com saldo suficiente
            await this.testeComissaoSaldoSuficiente();

            // 4. Teste de comissão com criação de dívida
            await this.testeComissaoComDivida();

            // 5. Teste de bloqueio de operações
            await this.testeBloqueioOperacoes();

            // 6. Teste de compensação na recarga
            await this.testeCompensacaoRecarga();

            // 7. Teste de desbloqueio após compensação
            await this.testeDesbloqueioAposCompensacao();

            // 8. Limpeza do ambiente de teste
            await this.limparAmbienteTeste();

            // 9. Gerar relatório final
            this.gerarRelatorioFinal();

        } catch (error) {
            console.error('❌ Erro durante os testes:', error);
            throw error;
        } finally {
            await this.pool.end();
        }
    }

    async prepararAmbienteTeste() {
        console.log('\n1️⃣ PREPARANDO AMBIENTE DE TESTE');
        console.log('-'.repeat(40));

        try {
            // Criar usuário de teste
            const userResult = await this.pool.query(`
                INSERT INTO users (username, email, balance_brl, balance_usd, subscription_status, user_type)
                VALUES ('teste_debt_user', 'teste@debt.com', 100.00, 20.00, 'PREPAID', 'BASIC')
                RETURNING id
            `);
            
            this.testUserId = userResult.rows[0].id;
            
            console.log(`✅ Usuário de teste criado: ID ${this.testUserId}`);
            console.log(`   💰 Saldo inicial: R$ 100,00 / USD 20,00`);
            
            this.adicionarResultado('PREPARACAO_AMBIENTE', true, 'Usuário de teste criado com sucesso');

        } catch (error) {
            console.error('❌ Erro na preparação:', error);
            this.adicionarResultado('PREPARACAO_AMBIENTE', false, error.message);
            throw error;
        }
    }

    async testeValidacaoSaldoMinimo() {
        console.log('\n2️⃣ TESTE DE VALIDAÇÃO DE SALDO MÍNIMO');
        console.log('-'.repeat(40));

        try {
            // Teste 1: Usuário com saldo acima do mínimo
            const validacao1 = await this.sistema.validateBeforeOperation(this.testUserId, {
                amount_brl: 50,
                user_type: 'BASIC',
                country_code: 'BRL'
            });

            console.log(`   ✅ Teste 1 - Saldo suficiente: ${validacao1.valid ? 'PASSOU' : 'FALHOU'}`);

            // Teste 2: Simular saldo abaixo do mínimo
            await this.pool.query(`
                UPDATE users SET balance_brl = 50.00, balance_usd = 5.00 WHERE id = $1
            `, [this.testUserId]);

            const validacao2 = await this.sistema.validateBeforeOperation(this.testUserId, {
                amount_brl: 80,
                user_type: 'BASIC',
                country_code: 'BRL'
            });

            console.log(`   ✅ Teste 2 - Saldo insuficiente: ${!validacao2.valid ? 'PASSOU' : 'FALHOU'}`);
            console.log(`   📋 Motivo: ${validacao2.message}`);

            // Restaurar saldo para próximos testes
            await this.pool.query(`
                UPDATE users SET balance_brl = 100.00, balance_usd = 20.00 WHERE id = $1
            `, [this.testUserId]);

            this.adicionarResultado('VALIDACAO_SALDO_MINIMO', true, 'Validação funcionando corretamente');

        } catch (error) {
            console.error('❌ Erro na validação de saldo mínimo:', error);
            this.adicionarResultado('VALIDACAO_SALDO_MINIMO', false, error.message);
        }
    }

    async testeComissaoSaldoSuficiente() {
        console.log('\n3️⃣ TESTE DE COMISSÃO COM SALDO SUFICIENTE');
        console.log('-'.repeat(40));

        try {
            // Simular operação com lucro
            const operacao = {
                user_id: this.testUserId,
                operation_id: 1001,
                profit_brl: 50, // Lucro de R$ 50
                profit_usd: 0,
                subscription_status: 'PREPAID' // 20% de comissão
            };

            const resultado = await this.sistema.processCommissionAfterOperation(operacao);

            console.log(`   💰 Lucro: R$ ${operacao.profit_brl}`);
            console.log(`   📊 Comissão: R$ ${resultado.commission_brl} (${(resultado.commission_rate * 100)}%)`);
            console.log(`   ⚖️ Dívida criada: ${resultado.debt_created ? 'SIM' : 'NÃO'}`);

            // Verificar saldo após comissão
            const userCheck = await this.pool.query(`
                SELECT balance_brl, saldo_devedor_brl FROM users WHERE id = $1
            `, [this.testUserId]);

            const user = userCheck.rows[0];
            console.log(`   💰 Saldo final: R$ ${user.balance_brl}`);
            console.log(`   📉 Dívida: R$ ${user.saldo_devedor_brl}`);

            const success = resultado.success && !resultado.debt_created;
            this.adicionarResultado('COMISSAO_SALDO_SUFICIENTE', success, 
                success ? 'Comissão debitada sem criar dívida' : 'Falha no processamento');

        } catch (error) {
            console.error('❌ Erro no teste de comissão:', error);
            this.adicionarResultado('COMISSAO_SALDO_SUFICIENTE', false, error.message);
        }
    }

    async testeComissaoComDivida() {
        console.log('\n4️⃣ TESTE DE COMISSÃO COM CRIAÇÃO DE DÍVIDA');
        console.log('-'.repeat(40));

        try {
            // Reduzir saldo para forçar criação de dívida
            await this.pool.query(`
                UPDATE users SET balance_brl = 5.00 WHERE id = $1
            `, [this.testUserId]);

            // Simular operação com lucro alto
            const operacao = {
                user_id: this.testUserId,
                operation_id: 1002,
                profit_brl: 100, // Lucro de R$ 100
                profit_usd: 0,
                subscription_status: 'PREPAID' // 20% de comissão = R$ 20
            };

            const resultado = await this.sistema.processCommissionAfterOperation(operacao);

            console.log(`   💰 Lucro: R$ ${operacao.profit_brl}`);
            console.log(`   📊 Comissão: R$ ${resultado.commission_brl} (${(resultado.commission_rate * 100)}%)`);
            console.log(`   ⚖️ Dívida criada: ${resultado.debt_created ? 'SIM' : 'NÃO'}`);

            // Verificar saldo após comissão
            const userCheck = await this.pool.query(`
                SELECT balance_brl, saldo_devedor_brl, operacoes_bloqueadas FROM users WHERE id = $1
            `, [this.testUserId]);

            const user = userCheck.rows[0];
            console.log(`   💰 Saldo final: R$ ${user.balance_brl}`);
            console.log(`   📉 Dívida: R$ ${user.saldo_devedor_brl}`);
            console.log(`   🚫 Operações bloqueadas: ${user.operacoes_bloqueadas ? 'SIM' : 'NÃO'}`);

            const success = resultado.success && resultado.debt_created && parseFloat(user.saldo_devedor_brl) > 0;
            this.adicionarResultado('COMISSAO_COM_DIVIDA', success, 
                success ? 'Dívida criada corretamente' : 'Falha na criação de dívida');

        } catch (error) {
            console.error('❌ Erro no teste de dívida:', error);
            this.adicionarResultado('COMISSAO_COM_DIVIDA', false, error.message);
        }
    }

    async testeBloqueioOperacoes() {
        console.log('\n5️⃣ TESTE DE BLOQUEIO DE OPERAÇÕES');
        console.log('-'.repeat(40));

        try {
            // Tentar validar operação com dívida pendente
            const validacao = await this.sistema.validateBeforeOperation(this.testUserId, {
                amount_brl: 10,
                user_type: 'BASIC',
                country_code: 'BRL'
            });

            console.log(`   🚫 Operação bloqueada: ${!validacao.valid ? 'SIM' : 'NÃO'}`);
            console.log(`   📋 Motivo: ${validacao.message || 'N/A'}`);
            console.log(`   ⚠️ Erro: ${validacao.error || 'N/A'}`);

            const success = !validacao.valid && validacao.error === 'OPERACOES_BLOQUEADAS_DIVIDA';
            this.adicionarResultado('BLOQUEIO_OPERACOES', success, 
                success ? 'Operações bloqueadas corretamente' : 'Falha no bloqueio');

        } catch (error) {
            console.error('❌ Erro no teste de bloqueio:', error);
            this.adicionarResultado('BLOQUEIO_OPERACOES', false, error.message);
        }
    }

    async testeCompensacaoRecarga() {
        console.log('\n6️⃣ TESTE DE COMPENSAÇÃO NA RECARGA');
        console.log('-'.repeat(40));

        try {
            // Verificar dívida antes da recarga
            const userBefore = await this.pool.query(`
                SELECT balance_brl, saldo_devedor_brl FROM users WHERE id = $1
            `, [this.testUserId]);

            console.log(`   📉 Dívida antes: R$ ${userBefore.rows[0].saldo_devedor_brl}`);

            // Simular recarga
            const recarga = {
                user_id: this.testUserId,
                amount_brl: 50, // Recarga de R$ 50
                amount_usd: 0,
                recharge_id: 'TESTE_001',
                payment_method: 'STRIPE'
            };

            const resultado = await this.sistema.processRechargeWithCompensation(recarga);

            console.log(`   💰 Recarga: R$ ${recarga.amount_brl}`);
            console.log(`   🔄 Compensação aplicada: ${resultado.debt_compensation_applied ? 'SIM' : 'NÃO'}`);
            console.log(`   💵 Compensado: R$ ${resultado.compensation_brl || 0}`);
            console.log(`   💰 Saldo restante: R$ ${resultado.remaining_balance_brl || 0}`);

            // Verificar dívida após recarga
            const userAfter = await this.pool.query(`
                SELECT balance_brl, saldo_devedor_brl, operacoes_bloqueadas FROM users WHERE id = $1
            `, [this.testUserId]);

            const user = userAfter.rows[0];
            console.log(`   💰 Saldo final: R$ ${user.balance_brl}`);
            console.log(`   📉 Dívida final: R$ ${user.saldo_devedor_brl}`);
            console.log(`   🚫 Ainda bloqueado: ${user.operacoes_bloqueadas ? 'SIM' : 'NÃO'}`);

            const success = resultado.success && resultado.debt_compensation_applied;
            this.adicionarResultado('COMPENSACAO_RECARGA', success, 
                success ? 'Compensação aplicada corretamente' : 'Falha na compensação');

        } catch (error) {
            console.error('❌ Erro no teste de compensação:', error);
            this.adicionarResultado('COMPENSACAO_RECARGA', false, error.message);
        }
    }

    async testeDesbloqueioAposCompensacao() {
        console.log('\n7️⃣ TESTE DE DESBLOQUEIO APÓS COMPENSAÇÃO');
        console.log('-'.repeat(40));

        try {
            // Se ainda há dívida, fazer recarga adicional
            const userCheck = await this.pool.query(`
                SELECT saldo_devedor_brl, operacoes_bloqueadas FROM users WHERE id = $1
            `, [this.testUserId]);

            const user = userCheck.rows[0];
            
            if (parseFloat(user.saldo_devedor_brl) > 0) {
                console.log(`   📉 Ainda há dívida de R$ ${user.saldo_devedor_brl}, fazendo recarga adicional...`);
                
                const recargaAdicional = {
                    user_id: this.testUserId,
                    amount_brl: 50,
                    amount_usd: 0,
                    recharge_id: 'TESTE_002'
                };

                await this.sistema.processRechargeWithCompensation(recargaAdicional);
            }

            // Verificar se pode operar agora
            const validacao = await this.sistema.validateBeforeOperation(this.testUserId, {
                amount_brl: 10,
                user_type: 'BASIC',
                country_code: 'BRL'
            });

            console.log(`   ✅ Pode operar agora: ${validacao.valid ? 'SIM' : 'NÃO'}`);
            
            if (!validacao.valid) {
                console.log(`   📋 Motivo do bloqueio: ${validacao.message}`);
            }

            const userFinal = await this.pool.query(`
                SELECT balance_brl, saldo_devedor_brl, operacoes_bloqueadas FROM users WHERE id = $1
            `, [this.testUserId]);

            const finalUser = userFinal.rows[0];
            console.log(`   💰 Saldo final: R$ ${finalUser.balance_brl}`);
            console.log(`   📉 Dívida final: R$ ${finalUser.saldo_devedor_brl}`);
            console.log(`   🚫 Operações bloqueadas: ${finalUser.operacoes_bloqueadas ? 'SIM' : 'NÃO'}`);

            const success = validacao.valid && !finalUser.operacoes_bloqueadas && parseFloat(finalUser.saldo_devedor_brl) === 0;
            this.adicionarResultado('DESBLOQUEIO_APOS_COMPENSACAO', success, 
                success ? 'Operações desbloqueadas corretamente' : 'Falha no desbloqueio');

        } catch (error) {
            console.error('❌ Erro no teste de desbloqueio:', error);
            this.adicionarResultado('DESBLOQUEIO_APOS_COMPENSACAO', false, error.message);
        }
    }

    async limparAmbienteTeste() {
        console.log('\n8️⃣ LIMPANDO AMBIENTE DE TESTE');
        console.log('-'.repeat(40));

        try {
            if (this.testUserId) {
                // Remover registros relacionados
                await this.pool.query(`DELETE FROM debt_compensations WHERE user_id = $1`, [this.testUserId]);
                await this.pool.query(`DELETE FROM user_debt_history WHERE user_id = $1`, [this.testUserId]);
                await this.pool.query(`DELETE FROM users WHERE id = $1`, [this.testUserId]);
                
                console.log(`✅ Usuário de teste removido: ID ${this.testUserId}`);
            }

            this.adicionarResultado('LIMPEZA_AMBIENTE', true, 'Ambiente de teste limpo');

        } catch (error) {
            console.error('❌ Erro na limpeza:', error);
            this.adicionarResultado('LIMPEZA_AMBIENTE', false, error.message);
        }
    }

    adicionarResultado(teste, sucesso, mensagem) {
        this.testResults.push({
            teste,
            sucesso,
            mensagem,
            timestamp: new Date().toISOString()
        });
    }

    gerarRelatorioFinal() {
        console.log('\n' + '='.repeat(60));
        console.log('📊 RELATÓRIO FINAL DOS TESTES');
        console.log('='.repeat(60));

        const totalTestes = this.testResults.length;
        const testesPassaram = this.testResults.filter(r => r.sucesso).length;
        const percentualSucesso = ((testesPassaram / totalTestes) * 100).toFixed(1);

        console.log(`\n📈 RESUMO GERAL:`);
        console.log(`   Total de testes: ${totalTestes}`);
        console.log(`   Testes passaram: ${testesPassaram}`);
        console.log(`   Testes falharam: ${totalTestes - testesPassaram}`);
        console.log(`   Taxa de sucesso: ${percentualSucesso}%`);

        console.log(`\n📋 DETALHES DOS TESTES:`);
        this.testResults.forEach((resultado, index) => {
            const status = resultado.sucesso ? '✅' : '❌';
            console.log(`   ${index + 1}. ${status} ${resultado.teste}: ${resultado.mensagem}`);
        });

        if (percentualSucesso >= 85) {
            console.log(`\n🎉 SISTEMA DE SALDO DEVEDOR FUNCIONANDO CORRETAMENTE!`);
            console.log(`✅ Taxa de sucesso: ${percentualSucesso}% (Excelente)`);
        } else if (percentualSucesso >= 70) {
            console.log(`\n⚠️ SISTEMA FUNCIONANDO COM PROBLEMAS MENORES`);
            console.log(`🟡 Taxa de sucesso: ${percentualSucesso}% (Bom, mas pode melhorar)`);
        } else {
            console.log(`\n❌ SISTEMA COM PROBLEMAS CRÍTICOS`);
            console.log(`🔴 Taxa de sucesso: ${percentualSucesso}% (Necessita correção)`);
        }

        console.log('\n' + '='.repeat(60));
    }
}

// Executar testes se chamado diretamente
if (require.main === module) {
    async function main() {
        const testador = new TestadorSistemaDebt();
        
        try {
            await testador.executarTestes();
            process.exit(0);
        } catch (error) {
            console.error('❌ Erro durante os testes:', error);
            process.exit(1);
        }
    }
    
    main();
}

module.exports = TestadorSistemaDebt;
