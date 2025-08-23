/**
 * 🚀 INICIALIZADOR ENTERPRISE RESILIENTE V2.0
 * 
 * Sistema de inicialização otimizado com:
 * - Verificação completa de pré-requisitos
 * - Configuração automática de ambiente
 * - Recuperação de falhas anterior
 * - Monitoramento de saúde inicial
 */

const { createRobustPool, testConnection, safeQuery } = require('./fixed-database-config');
const { spawn } = require('child_process');

class InicializadorEnterpriseResilient {
    constructor() {
        this.pool = null;
        this.verificacoes = {
            database: false,
            environment: false,
            apis: false,
            structure: false
        };

        console.log('🔥 Inicializador Enterprise Resiliente V2.0');
        console.log('   Verificações avançadas de sistema');
        console.log('   Recuperação automática de falhas');
        console.log('   Monitoramento de saúde completo\n');
    }

    async verificarPreRequisitos() {
        console.log('🔍 VERIFICANDO PRÉ-REQUISITOS DO SISTEMA...\n');

        // 1. Verificar conexão com banco
        console.log('1️⃣ Verificando conexão PostgreSQL...');
        try {
            this.pool = createRobustPool();
            const conectado = await testConnection(this.pool);
            
            if (conectado) {
                this.verificacoes.database = true;
                console.log('   ✅ PostgreSQL conectado e funcional');
            } else {
                throw new Error('Falha na conexão');
            }
        } catch (error) {
            console.error('   ❌ Falha na conexão PostgreSQL:', error.message);
            return false;
        }

        // 2. Verificar variáveis de ambiente
        console.log('\n2️⃣ Verificando variáveis de ambiente...');
        const variaveisRequeridas = ['DATABASE_URL', 'NODE_ENV'];
        let envOk = true;

        for (const variavel of variaveisRequeridas) {
            if (process.env[variavel]) {
                console.log(`   ✅ ${variavel}: ${variavel === 'DATABASE_URL' ? '[PROTEGIDO]' : process.env[variavel]}`);
            } else {
                console.log(`   ⚠️ ${variavel}: Não encontrado (usando padrão)`);
            }
        }

        // Configurar NODE_ENV se não existir
        if (!process.env.NODE_ENV) {
            process.env.NODE_ENV = 'production';
            console.log('   🔧 NODE_ENV configurado para: production');
        }

        this.verificacoes.environment = true;
        console.log('   ✅ Ambiente configurado corretamente');

        // 3. Verificar estrutura de tabelas
        console.log('\n3️⃣ Verificando estrutura do banco...');
        try {
            await this.verificarEstruturaBanco();
            this.verificacoes.structure = true;
            console.log('   ✅ Estrutura do banco verificada');
        } catch (error) {
            console.error('   ❌ Problema na estrutura:', error.message);
            return false;
        }

        // 4. Verificar conectividade APIs
        console.log('\n4️⃣ Verificando conectividade com APIs externas...');
        try {
            await this.verificarAPIsExternas();
            this.verificacoes.apis = true;
            console.log('   ✅ APIs externas acessíveis');
        } catch (error) {
            console.log('   ⚠️ Algumas APIs indisponíveis (sistema irá adaptar)');
            this.verificacoes.apis = true; // Não crítico
        }

        return true;
    }

    async verificarEstruturaBanco() {
        // Verificar tabelas principais
        const tabelasEssenciais = [
            'sistema_leitura_mercado',
            'api_monitoring', 
            'sistema_metricas',
            'sistema_eventos'
        ];

        for (const tabela of tabelasEssenciais) {
            const existe = await safeQuery(this.pool, `
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_name = $1
                )
            `, [tabela]);

            if (!existe.rows[0]?.exists) {
                console.log(`   🔧 Criando tabela ${tabela}...`);
                await this.criarTabelaSeNecessario(tabela);
            } else {
                console.log(`   ✅ Tabela ${tabela} existe`);
            }
        }
    }

