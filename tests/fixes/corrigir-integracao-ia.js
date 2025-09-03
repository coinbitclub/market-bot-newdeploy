/**
 * 🔧 CORREÇÃO INTEGRAÇÃO: AI ANALYSIS ↔ SISTEMA LEITURA MERCADO
 * 
 * Problema identificado: AI Analysis lendo fear_greed_index 
 * Solução: Atualizar para ler sistema_leitura_mercado (mais recente)
 */

const { createRobustPool, safeQuery } = require('./fixed-database-config.js');

async function corrigirIntegracaoIA() {
    const pool = createRobustPool();
    
    try {
        console.log('🔧 CORRIGINDO INTEGRAÇÃO AI ANALYSIS ↔ SISTEMA LEITURA MERCADO\n');
        
        // 1. Verificar estrutura atual
        console.log('1️⃣ Verificando estruturas das tabelas...');
        
        const sistemaLeituraExists = await safeQuery(pool, `
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'sistema_leitura_mercado'
            ) as exists
        `);
        
        const fearGreedExists = await safeQuery(pool, `
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'fear_greed_index'
            ) as exists
        `);
        
        console.log(`   📊 sistema_leitura_mercado: ${sistemaLeituraExists.rows[0]?.exists ? '✅ Existe' : '❌ Não existe'}`);
        console.log(`   📊 fear_greed_index: ${fearGreedExists.rows[0]?.exists ? '✅ Existe' : '❌ Não existe'}`);
        
        // 2. Verificar dados recentes
        console.log('\n2️⃣ Verificando dados recentes...');
        
        if (sistemaLeituraExists.rows[0]?.exists) {
            const sistemaData = await safeQuery(pool, `
                SELECT COUNT(*) as total,
                       MAX(timestamp) as ultimo,
                       MAX(fear_greed_value) as ultimo_fg,
                       MAX(final_recommendation) as recomendacao
                FROM sistema_leitura_mercado 
                WHERE timestamp >= NOW() - INTERVAL '24 hours'
            `);
            
            console.log(`   📈 Sistema Leitura - Registros 24h: ${sistemaData.rows[0]?.total || 0}`);
            console.log(`   ⏰ Último registro: ${sistemaData.rows[0]?.ultimo || 'Nenhum'}`);
            console.log(`   😨 Último F&G: ${sistemaData.rows[0]?.ultimo_fg || 'N/A'}`);
            console.log(`   🎯 Recomendação: ${sistemaData.rows[0]?.recomendacao || 'N/A'}`);
        }
        
        if (fearGreedExists.rows[0]?.exists) {
            const fearData = await safeQuery(pool, `
                SELECT COUNT(*) as total,
                       MAX(created_at) as ultimo,
                       MAX(value) as valor
                FROM fear_greed_index 
                WHERE created_at >= NOW() - INTERVAL '24 hours'
            `);
            
            console.log(`   📉 Fear Greed Index - Registros 24h: ${fearData.rows[0]?.total || 0}`);
            console.log(`   ⏰ Último registro: ${fearData.rows[0]?.ultimo || 'Nenhum'}`);
            console.log(`   😨 Último valor: ${fearData.rows[0]?.valor || 'N/A'}`);
        }
        
        // 3. Criar função de sincronização
        console.log('\n3️⃣ Criando função de sincronização...');
        
        await safeQuery(pool, `
            CREATE OR REPLACE FUNCTION sync_fear_greed_to_ai()
            RETURNS TRIGGER AS $$
            BEGIN
                -- Inserir/atualizar na tabela fear_greed_index quando sistema_leitura_mercado for atualizado
                INSERT INTO fear_greed_index (value, classification, source, created_at)
                VALUES (
                    NEW.fear_greed_value,
                    NEW.fear_greed_classification,
                    'sistema_leitura_mercado',
                    NEW.timestamp
                )
                ON CONFLICT (created_at) DO UPDATE SET
                    value = NEW.fear_greed_value,
                    classification = NEW.fear_greed_classification,
                    source = 'sistema_leitura_mercado';
                
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;
        `);
        
        console.log('   ✅ Função de sincronização criada');
        
        // 4. Criar trigger
        await safeQuery(pool, `
            DROP TRIGGER IF EXISTS trigger_sync_fear_greed ON sistema_leitura_mercado;
            
            CREATE TRIGGER trigger_sync_fear_greed
                AFTER INSERT OR UPDATE ON sistema_leitura_mercado
                FOR EACH ROW
                EXECUTE FUNCTION sync_fear_greed_to_ai();
        `);
        
        console.log('   ✅ Trigger de sincronização criado');
        
        // 5. Sincronizar dados existentes
        console.log('\n4️⃣ Sincronizando dados existentes...');
        
        await safeQuery(pool, `
            INSERT INTO fear_greed_index (value, classification, source, created_at)
            SELECT 
                fear_greed_value,
                fear_greed_classification,
                'sistema_leitura_mercado_sync',
                timestamp
            FROM sistema_leitura_mercado 
            WHERE fear_greed_value IS NOT NULL
            AND timestamp >= NOW() - INTERVAL '7 days'
            ON CONFLICT (created_at) DO UPDATE SET
                value = EXCLUDED.value,
                classification = EXCLUDED.classification,
                source = EXCLUDED.source;
        `);
        
        console.log('   ✅ Dados sincronizados (últimos 7 dias)');
        
        // 6. Verificar sincronização
        console.log('\n5️⃣ Verificando sincronização...');
        
        const syncCheck = await safeQuery(pool, `
            SELECT 
                s.fear_greed_value as sistema_valor,
                f.value as fear_valor,
                s.timestamp as sistema_time,
                f.created_at as fear_time
            FROM sistema_leitura_mercado s
            LEFT JOIN fear_greed_index f ON DATE_TRUNC('minute', s.timestamp) = DATE_TRUNC('minute', f.created_at)
            WHERE s.timestamp >= NOW() - INTERVAL '2 hours'
            ORDER BY s.timestamp DESC
            LIMIT 5
        `);
        
        console.log('   📊 Verificação de sincronização (últimas 2 horas):');
        syncCheck.rows.forEach((row, i) => {
            const status = row.sistema_valor === row.fear_valor ? '✅' : '⚠️';
            console.log(`   ${i+1}. ${status} Sistema: ${row.sistema_valor} | Fear: ${row.fear_valor} | Time: ${row.sistema_time}`);
        });
        
        console.log('\n✅ CORREÇÃO DA INTEGRAÇÃO CONCLUÍDA!');
        console.log('\n📋 PRÓXIMOS PASSOS:');
        console.log('   1. Ativar sistema de leitura: node sistema-leitura-mercado-enterprise.js');
        console.log('   2. Testar endpoint: curl /api/dashboard/ai-analysis');
        console.log('   3. Monitorar logs em tempo real');
        
    } catch (error) {
        console.error('❌ Erro na correção:', error.message);
    } finally {
        await pool.end();
    }
}

corrigirIntegracaoIA();
