/**
 * 🌐 TESTE PROFISSIONAL - VERIFICAÇÃO DE IP FIXO
 * ==============================================
 */

console.log('🔍 TESTE PROFISSIONAL: IP FIXO');
console.log('==============================');

// Carregar variáveis de ambiente
require('dotenv').config();

console.log('📋 Variáveis de ambiente relevantes:');
console.log(`   • NGROK_ENABLED: ${process.env.NGROK_ENABLED}`);
console.log(`   • IP_FIXED: ${process.env.IP_FIXED}`);
console.log(`   • NGROK_AUTH_TOKEN: ${process.env.NGROK_AUTH_TOKEN ? 'DEFINIDO' : 'NÃO DEFINIDO'}`);
console.log(`   • NGROK_REGION: ${process.env.NGROK_REGION}`);
console.log(`   • NGROK_SUBDOMAIN: ${process.env.NGROK_SUBDOMAIN}`);
console.log(`   • NGROK_IP_FIXO: ${process.env.NGROK_IP_FIXO}`);

console.log('\n🔧 Verificando status do IP fixo...');

const isNgrokEnabled = process.env.NGROK_ENABLED === 'true';
const isIPFixed = process.env.IP_FIXED === 'true';

if (isNgrokEnabled || isIPFixed) {
    console.log('✅ CONFIGURAÇÃO: IP FIXO ATIVADO');
    console.log('📋 Detalhes:');
    console.log(`   • Ngrok habilitado: ${isNgrokEnabled}`);
    console.log(`   • IP fixo configurado: ${isIPFixed}`);
    
    // Verificar arquivo de info do Ngrok
    const fs = require('fs');
    const path = require('path');
    const ngrokInfoPath = path.join(__dirname, 'ngrok-info.json');
    
    console.log(`\n🔍 Verificando arquivo: ${ngrokInfoPath}`);
    
    if (fs.existsSync(ngrokInfoPath)) {
        try {
            const ngrokInfo = JSON.parse(fs.readFileSync(ngrokInfoPath, 'utf8'));
            console.log('✅ ARQUIVO NGROK ENCONTRADO:');
            console.log(`   • URL Pública: ${ngrokInfo.url}`);
            console.log(`   • IP: ${ngrokInfo.ip}`);
            console.log(`   • Timestamp: ${new Date(ngrokInfo.timestamp).toLocaleString()}`);
        } catch (error) {
            console.log('❌ Erro ao ler arquivo Ngrok:', error.message);
        }
    } else {
        console.log('⚠️ Arquivo ngrok-info.json não encontrado');
        console.log('💡 Isso é normal se o Ngrok ainda não foi iniciado');
    }
    
    // Verificar se Ngrok está rodando
    console.log('\n🔍 Verificando se Ngrok está ativo...');
    
    const { spawn } = require('child_process');
    const ngrokCheck = spawn('tasklist', ['/FI', 'IMAGENAME eq ngrok.exe']);
    
    let ngrokOutput = '';
    ngrokCheck.stdout.on('data', (data) => {
        ngrokOutput += data.toString();
    });
    
    ngrokCheck.on('close', (code) => {
        if (ngrokOutput.includes('ngrok.exe')) {
            console.log('✅ NGROK ESTÁ RODANDO!');
        } else {
            console.log('❌ Ngrok não está rodando');
            console.log('💡 Para ativar: Execute ngrok http 3000 --authtoken=<token>');
        }
        
        console.log('\n🎯 RESULTADO FINAL:');
        if (isNgrokEnabled && ngrokOutput.includes('ngrok.exe')) {
            console.log('🟢 IP FIXO: TOTALMENTE ATIVO E FUNCIONAL');
        } else if (isNgrokEnabled) {
            console.log('🟡 IP FIXO: CONFIGURADO MAS NGROK NÃO ESTÁ RODANDO');
        } else {
            console.log('🔴 IP FIXO: NÃO CONFIGURADO');
        }
    });
    
} else {
    console.log('❌ CONFIGURAÇÃO: IP FIXO DESATIVADO');
    console.log('💡 Para ativar, defina:');
    console.log('   • NGROK_ENABLED=true');
    console.log('   • IP_FIXED=true');
    console.log('   • Configure o NGROK_AUTH_TOKEN');
}

console.log('\n📋 Status das exchanges com IP fixo:');
console.log('   • Binance: Requer whitelist de IP para algumas operações');
console.log('   • Bybit: Funciona melhor com IP consistente');
console.log('   • Benefício: Evita bloqueios por mudança de IP');

console.log('\n✅ TESTE CONCLUÍDO');