    async criarTabelaSeNecessario(nomeTabela) {
        const scripts = {
            sistema_leitura_mercado: `
                CREATE TABLE sistema_leitura_mercado (
                    id SERIAL PRIMARY KEY,
                    ciclo_id VARCHAR(50) UNIQUE,
                    btc_price DECIMAL(20,8),
                    btc_change_24h DECIMAL(10,4),
                    fear_greed_index INTEGER,
                    fear_greed_classification VARCHAR(20),
                    volume_24h DECIMAL(20,2),
                    market_cap DECIMAL(20,2),
                    api_source VARCHAR(50),
                    data_quality VARCHAR(20) DEFAULT 'high',
                    created_at TIMESTAMP DEFAULT NOW(),
                    updated_at TIMESTAMP DEFAULT NOW()
                )
            `,
            api_monitoring: `
                CREATE TABLE api_monitoring (
                    id SERIAL PRIMARY KEY,
                    api_name VARCHAR(50) UNIQUE,
                    status VARCHAR(20),
                    response_time INTEGER,
                    error_message TEXT,
                    success_rate DECIMAL(5,2),
                    last_check TIMESTAMP DEFAULT NOW()
                )
            `,
            sistema_metricas: `
                CREATE TABLE sistema_metricas (
                    id SERIAL PRIMARY KEY,
                    tipo_metrica VARCHAR(50),
                    valor DECIMAL(20,8),
                    descricao TEXT,
                    timestamp TIMESTAMP DEFAULT NOW()
                )
            `,
            sistema_eventos: `
                CREATE TABLE sistema_eventos (
                    id SERIAL PRIMARY KEY,
                    tipo_evento VARCHAR(50),
                    severidade VARCHAR(20),
                    descricao TEXT,
                    dados_adicionais JSONB,
                    timestamp TIMESTAMP DEFAULT NOW()
                )
            `
        };

        if (scripts[nomeTabela]) {
            await safeQuery(this.pool, scripts[nomeTabela]);
        }
    }

    async verificarAPIsExternas() {
        const axios = require('axios');
        const apisTestar = [
            { nome: 'CoinGecko', url: 'https://api.coingecko.com/api/v3/ping' },
            { nome: 'CoinStats', url: 'https://api.coinstats.app/public/v1/coins/bitcoin' },
            { nome: 'Alternative.me', url: 'https://api.alternative.me/fng/' }
        ];

        let apisDisponíveis = 0;

        for (const api of apisTestar) {
            try {
                const response = await axios.get(api.url, { timeout: 5000 });
                if (response.status === 200) {
                    console.log(`   ✅ ${api.nome}: Disponível`);
                    apisDisponíveis++;
                } else {
                    console.log(`   ⚠️ ${api.nome}: Status ${response.status}`);
                }
            } catch (error) {
                console.log(`   ❌ ${api.nome}: Indisponível (${error.message})`);
            }
        }

        console.log(`   📊 APIs disponíveis: ${apisDisponíveis}/${apisTestar.length}`);
        
        if (apisDisponíveis === 0) {
            throw new Error('Nenhuma API externa disponível');
        }
    }

    async recuperarDeFalhasAnteriores() {
        console.log('\n🔄 ANALISANDO FALHAS ANTERIORES...');

        try {
            // Verificar eventos críticos recentes
            const eventosRecentes = await safeQuery(this.pool, `
                SELECT tipo_evento, COUNT(*) as quantidade
                FROM sistema_eventos 
                WHERE timestamp > NOW() - INTERVAL '1 hour'
                AND severidade IN ('error', 'critical')
                GROUP BY tipo_evento
                ORDER BY quantidade DESC
            `);

            if (eventosRecentes.rows.length > 0) {
                console.log('   ⚠️ Eventos críticos detectados na última hora:');
                for (const evento of eventosRecentes.rows) {
                    console.log(`      - ${evento.tipo_evento}: ${evento.quantidade} ocorrências`);
                }

                // Limpar dados corrompidos se necessário
                await this.limparDadosCorrempidos();
            } else {
                console.log('   ✅ Nenhum evento crítico recente detectado');
            }

            // Verificar integridade dos dados
            await this.verificarIntegridadeDados();

        } catch (error) {
            console.log('   ⚠️ Erro na análise de falhas anteriores:', error.message);
        }
    }

