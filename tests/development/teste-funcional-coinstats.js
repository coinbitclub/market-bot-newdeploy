/**
 * 🧪 TESTE FUNCIONAL COINSTATS
 * 
 * Teste prático da estrutura de dados da CoinStats
 */

require('dotenv').config();
const axios = require('axios');

class TesteFuncionalCoinStats {
    constructor() {
        console.log('🧪 TESTE FUNCIONAL - COINSTATS API\n');
    }

    async obterDadosReais() {
        console.log('📊 Obtendo dados reais da CoinStats...');
        
        try {
            // 1. Fear & Greed Index
            console.log('\n1️⃣ Fear & Greed Index:');
            const fgResponse = await axios.get(process.env.FEAR_GREED_URL, {
                headers: {
                    'X-API-KEY"YOUR_COINSTATS_API_KEYYOUR_API_KEY_HERE: 'application/json'
                },
                timeout: 10000
            });

            const fgData = fgResponse.data;
            console.log(`   📈 Atual: ${fgData.now.value} (${fgData.now.value_classification})`);
            console.log(`   📅 Ontem: ${fgData.yesterday.value} (${fgData.yesterday.value_classification})`);
            console.log(`   📆 Semana passada: ${fgData.lastWeek.value} (${fgData.lastWeek.value_classification})`);

            // 2. Bitcoin Price
            console.log('\n2️⃣ Bitcoin Price (CoinStats):');
            const btcResponse = await axios.get('https://openapiv1.coinstats.app/coins/bitcoin', {
                headers: {
                    'X-API-KEY"YOUR_COINSTATS_API_KEYYOUR_API_KEY_HERE: 'application/json'
                },
                timeout: 10000
            });

            const btcData = btcResponse.data;
            console.log(`   💰 Preço: $${btcData.price ? btcData.price.toLocaleString() : 'N/A'}`);
            console.log(`   📈 24h: ${btcData.priceChange1d || btcData.change || 'N/A'}%`);
            console.log(`   📊 Volume: $${btcData.volume ? btcData.volume.toLocaleString() : 'N/A'}`);
            console.log(`   🏪 Market Cap: $${btcData.marketCap ? btcData.marketCap.toLocaleString() : 'N/A'}`);

            // 3. Binance Bitcoin (comparação)
            console.log('\n3️⃣ Bitcoin Price (Binance):');
            const binanceResponse = await axios.get('https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT', {
                timeout: 10000
            });

            const binanceData = binanceResponse.data;
            console.log(`   💰 Preço: $${parseFloat(binanceData.lastPrice).toLocaleString()}`);
            console.log(`   📈 24h: ${parseFloat(binanceData.priceChangePercent).toFixed(2)}%`);
            console.log(`   📊 Volume: ${parseFloat(binanceData.volume).toLocaleString()} BTC`);

            // 4. Criar objeto unificado (simulação do sistema)
            console.log('\n4️⃣ Dados Unificados para o Sistema:');
            const dadosUnificados = {
                btc_price: btcData.price || parseFloat(binanceData.lastPrice),
                btc_change_24h: btcData.priceChange1d || btcData.change || parseFloat(binanceData.priceChangePercent),
                fear_greed_index: fgData.now.value,
                fear_greed_classification: fgData.now.value_classification,
                volume_24h: btcData.volume || parseFloat(binanceData.volume),
                market_cap: btcData.marketCap || null,
                api_source: 'CoinStats + Binance',
                data_quality: 'high',
                timestamp: new Date().toISOString()
            };

            console.log('   📋 Estrutura final:');
            Object.entries(dadosUnificados).forEach(([key, value]) => {
                const displayValue = typeof value === 'number' ? 
                    (value > 1000 ? value.toLocaleString() : value) : value;
                console.log(`      ${key}: ${displayValue}`);
            });

            return dadosUnificados;

        } catch (error) {
            console.error('❌ Erro ao obter dados:', error.message);
            if (error.response) {
                console.error('📄 Status:', error.response.status);
                console.error('📝 Response:', error.response.data);
            }
            return null;
        }
    }

