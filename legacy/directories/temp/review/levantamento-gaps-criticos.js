#!/usr/bin/env node

/**
 * 🔍 LEVANTAMENTO COMPLETO DE GAPS CRÍTICOS
 * ========================================
 * 
 * Identifica TUDO que está faltando para operações reais
 */

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'process.env.DATABASE_URL',
    ssl: { rejectUnauthorized: false }
});

async function levantamentoCompleto() {
    console.log('🔍 LEVANTAMENTO COMPLETO DE GAPS CRÍTICOS');
    console.log('========================================\n');

    const problemas = [];
    const acoes = [];

    try {
        // 1. VERIFICAR CONEXÃO
        console.log('1️⃣ TESTANDO CONEXÃO...');
        const conn = await pool.query('SELECT NOW() as now, version() as version');
        console.log(`   ✅ Conectado: ${conn.rows[0].now}`);
        console.log(`   📊 PostgreSQL: ${conn.rows[0].version.split(' ')[1]}\n`);

        // 2. MAPEAR ESTRUTURA ATUAL
        console.log('2️⃣ MAPEANDO ESTRUTURA ATUAL...');
        const tabelas = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name
        `);
        
        console.log(`   📋 ${tabelas.rows.length} tabelas encontradas:`);
        const tabelasExistentes = tabelas.rows.map(r => r.table_name);
        tabelasExistentes.forEach(t => console.log(`      • ${t}`));
        console.log('');

        // 3. VERIFICAR TABELAS CRÍTICAS
        console.log('3️⃣ VERIFICANDO TABELAS CRÍTICAS...');
        const tabelasCriticas = {
            'users': 'Usuários do sistema',
            'orders': 'Ordens de trading',
            'active_positions': 'Posições ativas',
            'signal_history': 'Histórico de sinais',
            'market_direction_history': 'Histórico de direção do mercado',
            'ticker_blocks': 'Bloqueios de tickers',
            'market_direction_alerts': 'Alertas de mudança de direção'
        };

        let tabelasFaltantes = [];
        for (const [tabela, descricao] of Object.entries(tabelasCriticas)) {
            if (!tabelasExistentes.includes(tabela)) {
                console.log(`   ❌ FALTANTE: ${tabela} (${descricao})`);
                tabelasFaltantes.push(tabela);
                problemas.push(`Tabela crítica faltante: ${tabela}`);
            } else {
                console.log(`   ✅ OK: ${tabela}`);
            }
        }

        if (tabelasFaltantes.length > 0) {
            acoes.push(`Criar ${tabelasFaltantes.length} tabelas faltantes: ${tabelasFaltantes.join(', ')}`);
        }
        console.log('');

        // 4. VERIFICAR ESTRUTURA DA TABELA USERS
        console.log('4️⃣ VERIFICANDO ESTRUTURA TABELA USERS...');
        try {
            const colunasUsers = await pool.query(`
                SELECT column_name, data_type, is_nullable, column_default
                FROM information_schema.columns 
                WHERE table_name = 'users' 
                ORDER BY ordinal_position
            `);

            const colunasExistentes = colunasUsers.rows.map(r => r.column_name);
            const colunasNecessarias = {
                'balance_brl': 'Saldo em reais',
                'balance_usd': 'Saldo em dólares', 
                'trading_active': 'Trading ativo',
                'account_type': 'Tipo de conta',
                'exchange_preference': 'Exchange preferida',
                'risk_level': 'Nível de risco',
                'max_positions': 'Máximo de posições'
            };

            let colunasFaltantes = [];
            for (const [coluna, descricao] of Object.entries(colunasNecessarias)) {
                if (!colunasExistentes.includes(coluna)) {
                    console.log(`   ❌ FALTANTE: ${coluna} (${descricao})`);
                    colunasFaltantes.push(coluna);
                    problemas.push(`Coluna crítica faltante: users.${coluna}`);
                } else {
                    console.log(`   ✅ OK: ${coluna}`);
                }
            }

            if (colunasFaltantes.length > 0) {
                acoes.push(`Adicionar ${colunasFaltantes.length} colunas na tabela users: ${colunasFaltantes.join(', ')}`);
            }

        } catch (error) {
            console.log(`   ❌ ERRO: Tabela users não existe ou inacessível: ${error.message}`);
            problemas.push('Tabela users não existe');
            acoes.push('Criar tabela users completa');
        }
        console.log('');

        // 5. VERIFICAR COLUNAS FALTANTES EM OUTRAS TABELAS
        console.log('5️⃣ VERIFICANDO COLUNAS FALTANTES...');
        const verificacoesColunas = [
            {
                tabela: 'btc_dominance_analysis',
                coluna: 'altcoin_performance',
                descricao: 'Performance das altcoins'
            },
            {
                tabela: 'rsi_overheated_log',
                coluna: 'individual_analysis',
                descricao: 'Análise individual do RSI'
            }
        ];

        for (const verif of verificacoesColunas) {
            try {
                const existe = await pool.query(`
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name = $1 AND column_name = $2
                `, [verif.tabela, verif.coluna]);

                if (existe.rows.length === 0) {
                    console.log(`   ❌ FALTANTE: ${verif.tabela}.${verif.coluna} (${verif.descricao})`);
                    problemas.push(`Coluna faltante: ${verif.tabela}.${verif.coluna}`);
                    acoes.push(`Adicionar coluna ${verif.coluna} na tabela ${verif.tabela}`);
                } else {
                    console.log(`   ✅ OK: ${verif.tabela}.${verif.coluna}`);
                }
            } catch (error) {
                console.log(`   ❌ ERRO: Não foi possível verificar ${verif.tabela}.${verif.coluna}: ${error.message}`);
            }
        }
        console.log('');

        // 6. VERIFICAR USUÁRIOS ATIVOS
        console.log('6️⃣ VERIFICANDO USUÁRIOS PARA TRADING...');
        try {
            const usuarios = await pool.query(`
                SELECT 
                    COUNT(*) as total,
                    COUNT(*) FILTER (WHERE trading_active = true) as ativos,
                    COUNT(*) FILTER (WHERE balance_brl >= 100 OR balance_usd >= 20) as com_saldo
                FROM users
            `);

            const dados = usuarios.rows[0];
            console.log(`   📊 Total de usuários: ${dados.total}`);
            console.log(`   📊 Com trading ativo: ${dados.ativos}`);
            console.log(`   📊 Com saldo adequado: ${dados.com_saldo || 'N/A'}`);

            if (parseInt(dados.ativos) === 0) {
                console.log('   ❌ PROBLEMA: Nenhum usuário com trading ativo');
                problemas.push('Nenhum usuário com trading ativo');
                acoes.push('Criar usuários de teste com trading_active=true e saldos adequados');
            } else {
                console.log('   ✅ OK: Usuários com trading ativo existem');
            }

        } catch (error) {
            console.log(`   ❌ ERRO: ${error.message}`);
            problemas.push('Não foi possível verificar usuários');
            acoes.push('Corrigir estrutura da tabela users e criar usuários de teste');
        }
        console.log('');

        // 7. VERIFICAR DADOS OPERACIONAIS
        console.log('7️⃣ VERIFICANDO DADOS OPERACIONAIS...');
        
        try {
            const sinais = await pool.query(`
                SELECT COUNT(*) as count 
                FROM signals 
                WHERE created_at > NOW() - INTERVAL '24 hours'
            `);
            console.log(`   📊 Sinais nas últimas 24h: ${sinais.rows[0].count}`);
        } catch (error) {
            console.log(`   ❌ Erro ao verificar sinais: ${error.message}`);
        }

        try {
            const ordens = await pool.query(`
                SELECT COUNT(*) as count 
                FROM orders 
                WHERE created_at > NOW() - INTERVAL '24 hours'
            `);
            console.log(`   📊 Ordens nas últimas 24h: ${ordens.rows[0].count}`);
            
            if (parseInt(ordens.rows[0].count) === 0) {
                problemas.push('Nenhuma ordem criada nas últimas 24h');
            }
        } catch (error) {
            console.log(`   ❌ Erro ao verificar ordens: Tabela orders não existe`);
            // Já foi identificado acima
        }
        console.log('');

        // 8. VERIFICAR DASHBOARDS E DADOS MOCK
        console.log('8️⃣ VERIFICANDO PROBLEMA DOS DADOS MOCK...');
        const fs = require('fs');
        const path = require('path');
        
        const arquivosComMock = [];
        const arquivosDashboard = [
            'dashboard-demo.js',
            'dashboard-corrigido.js', 
            'dashboard-operacional-real.js'
        ];

        for (const arquivo of arquivosDashboard) {
            const caminhoArquivo = path.join(__dirname, arquivo);
            if (fs.existsSync(caminhoArquivo)) {
                const conteudo = fs.readFileSync(caminhoArquivo, 'utf8');
                if (conteudo.includes('mock') || conteudo.includes('sample') || conteudo.includes('generateSampleData')) {
                    console.log(`   ❌ DADOS MOCK: ${arquivo} contém dados simulados`);
                    arquivosComMock.push(arquivo);
                    problemas.push(`Dashboard com dados mock: ${arquivo}`);
                } else {
                    console.log(`   ✅ OK: ${arquivo} sem dados mock`);
                }
            }
        }

        if (arquivosComMock.length > 0) {
            acoes.push(`Remover dados mock dos dashboards: ${arquivosComMock.join(', ')}`);
        }
        console.log('');

        // 9. GERAR RELATÓRIO FINAL
        console.log('📊 RELATÓRIO FINAL DE GAPS CRÍTICOS');
        console.log('==================================\n');

        if (problemas.length === 0) {
            console.log('🎉 SISTEMA PRONTO PARA OPERAÇÃO!');
            console.log('✅ Todas as verificações passaram');
            console.log('✅ Estrutura do banco completa');
            console.log('✅ Usuários configurados');
            console.log('✅ Sem dados mock nos dashboards');
        } else {
            console.log(`🚨 ${problemas.length} PROBLEMAS CRÍTICOS IDENTIFICADOS:\n`);
            
            problemas.forEach((problema, index) => {
                console.log(`   ${index + 1}. ${problema}`);
            });

            console.log(`\n🔧 ${acoes.length} AÇÕES NECESSÁRIAS:\n`);
            
            acoes.forEach((acao, index) => {
                console.log(`   ${index + 1}. ${acao}`);
            });

            console.log('\n⚡ SCRIPT DE CORREÇÃO AUTOMÁTICA:');
            console.log('   node correcao-operacoes-reais.js');
            
            console.log('\n📋 ORDEM DE EXECUÇÃO:');
            console.log('   1. Executar script de correção das tabelas');
            console.log('   2. Criar usuários de teste com saldos');
            console.log('   3. Configurar ENABLE_REAL_TRADING=true');
            console.log('   4. Remover dados mock dos dashboards');
            console.log('   5. Testar fluxo completo com sinal real');
        }

        console.log('\n' + '='.repeat(50));

    } catch (error) {
        console.error('💥 ERRO CRÍTICO:', error.message);
    } finally {
        await pool.end();
    }
}

// Executar levantamento
levantamentoCompleto();
