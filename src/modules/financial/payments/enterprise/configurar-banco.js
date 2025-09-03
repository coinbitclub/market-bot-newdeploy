/**
 * 🔧 CONFIGURADOR DE CREDENCIAIS - SISTEMA SALDO DEVEDOR
 * CoinBitClub Market Bot - Database Setup Helper
 */

const { Pool } = require('pg');

console.log('🔧 CONFIGURADOR DE BANCO DE DADOS');
console.log('━'.repeat(50));

// Tentar múltiplas configurações possíveis
const configuracoesPossiveis = [
    {
        name: 'Railway (String de Conexão)',
        config: {
            connectionString: 'process.env.DATABASE_URL',
            ssl: { rejectUnauthorized: false }
        }
    },
    {
        name: 'Local PostgreSQL',
        config: {
            user: 'postgres',
            host: 'localhost',
            database: 'coinbitclub',
            password: 'postgres',
            port: 5432,
        }
    },
    {
        name: 'Local PostgreSQL (senha alternativa)',
        config: {
            user: 'postgres',
            host: 'localhost',
            database: 'coinbitclub',
            password: '123456',
            port: 5432,
        }
    }
];

async function testarConfiguracao(config, name) {
    console.log(`\n🔍 Testando: ${name}`);
    
    const pool = new Pool(config);
    
    try {
        const resultado = await pool.query('SELECT version(), current_database(), current_user');
        
        console.log('✅ Conexão bem-sucedida!');
        console.log(`   📊 Versão: ${resultado.rows[0].version.split(' ')[0]} ${resultado.rows[0].version.split(' ')[1]}`);
        console.log(`   🗄️ Database: ${resultado.rows[0].current_database}`);
        console.log(`   👤 Usuário: ${resultado.rows[0].current_user}`);
        
        // Verificar se a tabela users existe
        const verificarUsers = await pool.query(`
            SELECT column_name, data_type FROM information_schema.columns 
            WHERE table_name = 'users' 
            ORDER BY ordinal_position
            LIMIT 5
        `);
        
        if (verificarUsers.rows.length > 0) {
            console.log('   📋 Colunas da tabela users:');
            verificarUsers.rows.forEach(col => {
                console.log(`      - ${col.column_name} (${col.data_type})`);
            });
        } else {
            console.log('   ⚠️ Tabela users não encontrada');
        }
        
        await pool.end();
        return config;
        
    } catch (error) {
        console.log(`   ❌ Falha: ${error.message.split('\n')[0]}`);
        await pool.end();
        return null;
    }
}

async function encontrarConfiguracaoValida() {
    console.log('🔎 Procurando configuração válida...');
    
    for (const { config, name } of configuracoesPossiveis) {
        const configuracaoValida = await testarConfiguracao(config, name);
        if (configuracaoValida) {
            console.log('\n🎉 CONFIGURAÇÃO VÁLIDA ENCONTRADA!');
            console.log('━'.repeat(50));
            console.log('Configuração a ser usada:');
            console.log(JSON.stringify(configuracaoValida, null, 2));
            
            // Criar arquivo de configuração
            const fs = require('fs');
            const configContent = `// Configuração do banco para sistema de saldo devedor
module.exports = ${JSON.stringify(configuracaoValida, null, 2)};`;
            
            fs.writeFileSync('./database-config.js', configContent);
            console.log('\n💾 Configuração salva em: database-config.js');
            
            return configuracaoValida;
        }
    }
    
    console.log('\n❌ NENHUMA CONFIGURAÇÃO VÁLIDA ENCONTRADA');
    console.log('\n🔧 Para resolver:');
    console.log('1. Verifique se o PostgreSQL está instalado e rodando');
    console.log('2. Confirme as credenciais do banco de dados');
    console.log('3. Certifique-se de que o banco "coinbitclub" existe');
    console.log('4. Verifique se a tabela "users" foi criada');
    
    return null;
}

// Executar
encontrarConfiguracaoValida()
    .then(config => {
        if (config) {
            console.log('\n🚀 Agora você pode executar: node testar-sistema-completo-uuid.js');
        }
        process.exit(config ? 0 : 1);
    })
    .catch(error => {
        console.error('💥 Erro:', error.message);
        process.exit(1);
    });
