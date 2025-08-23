console.log('TESTE ULTRA SIMPLES');
console.log('===================');
console.log('Node:', process.version);
console.log('OS:', process.platform);
console.log('Time:', new Date().toISOString());
console.log('PID:', process.pid);
console.log('FUNCIONANDO!');

// Teste de módulos
try {
    const axios = require('axios');
    console.log('✅ axios disponível');
} catch (e) {
    console.log('❌ axios não disponível');
}

try {
    const crypto = require('crypto');
    console.log('✅ crypto disponível');
} catch (e) {
    console.log('❌ crypto não disponível');
}
