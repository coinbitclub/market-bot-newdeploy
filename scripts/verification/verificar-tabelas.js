require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'process.env.DATABASE_URL',
    ssl: { rejectUnauthorized: false }
});

class LevantamentoCompletoDatabase {
    constructor() {
        this.problemas = [];
        this.warnings = [];
        this.sucessos = [];
        this.tabelasNecessarias = {};
        this.estruturaCompleta = {};
    }

    async executarLevantamentoCompleto() {
        console.log('🔍 LEVANTAMENTO COMPLETO DE PONTA A PONTA');
        console.log('=====================================\n');

        try {
            // 1. Verificar conexão com banco
            await this.verificarConexao();

            // 2. Mapear estrutura atual
            await this.mapearEstruturalAtual();

            // 3. Definir estrutura necessária
            await this.definirEstruturaNecessaria();

            // 4. Identificar gaps críticos
            await this.identificarGapsCriticos();

            // 5. Verificar dados existentes
            await this.verificarDadosExistentes();

            // 6. Analisar fluxo operacional
            await this.analisarFluxoOperacional();

            // 7. Gerar relatório completo
            await this.gerarRelatorioCompleto();

        } catch (error) {
            console.error('💥 ERRO CRÍTICO:', error.message);
            this.problemas.push(`ERRO CRÍTICO: ${error.message}`);
        } finally {
            await pool.end();
        }
    }

    async verificarConexao() {
        console.log('1️⃣ VERIFICANDO CONEXÃO COM BANCO...');
        
        try {
            const result = await pool.query('SELECT NOW() as current_time, version() as pg_version');
            console.log(`   ✅ Conectado: ${result.rows[0].current_time}`);
            console.log(`   📊 PostgreSQL: ${result.rows[0].pg_version.split(' ')[1]}`);
            this.sucessos.push('Conexão com banco estabelecida');
        } catch (error) {
            console.log(`   ❌ Falha na conexão: ${error.message}`);
            this.problemas.push(`Conexão falhou: ${error.message}`);
        }
        console.log('');
    }

    async mapearEstruturalAtual() {
        console.log('2️⃣ MAPEANDO ESTRUTURA ATUAL...');

        try {
            // Listar todas as tabelas
            const tabelas = await pool.query(`
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                ORDER BY table_name
            `);

            console.log(`   📋 ${tabelas.rows.length} tabelas encontradas:`);
            
            for (const tabela of tabelas.rows) {
                const nomeTabela = tabela.table_name;
                
                // Obter colunas de cada tabela
                const colunas = await pool.query(`
                    SELECT column_name, data_type, is_nullable, column_default
                    FROM information_schema.columns 
                    WHERE table_name = $1 
                    ORDER BY ordinal_position
                `, [nomeTabela]);

                this.estruturaCompleta[nomeTabela] = colunas.rows;
                console.log(`      • ${nomeTabela} (${colunas.rows.length} colunas)`);
            }

            this.sucessos.push(`${tabelas.rows.length} tabelas mapeadas`);

        } catch (error) {
            console.log(`   ❌ Erro no mapeamento: ${error.message}`);
            this.problemas.push(`Mapeamento falhou: ${error.message}`);
        }
        console.log('');
    }

