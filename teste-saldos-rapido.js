/**
 * 🔥 TESTE RÁPIDO DE LEVANTAMENTO DE SALDOS
 * =======================================
 */

const { Pool } = require('pg');

async function testeRapidoSaldos() {
    console.log('🚀 TESTE RÁPIDO DE SALDOS INICIADO');
    console.log('=================================');
    
    const pool = new Pool({
        connectionString: 'postgresql://postgres:ELjbkkgUASRCtdTAXVFgIssOXiLsRCPq@trolley.proxy.rlwy.net:44790/railway',
        ssl: { rejectUnauthorized: false }
    });
    
    try {
        // Teste de conexão
        console.log('🔍 Testando conexão...');
        const testConn = await pool.query('SELECT NOW() as timestamp');
        console.log(`✅ Conectado! Timestamp: ${testConn.rows[0].timestamp}`);
        
        // Buscar chaves
        console.log('\n🔑 Buscando chaves de API...');
        const chavesQuery = `
            SELECT 
                u.username,
                uak.exchange,
                uak.environment,
                LENGTH(uak.api_key) as key_length,
                LENGTH(uak.secret_key) as secret_length,
                uak.validation_status
            FROM users u
            JOIN user_api_keys uak ON u.id = uak.user_id
            WHERE u.is_active = true 
            AND uak.is_active = true
            ORDER BY u.username
        `;
        
        const chaves = await pool.query(chavesQuery);
        console.log(`📊 Encontradas ${chaves.rows.length} chaves:`);
        
        chaves.rows.forEach((chave, index) => {
            console.log(`   ${index + 1}. ${chave.username} - ${chave.exchange} (${chave.environment})`);
            console.log(`      API Key: ${chave.key_length} chars | Secret: ${chave.secret_length} chars`);
            console.log(`      Status: ${chave.validation_status || 'NÃO VALIDADO'}`);
        });
        
        if (chaves.rows.length > 0) {
            console.log('\n✅ DADOS ENCONTRADOS - PRONTO PARA COLETA DE SALDOS!');
            
            // Simular estrutura de resposta de saldo
            console.log('\n💰 SIMULAÇÃO DE ESTRUTURA DE SALDOS:');
            console.log('=====================================');
            
            const exemploSaldo = {
                success: true,
                exchange: 'bybit',
                environment: 'mainnet',
                totalUSD: 1234.56,
                moedas: [
                    { moeda: 'USDT', saldo: 1000, valorUSD: 1000, livre: 950, bloqueado: 50 },
                    { moeda: 'BTC', saldo: 0.005, valorUSD: 225, livre: 0.005, bloqueado: 0 },
                    { moeda: 'ETH', saldo: 0.003, valorUSD: 9.56, livre: 0.003, bloqueado: 0 }
                ],
                carteiras: {
                    UNIFIED: {
                        totalUSD: 1234.56,
                        moedas: 3
                    }
                }
            };
            
            console.log('📋 Exemplo de resposta de saldo:');
            console.log(JSON.stringify(exemploSaldo, null, 2));
            
        } else {
            console.log('\n❌ NENHUMA CHAVE ENCONTRADA!');
            console.log('ℹ️ Execute primeiro o script de configuração para adicionar chaves');
        }
        
    } catch (error) {
        console.error('❌ Erro:', error.message);
    } finally {
        await pool.end();
    }
}

testeRapidoSaldos();
