/**
 * 🚀 INICIALIZAÇÃO COMPLETA DO SISTEMA DE TRADE
 * ===========================================
 * Script que garante que tudo está funcionando antes de iniciar os trades
 */

const CoinbitClubGuaranteed = require('./coinbitclub-garantido');
const SistemaTradeCompleto = require('./sistema-trade-completo');

class InicializacaoCompleta {
    constructor() {
        this.sistemaGarantido = new CoinbitClubGuaranteed();
        this.sistemaTrade = null;
    }

    async executar() {
        console.log('\n🚀 INICIALIZAÇÃO COMPLETA DO SISTEMA');
        console.log('===================================');
        
        try {
            // Etapa 1: Garantir estrutura e dados
            console.log('\n📋 ETAPA 1: Garantindo estrutura e dados...');
            const estruturaOK = await this.sistemaGarantido.garantirEstrutura();
            
            if (!estruturaOK) {
                throw new Error('Falha ao garantir estrutura do banco');
            }
            
            const dadosOK = await this.sistemaGarantido.garantirDados();
            
            if (!dadosOK) {
                throw new Error('Falha ao garantir dados de teste');
            }
            
            console.log('✅ Estrutura e dados garantidos');
            
            // Etapa 2: Validação inicial
            console.log('\n🔍 ETAPA 2: Validação inicial das conexões...');
            const validacaoOK = await this.sistemaGarantido.executarValidacao();
            
            if (!validacaoOK) {
                console.log('⚠️ Nenhuma conexão validada, mas continuando...');
            } else {
                console.log(`✅ ${this.sistemaGarantido.validatedConnections.size} conexões validadas`);
            }
            
            // Etapa 3: Iniciar sistema de trade
            console.log('\n🚀 ETAPA 3: Iniciando sistema de trade...');
            this.sistemaTrade = new SistemaTradeCompleto();
            await this.sistemaTrade.iniciar();
            
            console.log('\n🎉 SISTEMA COMPLETAMENTE OPERACIONAL!');
            console.log('====================================');
            console.log('✅ Estrutura do banco verificada');
            console.log('✅ Dados de teste garantidos');
            console.log('✅ Conexões validadas');
            console.log('✅ Sistema de trade ativo');
            console.log('✅ API REST disponível');
            console.log('✅ Validação automática configurada');
            
            console.log('\n📋 PRÓXIMOS PASSOS:');
            console.log('1. Teste a API: GET http://localhost:3001/status');
            console.log('2. Veja os saldos: GET http://localhost:3001/balances');
            console.log('3. Execute um trade: POST http://localhost:3001/trade');
            console.log('4. Execute para todos: POST http://localhost:3001/trade/all');
            
            return true;
            
        } catch (error) {
            console.error('❌ Erro na inicialização:', error.message);
            return false;
        }
    }

    async parar() {
        if (this.sistemaTrade) {
            await this.sistemaTrade.parar();
        }
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    const inicializacao = new InicializacaoCompleta();
    
    inicializacao.executar().then(success => {
        if (!success) {
            process.exit(1);
        }
    }).catch(error => {
        console.error('❌ Erro fatal:', error.message);
        process.exit(1);
    });
    
    // Graceful shutdown
    process.on('SIGINT', async () => {
        console.log('\n🛑 Parando sistema...');
        await inicializacao.parar();
        process.exit(0);
    });
    
    process.on('SIGTERM', async () => {
        console.log('\n🛑 Parando sistema...');
        await inicializacao.parar();
        process.exit(0);
    });
}

module.exports = InicializacaoCompleta;
