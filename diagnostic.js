const fs = require('fs');

console.log('🔍 DIAGNÓSTICO COMPLETO DO SISTEMA');
console.log('=================================');

// 1. Verificar Node.js
console.log('📋 Node.js versão:', process.version);
console.log('📋 Platform:', process.platform);
console.log('📋 Diretório atual:', process.cwd());

// 2. Verificar dependências críticas
const dependencies = ['express', 'pg', 'axios'];
dependencies.forEach(dep => {
    try {
        require(dep);
        console.log(`✅ ${dep}: OK`);
    } catch (error) {
        console.log(`❌ ${dep}: ERRO - ${error.message}`);
    }
});

// 3. Verificar arquivos críticos
const files = ['hybrid-server.js', 'app.js', 'package.json'];
files.forEach(file => {
    try {
        const exists = fs.existsSync(file);
        console.log(`📁 ${file}: ${exists ? 'Existe' : 'Não encontrado'}`);
        if (exists) {
            const stats = fs.statSync(file);
            console.log(`   Tamanho: ${stats.size} bytes`);
        }
    } catch (error) {
        console.log(`📁 ${file}: ERRO - ${error.message}`);
    }
});

// 4. Tentar carregar hybrid-server.js para verificar sintaxe
try {
    console.log('🔧 Verificando sintaxe do hybrid-server.js...');
    require('./hybrid-server.js');
    console.log('❌ PROBLEMA: hybrid-server.js executou diretamente (deveria só carregar)');
} catch (error) {
    if (error.message.includes('listen EADDRINUSE')) {
        console.log('✅ Sintaxe OK (porta já em uso é normal)');
    } else {
        console.log('❌ Erro de sintaxe:', error.message);
    }
}

console.log('🎯 Diagnóstico concluído');

// Salvar resultado em arquivo para garantir que vemos
const report = `DIAGNÓSTICO SISTEMA - ${new Date().toISOString()}\n` +
              `Node.js: ${process.version}\n` +
              `Platform: ${process.platform}\n` +
              `Diretório: ${process.cwd()}\n`;

fs.writeFileSync('diagnostico.txt', report);
console.log('📝 Relatório salvo em diagnostico.txt');
