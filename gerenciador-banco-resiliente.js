const { Pool } = require('pg');

class GerenciadorBancoDados {
    constructor() {
        this.poolPrincipal = null;
        this.poolBackup = null;
        this.isConectado = false;
        this.ultimaConexao = null;
    }

    // Configurações múltiplas para tentar diferentes endpoints
    obterConfiguracoesBanco() {
        return [
            {
                name: 'Railway Direto',
                host: 'trolley.proxy.rlwy.net',
                port: 31957,
                database: 'railway',
                user: 'postgres',
                password: 'QNGBxDMrBJQyXfDLSDKkOUONQUmCdEOc',
                ssl: { rejectUnauthorized: false },
                connectionTimeoutMillis: 15000,
                idleTimeoutMillis: 30000,
                max: 5
            },
            {
                name: 'Railway Alternativo',
                host: '35.174.13.24', // IP direto se DNS falhar
                port: 31957,
                database: 'railway',
                user: 'postgres',
                password: 'QNGBxDMrBJQyXfDLSDKkOUONQUmCdEOc',
                ssl: { rejectUnauthorized: false },
                connectionTimeoutMillis: 20000,
                idleTimeoutMillis: 30000,
                max: 3
            }
        ];
    }

    async tentarConexao(config, tentativa = 1) {
        const maxTentativas = 3;
        
        try {
            console.log(`🔄 [${config.name}] Tentativa ${tentativa}/${maxTentativas}...`);
            
            const pool = new Pool(config);
            
            // Teste de conexão com timeout
            const client = await Promise.race([
                pool.connect(),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Timeout de conexão')), config.connectionTimeoutMillis)
                )
            ]);

            // Teste de query simples
            const result = await client.query('SELECT NOW() as timestamp, version() as version');
            client.release();

            console.log(`✅ [${config.name}] Conexão estabelecida!`);
            console.log(`📅 Timestamp: ${result.rows[0].timestamp}`);
            
            this.poolPrincipal = pool;
            this.isConectado = true;
            this.ultimaConexao = new Date();
            
            return pool;
            
        } catch (error) {
            console.log(`❌ [${config.name}] Erro: ${error.message}`);
            
            if (tentativa < maxTentativas) {
                const delay = tentativa * 2000; // Delay progressivo
                console.log(`⏳ Aguardando ${delay/1000}s antes da próxima tentativa...`);
                await new Promise(resolve => setTimeout(resolve, delay));
                return this.tentarConexao(config, tentativa + 1);
            }
            
            throw error;
        }
    }

    async conectarComFallback() {
        console.log('🚀 Iniciando conexão com banco de dados...');
        
        const configuracoes = this.obterConfiguracoesBanco();
        
        for (const config of configuracoes) {
            try {
                const pool = await this.tentarConexao(config);
                return pool;
            } catch (error) {
                console.log(`⚠️ [${config.name}] Falhou completamente`);
                continue;
            }
        }
        
        throw new Error('❌ Todas as tentativas de conexão falharam');
    }

    async executarQuery(sql, params = []) {
        if (!this.isConectado || !this.poolPrincipal) {
            console.log('🔄 Reconectando ao banco...');
            await this.conectarComFallback();
        }

        try {
            const result = await this.poolPrincipal.query(sql, params);
            return result;
        } catch (error) {
            if (error.code === 'ECONNRESET' || error.code === 'ENOTFOUND') {
                console.log('🔄 Conexão perdida, tentando reconectar...');
                this.isConectado = false;
                await this.conectarComFallback();
                return this.poolPrincipal.query(sql, params);
            }
            throw error;
        }
    }

    async testarConexao() {
        try {
            await this.conectarComFallback();
            
            // Teste das tabelas principais
            const tabelas = ['users', 'balances', 'fear_greed_index', 'top100_analysis'];
            
            for (const tabela of tabelas) {
                try {
                    const result = await this.executarQuery(`SELECT COUNT(*) as total FROM ${tabela}`);
                    console.log(`✅ Tabela ${tabela}: ${result.rows[0].total} registros`);
                } catch (error) {
                    console.log(`⚠️ Tabela ${tabela}: ${error.message}`);
                }
            }
            
            return true;
        } catch (error) {
            console.log(`❌ Teste de conexão falhou: ${error.message}`);
            return false;
        }
    }

    async obterEstatisticas() {
        if (!this.isConectado) {
            return { erro: 'Banco não conectado' };
        }

        try {
            const stats = await this.executarQuery(`
                SELECT 
                    'users' as tabela, COUNT(*) as registros FROM users
                UNION ALL
                SELECT 
                    'balances' as tabela, COUNT(*) as registros FROM balances
                UNION ALL
                SELECT 
                    'fear_greed_index' as tabela, COUNT(*) as registros FROM fear_greed_index
                UNION ALL
                SELECT 
                    'top100_analysis' as tabela, COUNT(*) as registros FROM top100_analysis
            `);

            return {
                conectado: this.isConectado,
                ultimaConexao: this.ultimaConexao,
                tabelas: stats.rows
            };
        } catch (error) {
            return { erro: error.message };
        }
    }

    async fecharConexao() {
        if (this.poolPrincipal) {
            await this.poolPrincipal.end();
            this.isConectado = false;
            console.log('🔒 Conexão com banco fechada');
        }
    }
}

// Teste do gerenciador
async function testarGerenciador() {
    const gerenciador = new GerenciadorBancoDados();
    
    console.log('🧪 TESTANDO GERENCIADOR DE BANCO DE DADOS...\n');
    
    const sucesso = await gerenciador.testarConexao();
    
    if (sucesso) {
        console.log('\n📊 Obtendo estatísticas...');
        const stats = await gerenciador.obterEstatisticas();
        console.log('📈 Estatísticas:', JSON.stringify(stats, null, 2));
    }
    
    await gerenciador.fecharConexao();
    
    return sucesso;
}

// Executar teste
testarGerenciador().then(sucesso => {
    console.log(`\n🏁 Teste concluído: ${sucesso ? '✅ SUCESSO' : '❌ FALHOU'}`);
}).catch(console.error);

module.exports = GerenciadorBancoDados;