    async definirEstruturaNecessaria() {
        console.log('3️⃣ DEFININDO ESTRUTURA NECESSÁRIA PARA OPERAÇÕES...');

        // Definir todas as tabelas necessárias para operação completa
        this.tabelasNecessarias = {
            // === CORE SYSTEM ===
            users: {
                obrigatoria: true,
                descricao: 'Usuários do sistema',
                colunas: [
                    'id', 'username', 'email', 'password_hash',
                    'balance_brl', 'balance_usd', 'trading_active',
                    'account_type', 'exchange_preference', 'risk_level',
                    'max_positions', 'created_at', 'updated_at'
                ]
            },

            // === TRADING CORE ===
            orders: {
                obrigatoria: true,
                descricao: 'Ordens de trading',
                colunas: [
                    'id', 'user_id', 'ticker', 'direction', 'amount',
                    'leverage', 'take_profit', 'stop_loss', 'status',
                    'exchange', 'order_id', 'created_at', 'executed_at',
                    'tp_sl_mandatory'
                ]
            },

            active_positions: {
                obrigatoria: true,
                descricao: 'Posições ativas',
                colunas: [
                    'id', 'user_id', 'order_id', 'ticker', 'direction',
                    'amount', 'entry_price', 'current_price', 'leverage',
                    'take_profit', 'stop_loss', 'pnl', 'status',
                    'exchange', 'exchange_position_id', 'created_at', 'updated_at'
                ]
            },

            // === SIGNAL PROCESSING ===
            signals: {
                obrigatoria: true,
                descricao: 'Sinais recebidos',
                colunas: [
                    'id', 'signal', 'ticker', 'source', 'timestamp',
                    'processed', 'approved', 'reason', 'created_at'
                ]
            },

            signal_metrics_log: {
                obrigatoria: true,
                descricao: 'Log de métricas de sinais',
                colunas: [
                    'id', 'signal', 'ticker', 'source', 'timestamp',
                    'market_direction', 'fear_greed', 'top100_percentage',
                    'ai_approved', 'ai_reason', 'created_at'
                ]
            },

            detailed_signal_tracking: {
                obrigatoria: true,
                descricao: 'Tracking detalhado de sinais',
                colunas: [
                    'id', 'signal', 'ticker', 'source', 'signal_type',
                    'condition_1', 'condition_2', 'condition_3', 'condition_4',
                    'conditions_met', 'min_required', 'final_decision',
                    'decision_reason', 'created_at'
                ]
            },

            // === MARKET ANALYSIS ===
            market_direction_history: {
                obrigatoria: true,
                descricao: 'Histórico de direção do mercado',
                colunas: [
                    'id', 'direction', 'fear_greed', 'top100_percentage',
                    'confidence', 'reason', 'created_at'
                ]
            },

            signal_history: {
                obrigatoria: true,
                descricao: 'Histórico de sinais por ticker',
                colunas: [
                    'id', 'ticker', 'signal_type', 'direction',
                    'source', 'approved', 'created_at'
                ]
            },

            btc_dominance_analysis: {
                obrigatoria: true,
                descricao: 'Análise de dominância do BTC',
                colunas: [
                    'id', 'btc_dominance', 'classification', 'trend',
                    'alerts', 'altcoin_performance', 'created_at'
                ]
            },

            rsi_overheated_log: {
                obrigatoria: true,
                descricao: 'Log de análise RSI',
                colunas: [
                    'id', 'market_overview', 'individual_analysis',
                    'alerts', 'created_at'
                ]
            },

            // === RISK MANAGEMENT ===
            ticker_blocks: {
                obrigatoria: true,
                descricao: 'Bloqueios temporários de tickers',
                colunas: [
                    'id', 'user_id', 'ticker', 'expires_at', 'created_at'
                ]
            },

            market_direction_alerts: {
                obrigatoria: false,
                descricao: 'Alertas de mudança de direção',
                colunas: [
                    'id', 'alert_type', 'severity', 'from_direction',
                    'to_direction', 'details', 'created_at'
                ]
            },

            // === FINANCIAL ===
            user_balances: {
                obrigatoria: false,
                descricao: 'Histórico de saldos',
                colunas: [
                    'id', 'user_id', 'balance_brl', 'balance_usd',
                    'available_brl', 'available_usd', 'created_at'
                ]
            },

            commissions: {
                obrigatoria: false,
                descricao: 'Comissões geradas',
                colunas: [
                    'id', 'user_id', 'order_id', 'commission_amount',
                    'commission_type', 'created_at'
                ]
            }
        };

        console.log(`   📋 ${Object.keys(this.tabelasNecessarias).length} tabelas necessárias definidas`);
        console.log('');
    }

    async identificarGapsCriticos() {
        console.log('4️⃣ IDENTIFICANDO GAPS CRÍTICOS...');

        const tabelasExistentes = Object.keys(this.estruturaCompleta);
        let tabelasFaltantes = [];
        let colunasFaltantes = [];

        for (const [nomeTabela, config] of Object.entries(this.tabelasNecessarias)) {
            if (!tabelasExistentes.includes(nomeTabela)) {
                tabelasFaltantes.push({
                    nome: nomeTabela,
                    obrigatoria: config.obrigatoria,
                    descricao: config.descricao
                });
                
                if (config.obrigatoria) {
                    this.problemas.push(`TABELA CRÍTICA FALTANTE: ${nomeTabela} (${config.descricao})`);
                } else {
                    this.warnings.push(`Tabela opcional faltante: ${nomeTabela}`);
                }
            } else {
                // Verificar colunas
                const colunasExistentes = this.estruturaCompleta[nomeTabela].map(col => col.column_name);
                const colunasNecessarias = config.colunas;

                for (const coluna of colunasNecessarias) {
                    if (!colunasExistentes.includes(coluna)) {
                        colunasFaltantes.push({
                            tabela: nomeTabela,
                            coluna: coluna,
                            obrigatoria: config.obrigatoria
                        });

                        if (config.obrigatoria) {
                            this.problemas.push(`COLUNA CRÍTICA FALTANTE: ${nomeTabela}.${coluna}`);
                        } else {
                            this.warnings.push(`Coluna opcional faltante: ${nomeTabela}.${coluna}`);
                        }
                    }
                }
            }
        }

        console.log(`   ❌ ${tabelasFaltantes.length} tabelas faltantes`);
        console.log(`   ⚠️ ${colunasFaltantes.length} colunas faltantes`);

        // Listar problemas críticos
        if (tabelasFaltantes.length > 0) {
            console.log('\n   📋 TABELAS FALTANTES:');
            tabelasFaltantes.forEach(t => {
                const status = t.obrigatoria ? '❌ CRÍTICA' : '⚠️ OPCIONAL';
                console.log(`      ${status}: ${t.nome} - ${t.descricao}`);
            });
        }

        if (colunasFaltantes.length > 0) {
            console.log('\n   📋 COLUNAS FALTANTES:');
            colunasFaltantes.forEach(c => {
                const status = c.obrigatoria ? '❌ CRÍTICA' : '⚠️ OPCIONAL';
                console.log(`      ${status}: ${c.tabela}.${c.coluna}`);
            });
        }

        console.log('');
    }

