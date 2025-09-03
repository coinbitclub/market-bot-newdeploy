/**
 * 🔥 ORQUESTRADOR ENTERPRISE RESILIENTE V2.0
 * 
 * Sistema de orquestração melhorado com:
 * - Detecção automática de falhas críticas
 * - Restart inteligente baseado em métricas
 * - Monitoramento de saúde em tempo real
 * - Circuit breaker integrado
 */

const { spawn } = require('child_process');
const { createRobustPool, safeQuery } = require('./fixed-database-config');

class OrquestradorEnterpriseResilient {
    constructor() {
        this.pool = createRobustPool();
        this.sistemaLeitura = null;
        this.ultimaAtividade = Date.now();
        this.contadorReinicializacoes = 0;
        this.metricas = {
            uptime: Date.now(),
            ciclosExecutados: 0,
            falhasDetectadas: 0,
            reinicializacoes: 0,
            ultimoSucesso: null
        };
        
        // Configurações melhoradas
        this.config = {
            timeoutInatividade: 3 * 60 * 1000, // 3 minutos
            intervalMonitoramento: 30 * 1000,  // 30 segundos
            maxReinicializacoes: 10,
            intervalLimpezaLogs: 5 * 60 * 1000, // 5 minutos
            limiteLinhasLog: 1000
        };

        console.log('🚀 Orquestrador Enterprise Resiliente V2.0 Iniciado');
        this.inicializarMonitoramento();
    }

    async inicializarMonitoramento() {
        try {
            // Tabela de métricas do sistema
            await safeQuery(this.pool, `
                CREATE TABLE IF NOT EXISTS sistema_metricas (
                    id SERIAL PRIMARY KEY,
                    tipo_metrica VARCHAR(50),
                    valor DECIMAL(20,8),
                    descricao TEXT,
                    timestamp TIMESTAMP DEFAULT NOW()
                )
            `);

            // Tabela de eventos do sistema
            await safeQuery(this.pool, `
                CREATE TABLE IF NOT EXISTS sistema_eventos (
                    id SERIAL PRIMARY KEY,
                    tipo_evento VARCHAR(50),
                    severidade VARCHAR(20),
                    descricao TEXT,
                    dados_adicionais JSONB,
                    timestamp TIMESTAMP DEFAULT NOW()
                )
            `);

            console.log('✅ Sistema de monitoramento inicializado');
        } catch (error) {
            console.error('❌ Erro ao inicializar monitoramento:', error.message);
        }
    }

    async registrarEvento(tipo, severidade, descricao, dadosAdicionais = {}) {
        try {
            await safeQuery(this.pool, `
                INSERT INTO sistema_eventos (tipo_evento, severidade, descricao, dados_adicionais)
                VALUES ($1, $2, $3, $4)
            `, [tipo, severidade, descricao, JSON.stringify(dadosAdicionais)]);
        } catch (error) {
            console.error('❌ Erro ao registrar evento:', error.message);
        }
    }

    async registrarMetrica(tipo, valor, descricao) {
        try {
            await safeQuery(this.pool, `
                INSERT INTO sistema_metricas (tipo_metrica, valor, descricao)
                VALUES ($1, $2, $3)
            `, [tipo, valor, descricao]);
        } catch (error) {
            console.error('❌ Erro ao registrar métrica:', error.message);
        }
    }

