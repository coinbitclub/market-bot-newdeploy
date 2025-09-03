const axios = require('axios');
const { Pool } = require('pg');

class SistemaRecuperacaoConectividade {
    constructor() {
        this.tentativasMaximas = 3;
        this.timeoutPadrao = 15000; // 15 segundos
        this.configuracaoDNS = {
            primary: '8.8.8.8',
            secondary: '8.8.4.4'
        };
    }

    async configurarAxiosComTimeouts() {
        // Configuração global do axios com timeouts e retries
        axios.defaults.timeout = this.timeoutPadrao;
        axios.defaults.headers.common['User-Agent'] = 'CoinBitClub-Bot/1.0';
        
        // Interceptor para retry automático
        axios.interceptors.response.use(
            response => response,
            async error => {
                const config = error.config;
                
                if (!config || config.__retryCount >= this.tentativasMaximas) {
                    return Promise.reject(error);
                }
                
                config.__retryCount = config.__retryCount || 0;
                config.__retryCount++;
                
                console.log(`🔄 Tentativa ${config.__retryCount}/${this.tentativasMaximas} para ${config.url}`);
                
                // Delay exponencial
                const delay = Math.pow(2, config.__retryCount) * 1000;
                await new Promise(resolve => setTimeout(resolve, delay));
                
                return axios(config);
            }
        );
    }

    async testarConexaoBanco() {
        console.log('🔍 Testando conexão com banco de dados...');
        
        const configuracoesBanco = [
            {
                host: 'trolley.proxy.rlwy.net',
                port: 31957,
                database: 'railway',
                user: 'postgres',
                password: 'process.env.API_KEY_HERE',
                ssl: true,
                connectionTimeoutMillis: 10000,
                idleTimeoutMillis: 30000
            }
        ];

        for (const config of configuracoesBanco) {
            try {
                console.log(`📡 Tentando conectar ao banco: ${config.host}:${config.port}`);
                
                const pool = new Pool(config);
                const client = await pool.connect();
                
                console.log('✅ Conexão com banco estabelecida!');
                
                // Teste simples
                const result = await client.query('SELECT NOW()');
                console.log(`✅ Teste de query: ${result.rows[0].now}`);
                
                client.release();
                await pool.end();
                
                return true;
            } catch (error) {
                console.log(`❌ Erro de conexão com banco: ${error.message}`);
                
                if (error.code === 'ENOTFOUND') {
                    console.log('💡 Problema de DNS detectado para o banco Railway');
                }
            }
        }
        
        return false;
    }

    async testarAPIBinance() {
        console.log('🔍 Testando APIs Binance...');
        
        const endpoints = [
            'https://api.binance.com/api/v3/ping',
            'https://api.binance.com/api/v3/time',
            'https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT'
        ];

        for (const endpoint of endpoints) {
            try {
                console.log(`📡 Testando: ${endpoint}`);
                
                const response = await axios.get(endpoint, {
                    timeout: 10000,
                    headers: {
                        'User-Agent': 'CoinBitClub-Bot/1.0'
                    }
                });
                
                console.log(`✅ API Binance OK: ${endpoint}`);
                console.log(`📊 Resposta: ${JSON.stringify(response.data).substring(0, 100)}...`);
                
                return true;
            } catch (error) {
                console.log(`❌ Erro na API Binance: ${error.message}`);
                
                if (error.code === 'ENOTFOUND') {
                    console.log('💡 Problema de DNS detectado para Binance API');
                }
            }
        }
        
        return false;
    }

    async aplicarSolucoesDNS() {
        console.log('🔧 Aplicando soluções de DNS...');
        
        // Configurar DNS do sistema (requer privilégios administrativos)
        try {
            const { exec } = require('child_process');
            const { promisify } = require('util');
            const execAsync = promisify(exec);
            
            console.log('🔧 Configurando DNS primário: 8.8.8.8');
            await execAsync('netsh interface ip set dns "Wi-Fi" static 8.8.8.8 primary');
            
            console.log('🔧 Configurando DNS secundário: 8.8.4.4');
            await execAsync('netsh interface ip add dns "Wi-Fi" 8.8.4.4 index=2');
            
            console.log('🔧 Limpando cache DNS...');
            await execAsync('ipconfig /flushdns');
            
            console.log('✅ Configurações DNS aplicadas!');
        } catch (error) {
            console.log('⚠️  Não foi possível alterar DNS (pode precisar de privilégios admin)');
            console.log('💡 Execute como administrador para aplicar correções DNS');
        }
    }

    async gerarRelatorioConectividade() {
        const relatorio = {
            timestamp: new Date().toISOString(),
            testes: {
                banco: await this.testarConexaoBanco(),
                binance: await this.testarAPIBinance()
            },
            solucoesSugeridas: [
                '1. Reiniciar o modem/roteador',
                '2. Alterar DNS para 8.8.8.8 e 8.8.4.4',
                '3. Verificar se há VPN ativa interferindo',
                '4. Verificar configurações de firewall/antivírus',
                '5. Verificar proxy corporativo',
                '6. Tentar conexão via hotspot móvel para teste',
                '7. Verificar se os domínios não estão bloqueados'
            ]
        };

        console.log('\n📋 RELATÓRIO DE CONECTIVIDADE:');
        console.log('=====================================');
        console.log(`🕐 Timestamp: ${relatorio.timestamp}`);
        console.log(`🗃️  Banco: ${relatorio.testes.banco ? '✅ OK' : '❌ FALHOU'}`);
        console.log(`📊 Binance: ${relatorio.testes.binance ? '✅ OK' : '❌ FALHOU'}`);
        console.log('\n💡 SOLUÇÕES SUGERIDAS:');
        relatorio.solucoesSugeridas.forEach(solucao => console.log(solucao));
        
        return relatorio;
    }

    async executarRecuperacao() {
        console.log('🚀 INICIANDO SISTEMA DE RECUPERAÇÃO DE CONECTIVIDADE...\n');
        
        await this.configurarAxiosComTimeouts();
        const relatorio = await this.gerarRelatorioConectividade();
        
        if (!relatorio.testes.banco || !relatorio.testes.binance) {
            console.log('\n🔧 Aplicando soluções automáticas...');
            await this.aplicarSolucoesDNS();
            
            console.log('\n🔄 Aguardando 10 segundos para propagação DNS...');
            await new Promise(resolve => setTimeout(resolve, 10000));
            
            console.log('\n🔄 Repetindo testes após correções...');
            await this.gerarRelatorioConectividade();
        }
        
        console.log('\n✅ PROCESSO DE RECUPERAÇÃO CONCLUÍDO!');
    }
}

// Executar sistema de recuperação
const sistema = new SistemaRecuperacaoConectividade();
sistema.executarRecuperacao().catch(console.error);
