/**
 * 🔑 MONITOR DE CHAVES API - TEMPO REAL
 * 
 * Monitora como as chaves API estão funcionando após o whitelist
 * e acompanha a coleta de dados em tempo real
 */

const axios = require('axios');
const { Pool } = require('pg');

class MonitorChavesAPI {
    constructor() {
        this.pool = new Pool({
            connectionString: process.env.DATABASE_URL || 'process.env.DATABASE_URL',
            ssl: { rejectUnauthorized: false }
        });
        
        this.usuarios = [
            { id: 14, nome: 'Luiza Maria de Almeida Pinto', exchange: 'Bybit' },
            { id: 15, nome: 'Paloma Amaral', exchange: 'Bybit' },
            { id: 16, nome: 'Erica dos Santos', exchange: 'Bybit' },
            { id: 16, nome: 'Erica dos Santos', exchange: 'Binance' }
        ];
        
        this.statusAnterior = {};
        this.tentativa = 0;
    }

    async obterChavesDB() {
        console.log('🔍 OBTENDO CHAVES DO BANCO DE DADOS...\n');
        
        try {
            const query = `
                SELECT 
                    uk.id,
                    uk.user_id,
                    u.username as user_name,
                    uk.exchange,
                    uk.api_key,
                    uk.is_testnet,
                    uk.is_active,
                    uk.ip_restrictions,
                    uk.last_used,
                    uk.created_at
                FROM user_api_keys uk
                JOIN users u ON uk.user_id = u.id 
                WHERE uk.is_active = true
                ORDER BY uk.user_id, uk.exchange
            `;
            
            const result = await this.pool.query(query);
            
            console.log(`📊 ${result.rows.length} chaves API ativas encontradas:`);
            
            result.rows.forEach((key, i) => {
                console.log(`\n${i+1}. 👤 ${key.user_name} (ID: ${key.user_id})`);
                console.log(`   🏢 Exchange: ${key.exchange.toUpperCase()}`);
                console.log(`   🔑 API Key: ${key.api_key.substring(0, 8)}...`);
                console.log(`   🧪 Testnet: ${key.is_testnet ? 'Sim' : 'Não'}`);
                console.log(`   🏷️  Exchange Type: ${key.exchange_type || 'N/A'}`);
                console.log(`   🔒 IP Restrictions: ${key.ip_restrictions || 'Nenhuma'}`);
                console.log(`   📅 Última Uso: ${key.last_used || 'Nunca'}`);
            });
            
            return result.rows;
            
        } catch (error) {
            console.log('❌ Erro ao obter chaves:', error.message);
            return [];
        }
    }

    async testarConectividadeExchanges() {
        console.log('\n🧪 TESTANDO CONECTIVIDADE COM EXCHANGES...\n');
        console.log('='.repeat(60));
        
        const testes = [
            {
                nome: 'Bybit Mainnet',
                url: 'https://api.bybit.com/v5/market/time',
                exchange: 'bybit'
            },
            {
                nome: 'Bybit Testnet', 
                url: 'https://api-testnet.bybit.com/v5/market/time',
                exchange: 'bybit'
            },
            {
                nome: 'Binance Mainnet',
                url: 'https://api.binance.com/api/v3/time',
                exchange: 'binance'
            },
            {
                nome: 'Binance Testnet',
                url: 'https://testnet.binance.vision/api/v3/time',
                exchange: 'binance'
            }
        ];
        
        for (const teste of testes) {
            try {
                const response = await axios.get(teste.url, { 
                    timeout: 10000,
                    headers: {
                        'User-Agent': 'CoinBitClub-Monitor/1.0'
                    }
                });
                
                console.log(`✅ ${teste.nome}: CONECTADO`);
                console.log(`   📊 Status: ${response.status}`);
                console.log(`   ⏰ Tempo resposta: ${response.headers.date || 'N/A'}`);
                
            } catch (error) {
                console.log(`❌ ${teste.nome}: ERRO`);
                console.log(`   📝 Erro: ${error.message}`);
                
                if (error.response) {
                    console.log(`   📊 Status: ${error.response.status}`);
                }
            }
            
            console.log('');
        }
    }

    async monitorarSaldosRecentes() {
        console.log('💰 MONITORANDO COLETA DE SALDOS RECENTES...\n');
        console.log('='.repeat(60));
        
        try {
            // Buscar coletas das últimas 2 horas
            const query = `
                SELECT 
                    b.user_id,
                    u.username as user_name,
                    b.exchange,
                    b.asset,
                    b.wallet_balance as balance,
                    b.available_balance as free,
                    b.locked_balance as used,
                    b.account_type,
                    b.last_updated as updated_at,
                    EXTRACT(EPOCH FROM (NOW() - b.last_updated))/60 as minutes_ago
                FROM balances b
                JOIN users u ON b.user_id = u.id
                WHERE b.last_updated > NOW() - INTERVAL '2 hours'
                ORDER BY b.last_updated DESC, b.user_id, b.exchange
                LIMIT 20
            `;
            
            const result = await this.pool.query(query);
            
            if (result.rows.length > 0) {
                console.log(`📈 ${result.rows.length} coletas recentes encontradas:`);
                
                result.rows.forEach((saldo, i) => {
                    const minutosAtras = Math.floor(saldo.minutes_ago);
                    console.log(`\n${i+1}. 👤 ${saldo.user_name} (${saldo.exchange.toUpperCase()})`);
                    console.log(`   💰 ${saldo.asset}: ${saldo.balance}`);
                    console.log(`   🏷️  Tipo: ${saldo.account_type}`);
                    console.log(`   ⏰ Há ${minutosAtras} minutos`);
                });
                
                // Analisar sucesso por usuário/exchange
                this.analisarSucessoPorUsuario(result.rows);
                
            } else {
                console.log('❌ Nenhuma coleta recente encontrada!');
                console.log('💡 Possíveis causas:');
                console.log('   • IP ainda propagando nas exchanges');
                console.log('   • Chaves API com problemas');
                console.log('   • Sistema de coleta pausado');
            }
            
        } catch (error) {
            console.log('❌ Erro ao monitorar saldos:', error.message);
        }
    }

