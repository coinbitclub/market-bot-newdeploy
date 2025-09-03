/**
 * 🔍 BATERIA COMPLETA DE TESTES - DIAGNÓSTICO RAILWAY
 * Verifica IP fixo, geolocalização, DNS, rotas e problemas específicos
 */

const axios = require('axios');

class DiagnosticoCompleto {
    constructor() {
        this.baseUrl = process.env.RAILWAY_URL || 'https://coinbitclub-market-bot-production.up.railway.app';
        this.resultados = {
            conectividade: {},
            geolocalizacao: {},
            dns: {},
            endpoints: {},
            railway: {},
            problemas: []
        };
    }

    async executarTodosOsTestes() {
        console.log('🔍 INICIANDO DIAGNÓSTICO COMPLETO DO RAILWAY');
        console.log('=============================================');
        
        await this.testeConectividadeBasica();
        await this.testeGeolocalizacao();
        await this.testeDNS();
        await this.testeIPFixo();
        await this.testeRailwayEspecifico();
        await this.testeEndpointsCriticos();
        await this.testeEndpointsCompletos();
        await this.analisarProblemas();
        
        this.gerarRelatorioFinal();
    }

    async testeConectividadeBasica() {
        console.log('\n📡 TESTE 1: CONECTIVIDADE BÁSICA');
        console.log('================================');
        
        try {
            // Teste básico de ping
            console.log('🔍 Testando conectividade básica...');
            const response = await axios.get(this.baseUrl, { 
                timeout: 10000,
                headers: {
                    'User-Agent': 'CoinBitClub-Diagnostic/1.0'
                }
            });
            
            this.resultados.conectividade = {
                status: response.status,
                headers: response.headers,
                tempo: Date.now(),
                sucesso: true
            };
            
            console.log('✅ Conectividade básica OK');
            console.log(`📊 Status: ${response.status}`);
            console.log(`🌐 Server: ${response.headers.server || 'N/A'}`);
            
        } catch (error) {
            this.resultados.conectividade = {
                erro: error.message,
                code: error.code,
                sucesso: false
            };
            
            console.log('❌ Falha na conectividade básica');
            console.log(`🚨 Erro: ${error.message}`);
            this.resultados.problemas.push('Conectividade básica falhou');
        }
    }

    async testeGeolocalizacao() {
        console.log('\n🌍 TESTE 2: GEOLOCALIZAÇÃO E IP');
        console.log('===============================');
        
        try {
            // Verificar nosso IP atual
            console.log('🔍 Verificando nosso IP...');
            const ipResponse = await axios.get('https://api.ipify.org?format=json');
            const nossoIP = ipResponse.data.ip;
            
            console.log(`📍 Nosso IP: ${nossoIP}`);
            
            // Verificar geolocalização
            const geoResponse = await axios.get(`http://ip-api.com/json/${nossoIP}`);
            const geoData = geoResponse.data;
            
            this.resultados.geolocalizacao = {
                ip: nossoIP,
                pais: geoData.country,
                regiao: geoData.regionName,
                cidade: geoData.city,
                isp: geoData.isp,
                bloqueado: geoData.country !== 'Brazil' && geoData.country !== 'United States'
            };
            
            console.log(`🌍 País: ${geoData.country}`);
            console.log(`📍 Região: ${geoData.regionName}, ${geoData.city}`);
            console.log(`🏢 ISP: ${geoData.isp}`);
            
            if (this.resultados.geolocalizacao.bloqueado) {
                console.log('⚠️ POSSÍVEL PROBLEMA: IP de região restrita');
                this.resultados.problemas.push('IP de região possivelmente restrita para exchanges');
            }
            
        } catch (error) {
            console.log('❌ Erro na verificação de geolocalização');
            this.resultados.problemas.push('Falha na verificação de geolocalização');
        }
    }

    async testeDNS() {
        console.log('\n🔗 TESTE 3: RESOLUÇÃO DNS');
        console.log('========================');
        
        try {
            const url = new URL(this.baseUrl);
            console.log(`🔍 Resolvendo DNS para: ${url.hostname}`);
            
            // Teste de resolução DNS básico
            const dnsResponse = await axios.get(`https://dns.google/resolve?name=${url.hostname}&type=A`);
            
            if (dnsResponse.data.Answer) {
                const ips = dnsResponse.data.Answer.map(a => a.data);
                console.log(`✅ DNS resolvido: ${ips.join(', ')}`);
                
                this.resultados.dns = {
                    hostname: url.hostname,
                    ips: ips,
                    sucesso: true
                };
            }
            
        } catch (error) {
            console.log('❌ Erro na resolução DNS');
            this.resultados.problemas.push('Falha na resolução DNS');
        }
    }

