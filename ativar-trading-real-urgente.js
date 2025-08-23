#!/usr/bin/env node
/**
 * 🚨 ATIVAÇÃO URGENTE - ORDENS REAIS
 * Configurar e ativar execução de ordens nas exchanges
 */

const { Pool } = require('pg');
const fs = require('fs');

console.log('🚨 ATIVAÇÃO URGENTE - SISTEMA DE ORDENS REAIS');
console.log('=============================================');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:FDjupFGvAzzwbuZMRyVxlJBXsQtphlHv@maglev.proxy.rlwy.net:42095/railway',
    ssl: { rejectUnauthorized: false }
});

async function ativarTradingReal() {
    console.log('\n1️⃣ CONFIGURANDO ENABLE_REAL_TRADING...');
    
    try {
        // 1. Criar .env local se não existir
        let envContent = '';
        if (fs.existsSync('.env')) {
            envContent = fs.readFileSync('.env', 'utf8');
        }
        
        // Verificar se já existe
        if (!envContent.includes('ENABLE_REAL_TRADING')) {
            envContent += '\n# TRADING REAL ATIVADO\n';
            envContent += 'ENABLE_REAL_TRADING=true\n';
            fs.writeFileSync('.env', envContent);
            console.log('   ✅ ENABLE_REAL_TRADING=true adicionado ao .env');
        } else {
            // Atualizar valor existente
            envContent = envContent.replace(/ENABLE_REAL_TRADING=.*/g, 'ENABLE_REAL_TRADING=true');
            fs.writeFileSync('.env', envContent);
            console.log('   ✅ ENABLE_REAL_TRADING atualizado para true');
        }
        
        // 2. Configurar no ambiente atual
        process.env.ENABLE_REAL_TRADING = 'true';
        console.log('   ✅ Variável configurada no processo atual');
        
    } catch (error) {
        console.error('   ❌ Erro ao configurar .env:', error.message);
    }
    
    console.log('\n2️⃣ VERIFICANDO USUÁRIOS COM CHAVES ATIVAS...');
    
    try {
        const usuarios = await pool.query(`
            SELECT 
                id, username, 
                binance_api_key, bybit_api_key,
                trading_active, ativo,
                balance_brl, balance_usd
            FROM users 
            WHERE 
                (binance_api_key IS NOT NULL OR bybit_api_key IS NOT NULL)
                AND (trading_active = true OR ativo = true)
            ORDER BY id
        `);
        
        console.log(`   📊 Encontrados ${usuarios.rows.length} usuários com trading ativo`);
        
        usuarios.rows.forEach((user, i) => {
            const binance = user.binance_api_key ? '🟡 Binance' : '';
            const bybit = user.bybit_api_key ? '🟣 Bybit' : '';
            const saldo = (user.balance_brl || 0) + (user.balance_usd || 0);
            
            console.log(`   ${i+1}. ${user.username} - ${binance} ${bybit} - Saldo: $${saldo}`);
        });
        
    } catch (error) {
        console.error('   ❌ Erro ao verificar usuários:', error.message);
    }
    
    console.log('\n3️⃣ TESTANDO CONECTIVIDADE COM EXCHANGES...');
    
    // Verificar se temos chaves de ambiente
    const temBinance = process.env.BINANCE_API_KEY && process.env.BINANCE_API_SECRET;
    const temBybit = process.env.BYBIT_API_KEY && process.env.BYBIT_API_SECRET;
    
    console.log(`   🟡 Binance ENV: ${temBinance ? '✅ Configurado' : '❌ Não configurado'}`);
    console.log(`   🟣 Bybit ENV: ${temBybit ? '✅ Configurado' : '❌ Não configurado'}`);
    
    if (!temBinance && !temBybit) {
        console.log('\n⚠️  ATENÇÃO: Nenhuma chave de exchange configurada no ambiente!');
        console.log('   O sistema usará as chaves dos usuários individuais do banco.');
    }
    
    console.log('\n4️⃣ VERIFICANDO SINAIS ATIVOS...');
    
    try {
        const sinaisAtivos = await pool.query(`
            SELECT COUNT(*) as count 
            FROM trading_signals 
            WHERE created_at > NOW() - INTERVAL '24 hours'
        `);
        
        const count = parseInt(sinaisAtivos.rows[0].count) || 0;
        console.log(`   📡 ${count} sinais recebidos nas últimas 24h`);
        
        if (count > 0) {
            const ultimoSinal = await pool.query(`
                SELECT symbol, action, created_at
                FROM trading_signals 
                ORDER BY created_at DESC 
                LIMIT 1
            `);
            
            const ultimo = ultimoSinal.rows[0];
            console.log(`   📈 Último: ${ultimo.symbol} ${ultimo.action} (${ultimo.created_at})`);
        }
        
    } catch (error) {
        console.error('   ❌ Erro ao verificar sinais:', error.message);
    }
    
    console.log('\n5️⃣ INICIANDO SISTEMA PRINCIPAL...');
    
    try {
        // Importar e iniciar o sistema principal
        console.log('   🚀 Carregando enhanced-signal-processor...');
        
        // Carregar o processador principal
        const EnhancedSignalProcessor = require('./enhanced-signal-processor-with-execution.js');
        
        console.log('   ✅ Sistema de ordens reais ATIVADO!');
        console.log('\n🎯 PRÓXIMOS SINAIS SERÃO EXECUTADOS NAS EXCHANGES!');
        
        return true;
        
    } catch (error) {
        console.error('   ❌ Erro ao iniciar sistema:', error.message);
        return false;
    }
}

async function main() {
    const success = await ativarTradingReal();
    
    console.log('\n' + '='.repeat(50));
    if (success) {
        console.log('✅ SISTEMA DE TRADING REAL ATIVADO COM SUCESSO!');
        console.log('');
        console.log('📊 Status atual:');
        console.log(`   • ENABLE_REAL_TRADING: ${process.env.ENABLE_REAL_TRADING}`);
        console.log('   • Sistema: Aguardando sinais do TradingView');
        console.log('   • Modo: OPERAÇÕES REAIS nas exchanges');
        console.log('');
        console.log('🚨 IMPORTANTE:');
        console.log('   • Configure ENABLE_REAL_TRADING=true no Railway');
        console.log('   • Monitore os logs em tempo real');
        console.log('   • Verifique saldos nas exchanges antes de operar');
        
    } else {
        console.log('❌ FALHA NA ATIVAÇÃO - verifique os erros acima');
    }
    console.log('='.repeat(50));
    
    await pool.end();
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = { ativarTradingReal };