    async analisarSaudeSistema() {
        try {
            // Verificar últimos dados salvos
            const ultimosDados = await safeQuery(this.pool, `
                SELECT COUNT(*) as registros_recentes, MAX(created_at) as ultimo_registro
                FROM sistema_leitura_mercado 
                WHERE created_at > NOW() - INTERVAL '10 minutes'
            `);

            // Verificar APIs funcionais
            const apisStatus = await safeQuery(this.pool, `
                SELECT 
                    COUNT(DISTINCT api_name) as total_apis,
                    COUNT(CASE WHEN status = 'success' THEN 1 END) as apis_funcionais
                FROM api_monitoring 
                WHERE last_check > NOW() - INTERVAL '5 minutes'
            `);

            // Verificar erros recentes
            const errosRecentes = await safeQuery(this.pool, `
                SELECT COUNT(*) as erros
                FROM sistema_eventos 
                WHERE severidade IN ('error', 'critical') 
                AND timestamp > NOW() - INTERVAL '5 minutes'
            `);

            const saude = {
                dados_recentes: parseInt(ultimosDados.rows[0]?.registros_recentes || 0),
                ultimo_registro: ultimosDados.rows[0]?.ultimo_registro,
                apis_funcionais: parseInt(apisStatus.rows[0]?.apis_funcionais || 0),
                total_apis: parseInt(apisStatus.rows[0]?.total_apis || 0),
                erros_recentes: parseInt(errosRecentes.rows[0]?.erros || 0),
                status: 'unknown'
            };

            // Determinar status da saúde
            if (saude.dados_recentes > 0 && saude.apis_funcionais > 0) {
                saude.status = 'healthy';
            } else if (saude.apis_funcionais > 0 || saude.dados_recentes > 0) {
                saude.status = 'degraded';
            } else {
                saude.status = 'critical';
            }

            return saude;
        } catch (error) {
            console.error('❌ Erro ao analisar saúde do sistema:', error.message);
            return { status: 'error', erro: error.message };
        }
    }

    async iniciarSistemaLeitura() {
        return new Promise((resolve, reject) => {
            console.log('🔄 Iniciando Sistema de Leitura Resiliente...');

            this.sistemaLeitura = spawn('node', ['sistema-leitura-mercado-resiliente.js'], {
                cwd: process.cwd(),
                stdio: ['pipe', 'pipe', 'pipe'],
                env: process.env
            });

            let inicializacaoCompleta = false;

            // Monitorar saída padrão
            this.sistemaLeitura.stdout.on('data', (data) => {
                const output = data.toString();
                console.log(`[LEITURA] ${output.trim()}`);

                // Detectar inicialização bem-sucedida
                if (output.includes('SISTEMA RESILIENTE INICIADO') && !inicializacaoCompleta) {
                    inicializacaoCompleta = true;
                    this.ultimaAtividade = Date.now();
                    resolve(true);
                }

                // Detectar atividade do sistema
                if (output.includes('CICLO') || output.includes('Dados obtidos')) {
                    this.ultimaAtividade = Date.now();
                    this.metricas.ciclosExecutados++;
                    this.metricas.ultimoSucesso = Date.now();
                }

                // Detectar falhas críticas
                if (output.includes('Circuit Breaker ATIVADO') || 
                    output.includes('Todas as APIs falharam')) {
                    this.metricas.falhasDetectadas++;
                    this.registrarEvento('falha_critica', 'warning', 'Sistema detectou falhas múltiplas');
                }
            });

            // Monitorar erros
            this.sistemaLeitura.stderr.on('data', (data) => {
                const error = data.toString();
                console.error(`[LEITURA-ERROR] ${error.trim()}`);
                
                if (error.includes('timeout') || error.includes('ECONNRESET')) {
                    this.metricas.falhasDetectadas++;
                    this.registrarEvento('erro_conexao', 'error', 'Erro de conectividade detectado', { erro: error.trim() });
                }
            });

            // Monitorar saída do processo
            this.sistemaLeitura.on('close', (code) => {
                console.log(`🔴 Sistema de Leitura finalizado com código: ${code}`);
                this.sistemaLeitura = null;
                
                this.registrarEvento('sistema_parado', code === 0 ? 'info' : 'error', 
                    `Sistema finalizado com código ${code}`);

                if (!inicializacaoCompleta) {
                    reject(new Error(`Sistema falhou ao inicializar (código: ${code})`));
                }
            });

            // Timeout para inicialização
            setTimeout(() => {
                if (!inicializacaoCompleta) {
                    reject(new Error('Timeout na inicialização do sistema'));
                }
            }, 30000); // 30 segundos
        });
    }

