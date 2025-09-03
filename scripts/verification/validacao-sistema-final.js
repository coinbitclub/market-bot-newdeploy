/**
 * 🧪 VALIDADOR COMPLETO - TODOS OS ENDPOINTS E SISTEMAS
 * 
 * Testa:
 * 1. Conectividade do banco
 * 2. Todos os endpoints críticos
 * 3. Sistema de leitura do mercado
 * 4. AI Analysis
 * 5. Orquestrador
 * 6. Integração completa
 */

const { createRobustPool, safeQuery } = require('./fixed-database-config.js');
const axios = require('axios');

class ValidadorCompleto {
    constructor() {
        this.pool = createRobustPool();
        this.baseUrl = 'https://coinbitclub-market-bot.up.railway.app';
        this.localUrl = 'http://localhost:3000';
        this.resultados = {
            banco: false,
            endpoints: {},
            sistema_leitura: false,
            ai_analysis: false,
            orquestrador: false,
            integracao: false
        };
    }

    async executarValidacaoCompleta() {
        console.log('🧪 INICIANDO VALIDAÇÃO COMPLETA DO SISTEMA\n');
        
        try {
            // 1. Testar banco de dados
            await this.testarBanco();
            
            // 2. Testar endpoints críticos
            await this.testarEndpoints();
            
            // 3. Testar sistema de leitura
            await this.testarSistemaLeitura();
            
            // 4. Testar AI Analysis
            await this.testarAIAnalysis();
            
            // 5. Testar orquestrador
            await this.testarOrquestrador();
            
            // 6. Testar integração
            await this.testarIntegracao();
            
            // 7. Gerar relatório final
            this.gerarRelatorioFinal();
            
        } catch (error) {
            console.error('❌ Erro na validação:', error.message);
        } finally {
            await this.pool.end();
        }
    }

    async testarBanco() {
        console.log('1️⃣ TESTANDO BANCO DE DADOS...');
        
        try {
            const conexao = await safeQuery(this.pool, 'SELECT NOW() as current_time, version() as pg_version');
            
            if (conexao.rows.length > 0) {
                console.log('✅ Banco: Conectado');
                console.log(`   ⏰ Hora servidor: ${conexao.rows[0].current_time}`);
                console.log(`   🐘 PostgreSQL: ${conexao.rows[0].pg_version.split(' ')[0]}`);
                this.resultados.banco = true;
            } else {
                console.log('❌ Banco: Falha na conexão');
            }
            
            // Testar tabelas críticas
            const tabelas = ['sistema_leitura_mercado', 'fear_greed_index', 'ai_analysis'];
            
            for (const tabela of tabelas) {
                const existe = await safeQuery(this.pool, `
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_schema = 'public' 
                        AND table_name = '${tabela}'
                    ) as exists
                `);
                
                const status = existe.rows[0]?.exists ? '✅' : '❌';
                console.log(`   ${status} Tabela ${tabela}`);
            }
            
        } catch (error) {
            console.log('❌ Banco: Erro -', error.message);
        }
        
        console.log('');
    }

    async testarEndpoints() {
        console.log('2️⃣ TESTANDO ENDPOINTS CRÍTICOS...');
        
        const endpointsCriticos = [
            '/health',
            '/api/dashboard/users',
            '/api/dashboard/ai-analysis',
            '/api/orquestrador/status',
            '/api/dashboard/admin-logs'
        ];
        
        for (const endpoint of endpointsCriticos) {
            try {
                const response = await axios.get(`${this.baseUrl}${endpoint}`, {
                    timeout: 10000
                });
                
                if (response.status === 200) {
                    console.log(`   ✅ ${endpoint}: OK (${response.status})`);
                    this.resultados.endpoints[endpoint] = true;
                } else {
                    console.log(`   ⚠️ ${endpoint}: Status ${response.status}`);
                    this.resultados.endpoints[endpoint] = false;
                }
                
            } catch (error) {
                console.log(`   ❌ ${endpoint}: ${error.message}`);
                this.resultados.endpoints[endpoint] = false;
            }
        }
        
        console.log('');
    }

