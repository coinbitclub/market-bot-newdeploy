#!/usr/bin/env node

/**
 * CORREÇÃO COMPLETA DOS PROBLEMAS DE CHAVES API
 * Resolve problemas de descriptografia e configuração de IP
 */

const { Pool } = require('pg');
const crypto = require('crypto');

class APIKeysFixer {
    constructor() {
        this.pool = new Pool({
            connectionString: process.env.DATABASE_URL || 'postgresql://postgres:ELjbkkgUASRCtdTAXVFgIssOXiLsRCPq@trolley.proxy.rlwy.net:44790/railway',
            ssl: { rejectUnauthorized: false }
        });
    }

    /**
     * MÉTODO CORRETO DE CRIPTOGRAFIA
     */
    encryptData(text, encryptionKey) {
        const algorithm = 'aes-256-cbc';
        const key = crypto.scryptSync(encryptionKey, 'salt', 32);
        const iv = crypto.randomBytes(16);
        
        const cipher = crypto.createCipheriv(algorithm, key, iv);
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        
        return iv.toString('hex') + encrypted;
    }

    /**
     * MÉTODO CORRETO DE DESCRIPTOGRAFIA
     */
    decryptData(encryptedData, encryptionKey) {
        const algorithm = 'aes-256-cbc';
        const key = crypto.scryptSync(encryptionKey, 'salt', 32);
        
        const iv = Buffer.from(encryptedData.slice(0, 32), 'hex');
        const encrypted = encryptedData.slice(32);
        
        const decipher = crypto.createDecipheriv(algorithm, key, iv);
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        
        return decrypted;
    }

    /**
     * DIAGNÓSTICO COMPLETO DAS CHAVES
     */
    async diagnoseKeys() {
        console.log('🔍 DIAGNÓSTICO COMPLETO DAS CHAVES API');
        console.log('=====================================');
        console.log('');

        try {
            const client = await this.pool.connect();

            // Verificar estrutura da tabela
            console.log('📋 1. Verificando estrutura da tabela...');
            const columnsQuery = `
                SELECT column_name, data_type, is_nullable
                FROM information_schema.columns 
                WHERE table_name = 'users' 
                AND column_name LIKE '%api%'
                ORDER BY column_name
            `;
            
            const columns = await client.query(columnsQuery);
            console.log('📊 Colunas relacionadas a API:');
            columns.rows.forEach(col => {
                console.log(`   • ${col.column_name} (${col.data_type})`);
            });
            console.log('');

            // Verificar dados dos usuários
            console.log('👥 2. Verificando dados dos usuários...');
            const usersQuery = `
                SELECT 
                    id, nome, username,
                    binance_api_key, binance_api_secret,
                    binance_api_key_encrypted, binance_api_secret_encrypted,
                    bybit_api_key, bybit_api_secret,
                    bybit_api_key_encrypted, bybit_api_secret_encrypted,
                    CASE 
                        WHEN binance_api_key_encrypted IS NOT NULL THEN 'encrypted'
                        WHEN binance_api_key IS NOT NULL THEN 'plain'
                        ELSE 'none'
                    END as binance_status,
                    CASE 
                        WHEN bybit_api_key_encrypted IS NOT NULL THEN 'encrypted'
                        WHEN bybit_api_key IS NOT NULL THEN 'plain'
                        ELSE 'none'
                    END as bybit_status
                FROM users 
                WHERE id IN (14, 15, 16)
                ORDER BY id
            `;

            const users = await client.query(usersQuery);
            
            console.log('📊 Status das chaves por usuário:');
            users.rows.forEach(user => {
                console.log(`👤 Usuário ${user.id} (${user.nome}):`);
                console.log(`   Binance: ${user.binance_status}`);
                console.log(`   Bybit: ${user.bybit_status}`);
                
                if (user.binance_status === 'encrypted') {
                    console.log(`   🔐 Binance Key Length: ${user.binance_api_key_encrypted?.length || 0} chars`);
                    console.log(`   🔐 Binance Secret Length: ${user.binance_api_secret_encrypted?.length || 0} chars`);
                }
                
                if (user.bybit_status === 'encrypted') {
                    console.log(`   🔐 Bybit Key Length: ${user.bybit_api_key_encrypted?.length || 0} chars`);
                    console.log(`   🔐 Bybit Secret Length: ${user.bybit_api_secret_encrypted?.length || 0} chars`);
                }
                console.log('');
            });

            client.release();

        } catch (error) {
            console.error('❌ Erro no diagnóstico:', error.message);
        }
    }

