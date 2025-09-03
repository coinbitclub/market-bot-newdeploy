/**
 * 🔄 VERIFICADOR DE STATUS PÓS-CORREÇÃO
 * 
 * Execute este script após implementar as correções
 * para verificar se os problemas foram resolvidos
 */

const axios = require('axios');

class VerificadorStatus {
    constructor() {
        this.ip = '131.0.31.147';
        this.problemas = [];
        this.sucessos = [];
    }

    async verificarIPExterno() {
        console.log('🌐 VERIFICANDO IP ATUAL...\n');
        
        try {
            const response = await axios.get('https://api.ipify.org?format=json');
            const ipAtual = response.data.ip;
            
            console.log(`🔢 IP Detectado: ${ipAtual}`);
            
            if (ipAtual === this.ip) {
                console.log('✅ IP está correto para whitelist');
                this.sucessos.push('IP correto');
            } else {
                console.log(`⚠️  IP mudou! Novo IP: ${ipAtual}`);
                console.log(`   Atualize o whitelist com: ${ipAtual}`);
                this.problemas.push(`IP mudou para ${ipAtual}`);
            }
            
        } catch (error) {
            console.log('❌ Erro ao verificar IP:', error.message);
        }
        
        console.log();
    }

    async testarConectividade() {
        console.log('🧪 TESTANDO CONECTIVIDADE LOCAL...\n');
        
        const endpoints = [
            'http://localhost:3000/api/health',
            'http://localhost:3000/webhook/tradingview'
        ];
        
        for (const endpoint of endpoints) {
            try {
                const response = await axios.get(endpoint, { timeout: 5000 });
                console.log(`✅ ${endpoint}: Status ${response.status}`);
                this.sucessos.push(`Local ${endpoint}`);
            } catch (error) {
                console.log(`❌ ${endpoint}: ${error.message}`);
                this.problemas.push(`Local ${endpoint} falhou`);
            }
        }
        
        console.log();
    }

    async simularTestesExchange() {
        console.log('📡 SIMULANDO TESTES DE EXCHANGE...\n');
        
        const testes = [
            {
                exchange: 'Bybit',
                usuario: '14 - Luiza Maria',
                problema: 'IP não autorizado',
                acao: 'Verificar whitelist do IP 131.0.31.147'
            },
            {
                exchange: 'Bybit',
                usuario: '15 - Paloma',
                problema: 'accountType is null',
                acao: 'Verificar se UNIFIED Account está ativo'
            },
            {
                exchange: 'Bybit',
                usuario: '16 - Erica',
                problema: 'accountType is null',
                acao: 'Verificar se UNIFIED Account está ativo'
            },
            {
                exchange: 'Binance',
                usuario: '16 - Erica',
                problema: 'API key inválida',
                acao: 'Verificar formato e permissões da API key'
            }
        ];
        
        testes.forEach((teste, i) => {
            console.log(`${i+1}. ${teste.exchange} - ${teste.usuario}`);
            console.log(`   📝 Problema: ${teste.problema}`);
            console.log(`   🔧 Ação: ${teste.acao}`);
            console.log();
        });
    }

    async gerarChecklist() {
        console.log('📋 CHECKLIST DE VERIFICAÇÃO:\n');
        console.log('='.repeat(50));
        
        const checklist = [
            {
                item: 'IP 131.0.31.147 adicionado no Bybit (Usuário 14)',
                status: '❓ VERIFICAR',
                urgencia: 'CRÍTICO'
            },
            {
                item: 'IP 131.0.31.147 adicionado no Binance (Usuário 16)',
                status: '❓ VERIFICAR',
                urgencia: 'CRÍTICO'
            },
            {
                item: 'UNIFIED Account ativo no Bybit (Usuário 15)',
                status: '❓ VERIFICAR',
                urgencia: 'ALTO'
            },
            {
                item: 'UNIFIED Account ativo no Bybit (Usuário 16)',
                status: '❓ VERIFICAR',
                urgencia: 'ALTO'
            },
            {
                item: 'API Key Binance válida (Usuário 16)',
                status: '❓ VERIFICAR',
                urgencia: 'ALTO'
            },
            {
                item: 'Sistema aguardou 10 minutos para propagação',
                status: '❓ VERIFICAR',
                urgencia: 'MÉDIO'
            }
        ];
        
        checklist.forEach((item, i) => {
            console.log(`${i+1}. ${item.status} ${item.item}`);
            console.log(`   🔥 Urgência: ${item.urgencia}\n`);
        });
    }

    async monitorarLogs() {
        console.log('📊 SINAIS DE SUCESSO NOS LOGS:\n');
        
        const sinaisSucesso = [
            '✅ Bybit V5 - Conexão estabelecida',
            '✅ Saldos coletados com sucesso',
            '✅ Dados salvos no banco sem erro de constraint',
            '✅ Fear & Greed Index atualizado',
            '📈 Coleta automática funcionando'
        ];
        
        const sinaisProblema = [
            '❌ Unmatched IP',
            '❌ accountType is null',
            '❌ Invalid API-key',
            '❌ duplicate key value violates',
            '❌ Request failed with status code'
        ];
        
        console.log('🟢 PROCURE POR:');
        sinaisSucesso.forEach(sinal => console.log(`   ${sinal}`));
        
        console.log('\n🔴 SE AINDA APARECER:');
        sinaisProblema.forEach(sinal => console.log(`   ${sinal}`));
        
        console.log('\n💡 DICA: Se ainda há erros, aguarde mais 5-10 minutos para propagação completa.');
    }

    async executarVerificacao() {
        console.log('🔍 VERIFICAÇÃO PÓS-CORREÇÃO INICIADA\n');
        console.log('Data:', new Date().toLocaleString());
        console.log('='.repeat(60) + '\n');

        await this.verificarIPExterno();
        await this.testarConectividade();
        await this.simularTestesExchange();
        await this.gerarChecklist();
        await this.monitorarLogs();

        console.log('\n📈 RESUMO:');
        console.log(`✅ Sucessos: ${this.sucessos.length}`);
        console.log(`❌ Problemas: ${this.problemas.length}`);
        
        if (this.problemas.length === 0) {
            console.log('\n🎉 SISTEMA PRONTO PARA TESTES!');
            console.log('💡 Aguarde os próximos logs do sistema para confirmar.');
        } else {
            console.log('\n⚠️  AINDA HÁ PROBLEMAS A RESOLVER:');
            this.problemas.forEach(p => console.log(`   • ${p}`));
        }

        console.log('\n🏁 VERIFICAÇÃO CONCLUÍDA!');
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    const verificador = new VerificadorStatus();
    verificador.executarVerificacao()
        .then(() => {
            console.log('\n✅ Verificação finalizada!');
            process.exit(0);
        })
        .catch(error => {
            console.error('💥 Erro na verificação:', error.message);
            process.exit(1);
        });
}

module.exports = VerificadorStatus;