    async pararSistemaLeitura() {
        if (this.sistemaLeitura) {
            console.log('🛑 Parando Sistema de Leitura...');
            this.sistemaLeitura.kill('SIGTERM');
            
            // Aguardar término gracioso
            await new Promise((resolve) => {
                const timeout = setTimeout(() => {
                    console.log('⚡ Forçando parada do sistema...');
                    this.sistemaLeitura.kill('SIGKILL');
                    resolve();
                }, 10000);

                this.sistemaLeitura.on('close', () => {
                    clearTimeout(timeout);
                    resolve();
                });
            });

            this.sistemaLeitura = null;
        }
    }

    async monitorarSistema() {
        const agora = Date.now();
        const tempoInatividade = agora - this.ultimaAtividade;

        console.log(`\n🔍 [MONITOR] Verificando saúde do sistema...`);
        console.log(`   ⏱️ Última atividade: ${Math.round(tempoInatividade/1000)}s atrás`);
        console.log(`   📊 Ciclos executados: ${this.metricas.ciclosExecutados}`);
        console.log(`   ⚠️ Falhas detectadas: ${this.metricas.falhasDetectadas}`);
        console.log(`   🔄 Reinicializações: ${this.metricas.reinicializacoes}`);

        // Analisar saúde do sistema
        const saude = await this.analisarSaudeSistema();
        console.log(`   💚 Status da saúde: ${saude.status}`);
        console.log(`   📝 Dados recentes: ${saude.dados_recentes}`);
        console.log(`   🌐 APIs funcionais: ${saude.apis_funcionais}/${saude.total_apis}`);

        // Registrar métricas
        await this.registrarMetrica('tempo_inatividade', tempoInatividade, 'Tempo desde última atividade');
        await this.registrarMetrica('ciclos_executados', this.metricas.ciclosExecutados, 'Total de ciclos executados');
        await this.registrarMetrica('uptime', agora - this.metricas.uptime, 'Tempo de funcionamento do orquestrador');

        // Decidir se precisa reiniciar
        const precisaReiniciar = this.avaliarNecessidadeReinicio(tempoInatividade, saude);

        if (precisaReiniciar) {
            await this.reiniciarSistemaInteligente();
        }

        // Limpar logs antigos periodicamente
        if (this.metricas.ciclosExecutados % 20 === 0) {
            await this.limparLogsAntigos();
        }
    }

    avaliarNecessidadeReinicio(tempoInatividade, saude) {
        // Não reiniciar se já foi reiniciado muitas vezes
        if (this.metricas.reinicializacoes >= this.config.maxReinicializacoes) {
            console.log('⚠️ Limite de reinicializações atingido. Aguardando intervenção manual.');
            return false;
        }

        // Reiniciar se inativo por muito tempo
        if (tempoInatividade > this.config.timeoutInatividade) {
            console.log('⏰ Sistema inativo por muito tempo. Reinicialização necessária.');
            return true;
        }

        // Reiniciar se saúde crítica
        if (saude.status === 'critical' && saude.erros_recentes > 5) {
            console.log('🚨 Saúde do sistema crítica. Reinicialização necessária.');
            return true;
        }

        // Reiniciar se muitas falhas detectadas
        if (this.metricas.falhasDetectadas > 10) {
            console.log('💥 Muitas falhas detectadas. Reinicialização preventiva.');
            return true;
        }

        return false;
    }

    async reiniciarSistemaInteligente() {
        console.log('\n🔄 INICIANDO REINICIALIZAÇÃO INTELIGENTE...');
        
        this.metricas.reinicializacoes++;
        await this.registrarEvento('reinicializacao', 'info', 
            `Reinicialização automática #${this.metricas.reinicializacoes}`);

        try {
            // Parar sistema atual
            await this.pararSistemaLeitura();
            
            // Aguardar estabilização
            console.log('⏳ Aguardando estabilização (10s)...');
            await new Promise(resolve => setTimeout(resolve, 10000));

            // Reiniciar sistema
            await this.iniciarSistemaLeitura();
            
            // Reset métricas
            this.ultimaAtividade = Date.now();
            this.metricas.falhasDetectadas = 0;
            
            console.log('✅ Reinicialização concluída com sucesso!');
            
        } catch (error) {
            console.error('❌ Falha na reinicialização:', error.message);
            await this.registrarEvento('reinicializacao_falhou', 'error', 
                'Falha na reinicialização automática', { erro: error.message });
        }
    }

