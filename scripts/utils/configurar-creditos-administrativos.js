#!/usr/bin/env node

/**
 * 💰 COINBITCLUB - CONFIGURAÇÃO DE CRÉDITOS ADMINISTRATIVOS
 * =========================================================
 * Configura R$ 1000 de crédito administrativo para usuários reais
 * Remove usuários de teste e ajusta saldos
 */

require('dotenv').config();
const { Pool } = require('pg');

class ConfiguradorCreditosAdministrativos {
    constructor() {
        this.pool = new Pool({
            connectionString: process.env.DATABASE_URL || 'process.env.DATABASE_URL',
            ssl: { rejectUnauthorized: false }
        });
    }

    async executar() {
        console.log('💰 CONFIGURANDO CRÉDITOS ADMINISTRATIVOS');
        console.log('=========================================\n');

        try {
            // 1. Verificar usuários atuais
            await this.verificarUsuariosAtuais();
            
            // 2. Remover usuários de teste
            await this.removerUsuariosTeste();
            
            // 3. Configurar créditos para usuários reais
            await this.configurarCreditosReais();
            
            // 4. Verificar resultado final
            await this.verificarResultadoFinal();
            
            console.log('\n✅ Configuração de créditos concluída!');
            
        } catch (error) {
            console.error('❌ Erro:', error.message);
        } finally {
            await this.pool.end();
        }
    }

    async verificarUsuariosAtuais() {
        console.log('👥 USUÁRIOS ATUAIS NO SISTEMA:\n');
        
        const usuarios = await this.pool.query(`
            SELECT id, email, balance_brl, balance_usd, trading_active, created_at
            FROM users 
            ORDER BY id
        `);
        
        console.log('ID | EMAIL                     | BRL      | USD      | ATIVO | CRIADO');
        console.log('---|---------------------------|----------|----------|-------|--------');
        
        let totalBRL = 0;
        let totalUSD = 0;
        
        usuarios.rows.forEach(user => {
            const brl = parseFloat(user.balance_brl) || 0;
            const usd = parseFloat(user.balance_usd) || 0;
            const status = user.trading_active ? '✅' : '❌';
            const data = new Date(user.created_at).toLocaleDateString();
            
            totalBRL += brl;
            totalUSD += usd;
            
            console.log(`${user.id.toString().padStart(2)} | ${user.email.padEnd(25)} | ${brl.toFixed(2).padStart(8)} | ${usd.toFixed(2).padStart(8)} | ${status} | ${data}`);
        });
        
        console.log('---|---------------------------|----------|----------|-------|--------');
        console.log(`   | TOTAL                     | ${totalBRL.toFixed(2).padStart(8)} | ${totalUSD.toFixed(2).padStart(8)} |       |`);
        console.log(`\nTotal de usuários: ${usuarios.rows.length}`);
        console.log(`Saldo total convertido: R$ ${(totalBRL + (totalUSD * 5.8)).toFixed(2)}\n`);
    }

    async removerUsuariosTeste() {
        console.log('🗑️ REMOVENDO USUÁRIOS DE TESTE...\n');
        
        // Identificar usuários de teste
        const usuariosTeste = await this.pool.query(`
            SELECT id, email, balance_brl, balance_usd
            FROM users 
            WHERE (
                email ILIKE '%test%' OR 
                email ILIKE '%exemplo%' OR
                email ILIKE '%usuario%' OR
                email LIKE 'usuario%@test.com'
            )
        `);
        
        if (usuariosTeste.rows.length > 0) {
            console.log(`Encontrados ${usuariosTeste.rows.length} usuários de teste para remoção:`);
            
            let saldoTotalRemovido = 0;
            
            for (const user of usuariosTeste.rows) {
                const brl = parseFloat(user.balance_brl) || 0;
                const usd = parseFloat(user.balance_usd) || 0;
                saldoTotalRemovido += brl + (usd * 5.8);
                
                console.log(`   🗑️ Removendo: ${user.email} - R$ ${brl.toFixed(2)} + $ ${usd.toFixed(2)}`);
                
                // Limpar dados relacionados
                await this.pool.query('DELETE FROM active_positions WHERE user_id = $1', [user.id]);
                await this.pool.query('DELETE FROM orders WHERE user_id = $1', [user.id]);
                await this.pool.query('DELETE FROM ticker_blocks WHERE user_id = $1', [user.id]);
                
                // Remover usuário
                await this.pool.query('DELETE FROM users WHERE id = $1', [user.id]);
            }
            
            console.log(`\n✅ Removidos ${usuariosTeste.rows.length} usuários de teste`);
            console.log(`💰 Saldo total removido: R$ ${saldoTotalRemovido.toFixed(2)}\n`);
        } else {
            console.log('✅ Nenhum usuário de teste encontrado\n');
        }
    }

