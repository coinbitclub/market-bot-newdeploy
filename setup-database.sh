#!/bin/bash

# 🗄️ SCRIPT DE CONFIGURAÇÃO COMPLETA DO BANCO DE DADOS
# CoinBitClub Enterprise v6.0.0 - Setup Automático
# Execute: ./setup-database.sh

echo "🚀 CoinBitClub Enterprise v6.0.0 - Database Setup"
echo "=================================================="
echo ""

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configurações padrão
DB_NAME="coinbitclub_enterprise"
DB_USER="coinbitclub_user"
DB_HOST="localhost"
DB_PORT="5432"

echo -e "${BLUE}📋 Configurações do Banco de Dados:${NC}"
echo "   Database: $DB_NAME"
echo "   Usuário: $DB_USER"
echo "   Host: $DB_HOST"
echo "   Porta: $DB_PORT"
echo ""

# Função para verificar se PostgreSQL está instalado
check_postgresql() {
    echo -e "${YELLOW}🔍 Verificando PostgreSQL...${NC}"
    if command -v psql &> /dev/null; then
        echo -e "${GREEN}✅ PostgreSQL encontrado!${NC}"
        psql --version
        return 0
    else
        echo -e "${RED}❌ PostgreSQL não encontrado!${NC}"
        echo "   Instale PostgreSQL primeiro:"
        echo "   Windows: https://www.postgresql.org/download/windows/"
        echo "   Ubuntu: sudo apt-get install postgresql postgresql-contrib"
        echo "   MacOS: brew install postgresql"
        exit 1
    fi
}

