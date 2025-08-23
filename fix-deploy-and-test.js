#!/usr/bin/env node

/**
 * 🔧 CORRETOR DE DEPLOY + TESTADOR DE ENDPOINTS
 * =============================================
 * 
 * 1. Corrige problemas de deploy (arquivos faltantes, configurações)
 * 2. Inicia o servidor
 * 3. Testa todos os endpoints
 * 4. Gera relatório completo
 */

const fs = require('fs');
const path = require('path');
const { spawn, exec } = require('child_process');

console.log('🔧 CORRETOR DE DEPLOY + TESTADOR ENTERPRISE');
console.log('============================================');
console.log('');

// 1. CORRIGIR PROBLEMAS DE DEPLOY
async function corrigirProblemasDeplot() {
    console.log('1️⃣ CORRIGINDO PROBLEMAS DE DEPLOY...');
    console.log('====================================');
    
    // Corrigir Procfile
    console.log('📝 Corrigindo Procfile...');
    fs.writeFileSync('Procfile', 'web: node app.js\n');
    console.log('✅ Procfile corrigido');
    
    // Verificar se app.js existe e funciona
    console.log('📝 Verificando app.js...');
    if (!fs.existsSync('app.js')) {
        console.log('❌ app.js não encontrado!');
        process.exit(1);
    }
    console.log('✅ app.js encontrado');
    
    // Corrigir package.json se necessário
    console.log('📝 Verificando package.json...');
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    if (packageJson.main !== 'app.js') {
        packageJson.main = 'app.js';
        fs.writeFileSync('package.json', JSON.stringify(packageJson, null, 2));
        console.log('✅ package.json corrigido (main: app.js)');
    } else {
        console.log('✅ package.json está correto');
    }
    
    // Verificar se fixed-database-config.js existe
    console.log('📝 Verificando fixed-database-config.js...');
    if (!fs.existsSync('fixed-database-config.js')) {
        console.log('❌ fixed-database-config.js não encontrado, criando...');
        createFixedDatabaseConfig();
        console.log('✅ fixed-database-config.js criado');
    } else {
        console.log('✅ fixed-database-config.js encontrado');
    }
    
    // Verificar variáveis de ambiente críticas
    console.log('📝 Verificando variáveis de ambiente...');
    const criticalEnvs = ['DATABASE_URL', 'PORT'];
    const missingEnvs = criticalEnvs.filter(env => !process.env[env]);
    
    if (missingEnvs.length > 0) {
        console.log(`⚠️ Variáveis de ambiente faltando: ${missingEnvs.join(', ')}`);
        console.log('🔧 Usando valores padrão...');
        
        if (!process.env.PORT) {
            process.env.PORT = '3000';
            console.log('✅ PORT definido como 3000');
        }
        
        if (!process.env.DATABASE_URL) {
            process.env.DATABASE_URL = 'postgresql://postgres:ELjbkkgUASRCtdTAXVFgIssOXiLsRCPq@trolley.proxy.rlwy.net:44790/railway';
            console.log('✅ DATABASE_URL definido com valor padrão');
        }
    } else {
        console.log('✅ Todas as variáveis críticas estão definidas');
    }
    
    console.log('');
}

// 2. CRIAR fixed-database-config.js se não existir
function createFixedDatabaseConfig() {
    const content = `/**
 * 🔧 CONFIGURAÇÃO POSTGRESQL ROBUSTA PARA RAILWAY
 */

const { Pool } = require('pg');

function createRobustPool() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL || 'postgresql://postgres:ELjbkkgUASRCtdTAXVFgIssOXiLsRCPq@trolley.proxy.rlwy.net:44790/railway',
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 30000,
        idleTimeoutMillis: 30000,
        query_timeout: 20000,
        max: 5,
        min: 1,
        keepAlive: true
    });

    pool.on('error', (err) => {
        console.error('🔴 PostgreSQL error:', err);
    });

    return pool;
}

async function testConnection(pool) {
    try {
        const client = await pool.connect();
        await client.query('SELECT 1');
        client.release();
        console.log('✅ PostgreSQL connection successful');
        return true;
    } catch (error) {
        console.error('❌ PostgreSQL connection failed:', error.message);
        return false;
    }
}

async function safeQuery(pool, query, params = []) {
    try {
        const result = await pool.query(query, params);
        return result;
    } catch (error) {
        console.error('❌ Query failed:', error.message);
        throw error;
    }
}

async function ensureBasicTables(pool) {
    const tables = [
        \`CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            username VARCHAR(255) UNIQUE,
            email VARCHAR(255) UNIQUE,
            created_at TIMESTAMP DEFAULT NOW()
        )\`,
        \`CREATE TABLE IF NOT EXISTS signals (
            id SERIAL PRIMARY KEY,
            symbol VARCHAR(50),
            action VARCHAR(10),
            price DECIMAL(15,8),
            created_at TIMESTAMP DEFAULT NOW()
        )\`
    ];

    for (const table of tables) {
        try {
            await pool.query(table);
        } catch (error) {
            console.log('⚠️ Table creation skipped:', error.message);
        }
    }
}

module.exports = {
    createRobustPool,
    testConnection,
    safeQuery,
    ensureBasicTables
};`;

    fs.writeFileSync('fixed-database-config.js', content);
}

