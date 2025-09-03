#!/usr/bin/env node

console.log('🚀 TESTE RAILWAY - SISTEMA CARREGADO!');
console.log('Versão: 5.1.1');
console.log('Data:', new Date().toISOString());
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('PORT:', process.env.PORT);

const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.json({
        message: '🚀 COINBITCLUB RAILWAY TEST v5.1.1',
        timestamp: new Date().toISOString(),
        status: 'WORKING',
        version: '5.1.1'
    });
});

app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        version: '5.1.1',
        timestamp: new Date().toISOString(),
        service: 'COINBITCLUB-TEST'
    });
});

app.listen(port, () => {
    console.log(`🌐 Teste Railway rodando na porta ${port}`);
});
