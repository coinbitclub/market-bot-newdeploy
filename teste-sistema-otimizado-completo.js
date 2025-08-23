/**
 * TESTE COMPLETO DO SISTEMA OTIMIZADO DE IA
 * Validação da integração do OtimizadorSinaisIA com o SistemaLeituraMercadoIntegrado
 * 
 * Verifica:
 * - Uso inteligente da IA apenas para sinais complexos
 * - Economia de tokens/custos
 * - Qualidade das decisões mantida
 * - Performance do sistema integrado
 */

const { SistemaLeituraMercadoIntegrado } = require('./sistema-leitura-mercado-integrado');

class TesteSistemaOtimizado {
    constructor() {
        this.sistema = new SistemaLeituraMercadoIntegrado();
        this.resultados = {
            total_testes: 0,
            sucessos: 0,
            falhas: 0,
            economia_estimada: 0,
            detalhes: []
        };
    }

    /**
     * Executar todos os testes
     */
    async executarTodos() {
        console.log('🧪 INICIANDO TESTES DO SISTEMA OTIMIZADO DE IA');
        console.log('=' .repeat(60));

        try {
            // 1. Testar sinais que NÃO devem usar IA
            await this.testarSinaisAlgoritmicos();

            // 2. Testar sinais que DEVEM usar IA
            await this.testarSinaisComIA();

            // 3. Testar cenários com posições ativas
            await this.testarCenariosComPosicoes();

            // 4. Validar economia de custos
            await this.validarEconomia();

            // 5. Testar performance
            await this.testarPerformance();

            this.gerarRelatorioFinal();

        } catch (error) {
            console.error('❌ Erro durante testes:', error);
            throw error;
        }

        return {
            aprovado: this.resultados.falhas === 0,
            estatisticas: this.resultados,
            percentual_sucesso: (this.resultados.sucessos / this.resultados.total_testes * 100).toFixed(1)
        };
    }

    /**
     * Teste 1: Sinais que devem usar processamento algorítmico
     */
    async testarSinaisAlgoritmicos() {
        console.log('\n📊 TESTE 1: Sinais Algorítmicos (SEM IA)');
        console.log('-'.repeat(50));

        const sinaisTeste = [
            {
                type: 'SINAL_LONG',
                ticker: 'BTCUSDT',
                preco: 45000,
                descricao: 'Long simples sem posições'
            },
            {
                type: 'SINAL_SHORT', 
                ticker: 'ETHUSDT',
                preco: 3000,
                descricao: 'Short simples sem posições'
            },
            {
                type: 'FECHE_LONG',
                ticker: 'BTCUSDT',
                descricao: 'Feche sem posição ativa'
            }
        ];

        for (const sinal of sinaisTeste) {
            await this.executarTesteSinal(sinal, 'ALGORITMO', sinal.descricao);
        }
    }

    /**
     * Teste 2: Sinais que devem usar IA
     */
    async testarSinaisComIA() {
        console.log('\n🤖 TESTE 2: Sinais Complexos (COM IA)');
        console.log('-'.repeat(50));

        const sinaisTeste = [
            {
                type: 'LONG_FORTE',
                ticker: 'BTCUSDT',
                preco: 45000,
                volume_aumento: 150,
                descricao: 'Sinal forte requer análise IA'
            },
            {
                type: 'SHORT_FORTE',
                ticker: 'ETHUSDT', 
                preco: 3000,
                volume_aumento: 200,
                descricao: 'Short forte requer análise IA'
            }
        ];

        for (const sinal of sinaisTeste) {
            await this.executarTesteSinal(sinal, 'IA', sinal.descricao);
        }
    }

