/**
 * 🔍 VERIFICADOR DE ESTRUTURA DA TABELA USERS
 * CoinBitClub Market Bot - Database Schema Inspector
 */

const { Pool } = require('pg');

const pool = new Pool({
    connectionString: 'process.env.DATABASE_URL',
    ssl: { rejectUnauthorized: false }
});

console.log('🔍 ANALISANDO ESTRUTURA DA TABELA USERS');
console.log('━'.repeat(50));

async function analisarTabela() {
    try {
        // Obter todas as colunas da tabela users
        const colunas = await pool.query(`
            SELECT 
                column_name, 
                data_type, 
                is_nullable, 
                column_default,
                character_maximum_length
            FROM information_schema.columns 
            WHERE table_name = 'users' 
            ORDER BY ordinal_position
        `);
        
        console.log('📋 ESTRUTURA COMPLETA DA TABELA USERS:');
        console.log('━'.repeat(50));
        
        colunas.rows.forEach((col, index) => {
            const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
            const defaultVal = col.column_default ? ` DEFAULT ${col.column_default}` : '';
            const length = col.character_maximum_length ? `(${col.character_maximum_length})` : '';
            
            console.log(`${index + 1}. ${col.column_name}`);
            console.log(`   Tipo: ${col.data_type}${length}`);
            console.log(`   Nulo: ${nullable}${defaultVal}`);
            console.log('');
        });
        
        // Obter constraints
        const constraints = await pool.query(`
            SELECT 
                tc.constraint_name,
                tc.constraint_type,
                kcu.column_name
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu 
                ON tc.constraint_name = kcu.constraint_name
            WHERE tc.table_name = 'users'
        `);
        
        console.log('🔒 CONSTRAINTS DA TABELA:');
        console.log('━'.repeat(50));
        constraints.rows.forEach(constraint => {
            console.log(`${constraint.constraint_type}: ${constraint.column_name} (${constraint.constraint_name})`);
        });
        
        // Verificar se existem registros para usar como exemplo
        const exemplos = await pool.query(`
            SELECT id, first_name, last_name, email, 
                   prepaid_credits, account_balance_usd,
                   saldo_devedor_brl, saldo_devedor_usd
            FROM users 
            LIMIT 3
        `);
        
        console.log('\n📄 REGISTROS DE EXEMPLO:');
        console.log('━'.repeat(50));
        if (exemplos.rows.length > 0) {
            exemplos.rows.forEach((user, index) => {
                console.log(`${index + 1}. ID: ${user.id}`);
                console.log(`   Nome: ${user.first_name} ${user.last_name}`);
                console.log(`   Email: ${user.email}`);
                console.log(`   BRL: R$ ${user.prepaid_credits || 0}`);
                console.log(`   USD: $ ${user.account_balance_usd || 0}`);
                console.log(`   Dívida BRL: R$ ${user.saldo_devedor_brl || 0}`);
                console.log(`   Dívida USD: $ ${user.saldo_devedor_usd || 0}`);
                console.log('');
            });
        } else {
            console.log('Nenhum registro encontrado na tabela users');
        }
        
    } catch (error) {
        console.error('❌ Erro:', error.message);
    } finally {
        await pool.end();
    }
}

analisarTabela();
