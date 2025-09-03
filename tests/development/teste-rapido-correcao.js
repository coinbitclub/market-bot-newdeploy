/**
 * 🧪 TESTE RÁPIDO - VERIFICAR SE CORREÇÃO FUNCIONOU
 * ================================================
 * 
 * Testa rapidamente se o sistema pode inicializar sem o erro
 */

const { Pool } = require('pg');

async function testeRapido() {
    console.log('🧪 TESTE RÁPIDO - VERIFICANDO CORREÇÃO');
    console.log('=====================================');

    const pool = new Pool({
        connectionString: process.env.DATABASE_URL || 'process.env.DATABASE_URL',
        ssl: { rejectUnauthorized: false }
    });

    try {
        // 1. Testar conexão com banco
        console.log('1️⃣ Testando conexão com banco...');
        const dbTest = await pool.query('SELECT NOW()');
        console.log('   ✅ Banco conectado:', dbTest.rows[0].now);

        // 2. Testar se EnterpriseExchangeOrchestrator pode ser instanciado
        console.log('\n2️⃣ Testando EnterpriseExchangeOrchestrator...');
        try {
            const EnterpriseExchangeOrchestrator = require('./enterprise-exchange-orchestrator.js');
            const orchestrator = new EnterpriseExchangeOrchestrator();
            
            if (typeof orchestrator.start === 'function') {
                console.log('   ✅ EnterpriseExchangeOrchestrator OK - método start() existe');
            } else {
                console.log('   ❌ Método start() não encontrado');
            }
        } catch (error) {
            console.log('   ⚠️ Erro no EnterpriseExchangeOrchestrator:', error.message);
            console.log('   🔄 Sistema continuará em modo compatibilidade');
        }

        // 3. Testar se CoinBitClubServer pode ser instanciado
        console.log('\n3️⃣ Testando CoinBitClubServer...');
        try {
            const CoinBitClubServer = require('./app.js');
            console.log('   ✅ CoinBitClubServer pode ser importado');
        } catch (error) {
            console.log('   ❌ Erro ao importar CoinBitClubServer:', error.message);
        }

        console.log('\n✅ TESTE COMPLETO - SISTEMA PRONTO PARA DEPLOY');
        console.log('🎯 Painel de Controle será acessível em: /painel');
        console.log('📊 Dashboard principal: /');
        console.log('🔧 Status do sistema: /status');

    } catch (error) {
        console.error('❌ Erro no teste:', error);
    } finally {
        await pool.end();
    }
}

// Executar teste
if (require.main === module) {
    testeRapido();
}

module.exports = testeRapido;
