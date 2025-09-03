#!/usr/bin/env node

/**
 * 🌐 TESTE DE IP FIXO - NGROK IMPLEMENTATION
 * Verifica se o sistema de IP fixo está funcionando corretamente
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

class IPFixoTester {
    constructor() {
        this.results = {
            ngrokInstalled: false,
            ngrokAuth: false,
            tunnelCreated: false,
            publicURL: null,
            exchangeAccess: {},
            systemStatus: 'unknown'
        };
    }

    async runAllTests() {
        console.log('🧪 INICIANDO TESTES DE IP FIXO');
        console.log('================================');
        console.log('');

        try {
            // Teste 1: Verificar instalação do Ngrok
            await this.testNgrokInstallation();
            
            // Teste 2: Verificar autenticação
            await this.testNgrokAuth();
            
            // Teste 3: Criar túnel de teste
            await this.testCreateTunnel();
            
            // Teste 4: Testar acesso às exchanges
            if (this.results.publicURL) {
                await this.testExchangeAccess();
            }
            
            // Teste 5: Verificar status do sistema
            await this.testSystemStatus();
            
            // Relatório final
            this.generateReport();
            
        } catch (error) {
            console.error('💥 Erro durante os testes:', error.message);
            this.results.systemStatus = 'error';
        }
    }

    async testNgrokInstallation() {
        console.log('🔍 Teste 1: Verificando instalação do Ngrok...');
        
        try {
            const { stdout } = await execAsync('ngrok version');
            console.log('✅ Ngrok instalado:', stdout.trim());
            this.results.ngrokInstalled = true;
        } catch (error) {
            console.log('❌ Ngrok não instalado ou não encontrado no PATH');
            this.results.ngrokInstalled = false;
            
            console.log('💡 Para instalar o Ngrok:');
            console.log('   1. Baixe de: https://ngrok.com/download');
            console.log('   2. Extraia para uma pasta no PATH');
            console.log('   3. Configure com: ngrok authtoken <seu-token>');
        }
        console.log('');
    }

    async testNgrokAuth() {
        console.log('🔐 Teste 2: Verificando autenticação...');
        
        if (!this.results.ngrokInstalled) {
            console.log('⏭️ Pulando - Ngrok não instalado');
            console.log('');
            return;
        }

        try {
            // Verificar se existe arquivo de configuração
            const homeDir = process.env.HOME || process.env.USERPROFILE;
            const configPath = path.join(homeDir, '.ngrok2', 'ngrok.yml');
            
            await fs.access(configPath);
            console.log('✅ Arquivo de configuração encontrado');
            this.results.ngrokAuth = true;
        } catch (error) {
            console.log('❌ Configuração não encontrada');
            console.log('💡 Configure com: ngrok authtoken <seu-token>');
            this.results.ngrokAuth = false;
        }
        console.log('');
    }

    async testCreateTunnel() {
        console.log('🌐 Teste 3: Criando túnel de teste...');
        
        if (!this.results.ngrokInstalled || !this.results.ngrokAuth) {
            console.log('⏭️ Pulando - Requisitos não atendidos');
            console.log('');
            return;
        }

        try {
            // Iniciar túnel para porta 3000 (porta padrão do sistema)
            console.log('🔄 Criando túnel HTTP para porta 3000...');
            
            const tunnelProcess = exec('ngrok http 3000 --log=stdout');
            
            // Aguardar alguns segundos para o túnel ser estabelecido
            await new Promise(resolve => setTimeout(resolve, 5000));
            
            // Tentar obter URL pública via API do Ngrok
            try {
                const response = await axios.get('http://localhost:4040/api/tunnels');
                const tunnels = response.data.tunnels;
                
                if (tunnels && tunnels.length > 0) {
                    this.results.publicURL = tunnels[0].public_url;
                    console.log('✅ Túnel criado com sucesso!');
                    console.log(`🌐 URL pública: ${this.results.publicURL}`);
                    this.results.tunnelCreated = true;
                } else {
                    console.log('❌ Nenhum túnel ativo encontrado');
                }
            } catch (apiError) {
                console.log('⚠️ Não foi possível obter URL via API');
                console.log('💡 Verifique se o Ngrok está rodando em http://localhost:4040');
            }
            
            // Matar processo do ngrok
            tunnelProcess.kill();
            
        } catch (error) {
            console.log('❌ Erro ao criar túnel:', error.message);
            this.results.tunnelCreated = false;
        }
        console.log('');
    }

    async testExchangeAccess() {
        console.log('💰 Teste 4: Testando acesso às exchanges...');
        
        const exchanges = [
            { name: 'Binance', url: 'https://api.binance.com/api/v3/ping' },
            { name: 'Bybit', url: 'https://api.bybit.com/v2/public/time' },
            { name: 'KuCoin', url: 'https://api.kucoin.com/api/v1/timestamp' }
        ];

        for (const exchange of exchanges) {
            try {
                console.log(`🔄 Testando ${exchange.name}...`);
                
                const response = await axios.get(exchange.url, {
                    timeout: 10000,
                    headers: {
                        'User-Agent': 'CoinBitClub-Bot/1.0'
                    }
                });
                
                if (response.status === 200) {
                    console.log(`✅ ${exchange.name}: Acesso OK`);
                    this.results.exchangeAccess[exchange.name] = 'success';
                } else {
                    console.log(`⚠️ ${exchange.name}: Status ${response.status}`);
                    this.results.exchangeAccess[exchange.name] = 'warning';
                }
                
            } catch (error) {
                if (error.response?.status === 403) {
                    console.log(`🚫 ${exchange.name}: Bloqueado geograficamente (403)`);
                    this.results.exchangeAccess[exchange.name] = 'blocked';
                } else {
                    console.log(`❌ ${exchange.name}: Erro - ${error.message}`);
                    this.results.exchangeAccess[exchange.name] = 'error';
                }
            }
        }
        console.log('');
    }

    async testSystemStatus() {
        console.log('🎯 Teste 5: Verificando status do sistema...');
        
        try {
            // Verificar se o arquivo de info do Ngrok existe
            const ngrokInfoPath = path.join(process.cwd(), 'ngrok-info.json');
            
            try {
                const ngrokInfo = JSON.parse(await fs.readFile(ngrokInfoPath, 'utf8'));
                console.log('✅ Arquivo ngrok-info.json encontrado');
                console.log(`📍 IP público: ${ngrokInfo.public_url}`);
                console.log(`🕐 Última atualização: ${ngrokInfo.last_update}`);
                this.results.systemStatus = 'configured';
            } catch (error) {
                console.log('⚠️ Arquivo ngrok-info.json não encontrado');
                console.log('💡 Sistema ainda não foi inicializado com IP fixo');
                this.results.systemStatus = 'not_configured';
            }
            
            // Verificar se os arquivos de integração existem
            const integrationFiles = [
                'ngrok-monitor.js',
                'railway-ngrok-integration.js',
                'implementar-ip-fixo-ngrok.sh'
            ];
            
            let filesFound = 0;
            for (const file of integrationFiles) {
                try {
                    await fs.access(path.join(process.cwd(), file));
                    filesFound++;
                } catch (error) {
                    // Arquivo não encontrado
                }
            }
            
            console.log(`📁 Arquivos de integração: ${filesFound}/${integrationFiles.length}`);
            
        } catch (error) {
            console.log('❌ Erro ao verificar status:', error.message);
            this.results.systemStatus = 'error';
        }
        console.log('');
    }

    generateReport() {
        console.log('📊 RELATÓRIO FINAL DE IP FIXO');
        console.log('=============================');
        console.log('');
        
        console.log('🔍 RESULTADOS DOS TESTES:');
        console.log(`   • Ngrok Instalado: ${this.results.ngrokInstalled ? '✅' : '❌'}`);
        console.log(`   • Ngrok Autenticado: ${this.results.ngrokAuth ? '✅' : '❌'}`);
        console.log(`   • Túnel Criado: ${this.results.tunnelCreated ? '✅' : '❌'}`);
        console.log(`   • Sistema Configurado: ${this.getSystemStatusIcon()}`);
        
        if (this.results.publicURL) {
            console.log(`   • URL Pública: ${this.results.publicURL}`);
        }
        
        console.log('');
        console.log('💰 ACESSO ÀS EXCHANGES:');
        for (const [exchange, status] of Object.entries(this.results.exchangeAccess)) {
            const icon = this.getExchangeStatusIcon(status);
            console.log(`   • ${exchange}: ${icon} ${status}`);
        }
        
        console.log('');
        console.log('🎯 PRÓXIMOS PASSOS:');
        
        if (!this.results.ngrokInstalled) {
            console.log('   1. ⬇️ Instalar Ngrok: https://ngrok.com/download');
        }
        
        if (!this.results.ngrokAuth) {
            console.log('   2. 🔐 Configurar token: ngrok authtoken <token>');
        }
        
        if (this.results.ngrokInstalled && this.results.ngrokAuth) {
            console.log('   3. 🚀 Executar deploy: npm run start:ip-fixo');
            console.log('   4. 🔄 Monitorar logs para confirmar funcionamento');
        }
        
        const blockedExchanges = Object.entries(this.results.exchangeAccess)
            .filter(([_, status]) => status === 'blocked')
            .map(([name, _]) => name);
            
        if (blockedExchanges.length > 0) {
            console.log('   5. 🌐 IP fixo necessário para acessar:', blockedExchanges.join(', '));
        }
        
        console.log('');
        console.log('📞 SUPORTE:');
        console.log('   • Documentação Ngrok: https://ngrok.com/docs');
        console.log('   • Status do sistema: npm run status');
        console.log('   • Logs em tempo real: npm run logs');
        console.log('');
    }

    getSystemStatusIcon() {
        switch (this.results.systemStatus) {
            case 'configured': return '✅ Configurado';
            case 'not_configured': return '⚠️ Não configurado';
            case 'error': return '❌ Erro';
            default: return '❓ Desconhecido';
        }
    }

    getExchangeStatusIcon(status) {
        switch (status) {
            case 'success': return '✅';
            case 'blocked': return '🚫';
            case 'warning': return '⚠️';
            case 'error': return '❌';
            default: return '❓';
        }
    }
}

// Executar testes se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
    const tester = new IPFixoTester();
    await tester.runAllTests();
}

export default IPFixoTester;
