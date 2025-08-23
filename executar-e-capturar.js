const fs = require('fs');
const { exec } = require('child_process');

console.log('🚀 EXECUTANDO COLETA DE SALDOS REAIS');
console.log('===================================');

exec('node coinbitclub-garantido.js', (error, stdout, stderr) => {
    const timestamp = new Date().toISOString();
    
    console.log('🕒 Timestamp:', timestamp);
    
    if (error) {
        console.error('❌ Erro:', error.message);
        return;
    }
    
    if (stderr) {
        console.error('⚠️ Stderr:', stderr);
    }
    
    console.log('📊 Output:');
    console.log(stdout);
    
    // Salvar resultado em arquivo
    const resultFile = `resultado-saldos-${Date.now()}.txt`;
    fs.writeFileSync(resultFile, `
COLETA DE SALDOS REAIS - ${timestamp}
=====================================

STDOUT:
${stdout}

STDERR:
${stderr}

ERROR:
${error ? error.message : 'Nenhum erro'}
`);
    
    console.log(`✅ Resultado salvo em: ${resultFile}`);
});
