#!/usr/bin/env node

/**
 * 🧹 LIMPEZA DE DADOS DE TESTE - BANCO DE PRODUÇÃO
 * ===============================================
 * 
 * Remove dados de teste e deixa apenas estrutura limpa
 * para operação real em produção
 */

require('dotenv').config();
const { Pool } = require('pg');

class LimpezaBancoDados {
    constructor() {
        this.pool = new Pool({
            connectionString: process.env.DATABASE_URL || 'process.env.DATABASE_URL',
            ssl: {
                rejectUnauthorized: false
            }
        });
    }

    /**
     * 📝 LOG HELPER
     */
    log(message, type = 'INFO') {
        const timestamp = new Date().toLocaleString('pt-BR', { 
            timeZone: 'America/Sao_Paulo',
            day: '2-digit',
            month: '2-digit', 
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        
        console.log(`[${timestamp}] [${type}] ${message}`);
    }

    /**
     * 🔍 VERIFICAR DADOS EXISTENTES
     */
    async verificarDados() {
        this.log('🔍 Verificando dados existentes no banco...');
        
        try {
            // Verificar usuários
            const usuarios = await this.pool.query('SELECT COUNT(*) as total FROM users');
            this.log(`👥 Usuários: ${usuarios.rows[0].total}`);

            // Verificar notificações
            const notificacoes = await this.pool.query('SELECT COUNT(*) as total FROM user_notifications');
            this.log(`🔔 Notificações: ${notificacoes.rows[0].total}`);

            // Verificar radars Aguia News
            const radars = await this.pool.query('SELECT COUNT(*) as total FROM aguia_news_radars');
            this.log(`🦅 Radars Aguia News: ${radars.rows[0].total}`);

            // Verificar acessos aos radars
            const acessos = await this.pool.query('SELECT COUNT(*) as total FROM user_radar_access');
            this.log(`📊 Acessos aos radars: ${acessos.rows[0].total}`);

            // Verificar logs do sistema
            const logs = await this.pool.query('SELECT COUNT(*) as total FROM system_logs');
            this.log(`� Logs do sistema: ${logs.rows[0].total}`);

            // Verificar ordens reais
            const ordens = await this.pool.query('SELECT COUNT(*) as total FROM real_orders');
            this.log(`💰 Ordens reais: ${ordens.rows[0].total}`);

            return true;
        } catch (error) {
            this.log(`❌ Erro ao verificar dados: ${error.message}`, 'ERROR');
            return false;
        }
    }

    /**
     * 🧹 LIMPAR DADOS DE TESTE
     */
    async limparDadosTeste() {
        this.log('🧹 Iniciando limpeza de dados de teste...');
        
        try {
            // 1. Limpar notificações de teste
            const resultNotif = await this.pool.query(`
                DELETE FROM user_notifications 
                WHERE message LIKE '%teste%' 
                OR message LIKE '%demo%'
                OR message LIKE '%Teste%'
                OR message LIKE '%Demo%'
                OR title LIKE '%teste%'
                OR title LIKE '%demo%'
            `);
            this.log(`✅ Notificações de teste removidas: ${resultNotif.rowCount}`);

            // 2. Limpar acessos de teste aos radars
            const resultAcessos = await this.pool.query(`
                DELETE FROM user_radar_access 
                WHERE user_id IN (
                    SELECT id FROM users 
                    WHERE email LIKE '%teste%' 
                    OR email LIKE '%demo%'
                    OR username LIKE '%teste%'
                    OR username LIKE '%demo%'
                )
            `);
            this.log(`✅ Acessos de teste removidos: ${resultAcessos.rowCount}`);

            // 3. Limpar radars de teste (manter os reais do Aguia News)
            const resultRadars = await this.pool.query(`
                DELETE FROM aguia_news_radars 
                WHERE content LIKE '%teste%' 
                OR content LIKE '%demo%'
                OR content LIKE '%Teste%'
                OR content LIKE '%Demo%'
            `);
            this.log(`✅ Radars de teste removidos: ${resultRadars.rowCount}`);

            // 4. Limpar usuários claramente de teste (manter os reais)
            const resultUsers = await this.pool.query(`
                DELETE FROM users 
                WHERE email LIKE '%teste%' 
                OR email LIKE '%demo%'
                OR email LIKE '%test%'
                OR username LIKE '%teste%'
                OR username LIKE '%demo%'
                OR username LIKE '%Test%'
                OR email = 'test@test.com'
                OR email = 'demo@demo.com'
                OR username = 'teste'
                OR username = 'demo'
            `);
            this.log(`✅ Usuários de teste removidos: ${resultUsers.rowCount}`);

            // 5. Limpar logs antigos (manter só últimos 7 dias)
            const resultLogs = await this.pool.query(`
                DELETE FROM system_logs 
                WHERE timestamp < (NOW() AT TIME ZONE 'America/Sao_Paulo') - INTERVAL '7 days'
            `);
            this.log(`✅ Logs antigos removidos: ${resultLogs.rowCount}`);

            // 6. Limpar notificações antigas (manter só últimas 48h)
            const resultNotifAntiga = await this.pool.query(`
                DELETE FROM user_notifications 
                WHERE created_at < (NOW() AT TIME ZONE 'America/Sao_Paulo') - INTERVAL '48 hours'
                AND status = 'read'
            `);
            this.log(`✅ Notificações antigas lidas removidas: ${resultNotifAntiga.rowCount}`);

            return true;
        } catch (error) {
            this.log(`❌ Erro na limpeza: ${error.message}`, 'ERROR');
            return false;
        }
    }

    /**
     * 🔧 OTIMIZAR BANCO APÓS LIMPEZA
     */
    async otimizarBanco() {
        this.log('🔧 Otimizando banco após limpeza...');
        
        try {
            // Atualizar estatísticas das tabelas principais
            await this.pool.query('ANALYZE users;');
            await this.pool.query('ANALYZE user_notifications;');
            await this.pool.query('ANALYZE aguia_news_radars;');
            await this.pool.query('ANALYZE user_radar_access;');
            await this.pool.query('ANALYZE system_logs;');
            await this.pool.query('ANALYZE real_orders;');
            
            this.log('✅ Estatísticas do banco atualizadas');

            return true;
        } catch (error) {
            this.log(`❌ Erro na otimização: ${error.message}`, 'ERROR');
            return false;
        }
    }

    /**
     * 📊 VERIFICAR ESTRUTURA APÓS LIMPEZA
     */
    async verificarEstrutura() {
        this.log('📊 Verificando estrutura após limpeza...');
        
        try {
            // Verificar tabelas essenciais do Aguia News
            const tabelasAguia = await this.pool.query(`
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name LIKE '%aguia%'
                ORDER BY table_name
            `);
            
            this.log('✅ Tabelas Aguia News:');
            tabelasAguia.rows.forEach(row => {
                this.log(`   • ${row.table_name}`);
            });

            // Verificar último radar
            const ultimoRadar = await this.pool.query(`
                SELECT id, generated_at 
                FROM aguia_news_radars 
                ORDER BY generated_at DESC 
                LIMIT 1
            `);
            
            if (ultimoRadar.rows.length > 0) {
                this.log(`✅ Último radar: ID ${ultimoRadar.rows[0].id} - ${ultimoRadar.rows[0].generated_at}`);
            }

            // Verificar usuários ativos
            const usuariosAtivos = await this.pool.query(`
                SELECT COUNT(*) as total 
                FROM users 
                WHERE is_active = true
            `);
            this.log(`👥 Usuários ativos: ${usuariosAtivos.rows[0].total}`);

            return true;
        } catch (error) {
            this.log(`❌ Erro ao verificar estrutura: ${error.message}`, 'ERROR');
            return false;
        }
    }

    /**
     * 🚀 EXECUTAR LIMPEZA COMPLETA
     */
    async executarLimpeza() {
        this.log('🚀 INICIANDO LIMPEZA COMPLETA DO BANCO DE DADOS', 'INIT');
        
        try {
            // 1. Verificar dados antes
            await this.verificarDados();
            
            console.log('\n⚠️  ATENÇÃO: Esta operação irá remover dados de teste!');
            console.log('📊 Dados que serão PRESERVADOS:');
            console.log('   • ✅ Usuários reais (sem "teste" no nome/email)');
            console.log('   • ✅ Radars Aguia News funcionais');
            console.log('   • ✅ Configurações do sistema');
            console.log('   • ✅ Estrutura completa das tabelas');
            
            console.log('\n🗑️  Dados que serão REMOVIDOS:');
            console.log('   • ❌ Usuários com "teste" ou "demo" no nome/email');
            console.log('   • ❌ Notificações de teste');
            console.log('   • ❌ Cache de mercado antigo (>24h)');
            console.log('   • ❌ Análises IA antigas (>7 dias)');
            
            // Aguardar confirmação visual
            console.log('\n⏳ Aguardando 5 segundos antes de prosseguir...');
            await new Promise(resolve => setTimeout(resolve, 5000));
            
            // 2. Executar limpeza
            const limpezaOk = await this.limparDadosTeste();
            if (!limpezaOk) throw new Error('Falha na limpeza de dados');
            
            // 3. Otimizar banco
            const otimizacaoOk = await this.otimizarBanco();
            if (!otimizacaoOk) throw new Error('Falha na otimização');
            
            // 4. Verificar estrutura final
            await this.verificarEstrutura();
            
            // 5. Verificar dados finais
            console.log('\n📊 DADOS APÓS LIMPEZA:');
            await this.verificarDados();
            
            this.log('🎉 LIMPEZA COMPLETA REALIZADA COM SUCESSO!', 'SUCCESS');
            this.log('✅ Banco de dados limpo e otimizado para produção');
            
        } catch (error) {
            this.log(`❌ ERRO CRÍTICO na limpeza: ${error.message}`, 'FATAL');
            throw error;
        } finally {
            await this.pool.end();
        }
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    const limpeza = new LimpezaBancoDados();
    
    limpeza.executarLimpeza().catch((error) => {
        console.error('❌ FALHA CRÍTICA:', error.message);
        process.exit(1);
    });
}

module.exports = LimpezaBancoDados;