    /**
     * Teste 3: Cenários com posições ativas
     */
    async testarCenariosComPosicoes() {
        console.log('\n📈 TESTE 3: Cenários com Posições Ativas');
        console.log('-'.repeat(50));

        // Simular posições ativas
        const posicoesAtivas = new Map([
            ['BTCUSDT', { tipo: 'LONG', entrada: 44000, quantidade: 0.1 }],
            ['ETHUSDT', { tipo: 'SHORT', entrada: 3100, quantidade: 1.0 }]
        ]);

        const sinaisTeste = [
            {
                type: 'FECHE_LONG',
                ticker: 'BTCUSDT',
                descricao: 'Feche com posição LONG ativa - deve usar IA'
            },
            {
                type: 'FECHE_SHORT',
                ticker: 'ETHUSDT',
                descricao: 'Feche com posição SHORT ativa - deve usar IA'
            },
            {
                type: 'FECHE_LONG',
                ticker: 'ADAUSDT',
                descricao: 'Feche sem posição ativa - algoritmo'
            }
        ];

        for (const sinal of sinaisTeste) {
            await this.executarTesteSinal(
                sinal, 
                sinal.ticker === 'ADAUSDT' ? 'ALGORITMO' : 'IA',
                sinal.descricao,
                posicoesAtivas
            );
        }
    }

    /**
     * Executar teste individual de sinal
     */
    async executarTesteSinal(sinal, tipoEsperado, descricao, posicoes = new Map()) {
        this.resultados.total_testes++;

        try {
            console.log(`\n🔍 Testando: ${descricao}`);
            console.log(`   Sinal: ${sinal.type} - ${sinal.ticker}`);
            console.log(`   Esperado: ${tipoEsperado}`);

            const inicio = Date.now();
            const resultado = await this.sistema.processarSinalOtimizado(sinal, posicoes);
            const tempo = Date.now() - inicio;

            // Verificar se usou o processamento correto
            const usouIA = resultado.otimizacao?.usou_ia;
            const tipoUsado = usouIA ? 'IA' : 'ALGORITMO';

            const sucesso = tipoUsado === tipoEsperado;

            console.log(`   ✅ Resultado: ${tipoUsado} (${tempo}ms)`);
            console.log(`   📊 Decisão: ${resultado.direcao_final} | Confiança: ${resultado.confianca}`);
            console.log(`   💰 Economia: ${resultado.otimizacao?.economia_tokens || 0} tokens`);

            if (sucesso) {
                this.resultados.sucessos++;
                console.log(`   ✅ SUCESSO: Usou ${tipoUsado} conforme esperado`);
            } else {
                this.resultados.falhas++;
                console.log(`   ❌ FALHA: Esperado ${tipoEsperado}, usado ${tipoUsado}`);
            }

            // Registrar economia
            if (!usouIA) {
                this.resultados.economia_estimada += 200; // tokens economizados
            }

            this.resultados.detalhes.push({
                teste: descricao,
                sinal: sinal.type,
                esperado: tipoEsperado,
                usado: tipoUsado,
                sucesso,
                tempo,
                economia: resultado.otimizacao?.economia_tokens || 0
            });

        } catch (error) {
            this.resultados.falhas++;
            console.error(`   ❌ ERRO: ${error.message}`);
            
            this.resultados.detalhes.push({
                teste: descricao,
                erro: error.message,
                sucesso: false
            });
        }
    }

    /**
     * Validar economia de custos
     */
    async validarEconomia() {
        console.log('\n💰 TESTE 4: Validação de Economia');
        console.log('-'.repeat(50));

        const estatisticas = this.sistema.obterEstatisticasOtimizacao();
        
        console.log('📊 Estatísticas do Otimizador:');
        console.log(`   Total processados: ${estatisticas.total_processados}`);
        console.log(`   Usaram IA: ${estatisticas.usaram_ia}`);
        console.log(`   Usaram Algoritmo: ${estatisticas.usaram_algoritmo}`);
        console.log(`   Economia estimada: ${this.resultados.economia_estimada} tokens`);

        const percentualIA = estatisticas.total_processados > 0 
            ? (estatisticas.usaram_ia / estatisticas.total_processados * 100).toFixed(1)
            : 0;

        console.log(`   % uso IA: ${percentualIA}%`);
        
        // Validar que estamos usando IA em menos de 60% dos casos (ajustado)
        const economiaSucesso = percentualIA <= 60;
        
        if (economiaSucesso) {
            console.log('   ✅ ECONOMIA CONFIRMADA: IA usada <= 60% dos casos');
            this.resultados.sucessos++;
        } else {
            console.log('   ❌ ECONOMIA FALHOU: IA usada > 60% dos casos');
            this.resultados.falhas++;
        }

        this.resultados.total_testes++;
    }

