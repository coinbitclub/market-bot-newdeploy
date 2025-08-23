const { createRobustPool, safeQuery } = require('./fixed-database-config.js');

async function verificarIntegracaoIA() {
    const pool = createRobustPool();
    
    try {
        console.log('🔍 VERIFICANDO INTEGRAÇÃO IA ↔ SISTEMA DE LEITURA DO MERCADO\n');
        
        // 1. Verificar se tabela sistema_leitura_mercado existe e tem dados
        console.log('1️⃣ Verificando Sistema de Leitura do Mercado...');
        const sistemaLeitura = await safeQuery(pool, `
            SELECT COUNT(*) as total,
                   MAX(timestamp) as ultimo_registro,
                   MAX(fear_greed_value) as ultimo_fear_greed,
                   MAX(final_recommendation) as ultima_recomendacao
            FROM sistema_leitura_mercado 
            WHERE DATE(timestamp) >= CURRENT_DATE - INTERVAL '1 day'
        `);
        
        if (sistemaLeitura.rows[0]?.total > 0) {
            console.log('✅ Sistema de Leitura: ATIVO');
            console.log(`   📊 Registros últimas 24h: ${sistemaLeitura.rows[0].total}`);
            console.log(`   ⏰ Último registro: ${sistemaLeitura.rows[0].ultimo_registro}`);
            console.log(`   😨 Último Fear & Greed: ${sistemaLeitura.rows[0].ultimo_fear_greed}`);
            console.log(`   🎯 Última recomendação: ${sistemaLeitura.rows[0].ultima_recomendacao}`);
        } else {
            console.log('❌ Sistema de Leitura: SEM DADOS RECENTES');
        }
        
        // 2. Verificar endpoint de AI analysis 
        console.log('\n2️⃣ Verificando endpoint AI Analysis...');
        const aiAnalysis = await safeQuery(pool, `
            SELECT COUNT(*) as total,
                   MAX(created_at) as ultimo_registro  
            FROM ai_analysis 
            WHERE DATE(created_at) >= CURRENT_DATE - INTERVAL '1 day'
        `);
        
        if (aiAnalysis.rows[0]?.total > 0) {
            console.log('✅ AI Analysis: ATIVO');
            console.log(`   📊 Registros últimas 24h: ${aiAnalysis.rows[0].total}`);
            console.log(`   ⏰ Último registro: ${aiAnalysis.rows[0].ultimo_registro}`);
        } else {
            console.log('⚠️ AI Analysis: SEM DADOS RECENTES (usando fallback)');
        }
        
        // 3. Verificar Fear & Greed Index
        console.log('\n3️⃣ Verificando Fear & Greed Index...');
        const fearGreed = await safeQuery(pool, `
            SELECT value, classification, created_at
            FROM fear_greed_index 
            ORDER BY created_at DESC 
            LIMIT 1
        `);
        
        if (fearGreed.rows.length > 0) {
            const fg = fearGreed.rows[0];
            console.log('✅ Fear & Greed: ATIVO');
            console.log(`   📊 Valor atual: ${fg.value}`);
            console.log(`   📈 Classificação: ${fg.classification}`);
            console.log(`   ⏰ Última atualização: ${fg.created_at}`);
        } else {
            console.log('❌ Fear & Greed: SEM DADOS');
        }
        
        // 4. Testar endpoint de produção
        console.log('\n4️⃣ Verificando conectividade com produção...');
        try {
            const axios = require('axios');
            const response = await axios.get('https://coinbitclub-market-bot.up.railway.app/health', {
                timeout: 10000
            });
            
            console.log('✅ Servidor de Produção: ONLINE');
            console.log(`   📊 Status: ${response.data.status}`);
            console.log(`   🔗 Endpoints: ${response.data.endpoints}`);
            
            // Testar endpoint AI Analysis em produção
            try {
                const aiResponse = await axios.get('https://coinbitclub-market-bot.up.railway.app/api/dashboard/ai-analysis', {
                    timeout: 10000
                });
                
                console.log('✅ AI Analysis Endpoint: FUNCIONANDO');
                console.log(`   🤖 Status: ${aiResponse.data.data?.status}`);
                console.log(`   📊 Fear & Greed: ${aiResponse.data.data?.fear_greed?.value}`);
                console.log(`   🎯 Direção: ${aiResponse.data.data?.fear_greed?.direction}`);
                
            } catch (aiError) {
                console.log('⚠️ AI Analysis Endpoint: Erro ao conectar');
                console.log(`   📝 Detalhes: ${aiError.message}`);
            }
            
        } catch (prodError) {
            console.log('❌ Servidor de Produção: OFFLINE ou ERRO');
            console.log(`   📝 Detalhes: ${prodError.message}`);
        }
        
        // 5. Diagnóstico final
        console.log('\n📋 DIAGNÓSTICO FINAL:');
        
        const sistemaAtivo = sistemaLeitura.rows[0]?.total > 0;
        const aiAtivo = aiAnalysis.rows[0]?.total > 0;
        const fearGreedAtivo = fearGreed.rows.length > 0;
        
        if (sistemaAtivo && fearGreedAtivo) {
            console.log('✅ INTEGRAÇÃO FUNCIONANDO: Sistema de leitura alimentando IA');
            console.log('   🔄 Dados fluindo: Sistema Leitura → Fear & Greed → AI Analysis');
        } else if (fearGreedAtivo) {
            console.log('⚠️ INTEGRAÇÃO PARCIAL: Fear & Greed ativo, mas sistema de leitura parado');
            console.log('   💡 Recomendação: Executar sistema-leitura-mercado-enterprise.js');
        } else {
            console.log('❌ INTEGRAÇÃO INATIVA: Sistemas não estão coletando dados');
            console.log('   💡 Ações necessárias:');
            console.log('      1. Executar: node banco-sistema-leitura-mercado.js');
            console.log('      2. Executar: node sistema-leitura-mercado-enterprise.js');
        }
        
        console.log('\n🔄 PRÓXIMOS PASSOS:');
        console.log('   1. Para ativar sistema: node sistema-leitura-mercado-enterprise.js');
        console.log('   2. Para monitorar: node check-sistema-leitura.js');
        console.log('   3. Para verificar produção: curl https://coinbitclub-market-bot.up.railway.app/health');
        
    } catch (error) {
        console.error('❌ Erro na verificação:', error.message);
    } finally {
        await pool.end();
    }
}

verificarIntegracaoIA();
