#!/usr/bin/env node
/**
 * 🔍 DIAGNÓSTICO URGENTE - POR QUE AS ORDENS NÃO EXECUTAM
 * Investigar e corrigir o problema das ordens simuladas
 */

const { Pool } = require('pg');

console.log('🔍 DIAGNÓSTICO URGENTE - ORDENS NÃO EXECUTANDO');
console.log('============================================');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:FDjupFGvAzzwbuZMRyVxlJBXsQtphlHv@maglev.proxy.rlwy.net:42095/railway',
    ssl: { rejectUnauthorized: false }
});

async function diagnosticarSistema() {
    console.log('\n1️⃣ VERIFICANDO VARIÁVEIS DE AMBIENTE...');
    
    console.log(`   ENABLE_REAL_TRADING: ${process.env.ENABLE_REAL_TRADING || 'NOT SET'}`);
    console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'NOT SET'}`);
    console.log(`   DATABASE_URL: ${process.env.DATABASE_URL ? 'CONFIGURADO' : 'NOT SET'}`);
    
    console.log('\n2️⃣ VERIFICANDO SINAIS RECENTES...');
    
    try {
        const sinais = await pool.query(`
            SELECT 
                id, symbol, action, price, 
                created_at, processed,
                ai_decision, ai_confidence
            FROM trading_signals 
            WHERE created_at > NOW() - INTERVAL '2 hours'
            ORDER BY created_at DESC
            LIMIT 10
        `);
        
        console.log(`   📡 ${sinais.rows.length} sinais nas últimas 2 horas`);
        
        sinais.rows.forEach((sinal, i) => {
            const status = sinal.processed ? '✅ Processado' : '⏳ Pendente';
            const ai = sinal.ai_decision ? `AI: ${sinal.ai_decision}` : 'AI: Não decidiu';
            console.log(`   ${i+1}. ${sinal.symbol} ${sinal.action} - ${status} - ${ai}`);
        });
        
    } catch (error) {
        console.error('   ❌ Erro ao verificar sinais:', error.message);
    }
    
    console.log('\n3️⃣ VERIFICANDO EXECUÇÕES DE ORDENS...');
    
    try {
        // Verificar tabelas de ordens
        const tabelasOrdens = ['orders', 'real_orders', 'order_executions', 'trade_executions'];
        
        for (const tabela of tabelasOrdens) {
            try {
                const count = await pool.query(`
                    SELECT COUNT(*) as count 
                    FROM ${tabela} 
                    WHERE created_at > NOW() - INTERVAL '24 hours'
                `);
                
                console.log(`   📊 ${tabela}: ${count.rows[0].count} registros (24h)`);
                
                if (parseInt(count.rows[0].count) > 0) {
                    const sample = await pool.query(`
                        SELECT * FROM ${tabela} 
                        ORDER BY created_at DESC 
                        LIMIT 1
                    `);
                    
                    const ultimo = sample.rows[0];
                    console.log(`      💡 Último: ${ultimo.symbol || ultimo.ticker || 'N/A'} - ${ultimo.status || ultimo.side || 'N/A'}`);
                }
                
            } catch (error) {
                console.log(`   ❌ Tabela ${tabela} não existe ou erro: ${error.message}`);
            }
        }
        
    } catch (error) {
        console.error('   ❌ Erro ao verificar execuções:', error.message);
    }
    
    console.log('\n4️⃣ VERIFICANDO USUÁRIOS COM CHAVES ATIVAS...');
    
    try {
        const usuarios = await pool.query(`
            SELECT 
                id, username,
                binance_api_key IS NOT NULL as tem_binance,
                bybit_api_key IS NOT NULL as tem_bybit,
                trading_active, ativo,
                balance_brl, balance_usd, balance
            FROM users
            WHERE 
                (binance_api_key IS NOT NULL OR bybit_api_key IS NOT NULL)
                AND (trading_active = true OR ativo = true)
            ORDER BY id
        `);
        
        console.log(`   👥 ${usuarios.rows.length} usuários qualificados`);
        
        usuarios.rows.forEach((user, i) => {
            const exchanges = [];
            if (user.tem_binance) exchanges.push('🟡 Binance');
            if (user.tem_bybit) exchanges.push('🟣 Bybit');
            
            const saldo = (user.balance_brl || 0) + (user.balance_usd || 0) + (user.balance || 0);
            const trading = user.trading_active || user.ativo ? '✅' : '❌';
            
            console.log(`   ${i+1}. ${user.username} ${trading} - ${exchanges.join(' ')} - $${saldo}`);
        });
        
    } catch (error) {
        console.error('   ❌ Erro ao verificar usuários:', error.message);
    }
    
    console.log('\n5️⃣ VERIFICANDO SISTEMA RUNNING...');
    
    try {
        // Verificar se há algum processo do sistema rodando
        const { exec } = require('child_process');
        
        exec('tasklist /FI "IMAGENAME eq node.exe"', (error, stdout, stderr) => {
            if (error) {
                console.log('   ❌ Erro ao verificar processos:', error.message);
                return;
            }
            
            const linhas = stdout.split('\n').filter(linha => linha.includes('node.exe'));
            console.log(`   💻 ${linhas.length} processos Node.js rodando`);
            
            if (linhas.length > 0) {
                console.log('   📊 Processos ativos:');
                linhas.forEach((linha, i) => {
                    if (linha.trim()) {
                        console.log(`      ${i+1}. ${linha.trim()}`);
                    }
                });
            }
        });
        
    } catch (error) {
        console.error('   ❌ Erro ao verificar processos:', error.message);
    }
    
    console.log('\n6️⃣ IDENTIFICANDO O PROBLEMA...');
    
    // Análise dos dados coletados
    setTimeout(async () => {
        console.log('\n🔍 ANÁLISE DOS RESULTADOS:');
        console.log('========================');
        
        const problemas = [];
        const solucoes = [];
        
        // Verificar ENABLE_REAL_TRADING
        if (process.env.ENABLE_REAL_TRADING !== 'true') {
            problemas.push('❌ ENABLE_REAL_TRADING não está configurado como "true"');
            solucoes.push('✅ Configurar: set ENABLE_REAL_TRADING=true');
        }
        
        // Verificar banco de dados
        try {
            const testConnection = await pool.query('SELECT NOW()');
            console.log('✅ Conexão com banco: OK');
        } catch (error) {
            problemas.push('❌ Problemas de conexão com banco de dados');
            solucoes.push('✅ Verificar DATABASE_URL e conectividade');
        }
        
        if (problemas.length > 0) {
            console.log('\n🚨 PROBLEMAS IDENTIFICADOS:');
            problemas.forEach(problema => console.log(`   ${problema}`));
            
            console.log('\n🔧 SOLUÇÕES RECOMENDADAS:');
            solucoes.forEach(solucao => console.log(`   ${solucao}`));
        } else {
            console.log('\n✅ Sistema parece estar configurado corretamente');
            console.log('🔍 Investigar se o processador de sinais está ativo');
        }
        
        console.log('\n🎯 PRÓXIMOS PASSOS:');
        console.log('1. Configurar ENABLE_REAL_TRADING=true definitivamente');
        console.log('2. Reiniciar o sistema principal');
        console.log('3. Monitorar logs em tempo real');
        console.log('4. Testar com um sinal manual');
        
        await pool.end();
    }, 2000);
}

async function testarOrdemManual() {
    console.log('\n🧪 TESTE DE ORDEM MANUAL...');
    
    try {
        // Simular um sinal de teste
        const sinalTeste = {
            symbol: 'BTCUSDT',
            action: 'BUY',
            price: 50000,
            timestamp: new Date().toISOString()
        };
        
        console.log('📡 Simulando sinal:', sinalTeste);
        
        // Verificar se há usuários que receberiam este sinal
        const usuarios = await pool.query(`
            SELECT id, username FROM users
            WHERE (binance_api_key IS NOT NULL OR bybit_api_key IS NOT NULL)
            AND (trading_active = true OR ativo = true)
            LIMIT 1
        `);
        
        if (usuarios.rows.length > 0) {
            const user = usuarios.rows[0];
            console.log(`👤 Usuário de teste: ${user.username}`);
            
            if (process.env.ENABLE_REAL_TRADING === 'true') {
                console.log('🚀 ENABLE_REAL_TRADING está ativo - ordem seria executada!');
            } else {
                console.log('⚠️ ENABLE_REAL_TRADING não está ativo - ordem seria simulada');
            }
        } else {
            console.log('❌ Nenhum usuário qualificado encontrado');
        }
        
    } catch (error) {
        console.error('❌ Erro no teste:', error.message);
    }
}

async function main() {
    await diagnosticarSistema();
    await testarOrdemManual();
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = { diagnosticarSistema };
