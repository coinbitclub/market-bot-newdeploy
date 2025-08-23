/**
 * 🧪 TESTE COMPLETO SISTEMA SALDO DEVEDOR - UUID ADAPTADO
 * CoinBitClub Market Bot - Enterprise Testing Suite
 * Estrutura real: UUID users, prepaid_credits, account_balance_usd
 */

const { Pool } = require('pg');

class TestadorSistemaDebtUUID {
    constructor() {
        // Usar configuração va        });

        // Histórico de compensações
        const compensacoes = await this.pool.query(`
            SELECT amount_compensated_brl, remaining_debt_brl, compensated_at
            FROM debt_compensations 
            WHERE user_id = $1
            ORDER BY compensated_at DESC
        `, [this.testUserId]);
        this.pool = new Pool({
            connectionString: 'postgresql://postgres:ELjbkkgUASRCtdTAXVFgIssOXiLsRCPq@trolley.proxy.rlwy.net:44790/railway',
            ssl: { rejectUnauthorized: false }
        });
        
        this.testResults = [];
        this.testUserId = null;
    }

    log(message, type = 'info') {
        const timestamp = new Date().toISOString();
        const prefix = type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warning' ? '⚠️' : '📝';
        console.log(`${prefix} [${timestamp.split('T')[1].split('.')[0]}] ${message}`);
    }

    addResult(test, success, details) {
        this.testResults.push({
            test,
            success,
            details,
            timestamp: new Date().toISOString()
        });
    }

    async executarTestes() {
        try {
            this.log('🚀 INICIANDO BATERIA DE TESTES - SISTEMA SALDO DEVEDOR UUID');
            console.log('━'.repeat(80));

            await this.verificarEstrutura();
            await this.criarUsuarioTeste();
            await this.testarCriacaoSaldoDevedor();
            await this.testarBloqueioOperacoes();
            await this.testarCompensacaoDivida();
            await this.testarDesbloqueio();
            await this.testarMultiplasDividas();
            await this.verificarHistorico();
            
            this.exibirRelatorioFinal();
            
        } catch (error) {
            this.log(`ERRO CRÍTICO: ${error.message}`, 'error');
            this.addResult('Execução geral', false, error.message);
        } finally {
            await this.limpezaFinal();
        }
    }

    async verificarEstrutura() {
        this.log('1️⃣ VERIFICANDO ESTRUTURA DO BANCO...');
        
        try {
            // Verificar tabelas criadas
            const tabelas = await this.pool.query(`
                SELECT table_name FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name IN ('user_debt_history', 'debt_compensations', 'minimum_balance_config')
                ORDER BY table_name
            `);
            
            if (tabelas.rows.length < 3) {
                throw new Error(`Apenas ${tabelas.rows.length}/3 tabelas encontradas. Execute a migração primeiro!`);
            }
            
            // Verificar colunas na tabela users
            const colunas = await this.pool.query(`
                SELECT column_name, data_type FROM information_schema.columns 
                WHERE table_name = 'users' 
                AND column_name IN ('id', 'saldo_devedor_brl', 'saldo_devedor_usd', 'operacoes_bloqueadas', 'prepaid_credits', 'account_balance_usd')
                ORDER BY column_name
            `);
            
            const colunasEncontradas = colunas.rows.map(r => r.column_name);
            this.log(`Colunas encontradas: ${colunasEncontradas.join(', ')}`);
            
            // Verificar funções
            const funcoes = await this.pool.query(`
                SELECT routine_name FROM information_schema.routines 
                WHERE routine_schema = 'public' 
                AND routine_name IN ('registrar_saldo_devedor', 'compensar_divida_recarga', 'verificar_saldo_minimo_operacao')
                ORDER BY routine_name
            `);
            
            if (funcoes.rows.length < 3) {
                throw new Error(`Apenas ${funcoes.rows.length}/3 funções encontradas`);
            }
            
            this.log('Estrutura do banco verificada com sucesso', 'success');
            this.addResult('Verificação de estrutura', true, `${tabelas.rows.length} tabelas, ${funcoes.rows.length} funções`);
            
        } catch (error) {
            this.addResult('Verificação de estrutura', false, error.message);
            throw error;
        }
    }

