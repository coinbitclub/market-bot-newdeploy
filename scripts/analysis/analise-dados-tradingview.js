/**
 * 🔍 ANÁLISE DE DADOS RECEBIDOS DO TRADINGVIEW
 * ============================================
 * 
 * Analisa os dados reais que estão chegando do TradingView
 * e identifica por que o symbol está como "UNKNOWN"
 * 
 * @author Sistema Automatizado
 * @version 1.0
 * @date 07/08/2025 21:45
 */

const { Pool } = require('pg');

class AnaliseDadosTradingView {
    constructor() {
        this.pool = new Pool({
    host: 'trolley.proxy.rlwy.net',
            port: 44790,
            database: 'railway',
            user: 'postgres',
            password: process.env.DB_PASSWORD || 'YOUR_DB_PASSWORD',
            ssl: {
                rejectUnauthorized: false
            },
    connectionString: process.env.DATABASE_URL || 'process.env.DATABASE_URL',
    ssl: { rejectUnauthorized: false }
});
    }

    log(message, level = 'INFO') {
        const timestamp = new Date().toLocaleString('pt-BR');
        const prefix = {
            'INFO': '[📊]',
            'WARNING': '[⚠️ ]',
            'SUCCESS': '[✅]',
            'ERROR': '[❌]',
            'DATA': '[📋]'
        }[level] || '[📊]';
        
        console.log(`[${timestamp}] ${prefix} ${message}`);
    }

    /**
     * 📋 ANALISAR DADOS RAW DOS SINAIS
     */
    async analisarDadosRaw() {
        this.log('📋 Analisando dados RAW dos sinais recebidos...', 'DATA');
        
        try {
            // Buscar últimos sinais com dados raw
            const sinaisRaw = await this.pool.query(`
                SELECT 
                    id, symbol, action, price, 
                    raw_data, processed_at, status,
                    timestamp, source, signal_type
                FROM signals 
                ORDER BY processed_at DESC 
                LIMIT 10
            `);

            this.log(`📊 Analisando ${sinaisRaw.rows.length} sinais recentes:`);
            
            for (let i = 0; i < sinaisRaw.rows.length; i++) {
                const sinal = sinaisRaw.rows[i];
                this.log(`\n🔍 Sinal ${i + 1} (ID: ${sinal.id}):`);
                this.log(`   • Symbol: ${sinal.symbol}`);
                this.log(`   • Action: ${sinal.action}`);
                this.log(`   • Price: ${sinal.price}`);
                this.log(`   • Status: ${sinal.status}`);
                this.log(`   • Source: ${sinal.source || 'N/A'}`);
                this.log(`   • Type: ${sinal.signal_type || 'N/A'}`);
                this.log(`   • Processed: ${sinal.processed_at}`);
                
                // Analisar dados RAW
                if (sinal.raw_data) {
                    try {
                        const rawData = typeof sinal.raw_data === 'string' 
                            ? JSON.parse(sinal.raw_data) 
                            : sinal.raw_data;
                        
                        this.log(`   📋 Dados RAW:`, 'DATA');
                        const keys = Object.keys(rawData);
                        
                        if (keys.length > 0) {
                            keys.forEach(key => {
                                const value = rawData[key];
                                const valueStr = typeof value === 'object' 
                                    ? JSON.stringify(value).substring(0, 100) + '...'
                                    : String(value);
                                this.log(`      • ${key}: ${valueStr}`);
                            });
                            
                            // Verificar campos potenciais para symbol
                            const possibleSymbolFields = ['symbol', 'ticker', 'pair', 'instrument', 'asset'];
                            let symbolFound = false;
                            
                            possibleSymbolFields.forEach(field => {
                                if (rawData[field]) {
                                    this.log(`      🎯 SYMBOL ENCONTRADO em '${field}': ${rawData[field]}`, 'SUCCESS');
                                    symbolFound = true;
                                }
                            });
                            
                            if (!symbolFound) {
                                this.log(`      ❌ Nenhum campo de symbol identificado`, 'WARNING');
                            }
                            
                        } else {
                            this.log(`      ❌ Raw data vazio`, 'WARNING');
                        }
                        
                    } catch (error) {
                        this.log(`      ❌ Erro ao analisar raw_data: ${error.message}`, 'ERROR');
                    }
                } else {
                    this.log(`   ❌ Sem raw_data`, 'WARNING');
                }
            }

            return sinaisRaw.rows;
        } catch (error) {
            this.log(`❌ Erro ao analisar dados raw: ${error.message}`, 'ERROR');
            return [];
        }
    }

