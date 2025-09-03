const { Pool } = require('pg');
const axios = require('axios');

// Configuração do banco de dados
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'process.env.DATABASE_URL',
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 15000,
    idleTimeoutMillis: 30000
});

async function testePipelineCompleto() {
    console.log('\n🚀 TESTE PIPELINE COMPLETO - TRADINGVIEW → OPERAÇÃO FECHADA');
    console.log('============================================================');
    
    try {
        const client = await pool.connect();
        
        // 1. VERIFICAR VARIÁVEIS DE AMBIENTE DO RAILWAY
        console.log('\n🔑 1. VERIFICAÇÃO DAS CHAVES EXTERNAS (RAILWAY):');
        console.log('===============================================');
        
        const chaves = {
            'OPENAI_API_KEY"YOUR_OPENAI_API_KEY"TWILIO_ACCOUNT_SID': process.env.TWILIO_ACCOUNT_SID,
            'TWILIO_AUTH_TOKEN': process.env.TWILIO_AUTH_TOKEN,
            'BINANCE_API_KEY"YOUR_BINANCE_API_KEY"BINANCE_SECRET_KEY': process.env.BINANCE_SECRET_KEY,
            'BYBIT_API_KEYYOUR_API_KEY_HEREBYBIT_SECRET_KEY': process.env.BYBIT_SECRET_KEY,
            'STRIPE_SECRET_KEY': process.env.STRIPE_SECRET_KEY,
            'STRIPE_PUBLISHABLE_KEY': process.env.STRIPE_PUBLISHABLE_KEY,
            'DATABASE_URL"process.env.DATABASE_URL"...' + valor.substring(valor.length - 4) : 
                    valor.substring(0, 4) + '...';
                console.log(`   ✅ ${nome}: ${mascarado} (${valor.length} chars)`);
            } else {
                console.log(`   ❌ ${nome}: NÃO CONFIGURADA`);
            }
        }
        
        // 2. TESTAR CONECTIVIDADE DAS APIS EXTERNAS
        console.log('\n🌐 2. TESTE DE CONECTIVIDADE DAS APIS:');
        console.log('====================================');
        
        // Teste OpenAI
        if (process.env.OPENAI_API_KEY) {
            try {
                const openaiTest = await axios.post('https://api.openai.com/v1/models', {}, {
                    headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` },
                    timeout: 5000
                });
                console.log('   ✅ OpenAI: Conectado e ativo');
            } catch (error) {
                console.log(`   ❌ OpenAI: Erro - ${error.response?.status || error.message}`);
            }
        }
        
        // Teste Binance
        if (process.env.BINANCE_API_KEY) {
            try {
                const binanceTest = await axios.get('https://api.binance.com/api/v3/account', {
                    headers: { 'X-MBX-APIKEY': process.env.BINANCE_API_KEY },
                    timeout: 5000
                });
                console.log('   ✅ Binance: API Key válida e ativa');
            } catch (error) {
                if (error.response?.status === 401) {
                    console.log('   ⚠️  Binance: API Key configurada mas requer assinatura para account info');
                } else {
                    console.log(`   ❌ Binance: Erro - ${error.response?.status || error.message}`);
                }
            }
        }
        
        // Teste ByBit
        if (process.env.BYBIT_API_KEY) {
            try {
                const bybitTest = await axios.get('https://api.bybit.com/v5/market/time', {
                    timeout: 5000
                });
                console.log('   ✅ ByBit: API acessível (endpoint público)');
            } catch (error) {
                console.log(`   ❌ ByBit: Erro - ${error.message}`);
            }
        }
        
        // 3. VERIFICAR RECEBIMENTO DE SINAIS DO TRADINGVIEW
        console.log('\n📡 3. ANÁLISE DO RECEBIMENTO DE SINAIS:');
        console.log('=====================================');
        
        const sinaisRecentes = await client.query(`
            SELECT 
                id, symbol, action, price, created_at,
                raw_data->>'ticker' as ticker_original,
                raw_data->>'signal' as signal_original
            FROM signals 
            WHERE created_at >= NOW() - INTERVAL '24 hours'
            ORDER BY created_at DESC 
            LIMIT 5
        `);
        
        if (sinaisRecentes.rows.length === 0) {
            console.log('   ❌ PROBLEMA: Nenhum sinal recebido nas últimas 24h');
            console.log('   🔍 Verificar: Webhook do TradingView configurado?');
            console.log('   🔍 Verificar: Servidor Railway ativo?');
        } else {
            console.log(`   ✅ ${sinaisRecentes.rows.length} sinais recebidos nas últimas 24h`);
            sinaisRecentes.rows.forEach((sinal, i) => {
                const status = sinal.symbol !== 'UNKNOWN' ? '✅' : '❌';
                console.log(`   ${i+1}. ${status} ${sinal.symbol} | ${sinal.action} | ${sinal.created_at}`);
            });
        }
        
        // 4. VERIFICAR PROCESSAMENTO E GERAÇÃO DE EXECUÇÕES
        console.log('\n⚙️ 4. ANÁLISE DO PROCESSAMENTO DE SINAIS:');
        console.log('========================================');
        
        const execucoes = await client.query(`
            SELECT 
                e.id, e.user_id, e.symbol, e.side, e.status, e.created_at,
                s.symbol as signal_symbol
            FROM executions e
            LEFT JOIN signals s ON e.signal_id = s.id
            WHERE e.created_at >= NOW() - INTERVAL '24 hours'
            ORDER BY e.created_at DESC
            LIMIT 10
        `);
        
        if (execucoes.rows.length === 0) {
            console.log('   ❌ PROBLEMA: Nenhuma execução gerada nas últimas 24h');
            console.log('   🔍 Verificar: Sistema de processamento ativo?');
            console.log('   🔍 Verificar: Usuários com auto-trading habilitado?');
        } else {
            console.log(`   ✅ ${execucoes.rows.length} execuções geradas nas últimas 24h`);
            execucoes.rows.forEach((exec, i) => {
                console.log(`   ${i+1}. User ${exec.user_id} | ${exec.symbol} | ${exec.side} | ${exec.status}`);
            });
        }
        
        // 5. VERIFICAR CONEXÃO COM EXCHANGES E ORDENS REAIS
        console.log('\n💱 5. ANÁLISE DE ORDENS NAS EXCHANGES:');
        console.log('====================================');
        
        const ordensReais = await client.query(`
            SELECT 
                id, user_id, symbol, side, status, exchange, 
                order_id, created_at, updated_at
            FROM orders 
            WHERE created_at >= NOW() - INTERVAL '24 hours'
            ORDER BY created_at DESC
            LIMIT 10
        `);
        
        if (ordensReais.rows.length === 0) {
            console.log('   ❌ PROBLEMA: Nenhuma ordem enviada para exchanges nas últimas 24h');
            console.log('   🔍 Verificar: Conexão com Binance/ByBit ativa?');
            console.log('   🔍 Verificar: Usuários com saldo disponível?');
        } else {
            console.log(`   ✅ ${ordensReais.rows.length} ordens enviadas nas últimas 24h`);
            ordensReais.rows.forEach((ordem, i) => {
                console.log(`   ${i+1}. ${ordem.exchange} | ${ordem.symbol} | ${ordem.side} | ${ordem.status}`);
            });
        }
        
        // 6. VERIFICAR FECHAMENTO DE OPERAÇÕES
        console.log('\n🔄 6. ANÁLISE DE FECHAMENTO DE OPERAÇÕES:');
        console.log('=======================================');
        
        const operacoesFechadas = await client.query(`
            SELECT 
                COUNT(*) as total_positions,
                COUNT(*) FILTER (WHERE status = 'open') as abertas,
                COUNT(*) FILTER (WHERE status = 'closed') as fechadas,
                COUNT(*) FILTER (WHERE status = 'cancelled') as canceladas
            FROM positions 
            WHERE created_at >= NOW() - INTERVAL '7 days'
        `);
        
        const stats = operacoesFechadas.rows[0];
        console.log(`   📊 Posições (últimos 7 dias):`);
        console.log(`      • Total: ${stats.total_positions}`);
        console.log(`      • Abertas: ${stats.abertas}`);
        console.log(`      • Fechadas: ${stats.fechadas}`);
        console.log(`      • Canceladas: ${stats.canceladas}`);
        
        if (parseInt(stats.fechadas) > 0) {
            console.log('   ✅ Sistema está fechando operações automaticamente');
        } else if (parseInt(stats.abertas) > 0) {
            console.log('   ⚠️  Operações abertas mas nenhuma fechada ainda');
        } else {
            console.log('   ❌ Nenhuma operação processada');
        }
        
        // 7. VERIFICAR NOTIFICAÇÕES E ALERTAS
        console.log('\n📱 7. TESTE DO SISTEMA DE NOTIFICAÇÕES:');
        console.log('======================================');
        
        if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
            try {
                const twilioTest = await axios.get(
                    `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}.json`,
                    {
                        auth: {
                            username: process.env.TWILIO_ACCOUNT_SID,
                            password: process.env.TWILIO_AUTH_TOKEN
                        },
                        timeout: 5000
                    }
                );
                console.log('   ✅ Twilio: Conectado e configurado');
            } catch (error) {
                console.log(`   ❌ Twilio: Erro - ${error.response?.status || error.message}`);
            }
        } else {
            console.log('   ⚠️  Twilio: Chaves não configuradas');
        }
        
        // 8. VERIFICAR USUÁRIOS ATIVOS E CONFIGURAÇÕES
        console.log('\n👥 8. ANÁLISE DE USUÁRIOS ATIVOS:');
        console.log('================================');
        
        const usuariosAtivos = await client.query(`
            SELECT 
                COUNT(*) as total_users,
                COUNT(*) FILTER (WHERE auto_trading = true) as auto_trading_enabled,
                COUNT(*) FILTER (WHERE balance > 0) as with_balance
            FROM users 
            WHERE status = 'active'
        `);
        
        const userStats = usuariosAtivos.rows[0];
        console.log(`   👤 Usuários ativos: ${userStats.total_users}`);
        console.log(`   🤖 Auto-trading habilitado: ${userStats.auto_trading_enabled}`);
        console.log(`   💰 Com saldo: ${userStats.with_balance}`);
        
        // 9. DIAGNÓSTICO FINAL E GARGALOS
        console.log('\n🎯 9. DIAGNÓSTICO FINAL:');
        console.log('=======================');
        
        let problemas = [];
        let sucessos = [];
        
        // Verificar chaves críticas
        const chavesCriticas = ['OPENAI_API_KEYYOUR_API_KEY_HEREBINANCE_API_KEYYOUR_API_KEY_HEREBYBIT_API_KEYYOUR_API_KEY_HERE✅ Todas as chaves críticas configuradas');
        } else {
            problemas.push(`❌ Chaves faltando: ${chavesCriticas.filter(c => !process.env[c]).join(', ')}`);
        }
        
        // Verificar pipeline
        if (sinaisRecentes.rows.length > 0) {
            sucessos.push('✅ Recebendo sinais do TradingView');
        } else {
            problemas.push('❌ Não está recebendo sinais do TradingView');
        }
        
        if (execucoes.rows.length > 0) {
            sucessos.push('✅ Gerando execuções a partir dos sinais');
        } else {
            problemas.push('❌ Não está gerando execuções');
        }
        
        if (ordensReais.rows.length > 0) {
            sucessos.push('✅ Enviando ordens para exchanges');
        } else {
            problemas.push('❌ Não está enviando ordens para exchanges');
        }
        
        // Mostrar resultados
        console.log('\n🎉 SUCESSOS:');
        sucessos.forEach(sucesso => console.log(`   ${sucesso}`));
        
        if (problemas.length > 0) {
            console.log('\n⚠️  PROBLEMAS ENCONTRADOS:');
            problemas.forEach(problema => console.log(`   ${problema}`));
        }
        
        // 10. PRÓXIMOS PASSOS
        console.log('\n📋 10. PRÓXIMOS PASSOS RECOMENDADOS:');
        console.log('===================================');
        
        if (problemas.length === 0) {
            console.log('   🎉 SISTEMA FUNCIONANDO PERFEITAMENTE!');
            console.log('   ✅ Pipeline completo operacional');
            console.log('   🔄 Continuar monitoramento regular');
        } else {
            console.log('   🔧 AÇÕES NECESSÁRIAS:');
            if (sinaisRecentes.rows.length === 0) {
                console.log('   1. Verificar webhook TradingView');
                console.log('   2. Confirmar se servidor Railway está online');
            }
            if (execucoes.rows.length === 0) {
                console.log('   3. Ativar sistema de processamento de sinais');
                console.log('   4. Verificar usuários com auto-trading habilitado');
            }
            if (ordensReais.rows.length === 0) {
                console.log('   5. Testar conexão com exchanges');
                console.log('   6. Verificar saldos dos usuários');
            }
        }
        
        client.release();
        
    } catch (error) {
        console.error('❌ Erro no teste:', error.message);
    } finally {
        await pool.end();
    }
}

// Executar teste completo
testePipelineCompleto();