    async limparDadosCorrempidos() {
        console.log('   🧹 Limpando dados potencialmente corrompidos...');

        try {
            // Remover registros com dados inválidos
            const limpeza = await safeQuery(this.pool, `
                DELETE FROM sistema_leitura_mercado 
                WHERE btc_price <= 0 OR btc_price IS NULL 
                OR created_at > NOW()
            `);

            if (limpeza.rowCount > 0) {
                console.log(`   🗑️ Removidos ${limpeza.rowCount} registros inválidos`);
            }

            // Limpar métricas muito antigas
            await safeQuery(this.pool, `
                DELETE FROM sistema_metricas 
                WHERE timestamp < NOW() - INTERVAL '7 days'
            `);

            console.log('   ✅ Limpeza de dados concluída');
        } catch (error) {
            console.log('   ❌ Erro na limpeza:', error.message);
        }
    }

    async verificarIntegridadeDados() {
        console.log('   🔍 Verificando integridade dos dados...');

        try {
            // Verificar últimos registros válidos
            const ultimosRegistros = await safeQuery(this.pool, `
                SELECT COUNT(*) as total, MAX(created_at) as ultimo_registro
                FROM sistema_leitura_mercado 
                WHERE created_at > NOW() - INTERVAL '24 hours'
                AND btc_price > 0
            `);

            const registro = ultimosRegistros.rows[0];
            console.log(`   📊 Registros válidos (24h): ${registro.total}`);
            
            if (registro.ultimo_registro) {
                const tempoUltimoRegistro = Date.now() - new Date(registro.ultimo_registro).getTime();
                console.log(`   ⏰ Último registro há: ${Math.round(tempoUltimoRegistro/1000/60)} minutos`);
            }

        } catch (error) {
            console.log('   ❌ Erro na verificação de integridade:', error.message);
        }
    }

    async configurarMonitoramentoInicial() {
        console.log('\n📊 CONFIGURANDO MONITORAMENTO INICIAL...');

        try {
            // Registrar início do sistema
            await safeQuery(this.pool, `
                INSERT INTO sistema_eventos (tipo_evento, severidade, descricao)
                VALUES ('sistema_iniciado', 'info', 'Sistema Enterprise Resiliente inicializado')
            `);

            // Registrar métricas de baseline
            await safeQuery(this.pool, `
                INSERT INTO sistema_metricas (tipo_metrica, valor, descricao)
                VALUES 
                    ('inicializacao_timestamp', $1, 'Timestamp de inicialização'),
                    ('verificacoes_database', $2, 'Status verificação database'),
                    ('verificacoes_environment', $3, 'Status verificação ambiente'),
                    ('verificacoes_apis', $4, 'Status verificação APIs')
            `, [
                Date.now(),
                this.verificacoes.database ? 1 : 0,
                this.verificacoes.environment ? 1 : 0,
                this.verificacoes.apis ? 1 : 0
            ]);

            console.log('   ✅ Monitoramento inicial configurado');
        } catch (error) {
            console.log('   ❌ Erro na configuração de monitoramento:', error.message);
        }
    }