    /**
     * Testar performance do sistema
     */
    async testarPerformance() {
        console.log('\n⚡ TESTE 5: Performance do Sistema');
        console.log('-'.repeat(50));

        const sinal = {
            type: 'SINAL_LONG',
            ticker: 'BTCUSDT',
            preco: 45000
        };

        // Executar múltiplos testes
        const tempos = [];
        const numTestes = 10;

        for (let i = 0; i < numTestes; i++) {
            const inicio = Date.now();
            await this.sistema.processarSinalOtimizado(sinal);
            const tempo = Date.now() - inicio;
            tempos.push(tempo);
        }

        const tempoMedio = tempos.reduce((a, b) => a + b, 0) / tempos.length;
        const tempoMax = Math.max(...tempos);
        const tempoMin = Math.min(...tempos);

        console.log(`📊 Performance (${numTestes} execuções):`);
        console.log(`   Tempo médio: ${tempoMedio.toFixed(2)}ms`);
        console.log(`   Tempo mín: ${tempoMin}ms`);
        console.log(`   Tempo máx: ${tempoMax}ms`);

        // Performance aceitável se tempo médio < 1000ms
        const performanceBoa = tempoMedio < 1000;

        if (performanceBoa) {
            console.log('   ✅ PERFORMANCE BOA: Tempo médio < 1s');
            this.resultados.sucessos++;
        } else {
            console.log('   ❌ PERFORMANCE RUIM: Tempo médio >= 1s');
            this.resultados.falhas++;
        }

        this.resultados.total_testes++;
    }

    /**
     * Gerar relatório final
     */
    gerarRelatorioFinal() {
        console.log('\n' + '='.repeat(60));
        console.log('📋 RELATÓRIO FINAL - SISTEMA OTIMIZADO DE IA');
        console.log('='.repeat(60));

        const percentualSucesso = (this.resultados.sucessos / this.resultados.total_testes * 100).toFixed(1);

        console.log(`\n📊 ESTATÍSTICAS GERAIS:`);
        console.log(`   Total de testes: ${this.resultados.total_testes}`);
        console.log(`   Sucessos: ${this.resultados.sucessos}`);
        console.log(`   Falhas: ${this.resultados.falhas}`);
        console.log(`   Taxa de sucesso: ${percentualSucesso}%`);

        console.log(`\n💰 ECONOMIA DE CUSTOS:`);
        console.log(`   Tokens economizados: ${this.resultados.economia_estimada}`);
        console.log(`   Custo evitado: ~$${(this.resultados.economia_estimada * 0.002).toFixed(3)}`);

        const statusFinal = this.resultados.falhas === 0 ? '✅ APROVADO' : '❌ REPROVADO';
        console.log(`\n🎯 STATUS FINAL: ${statusFinal}`);

        if (this.resultados.falhas > 0) {
            console.log('\n❌ FALHAS DETECTADAS:');
            this.resultados.detalhes
                .filter(d => !d.sucesso)
                .forEach(falha => {
                    console.log(`   - ${falha.teste}: ${falha.erro || 'Comportamento inesperado'}`);
                });
        }

        console.log('\n🚀 RECOMENDAÇÕES:');
        if (this.resultados.falhas === 0) {
            console.log('   ✅ Sistema pronto para produção');
            console.log('   ✅ Otimização de IA funcionando corretamente');
            console.log('   ✅ Economia de custos confirmada');
        } else {
            console.log('   ⚠️  Revisar falhas antes de deploy');
            console.log('   ⚠️  Validar lógica de decisão de IA vs Algoritmo');
        }

        return {
            aprovado: this.resultados.falhas === 0,
            estatisticas: this.resultados,
            percentual_sucesso: parseFloat(percentualSucesso)
        };
    }
}

// Executar testes se chamado diretamente
if (require.main === module) {
    (async () => {
        try {
            const teste = new TesteSistemaOtimizado();
            const resultado = await teste.executarTodos();
            
            console.log('\n' + '='.repeat(60));
            console.log('🏁 TESTES CONCLUÍDOS');
            console.log('='.repeat(60));

            process.exit(resultado.aprovado ? 0 : 1);

        } catch (error) {
            console.error('💥 ERRO CRÍTICO:', error);
            process.exit(1);
        }
    })();
}

module.exports = TesteSistemaOtimizado;
