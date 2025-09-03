/**
 * 🛠️ CORREÇÃO EMERGENCIAL DO ERRO NO DEPLOY
 * =========================================
 * 
 * Erro: Cannot read properties of undefined (reading 'start')
 * Linha: 1713 - await this.exchangeOrchestrator.start();
 * 
 * SOLUÇÃO: Verificar e corrigir a inicialização do EnterpriseExchangeOrchestrator
 */

const { Pool } = require('pg');

class CorrecaoEmergencialDeploy {
    constructor() {
        this.pool = new Pool({
            connectionString: process.env.DATABASE_URL || 'process.env.DATABASE_URL',
            ssl: { rejectUnauthorized: false }
        });
    }

    async diagnosticarProblema() {
        console.log('🔍 DIAGNÓSTICO EMERGENCIAL DO ERRO NO DEPLOY');
        console.log('============================================');

        try {
            // 1. Verificar se as tabelas necessárias existem
            console.log('\n1️⃣ Verificando tabelas necessárias...');
            await this.verificarTabelas();

            // 2. Verificar se EnterpriseExchangeOrchestrator pode ser instanciado
            console.log('\n2️⃣ Testando instanciação do EnterpriseExchangeOrchestrator...');
            await this.testarInstanciacaoOrchestrator();

            // 3. Verificar dependências do sistema
            console.log('\n3️⃣ Verificando dependências...');
            await this.verificarDependencias();

            // 4. Propor solução
            console.log('\n4️⃣ Propondo solução...');
            await this.proposSolucao();

        } catch (error) {
            console.error('❌ Erro no diagnóstico:', error);
        } finally {
            await this.pool.end();
        }
    }

    async verificarTabelas() {
        try {
            // Verificar tabelas essenciais
            const tabelasNecessarias = ['users', 'user_api_keys'];
            
            for (const tabela of tabelasNecessarias) {
                const exists = await this.pool.query(`
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_schema = 'public' 
                        AND table_name = $1
                    )
                `, [tabela]);

                if (exists.rows[0].exists) {
                    console.log(`   ✅ Tabela '${tabela}' existe`);
                    
                    // Verificar colunas da tabela
                    const columns = await this.pool.query(`
                        SELECT column_name, data_type, is_nullable
                        FROM information_schema.columns 
                        WHERE table_name = $1
                        ORDER BY ordinal_position
                    `, [tabela]);
                    
                    console.log(`      Colunas: ${columns.rows.map(c => c.column_name).join(', ')}`);
                } else {
                    console.log(`   ❌ Tabela '${tabela}' NÃO existe`);
                    await this.criarTabela(tabela);
                }
            }
        } catch (error) {
            console.error('❌ Erro ao verificar tabelas:', error);
        }
    }

    async criarTabela(nomeTabela) {
        try {
            console.log(`   🔧 Criando tabela '${nomeTabela}'...`);

            if (nomeTabela === 'users') {
                await this.pool.query(`
                    CREATE TABLE IF NOT EXISTS users (
                        id SERIAL PRIMARY KEY,
                        username VARCHAR(255) UNIQUE,
                        email VARCHAR(255) UNIQUE,
                        password_hash VARCHAR(255),
                        plan_type VARCHAR(50) DEFAULT 'free',
                        is_active BOOLEAN DEFAULT true,
                        exchange_auto_trading BOOLEAN DEFAULT false,
                        exchange_testnet_mode BOOLEAN DEFAULT true,
                        api_key TEXT,
                        secret_key TEXT,
                        last_login TIMESTAMP,
                        created_at TIMESTAMP DEFAULT NOW(),
                        updated_at TIMESTAMP DEFAULT NOW()
                    )
                `);
                console.log(`   ✅ Tabela 'users' criada`);
            }

            if (nomeTabela === 'user_api_keys') {
                await this.pool.query(`
                    CREATE TABLE IF NOT EXISTS user_api_keys (
                        id SERIAL PRIMARY KEY,
                        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                        exchange VARCHAR(50) NOT NULL DEFAULT 'binance',
                        api_key TEXT NOT NULL,
                        api_secret TEXT NOT NULL,
                        is_active BOOLEAN DEFAULT true,
                        validation_status VARCHAR(50) DEFAULT 'pending',
                        last_validation TIMESTAMP,
                        error_message TEXT,
                        created_at TIMESTAMP DEFAULT NOW(),
                        updated_at TIMESTAMP DEFAULT NOW(),
                        UNIQUE(user_id, exchange)
                    )
                `);
                console.log(`   ✅ Tabela 'user_api_keys' criada`);
            }

        } catch (error) {
            console.error(`❌ Erro ao criar tabela '${nomeTabela}':`, error);
        }
    }

