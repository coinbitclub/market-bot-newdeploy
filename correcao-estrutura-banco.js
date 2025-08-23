/**
 * 🔧 CORREÇÃO DE ESTRUTURA DE BANCO - COLUNA 'name' AUSENTE
 * 
 * Diagnóstico e correção do erro: column u.name does not exist
 */

const { Pool } = require('pg');

class CorrecaoEstruturaBanco {
    constructor() {
        this.pool = new Pool({
            connectionString: process.env.DATABASE_URL
        });
    }

    async diagnosticarEstrutura() {
        console.log('🔍 DIAGNOSTICANDO ESTRUTURA DAS TABELAS\n');
        console.log('='.repeat(50));

        try {
            // Verificar estrutura da tabela users
            console.log('👥 ESTRUTURA DA TABELA USERS:');
            const usersStructure = await this.pool.query(`
                SELECT column_name, data_type, is_nullable, column_default
                FROM information_schema.columns 
                WHERE table_name = 'users' 
                ORDER BY ordinal_position
            `);

            if (usersStructure.rows.length === 0) {
                console.log('❌ Tabela users não existe!');
                return false;
            }

            console.log('📋 Colunas encontradas:');
            usersStructure.rows.forEach(col => {
                console.log(`   • ${col.column_name} (${col.data_type}) - ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
            });

            // Verificar se coluna 'name' existe
            const hasNameColumn = usersStructure.rows.some(col => col.column_name === 'name');
            console.log(`\n🔍 Coluna 'name' existe: ${hasNameColumn ? '✅ SIM' : '❌ NÃO'}`);

            if (!hasNameColumn) {
                console.log('\n🚨 PROBLEMA IDENTIFICADO:');
                console.log('   A consulta está tentando acessar u.name mas a coluna não existe');
                
                // Verificar colunas similares
                const similarColumns = usersStructure.rows.filter(col => 
                    col.column_name.includes('name') || 
                    col.column_name.includes('full_name') ||
                    col.column_name.includes('username')
                );

                if (similarColumns.length > 0) {
                    console.log('\n📝 Colunas similares encontradas:');
                    similarColumns.forEach(col => {
                        console.log(`   • ${col.column_name}`);
                    });
                }
            }

            return hasNameColumn;

        } catch (error) {
            console.log('❌ Erro ao diagnosticar:', error.message);
            return false;
        }
    }

    async verificarQueryProblematica() {
        console.log('\n🔍 IDENTIFICANDO QUERY PROBLEMÁTICA...\n');

        // Buscar por arquivos que fazem JOIN com users e usam u.name
        const possibleQueries = [
            'SELECT com JOIN na tabela users usando alias u',
            'Query que tenta acessar u.name',
            'Possível localização: coletor de saldos ou monitor'
        ];

        console.log('🎯 Queries suspeitas:');
        possibleQueries.forEach((query, i) => {
            console.log(`   ${i+1}. ${query}`);
        });

        // Tentar query de teste para confirmar o erro
        try {
            console.log('\n🧪 TESTANDO QUERY PROBLEMÁTICA...');
            
            // Esta query deve falhar se u.name não existir
            await this.pool.query(`
                SELECT u.id, u.name 
                FROM users u 
                LIMIT 1
            `);
            
            console.log('✅ Query u.name funcionou - problema pode estar em outro lugar');
            
        } catch (error) {
            console.log('❌ Confirmado: ' + error.message);
            console.log('🎯 A query está tentando acessar u.name que não existe');
        }
    }

    async gerarSolucoes() {
        console.log('\n💡 SOLUÇÕES PROPOSTAS:\n');
        console.log('='.repeat(50));

        console.log('🔧 OPÇÃO 1 - ADICIONAR COLUNA NAME:');
        console.log(`
-- Adicionar coluna name à tabela users
ALTER TABLE users ADD COLUMN name VARCHAR(255);

-- Popular com dados existentes (se houver outro campo)
UPDATE users SET name = COALESCE(full_name, username, email, 'User ' || id::text);

-- Tornar NOT NULL se necessário
ALTER TABLE users ALTER COLUMN name SET NOT NULL;
        `);

        console.log('\n🔄 OPÇÃO 2 - CORRIGIR QUERY:');
        console.log('   • Identificar o arquivo que usa u.name');
        console.log('   • Substituir u.name por coluna existente');
        console.log('   • Ex: u.full_name ou u.username');

        console.log('\n🔍 OPÇÃO 3 - VERIFICAR ESTRUTURA CORRETA:');
        console.log('   • Verificar se a tabela foi criada corretamente');
        console.log('   • Comparar com schema original');
        console.log('   • Executar migrations pendentes');
    }

    async tentarCorrecaoAutomatica() {
        console.log('\n🤖 TENTANDO CORREÇÃO AUTOMÁTICA...\n');

        try {
            // Verificar se existe alguma coluna que possa servir como name
            const usersData = await this.pool.query(`
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'users' 
                AND (column_name LIKE '%name%' OR column_name = 'email')
            `);

            if (usersData.rows.length === 0) {
                console.log('❌ Nenhuma coluna adequada encontrada para usar como name');
                
                // Tentar adicionar coluna name
                console.log('🔧 Adicionando coluna name...');
                
                await this.pool.query(`ALTER TABLE users ADD COLUMN name VARCHAR(255)`);
                console.log('✅ Coluna name adicionada');

                // Popular com dados básicos
                await this.pool.query(`
                    UPDATE users 
                    SET name = 'User ' || id::text 
                    WHERE name IS NULL
                `);
                console.log('✅ Coluna name populada com dados básicos');

                return true;

            } else {
                console.log('📝 Colunas encontradas que poderiam ser usadas:');
                usersData.rows.forEach(row => {
                    console.log(`   • ${row.column_name}`);
                });

                // Se já existe uma coluna adequada, sugerir alteração na query
                console.log('\n💡 RECOMENDAÇÃO:');
                console.log('   Alterar a query para usar uma dessas colunas existentes');
                console.log('   Em vez de u.name, usar u.full_name ou u.email');

                return false;
            }

        } catch (error) {
            console.log('❌ Erro na correção automática:', error.message);
            return false;
        }
    }

    async executarDiagnostico() {
        console.log('🔧 DIAGNÓSTICO DE ESTRUTURA DE BANCO\n');
        console.log('Data:', new Date().toLocaleString());
        console.log('='.repeat(60) + '\n');

        try {
            const hasNameColumn = await this.diagnosticarEstrutura();
            await this.verificarQueryProblematica();
            await this.gerarSolucoes();

            if (!hasNameColumn) {
                console.log('\n🤖 EXECUTANDO CORREÇÃO AUTOMÁTICA...');
                const corrigido = await this.tentarCorrecaoAutomatica();
                
                if (corrigido) {
                    console.log('\n✅ PROBLEMA CORRIGIDO AUTOMATICAMENTE!');
                    console.log('🎯 Reinicie o sistema para aplicar as mudanças');
                } else {
                    console.log('\n⚠️  CORREÇÃO MANUAL NECESSÁRIA');
                    console.log('🎯 Veja as opções de solução acima');
                }
            }

        } catch (error) {
            console.log('💥 Erro no diagnóstico:', error.message);
        } finally {
            await this.pool.end();
        }
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    const correcao = new CorrecaoEstruturaBanco();
    correcao.executarDiagnostico()
        .then(() => {
            console.log('\n🏁 Diagnóstico concluído!');
            process.exit(0);
        })
        .catch(error => {
            console.error('💥 Erro:', error.message);
            process.exit(1);
        });
}

module.exports = CorrecaoEstruturaBanco;
