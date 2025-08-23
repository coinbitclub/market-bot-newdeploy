/**
 * 🔍 DIAGNÓSTICO COMPLETO DO DEPLOY RAILWAY
 * Verificar se deploy está travado e como destravar
 */

const axios = require('axios');

console.log('🔍 DIAGNÓSTICO COMPLETO DO DEPLOY RAILWAY');
console.log('==========================================');

async function verificarStatusDeploy() {
    console.log('📋 1. Verificando status atual do Railway...');
    
    try {
        // Testar URL principal
        const response = await axios.get('https://coinbitclub-market-bot-production.up.railway.app/', {
            timeout: 10000,
            headers: {
                'User-Agent': 'Railway-Deploy-Checker/1.0'
            }
        });
        
        console.log('✅ Railway respondendo:', response.status);
        console.log('📋 Headers:', JSON.stringify(response.headers, null, 2));
        console.log('📋 Data:', response.data);
        
        // Verificar se é fallback
        if (response.headers['x-railway-fallback']) {
            console.log('⚠️ PROBLEMA: Railway está em modo fallback!');
            console.log('📋 Isso significa que o deploy não foi processado corretamente');
            return 'fallback';
        }
        
        return 'success';
        
    } catch (error) {
        console.log('❌ Erro na conexão:', error.message);
        if (error.response) {
            console.log('📋 Status:', error.response.status);
            console.log('📋 Headers:', JSON.stringify(error.response.headers, null, 2));
        }
        return 'error';
    }
}

async function verificarLogsRailway() {
    console.log('\n📋 2. Verificando possíveis problemas no deploy...');
    
    // Problemas comuns que travam deploy no Railway
    const problemasComuns = [
        {
            nome: 'Arquivo package.json inválido',
            solucao: 'Verificar sintaxe do package.json'
        },
        {
            nome: 'Dependências conflitantes',
            solucao: 'npm install --force'
        },
        {
            nome: 'Comando start incorreto',
            solucao: 'Verificar railway.toml startCommand'
        },
        {
            nome: 'Porta não configurada',
            solucao: 'Verificar process.env.PORT'
        },
        {
            nome: 'Timeout no build',
            solucao: 'Simplificar processo de build'
        },
        {
            nome: 'Variáveis de ambiente faltando',
            solucao: 'Verificar Railway dashboard > Variables'
        }
    ];
    
    problemasComuns.forEach((problema, index) => {
        console.log(`${index + 1}. ${problema.nome}`);
        console.log(`   Solução: ${problema.solucao}`);
    });
}

async function verificarArquivosConfig() {
    console.log('\n📋 3. Verificando arquivos de configuração...');
    
    const fs = require('fs');
    const path = require('path');
    
    // Verificar railway.toml
    try {
        const railwayConfig = fs.readFileSync('railway.toml', 'utf8');
        console.log('✅ railway.toml encontrado:');
        console.log(railwayConfig);
    } catch (error) {
        console.log('❌ railway.toml não encontrado ou inválido');
    }
    
    // Verificar package.json
    try {
        const packageJson = fs.readFileSync('package.json', 'utf8');
        const pkg = JSON.parse(packageJson);
        console.log('✅ package.json válido');
        console.log('📋 Start script:', pkg.scripts?.start || 'não definido');
        console.log('📋 Main:', pkg.main || 'não definido');
    } catch (error) {
        console.log('❌ package.json inválido:', error.message);
    }
}

async function testarConexaoDireta() {
    console.log('\n📋 4. Testando conexão direta...');
    
    const urls = [
        'https://coinbitclub-market-bot-production.up.railway.app/',
        'https://coinbitclub-market-bot-production.up.railway.app/health',
        'https://coinbitclub-market-bot-production.up.railway.app/api/system/status'
    ];
    
    for (const url of urls) {
        try {
            console.log(`🔍 Testando: ${url}`);
            const response = await axios.get(url, {
                timeout: 5000,
                validateStatus: () => true // Aceitar qualquer status
            });
            
            console.log(`   Status: ${response.status}`);
            console.log(`   Fallback: ${response.headers['x-railway-fallback'] ? 'SIM' : 'NÃO'}`);
            
            if (response.status === 404 && response.headers['x-railway-fallback']) {
                console.log('   🚨 CONFIRMADO: Deploy não foi processado!');
            }
            
        } catch (error) {
            console.log(`   ❌ Erro: ${error.message}`);
        }
    }
}

async function gerarSolucoes() {
    console.log('\n🔧 5. SOLUÇÕES PARA DESTRAVAR DEPLOY');
    console.log('=====================================');
    
    console.log('💡 SOLUÇÃO 1: Force Redeploy');
    console.log('   - Fazer pequena alteração no código');
    console.log('   - Commit e push novamente');
    console.log('   - Railway detectará mudança e fará redeploy');
    
    console.log('\n💡 SOLUÇÃO 2: Verificar Railway Dashboard');
    console.log('   - Acessar: https://railway.app/dashboard');
    console.log('   - Verificar logs de deploy');
    console.log('   - Procurar por erros ou travamentos');
    
    console.log('\n💡 SOLUÇÃO 3: Rollback para versão estável');
    console.log('   - No Railway dashboard, fazer rollback');
    console.log('   - Ou usar: railway rollback');
    
    console.log('\n💡 SOLUÇÃO 4: Deploy manual');
    console.log('   - railway up --detach');
    
    console.log('\n💡 SOLUÇÃO 5: Recrear serviço (último recurso)');
    console.log('   - Deletar e recriar projeto no Railway');
}

// Executar diagnóstico
async function executarDiagnostico() {
    try {
        const status = await verificarStatusDeploy();
        await verificarLogsRailway();
        await verificarArquivosConfig();
        await testarConexaoDireta();
        await gerarSolucoes();
        
        console.log('\n🎯 CONCLUSÃO DO DIAGNÓSTICO');
        console.log('===========================');
        
        if (status === 'fallback') {
            console.log('❌ CONFIRMADO: Deploy travado ou falhou');
            console.log('🔧 AÇÃO NECESSÁRIA: Force redeploy ou verificar logs');
        } else if (status === 'success') {
            console.log('✅ Deploy funcionando - problema pode ser nas rotas');
        } else {
            console.log('⚠️ Problema de conectividade ou Railway indisponível');
        }
        
    } catch (error) {
        console.log('❌ Erro no diagnóstico:', error.message);
    }
}

executarDiagnostico();