    async testarSistemaLeitura() {
        console.log('3️⃣ TESTANDO SISTEMA DE LEITURA DO MERCADO...');
        
        try {
            const dados = await safeQuery(this.pool, `
                SELECT 
                    COUNT(*) as total,
                    MAX(timestamp) as ultimo_registro,
                    MAX(fear_greed_value) as ultimo_fg,
                    MAX(final_recommendation) as recomendacao
                FROM sistema_leitura_mercado 
                WHERE timestamp >= NOW() - INTERVAL '24 hours'
            `);
            
            const total = parseInt(dados.rows[0]?.total) || 0;
            const ultimoRegistro = dados.rows[0]?.ultimo_registro;
            
            if (total > 0) {
                console.log('✅ Sistema de Leitura: ATIVO');
                console.log(`   📊 Registros 24h: ${total}`);
                console.log(`   ⏰ Último: ${ultimoRegistro}`);
                console.log(`   😨 F&G: ${dados.rows[0]?.ultimo_fg}`);
                console.log(`   🎯 Recomendação: ${dados.rows[0]?.recomendacao}`);
                
                // Verificar se está atualizando recentemente (< 20 min)
                const minutosAtras = ultimoRegistro 
                    ? Math.floor((new Date() - new Date(ultimoRegistro)) / 1000 / 60)
                    : 999;
                
                if (minutosAtras < 20) {
                    console.log(`   🟢 Status: ATIVO (última atualização há ${minutosAtras} min)`);
                    this.resultados.sistema_leitura = true;
                } else {
                    console.log(`   🟡 Status: INATIVO (última atualização há ${minutosAtras} min)`);
                }
                
            } else {
                console.log('❌ Sistema de Leitura: SEM DADOS');
            }
            
        } catch (error) {
            console.log('❌ Sistema de Leitura: Erro -', error.message);
        }
        
        console.log('');
    }

    async testarAIAnalysis() {
        console.log('4️⃣ TESTANDO AI ANALYSIS...');
        
        try {
            // Testar endpoint
            const response = await axios.get(`${this.baseUrl}/api/dashboard/ai-analysis`, {
                timeout: 10000
            });
            
            if (response.status === 200 && response.data.success) {
                console.log('✅ AI Analysis Endpoint: FUNCIONANDO');
                
                const data = response.data.data;
                console.log(`   🤖 Status: ${data.status}`);
                console.log(`   📊 Análises hoje: ${data.total_analises}`);
                console.log(`   😨 Fear & Greed: ${data.fear_greed?.value}`);
                console.log(`   🎯 Direção: ${data.fear_greed?.direction}`);
                console.log(`   🏢 Decisão: ${data.fear_greed?.decision}`);
                console.log(`   📡 Fonte: ${data.data_source || 'N/A'}`);
                
                this.resultados.ai_analysis = true;
            } else {
                console.log('❌ AI Analysis: Resposta inválida');
            }
            
        } catch (error) {
            console.log('❌ AI Analysis: Erro -', error.message);
        }
        
        console.log('');
    }

    async testarOrquestrador() {
        console.log('5️⃣ TESTANDO ORQUESTRADOR...');
        
        try {
            // Testar endpoint do orquestrador
            const response = await axios.get(`${this.baseUrl}/api/orquestrador/status`, {
                timeout: 10000
            });
            
            if (response.status === 200 && response.data.success) {
                console.log('✅ Orquestrador Endpoint: FUNCIONANDO');
                
                const data = response.data.data;
                console.log(`   🎯 Status: ${data.sistema_integrado?.status}`);
                console.log(`   📊 Registros 24h: ${data.sistema_integrado?.registros_24h}`);
                console.log(`   ⏰ Última atualização: ${data.sistema_integrado?.ultima_atualizacao || 'N/A'}`);
                console.log(`   ⏳ Minutos desde: ${data.sistema_integrado?.minutos_desde_atualizacao || 'N/A'}`);
                
                this.resultados.orquestrador = true;
            } else {
                console.log('❌ Orquestrador: Resposta inválida');
            }
            
        } catch (error) {
            console.log('❌ Orquestrador: Erro -', error.message);
        }
        
        console.log('');
    }

