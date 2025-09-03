// 🔍 VERIFICADOR AUTOMÁTICO DO SISTEMA - COINBITCLUB MARKET BOT
// ============================================================
// Script para validar se o sistema está funcionando corretamente
// Deve ser executado após cada inicialização

console.log('🔍 VERIFICADOR AUTOMÁTICO DO SISTEMA');
console.log('===================================');

const axios = require('axios');
const { Pool } = require('pg');
require('dotenv').config();

// Configuração do banco
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

class SystemValidator {
    constructor() {
        this.checks = [];
        this.passed = 0;
        this.failed = 0;
    }

    // Verificar se o servidor está rodando
    async checkServerHealth() {
        console.log('\n🌐 VERIFICANDO SERVIDOR...');
        try {
            const response = await axios.get('http://localhost:3000/health', { timeout: 5000 });
            if (response.status === 200) {
                console.log('✅ Servidor respondendo corretamente');
                console.log(`📊 Status: ${JSON.stringify(response.data)}`);
                this.passed++;
                return true;
            }
        } catch (error) {
            console.log('❌ Servidor não está respondendo');
            console.log(`🔍 Erro: ${error.message}`);
            this.failed++;
            return false;
        }
    }

    // Verificar conexão com banco de dados
    async checkDatabase() {
        console.log('\n🗄️ VERIFICANDO BANCO DE DADOS...');
        try {
            const result = await pool.query('SELECT NOW() as current_time');
            console.log('✅ Conexão com banco OK');
            console.log(`📊 Timestamp: ${result.rows[0].current_time}`);
            this.passed++;
            return true;
        } catch (error) {
            console.log('❌ Erro na conexão com banco');
            console.log(`🔍 Erro: ${error.message}`);
            this.failed++;
            return false;
        }
    }

    // Verificar chaves API no banco
    async checkAPIKeys() {
        console.log('\n🔑 VERIFICANDO CHAVES API...');
        try {
            const result = await pool.query(`
                SELECT COUNT(*) as total_keys,
                       COUNT(CASE WHEN exchange = 'bybit' THEN 1 END) as bybit_keys,
                       COUNT(CASE WHEN exchange = 'binance' THEN 1 END) as binance_keys
                FROM user_api_keys 
                WHERE api_key IS NOT NULL AND api_secret IS NOT NULL
            `);
            
            const stats = result.rows[0];
            console.log('✅ Chaves API encontradas no banco');
            console.log(`📊 Total: ${stats.total_keys} | Bybit: ${stats.bybit_keys} | Binance: ${stats.binance_keys}`);
            
            if (parseInt(stats.total_keys) > 0) {
                this.passed++;
                return true;
            } else {
                console.log('⚠️ Nenhuma chave API encontrada');
                this.failed++;
                return false;
            }
        } catch (error) {
            console.log('❌ Erro ao verificar chaves API');
            console.log(`🔍 Erro: ${error.message}`);
            this.failed++;
            return false;
        }
    }

    // Verificar tabela de saldos
    async checkBalancesTable() {
        console.log('\n💰 VERIFICANDO TABELA DE SALDOS...');
        try {
            const result = await pool.query(`
                SELECT COUNT(*) as total_balances,
                       MAX(last_updated) as last_update
                FROM balances
            `);
            
            const stats = result.rows[0];
            console.log('✅ Tabela de saldos acessível');
            console.log(`📊 Total registros: ${stats.total_balances}`);
            console.log(`📊 Última atualização: ${stats.last_update || 'Nunca'}`);
            this.passed++;
            return true;
        } catch (error) {
            console.log('❌ Erro ao acessar tabela de saldos');
            console.log(`🔍 Erro: ${error.message}`);
            this.failed++;
            return false;
        }
    }

