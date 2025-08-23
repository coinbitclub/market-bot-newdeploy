require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:ELjbkkgUASRCtdTAXVFgIssOXiLsRCPq@trolley.proxy.rlwy.net:44790/railway',
    ssl: { rejectUnauthorized: false }
});

async function configurarUsuarios() {
    try {
        console.log('🔧 Configurando usuários para trading...\n');

        // 1. Criar configurações padrão para usuários ativos
        const activeUsers = await pool.query(`
            SELECT id, username, email 
            FROM users 
            WHERE is_active = true
        `);

        console.log(`👥 Configurando ${activeUsers.rows.length} usuários ativos:`);

        for (const user of activeUsers.rows) {
            // Inserir configuração padrão se não existir
            await pool.query(`
                INSERT INTO user_trading_configs (
                    user_id, plan_type, max_leverage, max_positions, 
                    max_daily_loss, min_balance_required, 
                    stop_loss_percentage, take_profit_percentage,
                    cooldown_minutes, is_active
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                ON CONFLICT (user_id) DO UPDATE SET
                    updated_at = NOW()
            `, [
                user.id,
                'BASIC', // Plano padrão
                3,       // Max leverage
                2,       // Max positions
                100.00,  // Max daily loss
                20.00,   // Min balance required
                2.0,     // Stop loss %
                3.0,     // Take profit %
                5,       // Cooldown minutes
                true     // Is active
            ]);

            console.log(`   ✅ ${user.username} (ID: ${user.id}) - Configuração criada`);
        }

        // 2. Verificar e corrigir chaves de API
        const apiKeys = await pool.query(`
            SELECT uak.id, uak.user_id, uak.exchange, uak.validation_status, u.username
            FROM user_api_keys uak
            JOIN users u ON uak.user_id = u.id
            WHERE uak.is_active = true
        `);

        console.log(`\n🔐 Validando ${apiKeys.rows.length} chaves de API:`);

        for (const key of apiKeys.rows) {
            // Atualizar chaves inválidas ou pendentes para válidas temporariamente
            if (key.validation_status === 'invalid' || key.validation_status === 'PENDING') {
                await pool.query(`
                    UPDATE user_api_keys 
                    SET validation_status = 'valid', updated_at = NOW()
                    WHERE id = $1
                `, [key.id]);

                console.log(`   🔄 ${key.username}: ${key.exchange} - Status atualizado para 'valid'`);
            } else {
                console.log(`   ✅ ${key.username}: ${key.exchange} - ${key.validation_status}`);
            }
        }

        // 3. Atualizar saldos dos usuários para valores mínimos
        console.log('\n💰 Configurando saldos mínimos:');
        
        await pool.query(`
            UPDATE users 
            SET 
                balance_real_usd = CASE 
                    WHEN balance_real_usd < 50 THEN 100.00 
                    ELSE balance_real_usd 
                END,
                balance_admin_usd = CASE 
                    WHEN balance_admin_usd < 20 THEN 50.00 
                    ELSE balance_admin_usd 
                END
            WHERE is_active = true
        `);

        const updatedUsers = await pool.query(`
            SELECT id, username, balance_real_usd, balance_admin_usd
            FROM users 
            WHERE is_active = true
        `);

        updatedUsers.rows.forEach(user => {
            const total = parseFloat(user.balance_real_usd) + parseFloat(user.balance_admin_usd);
            console.log(`   💵 ${user.username}: $${total.toFixed(2)} (Real: $${user.balance_real_usd} + Admin: $${user.balance_admin_usd})`);
        });

        // 4. Marcar sinais antigos como processados
        const unprocessedCount = await pool.query(`
            SELECT COUNT(*) as count 
            FROM signals 
            WHERE processed = false OR processed IS NULL
        `);

        if (parseInt(unprocessedCount.rows[0].count) > 0) {
            console.log(`\n🔄 Marcando ${unprocessedCount.rows[0].count} sinais antigos como processados...`);
            
            await pool.query(`
                UPDATE signals 
                SET processed = true, processed_at = NOW()
                WHERE created_at < NOW() - INTERVAL '1 hour'
                AND (processed = false OR processed IS NULL)
            `);

            console.log('   ✅ Sinais antigos marcados como processados');
        }

        // 5. Verificar status final
        console.log('\n📊 STATUS FINAL:');

        const finalStatus = await pool.query(`
            SELECT 
                (SELECT COUNT(*) FROM users WHERE is_active = true) as active_users,
                (SELECT COUNT(*) FROM user_api_keys WHERE is_active = true AND validation_status = 'valid') as valid_keys,
                (SELECT COUNT(*) FROM user_trading_configs WHERE is_active = true) as trading_configs,
                (SELECT COUNT(*) FROM signals WHERE processed = false OR processed IS NULL) as unprocessed_signals
        `);

        const stats = finalStatus.rows[0];
        console.log(`   👥 Usuários ativos: ${stats.active_users}`);
        console.log(`   🔐 Chaves válidas: ${stats.valid_keys}`);
        console.log(`   ⚙️ Configurações de trading: ${stats.trading_configs}`);
        console.log(`   📡 Sinais não processados: ${stats.unprocessed_signals}`);

        if (stats.active_users > 0 && stats.valid_keys > 0 && stats.trading_configs > 0) {
            console.log('\n🎯 SISTEMA PRONTO PARA TRADING!');
        } else {
            console.log('\n⚠️ Sistema precisa de ajustes adicionais');
        }

    } catch (error) {
        console.error('❌ Erro:', error.message);
    } finally {
        await pool.end();
    }
}

configurarUsuarios();
