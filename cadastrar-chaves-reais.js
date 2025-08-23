/**
 * 🔑 CADASTRO DE CHAVES REAIS - OPERAÇÃO
 * =====================================
 * 
 * INSTRUÇÕES PARA CONFIGURAR SUAS CHAVES REAIS:
 * 
 * 1. Configure os IPs nas exchanges:
 *    ✅ 131.0.31.147 (Railway - manter)
 *    ➕ 132.255.160.131 (IP atual - adicionar)
 * 
 * 2. Substitua as chaves abaixo pelas suas chaves reais
 * 3. Execute: node cadastrar-chaves-reais.js
 * 4. Execute: node test-real-connections.js
 */

const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:ELjbkkgUASRCtdTAXVFgIssOXiLsRCPq@trolley.proxy.rlwy.net:44790/railway',
    ssl: { rejectUnauthorized: false }
});

// 🔥 CONFIGURAÇÃO DAS SUAS CHAVES REAIS
const CHAVES_REAIS = {
    // 👤 USUÁRIO 1 - Substitua pelo seu nome/email
    usuario1: {
        username: 'seu_usuario_aqui',
        email: 'seu_email@email.com',
        chaves: {
            // 🟣 BYBIT TESTNET
            bybit_testnet: {
                api_key: YOUR_API_KEY_HERE,
                secret_key: 'SUBSTITUA_PELA_SUA_SECRET_BYBIT_TESTNET'
            },
            
            // 🟣 BYBIT MAINNET  
            bybit_mainnet: {
                api_key: YOUR_API_KEY_HERE,
                secret_key: 'SUBSTITUA_PELA_SUA_SECRET_BYBIT_MAINNET'
            },
            
            // 🟡 BINANCE TESTNET
            binance_testnet: {
                api_key: "YOUR_BINANCE_API_KEY"YOUR_BINANCE_API_KEY"SUBSTITUA_PELA_SUA_SECRET_BINANCE_TESTNET'
            }
            
            // 🟡 BINANCE MAINNET (Desabilitado no Brasil)
            // binance_mainnet: {
            //     api_key: YOUR_API_KEY_HERE,
            //     secret_key: 'NAO_DISPONIVEL_NO_BRASIL'
            // }
        }
    }
    
    // 👤 USUÁRIO 2 - Adicione mais usuários se necessário
    // usuario2: {
    //     username: 'outro_usuario',
    //     email: 'outro@email.com',
    //     chaves: {
    //         bybit_testnet: {
    //             api_key: YOUR_API_KEY_HERE,
    //             secret_key: 'OUTRA_SECRET...'
    //         }
    //     }
    // }
};

