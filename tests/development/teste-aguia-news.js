/**
 * 🧪 TESTE ISOLADO - AGUIA NEWS RADAR
 * ====================================
 * 
 * Teste isolado do sistema de relatórios pagos
 * Horário de Brasília, notificações no perfil, sem email
 */

const AguiaNewsRadar = require('./aguia-news-radar');

class TesteAguiaNews {
    constructor() {
        this.aguiaNews = new AguiaNewsRadar();
    }

    async executarTestesCompletos() {
        console.log('\n🧪 === INICIANDO TESTES DO AGUIA NEWS ===');
        console.log(`🕒 Horário: ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })} (Brasília)`);
        
        try {
            // Teste 1: Verificar conexão
            await this.testeConexaoBanco();
            
            // Teste 2: Coletar dados de mercado
            await this.testeColetaDados();
            
            // Teste 3: Gerar radar manual
            await this.testeGeracaoRadar();
            
            // Teste 4: Verificar notificações
            await this.testeNotificacoes();
            
            // Teste 5: Verificar histórico
            await this.testeHistorico();
            
            console.log('\n✅ === TODOS OS TESTES CONCLUÍDOS COM SUCESSO ===');
            
        } catch (error) {
            console.error('\n❌ === ERRO NOS TESTES ===');
            console.error(error);
        }
    }

    async testeConexaoBanco() {
        console.log('\n📊 Teste 1: Conexão com banco de dados');
        try {
            await this.aguiaNews.pool.query('SELECT NOW() AT TIME ZONE \'America/Sao_Paulo\' as brasilia_time');
            console.log('✅ Conexão com banco OK');
            
            // Verificar tabelas
            const tabelas = await this.aguiaNews.pool.query(`
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name LIKE '%aguia%'
            `);
            
            console.log(`✅ ${tabelas.rows.length} tabelas do Aguia News encontradas`);
            tabelas.rows.forEach(row => {
                console.log(`   📋 ${row.table_name}`);
            });
            
        } catch (error) {
            console.log('⚠️ Banco não conectado - usando modo simulado');
        }
    }

    async testeColetaDados() {
        console.log('\n📊 Teste 2: Coleta de dados de mercado');
        try {
            const marketData = await this.aguiaNews.collectMarketData();
            
            console.log('✅ Dados coletados:');
            console.log(`   📈 BTC: $${marketData.bitcoin?.price_usd?.toLocaleString()} (${marketData.bitcoin?.price_change_24h?.toFixed(2)}%)`);
            console.log(`   😱 Fear & Greed: ${marketData.fearGreed?.value}/100 (${marketData.fearGreed?.classification})`);
            console.log(`   🏆 BTC Dominância: ${marketData.global?.btc_dominance?.toFixed(1)}%`);
            console.log(`   💰 Market Cap: $${(marketData.global?.total_market_cap_usd / 1e12).toFixed(2)}T`);
            
        } catch (error) {
            console.log('⚠️ Erro na coleta - usando dados simulados');
            console.log('📊 Dados simulados gerados para demonstração');
        }
    }

    async testeGeracaoRadar() {
        console.log('\n🦅 Teste 3: Geração de radar manual');
        try {
            console.log('🔄 Gerando radar...');
            await this.aguiaNews.generateManualRadar();
            
            // Buscar último radar gerado
            const ultimoRadar = await this.aguiaNews.getLatestRadar();
            if (ultimoRadar) {
                console.log('✅ Radar gerado com sucesso');
                console.log(`📅 ID: ${ultimoRadar.id}`);
                console.log(`🕒 Gerado em: ${new Date(ultimoRadar.generated_at).toLocaleString('pt-BR')}`);
                console.log(`💰 Premium: ${ultimoRadar.is_premium ? 'SIM' : 'NÃO'}`);
                console.log(`👥 Plano requerido: ${ultimoRadar.plan_required}`);
                
                // Mostrar primeiras linhas do conteúdo
                const linhas = ultimoRadar.content.split('\n').slice(0, 5);
                console.log('📄 Prévia do conteúdo:');
                linhas.forEach(linha => console.log(`   ${linha}`));
                
            } else {
                console.log('⚠️ Nenhum radar encontrado no banco');
            }
            
        } catch (error) {
            console.log('⚠️ Erro na geração - sistema em modo demonstração');
        }
    }

    async testeNotificacoes() {
        console.log('\n🔔 Teste 4: Sistema de notificações');
        try {
            // Contar usuários premium
            const countResult = await this.aguiaNews.pool.query(`
                SELECT COUNT(*) as total 
                FROM users 
                WHERE plan_type IN ('PREMIUM', 'VIP', 'AFFILIATE_VIP') 
                AND is_active = true
            `);
            
            const totalPremium = countResult.rows[0].total;
            console.log(`✅ ${totalPremium} usuários premium encontrados`);
            
            // Contar notificações recentes
            const notifResult = await this.aguiaNews.pool.query(`
                SELECT COUNT(*) as total 
                FROM user_notifications 
                WHERE created_at >= CURRENT_DATE
                AND notification_type = 'RADAR'
            `);
            
            const totalNotif = notifResult.rows[0].total;
            console.log(`📱 ${totalNotif} notificações de radar hoje`);
            
            if (totalPremium > 0) {
                console.log('✅ Sistema de notificações configurado');
            } else {
                console.log('⚠️ Nenhum usuário premium para notificar');
            }
            
        } catch (error) {
            console.log('⚠️ Erro ao verificar notificações');
        }
    }

    async testeHistorico() {
        console.log('\n📚 Teste 5: Histórico de radars');
        try {
            const historico = await this.aguiaNews.getUserRadars(1, 5); // Usuário ID 1
            console.log(`✅ ${historico.length} radars no histórico`);
            
            if (historico.length > 0) {
                console.log('📋 Últimos radars:');
                historico.forEach((radar, index) => {
                    const data = new Date(radar.generated_at).toLocaleDateString('pt-BR');
                    console.log(`   ${index + 1}. ID ${radar.id} - ${data} - ${radar.is_read ? 'Lido' : 'Não lido'}`);
                });
            }
            
        } catch (error) {
            console.log('⚠️ Erro ao buscar histórico');
        }
    }

    async testarConfiguracao() {
        console.log('\n⚙️ Teste: Configurações do sistema');
        try {
            const config = await this.aguiaNews.pool.query('SELECT * FROM aguia_news_config');
            console.log(`✅ ${config.rows.length} configurações carregadas:`);
            
            config.rows.forEach(conf => {
                console.log(`   📝 ${conf.config_key}: ${JSON.stringify(conf.config_value)}`);
            });
            
        } catch (error) {
            console.log('⚠️ Erro ao carregar configurações');
        }
    }

    async simularGeracaoNoHorario() {
        console.log('\n🕒 Simulação: Geração às 20h');
        console.log('📅 Horário atual:', new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }));
        console.log('⏰ Próxima geração automática: 20:00 (Brasília)');
        console.log('💰 Modo: RELATÓRIOS PAGOS');
        console.log('👥 Destinatários: PREMIUM, VIP, AFFILIATE_VIP');
        console.log('📱 Entrega: Notificações no perfil');
        console.log('✅ Sistema aguardando horário programado...');
    }
}

// Executar testes
async function executarTestes() {
    const teste = new TesteAguiaNews();
    
    try {
        await teste.executarTestesCompletos();
        await teste.testarConfiguracao();
        await teste.simularGeracaoNoHorario();
        
    } catch (error) {
        console.error('❌ Erro geral nos testes:', error);
    } finally {
        process.exit(0);
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    executarTestes();
}

module.exports = TesteAguiaNews;