    async verificarDadosExistentes() {
        console.log('5️⃣ VERIFICANDO DADOS EXISTENTES...');

        const verificacoes = [
            {
                tabela: 'users',
                query: 'SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE trading_active = true) as ativos FROM users',
                descricao: 'Usuários cadastrados'
            },
            {
                tabela: 'signals',
                query: 'SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE processed = true) as processados FROM signals',
                descricao: 'Sinais recebidos'
            },
            {
                tabela: 'orders',
                query: 'SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status = \'FILLED\') as executadas FROM orders',
                descricao: 'Ordens criadas'
            },
            {
                tabela: 'active_positions',
                query: 'SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status = \'ACTIVE\') as ativas FROM active_positions',
                descricao: 'Posições em carteira'
            }
        ];

        for (const verif of verificacoes) {
            try {
                const result = await pool.query(verif.query);
                const dados = result.rows[0];
                console.log(`   📊 ${verif.descricao}:`);
                
                Object.keys(dados).forEach(key => {
                    console.log(`      ${key}: ${dados[key]}`);
                });

                if (parseInt(dados.total) === 0 && verif.tabela === 'users') {
                    this.problemas.push('NENHUM USUÁRIO CADASTRADO - Sistema não pode operar');
                }

            } catch (error) {
                console.log(`   ❌ Erro ao verificar ${verif.tabela}: ${error.message}`);
                this.problemas.push(`Não foi possível verificar dados de ${verif.tabela}`);
            }
        }
        console.log('');
    }

    async analisarFluxoOperacional() {
        console.log('6️⃣ ANALISANDO FLUXO OPERACIONAL...');

        const fluxos = [
            {
                nome: 'Recepção de Sinais',
                verificacao: async () => {
                    try {
                        // Verificar se existem sinais recentes
                        const result = await pool.query(`
                            SELECT COUNT(*) as count 
                            FROM signals 
                            WHERE created_at > NOW() - INTERVAL '24 hours'
                        `);
                        return {
                            status: parseInt(result.rows[0].count) > 0 ? 'OK' : 'SEM_DADOS',
                            dados: `${result.rows[0].count} sinais nas últimas 24h`
                        };
                    } catch (error) {
                        return { status: 'ERRO', dados: error.message };
                    }
                }
            },
            {
                nome: 'Processamento por IA',
                verificacao: async () => {
                    try {
                        const result = await pool.query(`
                            SELECT 
                                COUNT(*) as total,
                                COUNT(*) FILTER (WHERE ai_approved = true) as aprovados
                            FROM signal_metrics_log 
                            WHERE created_at > NOW() - INTERVAL '24 hours'
                        `);
                        const dados = result.rows[0];
                        return {
                            status: parseInt(dados.total) > 0 ? 'OK' : 'SEM_DADOS',
                            dados: `${dados.aprovados}/${dados.total} aprovados nas últimas 24h`
                        };
                    } catch (error) {
                        return { status: 'ERRO', dados: error.message };
                    }
                }
            },
            {
                nome: 'Criação de Ordens',
                verificacao: async () => {
                    try {
                        const result = await pool.query(`
                            SELECT COUNT(*) as count 
                            FROM orders 
                            WHERE created_at > NOW() - INTERVAL '24 hours'
                        `);
                        return {
                            status: parseInt(result.rows[0].count) > 0 ? 'OK' : 'SEM_OPERACOES',
                            dados: `${result.rows[0].count} ordens nas últimas 24h`
                        };
                    } catch (error) {
                        return { status: 'ERRO', dados: error.message };
                    }
                }
            },
            {
                nome: 'Execução em Exchange',
                verificacao: async () => {
                    try {
                        const result = await pool.query(`
                            SELECT 
                                COUNT(*) as total,
                                COUNT(*) FILTER (WHERE status = 'FILLED') as executadas
                            FROM orders 
                            WHERE created_at > NOW() - INTERVAL '24 hours'
                        `);
                        const dados = result.rows[0];
                        return {
                            status: parseInt(dados.executadas) > 0 ? 'OK' : 'NAO_EXECUTANDO',
                            dados: `${dados.executadas}/${dados.total} executadas nas últimas 24h`
                        };
                    } catch (error) {
                        return { status: 'ERRO', dados: error.message };
                    }
                }
            }
        ];

        for (const fluxo of fluxos) {
            const resultado = await fluxo.verificacao();
            const statusIcon = {
                'OK': '✅',
                'SEM_DADOS': '⚠️',
                'SEM_OPERACOES': '❌',
                'NAO_EXECUTANDO': '🔴',
                'ERRO': '💥'
            }[resultado.status] || '❓';

            console.log(`   ${statusIcon} ${fluxo.nome}: ${resultado.dados}`);

            if (resultado.status === 'SEM_OPERACOES' || resultado.status === 'NAO_EXECUTANDO') {
                this.problemas.push(`${fluxo.nome}: ${resultado.dados}`);
            } else if (resultado.status === 'ERRO') {
                this.problemas.push(`ERRO em ${fluxo.nome}: ${resultado.dados}`);
            }
        }
        console.log('');
    }

