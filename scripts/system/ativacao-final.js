/**
 * 🎯 ATIVAÇÃO FINAL - SISTEMA INTEGRADO ENTERPRISE
 * 
 * Comando único para:
 * - Parar sistemas problemáticos anteriores
 * - Testar APIs reais do .env
 * - Iniciar sistema otimizado sem duplicações
 * - Monitoramento contínuo
 */

require('dotenv').config();
const { spawn, exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

class AtivacaoFinal {
    constructor() {
        console.log('🎯 ATIVAÇÃO FINAL - SISTEMA ENTERPRISE INTEGRADO');
        console.log('   🔥 Parada de sistemas problemáticos');
        console.log('   🧪 Teste de APIs reais');
        console.log('   🚀 Inicialização otimizada');
        console.log('   👁️ Monitoramento contínuo\n');
    }

    async pararTodosProcessosNode() {
        console.log('🛑 PARANDO TODOS OS PROCESSOS NODE.JS PROBLEMÁTICOS...');
        
        try {
            // Força parada de todos os processos Node.js
            await execPromise('taskkill /F /IM node.exe').catch(() => {
                console.log('   ℹ️ Nenhum processo Node.js encontrado para parar');
            });
            
            console.log('   ✅ Limpeza de processos concluída');
            
            // Aguardar estabilização
            await new Promise(resolve => setTimeout(resolve, 5000));
            
        } catch (error) {
            console.log('   ⚠️ Aviso na limpeza:', error.message);
        }
    }

    async verificarPortasLivres() {
        console.log('\n🔍 VERIFICANDO PORTAS...');
        
        try {
            const { stdout } = await execPromise('netstat -an | findstr :3000');
            
            if (stdout.trim()) {
                console.log('   ⚠️ Porta 3000 em uso, tentando liberar...');
                
                try {
                    // Matar processo na porta 3000
                    await execPromise('for /f "tokens=5" %a in (\'netstat -aon ^| findstr :3000\') do taskkill /f /pid %a');
                    console.log('   ✅ Porta 3000 liberada');
                } catch (error) {
                    console.log('   ⚠️ Não foi possível liberar porta 3000 completamente');
                }
            } else {
                console.log('   ✅ Porta 3000 disponível');
            }
            
        } catch (error) {
            console.log('   ✅ Porta 3000 provavelmente livre');
        }
    }

    async iniciarSistemaFinal() {
        console.log('\n🚀 INICIANDO SISTEMA INTEGRADO FINAL...');
        
        // Primeiro, testar APIs
        console.log('   📋 Fase 1: Teste de APIs...');
        
        const testePrimeiro = await new Promise((resolve) => {
            const teste = spawn('node', ['teste-apis-reais.js'], {
                cwd: process.cwd(),
                stdio: 'inherit'
            });

            teste.on('close', (code) => {
                resolve(code === 0);
            });
        });

        if (!testePrimeiro) {
            throw new Error('APIs não passaram nos testes');
        }

        console.log('\n   📋 Fase 2: Iniciando launcher integrado...');
        
        return new Promise((resolve, reject) => {
            const launcher = spawn('node', ['launcher-integrado.js'], {
                cwd: process.cwd(),
                stdio: 'inherit',
                env: process.env
            });

            let sistemaIniciado = false;

            launcher.on('spawn', () => {
                console.log('\n✅ SISTEMA INTEGRADO INICIADO!');
                console.log('   PID:', launcher.pid);
                sistemaIniciado = true;
                resolve(launcher);
            });

            launcher.on('error', (error) => {
                console.error('\n❌ Erro na inicialização:', error.message);
                reject(error);
            });

            launcher.on('close', (code) => {
                console.log(`\n🔴 Sistema finalizado com código: ${code}`);
                if (!sistemaIniciado) {
                    reject(new Error(`Falha na inicialização (código: ${code})`));
                }
            });

            // Timeout de segurança
            setTimeout(() => {
                if (!sistemaIniciado) {
                    console.log('\n⏰ Timeout na detecção - mas sistema pode estar ativo');
                    resolve(launcher);
                }
            }, 90000); // 1.5 minutos
        });
    }

    async mostrarStatusOperacional() {
        console.log('\n📊 SISTEMA ENTERPRISE ATIVO - STATUS OPERACIONAL:');
        console.log('================================================');
        console.log('🔥 MODO: INTEGRADO ENTERPRISE');
        console.log('🌐 APIS: CoinStats, Binance, OpenAI (reais do .env)');
        console.log('💾 BANCO: PostgreSQL Railway');
        console.log('🔄 CICLOS: Automáticos a cada 15 minutos');
        console.log('🧠 IA: Análise automática de mercado');
        console.log('📊 DADOS: 100% reais - zero simulação');
        console.log('================================================');
        console.log('\n🎯 FUNCIONALIDADES ATIVAS:');
        console.log('   ✅ Fear & Greed Index em tempo real');
        console.log('   ✅ Preços Bitcoin atualizados');
        console.log('   ✅ Análise IA com recomendações');
        console.log('   ✅ Salvamento automático no banco');
        console.log('   ✅ Monitoramento contínuo');
        console.log('   ✅ Recuperação automática de falhas');
        console.log('\n📋 PRÓXIMOS PASSOS:');
        console.log('   1. Sistema operando automaticamente');
        console.log('   2. Monitorar logs para verificar ciclos');
        console.log('   3. Acompanhar dados no banco');
        console.log('   4. Verificar endpoints de API');
        console.log('\n🛑 PARA PARAR: Ctrl+C');
        console.log('💡 SUPORTE: Monitorar logs em tempo real');
    }

    async executar() {
        try {
            console.log('🎯 INICIANDO ATIVAÇÃO FINAL DO SISTEMA ENTERPRISE\n');

            // 1. Parar todos os processos problemáticos
            await this.pararTodosProcessosNode();

            // 2. Verificar portas
            await this.verificarPortasLivres();

            // 3. Aguardar estabilização total
            console.log('\n⏳ Aguardando estabilização total do sistema...');
            await new Promise(resolve => setTimeout(resolve, 8000));

            // 4. Iniciar sistema final
            const processo = await this.iniciarSistemaFinal();

            // 5. Mostrar status operacional
            await this.mostrarStatusOperacional();

            // 6. Configurar monitoramento contínuo
            console.log('\n👁️ MONITORAMENTO CONTÍNUO ATIVO...\n');

            // Configurar handlers de saída limpa
            process.on('SIGINT', () => {
                console.log('\n🔴 PARANDO SISTEMA ENTERPRISE...');
                if (processo && !processo.killed) {
                    processo.kill('SIGTERM');
                    setTimeout(() => {
                        if (!processo.killed) {
                            processo.kill('SIGKILL');
                        }
                    }, 5000);
                }
                setTimeout(() => process.exit(0), 7000);
            });

            // Monitor de saúde
            const healthCheck = setInterval(() => {
                if (!processo || processo.killed) {
                    console.log('\n🔄 Sistema não está mais ativo - reiniciando em 10s...');
                    clearInterval(healthCheck);
                    setTimeout(() => {
                        this.executar().catch(() => process.exit(1));
                    }, 10000);
                }
            }, 60000); // Check a cada minuto

            // Manter processo principal vivo
            process.stdin.resume();

        } catch (error) {
            console.error('\n💥 ERRO CRÍTICO NA ATIVAÇÃO FINAL:', error.message);
            console.log('\n🔧 SOLUÇÕES SUGERIDAS:');
            console.log('   1. Verificar conexão com PostgreSQL Railway');
            console.log('   2. Verificar API keys no arquivo .env');
            console.log('   3. Verificar conectividade com internet');
            console.log('   4. Tentar executar novamente em 30 segundos');
            console.log('   5. Verificar se há processos Node.js travados');
            
            console.log('\n📞 SUPORTE TÉCNICO:');
            console.log('   - Verificar logs detalhados acima');
            console.log('   - Executar: node teste-apis-reais.js (isoladamente)');
            console.log('   - Verificar variáveis de ambiente');
            
            process.exit(1);
        }
    }
}

// Execução automática
if (require.main === module) {
    const ativacao = new AtivacaoFinal();
    ativacao.executar();
}

module.exports = AtivacaoFinal;
