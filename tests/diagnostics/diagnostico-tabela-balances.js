/**
 * 🔍 DIAGNÓSTICO DA ESTRUTURA DA TABELA BALANCES
 * 
 * Verificar quais colunas realmente existem na tabela balances
 */

const { Pool } = require('pg');

class DiagnosticoTabelaBalances {
    constructor() {
        this.pool = new Pool({
            connectionString: process.env.DATABASE_URL
        });
    }

    async verificarEstruturaTabelaBalances() {
        console.log('🔍 VERIFICANDO ESTRUTURA DA TABELA BALANCES...\n');
        
        try {
            // Query para verificar estrutura da tabela
            const estruturaQuery = `
                SELECT 
                    column_name,
                    data_type,
                    is_nullable,
                    column_default
                FROM information_schema.columns 
                WHERE table_name = 'balances'
                ORDER BY ordinal_position;
            `;
            
            const result = await this.pool.query(estruturaQuery);
            
            if (result.rows.length === 0) {
                console.log('❌ Tabela balances não encontrada!');
                return;
            }
            
            console.log('📊 ESTRUTURA DA TABELA BALANCES:');
            console.log('='.repeat(60));
            console.log('COLUNA'.padEnd(20) + 'TIPO'.padEnd(15) + 'NULL?'.padEnd(10) + 'PADRÃO');
            console.log('-'.repeat(60));
            
            result.rows.forEach(row => {
                const coluna = row.column_name.padEnd(20);
                const tipo = row.data_type.padEnd(15);
                const nullable = row.is_nullable.padEnd(10);
                const padrao = (row.column_default || 'N/A').substring(0, 20);
                
                console.log(coluna + tipo + nullable + padrao);
            });
            
            // Verificar se colunas esperadas existem
            const colunasEsperadas = ['balance', 'amount', 'value', 'total', 'free', 'locked'];
            const colunasExistentes = result.rows.map(row => row.column_name);
            
            console.log('\n🔍 VERIFICAÇÃO DE COLUNAS ESPERADAS:');
            colunasEsperadas.forEach(coluna => {
                const existe = colunasExistentes.includes(coluna);
                const icone = existe ? '✅' : '❌';
                console.log(`${icone} ${coluna}: ${existe ? 'EXISTE' : 'NÃO EXISTE'}`);
            });
            
            // Sugerir qual coluna usar
            console.log('\n💡 SUGESTÕES:');
            if (colunasExistentes.includes('amount')) {
                console.log('✅ Use: b.amount em vez de b.balance');
            } else if (colunasExistentes.includes('total')) {
                console.log('✅ Use: b.total em vez de b.balance');
            } else if (colunasExistentes.includes('value')) {
                console.log('✅ Use: b.value em vez de b.balance');
            } else {
                console.log('⚠️  Nenhuma coluna de saldo encontrada!');
            }
            
            return colunasExistentes;
            
        } catch (error) {
            console.log('❌ Erro ao verificar estrutura:', error.message);
            return [];
        }
    }

    async verificarDadosExemplo() {
        console.log('\n📋 EXEMPLO DE DADOS NA TABELA BALANCES:');
        console.log('='.repeat(50));
        
        try {
            const exemploQuery = `
                SELECT * FROM balances 
                LIMIT 3;
            `;
            
            const result = await this.pool.query(exemploQuery);
            
            if (result.rows.length === 0) {
                console.log('📭 Tabela balances está vazia');
                return;
            }
            
            result.rows.forEach((row, index) => {
                console.log(`\n📊 REGISTRO ${index + 1}:`);
                Object.keys(row).forEach(coluna => {
                    console.log(`   ${coluna}: ${row[coluna]}`);
                });
            });
            
        } catch (error) {
            console.log('❌ Erro ao buscar dados exemplo:', error.message);
        }
    }

    async gerarQueryCorreta() {
        console.log('\n🔧 GERANDO QUERY CORRETA...\n');
        
        try {
            const estruturaResult = await this.pool.query(`
                SELECT column_name
                FROM information_schema.columns 
                WHERE table_name = 'balances'
                ORDER BY ordinal_position;
            `);
            
            const colunas = estruturaResult.rows.map(row => row.column_name);
            
            // Identificar coluna de saldo
            let colunaSaldo = 'amount'; // padrão
            if (colunas.includes('balance')) colunaSaldo = 'balance';
            else if (colunas.includes('total')) colunaSaldo = 'total';
            else if (colunas.includes('value')) colunaSaldo = 'value';
            else if (colunas.includes('free')) colunaSaldo = 'free';
            
            // Identificar coluna de ativo
            let colunaAtivo = 'asset';
            if (colunas.includes('symbol')) colunaAtivo = 'symbol';
            else if (colunas.includes('coin')) colunaAtivo = 'coin';
            else if (colunas.includes('currency')) colunaAtivo = 'currency';
            
            const queryCorreta = `
                SELECT 
                    u.id as user_id,
                    u.username,
                    u.email,
                    b.${colunaAtivo} as asset,
                    b.${colunaSaldo} as balance,
                    b.exchange,
                    b.account_type,
                    b.updated_at
                FROM user_api_keys u
                LEFT JOIN balances b ON u.user_id = b.user_id
                WHERE u.is_active = true
                ORDER BY u.id, b.${colunaAtivo};
            `;
            
            console.log('✅ QUERY CORRETA SUGERIDA:');
            console.log(queryCorreta);
            
            return { colunaSaldo, colunaAtivo, queryCorreta };
            
        } catch (error) {
            console.log('❌ Erro ao gerar query:', error.message);
            return null;
        }
    }

    async executarDiagnostico() {
        console.log('🔍 DIAGNÓSTICO DA TABELA BALANCES INICIADO\n');
        console.log('Data:', new Date().toLocaleString());
        console.log('='.repeat(60) + '\n');

        const colunas = await this.verificarEstruturaTabelaBalances();
        await this.verificarDadosExemplo();
        const queryInfo = await this.gerarQueryCorreta();

        console.log('\n🎯 RESUMO:');
        if (queryInfo) {
            console.log(`📊 Coluna de saldo: ${queryInfo.colunaSaldo}`);
            console.log(`🪙 Coluna de ativo: ${queryInfo.colunaAtivo}`);
            console.log('✅ Query correta gerada acima');
        }

        await this.pool.end();
        console.log('\n🏁 DIAGNÓSTICO CONCLUÍDO!');
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    const diagnostico = new DiagnosticoTabelaBalances();
    diagnostico.executarDiagnostico()
        .then(() => {
            console.log('\n✅ Diagnóstico finalizado!');
            process.exit(0);
        })
        .catch(error => {
            console.error('💥 Erro no diagnóstico:', error.message);
            process.exit(1);
        });
}

module.exports = DiagnosticoTabelaBalances;