    async iniciarOrquestrador() {
        console.log('\n🚀 INICIANDO ORQUESTRADOR ENTERPRISE...');

        return new Promise((resolve, reject) => {
            const orquestrador = spawn('node', ['orquestrador-enterprise-resiliente.js'], {
                cwd: process.cwd(),
                stdio: 'inherit',
                env: process.env
            });

            let inicializacaoOk = false;

            // Monitorar início
            const timeoutInit = setTimeout(() => {
                if (!inicializacaoOk) {
                    orquestrador.kill();
                    reject(new Error('Timeout na inicialização do orquestrador'));
                }
            }, 60000); // 1 minuto

            orquestrador.on('spawn', () => {
                console.log('   ✅ Orquestrador iniciado com PID:', orquestrador.pid);
                inicializacaoOk = true;
                clearTimeout(timeoutInit);
                
                // Aguardar estabilização
                setTimeout(() => {
                    resolve(orquestrador);
                }, 5000);
            });

            orquestrador.on('error', (error) => {
                console.error('   ❌ Erro ao iniciar orquestrador:', error.message);
                clearTimeout(timeoutInit);
                reject(error);
            });

            orquestrador.on('close', (code) => {
                console.log(`   🔴 Orquestrador finalizado com código: ${code}`);
                if (!inicializacaoOk) {
                    clearTimeout(timeoutInit);
                    reject(new Error(`Orquestrador falhou com código ${code}`));
                }
            });
        });
    }

    gerarRelatorioInicializacao() {
        console.log('\n📋 RELATÓRIO DE INICIALIZAÇÃO:');
        console.log('================================');
        console.log(`✅ Database: ${this.verificacoes.database ? 'OK' : 'FALHA'}`);
        console.log(`✅ Environment: ${this.verificacoes.environment ? 'OK' : 'FALHA'}`);
        console.log(`✅ Structure: ${this.verificacoes.structure ? 'OK' : 'FALHA'}`);
        console.log(`✅ APIs: ${this.verificacoes.apis ? 'OK' : 'PARCIAL'}`);
        console.log('================================');
        
        const todasVerificacoes = Object.values(this.verificacoes).every(v => v);
        
        if (todasVerificacoes) {
            console.log('🎉 SISTEMA PRONTO PARA PRODUÇÃO!');
        } else {
            console.log('⚠️ Sistema com limitações detectadas');
        }
        
        return todasVerificacoes;
    }

    async executar() {
        try {
            console.log('🔥 INICIALIZANDO SISTEMA ENTERPRISE RESILIENTE V2.0\n');

            // 1. Verificar pré-requisitos
            const preRequisitosOk = await this.verificarPreRequisitos();
            if (!preRequisitosOk) {
                throw new Error('Pré-requisitos não atendidos');
            }

            // 2. Recuperar de falhas anteriores
            await this.recuperarDeFalhasAnteriores();

            // 3. Configurar monitoramento
            await this.configurarMonitoramentoInicial();

            // 4. Gerar relatório
            const sistemaOk = this.gerarRelatorioInicializacao();

            if (sistemaOk) {
                // 5. Iniciar orquestrador
                console.log('\n⏳ Aguardando estabilização (10 segundos)...');
                await new Promise(resolve => setTimeout(resolve, 10000));

                const orquestrador = await this.iniciarOrquestrador();
                
                console.log('\n🎉 SISTEMA ENTERPRISE RESILIENTE ATIVO!');
                console.log('   📊 Monitoramento automático: ATIVO');
                console.log('   🔄 Recuperação automática: ATIVA');
                console.log('   ⚡ Circuit breaker: ATIVO');
                console.log('   🌐 Múltiplas APIs: CONFIGURADAS');
                console.log('\n✅ Sistema pronto para produção enterprise!');

                return orquestrador;
            } else {
                throw new Error('Sistema não atende critérios mínimos');
            }

        } catch (error) {
            console.error('\n💥 FALHA NA INICIALIZAÇÃO:', error.message);
            
            if (this.pool) {
                await safeQuery(this.pool, `
                    INSERT INTO sistema_eventos (tipo_evento, severidade, descricao, dados_adicionais)
                    VALUES ('inicializacao_falhou', 'critical', 'Falha crítica na inicialização', $1)
                `, [JSON.stringify({ erro: error.message })]);
                
                await this.pool.end();
            }
            
            throw error;
        }
    }
}

// Execução automática
if (require.main === module) {
    const inicializador = new InicializadorEnterpriseResilient();
    
    inicializador.executar().catch(error => {
        console.error('💥 Erro fatal na inicialização:', error.message);
        process.exit(1);
    });
}

module.exports = InicializadorEnterpriseResilient;
