/**
 * 🔍 DETECTOR DE ERRO - Column b.total does not exist
 * 
 * Script para identificar exatamente onde está o erro
 */

const { Pool } = require('pg');

class DetectorErro {
    constructor() {
        this.pool = new Pool({
            connectionString: process.env.DATABASE_URL || 'process.env.DATABASE_URL',
            ssl: { rejectUnauthorized: false }
        });
    }

    async verificarEstruturaBanco() {
        console.log('🔍 VERIFICANDO ESTRUTURA DO BANCO...\n');

        try {
            // Verificar se a tabela balances existe
            const tableExists = await this.pool.query(`
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = 'balances'
                );
            `);

            console.log('📊 Tabela balances existe:', tableExists.rows[0].exists);

            if (tableExists.rows[0].exists) {
                // Verificar colunas da tabela balances
                const columns = await this.pool.query(`
                    SELECT column_name, data_type, is_nullable
                    FROM information_schema.columns 
                    WHERE table_name = 'balances' 
                    ORDER BY ordinal_position;
                `);

                console.log('\n📋 COLUNAS DA TABELA BALANCES:');
                columns.rows.forEach(col => {
                    console.log(`   • ${col.column_name} (${col.data_type})`);
                });

                // Verificar se existe coluna 'total'
                const hasTotal = columns.rows.find(col => col.column_name === 'total');
                console.log(`\n✓ Coluna 'total' existe:`, !!hasTotal);

                // Verificar se existe coluna 'balance'
                const hasBalance = columns.rows.find(col => col.column_name === 'balance');
                console.log(`✓ Coluna 'balance' existe:`, !!hasBalance);

            } else {
                console.log('❌ Tabela balances não existe!');
                console.log('💡 Execute: node create-database-structure.js');
            }

        } catch (error) {
            console.log('❌ Erro ao verificar estrutura:', error.message);
        }
    }

    async testarQueriesProblematicas() {
        console.log('\n🧪 TESTANDO QUERIES PROBLEMÁTICAS...\n');

        const queries = [
            {
                nome: 'Query com b.total',
                sql: 'SELECT b.total FROM balances b LIMIT 1'
            },
            {
                nome: 'Query com b.balance',
                sql: 'SELECT b.balance FROM balances b LIMIT 1'
            },
            {
                nome: 'Query do monitor (simplificada)',
                sql: 'SELECT b.user_id, b.total as balance FROM balances b LIMIT 1'
            }
        ];

        for (const query of queries) {
            try {
                console.log(`🔍 Testando: ${query.nome}`);
                const result = await this.pool.query(query.sql);
                console.log(`✅ SUCESSO: ${query.nome}`);
            } catch (error) {
                console.log(`❌ ERRO: ${query.nome}`);
                console.log(`   📝 ${error.message}`);
            }
        }
    }

    async criarTabelaSeNecessario() {
        console.log('\n🔧 VERIFICANDO SE PRECISA CRIAR TABELA...\n');

        try {
            const tableExists = await this.pool.query(`
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = 'balances'
                );
            `);

            if (!tableExists.rows[0].exists) {
                console.log('🏗️ Criando tabela balances...');
                
                await this.pool.query(`
                    CREATE TABLE balances (
                        id SERIAL PRIMARY KEY,
                        user_id INTEGER NOT NULL,
                        exchange VARCHAR(20) NOT NULL,
                        asset VARCHAR(10) NOT NULL,
                        account_type VARCHAR(20) DEFAULT 'unified',
                        free DECIMAL(20,8) DEFAULT 0,
                        used DECIMAL(20,8) DEFAULT 0,
                        total DECIMAL(20,8) DEFAULT 0,
                        usd_value DECIMAL(15,2) DEFAULT 0,
                        created_at TIMESTAMP DEFAULT NOW(),
                        updated_at TIMESTAMP DEFAULT NOW(),
                        UNIQUE(user_id, exchange, asset, account_type)
                    )
                `);

                console.log('✅ Tabela balances criada com sucesso!');
            } else {
                console.log('✅ Tabela balances já existe');
            }

        } catch (error) {
            console.log('❌ Erro ao criar tabela:', error.message);
        }
    }

    async executarDiagnostico() {
        console.log('🔍 DIAGNÓSTICO DE ERRO - Column b.total does not exist\n');
        console.log('='.repeat(60) + '\n');

        await this.verificarEstruturaBanco();
        await this.testarQueriesProblematicas();
        await this.criarTabelaSeNecessario();

        console.log('\n🎯 PRÓXIMOS PASSOS:');
        console.log('1. Se tabela não existe: Execute node create-database-structure.js');
        console.log('2. Se query está incorreta: Verifique monitor-chaves-api.js');
        console.log('3. Reinicie o sistema após correções');

        await this.pool.end();
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    const detector = new DetectorErro();
    detector.executarDiagnostico()
        .then(() => {
            console.log('\n✅ Diagnóstico concluído!');
            process.exit(0);
        })
        .catch(error => {
            console.error('💥 Erro no diagnóstico:', error.message);
            process.exit(1);
        });
}

module.exports = DetectorErro;
