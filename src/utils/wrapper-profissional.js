const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 WRAPPER PROFISSIONAL - EXECUTANDO SERVIDOR COMPLETO');
console.log('=====================================================');

const serverPath = path.join(__dirname, 'app.js');
console.log('📂 Caminho do servidor:', serverPath);

const child = spawn('node', [serverPath], {
    cwd: __dirname,
    stdio: 'inherit'
});

child.on('error', (error) => {
    console.error('❌ Erro ao iniciar servidor:', error);
});

child.on('exit', (code) => {
    console.log(`🔚 Servidor finalizou com código: ${code}`);
});

console.log('✅ Servidor iniciado via wrapper profissional');
