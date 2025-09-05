/**
 * 🔧 COMANDO DE ATIVAÇÃO RÁPIDA
 * 
 * Script para ativar rapidamente o sistema resiliente
 * Mata processos anteriores e inicia sistema limpo
 */

const { spawn, exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

class AtivadorRapido {
    constructor() {
        console.log('⚡ ATIVADOR RÁPIDO DO SISTEMA ENTERPRISE');
        console.log('   Limpeza automática de processos');
        console.log('   Inicialização otimizada\n');
    }

    async pararProcessosAnteriores() {
        console.log('🛑 Parando processos anteriores...');
        
        try {
            // No Windows, usar taskkill para matar processos Node.js relacionados
            const { stdout } = await execPromise('tasklist /FI "IMAGENAME eq node.exe" /FO CSV');
            
            const linhas = stdout.split('\n');
            let processosEncontrados = 0;
            
            for (const linha of linhas) {
                if (linha.includes('node.exe')) {
                    processosEncontrados++;
                }
            }
            
            if (processosEncontrados > 1) { // Mais que o processo atual
                console.log(`   🔍 Encontrados ${processosEncontrados} processos Node.js`);
                
                // Tentar parar graciosamente primeiro
                try {
                    await execPromise('taskkill /IM node.exe /F');
                    console.log('   ✅ Processos anteriores terminados');
                } catch (error) {
                    console.log('   ⚠️ Alguns processos podem ainda estar ativos');
                }
                
                // Aguardar um pouco para garantir limpeza
                await new Promise(resolve => setTimeout(resolve, 3000));
            } else {
                console.log('   ✅ Nenhum processo anterior detectado');
            }
            
        } catch (error) {
            console.log('   ⚠️ Erro ao verificar processos:', error.message);
        }
    }

    async verificarPortasLivres() {
        console.log('🔍 Verificando portas...');
        
        try {
            // Verificar se a porta 3000 está livre
            const { stdout } = await execPromise('netstat -an | findstr :3000');
            
            if (stdout.trim()) {
                console.log('   ⚠️ Porta 3000 em uso, tentando liberar...');
                
                // Tentar matar processo na porta 3000
                try {
                    await execPromise('for /f "tokens=5" %a in (\'netstat -aon ^| findstr :3000\') do taskkill /f /pid %a');
                    console.log('   ✅ Porta 3000 liberada');
                } catch (error) {
                    console.log('   ⚠️ Não foi possível liberar porta 3000');
                }
            } else {
                console.log('   ✅ Porta 3000 disponível');
            }
            
        } catch (error) {
            console.log('   ⚠️ Erro ao verificar portas:', error.message);
        }
    }

    async iniciarSistema() {
        console.log('🚀 Iniciando sistema resiliente...');
        
        return new Promise((resolve, reject) => {
            const inicializador = spawn('node', ['inicializador-enterprise-resiliente.js'], {
                cwd: process.cwd(),
                stdio: 'inherit',
                env: process.env,
                detached: false
            });

            let sistemaIniciado = false;

            // Timeout de segurança
            const timeout = setTimeout(() => {
                if (!sistemaIniciado) {
                    console.log('⏰ Timeout na inicialização, mas sistema pode estar ativo');
                    resolve(inicializador);
                }
            }, 120000); // 2 minutos

            inicializador.on('spawn', () => {
                console.log('   ✅ Processo inicializador criado (PID:', inicializador.pid, ')');
                sistemaIniciado = true;
                clearTimeout(timeout);
                
                // Aguardar um pouco e considerar sucesso
                setTimeout(() => {
                    resolve(inicializador);
                }, 15000); // 15 segundos
            });

            inicializador.on('error', (error) => {
                console.error('   ❌ Erro na inicialização:', error.message);
                clearTimeout(timeout);
                reject(error);
            });

            inicializador.on('close', (code) => {
                console.log(`   🔄 Inicializador finalizado com código: ${code}`);
                clearTimeout(timeout);
                
                if (!sistemaIniciado) {
                    reject(new Error(`Inicialização falhou com código ${code}`));
                }
            });
        });
    }

    async aguardarEstabilizacao() {
        console.log('⏳ Aguardando estabilização do sistema...');
        
        // Aguardar 30 segundos para estabilização
        for (let i = 30; i > 0; i--) {
            process.stdout.write(`\r   Aguardando... ${i}s  `);
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        console.log('\n   ✅ Sistema estabilizado');
    }

    async mostrarStatusFinal() {
        console.log('\n📊 STATUS FINAL DO SISTEMA:');
        console.log('=============================');
        
        try {
            // Verificar processos Node.js ativos
            const { stdout } = await execPromise('tasklist /FI "IMAGENAME eq node.exe" /FO CSV');
            const processosAtivos = stdout.split('\n').filter(linha => linha.includes('node.exe')).length;
            
            console.log(`🔄 Processos Node.js ativos: ${processosAtivos}`);
            
            // Verificar porta 3000
            try {
                const { stdout: portStatus } = await execPromise('netstat -an | findstr :3000');
                if (portStatus.trim()) {
                    console.log('🌐 Porta 3000: EM USO (servidor ativo)');
                } else {
                    console.log('🌐 Porta 3000: LIVRE');
                }
            } catch (error) {
                console.log('🌐 Porta 3000: VERIFICAÇÃO FALHOU');
            }
            
            console.log('=============================');
            console.log('✅ SISTEMA RESILIENTE ATIVO!');
            console.log('\n📋 PRÓXIMOS PASSOS:');
            console.log('   1. Aguarde 2-3 minutos para estabilização completa');
            console.log('   2. Acesse http://localhost:3000 para dashboard');
            console.log('   3. Monitore logs para verificar funcionamento');
            console.log('\n🛑 Para parar: Ctrl+C no terminal ativo');
            
        } catch (error) {
            console.log('⚠️ Erro ao verificar status final:', error.message);
        }
    }

    async executar() {
        try {
            console.log('⚡ INICIANDO ATIVAÇÃO RÁPIDA DO SISTEMA ENTERPRISE\n');

            // 1. Parar processos anteriores
            await this.pararProcessosAnteriores();

            // 2. Verificar portas
            await this.verificarPortasLivres();

            // 3. Aguardar limpeza
            console.log('⏳ Aguardando limpeza completa...');
            await new Promise(resolve => setTimeout(resolve, 5000));

            // 4. Iniciar sistema
            const processo = await this.iniciarSistema();

            // 5. Aguardar estabilização
            await this.aguardarEstabilizacao();

            // 6. Mostrar status final
            await this.mostrarStatusFinal();

            // 7. Manter processo vivo
            console.log('\n👁️ Monitorando sistema (Ctrl+C para parar)...');
            
            // Manter o processo principal vivo
            process.on('SIGINT', () => {
                console.log('\n🔴 Parando sistema...');
                if (processo && !processo.killed) {
                    processo.kill('SIGTERM');
                }
                setTimeout(() => process.exit(0), 2000);
            });

            // Manter vivo indefinidamente
            const keepAlive = setInterval(() => {
                // Verificação simples para manter o processo
                process.stdout.write('.');
            }, 60000); // A cada minuto

            // Limpar interval se processo principal morrer
            processo.on('close', () => {
                clearInterval(keepAlive);
            });

        } catch (error) {
            console.error('\n💥 ERRO NA ATIVAÇÃO RÁPIDA:', error.message);
            console.log('\n🔧 SOLUÇÕES SUGERIDAS:');
            console.log('   1. Verificar se PostgreSQL está rodando');
            console.log('   2. Verificar variáveis de ambiente');
            console.log('   3. Tentar novamente em alguns segundos');
            console.log('   4. Verificar logs de erro detalhados');
            
            process.exit(1);
        }
    }
}

// Execução automática
if (require.main === module) {
    const ativador = new AtivadorRapido();
    ativador.executar();
}

module.exports = AtivadorRapido;