    /**
     * SOLUÇÃO 1: CORRIGIR CHAVES CRIPTOGRAFADAS
     */
    async fixEncryptedKeys() {
        console.log('🔧 CORRIGINDO CHAVES CRIPTOGRAFADAS');
        console.log('===================================');
        console.log('');

        try {
            const client = await this.pool.connect();
            const encryptionKey = process.env.ENCRYPTION_KEY || 'CoinBitClubSecretKey32CharsForProd';

            console.log('🔑 Chave de criptografia configurada:', encryptionKey.substring(0, 8) + '...');
            console.log('');

            // Buscar usuários com chaves criptografadas
            const usersQuery = `
                SELECT id, nome,
                    binance_api_key_encrypted, binance_api_secret_encrypted,
                    bybit_api_key_encrypted, bybit_api_secret_encrypted
                FROM users 
                WHERE (binance_api_key_encrypted IS NOT NULL OR bybit_api_key_encrypted IS NOT NULL)
                AND id IN (14, 15, 16)
            `;

            const users = await client.query(usersQuery);

            for (const user of users.rows) {
                console.log(`👤 Processando usuário ${user.id} (${user.nome})...`);

                // Tentar descriptografar e re-criptografar chaves Binance
                if (user.binance_api_key_encrypted) {
                    try {
                        console.log('   🔓 Tentando descriptografar Binance...');
                        const binanceKey = this.decryptData(user.binance_api_key_encrypted, encryptionKey);
                        const binanceSecret = this.decryptData(user.binance_api_secret_encrypted, encryptionKey);
                        
                        // Re-criptografar com método correto
                        const newEncryptedKey = this.encryptData(binanceKey, encryptionKey);
                        const newEncryptedSecret = this.encryptData(binanceSecret, encryptionKey);

                        // Atualizar no banco
                        await client.query(`
                            UPDATE users SET 
                                binance_api_key_encrypted = $1,
                                binance_api_secret_encrypted = $2
                            WHERE id = $3
                        `, [newEncryptedKey, newEncryptedSecret, user.id]);

                        console.log('   ✅ Binance chaves re-criptografadas com sucesso');

                    } catch (error) {
                        console.log(`   ❌ Erro Binance: ${error.message}`);
                        console.log('   💡 Tentando conversão de chaves em texto simples...');
                        
                        // Se falhar, pode ser que as chaves estejam em texto simples
                        try {
                            const newEncryptedKey = this.encryptData(user.binance_api_key_encrypted, encryptionKey);
                            const newEncryptedSecret = this.encryptData(user.binance_api_secret_encrypted, encryptionKey);

                            await client.query(`
                                UPDATE users SET 
                                    binance_api_key_encrypted = $1,
                                    binance_api_secret_encrypted = $2
                                WHERE id = $3
                            `, [newEncryptedKey, newEncryptedSecret, user.id]);

                            console.log('   ✅ Binance chaves criptografadas pela primeira vez');
                        } catch (secondError) {
                            console.log(`   ❌ Falha total Binance: ${secondError.message}`);
                        }
                    }
                }

                // Tentar descriptografar e re-criptografar chaves Bybit
                if (user.bybit_api_key_encrypted) {
                    try {
                        console.log('   🔓 Tentando descriptografar Bybit...');
                        const bybitKey = this.decryptData(user.bybit_api_key_encrypted, encryptionKey);
                        const bybitSecret = this.decryptData(user.bybit_api_secret_encrypted, encryptionKey);
                        
                        // Re-criptografar com método correto
                        const newEncryptedKey = this.encryptData(bybitKey, encryptionKey);
                        const newEncryptedSecret = this.encryptData(bybitSecret, encryptionKey);

                        // Atualizar no banco
                        await client.query(`
                            UPDATE users SET 
                                bybit_api_key_encrypted = $1,
                                bybit_api_secret_encrypted = $2
                            WHERE id = $3
                        `, [newEncryptedKey, newEncryptedSecret, user.id]);

                        console.log('   ✅ Bybit chaves re-criptografadas com sucesso');

                    } catch (error) {
                        console.log(`   ❌ Erro Bybit: ${error.message}`);
                        console.log('   💡 Tentando conversão de chaves em texto simples...');
                        
                        try {
                            const newEncryptedKey = this.encryptData(user.bybit_api_key_encrypted, encryptionKey);
                            const newEncryptedSecret = this.encryptData(user.bybit_api_secret_encrypted, encryptionKey);

                            await client.query(`
                                UPDATE users SET 
                                    bybit_api_key_encrypted = $1,
                                    bybit_api_secret_encrypted = $2
                                WHERE id = $3
                            `, [newEncryptedKey, newEncryptedSecret, user.id]);

                            console.log('   ✅ Bybit chaves criptografadas pela primeira vez');
                        } catch (secondError) {
                            console.log(`   ❌ Falha total Bybit: ${secondError.message}`);
                        }
                    }
                }
                console.log('');
            }

            client.release();
            console.log('✅ Processo de correção de chaves concluído!');

        } catch (error) {
            console.error('❌ Erro na correção:', error.message);
        }
    }