    async testarIntegracao() {
        console.log('6️⃣ TESTANDO INTEGRAÇÃO COMPLETA...');
        
        try {
            // Verificar se dados do sistema de leitura estão chegando ao AI Analysis
            const sistemaData = await safeQuery(this.pool, `
                SELECT fear_greed_value, final_recommendation, timestamp
                FROM sistema_leitura_mercado 
                ORDER BY timestamp DESC 
                LIMIT 1
            `);
            
            const fearGreedData = await safeQuery(this.pool, `
                SELECT value, classification, created_at
                FROM fear_greed_index 
                ORDER BY created_at DESC 
                LIMIT 1
            `);
            
            if (sistemaData.rows.length > 0 && fearGreedData.rows.length > 0) {
                const sistema = sistemaData.rows[0];
                const fearGreed = fearGreedData.rows[0];
                
                console.log('✅ Integração: DADOS PRESENTES');
                console.log(`   📈 Sistema Leitura F&G: ${sistema.fear_greed_value} (${sistema.timestamp})`);
                console.log(`   📉 Fear Greed Index: ${fearGreed.value} (${fearGreed.created_at})`);
                
                // Verificar se estão sincronizados (diferença < 30 min)
                const diffMinutos = Math.abs(new Date(sistema.timestamp) - new Date(fearGreed.created_at)) / 1000 / 60;
                
                if (diffMinutos < 30) {
                    console.log(`   🔄 Sincronização: OK (diferença ${Math.floor(diffMinutos)} min)`);
                    this.resultados.integracao = true;
                } else {
                    console.log(`   ⚠️ Sincronização: DEFASADA (diferença ${Math.floor(diffMinutos)} min)`);
                }
                
            } else {
                console.log('❌ Integração: DADOS AUSENTES');
            }
            
        } catch (error) {
            console.log('❌ Integração: Erro -', error.message);
        }
        
        console.log('');
    }

    gerarRelatorioFinal() {
        console.log('📋 RELATÓRIO FINAL DA VALIDAÇÃO');
        console.log('=====================================\n');
        
        const componentes = [
            { nome: 'Banco de Dados', status: this.resultados.banco },
            { nome: 'Sistema de Leitura', status: this.resultados.sistema_leitura },
            { nome: 'AI Analysis', status: this.resultados.ai_analysis },
            { nome: 'Orquestrador', status: this.resultados.orquestrador },
            { nome: 'Integração', status: this.resultados.integracao }
        ];
        
        let componentesOk = 0;
        
        componentes.forEach(comp => {
            const icon = comp.status ? '✅' : '❌';
            console.log(`${icon} ${comp.nome}: ${comp.status ? 'OK' : 'FALHA'}`);
            if (comp.status) componentesOk++;
        });
        
        // Endpoints
        const endpointsOk = Object.values(this.resultados.endpoints).filter(Boolean).length;
        const totalEndpoints = Object.keys(this.resultados.endpoints).length;
        
        console.log(`\n📡 Endpoints: ${endpointsOk}/${totalEndpoints} funcionando`);
        
        // Status geral
        const percentualSucesso = Math.floor(((componentesOk / componentes.length) * 100));
        
        console.log(`\n🎯 RESULTADO GERAL: ${percentualSucesso}% dos sistemas funcionando`);
        
        if (percentualSucesso >= 80) {
            console.log('✅ SISTEMA PRONTO PARA PRODUÇÃO!');
        } else if (percentualSucesso >= 60) {
            console.log('⚠️ SISTEMA PARCIALMENTE FUNCIONAL - Revisar falhas');
        } else {
            console.log('❌ SISTEMA COM PROBLEMAS CRÍTICOS - Intervenção necessária');
        }
        
        console.log('\n🔄 AÇÕES RECOMENDADAS:');
        if (!this.resultados.sistema_leitura) {
            console.log('   • Iniciar: node inicializador-sistema-integrado.js');
        }
        if (!this.resultados.orquestrador) {
            console.log('   • Verificar orquestrador no servidor');
        }
        if (!this.resultados.integracao) {
            console.log('   • Executar: node corrigir-integracao-ia.js');
        }
        
        console.log('\n📊 Monitoramento contínuo disponível em:');
        console.log(`   • ${this.baseUrl}/api/orquestrador/status`);
        console.log(`   • ${this.baseUrl}/api/dashboard/ai-analysis`);
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    const validador = new ValidadorCompleto();
    validador.executarValidacaoCompleta();
}

module.exports = ValidadorCompleto;
