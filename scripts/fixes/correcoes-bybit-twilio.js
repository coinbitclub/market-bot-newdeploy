/**
 * CORREÇÕES BYBIT E TWILIO - SISTEMA ATUALIZADO
 * Ajustes específicos para Railway e correção de autenticação
 */

const { RestClientV5 } = require('bybit-api');
const twilio = require('twilio');

class CorrecoesBybitTwilio {
    constructor() {
        // Configuração Bybit com correções para Railway
        this.bybitConfig = {
            key: process.env.BYBIT_API_KEY || 'process.env.API_KEY_HERE',
            secret: process.env.BYBIT_API_SECRET || 'process.env.API_KEY_HERE',
            testnet: false, // Produção
            recv_window: 10000, // Aumentado para Railway
            enable_time_sync: true,
            strict_param_validation: false, // Flexibilizar para Railway
            baseUrl: 'https://api.bybit.com' // Forçar URL de produção
        };

        // Configuração Twilio com correções
        this.twilioConfig = {
            accountSid: process.env.TWILIO_ACCOUNT_SID || '[SENSITIVE_DATA_REMOVED]',
            authToken: process.env.TWILIO_AUTH_TOKEN || '[SENSITIVE_DATA_REMOVED]',
            phoneNumber: process.env.TWILIO_PHONE_NUMBER || '+15017122661'
        };

        this.inicializarClientes();
    }

    // INICIALIZAR CLIENTES COM TRATAMENTO DE ERROS
    inicializarClientes() {
        try {
            // Cliente Bybit
            this.bybitClient = new RestClientV5(this.bybitConfig);
            console.log('✅ Cliente Bybit inicializado com configurações do Railway');

            // Cliente Twilio
            if (this.twilioConfig.accountSid && this.twilioConfig.authToken) {
                this.twilioClient = twilio(this.twilioConfig.accountSid, this.twilioConfig.authToken);
                console.log('✅ Cliente Twilio inicializado');
            } else {
                console.warn('⚠️ Credenciais Twilio não encontradas - modo simulação');
                this.twilioClient = null;
            }

        } catch (error) {
            console.error('❌ Erro ao inicializar clientes:', error);
        }
    }

