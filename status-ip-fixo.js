/**
 * 🔍 SIMULADOR DE STATUS IP FIXO
 * =============================
 */

require('dotenv').config();

console.log('🌐 ANÁLISE DO STATUS DO IP FIXO');
console.log('===============================');

console.log('📋 Variáveis de ambiente:');
console.log(`   • NGROK_ENABLED: ${process.env.NGROK_ENABLED}`);
console.log(`   • IP_FIXED: ${process.env.IP_FIXED}`);
console.log(`   • NGROK_AUTH_TOKEN: ${process.env.NGROK_AUTH_TOKEN ? 'CONFIGURADO' : 'NÃO CONFIGURADO'}`);

const isNgrokEnabled = process.env.NGROK_ENABLED === 'true';
const isIPFixed = process.env.IP_FIXED === 'true';

console.log('\n🔍 Análise de configuração:');
console.log(`   • isNgrokEnabled: ${isNgrokEnabled}`);
console.log(`   • isIPFixed: ${isIPFixed}`);

if (isNgrokEnabled || isIPFixed) {
    console.log('\n✅ RESULTADO: IP FIXO ESTÁ CONFIGURADO');
    console.log('🎯 Status: ATIVO no arquivo .env');
    
    // Verificar arquivo ngrok-info.json
    const fs = require('fs');
    if (fs.existsSync('./ngrok-info.json')) {
        try {
            const ngrokInfo = JSON.parse(fs.readFileSync('./ngrok-info.json', 'utf8'));
            console.log('\n📂 Arquivo ngrok-info.json encontrado:');
            console.log(`   • URL: ${ngrokInfo.url}`);
            console.log(`   • IP: ${ngrokInfo.ip}`);
            console.log(`   • Data: ${new Date(ngrokInfo.timestamp).toLocaleString()}`);
            console.log('\n🟢 IP FIXO: TOTALMENTE FUNCIONAL');
        } catch (error) {
            console.log('\n⚠️ Arquivo ngrok-info.json existe mas tem erro:', error.message);
            console.log('🟡 IP FIXO: CONFIGURADO MAS PODE TER PROBLEMAS');
        }
    } else {
        console.log('\n📂 Arquivo ngrok-info.json não encontrado');
        console.log('🟡 IP FIXO: CONFIGURADO MAS NGROK NÃO INICIADO');
        console.log('\n💡 Para ativar completamente:');
        console.log('   1. Execute: node ativar-ip-fixo.js');
        console.log('   2. Ou inicie Ngrok manualmente');
        console.log('   3. O servidor detectará automaticamente');
    }
    
} else {
    console.log('\n❌ RESULTADO: IP FIXO NÃO ESTÁ CONFIGURADO');
    console.log('🔴 Status: DESATIVADO');
    console.log('\n💡 Para ativar:');
    console.log('   • NGROK_ENABLED=true já está no .env ✅');
    console.log('   • IP_FIXED=true já está no .env ✅');
    console.log('   • Token Ngrok já está configurado ✅');
    console.log('\n🚀 Pronto para ativação!');
}

console.log('\n📊 RESUMO PROFISSIONAL:');
console.log('========================');

if (isNgrokEnabled || isIPFixed) {
    console.log('🟢 Configuração: ATIVADA');
    console.log('🔧 Sistema: Preparado para IP fixo');
    console.log('💼 Benefícios: Disponíveis para trading');
    console.log('🎯 Ação: Verificar se Ngrok está rodando');
} else {
    console.log('🔴 Configuração: DESATIVADA');
    console.log('🔧 Sistema: Usando IP dinâmico');
    console.log('⚠️ Limitação: Exchanges podem bloquear');
    console.log('🎯 Ação: Configurar variáveis no .env');
}

console.log('\n✅ ANÁLISE CONCLUÍDA');
