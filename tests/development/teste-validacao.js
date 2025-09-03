#!/usr/bin/env node

const SistemaValidacaoAutomatica = require('./sistema-validacao-automatica');

console.log('🚀 TESTANDO SISTEMA DE VALIDAÇÃO AUTOMÁTICA');
console.log('==========================================');

const sistema = new SistemaValidacaoAutomatica();

sistema.executarValidacaoCompleta()
    .then(success => {
        console.log('\n🎯 RESULTADO FINAL:', success ? 'SUCESSO' : 'FALHA');
        if (success) {
            console.log('✅ Sistema funcionando corretamente!');
            console.log('📊 Estatísticas:', sistema.getSystemStats());
        } else {
            console.log('❌ Sistema com problemas');
        }
        process.exit(success ? 0 : 1);
    })
    .catch(error => {
        console.error('❌ Erro:', error.message);
        console.error('Stack:', error.stack);
        process.exit(1);
    });
