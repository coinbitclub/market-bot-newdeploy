#!/usr/bin/env node

/**
 * 💰 COINBITCLUB - ANÁLISE DETALHADA DE SALDOS
 * ===========================================
 * Análise completa dos saldos de usuários e origem dos valores
 */

require('dotenv').config();
const { Pool } = require('pg');

async function analisarSaldosDetalhado() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL || 'postgresql://postgres:ELjbkkgUASRCtdTAXVFgIssOXiLsRCPq@trolley.proxy.rlwy.net:44790/railway',
        ssl: { rejectUnauthorized: false }
    });

    console.log('💰 ANÁLISE DETALHADA DOS SALDOS');
    console.log('================================\n');

    try {
        // 1. Análise geral dos usuários
        const usuarios = await pool.query(`
            SELECT 
                id, email,
                balance_brl, balance_usd, 
                trading_active,
                created_at,
                EXTRACT(days FROM NOW() - created_at) as dias_criado
            FROM users 
            ORDER BY created_at DESC
        `);

        console.log('👥 USUÁRIOS CADASTRADOS:\n');
        let totalBRL = 0;
        let totalUSD = 0;
        let usuariosTest = 0;
        let usuariosReais = 0;

        usuarios.rows.forEach((user, index) => {
            const brl = parseFloat(user.balance_brl) || 0;
            const usd = parseFloat(user.balance_usd) || 0;
            const diasCriado = Math.floor(user.dias_criado);
            
            totalBRL += brl;
            totalUSD += usd;

            // Identificar se é conta de teste
            const isTest = user.email.includes('test') ||
                          user.email.includes('exemplo') ||
                          user.email.includes('usuario');
            
            if (isTest) usuariosTest++;
            else usuariosReais++;

            const status = user.trading_active ? '🟢' : '🔴';
            const tipo = isTest ? '🧪' : '👤';
            const urgencia = isTest && diasCriado >= 7 ? '⚠️ EXPIRADO' : '';

            console.log(`${(index + 1).toString().padStart(2)}. ${tipo} ${user.email.padEnd(25)} | BRL: R$ ${brl.toFixed(2).padStart(8)} | USD: $ ${usd.toFixed(2).padStart(8)} | ${status} | ${diasCriado}d ${urgencia}`);
        });

        console.log('\n💵 RESUMO FINANCEIRO:');
        console.log('===================');
        console.log(`Total BRL: R$ ${totalBRL.toFixed(2)}`);
        console.log(`Total USD: $ ${totalUSD.toFixed(2)}`);
        console.log(`Conversão USD para BRL (taxa 5.8): R$ ${(totalUSD * 5.8).toFixed(2)}`);
        console.log(`SALDO TOTAL CONVERTIDO: R$ ${(totalBRL + (totalUSD * 5.8)).toFixed(2)}`);

        console.log('\n🧪 ANÁLISE DE CONTAS:');
        console.log('====================');
        console.log(`Usuários aparentemente REAIS: ${usuariosReais}`);
        console.log(`Usuários aparentemente TESTE: ${usuariosTest}`);

        // 2. Verificar usuários teste expirados
        const testExpirados = usuarios.rows.filter(u => {
            const isTest = u.email.includes('test') || 
                          u.email.includes('exemplo') ||
                          u.email.includes('usuario');
            return isTest && u.dias_criado >= 7;
        });

        if (testExpirados.length > 0) {
            console.log('\n⚠️ USUÁRIOS TESTE EXPIRADOS (>7 dias):');
            testExpirados.forEach(user => {
                const brl = parseFloat(user.balance_brl) || 0;
                const usd = parseFloat(user.balance_usd) || 0;
                console.log(`   ${user.email} - ${Math.floor(user.dias_criado)} dias - R$ ${brl.toFixed(2)} + $ ${usd.toFixed(2)}`);
            });
        }

        // 3. Verificar origem dos saldos
        console.log('\n🔍 ORIGEM DOS SALDOS:');
        console.log('====================');
        
        const saldosAltos = usuarios.rows.filter(u => (parseFloat(u.balance_brl) || 0) > 1000);
        if (saldosAltos.length > 0) {
            console.log('Usuários com saldo BRL > R$ 1000:');
            saldosAltos.forEach(user => {
                console.log(`   ${user.email}: R$ ${parseFloat(user.balance_brl).toFixed(2)}`);
            });
        }

        // 4. Análise de atividade trading
        const usuariosAtivos = await pool.query(`
            SELECT COUNT(*) as count FROM users WHERE trading_active = true
        `);

        const posicoes = await pool.query(`
            SELECT COUNT(*) as count FROM active_positions
        `);

        const ordens = await pool.query(`
            SELECT COUNT(*) as count FROM orders
        `);

        console.log('\n📊 ATIVIDADE DO SISTEMA:');
        console.log('========================');
        console.log(`Usuários com trading ativo: ${usuariosAtivos.rows[0].count}`);
        console.log(`Posições ativas: ${posicoes.rows[0].count}`);
        console.log(`Total de ordens: ${ordens.rows[0].count}`);

        // 5. Recomendações
        console.log('\n💡 RECOMENDAÇÕES:');
        console.log('=================');
        
        if (usuariosTest > usuariosReais) {
            console.log('⚠️ Muitas contas de teste detectadas');
            console.log('   → Considere implementar limpeza automática');
        }
        
        if (testExpirados.length > 0) {
            console.log(`⚠️ ${testExpirados.length} contas teste expiradas encontradas`);
            console.log('   → Execute sistema de limpeza para removê-las');
        }
        
        if (totalBRL > 10000) {
            console.log('⚠️ Saldo total alto para ambiente de teste');
            console.log('   → Verifique se são valores reais ou para teste');
        }

        console.log('\n✅ Análise concluída!');

    } catch (error) {
        console.error('❌ Erro na análise:', error.message);
    } finally {
        await pool.end();
    }
}

analisarSaldosDetalhado();