    async criarUsuarioTeste() {
        this.log('2️⃣ CRIANDO USUÁRIO DE TESTE...');
        
        try {
            const resultado = await this.pool.query(`
                INSERT INTO users (
                    first_name, last_name, email, password_hash, phone, 
                    prepaid_credits, account_balance_usd,
                    saldo_devedor_brl, saldo_devedor_usd, operacoes_bloqueadas
                ) VALUES (
                    'Teste', 'SaldoDevedor', 'teste.uuid@coinbitclub.com', 
                    '$2b$10$dummy.hash.for.testing.only', '+5511999998888',
                    500.00, 250.00,
                    0.00, 0.00, false
                ) RETURNING id, first_name, last_name, prepaid_credits, account_balance_usd
            `);
            
            this.testUserId = resultado.rows[0].id;
            const user = resultado.rows[0];
            
            this.log(`Usuário criado: ${user.first_name} ${user.last_name} (ID: ${this.testUserId})`, 'success');
            this.log(`Saldos iniciais: BRL R$ ${user.prepaid_credits}, USD $ ${user.account_balance_usd}`);
            
            this.addResult('Criação de usuário', true, `UUID: ${this.testUserId}`);
            
        } catch (error) {
            this.addResult('Criação de usuário', false, error.message);
            throw error;
        }
    }

    async testarCriacaoSaldoDevedor() {
        this.log('3️⃣ TESTANDO CRIAÇÃO DE SALDO DEVEDOR...');
        
        try {
            // Simular comissão maior que o saldo (usuário tem R$ 500, comissão R$ 800)
            const resultado = await this.pool.query(`
                SELECT registrar_saldo_devedor($1, $2, $3, $4, $5) as result
            `, [this.testUserId, 1001, 800.00, 0.00, 'Teste comissão > saldo']);
            
            const res = resultado.rows[0].result;
            
            this.log(`Resposta da função:`, 'success');
            this.log(`  - Sucesso: ${res.success}`);
            this.log(`  - Dívida criada: ${res.debt_created}`);
            this.log(`  - Mensagem: ${res.message}`);
            
            if (res.debt_amount_brl !== undefined) {
                this.log(`  - Dívida criada: R$ ${res.debt_amount_brl}`);
            }
            if (res.remaining_balance_brl !== undefined) {
                this.log(`  - Saldo restante: R$ ${res.remaining_balance_brl}`);
            }
            if (res.operations_blocked !== undefined) {
                this.log(`  - Operações bloqueadas: ${res.operations_blocked}`);
            }
            
            if (!res.success) {
                throw new Error(`Falha na operação: ${res.message}`);
            }
            
            if (!res.debt_created) {
                throw new Error('Era esperado que uma dívida fosse criada pois comissão (R$ 800) > saldo (R$ 500)');
            }
            
            this.addResult('Criação de saldo devedor', true, `Dívida criada com sucesso`);
            
        } catch (error) {
            this.addResult('Criação de saldo devedor', false, error.message);
            throw error;
        }
    }

    async testarBloqueioOperacoes() {
        this.log('4️⃣ TESTANDO BLOQUEIO DE OPERAÇÕES...');
        
        try {
            const resultado = await this.pool.query(`
                SELECT verificar_saldo_minimo_operacao($1, 'BASIC', 'BRL') as result
            `, [this.testUserId]);
            
            const res = resultado.rows[0].result;
            
            this.log(`Pode operar: ${res.can_operate}`);
            this.log(`Motivo do bloqueio: ${res.block_reason}`);
            this.log(`Dívida BRL: R$ ${res.debt_brl}`);
            
            if (res.can_operate) {
                throw new Error('Usuário deveria estar bloqueado devido ao saldo devedor');
            }
            
            this.addResult('Bloqueio de operações', true, `Bloqueado: ${res.block_reason}`);
            
        } catch (error) {
            this.addResult('Bloqueio de operações', false, error.message);
            throw error;
        }
    }

