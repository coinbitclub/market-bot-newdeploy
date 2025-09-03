const { execSync } = require('child_process');

console.log('🧪 TESTE FINAL DE INTEGRAÇÃO DASHBOARD');
console.log('=====================================');

const endpoints = [
    '/api/dashboard/realtime',
    '/api/dashboard/signals',
    '/api/dashboard/orders',
    '/api/dashboard/users',
    '/api/dashboard/system',
    '/api/aguia/stats',
    '/api/aguia/latest',
    '/api/ia/analyses',
    '/api/ia/alerts',
    '/api/ia/supervisor'
];

let sucessos = 0;
let erros = 0;

console.log('\n🔄 Testando todos os endpoints...\n');

for (const endpoint of endpoints) {
    try {
        const url = `http://localhost:5004${endpoint}`;
        const comando = `curl -s -o /dev/null -w "%{http_code}" "${url}"`;
        
        // Para Windows, usamos PowerShell
        const response = execSync(`powershell -Command "try { $response = Invoke-WebRequest -Uri '${url}' -Method GET -ErrorAction Stop; $response.StatusCode } catch { 500 }"`, 
            { encoding: 'utf8', timeout: 5000 });
        
        const statusCode = parseInt(response.trim());
        
        if (statusCode === 200) {
            console.log(`✅ ${endpoint} - OK (${statusCode})`);
            sucessos++;
        } else {
            console.log(`❌ ${endpoint} - ERRO (${statusCode})`);
            erros++;
        }
    } catch (error) {
        console.log(`❌ ${endpoint} - ERRO: ${error.message.split('\n')[0]}`);
        erros++;
    }
}

console.log('\n📊 RESULTADOS FINAIS:');
console.log(`✅ Sucessos: ${sucessos}/${endpoints.length}`);
console.log(`❌ Erros: ${erros}/${endpoints.length}`);

const porcentagemSucesso = ((sucessos / endpoints.length) * 100).toFixed(1);
console.log(`📈 Taxa de Sucesso: ${porcentagemSucesso}%`);

if (sucessos === endpoints.length) {
    console.log('\n🎉 TODOS OS TESTES PASSARAM!');
    console.log('✅ Dashboard totalmente integrado e funcional');
    console.log('🦅 Águia News: OPERACIONAL');
    console.log('🤖 IA Supervisão: OPERACIONAL');
    console.log('📊 Dashboard Base: OPERACIONAL');
    console.log('\n🚀 Acesse: http://localhost:5004');
} else {
    console.log('\n⚠️  Alguns testes falharam. Verifique os logs acima.');
}

console.log('\n=====================================');
