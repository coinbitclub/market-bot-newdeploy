/**
 * 🔐 SCRIPT DE LIMPEZA DE CHAVES PARA COMMIT SEGURO
 * Remove todas as chaves sensíveis dos códigos mantendo a estrutura
 * Prepara o código para commit seguro no GitHub
 */

const fs = require('fs');
const path = require('path');

class LimpadorChaves {
    constructor() {
        this.chavesLimpas = 0;
        this.arquivosProcessados = 0;
        this.backupCriado = false;
        
        // Padrões de chaves para remover
        this.padroes = [
            // API Keys
            /X-API-KEY['":\s]*['"][^'"]+['"]/gi,
            /API_KEY['":\s]*['"][^'"]+['"]/gi,
            /COINSTATS_API_KEY['":\s]*['"][^'"]+['"]/gi,
            /OPENAI_API_KEY['":\s]*['"][^'"]+['"]/gi,
            /BINANCE_API_KEY['":\s]*['"][^'"]+['"]/gi,
            
            // Database URLs
            /DATABASE_URL['":\s]*['"][^'"]+['"]/gi,
            /POSTGRES_URL['":\s]*['"][^'"]+['"]/gi,
            /postgresql:\/\/[^'"]+/gi,
            
            // Bearer tokens
            /Bearer\s+[A-Za-z0-9\-_\.]+/gi,
            /Authorization['":\s]*['"]Bearer[^'"]+['"]/gi,
            
            // Chaves específicas em environment variables
            /process\.env\.[A-Z_]*KEY[^,\s]*/gi,
            /process\.env\.[A-Z_]*TOKEN[^,\s]*/gi,
            /process\.env\.[A-Z_]*SECRET[^,\s]*/gi,
        ];
        
        // Substituições seguras
        this.substituicoes = {
            'X-API-KEY': 'X-API-KEY": "YOUR_COINSTATS_API_KEY"',
            'API_KEY': 'API_KEY": "YOUR_API_KEY"',
            'COINSTATS_API_KEY': 'COINSTATS_API_KEY=YOUR_COINSTATS_API_KEY',
            'OPENAI_API_KEY': 'OPENAI_API_KEY=YOUR_OPENAI_API_KEY',
            'BINANCE_API_KEY': 'BINANCE_API_KEY=YOUR_BINANCE_API_KEY',
            'DATABASE_URL': 'DATABASE_URL=postgresql://username:password@host:port/database',
            'POSTGRES_URL': 'POSTGRES_URL=postgresql://username:password@host:port/database',
            'Bearer': 'Bearer YOUR_TOKEN_HERE'
        };
    }

    async executarLimpeza() {
        console.log('🔐 INICIANDO LIMPEZA DE CHAVES PARA COMMIT SEGURO...');
        console.log('   ⚠️  ATENÇÃO: Criando backup antes da limpeza');
        
        try {
            // 1. Criar backup
            await this.criarBackup();
            
            // 2. Processar arquivos JavaScript
            await this.processarArquivosJS();
            
            // 3. Limpar arquivo .env se existir
            await this.limparEnvFile();
            
            // 4. Criar arquivo .env.example
            await this.criarEnvExample();
            
            // 5. Relatório final
            this.gerarRelatorio();
            
            console.log('\n✅ LIMPEZA CONCLUÍDA COM SUCESSO!');
            console.log('   🚀 Código pronto para commit seguro');
            
        } catch (error) {
            console.error('❌ Erro na limpeza:', error.message);
        }
    }

    async criarBackup() {
        console.log('\n📦 Criando backup dos arquivos originais...');
        
        const backupDir = path.join(__dirname, 'backup-original-keys');
        
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }
        
        const arquivos = fs.readdirSync(__dirname)
            .filter(file => file.endsWith('.js') && !file.includes('backup'))
            .slice(0, 20); // Limitar para não criar backup muito grande
        
        for (const arquivo of arquivos) {
            const origem = path.join(__dirname, arquivo);
            const destino = path.join(backupDir, arquivo);
            fs.copyFileSync(origem, destino);
        }
        
        // Backup do .env se existir
        const envFile = path.join(__dirname, '.env');
        if (fs.existsSync(envFile)) {
            fs.copyFileSync(envFile, path.join(backupDir, '.env'));
        }
        
        console.log(`   ✅ Backup criado em: ${backupDir}`);
        this.backupCriado = true;
    }

    async processarArquivosJS() {
        console.log('\n🧹 Processando arquivos JavaScript...');
        
        const arquivos = fs.readdirSync(__dirname)
            .filter(file => file.endsWith('.js') && !file.includes('backup') && !file.includes('limpar-chaves'));
        
        for (const arquivo of arquivos) {
            await this.limparArquivo(arquivo);
        }
    }

    async limparArquivo(nomeArquivo) {
        const caminhoArquivo = path.join(__dirname, nomeArquivo);
        
        try {
            let conteudo = fs.readFileSync(caminhoArquivo, 'utf8');
            let conteudoLimpo = conteudo;
            let chavesEncontradas = 0;
            
            // Aplicar cada padrão de limpeza
            this.padroes.forEach(padrao => {
                const matches = conteudoLimpo.match(padrao);
                if (matches) {
                    chavesEncontradas += matches.length;
                    
                    matches.forEach(match => {
                        // Determinar substituição apropriada
                        let substituicao = 'YOUR_API_KEY_HERE';
                        
                        if (match.includes('X-API-KEY')) substituicao = '"YOUR_COINSTATS_API_KEY"';
                        else if (match.includes('OPENAI')) substituicao = '"YOUR_OPENAI_API_KEY"';
                        else if (match.includes('BINANCE')) substituicao = '"YOUR_BINANCE_API_KEY"';
                        else if (match.includes('DATABASE') || match.includes('POSTGRES')) {
                            substituicao = '"postgresql://username:password@host:port/database"';
                        }
                        else if (match.includes('Bearer')) substituicao = 'Bearer YOUR_TOKEN_HERE';
                        
                        conteudoLimpo = conteudoLimpo.replace(match, match.replace(/['"][^'"]+['"]/, substituicao));
                    });
                }
            });
            
            // Limpar process.env específicos
            conteudoLimpo = conteudoLimpo.replace(/process\.env\.COINSTATS_API_KEY/g, 'process.env.COINSTATS_API_KEY');
            conteudoLimpo = conteudoLimpo.replace(/process\.env\.OPENAI_API_KEY/g, 'process.env.OPENAI_API_KEY');
            conteudoLimpo = conteudoLimpo.replace(/process\.env\.DATABASE_URL/g, 'process.env.DATABASE_URL');
            
            if (chavesEncontradas > 0) {
                fs.writeFileSync(caminhoArquivo, conteudoLimpo);
                console.log(`   🧹 ${nomeArquivo}: ${chavesEncontradas} chaves removidas`);
                this.chavesLimpas += chavesEncontradas;
            } else {
                console.log(`   ✅ ${nomeArquivo}: nenhuma chave encontrada`);
            }
            
            this.arquivosProcessados++;
            
        } catch (error) {
            console.log(`   ❌ Erro em ${nomeArquivo}: ${error.message}`);
        }
    }

    async limparEnvFile() {
        const envFile = path.join(__dirname, '.env');
        
        if (fs.existsSync(envFile)) {
            console.log('\n🗑️ Removendo arquivo .env...');
            fs.unlinkSync(envFile);
            console.log('   ✅ Arquivo .env removido');
        }
    }

    async criarEnvExample() {
        console.log('\n📝 Criando arquivo .env.example...');
        
        const envExample = `# CoinBitClub Enterprise V6.0.0 - Environment Variables
# Copie este arquivo para .env e preencha com suas chaves reais

# CoinStats API Key (obtenha em: https://coinstats.app/api)
COINSTATS_API_KEY=your_coinstats_api_key_here

# OpenAI API Key (obtenha em: https://platform.openai.com/api-keys)
OPENAI_API_KEY=your_openai_api_key_here

# Binance API Key (opcional, para dados adicionais)
BINANCE_API_KEY=your_binance_api_key_here

# PostgreSQL Database URL (Railway, Supabase, etc.)
DATABASE_URL=postgresql://username:password@host:port/database

# Configurações opcionais
NODE_ENV=production
PORT=3000

# Configurações de Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Configurações de Cache
CACHE_TTL_SECONDS=300
CACHE_MAX_SIZE=1000
`;
        
        fs.writeFileSync(path.join(__dirname, '.env.example'), envExample);
        console.log('   ✅ Arquivo .env.example criado');
    }

    gerarRelatorio() {
        console.log('\n📊 RELATÓRIO DE LIMPEZA:');
        console.log('==========================================');
        console.log(`   📁 Arquivos processados: ${this.arquivosProcessados}`);
        console.log(`   🔑 Chaves removidas: ${this.chavesLimpas}`);
        console.log(`   📦 Backup criado: ${this.backupCriado ? 'SIM' : 'NÃO'}`);
        console.log('==========================================');
        
        if (this.backupCriado) {
            console.log('\n⚠️  IMPORTANTE:');
            console.log('   🔄 Para restaurar as chaves: copie do backup-original-keys/');
            console.log('   📝 Configure o .env com suas chaves reais');
            console.log('   🚀 Código agora está seguro para commit público');
        }
    }

    async adicionarGitignore() {
        console.log('\n📝 Verificando .gitignore...');
        
        const gitignorePath = path.join(__dirname, '.gitignore');
        const itensEssenciais = [
            '# Environment variables',
            '.env',
            '.env.local',
            '.env.production',
            '',
            '# API Keys backup',
            'backup-original-keys/',
            '',
            '# Node modules',
            'node_modules/',
            '',
            '# Logs',
            '*.log',
            'logs/',
            '',
            '# OS generated files',
            '.DS_Store',
            'Thumbs.db',
            '',
            '# IDE files',
            '.vscode/',
            '.idea/',
            '*.swp',
            '*.swo'
        ];
        
        if (fs.existsSync(gitignorePath)) {
            let gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
            
            // Adicionar itens que não estão presentes
            itensEssenciais.forEach(item => {
                if (!gitignoreContent.includes(item) && item.trim()) {
                    gitignoreContent += `\n${item}`;
                }
            });
            
            fs.writeFileSync(gitignorePath, gitignoreContent);
        } else {
            fs.writeFileSync(gitignorePath, itensEssenciais.join('\n'));
        }
        
        console.log('   ✅ .gitignore atualizado');
    }
}

// Executar limpeza se chamado diretamente
if (require.main === module) {
    const limpador = new LimpadorChaves();
    
    limpador.executarLimpeza()
        .then(() => {
            console.log('\n🎉 SISTEMA PRONTO PARA COMMIT SEGURO!');
            console.log('\n📋 PRÓXIMOS PASSOS:');
            console.log('   1. git add .');
            console.log('   2. git commit -m "feat: CoinBitClub Enterprise v6.0.0 - Sistema Integrado Completo"');
            console.log('   3. git push origin main');
            console.log('\n⚠️  Lembre-se de configurar o .env antes de executar em produção!');
        })
        .catch(error => {
            console.error('💥 ERRO CRÍTICO:', error.message);
        });
}

module.exports = LimpadorChaves;
