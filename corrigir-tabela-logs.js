// 🔧 CORREÇÃO FINAL DA TABELA DE LOGS
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: 'postgresql://postgres:ELjbkkgUASRCtdTAXVFgIssOXiLsRCPq@trolley.proxy.rlwy.net:44790/railway',
    ssl: { rejectUnauthorized: false }
});

async function corrigirTabelaLogs() {
    console.log('🔧 CORRIGINDO TABELA DE LOGS');
    console.log('============================');
    
    try {
        // Verificar estrutura atual da tabela
        const estruturaAtual = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'system_logs' 
            ORDER BY ordinal_position
        `);
        
        console.log('📊 Estrutura atual da tabela system_logs:');
        estruturaAtual.rows.forEach(col => {
            console.log(`   ${col.column_name} (${col.data_type})`);
        });
        
        // Adicionar colunas ausentes
        const colunasNecessarias = [
            'details JSONB',
            'error_stack TEXT',
            'user_id INTEGER',
            'session_id VARCHAR(100)',
            'ip_address VARCHAR(45)'
        ];
        
        for (const coluna of colunasNecessarias) {
            const [nome] = coluna.split(' ');
            const existe = estruturaAtual.rows.find(row => row.column_name === nome);
            
            if (!existe) {
                console.log(`   ➕ Adicionando coluna ${nome}...`);
                await pool.query(`ALTER TABLE system_logs ADD COLUMN ${coluna}`);
                console.log(`   ✅ Coluna ${nome} adicionada`);
            } else {
                console.log(`   ✅ Coluna ${nome} já existe`);
            }
        }
        
        // Testar inserção de log
        console.log('\n🧪 Testando inserção de logs...');
        await pool.query(`
            INSERT INTO system_logs (level, component, message, details)
            VALUES ('INFO', 'SYSTEM', 'Tabela de logs corrigida', '{"fix_applied": true}')
        `);
        console.log('   ✅ Log de teste inserido com sucesso');
        
        // Verificar se coletor TOP 100 foi criado
        console.log('\n📊 Iniciando coletor TOP 100...');
        
        if (require('fs').existsSync('top100-collector.js')) {
            console.log('   ✅ Arquivo top100-collector.js existe');
            
            // Executar coletor uma vez para testar
            const Top100Collector = require('./top100-collector.js');
            const collector = new Top100Collector();
            
            console.log('   🔄 Executando coleta inicial...');
            await collector.coletarTop100();
            console.log('   ✅ Coleta inicial concluída');
            
        } else {
            console.log('   ❌ Arquivo top100-collector.js não encontrado');
        }
        
        // Verificar dados do TOP 100
        const top100Stats = await pool.query(`
            SELECT 
                COUNT(*) as total,
                COUNT(CASE WHEN percent_change_24h > 0 THEN 1 END) as up_count,
                AVG(percent_change_24h) as avg_change
            FROM top100_cryptocurrencies
        `);
        
        if (top100Stats.rows[0].total > 0) {
            const upPercentage = (top100Stats.rows[0].up_count / top100Stats.rows[0].total) * 100;
            console.log(`\n📊 STATUS TOP 100:`);
            console.log(`   📈 Total criptos: ${top100Stats.rows[0].total}`);
            console.log(`   📊 Subindo: ${upPercentage.toFixed(1)}%`);
            console.log(`   📉 Mudança média: ${parseFloat(top100Stats.rows[0].avg_change).toFixed(2)}%`);
        }
        
        console.log('\n✅ CORREÇÕES FINALIZADAS COM SUCESSO!');
        
    } catch (error) {
        console.error('❌ Erro:', error);
    } finally {
        await pool.end();
    }
}

corrigirTabelaLogs();
