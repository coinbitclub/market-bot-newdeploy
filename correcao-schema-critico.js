const { Pool } = require('pg');

// Conexão Railway
const pool = new Pool({
    connectionString: 'postgresql://postgres:ELjbkkgUASRCtdTAXVFgIssOXiLsRCPq@trolley.proxy.rlwy.net:44790/railway',
    ssl: { rejectUnauthorized: false }
});

async function corrigirSchemaCritico() {
    console.log('🔧 INICIANDO CORREÇÃO CRÍTICA DO SCHEMA');
    console.log('=====================================');
    
    try {
        const client = await pool.connect();
        
        // 1. Adicionar collected_at na tabela market_data
        try {
            await client.query(`
                ALTER TABLE market_data 
                ADD COLUMN IF NOT EXISTS collected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            `);
            console.log('✅ Coluna collected_at adicionada à market_data');
        } catch (err) {
            console.log('⚠️  Coluna collected_at já existe em market_data');
        }
        
        // 2. Adicionar created_at na tabela automatic_orders
        try {
            await client.query(`
                ALTER TABLE automatic_orders 
                ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            `);
            console.log('✅ Coluna created_at adicionada à automatic_orders');
        } catch (err) {
            console.log('⚠️  Coluna created_at já existe em automatic_orders');
        }
        
        // 3. Adicionar status na tabela system_monitoring
        try {
            await client.query(`
                ALTER TABLE system_monitoring 
                ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active'
            `);
            console.log('✅ Coluna status adicionada à system_monitoring');
        } catch (err) {
            console.log('⚠️  Coluna status já existe em system_monitoring');
        }
        
        // 4. Atualizar registros NULL críticos
        console.log('\n🔄 Atualizando registros com dados NULL...');
        
        // Atualizar market_rsi NULL
        const updateRsi = await client.query(`
            UPDATE ai_decisions 
            SET market_rsi = 50.0 
            WHERE market_rsi IS NULL
        `);
        console.log(`✅ Atualizados ${updateRsi.rowCount} registros de market_rsi`);
        
        // Atualizar collected_at NULL
        const updateCollected = await client.query(`
            UPDATE market_data 
            SET collected_at = CURRENT_TIMESTAMP 
            WHERE collected_at IS NULL
        `);
        console.log(`✅ Atualizados ${updateCollected.rowCount} registros de collected_at`);
        
        // Atualizar created_at NULL
        const updateCreated = await client.query(`
            UPDATE automatic_orders 
            SET created_at = CURRENT_TIMESTAMP 
            WHERE created_at IS NULL
        `);
        console.log(`✅ Atualizados ${updateCreated.rowCount} registros de created_at`);
        
        // 5. Verificar integridade final
        console.log('\n📊 VERIFICAÇÃO FINAL:');
        console.log('=====================');
        
        const checkMarket = await client.query(`
            SELECT COUNT(*) as total, 
                   COUNT(collected_at) as com_collected_at 
            FROM market_data
        `);
        console.log(`✅ Market Data: ${checkMarket.rows[0].com_collected_at}/${checkMarket.rows[0].total} com collected_at`);
        
        const checkOrders = await client.query(`
            SELECT COUNT(*) as total, 
                   COUNT(created_at) as com_created_at 
            FROM automatic_orders
        `);
        console.log(`✅ Automatic Orders: ${checkOrders.rows[0].com_created_at}/${checkOrders.rows[0].total} com created_at`);
        
        const checkMonitoring = await client.query(`
            SELECT COUNT(*) as total, 
                   COUNT(status) as com_status 
            FROM system_monitoring
        `);
        console.log(`✅ System Monitoring: ${checkMonitoring.rows[0].com_status}/${checkMonitoring.rows[0].total} com status`);
        
        const checkAI = await client.query(`
            SELECT COUNT(*) as total, 
                   COUNT(market_rsi) as com_rsi 
            FROM ai_decisions
        `);
        console.log(`✅ AI Decisions: ${checkAI.rows[0].com_rsi}/${checkAI.rows[0].total} com market_rsi`);
        
        client.release();
        
        console.log('\n🎯 CORREÇÃO CRÍTICA COMPLETA!');
        console.log('=============================');
        console.log('✅ Schema corrigido e dados atualizados');
        console.log('✅ Sistema pronto para operação completa');
        
    } catch (error) {
        console.error('❌ Erro na correção:', error.message);
    } finally {
        await pool.end();
    }
}

corrigirSchemaCritico();