    analisarSucessoPorUsuario(saldos) {
        console.log('\n📊 ANÁLISE DE SUCESSO POR USUÁRIO:\n');
        
        const stats = {};
        
        saldos.forEach(saldo => {
            const key = `${saldo.user_id}_${saldo.exchange}`;
            if (!stats[key]) {
                stats[key] = {
                    user_name: saldo.user_name,
                    user_id: saldo.user_id,
                    exchange: saldo.exchange,
                    count: 0,
                    last_update: saldo.updated_at
                };
            }
            stats[key].count++;
            
            // Manter o mais recente
            if (new Date(saldo.updated_at) > new Date(stats[key].last_update)) {
                stats[key].last_update = saldo.updated_at;
            }
        });
        
        Object.values(stats).forEach(stat => {
            const minutosAtras = Math.floor((Date.now() - new Date(stat.last_update)) / 60000);
            const icone = stat.count > 0 ? '✅' : '❌';
            
            console.log(`${icone} ${stat.user_name} (${stat.exchange.toUpperCase()})`);
            console.log(`   📊 Coletas: ${stat.count}`);
            console.log(`   ⏰ Última: há ${minutosAtras} minutos`);
        });
    }

    async verificarLogsErros() {
        console.log('\n🚨 VERIFICANDO LOGS DE ERROS RECENTES...\n');
        console.log('='.repeat(60));
        
        try {
            // Verificar se existe tabela de logs de erro
            const checkTable = await this.pool.query(`
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_name = 'error_logs'
                )
            `);
            
            if (checkTable.rows[0].exists) {
                const errorQuery = `
                    SELECT 
                        error_type,
                        error_message,
                        context,
                        created_at,
                        COUNT(*) as occurrences
                    FROM error_logs 
                    WHERE created_at > NOW() - INTERVAL '1 hour'
                    GROUP BY error_type, error_message, context, created_at
                    ORDER BY created_at DESC
                    LIMIT 10
                `;
                
                const errors = await this.pool.query(errorQuery);
                
                if (errors.rows.length > 0) {
                    console.log('🚨 Erros na última hora:');
                    errors.rows.forEach((error, i) => {
                        console.log(`\n${i+1}. ${error.error_type}`);
                        console.log(`   📝 ${error.error_message}`);
                        console.log(`   🔄 Ocorrências: ${error.occurrences}`);
                        console.log(`   ⏰ ${new Date(error.created_at).toLocaleString()}`);
                    });
                } else {
                    console.log('✅ Nenhum erro na última hora!');
                }
            } else {
                console.log('💡 Tabela de logs de erro não existe ainda');
            }
            
        } catch (error) {
            console.log('⚠️ Erro ao verificar logs:', error.message);
        }
    }

    async gerarRelatorioStatus() {
        this.tentativa++;
        const agora = new Date().toLocaleString();
        
        console.log('\n📊 RELATÓRIO DE STATUS DAS CHAVES API\n');
        console.log('='.repeat(70));
        console.log(`🕐 ${agora} | Verificação #${this.tentativa}`);
        console.log('='.repeat(70));
        
        // 1. Status das chaves no banco
        const chaves = await this.obterChavesDB();
        
        // 2. Conectividade com exchanges
        await this.testarConectividadeExchanges();
        
        // 3. Monitorar coletas recentes
        await this.monitorarSaldosRecentes();
        
        // 4. Verificar erros
        await this.verificarLogsErros();
        
        console.log('\n🎯 PRÓXIMA VERIFICAÇÃO EM 60 SEGUNDOS...');
        console.log('💡 Pressione Ctrl+C para parar o monitoramento');
        console.log('='.repeat(70));
    }

    async iniciarMonitoramento() {
        console.log('🚀 MONITOR DE CHAVES API INICIADO\n');
        console.log('🔑 Monitorando funcionamento das chaves após whitelist');
        console.log('⏱️  Verificação a cada 60 segundos');
        console.log('🎯 Acompanhe os resultados em tempo real\n');
        
        // Primeira verificação imediata
        await this.gerarRelatorioStatus();
        
        // Configurar verificações periódicas
        const intervalo = setInterval(async () => {
            try {
                await this.gerarRelatorioStatus();
            } catch (error) {
                console.log('❌ Erro no monitoramento:', error.message);
            }
        }, 60000); // 60 segundos
        
        // Cleanup ao parar
        process.on('SIGINT', () => {
            console.log('\n\n🛑 Monitoramento interrompido');
            clearInterval(intervalo);
            this.pool.end();
            process.exit(0);
        });
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    const monitor = new MonitorChavesAPI();
    monitor.iniciarMonitoramento()
        .catch(error => {
            console.error('💥 Erro no monitor:', error.message);
            process.exit(1);
        });
}

module.exports = MonitorChavesAPI;