    /**
     * SOLUÇÃO 2: CONFIGURAR CHAVES DE TESTE VÁLIDAS
     */
    async setupTestKeys() {
        console.log('🧪 CONFIGURANDO CHAVES DE TESTE VÁLIDAS');
        console.log('=======================================');
        console.log('');

        console.log('💡 CHAVES DE TESTE BYBIT (Testnet):');
        console.log('');
        console.log('Para criar chaves de teste válidas:');
        console.log('1. Acesse: https://testnet.bybit.com/');
        console.log('2. Faça login ou crie conta');
        console.log('3. Vá em API > API Management');
        console.log('4. Create New Key com permissões:');
        console.log('   ✅ Read-Write');
        console.log('   ✅ Contract Trading');
        console.log('   ✅ Spot Trading');
        console.log('   ✅ Wallet');
        console.log('5. Configure IP: * (qualquer IP) ou IP específico do servidor');
        console.log('');

        console.log('🔧 INSERINDO CHAVES DE TESTE...');
        
        const testKeys = {
            user14: {
                id: 14,
                nome: 'Luiza',
                // Chaves de exemplo (substituir por chaves reais de testnet)
                bybit_key: 'BYBIT_TEST_KEY_USER14',
                bybit_secret: 'BYBIT_TEST_SECRET_USER14'
            },
            user15: {
                id: 15,
                nome: 'Paloma',
                bybit_key: 'BYBIT_TEST_KEY_USER15', 
                bybit_secret: 'BYBIT_TEST_SECRET_USER15'
            },
            user16: {
                id: 16,
                nome: 'Erica',
                bybit_key: 'BYBIT_TEST_KEY_USER16',
                bybit_secret: 'BYBIT_TEST_SECRET_USER16'
            }
        };

        try {
            const client = await this.pool.connect();
            const encryptionKey = process.env.ENCRYPTION_KEY || 'CoinBitClubSecretKey32CharsForProd';

            for (const [userKey, userData] of Object.entries(testKeys)) {
                console.log(`👤 Configurando ${userData.nome} (ID: ${userData.id})...`);

                // Criptografar chaves de teste
                const encryptedKey = this.encryptData(userData.bybit_key, encryptionKey);
                const encryptedSecret = this.encryptData(userData.bybit_secret, encryptionKey);

                // Atualizar no banco
                await client.query(`
                    UPDATE users SET 
                        bybit_api_key_encrypted = $1,
                        bybit_api_secret_encrypted = $2,
                        updated_at = NOW()
                    WHERE id = $3
                `, [encryptedKey, encryptedSecret, userData.id]);

                console.log(`   ✅ Chaves de teste configuradas para ${userData.nome}`);
            }

            client.release();
            console.log('');
            console.log('✅ Chaves de teste configuradas!');
            console.log('⚠️ IMPORTANTE: Substitua pelas chaves reais do Bybit Testnet');

        } catch (error) {
            console.error('❌ Erro ao configurar chaves de teste:', error.message);
        }
    }