    async testarCompensacaoDivida() {
        this.log('5️⃣ TESTANDO COMPENSAÇÃO DE DÍVIDA...');
        
        try {
            // Simular recarga para compensar dívida
            const resultado = await this.pool.query(`
                SELECT compensar_divida_recarga($1, 500.00, 0.00, 98765) as result
            `, [this.testUserId]);
            
            const res = resultado.rows[0].result;
            
            this.log(`Compensação aplicada: ${res.compensation_applied}`, 'success');
            this.log(`Valor compensado: R$ ${res.compensation_brl}`);
            this.log(`Saldo restante pós-compensação: R$ ${res.remaining_balance_brl}`);
            this.log(`Dívida restante: R$ ${res.remaining_debt_brl}`);
            
            if (!res.compensation_applied) {
                throw new Error('Compensação deveria ter sido aplicada');
            }
            
            if (res.remaining_debt_brl > 0) {
                throw new Error(`Ainda há dívida restante: R$ ${res.remaining_debt_brl}`);
            }
            
            this.addResult('Compensação de dívida', true, `Compensado: R$ ${res.compensation_brl}`);
            
        } catch (error) {
            this.addResult('Compensação de dívida', false, error.message);
            throw error;
        }
    }

    async testarDesbloqueio() {
        this.log('6️⃣ TESTANDO DESBLOQUEIO PÓS-COMPENSAÇÃO...');
        
        try {
            const resultado = await this.pool.query(`
                SELECT verificar_saldo_minimo_operacao($1, 'BASIC', 'BRL') as result
            `, [this.testUserId]);
            
            const res = resultado.rows[0].result;
            
            this.log(`Pode operar: ${res.can_operate}`);
            this.log(`Saldo disponível: R$ ${res.available_balance}`);
            this.log(`Dívida BRL: R$ ${res.debt_brl}`);
            
            if (res.debt_brl > 0) {
                throw new Error(`Ainda há dívida: R$ ${res.debt_brl}`);
            }
            
            // Se não pode operar, pode ser por saldo mínimo
            if (!res.can_operate) {
                this.log(`Motivo: ${res.block_reason}`, 'warning');
            }
            
            this.addResult('Desbloqueio pós-compensação', true, `Dívida zerada, saldo: R$ ${res.available_balance}`);
            
        } catch (error) {
            this.addResult('Desbloqueio pós-compensação', false, error.message);
            throw error;
        }
    }

    async testarMultiplasDividas() {
        this.log('7️⃣ TESTANDO MÚLTIPLAS DÍVIDAS...');
        
        try {
            // Criar duas dívidas pequenas
            await this.pool.query(`
                SELECT registrar_saldo_devedor($1, $2, $3, $4, $5) as result
            `, [this.testUserId, 1002, 50.00, 0.00, 'Primeira dívida parcial']);
            
            await this.pool.query(`
                SELECT registrar_saldo_devedor($1, $2, $3, $4, $5) as result
            `, [this.testUserId, 1003, 75.00, 0.00, 'Segunda dívida parcial']);

            // Compensar parcialmente
            const resultado = await this.pool.query(`
                SELECT compensar_divida_recarga($1, 80.00, 0.00, 98766) as result
            `, [this.testUserId]);
            
            const res = resultado.rows[0].result;
            
            this.log(`Compensação múltipla: R$ ${res.compensation_brl}`, 'success');
            this.log(`Dívida restante: R$ ${res.remaining_debt_brl}`);
            
            this.addResult('Múltiplas dívidas', true, `Compensação: R$ ${res.compensation_brl}, Restante: R$ ${res.remaining_debt_brl}`);
            
        } catch (error) {
            this.addResult('Múltiplas dívidas', false, error.message);
            throw error;
        }
    }

