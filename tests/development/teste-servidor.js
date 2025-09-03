/**
 * 🧪 TESTE DE INICIALIZAÇÃO DO SERVIDOR PRINCIPAL
 * ==============================================
 */

console.log('🧪 Testando inicialização do app.js...');

try {
    // Carregar as dependências principais
    const express = require('express');
    console.log('✅ Express carregado');
    
    const { Pool } = require('pg');
    console.log('✅ PostgreSQL carregado');
    
    // Tentar carregar o app principal
    console.log('🔄 Carregando CoinBitClubServer...');
    const CoinBitClubServer = require('./app.js');
    console.log('✅ CoinBitClubServer carregado com sucesso');
    
    // Tentar instanciar
    console.log('🔄 Instanciando servidor...');
    const server = new CoinBitClubServer();
    console.log('✅ Servidor instanciado com sucesso');
    
    // Iniciar servidor
    console.log('🚀 Iniciando servidor na porta 3000...');
    server.start().then(() => {
        console.log('✅ Servidor iniciado com sucesso!');
        console.log('🌐 Acesse: http://localhost:3000');
        console.log('🎯 Painel: http://localhost:3000/painel');
    }).catch(error => {
        console.error('❌ Erro ao iniciar servidor:', error.message);
    });
    
} catch (error) {
    console.error('❌ Erro:', error.message);
    console.error('📋 Stack:', error.stack);
}