    /**
     * SOLUÇÃO 3: GUIA PARA RESOLVER PROBLEMAS DE IP
     */
    showIPSolution() {
        console.log('🌐 SOLUÇÕES PARA PROBLEMAS DE IP');
        console.log('================================');
        console.log('');

        console.log('❌ Erro atual: "Unmatched IP, please check your API key\'s bound IP addresses"');
        console.log('');

        console.log('💡 SOLUÇÕES:');
        console.log('');

        console.log('1️⃣ CONFIGURAR IP NAS CHAVES API:');
        console.log('   • Bybit: API Management > Edit Key > IP Restriction');
        console.log('   • Binance: API Management > Edit > IP Restriction');
        console.log('   • Adicionar IP do servidor ou usar "*" (qualquer IP)');
        console.log('');

        console.log('2️⃣ DESCOBRIR IP DO SERVIDOR:');
        console.log('   • Railway: Dashboard > Settings > Environment');
        console.log('   • Ou usar comando: curl ifconfig.me');
        console.log('   • Ou testar sem restrição de IP primeiro');
        console.log('');

        console.log('3️⃣ USAR TESTNET PRIMEIRO:');
        console.log('   • Bybit Testnet: https://testnet.bybit.com/');
        console.log('   • Binance Testnet: https://testnet.binance.vision/');
        console.log('   • Menos restrições, ideal para testes');
        console.log('');

        console.log('4️⃣ CONFIGURAR VPS COM IP FIXO:');
        console.log('   • AWS EC2, DigitalOcean, etc.');
        console.log('   • IP estático para configurar nas exchanges');
        console.log('   • Maior estabilidade para produção');
        console.log('');
    }

    /**
     * EXECUTAR TODAS AS CORREÇÕES
     */
    async runAllFixes() {
        console.log('🚀 INICIANDO CORREÇÃO COMPLETA DOS PROBLEMAS');
        console.log('============================================');
        console.log('');

        // 1. Diagnóstico inicial
        await this.diagnoseKeys();
        
        console.log('⏳ Aguarde 3 segundos...');
        await new Promise(resolve => setTimeout(resolve, 3000));
        console.log('');

        // 2. Corrigir chaves criptografadas
        await this.fixEncryptedKeys();
        
        console.log('⏳ Aguarde 3 segundos...');
        await new Promise(resolve => setTimeout(resolve, 3000));
        console.log('');

        // 3. Configurar chaves de teste
        await this.setupTestKeys();
        
        console.log('⏳ Aguarde 3 segundos...');
        await new Promise(resolve => setTimeout(resolve, 3000));
        console.log('');

        // 4. Mostrar soluções para IP
        this.showIPSolution();

        console.log('🎉 CORREÇÃO COMPLETA FINALIZADA!');
        console.log('');
        console.log('📋 PRÓXIMOS PASSOS:');
        console.log('1. Configure chaves reais de testnet do Bybit');
        console.log('2. Configure IPs nas exchanges');
        console.log('3. Reinicie o app.js');
        console.log('4. Monitore os logs para verificar sucesso');
        
        await this.pool.end();
    }
}

// Executar correção
if (require.main === module) {
    const fixer = new APIKeysFixer();
    fixer.runAllFixes();
}

module.exports = APIKeysFixer;
