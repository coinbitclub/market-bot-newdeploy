#!/usr/bin/env node

/**
 * 🚀 INICIADOR E TESTADOR AUTOMÁTICO - COINBITCLUB
 * ===============================================
 * 
 * Inicia o servidor automaticamente e testa todos os endpoints
 */

const { spawn } = require('child_process');
const axios = require('axios').default;
const fs = require('fs');

console.log('🚀 INICIADOR E TESTADOR AUTOMÁTICO - COINBITCLUB');
console.log('===============================================');
console.log('');

const BASE_URL = 'http://localhost:3000';
let serverProcess = null;

// Função para verificar se o servidor está rodando
async function checkServer() {
    try {
        const response = await axios.get(`${BASE_URL}/health`, { timeout: 3000 });
        return response.status === 200;
    } catch (error) {
        return false;
    }
}

// Função para iniciar o servidor
function startServer() {
    return new Promise((resolve, reject) => {
        console.log('🚀 Iniciando servidor...');
        
        // Tentar diferentes arquivos de entrada
        const entryPoints = ['main.js', 'app.js', 'startup-robusto.js'];
        
        for (const entry of entryPoints) {
            if (fs.existsSync(entry)) {
                console.log(`📍 Usando arquivo de entrada: ${entry}`);
                
                serverProcess = spawn('node', [entry], {
                    stdio: ['pipe', 'pipe', 'pipe'],
                    shell: true
                });
                
                serverProcess.stdout.on('data', (data) => {
                    console.log(`📡 [SERVIDOR]: ${data.toString().trim()}`);
                });
                
                serverProcess.stderr.on('data', (data) => {
                    console.log(`⚠️ [SERVIDOR ERROR]: ${data.toString().trim()}`);
                });
                
                serverProcess.on('close', (code) => {
                    console.log(`🔴 Servidor finalizou com código: ${code}`);
                });
                
                // Aguardar alguns segundos para o servidor iniciar
                setTimeout(async () => {
                    const isRunning = await checkServer();
                    if (isRunning) {
                        console.log('✅ Servidor iniciado com sucesso!');
                        resolve(true);
                    } else {
                        console.log('❌ Servidor não conseguiu iniciar');
                        resolve(false);
                    }
                }, 5000);
                
                return;
            }
        }
        
        console.log('❌ Nenhum arquivo de entrada encontrado');
        resolve(false);
    });
}

// Função para executar o teste de endpoints
async function runEndpointTest() {
    console.log('');
    console.log('🧪 Executando teste de endpoints...');
    
    return new Promise((resolve) => {
        const testProcess = spawn('node', ['test-endpoints-robusto.js'], {
            stdio: 'inherit',
            shell: true
        });
        
        testProcess.on('close', (code) => {
            console.log(`🧪 Teste finalizado com código: ${code}`);
            resolve(code === 0);
        });
    });
}

// Função principal
async function main() {
    console.log('1️⃣ Verificando se o servidor já está rodando...');
    
    let serverRunning = await checkServer();
    
    if (serverRunning) {
        console.log('✅ Servidor já está rodando!');
    } else {
        console.log('❌ Servidor não está rodando');
        
        console.log('2️⃣ Tentando iniciar o servidor...');
        const started = await startServer();
        
        if (!started) {
            console.log('❌ Falha ao iniciar o servidor');
            console.log('');
            console.log('💡 SOLUÇÕES:');
            console.log('1. Verifique se o Node.js está instalado');
            console.log('2. Execute: npm install');
            console.log('3. Verifique se os arquivos main.js ou app.js existem');
            console.log('4. Execute manualmente: node main.js');
            process.exit(1);
        }
        
        serverRunning = true;
    }
    
    if (serverRunning) {
        console.log('3️⃣ Servidor confirmado como ativo');
        
        // Aguardar um pouco mais para garantir que está estável
        console.log('⏱️ Aguardando estabilização...');
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        console.log('4️⃣ Iniciando testes dos endpoints...');
        const testSuccess = await runEndpointTest();
        
        if (testSuccess) {
            console.log('');
            console.log('🎉 TODOS OS TESTES CONCLUÍDOS COM SUCESSO!');
            console.log('✅ SISTEMA 100% OPERACIONAL!');
        } else {
            console.log('');
            console.log('⚠️ ALGUNS TESTES FALHARAM');
            console.log('💡 Verifique o relatório de testes para detalhes');
        }
    }
    
    // Manter o servidor rodando se foi iniciado por este script
    if (serverProcess) {
        console.log('');
        console.log('🔄 Servidor mantido em execução');
        console.log('💡 Pressione Ctrl+C para parar');
        
        process.on('SIGINT', () => {
            console.log('');
            console.log('🛑 Parando servidor...');
            if (serverProcess) {
                serverProcess.kill();
            }
            process.exit(0);
        });
        
        // Manter o processo ativo
        setInterval(() => {
            // Keep alive
        }, 1000);
    }
}

// Verificar dependências
try {
    require.resolve('axios');
} catch (error) {
    console.log('❌ Axios não encontrado');
    console.log('💡 Execute: npm install axios');
    process.exit(1);
}

// Executar
main().catch(error => {
    console.error('❌ Erro fatal:', error);
    process.exit(1);
});
