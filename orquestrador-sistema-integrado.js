/**
 * 🎯 ORQUESTRADOR PRINCIPAL - SISTEMA INTEGRADO
 * 
 * Responsável por:
 * 1. Ativar Sistema de Leitura do Mercado (15 min)
 * 2. Monitorar AI Analysis
 * 3. Garantir sincronização de dados
 * 4. Orquestrar operações automáticas
 */

const { createRobustPool, safeQuery } = require('./fixed-database-config.js');
const { spawn } = require('child_process');
const path = require('path');

class OrquestradorSistemaIntegrado {
    constructor() {
        this.pool = createRobustPool();
        this.sistemaLeituraProcess = null;
        this.isRunning = false;
        this.monitoringInterval = null;
        this.startTime = new Date();
        
        console.log('🎯 ORQUESTRADOR SISTEMA INTEGRADO INICIALIZANDO...');
    }

    // 1. Iniciar sistema completo
    async iniciarSistema() {
        try {
            console.log('\n🚀 INICIANDO SISTEMA INTEGRADO...\n');
            
            // Verificar se banco está pronto
            await this.verificarBancoDados();
            
            // Criar tabelas necessárias
            await this.criarTabelasNecessarias();
            
            // Iniciar sistema de leitura do mercado
            await this.iniciarSistemaLeitura();
            
            // Iniciar monitoramento
            this.iniciarMonitoramento();
            
            this.isRunning = true;
            console.log('✅ SISTEMA INTEGRADO ATIVO!\n');
            
            // Log de sistema
            await this.logSistema('ORQUESTRADOR', 'Sistema integrado iniciado com sucesso', 'INFO');
            
        } catch (error) {
            console.error('❌ Erro ao iniciar sistema:', error.message);
            await this.logSistema('ORQUESTRADOR', `Erro ao iniciar: ${error.message}`, 'ERROR');
        }
    }

    // 2. Verificar banco de dados
    async verificarBancoDados() {
        console.log('🔍 Verificando conectividade do banco...');
        
        const testQuery = await safeQuery(this.pool, 'SELECT NOW() as current_time');
        if (testQuery.rows.length === 0) {
            throw new Error('Falha na conectividade do banco de dados');
        }
        
        console.log('✅ Banco de dados conectado');
    }

