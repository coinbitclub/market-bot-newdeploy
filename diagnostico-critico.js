/**
 * 🚨 DIAGNÓSTICO CRÍTICO - PROBLEMAS IDENTIFICADOS
 * 
 * Baseado nos logs do sistema em produção
 */

const { Pool } = require('pg');

class DiagnosticoCritico {
    constructor() {
        this.problemas = [];
        this.solucoes = [];
    }

    analisarLogs() {
        console.log('🔍 ANÁLISE DOS LOGS DO SISTEMA\n');
        console.log('='.repeat(50));

        // Problema 1: IP não autorizado
        this.problemas.push({
            tipo: 'IP_NAO_AUTORIZADO',
            severidade: 'CRÍTICO',
            descricao: 'Bybit V5 Error: Unmatched IP, please check your API key\'s bound IP addresses',
            usuarios_afetados: ['14 - Luiza Maria'],
            exchange: 'Bybit'
        });

        // Problema 2: Configuração de conta
        this.problemas.push({
            tipo: 'ACCOUNT_TYPE_NULL',
            severidade: 'ALTO',
            descricao: 'Bybit V5 Error: accountType is null',
            usuarios_afetados: ['15 - Paloma', '16 - Erica'],
            exchange: 'Bybit'
        });

        // Problema 3: API Key inválida
        this.problemas.push({
            tipo: 'API_KEY_INVALIDA',
            severidade: 'CRÍTICO',
            descricao: 'Binance: Invalid API-key, IP, or permissions for action / API-key format invalid',
            usuarios_afetados: ['16 - Erica'],
            exchange: 'Binance'
        });

        // Problema 4: Constraint de banco
        this.problemas.push({
            tipo: 'BANCO_CONSTRAINT',
            severidade: 'MÉDIO',
            descricao: 'duplicate key value violates unique constraint "balances_user_id_asset_account_type_key"',
            usuarios_afetados: ['Todos'],
            exchange: 'Banco de dados'
        });

        console.log('🚨 PROBLEMAS IDENTIFICADOS:\n');
        this.problemas.forEach((p, i) => {
            console.log(`${i+1}. ${p.tipo} (${p.severidade})`);
            console.log(`   📝 ${p.descricao}`);
            console.log(`   👥 Afeta: ${p.usuarios_afetados.join(', ')}`);
            console.log(`   🏢 Exchange: ${p.exchange}\n`);
        });
    }

    gerarSolucoes() {
        console.log('💡 SOLUÇÕES PROPOSTAS:\n');
        console.log('='.repeat(50));

        // Solução 1: IP Whitelisting
        this.solucoes.push({
            problema: 'IP_NAO_AUTORIZADO',
            acao: 'WHITELIST_IP',
            urgencia: 'IMEDIATA',
            steps: [
                '1. Identifique o IP atual do servidor',
                '2. Acesse Bybit API Management: https://www.bybit.com/app/user/api-management',
                '3. Edite cada API key e adicione o IP na lista de IPs permitidos',
                '4. Salve as alterações',
                '5. Aguarde 5-10 minutos para propagação'
            ]
        });

        // Solução 2: Configuração Account Type
        this.solucoes.push({
            problema: 'ACCOUNT_TYPE_NULL',
            acao: 'CORRIGIR_ACCOUNT_TYPE',
            urgencia: 'ALTA',
            steps: [
                '1. Verificar se as contas têm conta UNIFIED ativa',
                '2. Configurar accountType=UNIFIED nas requisições',
                '3. Verificar permissões da API key',
                '4. Atualizar código para detectar tipo de conta automaticamente'
            ]
        });

        // Solução 3: API Keys Binance
        this.solucoes.push({
            problema: 'API_KEY_INVALIDA',
            acao: 'VALIDAR_API_KEYS',
            urgencia: 'ALTA',
            steps: [
                '1. Verificar formato das API keys Binance',
                '2. Confirmar se as keys estão ativas',
                '3. Verificar permissões (Spot Trading, Futures)',
                '4. Adicionar IP nas configurações Binance',
                '5. Testar conexão individualmente'
            ]
        });

        // Solução 4: Banco de dados
        this.solucoes.push({
            problema: 'BANCO_CONSTRAINT',
            acao: 'UPSERT_BALANCES',
            urgencia: 'MÉDIA',
            steps: [
                '1. Implementar UPSERT em vez de INSERT',
                '2. Verificar constraint unique',
                '3. Limpar registros duplicados existentes',
                '4. Adicionar tratamento de conflitos'
            ]
        });

        this.solucoes.forEach((s, i) => {
            console.log(`💊 SOLUÇÃO ${i+1}: ${s.acao} (${s.urgencia})`);
            console.log(`🎯 Para: ${s.problema}`);
            s.steps.forEach(step => console.log(`   ${step}`));
            console.log();
        });
    }

