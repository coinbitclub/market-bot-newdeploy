/**
 * 🔧 VERIFICADOR DE FUNÇÃO - REGISTRAR SALDO DEVEDOR
 */

const { Pool } = require('pg');

const pool = new Pool({
    connectionString: 'process.env.DATABASE_URL',
    ssl: { rejectUnauthorized: false }
});

async function verificarFuncao() {
    try {
        // Verificar se a função existe
        const funcoes = await pool.query(`
            SELECT routine_name, data_type as return_type 
            FROM information_schema.routines 
            WHERE routine_name = 'registrar_saldo_devedor'
        `);
        
        console.log('🔍 Funções encontradas:', funcoes.rows);
        
        // Verificar parâmetros
        const parametros = await pool.query(`
            SELECT 
                parameter_name, 
                data_type,
                ordinal_position
            FROM information_schema.parameters 
            WHERE specific_name IN (
                SELECT specific_name 
                FROM information_schema.routines 
                WHERE routine_name = 'registrar_saldo_devedor'
            )
            ORDER BY ordinal_position
        `);
        
        console.log('\n📋 Parâmetros da função:');
        parametros.rows.forEach(param => {
            console.log(`${param.ordinal_position}. ${param.parameter_name || 'unnamed'}: ${param.data_type}`);
        });
        
        // Testar chamada simples
        console.log('\n🧪 Testando chamada da função...');
        const teste = await pool.query(`
            SELECT registrar_saldo_devedor(
                '973c291c-3b69-41e4-9495-bfb9ecda998b'::UUID, 
                'COMMISSION'::TEXT, 
                100.00::DECIMAL, 
                0.00::DECIMAL, 
                'Teste'::TEXT, 
                'TEST123'::TEXT
            ) as result
        `);
        
        console.log('✅ Função executada:', teste.rows[0].result);
        
    } catch (error) {
        console.error('❌ Erro:', error.message);
    } finally {
        await pool.end();
    }
}

verificarFuncao();