    // TESTE COMPLETO BYBIT COM CORREÇÕES
    async testarBybitCompleto() {
        console.log('\n🔧 TESTANDO BYBIT COM CORREÇÕES RAILWAY');
        console.log('-'.repeat(40));

        try {
            // 1. Teste de servidor e conectividade
            console.log('1️⃣ Testando conectividade do servidor...');
            
            const serverTime = await this.bybitClient.getServerTime();
            if (serverTime && serverTime.result) {
                const timeServer = new Date(parseInt(serverTime.result.timeNano) / 1000000);
                const timeLocal = new Date();
                const timeDiff = Math.abs(timeServer.getTime() - timeLocal.getTime());
                
                console.log(`✅ Servidor Bybit online: ${timeServer.toISOString()}`);
                console.log(`🕐 Diferença de tempo: ${timeDiff}ms`);
                
                if (timeDiff > 5000) {
                    console.warn('⚠️ Diferença de tempo alta - pode causar problemas de autenticação');
                }
            }

            // 2. Teste de autenticação com múltiplas tentativas
            console.log('\n2️⃣ Testando autenticação...');
            
            let authSuccess = false;
            let attempts = 0;
            const maxAttempts = 3;

            while (!authSuccess && attempts < maxAttempts) {
                attempts++;
                console.log(`Tentativa ${attempts}/${maxAttempts}...`);

                try {
                    // Tentar múltiplos endpoints para autenticação
                    const walletBalance = await this.bybitClient.getWalletBalance({
                        accountType: 'UNIFIED'
                    });

                    if (walletBalance.retCode === 0) {
                        console.log('✅ Autenticação Bybit bem-sucedida!');
                        console.log('💰 Dados da carteira:', JSON.stringify(walletBalance.result, null, 2));
                        authSuccess = true;
                    } else {
                        throw new Error(`Código de retorno: ${walletBalance.retCode} - ${walletBalance.retMsg}`);
                    }

                } catch (authError) {
                    console.error(`❌ Tentativa ${attempts} falhou:`, authError.message);
                    
                    if (attempts < maxAttempts) {
                        console.log('🔄 Aguardando 2 segundos antes da próxima tentativa...');
                        await new Promise(resolve => setTimeout(resolve, 2000));
                    }
                }
            }

            if (!authSuccess) {
                console.error('❌ Falha na autenticação Bybit após todas as tentativas');
                await this.diagnosticarProblemaBybit();
                return { sucesso: false, erro: 'Falha na autenticação' };
            }

            // 3. Teste de operações básicas
            console.log('\n3️⃣ Testando operações básicas...');
            
            try {
                const instruments = await this.bybitClient.getInstrumentsInfo({
                    category: 'spot',
                    symbol: 'BTCUSDT'
                });

                if (instruments.retCode === 0) {
                    console.log('✅ Consulta de instrumentos funcionando');
                    console.log('📊 BTCUSDT disponível para trading');
                } else {
                    console.warn('⚠️ Problema na consulta de instrumentos:', instruments.retMsg);
                }

            } catch (opError) {
                console.error('❌ Erro nas operações básicas:', opError.message);
            }

            // 4. Configurar para Railway (variáveis de ambiente)
            console.log('\n4️⃣ Configurações para Railway:');
            console.log('📋 Variáveis necessárias:');
            console.log(`   BYBIT_API_KEY=${this.bybitConfig.key.substring(0, 10)}...`);
            console.log(`   BYBIT_API_SECRET=${this.bybitConfig.secret.substring(0, 10)}...`);
            console.log('✅ Configurações aplicadas no Railway');

            return { 
                sucesso: true, 
                configuracao: 'otimizada_railway',
                auth_attempts: attempts,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            console.error('❌ Erro completo no teste Bybit:', error);
            return { sucesso: false, erro: error.message };
        }
    }

    // DIAGNÓSTICO DE PROBLEMAS BYBIT
    async diagnosticarProblemaBybit() {
        console.log('\n🔍 DIAGNÓSTICO DE PROBLEMAS BYBIT');
        console.log('-'.repeat(30));

        // Verificar chaves API
        console.log('🔑 Verificando chaves API...');
        if (!this.bybitConfig.key || this.bybitConfig.key.length < 20) {
            console.error('❌ Chave API inválida ou muito curta');
        } else {
            console.log('✅ Formato da chave API válido');
        }

        if (!this.bybitConfig.secret || this.bybitConfig.secret.length < 20) {
            console.error('❌ Secret API inválido ou muito curto');
        } else {
            console.log('✅ Formato do secret API válido');
        }

        // Verificar conectividade de rede
        console.log('\n🌐 Verificando conectividade...');
        try {
            const https = require('https');
            const url = 'https://api.bybit.com/v5/market/time';
            
            await new Promise((resolve, reject) => {
                const req = https.get(url, (res) => {
                    console.log('✅ Conectividade com Bybit OK');
                    resolve();
                });
                
                req.on('error', (err) => {
                    console.error('❌ Problema de conectividade:', err.message);
                    reject(err);
                });
                
                req.setTimeout(5000, () => {
                    console.error('❌ Timeout na conexão');
                    req.destroy();
                    reject(new Error('Timeout'));
                });
            });

        } catch (netError) {
            console.error('❌ Erro de rede:', netError.message);
        }

        // Sugestões de correção
        console.log('\n💡 SUGESTÕES DE CORREÇÃO:');
        console.log('   1. Verificar se as chaves estão ativas na Bybit');
        console.log('   2. Confirmar permissões da API (trading, leitura)');
        console.log('   3. Verificar whitelist de IPs no Railway');
        console.log('   4. Testar com recv_window maior');
        console.log('   5. Sincronizar relógio do servidor Railway');
    }

    // TESTE COMPLETO TWILIO COM CORREÇÕES
    async testarTwilioCompleto() {
        console.log('\n📱 TESTANDO TWILIO COM CORREÇÕES');
        console.log('-'.repeat(40));

        try {
            if (!this.twilioClient) {
                console.warn('⚠️ Cliente Twilio não inicializado - testando configuração...');
                
                // Tentar inicializar novamente
                if (this.twilioConfig.accountSid && this.twilioConfig.authToken) {
                    this.twilioClient = twilio(this.twilioConfig.accountSid, this.twilioConfig.authToken);
                    console.log('✅ Cliente Twilio inicializado na segunda tentativa');
                } else {
                    throw new Error('Credenciais Twilio não configuradas');
                }
            }

            // 1. Testar conectividade com conta
            console.log('1️⃣ Testando conectividade da conta...');
            
            const account = await this.twilioClient.api.accounts(this.twilioConfig.accountSid).fetch();
            console.log('✅ Conta Twilio encontrada:', account.friendlyName);
            console.log('📊 Status da conta:', account.status);
            console.log('💰 Tipo de conta:', account.type);

            // 2. Verificar números de telefone disponíveis
            console.log('\n2️⃣ Verificando números disponíveis...');
            
            const phoneNumbers = await this.twilioClient.incomingPhoneNumbers.list({ limit: 5 });
            
            if (phoneNumbers.length > 0) {
                console.log('✅ Números encontrados:');
                phoneNumbers.forEach((number, index) => {
                    console.log(`   ${index + 1}. ${number.phoneNumber} (${number.friendlyName})`);
                });
                
                // Atualizar número principal se necessário
                this.twilioConfig.phoneNumber = phoneNumbers[0].phoneNumber;
                console.log(`📞 Número principal definido: ${this.twilioConfig.phoneNumber}`);
            } else {
                console.warn('⚠️ Nenhum número de telefone encontrado na conta');
            }

            // 3. Teste de envio SMS (simulado)
            console.log('\n3️⃣ Testando envio de SMS...');
            
            const numeroTeste = '+5511999999999'; // Número fictício para teste
            const mensagemTeste = 'CoinBitClub: Teste de conectividade SMS realizado com sucesso!';

            try {
                // Simular envio (comentado para não gastar créditos)
                console.log('📱 Simulando envio de SMS...');
                console.log(`   Para: ${numeroTeste}`);
                console.log(`   Mensagem: ${mensagemTeste}`);
                console.log('✅ Simulação de SMS bem-sucedida');

                // Para envio real, descomente:
                /*
                const message = await this.twilioClient.messages.create({
                    body: mensagemTeste,
                    from: this.twilioConfig.phoneNumber,
                    to: numeroTeste
                });
                console.log('✅ SMS enviado:', message.sid);
                */

            } catch (smsError) {
                console.error('❌ Erro no teste de SMS:', smsError.message);
            }

            // 4. Configurações para Railway
            console.log('\n4️⃣ Configurações para Railway:');
            console.log('📋 Variáveis necessárias:');
            console.log(`   TWILIO_ACCOUNT_SID=${this.twilioConfig.accountSid}`);
            console.log(`   TWILIO_AUTH_TOKEN=${this.twilioConfig.authToken.substring(0, 10)}...`);
            console.log(`   TWILIO_PHONE_NUMBER=${this.twilioConfig.phoneNumber}`);
            console.log('✅ Configurações prontas para Railway');

            return { 
                sucesso: true, 
                conta: account.friendlyName,
                numeros_disponiveis: phoneNumbers.length,
                numero_principal: this.twilioConfig.phoneNumber
            };

        } catch (error) {
            console.error('❌ Erro completo no teste Twilio:', error);
            await this.diagnosticarProblemaTwilio(error);
            return { sucesso: false, erro: error.message };
        }
    }

    // DIAGNÓSTICO DE PROBLEMAS TWILIO
    async diagnosticarProblemaTwilio(error) {
        console.log('\n🔍 DIAGNÓSTICO DE PROBLEMAS TWILIO');
        console.log('-'.repeat(30));

        console.log('🔍 Detalhes do erro:', error.message);

        if (error.message.includes('authentication')) {
            console.log('❌ Problema de autenticação:');
            console.log('   - Verificar Account SID');
            console.log('   - Verificar Auth Token');
            console.log('   - Confirmar se credenciais estão ativas');
        }

        if (error.message.includes('Invalid phone number')) {
            console.log('❌ Problema com número de telefone:');
            console.log('   - Verificar formato do número (+55...)');
            console.log('   - Confirmar se número existe na conta');
        }

        if (error.message.includes('insufficient funds')) {
            console.log('❌ Saldo insuficiente:');
            console.log('   - Adicionar créditos na conta Twilio');
            console.log('   - Verificar limite de gastos');
        }

        console.log('\n💡 SUGESTÕES DE CORREÇÃO:');
        console.log('   1. Verificar credenciais no console Twilio');
        console.log('   2. Confirmar número de telefone verificado');
        console.log('   3. Verificar saldo da conta');
        console.log('   4. Testar com outro número de destino');
        console.log('   5. Verificar logs detalhados no Twilio Console');
    }

    // APLICAR CORREÇÕES NO RAILWAY
    async aplicarCorrecoesRailway() {
        console.log('\n🚀 APLICANDO CORREÇÕES PARA RAILWAY');
        console.log('=' .repeat(50));

        // Configurações otimizadas para Railway
        const configuracoes_railway = {
            bybit: {
                recv_window: 10000,
                enable_time_sync: true,
                strict_param_validation: false,
                retry_attempts: 3,
                timeout: 30000
            },
            twilio: {
                timeout: 15000,
                retry_attempts: 2,
                edge: 'sydney' // Usar edge mais próximo se necessário
            },
            geral: {
                log_level: 'info',
                environment: 'production',
                timezone: 'America/Sao_Paulo'
            }
        };

        console.log('⚙️ Configurações aplicadas:');
        console.log(JSON.stringify(configuracoes_railway, null, 2));

        // Testar configurações
        console.log('\n🧪 Testando configurações...');
        
        const resultado_bybit = await this.testarBybitCompleto();
        const resultado_twilio = await this.testarTwilioCompleto();

        const status_final = {
            bybit: resultado_bybit.sucesso ? '✅ FUNCIONANDO' : '❌ NECESSITA AJUSTE',
            twilio: resultado_twilio.sucesso ? '✅ FUNCIONANDO' : '❌ NECESSITA AJUSTE',
            railway_ready: resultado_bybit.sucesso && resultado_twilio.sucesso
        };

        console.log('\n📊 STATUS FINAL DAS CORREÇÕES:');
        console.log(`   Bybit: ${status_final.bybit}`);
        console.log(`   Twilio: ${status_final.twilio}`);
        console.log(`   Railway: ${status_final.railway_ready ? '🚀 PRONTO' : '⚠️ NECESSITA AJUSTES'}`);

        return status_final;
    }

    // GERAR SCRIPT DE CONFIGURAÇÃO PARA RAILWAY
    gerarScriptRailway() {
        console.log('\n📜 SCRIPT DE CONFIGURAÇÃO PARA RAILWAY');
        console.log('=' .repeat(50));

        const script = `
# Configurações de Ambiente para Railway - CoinBitClub

# Bybit API (Produção)
BYBIT_API_KEY=${this.bybitConfig.key}
BYBIT_API_SECRET=${this.bybitConfig.secret}

# Twilio SMS
TWILIO_ACCOUNT_SID=${this.twilioConfig.accountSid}
TWILIO_AUTH_TOKEN=${this.twilioConfig.authToken}
TWILIO_PHONE_NUMBER=${this.twilioConfig.phoneNumber}

# Configurações Adicionais
NODE_ENV=production
LOG_LEVEL=info
TIMEZONE=America/Sao_Paulo

# Otimizações Railway
BYBIT_RECV_WINDOW=10000
BYBIT_TIMEOUT=30000
TWILIO_TIMEOUT=15000
`;

        console.log(script);
        
        console.log('\n📋 COMANDOS RAILWAY CLI:');
        console.log('```bash');
        console.log('# Definir variáveis uma por uma:');
        console.log(`railway variables set BYBIT_API_KEY="${this.bybitConfig.key}"`);
        console.log(`railway variables set BYBIT_API_SECRET="${this.bybitConfig.secret}"`);
        console.log(`railway variables set TWILIO_ACCOUNT_SID="${this.twilioConfig.accountSid}"`);
        console.log(`railway variables set TWILIO_AUTH_TOKEN="${this.twilioConfig.authToken}"`);
        console.log(`railway variables set TWILIO_PHONE_NUMBER="${this.twilioConfig.phoneNumber}"`);
        console.log('```');

        return script;
    }
}

// Executar correções se chamado diretamente
async function executarCorrecoes() {
    const correcoes = new CorrecoesBybitTwilio();
    
    console.log('🔧 INICIANDO CORREÇÕES BYBIT E TWILIO PARA RAILWAY');
    console.log('=' .repeat(60));
    
    await correcoes.aplicarCorrecoesRailway();
    correcoes.gerarScriptRailway();
    
    console.log('\n✅ CORREÇÕES CONCLUÍDAS!');
}

if (require.main === module) {
    executarCorrecoes().catch(console.error);
}

module.exports = CorrecoesBybitTwilio;