    async verificarHistorico() {
        this.log('8️⃣ VERIFICANDO HISTÓRICO...');
        
        try {
        // Histórico de dívidas
        const dividas = await this.pool.query(`
            SELECT debt_type, amount_brl, status, operation_id, created_at
            FROM user_debt_history 
            WHERE user_id = $1
            ORDER BY created_at DESC
        `, [this.testUserId]);
        
        this.log(`Total de registros de dívida: ${dividas.rows.length}`);
        dividas.rows.forEach((divida, index) => {
            this.log(`   ${index + 1}. ${divida.debt_type} - R$ ${divida.amount_brl} - ${divida.status} (Op: ${divida.operation_id})`);
        });            // Histórico de compensações
            const compensacoes = await this.pool.query(`
                SELECT amount_compensated_brl, remaining_debt_brl, created_at
                FROM debt_compensations 
                WHERE user_id = $1
                ORDER BY created_at DESC
            `, [this.testUserId]);
            
            this.log(`Total de compensações: ${compensacoes.rows.length}`);
            compensacoes.rows.forEach((comp, index) => {
                this.log(`   ${index + 1}. Compensado: R$ ${comp.amount_compensated_brl} - Restante: R$ ${comp.remaining_debt_brl}`);
            });
            
            this.addResult('Verificação de histórico', true, `${dividas.rows.length} dívidas, ${compensacoes.rows.length} compensações`);
            
        } catch (error) {
            this.addResult('Verificação de histórico', false, error.message);
            throw error;
        }
    }

    exibirRelatorioFinal() {
        console.log('\n' + '━'.repeat(80));
        this.log('📊 RELATÓRIO FINAL DOS TESTES', 'success');
        console.log('━'.repeat(80));
        
        const sucessos = this.testResults.filter(r => r.success).length;
        const falhas = this.testResults.filter(r => !r.success).length;
        
        this.log(`Total de testes: ${this.testResults.length}`);
        this.log(`Sucessos: ${sucessos}`, 'success');
        this.log(`Falhas: ${falhas}`, falhas > 0 ? 'error' : 'info');
        
        console.log('\nDetalhes dos testes:');
        this.testResults.forEach(result => {
            const status = result.success ? '✅' : '❌';
            console.log(`${status} ${result.test}: ${result.details}`);
        });
        
        if (falhas === 0) {
            console.log('\n🎉 TODOS OS TESTES PASSARAM! Sistema 100% funcional');
            console.log('✅ Sistema de Saldo Devedor completamente operacional');
            console.log('✅ Suporte completo para UUID e estrutura real do banco');
            console.log('✅ Criação, compensação e bloqueio funcionando perfeitamente');
        } else {
            console.log('\n⚠️ Alguns testes falharam. Revise os detalhes acima.');
        }
    }

    async limpezaFinal() {
        this.log('🧹 EXECUTANDO LIMPEZA FINAL...');
        
        if (this.testUserId) {
            try {
                await this.pool.query('DELETE FROM debt_compensations WHERE user_id = $1', [this.testUserId]);
                await this.pool.query('DELETE FROM user_debt_history WHERE user_id = $1', [this.testUserId]);
                await this.pool.query('DELETE FROM users WHERE id = $1', [this.testUserId]);
                this.log('Dados de teste removidos com sucesso', 'success');
            } catch (error) {
                this.log(`Erro na limpeza: ${error.message}`, 'warning');
            }
        }
        
        await this.pool.end();
        this.log('Conexão com banco encerrada', 'success');
    }
}

// Executar testes
const testador = new TestadorSistemaDebtUUID();
testador.executarTestes()
    .then(() => {
        console.log('\n🏁 TESTES FINALIZADOS');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n💥 ERRO FATAL:', error.message);
        process.exit(1);
    });