    // 3. Criar tabelas necessárias
    async criarTabelasNecessarias() {
        console.log('📊 Verificando estrutura das tabelas...');
        
        // Tabela de sistema de leitura
        await safeQuery(this.pool, `
            CREATE TABLE IF NOT EXISTS sistema_leitura_mercado (
                id SERIAL PRIMARY KEY,
                cycle_id VARCHAR(50),
                cycle_number INTEGER,
                fear_greed_value INTEGER,
                fear_greed_classification VARCHAR(50),
                market_direction VARCHAR(50),
                final_recommendation VARCHAR(50),
                btc_dominance DECIMAL(10,2),
                btc_price DECIMAL(20,8),
                confidence_level INTEGER,
                timestamp TIMESTAMP DEFAULT NOW(),
                status VARCHAR(20) DEFAULT 'ATIVO'
            )
        `);
        
        // Tabela de monitoramento do orquestrador
        await safeQuery(this.pool, `
            CREATE TABLE IF NOT EXISTS orquestrador_monitoring (
                id SERIAL PRIMARY KEY,
                component VARCHAR(100),
                status VARCHAR(50),
                last_check TIMESTAMP,
                last_update TIMESTAMP,
                cycles_completed INTEGER DEFAULT 0,
                errors_count INTEGER DEFAULT 0,
                uptime_seconds INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);
        
        // Tabela de logs do sistema
        await safeQuery(this.pool, `
            CREATE TABLE IF NOT EXISTS system_logs (
                id SERIAL PRIMARY KEY,
                component VARCHAR(100),
                message TEXT,
                level VARCHAR(20),
                details TEXT,
                timestamp TIMESTAMP DEFAULT NOW()
            )
        `);
        
        console.log('✅ Estrutura das tabelas verificada');
    }

    // 4. Iniciar sistema de leitura do mercado
    async iniciarSistemaLeitura() {
        console.log('📈 Iniciando Sistema de Leitura do Mercado...');
        
        const sistemaPath = path.join(__dirname, 'sistema-leitura-mercado-enterprise.js');
        
        this.sistemaLeituraProcess = spawn('node', [sistemaPath], {
            cwd: __dirname,
            stdio: ['pipe', 'pipe', 'pipe'],
            env: { ...process.env }
        });
        
        this.sistemaLeituraProcess.stdout.on('data', (data) => {
            console.log(`[SISTEMA-LEITURA] ${data.toString().trim()}`);
        });
        
        this.sistemaLeituraProcess.stderr.on('data', (data) => {
            console.error(`[SISTEMA-LEITURA] ERROR: ${data.toString().trim()}`);
        });
        
        this.sistemaLeituraProcess.on('close', (code) => {
            console.log(`[SISTEMA-LEITURA] Processo finalizado com código: ${code}`);
            
            // Reiniciar automaticamente se necessário
            if (this.isRunning && code !== 0) {
                console.log('🔄 Reiniciando Sistema de Leitura em 30 segundos...');
                setTimeout(() => {
                    this.iniciarSistemaLeitura();
                }, 30000);
            }
        });
        
        console.log('✅ Sistema de Leitura iniciado');
        
        // Aguardar alguns segundos para verificar se iniciou corretamente
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        if (this.sistemaLeituraProcess.exitCode !== null) {
            throw new Error('Sistema de Leitura falhou ao iniciar');
        }
    }

    // 5. Monitoramento contínuo
    iniciarMonitoramento() {
        console.log('👁️ Iniciando monitoramento contínuo...');
        
        this.monitoringInterval = setInterval(async () => {
            await this.executarMonitoramento();
        }, 60000); // Monitorar a cada 1 minuto
        
        console.log('✅ Monitoramento ativo (intervalo: 1 minuto)');
    }

    // 6. Executar ciclo de monitoramento
    async executarMonitoramento() {
        try {
            const agora = new Date();
            
            // Verificar sistema de leitura
            const ultimoRegistro = await safeQuery(this.pool, `
                SELECT timestamp, fear_greed_value, final_recommendation
                FROM sistema_leitura_mercado 
                ORDER BY timestamp DESC 
                LIMIT 1
            `);
            
            const tempoSemAtualizacao = ultimoRegistro.rows.length > 0 
                ? (agora - new Date(ultimoRegistro.rows[0].timestamp)) / 1000 / 60 
                : 999;
            
            // Verificar se sistema está funcionando (última atualização < 20 minutos)
            const sistemaAtivo = tempoSemAtualizacao < 20;
            
            // Atualizar monitoramento
            await safeQuery(this.pool, `
                INSERT INTO orquestrador_monitoring (
                    component, status, last_check, last_update, uptime_seconds
                ) VALUES (
                    'SISTEMA_LEITURA_MERCADO',
                    $1,
                    NOW(),
                    $2,
                    $3
                )
            `, [
                sistemaAtivo ? 'ATIVO' : 'INATIVO',
                ultimoRegistro.rows.length > 0 ? ultimoRegistro.rows[0].timestamp : null,
                Math.floor((agora - this.startTime) / 1000)
            ]);
            
            // Log de status
            if (sistemaAtivo) {
                console.log(`📊 [${agora.toISOString()}] Sistema funcionando - Último F&G: ${ultimoRegistro.rows[0]?.fear_greed_value}, Recomendação: ${ultimoRegistro.rows[0]?.final_recommendation}`);
            } else {
                console.log(`⚠️ [${agora.toISOString()}] Sistema inativo - Última atualização há ${Math.floor(tempoSemAtualizacao)} minutos`);
                
                // Tentar reiniciar se necessário
                if (tempoSemAtualizacao > 30) {
                    console.log('🔄 Reiniciando sistema de leitura...');
                    await this.reiniciarSistemaLeitura();
                }
            }
            
        } catch (error) {
            console.error('❌ Erro no monitoramento:', error.message);
            await this.logSistema('MONITORAMENTO', `Erro no monitoramento: ${error.message}`, 'ERROR');
        }
    }

    // 7. Reiniciar sistema de leitura
    async reiniciarSistemaLeitura() {
        try {
            if (this.sistemaLeituraProcess) {
                this.sistemaLeituraProcess.kill();
                await new Promise(resolve => setTimeout(resolve, 5000));
            }
            
            await this.iniciarSistemaLeitura();
            await this.logSistema('ORQUESTRADOR', 'Sistema de leitura reiniciado', 'INFO');
            
        } catch (error) {
            console.error('❌ Erro ao reiniciar sistema:', error.message);
            await this.logSistema('ORQUESTRADOR', `Erro ao reiniciar: ${error.message}`, 'ERROR');
        }
    }

    // 8. Log do sistema
    async logSistema(component, message, level = 'INFO') {
        try {
            await safeQuery(this.pool, `
                INSERT INTO system_logs (component, message, level, timestamp)
                VALUES ($1, $2, $3, NOW())
            `, [component, message, level]);
        } catch (error) {
            console.error('Erro ao salvar log:', error.message);
        }
    }

    // 9. Status do sistema
    async getStatus() {
        try {
            const sistemaStatus = await safeQuery(this.pool, `
                SELECT 
                    COUNT(*) as total_registros,
                    MAX(timestamp) as ultima_atualizacao,
                    MAX(fear_greed_value) as ultimo_fear_greed,
                    MAX(final_recommendation) as ultima_recomendacao
                FROM sistema_leitura_mercado 
                WHERE timestamp >= NOW() - INTERVAL '24 hours'
            `);
            
            const monitoramento = await safeQuery(this.pool, `
                SELECT component, status, last_check, uptime_seconds
                FROM orquestrador_monitoring 
                ORDER BY last_check DESC 
                LIMIT 5
            `);
            
            return {
                orquestrador_ativo: this.isRunning,
                sistema_leitura: {
                    registros_24h: sistemaStatus.rows[0]?.total_registros || 0,
                    ultima_atualizacao: sistemaStatus.rows[0]?.ultima_atualizacao,
                    ultimo_fear_greed: sistemaStatus.rows[0]?.ultimo_fear_greed,
                    ultima_recomendacao: sistemaStatus.rows[0]?.ultima_recomendacao
                },
                monitoramento: monitoramento.rows,
                uptime_segundos: Math.floor((new Date() - this.startTime) / 1000)
            };
        } catch (error) {
            return { erro: error.message };
        }
    }

    // 10. Parar sistema
    async pararSistema() {
        console.log('🛑 Parando sistema integrado...');
        
        this.isRunning = false;
        
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
        }
        
        if (this.sistemaLeituraProcess) {
            this.sistemaLeituraProcess.kill();
        }
        
        await this.logSistema('ORQUESTRADOR', 'Sistema integrado parado', 'INFO');
        await this.pool.end();
        
        console.log('✅ Sistema parado');
    }
}

// Iniciar orquestrador se executado diretamente
if (require.main === module) {
    const orquestrador = new OrquestradorSistemaIntegrado();
    
    orquestrador.iniciarSistema().catch(error => {
        console.error('❌ Falha ao iniciar orquestrador:', error.message);
        process.exit(1);
    });
    
    // Graceful shutdown
    process.on('SIGINT', async () => {
        console.log('\n📛 Recebido sinal de parada...');
        await orquestrador.pararSistema();
        process.exit(0);
    });
    
    process.on('SIGTERM', async () => {
        console.log('\n📛 Recebido sinal de término...');
        await orquestrador.pararSistema();
        process.exit(0);
    });
}

module.exports = OrquestradorSistemaIntegrado;