    async testeIPFixo() {
        console.log('\n🔒 TESTE 4: VERIFICAÇÃO IP FIXO');
        console.log('==============================');
        
        try {
            // Testar múltiplas requisições para verificar IP fixo
            const ips = [];
            
            for (let i = 0; i < 3; i++) {
                console.log(`🔍 Teste ${i + 1}/3 - Verificando IP...`);
                const response = await axios.get('https://api.ipify.org?format=json');
                ips.push(response.data.ip);
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
            
            const ipUnico = [...new Set(ips)];
            const ipFixo = ipUnico.length === 1;
            
            console.log(`📍 IPs detectados: ${ips.join(', ')}`);
            console.log(`🔒 IP Fixo: ${ipFixo ? 'SIM' : 'NÃO'}`);
            
            this.resultados.ipFixo = {
                ips: ips,
                ipFixo: ipFixo,
                ipAtual: ips[0]
            };
            
            if (!ipFixo) {
                console.log('⚠️ PROBLEMA DETECTADO: IP não é fixo');
                this.resultados.problemas.push('IP dinâmico detectado - pode causar bloqueios em exchanges');
            }
            
        } catch (error) {
            console.log('❌ Erro na verificação de IP fixo');
            this.resultados.problemas.push('Falha na verificação de IP fixo');
        }
    }

    async testeRailwayEspecifico() {
        console.log('\n🚄 TESTE 5: RAILWAY ESPECÍFICO');
        console.log('==============================');
        
        try {
            // Testar headers específicos do Railway
            console.log('🔍 Verificando headers do Railway...');
            
            const response = await axios.get(this.baseUrl, {
                timeout: 15000,
                headers: {
                    'X-Forwarded-For': '127.0.0.1',
                    'X-Real-IP': '127.0.0.1',
                    'User-Agent': 'Railway-Health-Check/1.0'
                }
            });
            
            this.resultados.railway = {
                status: response.status,
                railwayHeaders: {
                    'x-railway-request-id': response.headers['x-railway-request-id'],
                    'x-railway-region': response.headers['x-railway-region'],
                    'server': response.headers.server
                },
                contentType: response.headers['content-type'],
                contentLength: response.headers['content-length'],
                sucesso: true
            };
            
            console.log('✅ Railway respondendo normalmente');
            console.log(`📊 Content-Type: ${response.headers['content-type']}`);
            console.log(`📏 Content-Length: ${response.headers['content-length']}`);
            
            if (response.headers['x-railway-region']) {
                console.log(`🌍 Railway Region: ${response.headers['x-railway-region']}`);
            }
            
        } catch (error) {
            console.log('❌ Erro no teste Railway específico');
            console.log(`🚨 Detalhes: ${error.message}`);
            
            this.resultados.railway = {
                erro: error.message,
                status: error.response?.status,
                sucesso: false
            };
            
            this.resultados.problemas.push(`Railway erro: ${error.message}`);
        }
    }

    async testeEndpointsCriticos() {
        console.log('\n🎯 TESTE 6: ENDPOINTS CRÍTICOS');
        console.log('==============================');
        
        const endpointsCriticos = [
            '/health',
            '/',
            '/api/system/status',
            '/api/current-mode',
            '/api/production-mode',
            '/ativar-chaves-reais'
        ];
        
        for (const endpoint of endpointsCriticos) {
            try {
                console.log(`🔍 Testando ${endpoint}...`);
                
                const response = await axios.get(`${this.baseUrl}${endpoint}`, {
                    timeout: 10000,
                    validateStatus: function (status) {
                        return status < 500; // Aceitar até erro 4xx
                    }
                });
                
                const sucesso = response.status < 400;
                console.log(`${sucesso ? '✅' : '❌'} ${endpoint}: ${response.status}`);
                
                this.resultados.endpoints[endpoint] = {
                    status: response.status,
                    sucesso: sucesso,
                    data: sucesso ? response.data : null,
                    erro: !sucesso ? `HTTP ${response.status}` : null
                };
                
                if (!sucesso) {
                    this.resultados.problemas.push(`Endpoint ${endpoint} retorna ${response.status}`);
                }
                
            } catch (error) {
                console.log(`❌ ${endpoint}: ERRO - ${error.message}`);
                
                this.resultados.endpoints[endpoint] = {
                    status: 'ERROR',
                    sucesso: false,
                    erro: error.message
                };
                
                this.resultados.problemas.push(`Endpoint ${endpoint} inacessível: ${error.message}`);
            }
        }
    }

    async testeEndpointsCompletos() {
        console.log('\n📋 TESTE 7: SAMPLE ENDPOINTS COMPLETOS');
        console.log('=====================================');
        
        // Testar uma amostra dos 85+ endpoints
        const endpointsAmostra = [
            '/api/dados-tempo-real',
            '/api/trading/status',
            '/api/usuarios/perfil',
            '/api/exchanges/bybit/status',
            '/api/exchanges/binance/status',
            '/dashboard',
            '/api/signals/latest',
            '/api/balances/all',
            '/api/dominancia/btc',
            '/webhook/tradingview'
        ];
        
        let sucessos = 0;
        let falhas = 0;
        
        for (const endpoint of endpointsAmostra) {
            try {
                const response = await axios.get(`${this.baseUrl}${endpoint}`, {
                    timeout: 5000,
                    validateStatus: function (status) {
                        return status < 500;
                    }
                });
                
                if (response.status < 400) {
                    sucessos++;
                    console.log(`✅ ${endpoint}`);
                } else {
                    falhas++;
                    console.log(`❌ ${endpoint}: ${response.status}`);
                }
                
            } catch (error) {
                falhas++;
                console.log(`❌ ${endpoint}: ${error.message}`);
            }
            
            // Pequena pausa para não sobrecarregar
            await new Promise(resolve => setTimeout(resolve, 200));
        }
        
        console.log(`\n📊 Resultado amostra: ${sucessos}/${sucessos + falhas} endpoints funcionando`);
        
        this.resultados.amostraEndpoints = {
            total: sucessos + falhas,
            sucessos: sucessos,
            falhas: falhas,
            percentualSucesso: (sucessos / (sucessos + falhas)) * 100
        };
    }

    async analisarProblemas() {
        console.log('\n🔧 ANÁLISE DE PROBLEMAS');
        console.log('======================');
        
        // Análise automática dos problemas detectados
        if (this.resultados.problemas.length === 0) {
            console.log('✅ Nenhum problema detectado!');
            return;
        }
        
        console.log(`🚨 ${this.resultados.problemas.length} problema(s) detectado(s):`);
        
        this.resultados.problemas.forEach((problema, index) => {
            console.log(`${index + 1}. ${problema}`);
        });
        
        // Sugestões baseadas nos problemas
        console.log('\n💡 SUGESTÕES DE CORREÇÃO:');
        
        if (this.resultados.problemas.some(p => p.includes('IP'))) {
            console.log('🔒 Configurar IP fixo ou VPN com IP estático');
        }
        
        if (this.resultados.problemas.some(p => p.includes('404'))) {
            console.log('🔧 Verificar integração hybrid-server.js com app.js');
        }
        
        if (this.resultados.problemas.some(p => p.includes('timeout'))) {
            console.log('⚡ Verificar performance e timeout do Railway');
        }
        
        if (this.resultados.problemas.some(p => p.includes('região'))) {
            console.log('🌍 Usar VPN ou proxy de região permitida');
        }
    }

    gerarRelatorioFinal() {
        console.log('\n📋 RELATÓRIO FINAL');
        console.log('==================');
        
        console.log(`🌐 URL testada: ${this.baseUrl}`);
        console.log(`📍 IP atual: ${this.resultados.geolocalizacao?.ip || 'N/A'}`);
        console.log(`🌍 Localização: ${this.resultados.geolocalizacao?.pais || 'N/A'}`);
        console.log(`🔒 IP fixo: ${this.resultados.ipFixo?.ipFixo ? 'SIM' : 'NÃO'}`);
        console.log(`🚄 Railway: ${this.resultados.railway?.sucesso ? 'OK' : 'ERRO'}`);
        console.log(`🎯 Endpoints críticos: ${Object.values(this.resultados.endpoints).filter(e => e.sucesso).length}/${Object.keys(this.resultados.endpoints).length} funcionando`);
        
        if (this.resultados.amostraEndpoints) {
            console.log(`📊 Amostra completa: ${this.resultados.amostraEndpoints.percentualSucesso.toFixed(1)}% sucesso`);
        }
        
        console.log(`🚨 Problemas detectados: ${this.resultados.problemas.length}`);
        
        // Veredito final
        const problemasCriticos = this.resultados.problemas.filter(p => 
            p.includes('404') || p.includes('inacessível') || p.includes('Railway erro')
        ).length;
        
        if (problemasCriticos === 0) {
            console.log('\n🎉 DIAGNÓSTICO: Sistema funcionando normalmente!');
        } else if (problemasCriticos <= 2) {
            console.log('\n⚠️ DIAGNÓSTICO: Problemas menores detectados - correções simples');
        } else {
            console.log('\n🚨 DIAGNÓSTICO: Problemas graves - intervenção necessária');
        }
        
        // Salvar relatório
        const relatorio = {
            timestamp: new Date().toISOString(),
            url: this.baseUrl,
            resultados: this.resultados,
            diagnostico: problemasCriticos === 0 ? 'OK' : problemasCriticos <= 2 ? 'ATENCAO' : 'CRITICO'
        };
        
        console.log(`\n💾 Relatório salvo em: diagnostico-${Date.now()}.json`);
        require('fs').writeFileSync(`diagnostico-${Date.now()}.json`, JSON.stringify(relatorio, null, 2));
    }
}

// Executar diagnóstico
async function executarDiagnostico() {
    const diagnostico = new DiagnosticoCompleto();
    await diagnostico.executarTodosOsTestes();
}

// Executar se chamado diretamente
if (require.main === module) {
    executarDiagnostico().catch(error => {
        console.error('❌ Erro no diagnóstico:', error.message);
        process.exit(1);
    });
}

module.exports = { DiagnosticoCompleto, executarDiagnostico };