    /**
     * 🔍 VERIFICAR ESTRUTURA DA TABELA SIGNALS
     */
    async verificarEstruturaSinais() {
        this.log('🔍 Verificando estrutura da tabela signals...');
        
        try {
            const estrutura = await this.pool.query(`
                SELECT column_name, data_type, is_nullable, column_default
                FROM information_schema.columns
                WHERE table_name = 'signals'
                AND table_schema = 'public'
                ORDER BY ordinal_position
            `);

            this.log('📋 Estrutura da tabela signals:');
            estrutura.rows.forEach(col => {
                this.log(`   • ${col.column_name} (${col.data_type}) - Nullable: ${col.is_nullable} - Default: ${col.column_default || 'N/A'}`);
            });

            return estrutura.rows;
        } catch (error) {
            this.log(`❌ Erro ao verificar estrutura: ${error.message}`, 'ERROR');
            return [];
        }
    }

    /**
     * 📊 ESTATÍSTICAS DOS SÍMBOLOS
     */
    async estatisticasSimbolos() {
        this.log('📊 Analisando estatísticas dos símbolos...');
        
        try {
            const stats = await this.pool.query(`
                SELECT 
                    symbol,
                    action,
                    COUNT(*) as quantidade,
                    AVG(price) as preco_medio,
                    MIN(processed_at) as primeiro,
                    MAX(processed_at) as ultimo
                FROM signals 
                WHERE processed_at > NOW() - INTERVAL '24 hours'
                GROUP BY symbol, action
                ORDER BY quantidade DESC
            `);

            this.log('📈 Estatísticas por symbol (24h):');
            stats.rows.forEach(stat => {
                this.log(`   • ${stat.symbol} ${stat.action}: ${stat.quantidade} sinais, preço médio: ${stat.preco_medio}`);
            });

            // Verificar quantos são UNKNOWN
            const unknownCount = stats.rows.filter(s => s.symbol === 'UNKNOWN').reduce((acc, s) => acc + parseInt(s.quantidade), 0);
            const totalCount = stats.rows.reduce((acc, s) => acc + parseInt(s.quantidade), 0);
            
            this.log(`\n📊 Resumo:`);
            this.log(`   • Total de sinais: ${totalCount}`);
            this.log(`   • Sinais UNKNOWN: ${unknownCount} (${((unknownCount/totalCount)*100).toFixed(1)}%)`);
            this.log(`   • Sinais com symbol válido: ${totalCount - unknownCount} (${(((totalCount - unknownCount)/totalCount)*100).toFixed(1)}%)`);

            return stats.rows;
        } catch (error) {
            this.log(`❌ Erro ao calcular estatísticas: ${error.message}`, 'ERROR');
            return [];
        }
    }