    async obterIPAtual() {
        try {
            console.log('🌐 IDENTIFICANDO IP ATUAL DO SERVIDOR...\n');
            
            const axios = require('axios');
            const response = await axios.get('https://api.ipify.org?format=json', {
                timeout: 5000
            });
            
            const ip = response.data.ip;
            console.log(`🔢 IP PÚBLICO ATUAL: ${ip}`);
            console.log(`📍 Este IP deve ser adicionado nas exchanges!\n`);
            
            return ip;
        } catch (error) {
            console.log('❌ Erro ao obter IP:', error.message);
            return null;
        }
    }

    async verificarBancoDados() {
        console.log('🗄️ VERIFICANDO ESTRUTURA DO BANCO...\n');
        
        try {
            const pool = new Pool({
                connectionString: process.env.DATABASE_URL
            });

            // Verificar constraint problemática
            const constraintQuery = `
                SELECT constraint_name, table_name, constraint_type
                FROM information_schema.table_constraints 
                WHERE constraint_name = 'balances_user_id_asset_account_type_key'
            `;
            
            const result = await pool.query(constraintQuery);
            
            if (result.rows.length > 0) {
                console.log('✅ Constraint encontrada:', result.rows[0]);
                console.log('💡 Implementar UPSERT para evitar duplicatas\n');
            }

            // Verificar registros duplicados
            const duplicatesQuery = `
                SELECT user_id, asset, account_type, COUNT(*) as count
                FROM balances
                GROUP BY user_id, asset, account_type
                HAVING COUNT(*) > 1
            `;
            
            const duplicates = await pool.query(duplicatesQuery);
            
            if (duplicates.rows.length > 0) {
                console.log('⚠️ REGISTROS DUPLICADOS ENCONTRADOS:');
                duplicates.rows.forEach(row => {
                    console.log(`   👤 User ${row.user_id}, Asset ${row.asset}, Type ${row.account_type}: ${row.count} registros`);
                });
                console.log();
            } else {
                console.log('✅ Nenhum registro duplicado encontrado\n');
            }

            await pool.end();
            
        } catch (error) {
            console.log('❌ Erro ao verificar banco:', error.message);
        }
    }

    gerarComandosCorrecao() {
        console.log('🔧 COMANDOS DE CORREÇÃO:\n');
        console.log('='.repeat(50));

        console.log('📝 1. PARA CORRIGIR BANCO (UPSERT):');
        console.log(`
-- Limpar duplicatas existentes
DELETE FROM balances 
WHERE id NOT IN (
    SELECT MIN(id) 
    FROM balances 
    GROUP BY user_id, asset, account_type
);

-- Criar função UPSERT
CREATE OR REPLACE FUNCTION upsert_balance(
    p_user_id INT,
    p_asset VARCHAR,
    p_balance DECIMAL,
    p_account_type VARCHAR
) RETURNS VOID AS $$
BEGIN
    INSERT INTO balances (user_id, asset, balance, account_type, updated_at)
    VALUES (p_user_id, p_asset, p_balance, p_account_type, NOW())
    ON CONFLICT (user_id, asset, account_type)
    DO UPDATE SET 
        balance = EXCLUDED.balance,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;
        `);

        console.log('\n🌐 2. IPS PARA WHITELIST:');
        console.log('   - Bybit: https://www.bybit.com/app/user/api-management');
        console.log('   - Binance: https://www.binance.com/en/my/settings/api-management');

        console.log('\n🔑 3. VERIFICAR API KEYS:');
        console.log('   - Confirmar permissões ativas');
        console.log('   - Verificar formato correto');
        console.log('   - Testar individualmente');
    }

    async executarDiagnostico() {
        console.log('🚨 DIAGNÓSTICO CRÍTICO INICIADO\n');
        console.log('Data:', new Date().toLocaleString());
        console.log('='.repeat(60) + '\n');

        this.analisarLogs();
        this.gerarSolucoes();
        await this.obterIPAtual();
        await this.verificarBancoDados();
        this.gerarComandosCorrecao();

        console.log('🎯 PRIORIDADES DE AÇÃO:');
        console.log('1. 🚨 CRÍTICO: Adicionar IP nas exchanges (usuário 14)');
        console.log('2. 🔧 ALTO: Corrigir accountType nas requisições Bybit');
        console.log('3. 🔑 ALTO: Validar API keys Binance (usuário 16)');
        console.log('4. 🗄️ MÉDIO: Implementar UPSERT no banco');

        console.log('\n🏁 DIAGNÓSTICO CONCLUÍDO!');
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    const diagnostico = new DiagnosticoCritico();
    diagnostico.executarDiagnostico()
        .then(() => {
            console.log('\n✅ Análise completa finalizada!');
            process.exit(0);
        })
        .catch(error => {
            console.error('💥 Erro no diagnóstico:', error.message);
            process.exit(1);
        });
}

module.exports = DiagnosticoCritico;
