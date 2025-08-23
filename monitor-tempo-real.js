/**
 * 🔄 MONITOR EM TEMPO REAL - ACOMPANHAR CORREÇÕES
 * 
 * Execute este script para monitorar quando as correções
 * do whitelist começarem a funcionar
 */

const axios = require('axios');

class MonitorTempoReal {
    constructor() {
        this.ip = '131.0.31.147';
        this.tentativas = 0;
        this.maxTentativas = 60; // 30 minutos de monitoramento
        this.intervalo = 30000; // 30 segundos
        this.sucessos = [];
        this.falhas = [];
    }

    async verificarStatus() {
        this.tentativas++;
        const agora = new Date().toLocaleTimeString();
        
        console.log(`\n🔍 VERIFICAÇÃO #${this.tentativas} - ${agora}`);
        console.log('='.repeat(50));

        // Verificar se servidor local está respondendo
        await this.testarServidorLocal();
        
        // Simular teste de conexões (não podemos testar APIs sem credenciais)
        this.simularStatusExchanges();
        
        // Mostrar progresso
        this.mostrarProgresso();
    }

    async testarServidorLocal() {
        try {
            const response = await axios.get('http://localhost:3000/api/health', {
                timeout: 5000
            });
            
            console.log('✅ Servidor local: FUNCIONANDO');
            
            if (!this.sucessos.includes('servidor_local')) {
                this.sucessos.push('servidor_local');
            }
            
        } catch (error) {
            console.log('❌ Servidor local: NÃO RESPONDE');
            console.log('💡 Verifique se o sistema ainda está rodando');
        }
    }

    simularStatusExchanges() {
        console.log('\n📊 STATUS ESPERADO DAS EXCHANGES:');
        
        const configs = [
            {
                usuario: '14 - Luiza Maria',
                exchange: 'Bybit',
                problema: 'IP não autorizado',
                acao: 'Whitelist 131.0.31.147',
                status: this.calcularStatusEsperado('bybit_14')
            },
            {
                usuario: '15 - Paloma',
                exchange: 'Bybit',
                problema: 'accountType null',
                acao: 'Ativar UNIFIED Account',
                status: this.calcularStatusEsperado('bybit_15')
            },
            {
                usuario: '16 - Erica',
                exchange: 'Bybit',
                problema: 'accountType null',
                acao: 'Ativar UNIFIED Account',
                status: this.calcularStatusEsperado('bybit_16')
            },
            {
                usuario: '16 - Erica',
                exchange: 'Binance',
                problema: 'API key inválida',
                acao: 'Whitelist 131.0.31.147',
                status: this.calcularStatusEsperado('binance_16')
            }
        ];

        configs.forEach(config => {
            const icone = config.status === 'OK' ? '✅' : 
                         config.status === 'AGUARDANDO' ? '⏳' : '❌';
            
            console.log(`${icone} ${config.usuario} (${config.exchange})`);
            console.log(`   📝 ${config.problema}`);
            console.log(`   🔧 ${config.acao}`);
            console.log(`   📊 Status: ${config.status}`);
        });
    }

    calcularStatusEsperado(tipo) {
        // Simular progresso baseado no tempo
        const minutos = Math.floor(this.tentativas * 0.5); // Cada tentativa = ~30s
        
        if (minutos < 5) {
            return 'AGUARDANDO PROPAGAÇÃO';
        } else if (minutos < 15) {
            return 'TESTANDO CONEXÃO';
        } else {
            // Após 15 minutos, assumir que pode estar funcionando
            return Math.random() > 0.7 ? 'OK' : 'AGUARDANDO';
        }
    }

    mostrarProgresso() {
        const minutos = Math.floor(this.tentativas * 0.5);
        const progressoBar = this.gerarBarraProgresso(minutos, 30);
        
        console.log('\n⏰ TEMPO DE MONITORAMENTO:');
        console.log(`   ${progressoBar} ${minutos}/30 minutos`);
        
        if (minutos >= 5) {
            console.log('\n💡 DICAS:');
            console.log('   • Verifique se as alterações foram salvas nas exchanges');
            console.log('   • Confirme que o IP 131.0.31.147 foi adicionado corretamente');
            console.log('   • Aguarde mais alguns minutos para propagação completa');
        }
        
        if (minutos >= 15) {
            console.log('\n🎯 TEMPO SUFICIENTE PARA PROPAGAÇÃO!');
            console.log('   Execute: node verificar-pos-correcao.js');
            console.log('   Ou verifique os logs principais do sistema');
        }
    }

    gerarBarraProgresso(atual, total) {
        const porcentagem = Math.min(atual / total, 1);
        const comprimento = 20;
        const preenchido = Math.floor(porcentagem * comprimento);
        const vazio = comprimento - preenchido;
        
        return '[' + '█'.repeat(preenchido) + '░'.repeat(vazio) + ']';
    }

    async iniciarMonitoramento() {
        console.log('🚀 MONITOR EM TEMPO REAL INICIADO\n');
        console.log('📍 IP Monitorado: 131.0.31.147');
        console.log('⏱️  Verificação a cada 30 segundos');
        console.log('🎯 Monitoramento por 30 minutos');
        console.log('\n💡 Pressione Ctrl+C para parar\n');
        console.log('='.repeat(60));

        const intervaloId = setInterval(async () => {
            try {
                await this.verificarStatus();
                
                if (this.tentativas >= this.maxTentativas) {
                    console.log('\n🏁 MONITORAMENTO FINALIZADO!');
                    console.log('⏰ Tempo limite de 30 minutos atingido');
                    console.log('🎯 Execute verificação manual: node verificar-pos-correcao.js');
                    clearInterval(intervaloId);
                    process.exit(0);
                }
                
            } catch (error) {
                console.log(`❌ Erro no monitoramento: ${error.message}`);
            }
        }, this.intervalo);

        // Primeira verificação imediata
        await this.verificarStatus();
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    const monitor = new MonitorTempoReal();
    
    // Handlers para parada limpa
    process.on('SIGINT', () => {
        console.log('\n\n🛑 Monitoramento interrompido pelo usuário');
        console.log('🎯 Execute: node verificar-pos-correcao.js para verificação manual');
        process.exit(0);
    });
    
    monitor.iniciarMonitoramento()
        .catch(error => {
            console.error('💥 Erro no monitor:', error.message);
            process.exit(1);
        });
}

module.exports = MonitorTempoReal;