    /**
     * 🔧 PROPOR CORREÇÃO PARA PARSING
     */
    async proporCorrecao() {
        this.log('🔧 Analisando padrões para propor correção...');
        
        try {
            // Buscar dados raw únicos para análise
            const samples = await this.pool.query(`
                SELECT DISTINCT raw_data
                FROM signals 
                WHERE raw_data IS NOT NULL
                ORDER BY id DESC
                LIMIT 5
            `);

            const padroes = [];

            for (const sample of samples.rows) {
                try {
                    const data = typeof sample.raw_data === 'string' 
                        ? JSON.parse(sample.raw_data) 
                        : sample.raw_data;
                    
                    // Identificar padrões
                    const keys = Object.keys(data);
                    const possibleSymbolKeys = keys.filter(key => 
                        key.toLowerCase().includes('symbol') ||
                        key.toLowerCase().includes('ticker') ||
                        key.toLowerCase().includes('pair') ||
                        key.toLowerCase().includes('instrument')
                    );

                    if (possibleSymbolKeys.length > 0) {
                        padroes.push({
                            keys: possibleSymbolKeys,
                            values: possibleSymbolKeys.map(k => data[k]),
                            allKeys: keys
                        });
                    }
                } catch (error) {
                    this.log(`❌ Erro ao analisar sample: ${error.message}`, 'ERROR');
                }
            }

            this.log('🎯 Padrões identificados:');
            padroes.forEach((padrao, index) => {
                this.log(`   ${index + 1}. Chaves possíveis: ${padrao.keys.join(', ')}`);
                this.log(`      Valores: ${padrao.values.join(', ')}`);
                this.log(`      Todas as chaves: ${padrao.allKeys.join(', ')}`);
            });

            return padroes;
        } catch (error) {
            this.log(`❌ Erro ao propor correção: ${error.message}`, 'ERROR');
            return [];
        }
    }

    /**
     * 📊 EXECUTAR ANÁLISE COMPLETA
     */
    async executarAnalise() {
        this.log('🚀 INICIANDO ANÁLISE COMPLETA DOS DADOS TRADINGVIEW', 'SUCCESS');
        console.log('='.repeat(80));
        
        try {
            // 1. Verificar estrutura
            const estrutura = await this.verificarEstruturaSinais();
            console.log('');

            // 2. Analisar dados raw
            const dadosRaw = await this.analisarDadosRaw();
            console.log('');

            // 3. Estatísticas dos símbolos
            const stats = await this.estatisticasSimbolos();
            console.log('');

            // 4. Propor correção
            const padroes = await this.proporCorrecao();
            console.log('');

            // 5. Diagnóstico final
            console.log('='.repeat(80));
            this.log('🎯 DIAGNÓSTICO FINAL:', 'SUCCESS');
            
            const problemasEncontrados = [];
            
            if (stats.some(s => s.symbol === 'UNKNOWN')) {
                problemasEncontrados.push('❌ Sinais sendo salvos com symbol UNKNOWN');
            }
            
            if (padroes.length === 0) {
                problemasEncontrados.push('❌ Nenhum padrão de symbol identificado nos dados raw');
            }

            if (problemasEncontrados.length > 0) {
                this.log('🚨 PROBLEMAS IDENTIFICADOS:', 'WARNING');
                problemasEncontrados.forEach(problema => this.log(`   ${problema}`));
                
                this.log('\n💡 RECOMENDAÇÕES:', 'SUCCESS');
                this.log('   1. Corrigir o parsing dos dados do TradingView');
                this.log('   2. Mapear corretamente os campos symbol/ticker');
                this.log('   3. Validar dados antes de salvar no banco');
                this.log('   4. Implementar fallback para identificação de symbol');
            } else {
                this.log('✅ Estrutura de dados funcionando corretamente!', 'SUCCESS');
            }

            return {
                estrutura,
                dadosRaw,
                stats,
                padroes,
                problemasEncontrados
            };

        } catch (error) {
            this.log(`❌ ERRO CRÍTICO na análise: ${error.message}`, 'ERROR');
            throw error;
        } finally {
            await this.pool.end();
        }
    }
}

// 🚀 EXECUÇÃO
if (require.main === module) {
    const analise = new AnaliseDadosTradingView();
    analise.executarAnalise().then(resultado => {
        console.log('\n🎯 Análise concluída!');
        if (resultado.problemasEncontrados.length > 0) {
            console.log(`⚠️  ${resultado.problemasEncontrados.length} problema(s) identificado(s)`);
        } else {
            console.log('✅ Dados sendo processados corretamente');
        }
        process.exit(0);
    }).catch(error => {
        console.error('❌ ERRO:', error.message);
        process.exit(1);
    });
}

module.exports = AnaliseDadosTradingView;