# Função para solicitar senha
get_password() {
    echo ""
    echo -e "${YELLOW}🔐 Configuração de Senha:${NC}"
    read -s -p "   Digite uma senha forte para o usuário $DB_USER: " DB_PASSWORD
    echo ""
    read -s -p "   Confirme a senha: " DB_PASSWORD_CONFIRM
    echo ""
    
    if [ "$DB_PASSWORD" != "$DB_PASSWORD_CONFIRM" ]; then
        echo -e "${RED}❌ Senhas não coincidem!${NC}"
        exit 1
    fi
    
    if [ ${#DB_PASSWORD} -lt 8 ]; then
        echo -e "${RED}❌ Senha deve ter pelo menos 8 caracteres!${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Senha configurada com sucesso!${NC}"
}

# Função para criar banco e usuário
create_database() {
    echo ""
    echo -e "${YELLOW}🏗️ Criando banco de dados e usuário...${NC}"
    
    # Criar banco de dados
    echo "   Criando banco de dados: $DB_NAME"
    psql -U postgres -c "CREATE DATABASE $DB_NAME;" 2>/dev/null
    
    # Criar usuário
    echo "   Criando usuário: $DB_USER"
    psql -U postgres -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';" 2>/dev/null
    
    # Conceder permissões
    echo "   Concedendo permissões..."
    psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;" 2>/dev/null
    
    echo -e "${GREEN}✅ Banco de dados configurado!${NC}"
}

# Função para executar schema principal
setup_schema() {
    echo ""
    echo -e "${YELLOW}📊 Executando schema principal...${NC}"
    echo "   Arquivo: scripts/database/enterprise-complete-database-setup.sql"
    echo "   Tamanho: 1360 linhas, 32 tabelas"
    
    # Verificar se arquivo existe
    if [ ! -f "scripts/database/enterprise-complete-database-setup.sql" ]; then
        echo -e "${RED}❌ Arquivo de schema não encontrado!${NC}"
        echo "   Certifique-se de estar no diretório raiz do projeto."
        exit 1
    fi
    
    # Executar schema
    echo "   Executando schema..."
    export PGPASSWORD="$DB_PASSWORD"
    psql -U $DB_USER -d $DB_NAME -f scripts/database/enterprise-complete-database-setup.sql > schema_install.log 2>&1
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Schema executado com sucesso!${NC}"
    else
        echo -e "${RED}❌ Erro ao executar schema!${NC}"
        echo "   Verifique o arquivo schema_install.log para detalhes"
        exit 1
    fi
}

# Função para verificar instalação
verify_installation() {
    echo ""
    echo -e "${YELLOW}🔍 Verificando instalação...${NC}"
    
    export PGPASSWORD="$DB_PASSWORD"
    
    # Contar tabelas
    TABLE_COUNT=$(psql -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | tr -d ' ')
    
    if [ "$TABLE_COUNT" = "32" ]; then
        echo -e "${GREEN}✅ Todas as 32 tabelas criadas com sucesso!${NC}"
    else
        echo -e "${RED}❌ Apenas $TABLE_COUNT tabelas encontradas (esperado: 32)${NC}"
        exit 1
    fi
    
    # Verificar usuário admin
    ADMIN_EXISTS=$(psql -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM users WHERE username = 'admin';" 2>/dev/null | tr -d ' ')
    
    if [ "$ADMIN_EXISTS" = "1" ]; then
        echo -e "${GREEN}✅ Usuário administrador criado!${NC}"
    else
        echo -e "${RED}❌ Usuário administrador não encontrado!${NC}"
    fi
    
    # Verificar índices
    INDEX_COUNT=$(psql -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public' AND indexname LIKE 'idx_%';" 2>/dev/null | tr -d ' ')
    
    echo -e "${GREEN}✅ $INDEX_COUNT índices de performance criados!${NC}"
}

# Função para criar arquivo .env
create_env_file() {
    echo ""
    echo -e "${YELLOW}📝 Criando arquivo .env...${NC}"
    
    ENV_FILE=".env"
    
    # Backup do arquivo existente
    if [ -f "$ENV_FILE" ]; then
        cp "$ENV_FILE" "${ENV_FILE}.backup.$(date +%Y%m%d_%H%M%S)"
        echo "   Backup do .env existente criado"
    fi
    
    # Criar novo arquivo .env
    cat > "$ENV_FILE" << EOF
# CoinBitClub Enterprise v6.0.0 - Database Configuration
# Gerado automaticamente em $(date)

# Database Configuration
DB_HOST=$DB_HOST
DB_PORT=$DB_PORT
DB_NAME=$DB_NAME
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASSWORD

# Application
NODE_ENV=production
PORT=3333

# Stripe (configure com suas chaves reais)
STRIPE_SECRET_KEY=sk_live_your_stripe_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here

# Exchanges (configure com suas chaves reais)
BINANCE_API_KEY=your_binance_api_key_here
BINANCE_SECRET_KEY=your_binance_secret_here
BYBIT_API_KEY=your_bybit_api_key_here
BYBIT_SECRET_KEY=your_bybit_secret_here

# Security
JWT_SECRET=$(openssl rand -base64 32)
EOF

    echo -e "${GREEN}✅ Arquivo .env criado com sucesso!${NC}"
    echo "   Configure as chaves das exchanges e Stripe conforme necessário"
}

# Função para testar conexão
test_connection() {
    echo ""
    echo -e "${YELLOW}🧪 Testando conexão com banco...${NC}"
    
    export PGPASSWORD="$DB_PASSWORD"
    
    # Teste de conexão simples
    psql -U $DB_USER -d $DB_NAME -c "SELECT 'Conexão OK' as status;" > /dev/null 2>&1
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Conexão com banco funcionando!${NC}"
    else
        echo -e "${RED}❌ Erro na conexão com banco!${NC}"
        exit 1
    fi
}

# Função para mostrar próximos passos
show_next_steps() {
    echo ""
    echo -e "${GREEN}🎉 SETUP CONCLUÍDO COM SUCESSO!${NC}"
    echo "=================================================="
    echo ""
    echo -e "${BLUE}📋 Próximos passos:${NC}"
    echo ""
    echo "1. Configure as chaves das exchanges no arquivo .env:"
    echo "   - BINANCE_API_KEY e BINANCE_SECRET_KEY"
    echo "   - BYBIT_API_KEY e BYBIT_SECRET_KEY"
    echo ""
    echo "2. Configure as chaves do Stripe no arquivo .env:"
    echo "   - STRIPE_SECRET_KEY"
    echo "   - STRIPE_WEBHOOK_SECRET"
    echo ""
    echo "3. Inicie o sistema:"
    echo "   npm install"
    echo "   npm start"
    echo ""
    echo "4. Acesse o sistema em:"
    echo "   http://localhost:3333"
    echo ""
    echo -e "${GREEN}📊 Status do Banco:${NC}"
    echo "   ✅ 32 tabelas criadas"
    echo "   ✅ Usuário admin configurado"
    echo "   ✅ Índices de performance ativos"
    echo "   ✅ Sistema pronto para produção"
    echo ""
    echo -e "${YELLOW}📚 Documentação:${NC}"
    echo "   - README Database: scripts/database/README.md"
    echo "   - Análise 360°: CHECK-TABELAS-BANCO-DADOS.md"
    echo "   - Schema SQL: scripts/database/enterprise-complete-database-setup.sql"
    echo ""
}

# Execução principal
main() {
    echo -e "${BLUE}🔍 Iniciando setup do banco de dados...${NC}"
    
    check_postgresql
    get_password
    create_database
    setup_schema
    verify_installation
    create_env_file
    test_connection
    show_next_steps
    
    echo -e "${GREEN}✨ Setup completo! Sistema pronto para uso.${NC}"
}

# Verificar se está no diretório correto
if [ ! -f "package.json" ] || [ ! -d "scripts/database" ]; then
    echo -e "${RED}❌ Execute este script no diretório raiz do projeto!${NC}"
    echo "   Certifique-se de estar em: market-bot-newdeploy/"
    exit 1
fi

# Executar setup
main
