const { createRobustPool, safeQuery } = require('./fixed-database-config.js');

async function checkSystemData() {
    const pool = createRobustPool();
    
    try {
        console.log('🔍 Verificando dados do sistema de leitura do mercado...\n');
        
        // Verificar se a tabela existe
        const tableExists = await safeQuery(pool, `
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'sistema_leitura_mercado'
            ) as exists
        `);
        
        console.log('📊 Tabela sistema_leitura_mercado existe:', tableExists.rows[0]?.exists);
        
        if (tableExists.rows[0]?.exists) {
            // Verificar últimos registros
            const latest = await safeQuery(pool, `
                SELECT id, cycle_number, fear_greed_value, market_direction, 
                       final_recommendation, timestamp, status
                FROM sistema_leitura_mercado 
                ORDER BY timestamp DESC 
                LIMIT 5
            `);
            
            console.log('\n📈 Últimos 5 registros:');
            if (latest.rows.length > 0) {
                latest.rows.forEach((row, index) => {
                    console.log(`   ${index + 1}. ID: ${row.id}, Ciclo: ${row.cycle_number}, F&G: ${row.fear_greed_value}, Direção: ${row.market_direction}, Recomendação: ${row.final_recommendation}, Timestamp: ${row.timestamp}`);
                });
            } else {
                console.log('   ❌ Nenhum registro encontrado!');
            }
            
            // Verificar registros de hoje
            const today = await safeQuery(pool, `
                SELECT COUNT(*) as total 
                FROM sistema_leitura_mercado 
                WHERE DATE(timestamp) = CURRENT_DATE
            `);
            
            console.log('\n📅 Registros de hoje:', today.rows[0]?.total || 0);
            
            // Verificar último registro com dados válidos
            const lastValid = await safeQuery(pool, `
                SELECT fear_greed_value, market_direction, final_recommendation, 
                       timestamp, status
                FROM sistema_leitura_mercado 
                WHERE fear_greed_value IS NOT NULL 
                ORDER BY timestamp DESC 
                LIMIT 1
            `);
            
            if (lastValid.rows.length > 0) {
                const last = lastValid.rows[0];
                console.log('\n🎯 Último registro válido:');
                console.log(`   Fear & Greed: ${last.fear_greed_value}`);
                console.log(`   Direção: ${last.market_direction}`);
                console.log(`   Recomendação: ${last.final_recommendation}`);
                console.log(`   Timestamp: ${last.timestamp}`);
                console.log(`   Status: ${last.status}`);
            } else {
                console.log('\n❌ Nenhum registro válido encontrado!');
            }
        } else {
            console.log('\n❌ Tabela sistema_leitura_mercado não existe!');
            console.log('💡 Execute: node banco-sistema-leitura-mercado.js para criar');
        }
        
        // Verificar se AI analysis está usando dados reais
        const aiAnalysisData = await safeQuery(pool, `
            SELECT COUNT(*) as total FROM ai_analysis 
            WHERE DATE(created_at) = CURRENT_DATE
        `);
        
        console.log('\n🤖 Registros de AI Analysis hoje:', aiAnalysisData.rows[0]?.total || 0);
        
        // Verificar Fear & Greed Index
        const fearGreedData = await safeQuery(pool, `
            SELECT value, classification, created_at 
            FROM fear_greed_index 
            ORDER BY created_at DESC 
            LIMIT 1
        `);
        
        if (fearGreedData.rows.length > 0) {
            const fg = fearGreedData.rows[0];
            console.log('\n😨 Último Fear & Greed Index:');
            console.log(`   Valor: ${fg.value}`);
            console.log(`   Classificação: ${fg.classification}`);
            console.log(`   Timestamp: ${fg.created_at}`);
        } else {
            console.log('\n❌ Nenhum dado de Fear & Greed encontrado!');
        }
        
    } catch (error) {
        console.error('❌ Erro:', error.message);
    } finally {
        await pool.end();
    }
}

checkSystemData();
