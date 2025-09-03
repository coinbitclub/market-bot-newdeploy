#!/usr/bin/env node

/**
 * 💰 COINBITCLUB - CONFIGURADOR DE CRÉDITOS ESPECÍFICOS
 * =====================================================
 * Configurar saldo administrativo apenas para IDs específicos
 */

require('dotenv').config();
const { Pool } = require('pg');

async function configurarCreditosEspecificos() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL || 'process.env.DATABASE_URL',
        ssl: { rejectUnauthorized: false }
    });

    console.log('💰 CONFIGURANDO CRÉDITOS ESPECÍFICOS');
    console.log('=====================================\n');

    try {
        // 1. Primeiro, verificar todos os usuários atuais
        console.log('👥 USUÁRIOS ATUAIS:');
        const todosUsuarios = await pool.query(`
            SELECT id, email, balance_brl, balance_usd, trading_active
            FROM users 
            ORDER BY id
        `);

        console.log('ID | Email                    | BRL      | USD      | Ativo');
        console.log('---|--------------------------|----------|----------|-------');
        todosUsuarios.rows.forEach(user => {
            const brl = parseFloat(user.balance_brl) || 0;
            const usd = parseFloat(user.balance_usd) || 0;
            const status = user.trading_active ? '✅' : '❌';
            console.log(`${user.id.toString().padStart(2)} | ${user.email.padEnd(24)} | ${brl.toFixed(2).padStart(8)} | ${usd.toFixed(2).padStart(8)} | ${status}`);
        });

        // 2. Zerar saldos de TODOS os usuários primeiro
        console.log('\n🧹 ZERANDO TODOS OS SALDOS...');
        await pool.query(`
            UPDATE users 
            SET balance_brl = 0.00, 
                balance_usd = 0.00,
                trading_active = false
        `);
        console.log('   ✅ Todos os saldos zerados');

        // 3. Configurar R$ 1000 APENAS para IDs 14, 15 e 16
        console.log('\n💳 CONFIGURANDO CRÉDITOS ADMINISTRATIVOS:');
        const idsEspecificos = [14, 15, 16];
        
        for (const id of idsEspecificos) {
            try {
                const resultado = await pool.query(`
                    UPDATE users 
                    SET balance_brl = 1000.00, 
                        balance_usd = 0.00,
                        trading_active = true
                    WHERE id = $1
                    RETURNING email
                `, [id]);

                if (resultado.rows.length > 0) {
                    console.log(`   ✅ ID ${id} (${resultado.rows[0].email}): R$ 1000,00`);
                } else {
                    console.log(`   ❌ ID ${id}: Usuário não encontrado`);
                }
            } catch (error) {
                console.log(`   ❌ ID ${id}: Erro - ${error.message}`);
            }
        }

        // 4. Verificar resultado final
        console.log('\n📊 RESULTADO FINAL:');
        const usuariosFinais = await pool.query(`
            SELECT 
                id, email, balance_brl, balance_usd, trading_active,
                CASE WHEN balance_brl > 0 THEN '💰' ELSE '🔒' END as status_credito
            FROM users 
            ORDER BY id
        `);

        let totalBRL = 0;
        let usuariosAtivos = 0;

        console.log('\nID | Email                    | BRL      | USD      | Ativo | Status');
        console.log('---|--------------------------|----------|----------|-------|--------');
        
        usuariosFinais.rows.forEach(user => {
            const brl = parseFloat(user.balance_brl) || 0;
            const usd = parseFloat(user.balance_usd) || 0;
            const ativo = user.trading_active ? '✅' : '❌';
            
            totalBRL += brl;
            if (user.trading_active) usuariosAtivos++;

            console.log(`${user.id.toString().padStart(2)} | ${user.email.padEnd(24)} | ${brl.toFixed(2).padStart(8)} | ${usd.toFixed(2).padStart(8)} | ${ativo}    | ${user.status_credito}`);
        });

        console.log('\n💵 RESUMO:');
        console.log(`   Total de usuários: ${usuariosFinais.rows.length}`);
        console.log(`   Usuários ativos: ${usuariosAtivos}`);
        console.log(`   Saldo total: R$ ${totalBRL.toFixed(2)}`);
        console.log(`   Créditos administrativos: IDs 14, 15, 16`);

        console.log('\n✅ Configuração concluída com sucesso!');

    } catch (error) {
        console.error('❌ Erro na configuração:', error.message);
    } finally {
        await pool.end();
    }
}

configurarCreditosEspecificos();