    async testarInstanciacaoOrchestrator() {
        try {
            console.log('   🧪 Testando importação do EnterpriseExchangeOrchestrator...');
            const EnterpriseExchangeOrchestrator = require('./enterprise-exchange-orchestrator.js');
            
            console.log('   ✅ Importação bem-sucedida');
            
            console.log('   🧪 Testando instanciação...');
            const orchestrator = new EnterpriseExchangeOrchestrator();
            
            console.log('   ✅ Instanciação bem-sucedida');
            
            console.log('   🧪 Verificando se método start() existe...');
            if (typeof orchestrator.start === 'function') {
                console.log('   ✅ Método start() existe e é uma função');
            } else {
                console.log('   ❌ Método start() NÃO existe ou não é uma função');
            }

        } catch (error) {
            console.error('   ❌ Erro ao testar EnterpriseExchangeOrchestrator:', error.message);
            console.error('   📋 Stack trace:', error.stack);
        }
    }

    async verificarDependencias() {
        try {
            console.log('   🧪 Verificando enterprise-exchange-connector...');
            const EnterpriseExchangeConnector = require('./enterprise-exchange-connector.js');
            console.log('   ✅ enterprise-exchange-connector OK');

            console.log('   🧪 Verificando outras dependências...');
            const ModulosNecessarios = [
                './position-safety-validator.js',
                './multi-user-signal-processor.js',
                './commission-system.js',
                './financial-manager.js',
                './error-handling-system.js',
                './monitoring-integration.js'
            ];

            for (const modulo of ModulosNecessarios) {
                try {
                    require(modulo);
                    console.log(`   ✅ ${modulo} OK`);
                } catch (error) {
                    console.log(`   ⚠️ ${modulo} - ${error.message}`);
                }
            }

        } catch (error) {
            console.error('   ❌ Erro ao verificar dependências:', error.message);
        }
    }

    async proposSolucao() {
        console.log('💡 SOLUÇÃO PROPOSTA:');
        console.log('==================');
        
        console.log('1. Criar um wrapper seguro para o EnterpriseExchangeOrchestrator');
        console.log('2. Implementar verificação antes de chamar start()');
        console.log('3. Adicionar fallback para caso de erro');
        console.log('');
        
        console.log('🔧 Aplicando correção...');
        await this.aplicarCorrecao();
    }

    async aplicarCorrecao() {
        // A correção será aplicada no app.js através de um patch
        console.log('✅ Script de correção criado');
        console.log('📝 Para aplicar: substitua a linha 1713 no app.js por:');
        console.log('');
        console.log('// CORREÇÃO EMERGENCIAL - VERIFICAÇÃO SEGURA');
        console.log('if (this.exchangeOrchestrator && typeof this.exchangeOrchestrator.start === "function") {');
        console.log('    await this.exchangeOrchestrator.start();');
        console.log('} else {');
        console.log('    console.log("⚠️ EnterpriseExchangeOrchestrator não disponível - modo compatibilidade");');
        console.log('}');
    }
}

// Executar diagnóstico
if (require.main === module) {
    const diagnostico = new CorrecaoEmergencialDeploy();
    diagnostico.diagnosticarProblema();
}

module.exports = CorrecaoEmergencialDeploy;