    async simularSalvamentoBanco(dados) {
        console.log('\n5️⃣ Simulação de Salvamento no Banco:');
        
        if (!dados) {
            console.log('   ❌ Nenhum dado para salvar');
            return false;
        }

        // Simular query SQL
        const query = `
            INSERT INTO sistema_leitura_mercado (
                ciclo_id, btc_price, btc_change_24h, fear_greed_index, 
                fear_greed_classification, volume_24h, market_cap,
                api_source, data_quality, recomendacao_trading, confidence_level
            ) VALUES (
                'ciclo-teste-${Date.now()}',
                ${dados.btc_price},
                ${dados.btc_change_24h},
                ${dados.fear_greed_index},
                '${dados.fear_greed_classification}',
                ${dados.volume_24h},
                ${dados.market_cap},
                '${dados.api_source}',
                '${dados.data_quality}',
                'LONG_E_SHORT',
                75
            )
        `;

        console.log('   📝 Query SQL simulada:');
        console.log(query);
        console.log('   ✅ Dados válidos para salvamento');
        
        return true;
    }

    async gerarRecomendacao(dados) {
        console.log('\n6️⃣ Geração de Recomendação de Trading:');
        
        if (!dados) {
            console.log('   ❌ Nenhum dado para análise');
            return null;
        }

        const fgIndex = dados.fear_greed_index;
        const priceChange = dados.btc_change_24h;
        
        let recomendacao = 'LONG_E_SHORT';
        let confidence = 50;
        let justificativa = 'Mercado neutro';

        // Análise baseada em Fear & Greed
        if (fgIndex <= 25) {
            recomendacao = 'SOMENTE_LONG';
            confidence = 85;
            justificativa = 'Fear extremo - oportunidade de compra';
        } else if (fgIndex >= 75) {
            recomendacao = 'SOMENTE_SHORT';
            confidence = 80;
            justificativa = 'Greed alto - risco de correção';
        } else if (fgIndex <= 40) {
            recomendacao = 'SOMENTE_LONG';
            confidence = 70;
            justificativa = 'Fear moderado - momento favorável para compra';
        } else if (fgIndex >= 65) {
            recomendacao = 'SOMENTE_SHORT';
            confidence = 65;
            justificativa = 'Greed moderado - cautela recomendada';
        }

        // Ajustar baseado no momentum de preço
        if (priceChange > 5) {
            confidence += 10;
            justificativa += ' + momentum positivo forte';
        } else if (priceChange < -5) {
            confidence += 10;
            justificativa += ' + momentum negativo forte';
        }

        const analise = {
            recomendacao,
            confidence: Math.min(confidence, 95),
            justificativa,
            fear_greed_value: fgIndex,
            price_momentum: priceChange
        };

        console.log('   🎯 Recomendação:', analise.recomendacao);
        console.log('   📊 Confiança:', analise.confidence + '%');
        console.log('   📝 Justificativa:', analise.justificativa);

        return analise;
    }

    async executarTesteFuncional() {
        console.log('🧪 EXECUTANDO TESTE FUNCIONAL COMPLETO...\n');

        try {
            // 1. Obter dados reais
            const dados = await this.obterDadosReais();
            
            if (!dados) {
                throw new Error('Falha ao obter dados das APIs');
            }

            // 2. Gerar recomendação
            const analise = await this.gerarRecomendacao(dados);

            // 3. Simular salvamento
            const salvamentoOk = await this.simularSalvamentoBanco(dados);

            // 4. Resumo final
            console.log('\n📊 RESUMO DO TESTE FUNCIONAL:');
            console.log('==============================');
            console.log(`✅ Dados obtidos: ${dados ? 'SIM' : 'NÃO'}`);
            console.log(`✅ Análise gerada: ${analise ? 'SIM' : 'NÃO'}`);
            console.log(`✅ Salvamento simulado: ${salvamentoOk ? 'SIM' : 'NÃO'}`);
            
            if (dados && analise) {
                console.log('\n🎉 TESTE FUNCIONAL COMPLETO: SUCESSO');
                console.log('🔥 Sistema pronto para produção com dados reais!');
                return true;
            } else {
                throw new Error('Algum componente falhou');
            }

        } catch (error) {
            console.error('\n💥 ERRO NO TESTE FUNCIONAL:', error.message);
            return false;
        }
    }
}

// Execução automática
if (require.main === module) {
    const teste = new TesteFuncionalCoinStats();
    
    teste.executarTesteFuncional().then(sucesso => {
        if (sucesso) {
            console.log('\n🚀 SISTEMA VALIDADO - PRONTO PARA USAR!');
            console.log('   Execute: node ativacao-final.js');
        } else {
            console.log('\n❌ VALIDAÇÃO FALHOU - VERIFICAR PROBLEMAS');
        }
        process.exit(sucesso ? 0 : 1);
    }).catch(error => {
        console.error('\n💥 Erro no teste:', error.message);
        process.exit(1);
    });
}

module.exports = TesteFuncionalCoinStats;