class CadastradorChavesReais {
    async criarEstrutura() {
        console.log('🏗️ CRIANDO ESTRUTURA DO BANCO...');
        console.log('================================');

        try {
            // Criar tabela users
            await pool.query(`
                CREATE TABLE IF NOT EXISTS users (
                    id SERIAL PRIMARY KEY,
                    username VARCHAR(100) UNIQUE NOT NULL,
                    email VARCHAR(255) UNIQUE NOT NULL,
                    is_active BOOLEAN DEFAULT true,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);

            // Criar tabela user_api_keys
            await pool.query(`
                CREATE TABLE IF NOT EXISTS user_api_keys (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                    exchange VARCHAR(20) NOT NULL,
                    environment VARCHAR(20) NOT NULL,
                    api_key TEXT NOT NULL,
                    secret_key TEXT NOT NULL,
                    is_active BOOLEAN DEFAULT true,
                    validation_status VARCHAR(20) DEFAULT 'PENDING',
                    validation_error TEXT,
                    last_validated_at TIMESTAMP,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(user_id, exchange, environment)
                )
            `);

            // Criar tabela trading_executions
            await pool.query(`
                CREATE TABLE IF NOT EXISTS trading_executions (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER REFERENCES users(id),
                    exchange VARCHAR(50),
                    order_id VARCHAR(100),
                    symbol VARCHAR(20),
                    side VARCHAR(10),
                    amount DECIMAL(20,8),
                    price DECIMAL(20,8),
                    status VARCHAR(20),
                    error_message TEXT,
                    signal_data JSONB,
                    executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);

            console.log('✅ Estrutura do banco criada/verificada');

        } catch (error) {
            console.error('❌ Erro ao criar estrutura:', error.message);
            throw error;
        }
    }

    async cadastrarUsuario(username, email) {
        try {
            // Verificar se já existe
            let result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
            
            if (result.rows.length > 0) {
                console.log(`👤 Usuário já existe: ${username}`);
                return result.rows[0];
            }

            // Criar novo
            result = await pool.query(`
                INSERT INTO users (username, email, is_active)
                VALUES ($1, $2, true)
                RETURNING *
            `, [username, email]);

            console.log(`✅ Usuário criado: ${username}`);
            return result.rows[0];

        } catch (error) {
            console.error(`❌ Erro ao cadastrar usuário ${username}:`, error.message);
            throw error;
        }
    }

    async cadastrarChave(userId, exchange, environment, apiKey, secretKey) {
        try {
            // Verificar se já existe
            const existing = await pool.query(`
                SELECT * FROM user_api_keys 
                WHERE user_id = $1 AND exchange = $2 AND environment = $3
            `, [userId, exchange, environment]);

            if (existing.rows.length > 0) {
                // Atualizar
                await pool.query(`
                    UPDATE user_api_keys 
                    SET api_key = $1, secret_key = $2, is_active = true, 
                        validation_status = 'PENDING', updated_at = CURRENT_TIMESTAMP
                    WHERE user_id = $3 AND exchange = $4 AND environment = $5
                `, [apiKey, secretKey, userId, exchange, environment]);
                
                console.log(`🔄 Chave atualizada: ${exchange.toUpperCase()} ${environment}`);
            } else {
                // Criar nova
                await pool.query(`
                    INSERT INTO user_api_keys (user_id, exchange, environment, api_key, secret_key, is_active)
                    VALUES ($1, $2, $3, $4, $5, true)
                `, [userId, exchange, environment, apiKey, secretKey]);
                
                console.log(`✅ Chave cadastrada: ${exchange.toUpperCase()} ${environment}`);
            }

        } catch (error) {
            console.error(`❌ Erro ao cadastrar chave ${exchange} ${environment}:`, error.message);
            throw error;
        }
    }

    validarChaves() {
        console.log('🔍 VALIDANDO CONFIGURAÇÃO DE CHAVES...');
        console.log('======================================');

        let chavesValidas = 0;
        let chavesInvalidas = 0;

        for (const [usuarioId, dadosUsuario] of Object.entries(CHAVES_REAIS)) {
            console.log(`\n👤 Validando usuário: ${dadosUsuario.username}`);
            
            if (dadosUsuario.username.includes('SUBSTITUA') || dadosUsuario.username === 'seu_usuario_aqui') {
                console.log('❌ Nome de usuário não configurado');
                chavesInvalidas++;
                continue;
            }

            for (const [chaveId, dadosChave] of Object.entries(dadosUsuario.chaves)) {
                const [exchange, environment] = chaveId.split('_');
                
                if (dadosChave.api_key.includes('SUBSTITUA') || dadosChave.api_key.length < 10) {
                    console.log(`❌ ${exchange.toUpperCase()} ${environment}: Chave não configurada`);
                    chavesInvalidas++;
                } else {
                    console.log(`✅ ${exchange.toUpperCase()} ${environment}: Configurada (${dadosChave.api_key.substring(0, 12)}...)`);
                    chavesValidas++;
                }
            }
        }

        console.log(`\n📊 RESULTADO DA VALIDAÇÃO:`);
        console.log(`✅ Chaves válidas: ${chavesValidas}`);
        console.log(`❌ Chaves inválidas: ${chavesInvalidas}`);

        if (chavesInvalidas > 0) {
            console.log(`\n⚠️ AÇÃO NECESSÁRIA:`);
            console.log(`   1. Edite este arquivo: cadastrar-chaves-reais.js`);
            console.log(`   2. Substitua as chaves com 'SUBSTITUA_PELA_SUA_CHAVE'`);
            console.log(`   3. Configure os IPs nas exchanges:`);
            console.log(`      ✅ 131.0.31.147 (Railway)`);
            console.log(`      ➕ 132.255.160.131 (IP atual)`);
            return false;
        }

        return true;
    }

    async processarCadastro() {
        console.log('🚀 PROCESSANDO CADASTRO DE CHAVES REAIS...');
        console.log('==========================================');

        let totalProcessadas = 0;

        for (const [usuarioId, dadosUsuario] of Object.entries(CHAVES_REAIS)) {
            console.log(`\n👤 Processando usuário: ${dadosUsuario.username}`);
            console.log('─'.repeat(50));

            // Cadastrar usuário
            const usuario = await this.cadastrarUsuario(dadosUsuario.username, dadosUsuario.email);

            // Cadastrar chaves
            for (const [chaveId, dadosChave] of Object.entries(dadosUsuario.chaves)) {
                const [exchange, environment] = chaveId.split('_');
                
                if (!dadosChave.api_key.includes('SUBSTITUA') && dadosChave.api_key.length > 10) {
                    await this.cadastrarChave(
                        usuario.id,
                        exchange,
                        environment,
                        dadosChave.api_key,
                        dadosChave.secret_key
                    );
                    totalProcessadas++;
                }
            }
        }

        console.log(`\n🎯 CADASTRO CONCLUÍDO:`);
        console.log(`✅ Total de chaves processadas: ${totalProcessadas}`);
    }

    async executar() {
        try {
            console.log('🔑 CADASTRADOR DE CHAVES REAIS - INICIANDO...');
            console.log('=============================================');

            // 1. Validar configuração
            if (!this.validarChaves()) {
                console.log('\n🔴 CONFIGURAÇÃO INVÁLIDA - CORRIJA AS CHAVES E TENTE NOVAMENTE');
                return;
            }

            // 2. Criar estrutura
            await this.criarEstrutura();

            // 3. Processar cadastro
            await this.processarCadastro();

            console.log('\n🟢 CHAVES CADASTRADAS COM SUCESSO!');
            console.log('==================================');
            console.log('📋 PRÓXIMOS PASSOS:');
            console.log('1. Execute: node test-real-connections.js');
            console.log('2. Verifique se todas as conexões estão OK');
            console.log('3. Se houver erro de IP, configure nas exchanges:');
            console.log('   ✅ 131.0.31.147 (Railway)');
            console.log('   ➕ 132.255.160.131 (IP atual)');

        } catch (error) {
            console.error('❌ Erro no cadastro:', error.message);
        } finally {
            await pool.end();
        }
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    const cadastrador = new CadastradorChavesReais();
    cadastrador.executar();
}

module.exports = CadastradorChavesReais;