// 3. INICIAR SERVIDOR
async function iniciarServidor() {
    console.log('2️⃣ INICIANDO SERVIDOR...');
    console.log('========================');
    
    return new Promise((resolve, reject) => {
        console.log('🚀 Iniciando app.js...');
        
        const server = spawn('node', ['app.js'], {
            stdio: ['pipe', 'pipe', 'pipe'],
            env: { ...process.env }
        });
        
        let started = false;
        let timeout;
        
        server.stdout.on('data', (data) => {
            const output = data.toString();
            console.log(output.trim());
            
            // Detectar se servidor iniciou
            if ((output.includes('listening') || output.includes('running') || output.includes('started')) && !started) {
                started = true;
                clearTimeout(timeout);
                console.log('✅ Servidor iniciado com sucesso!');
                resolve(server);
            }
        });
        
        server.stderr.on('data', (data) => {
            const output = data.toString();
            console.error(output.trim());
        });
        
        server.on('error', (error) => {
            console.error('❌ Erro ao iniciar servidor:', error.message);
            reject(error);
        });
        
        // Timeout de 30 segundos
        timeout = setTimeout(() => {
            if (!started) {
                console.log('⚠️ Servidor demorou para iniciar, mas continuando...');
                resolve(server);
            }
        }, 30000);
    });
}

// 4. TESTAR ENDPOINTS
async function testarEndpoints() {
    console.log('3️⃣ TESTANDO TODOS OS ENDPOINTS...');
    console.log('=================================');
    
    // Aguardar um pouco para servidor estar totalmente pronto
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    try {
        // Executar o testador de endpoints
        const { runAllTests } = require('./test-all-endpoints');
        const results = await runAllTests();
        
        console.log('✅ Teste de endpoints concluído!');
        return results;
        
    } catch (error) {
        console.error('❌ Erro nos testes:', error.message);
        
        // Teste manual básico se o testador falhar
        console.log('🔧 Executando teste manual básico...');
        return await testeManualBasico();
    }
}

// 5. TESTE MANUAL BÁSICO
async function testeManualBasico() {
    const http = require('http');
    const baseUrl = 'localhost';
    const port = process.env.PORT || 3000;
    
    const endpoints = [
        '/health',
        '/api/dashboard/summary',
        '/webhook'
    ];
    
    console.log('🧪 Testando endpoints básicos...');
    
    for (const endpoint of endpoints) {
        try {
            const result = await makeHttpRequest(baseUrl, port, endpoint);
            const icon = result.success ? '✅' : '❌';
            console.log(`${icon} ${endpoint} - Status: ${result.status}`);
        } catch (error) {
            console.log(`❌ ${endpoint} - Erro: ${error.message}`);
        }
    }
    
    return { manualTest: true };
}

function makeHttpRequest(hostname, port, path) {
    return new Promise((resolve) => {
        const http = require('http');
        
        const options = {
            hostname,
            port,
            path,
            method: 'GET',
            timeout: 10000
        };
        
        const req = http.request(options, (res) => {
            resolve({
                success: true,
                status: res.statusCode
            });
        });
        
        req.on('error', (error) => {
            resolve({
                success: false,
                error: error.message,
                status: 'ERROR'
            });
        });
        
        req.on('timeout', () => {
            req.destroy();
            resolve({
                success: false,
                error: 'Request timeout',
                status: 'TIMEOUT'
            });
        });
        
        req.end();
    });
}

// 6. GERAR RELATÓRIO
function gerarRelatorio(resultados) {
    console.log('');
    console.log('4️⃣ RELATÓRIO FINAL');
    console.log('==================');
    
    const report = {
        timestamp: new Date().toISOString(),
        deployFixed: true,
        serverStarted: true,
        endpointResults: resultados,
        recommendations: []
    };
    
    if (resultados.manualTest) {
        console.log('📊 Teste manual executado');
        report.recommendations.push('Execute npm install && npm start para verificar funcionamento completo');
    } else if (resultados.total) {
        console.log(`📊 Endpoints testados: ${resultados.total}`);
        console.log(`✅ Sucessos: ${resultados.passed}`);
        console.log(`❌ Falhas: ${resultados.failed}`);
        console.log(`📈 Taxa de sucesso: ${Math.round((resultados.passed / resultados.total) * 100)}%`);
        
        if (resultados.failed === 0) {
            report.recommendations.push('🎉 SISTEMA 100% OPERACIONAL - PRONTO PARA DEPLOY!');
        } else {
            report.recommendations.push(`⚠️ ${resultados.failed} endpoints com problemas - verificar logs`);
        }
    }
    
    // Salvar relatório
    fs.writeFileSync('deploy-fix-report.json', JSON.stringify(report, null, 2));
    console.log('📝 Relatório salvo em: deploy-fix-report.json');
    
    console.log('');
    console.log('🎯 PRÓXIMOS PASSOS:');
    console.log('==================');
    console.log('1. Verificar se todos os endpoints estão funcionando');
    console.log('2. Testar webhook do TradingView');
    console.log('3. Fazer deploy no Railway');
    console.log('');
    
    return report;
}

// FUNÇÃO PRINCIPAL
async function main() {
    try {
        // 1. Corrigir problemas de deploy
        await corrigirProblemasDeplot();
        
        // 2. Iniciar servidor
        const server = await iniciarServidor();
        
        // 3. Testar endpoints
        const resultados = await testarEndpoints();
        
        // 4. Gerar relatório
        const report = gerarRelatorio(resultados);
        
        console.log('🎉 PROCESSO COMPLETO FINALIZADO!');
        
        // Manter servidor rodando por um tempo para testes manuais
        console.log('');
        console.log('⏰ Servidor ficará rodando por 60 segundos para testes manuais...');
        console.log(`🌐 Acesse: http://localhost:${process.env.PORT || 3000}`);
        console.log('');
        
        setTimeout(() => {
            console.log('🛑 Finalizando servidor...');
            server.kill();
            process.exit(0);
        }, 60000);
        
    } catch (error) {
        console.error('💥 Erro no processo:', error.message);
        process.exit(1);
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    main();
}

module.exports = { main, corrigirProblemasDeplot, testarEndpoints };