    async configurarCreditosReais() {
        console.log('💳 CONFIGURANDO CRÉDITOS ADMINISTRATIVOS...\n');
        
        // Buscar usuários restantes (reais)
        const usuariosReais = await this.pool.query(`
            SELECT id, email, balance_brl, balance_usd, trading_active
            FROM users 
            ORDER BY id
        `);
        
        if (usuariosReais.rows.length === 0) {
            console.log('⚠️ Nenhum usuário real encontrado!');
            console.log('🔧 Criando usuário gestor padrão...\n');
            
            // Criar usuário gestor padrão
            await this.pool.query(`
                INSERT INTO users (
                    email, balance_brl, balance_usd, trading_active,
                    daily_profit, total_trades, win_rate, created_at
                ) VALUES (
                    'gestor@coinbitclub.com', 1000.00, 0.00, true,
                    0.00, 0, 0.00, NOW()
                )
            `);
            
            console.log('✅ Usuário gestor criado: gestor@coinbitclub.com');
            
            // Buscar novamente
            const novoGestor = await this.pool.query(`
                SELECT id, email, balance_brl, balance_usd, trading_active
                FROM users 
                WHERE email = 'gestor@coinbitclub.com'
            `);
            
            usuariosReais.rows = novoGestor.rows;
        }
        
        console.log(`Configurando R$ 1000,00 para ${usuariosReais.rows.length} usuário(s) real(is):`);
        
        for (const user of usuariosReais.rows) {
            const saldoAnteriorBRL = parseFloat(user.balance_brl) || 0;
            const saldoAnteriorUSD = parseFloat(user.balance_usd) || 0;
            
            // Configurar exatamente R$ 1000 e zerar USD
            await this.pool.query(`
                UPDATE users 
                SET balance_brl = 1000.00, 
                    balance_usd = 0.00,
                    trading_active = true,
                    updated_at = NOW()
                WHERE id = $1
            `, [user.id]);
            
            console.log(`   💰 ${user.email}:`);
            console.log(`      Anterior: R$ ${saldoAnteriorBRL.toFixed(2)} + $ ${saldoAnteriorUSD.toFixed(2)}`);
            console.log(`      Novo:     R$ 1000.00 + $ 0.00`);
        }
        
        console.log(`\n✅ Créditos administrativos configurados para ${usuariosReais.rows.length} usuário(s)\n`);
    }

    async verificarResultadoFinal() {
        console.log('📊 RESULTADO FINAL:\n');
        
        const usuariosFinais = await this.pool.query(`
            SELECT id, email, balance_brl, balance_usd, trading_active, created_at
            FROM users 
            ORDER BY id
        `);
        
        if (usuariosFinais.rows.length === 0) {
            console.log('⚠️ Nenhum usuário no sistema!');
            return;
        }
        
        console.log('ID | EMAIL                     | BRL      | USD      | ATIVO | STATUS');
        console.log('---|---------------------------|----------|----------|-------|--------');
        
        let totalBRL = 0;
        let totalUSD = 0;
        let usuariosAtivos = 0;
        
        usuariosFinais.rows.forEach(user => {
            const brl = parseFloat(user.balance_brl) || 0;
            const usd = parseFloat(user.balance_usd) || 0;
            const ativo = user.trading_active;
            const status = ativo ? '✅ ATIVO' : '❌ INATIVO';
            
            totalBRL += brl;
            totalUSD += usd;
            if (ativo) usuariosAtivos++;
            
            console.log(`${user.id.toString().padStart(2)} | ${user.email.padEnd(25)} | ${brl.toFixed(2).padStart(8)} | ${usd.toFixed(2).padStart(8)} | ${ativo ? '✅' : '❌'} | ${status}`);
        });
        
        console.log('---|---------------------------|----------|----------|-------|--------');
        console.log(`   | TOTAL                     | ${totalBRL.toFixed(2).padStart(8)} | ${totalUSD.toFixed(2).padStart(8)} |       |`);
        
        console.log('\n📈 RESUMO:');
        console.log(`   👥 Usuários totais: ${usuariosFinais.rows.length}`);
        console.log(`   🟢 Usuários ativos: ${usuariosAtivos}`);
        console.log(`   💰 Saldo total BRL: R$ ${totalBRL.toFixed(2)}`);
        console.log(`   💵 Saldo total USD: $ ${totalUSD.toFixed(2)}`);
        console.log(`   🏦 Total convertido: R$ ${(totalBRL + (totalUSD * 5.8)).toFixed(2)}`);
        
        // Verificar se cada usuário tem exatamente R$ 1000
        const creditosCorretos = usuariosFinais.rows.every(u => parseFloat(u.balance_brl) === 1000.00);
        
        if (creditosCorretos) {
            console.log('\n✅ TODOS OS USUÁRIOS TÊM EXATAMENTE R$ 1000,00 DE CRÉDITO ADMINISTRATIVO');
        } else {
            console.log('\n⚠️ ALGUNS USUÁRIOS NÃO TÊM O CRÉDITO CORRETO');
        }
    }
}

// Executar configuração
const configurador = new ConfiguradorCreditosAdministrativos();
configurador.executar();


module.exports = ConfiguradorCreditosAdministrativos;