    async gerarRelatorioCompleto() {
        console.log('7️⃣ RELATÓRIO COMPLETO DE PRONTIDÃO OPERACIONAL');
        console.log('============================================\n');

        // Status geral
        const statusGeral = this.problemas.length === 0 ? 'PRONTO' : 
                          this.problemas.length < 5 ? 'PROBLEMAS_MENORES' : 'CRITICO';

        const statusIcon = {
            'PRONTO': '🎉 SISTEMA PRONTO PARA OPERAÇÃO',
            'PROBLEMAS_MENORES': '⚠️ SISTEMA COM PROBLEMAS MENORES',
            'CRITICO': '🚨 SISTEMA COM PROBLEMAS CRÍTICOS'
        }[statusGeral];

        console.log(statusIcon);
        console.log('');

        // Sucessos
        if (this.sucessos.length > 0) {
            console.log('✅ COMPONENTES FUNCIONANDO:');
            this.sucessos.forEach(sucesso => {
                console.log(`   • ${sucesso}`);
            });
            console.log('');
        }

        // Problemas críticos
        if (this.problemas.length > 0) {
            console.log('❌ PROBLEMAS CRÍTICOS (IMPEDEM OPERAÇÃO):');
            this.problemas.forEach(problema => {
                console.log(`   • ${problema}`);
            });
            console.log('');
        }

        // Warnings
        if (this.warnings.length > 0) {
            console.log('⚠️ AVISOS (NÃO IMPEDEM OPERAÇÃO):');
            this.warnings.forEach(warning => {
                console.log(`   • ${warning}`);
            });
            console.log('');
        }

        // Ações necessárias
        if (this.problemas.length > 0) {
            console.log('🔧 AÇÕES NECESSÁRIAS PARA OPERAÇÃO:');
            console.log('   1. Executar script de correção das tabelas faltantes');
            console.log('   2. Criar usuários de teste com saldos adequados');
            console.log('   3. Configurar variáveis de ambiente (ENABLE_REAL_TRADING=true)');
            console.log('   4. Testar fluxo completo com sinal real');
            console.log('   5. Validar execução de ordens nas exchanges');
            console.log('');
        }

        // Próximos passos
        console.log('📋 PRÓXIMOS PASSOS:');
        if (statusGeral === 'PRONTO') {
            console.log('   • Sistema pronto! Iniciar operação real');
            console.log('   • Monitorar dashboards em tempo real');
            console.log('   • Configurar alertas de monitoramento');
        } else {
            console.log('   • Executar correções identificadas');
            console.log('   • Re-executar este levantamento');
            console.log('   • Testar fluxo completo após correções');
        }

        console.log('\n=====================================');
        console.log('LEVANTAMENTO COMPLETO FINALIZADO');
        console.log('=====================================');
    }
}

async function verificarTabelas() {
    const levantamento = new LevantamentoCompletoDatabase();
    await levantamento.executarLevantamentoCompleto();
}

verificarTabelas();


module.exports = LevantamentoCompletoDatabase;
