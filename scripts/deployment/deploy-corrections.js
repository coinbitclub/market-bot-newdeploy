/**
 * 🚀 SCRIPT DE DEPLOY DAS CORREÇÕES
 * 
 * Deploy automatizado das correções PostgreSQL para Railway
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 DEPLOY DAS CORREÇÕES POSTGRESQL');
console.log('=================================');

// Lista de arquivos modificados
const MODIFIED_FILES = [
    'enterprise-server-garantido.js',
    'fixed-database-config.js',
    'test-fixed-endpoints.js'
];

// Verificar se os arquivos existem
console.log('📁 Verificando arquivos modificados...');
let allFilesExist = true;

MODIFIED_FILES.forEach(file => {
    const filePath = path.join(__dirname, file);
    if (fs.existsSync(filePath)) {
        console.log(`✅ ${file}`);
    } else {
        console.log(`❌ ${file} - ARQUIVO NÃO ENCONTRADO`);
        allFilesExist = false;
    }
});

if (!allFilesExist) {
    console.log('\n🚨 Alguns arquivos não foram encontrados!');
    process.exit(1);
}

// Função para executar comando
function runCommand(command, description) {
    return new Promise((resolve, reject) => {
        console.log(`\n🔧 ${description}...`);
        console.log(`📝 Comando: ${command}`);
        
        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.log(`❌ Erro: ${error.message}`);
                reject(error);
            } else {
                if (stdout) console.log(`✅ ${stdout.trim()}`);
                if (stderr) console.log(`⚠️ ${stderr.trim()}`);
                resolve(stdout);
            }
        });
    });
}

async function deployCorrections() {
    try {
        // 1. Verificar status do git
        console.log('\n📋 ETAPA 1: Verificando status do repositório');
        await runCommand('git status', 'Verificando status do Git');

        // 2. Adicionar arquivos modificados
        console.log('\n📋 ETAPA 2: Adicionando arquivos modificados');
        for (const file of MODIFIED_FILES) {
            await runCommand(`git add ${file}`, `Adicionando ${file}`);
        }

        // 3. Commit das correções
        console.log('\n📋 ETAPA 3: Fazendo commit das correções');
        const commitMessage = `fix: PostgreSQL ECONNRESET corrections

- Added robust PostgreSQL pool configuration
- Fixed database timeout issues for Railway
- Implemented safeQuery with retry logic
- Enhanced error handling for DB connections
- Added basic table creation on startup
- Fixed all dashboard endpoints with fallbacks

Resolves ECONNRESET errors in production logs`;

        await runCommand(`git commit -m "${commitMessage}"`, 'Fazendo commit das correções');

        // 4. Push para o repositório
        console.log('\n📋 ETAPA 4: Enviando para repositório remoto');
        await runCommand('git push origin main', 'Fazendo push para origin/main');

        console.log('\n🎉 DEPLOY CONCLUÍDO COM SUCESSO!');
        console.log('================================');
        console.log('✅ Arquivos modificados enviados para o repositório');
        console.log('✅ Railway irá automaticamente fazer redeploy');
        console.log('⏳ Aguarde 2-3 minutos para o deploy ser concluído');
        console.log('');
        console.log('🔍 Para monitorar o deploy:');
        console.log('   📊 Railway Dashboard: https://railway.app');
        console.log('   📋 Logs: railway logs');
        console.log('   🌐 URL: coinbitclub-market-bot.up.railway.app');

    } catch (error) {
        console.log('\n❌ ERRO DURANTE O DEPLOY');
        console.log('=======================');
        console.log(`Erro: ${error.message}`);
        console.log('');
        console.log('🔧 Possíveis soluções:');
        console.log('   1. Verificar se está logado no Git');
        console.log('   2. Verificar permissões do repositório');
        console.log('   3. Fazer push manual dos arquivos');
        console.log('');
        console.log('📝 Arquivos que precisam ser enviados:');
        MODIFIED_FILES.forEach(file => {
            console.log(`   - ${file}`);
        });
    }
}

// Função para testar após deploy
async function testAfterDeploy() {
    console.log('\n🧪 TESTANDO APÓS DEPLOY');
    console.log('======================');
    
    // Aguardar um pouco para o deploy finalizar
    console.log('⏳ Aguardando 30 segundos para deploy finalizar...');
    await new Promise(resolve => setTimeout(resolve, 30000));
    
    // Rodar teste dos endpoints
    try {
        const { runTests } = require('./test-fixed-endpoints');
        await runTests();
    } catch (error) {
        console.log('⚠️ Teste automático falhou, teste manual necessário');
        console.log('   URL: http://localhost:3000/health');
    }
}

// Executar deploy
if (require.main === module) {
    deployCorrections()
        .then(() => {
            console.log('\n❓ Deseja testar os endpoints após o deploy? (aguarda 30s)');
            console.log('   Execute: node test-fixed-endpoints.js');
        })
        .catch(error => {
            console.error('❌ Deploy falhou:', error.message);
            process.exit(1);
        });
}

module.exports = { deployCorrections };
