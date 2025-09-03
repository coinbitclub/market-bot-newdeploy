/**
 * 🚀 APLICADOR DE MIGRAÇÃO - SISTEMA SALDO DEVEDOR
 * CoinBitClub Market Bot - Database Migration
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
    connectionString: 'process.env.DATABASE_URL',
    ssl: { rejectUnauthorized: false }
});

console.log('🚀 APLICANDO MIGRAÇÃO - SISTEMA SALDO DEVEDOR');
console.log('━'.repeat(60));

async function aplicarMigracao() {
    try {
        console.log('1️⃣ Conectando ao banco de dados...');
        
        // Verificar conexão
        const testConnection = await pool.query('SELECT version(), current_database()');
        console.log('✅ Conectado ao banco:', testConnection.rows[0].current_database);
        
        console.log('\n2️⃣ Lendo arquivo de migração...');
        
        // Ler o arquivo SQL
        const migrationPath = path.join(__dirname, 'migrate-saldo-devedor.sql');
        if (!fs.existsSync(migrationPath)) {
            throw new Error('Arquivo migrate-saldo-devedor.sql não encontrado');
        }
        
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
        console.log('✅ Arquivo de migração lido:', migrationPath);
        console.log(`📝 Tamanho do arquivo: ${migrationSQL.length} caracteres`);
        
        console.log('\n3️⃣ Verificando estrutura atual...');
        
        // Verificar se já foi aplicada
        const verificarTabelas = await pool.query(`
            SELECT table_name FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN ('user_debt_history', 'debt_compensations', 'minimum_balance_config')
        `);
        
        if (verificarTabelas.rows.length > 0) {
            console.log('⚠️ Algumas tabelas já existem:', verificarTabelas.rows.map(r => r.table_name).join(', '));
            console.log('🔄 Continuando com migração...');
        }
        
        console.log('\n4️⃣ Aplicando migração...');
        
        // Executar a migração em uma transação
        await pool.query('BEGIN');
        
        try {
            await pool.query(migrationSQL);
            await pool.query('COMMIT');
            console.log('✅ Migração aplicada com sucesso!');
        } catch (error) {
            await pool.query('ROLLBACK');
            throw error;
        }
        
        console.log('\n5️⃣ Verificando resultado...');
        
        // Verificar tabelas criadas
        const tabelasCriadas = await pool.query(`
            SELECT table_name FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN ('user_debt_history', 'debt_compensations', 'minimum_balance_config')
            ORDER BY table_name
        `);
        
        console.log('📋 Tabelas criadas:');
        tabelasCriadas.rows.forEach(tabela => {
            console.log(`   ✅ ${tabela.table_name}`);
        });
        
        // Verificar colunas adicionadas
        const colunasAdicionadas = await pool.query(`
            SELECT column_name FROM information_schema.columns 
            WHERE table_name = 'users' 
            AND column_name IN ('saldo_devedor_brl', 'saldo_devedor_usd', 'operacoes_bloqueadas', 'ultima_compensacao')
            ORDER BY column_name
        `);
        
        console.log('\n📋 Colunas adicionadas à tabela users:');
        colunasAdicionadas.rows.forEach(coluna => {
            console.log(`   ✅ ${coluna.column_name}`);
        });
        
        // Verificar funções criadas
        const funcoesCriadas = await pool.query(`
            SELECT routine_name FROM information_schema.routines 
            WHERE routine_schema = 'public' 
            AND routine_name IN ('registrar_saldo_devedor', 'compensar_divida_recarga', 'verificar_saldo_minimo_operacao')
            ORDER BY routine_name
        `);
        
        console.log('\n📋 Funções criadas:');
        funcoesCriadas.rows.forEach(funcao => {
            console.log(`   ✅ ${funcao.routine_name}()`);
        });
        
        console.log('\n' + '━'.repeat(60));
        console.log('🎉 MIGRAÇÃO CONCLUÍDA COM SUCESSO!');
        console.log('✅ Sistema de Saldo Devedor instalado');
        console.log('✅ Todas as tabelas, colunas e funções criadas');
        console.log('✅ Pronto para executar os testes');
        
    } catch (error) {
        console.error('\n❌ ERRO NA MIGRAÇÃO:', error.message);
        console.log('\n🔧 Detalhes do erro:');
        if (error.detail) console.log('   📝', error.detail);
        if (error.hint) console.log('   💡', error.hint);
        if (error.position) console.log('   📍 Posição:', error.position);
        
    } finally {
        await pool.end();
    }
}

// Executar migração
aplicarMigracao()
    .then(() => {
        console.log('\n🏁 MIGRAÇÃO FINALIZADA');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n💥 ERRO FATAL:', error.message);
        process.exit(1);
    });