    // Verificar se o coletor está funcionando
    async checkCollector() {
        console.log('\n🔄 VERIFICANDO COLETOR DE SALDOS...');
        try {
            // Verificar se há registros recentes (últimos 10 minutos)
            const result = await pool.query(`
                SELECT COUNT(*) as recent_updates
                FROM balances 
                WHERE last_updated > NOW() - INTERVAL '10 minutes'
            `);
            
            const recentUpdates = parseInt(result.rows[0].recent_updates);
            if (recentUpdates > 0) {
                console.log('✅ Coletor funcionando - há atualizações recentes');
                console.log(`📊 Atualizações nos últimos 10min: ${recentUpdates}`);
                this.passed++;
                return true;
            } else {
                console.log('⚠️ Coletor pode não estar funcionando - sem atualizações recentes');
                this.failed++;
                return false;
            }
        } catch (error) {
            console.log('❌ Erro ao verificar coletor');
            console.log(`🔍 Erro: ${error.message}`);
            this.failed++;
            return false;
        }
    }

    // Verificar conectividade externa
    async checkExternalConnectivity() {
        console.log('\n🌍 VERIFICANDO CONECTIVIDADE EXTERNA...');
        try {
            // Testar Bybit
            const bybitResponse = await axios.get('https://api.bybit.com/v5/market/time', { timeout: 5000 });
            console.log('✅ Bybit API acessível');
            
            // Testar Binance
            const binanceResponse = await axios.get('https://api.binance.com/api/v3/time', { timeout: 5000 });
            console.log('✅ Binance API acessível');
            
            this.passed++;
            return true;
        } catch (error) {
            console.log('❌ Problema de conectividade externa');
            console.log(`🔍 Erro: ${error.message}`);
            this.failed++;
            return false;
        }
    }

    // Executar todas as verificações
    async runAllChecks() {
        console.log(`🚀 Iniciando verificação completa do sistema...`);
        console.log(`📅 Data: ${new Date().toLocaleString('pt-BR')}\n`);

        const checks = [
            { name: 'Servidor', method: this.checkServerHealth },
            { name: 'Banco de Dados', method: this.checkDatabase },
            { name: 'Chaves API', method: this.checkAPIKeys },
            { name: 'Tabela Saldos', method: this.checkBalancesTable },
            { name: 'Coletor', method: this.checkCollector },
            { name: 'Conectividade', method: this.checkExternalConnectivity }
        ];

        for (const check of checks) {
            await check.method.call(this);
        }

        // Relatório final
        console.log('\n' + '='.repeat(50));
        console.log('📋 RELATÓRIO FINAL DA VERIFICAÇÃO');
        console.log('='.repeat(50));
        
        const total = this.passed + this.failed;
        const successRate = ((this.passed / total) * 100).toFixed(1);
        
        console.log(`📊 Total de verificações: ${total}`);
        console.log(`✅ Sucessos: ${this.passed}`);
        console.log(`❌ Falhas: ${this.failed}`);
        console.log(`🎯 Taxa de sucesso: ${successRate}%`);
        
        if (this.failed === 0) {
            console.log('\n🎉 SISTEMA COMPLETAMENTE FUNCIONAL!');
            console.log('✅ Todos os componentes estão operacionais');
        } else if (this.passed > this.failed) {
            console.log('\n⚠️ SISTEMA FUNCIONANDO COM PROBLEMAS MENORES');
            console.log('🔧 Alguns componentes precisam de atenção');
        } else {
            console.log('\n🚨 SISTEMA COM PROBLEMAS CRÍTICOS');
            console.log('🛠️ Intervenção urgente necessária');
        }
        
        console.log('\n📖 Para mais detalhes, consulte: DOCUMENTACAO-TECNICA-PROFISSIONAL.md');
        console.log('='.repeat(50));
        
        return this.failed === 0;
    }
}

// Executar verificação se chamado diretamente
if (require.main === module) {
    const validator = new SystemValidator();
    validator.runAllChecks()
        .then(allPassed => {
            process.exit(allPassed ? 0 : 1);
        })
        .catch(error => {
            console.error('❌ Erro crítico na verificação:', error.message);
            process.exit(1);
        });
}

module.exports = SystemValidator;