    async limparLogsAntigos() {
        try {
            // Limpar métricas antigas (manter últimas 24h)
            await safeQuery(this.pool, `
                DELETE FROM sistema_metricas 
                WHERE timestamp < NOW() - INTERVAL '24 hours'
            `);

            // Limpar eventos antigos (manter últimas 48h)
            await safeQuery(this.pool, `
                DELETE FROM sistema_eventos 
                WHERE timestamp < NOW() - INTERVAL '48 hours'
            `);

            console.log('🧹 Limpeza de logs antigos concluída');
        } catch (error) {
            console.error('❌ Erro na limpeza de logs:', error.message);
        }
    }

    async obterStatusCompleto() {
        const saude = await this.analisarSaudeSistema();
        
        return {
            orquestrador: {
                ativo: true,
                uptime: Date.now() - this.metricas.uptime,
                reinicializacoes: this.metricas.reinicializacoes,
                ultima_atividade: this.ultimaAtividade
            },
            sistema_leitura: {
                ativo: this.sistemaLeitura !== null,
                ciclos_executados: this.metricas.ciclosExecutados,
                falhas_detectadas: this.metricas.falhasDetectadas,
                ultimo_sucesso: this.metricas.ultimoSucesso
            },
            saude_sistema: saude,
            timestamp: Date.now()
        };
    }

    async iniciar() {
        console.log('\n🚀 INICIANDO ORQUESTRADOR ENTERPRISE RESILIENTE V2.0');
        
        try {
            // Registrar início
            await this.registrarEvento('orquestrador_iniciado', 'info', 
                'Orquestrador Enterprise iniciado com sucesso');

            // Iniciar sistema de leitura
            await this.iniciarSistemaLeitura();
            
            // Iniciar monitoramento
            console.log('👁️ Iniciando monitoramento inteligente...');
            setInterval(() => {
                this.monitorarSistema().catch(error => {
                    console.error('❌ Erro no monitoramento:', error.message);
                });
            }, this.config.intervalMonitoramento);

            console.log('✅ ORQUESTRADOR ENTERPRISE ATIVO E MONITORANDO!');
            console.log(`   📊 Intervalo de monitoramento: ${this.config.intervalMonitoramento/1000}s`);
            console.log(`   ⏰ Timeout de inatividade: ${this.config.timeoutInatividade/1000}s`);
            console.log(`   🔄 Máx. reinicializações: ${this.config.maxReinicializacoes}`);

        } catch (error) {
            console.error('💥 Falha ao iniciar orquestrador:', error.message);
            await this.registrarEvento('orquestrador_falha', 'critical', 
                'Falha crítica na inicialização', { erro: error.message });
            throw error;
        }
    }

    async parar() {
        console.log('\n🛑 Parando Orquestrador Enterprise...');
        
        await this.registrarEvento('orquestrador_parado', 'info', 
            'Orquestrador parado pelo usuário');
            
        await this.pararSistemaLeitura();
        
        if (this.pool) {
            await this.pool.end();
        }
        
        console.log('✅ Orquestrador parado com segurança');
    }
}

// Inicialização automática
if (require.main === module) {
    const orquestrador = new OrquestradorEnterpriseResilient();
    
    // Tratamento de sinais
    process.on('SIGINT', async () => {
        console.log('\n🔴 Sinal de interrupção recebido...');
        await orquestrador.parar();
        process.exit(0);
    });

    process.on('SIGTERM', async () => {
        console.log('\n🔴 Sinal de término recebido...');
        await orquestrador.parar();
        process.exit(0);
    });

    // Iniciar orquestrador
    orquestrador.iniciar().catch(error => {
        console.error('💥 Erro fatal:', error.message);
        process.exit(1);
    });
}

module.exports = OrquestradorEnterpriseResilient;
