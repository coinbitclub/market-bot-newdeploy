#!/bin/bash

# 🚀 COINBITCLUB ENTERPRISE - SCRIPT DE DEPLOY HOSTINGER
# =====================================================
# 
# Script automatizado para deploy no servidor Hostinger
# Inclui: Setup do banco, configuração do ambiente e deploy
# 
# Uso: ./deploy-hostinger.sh [ENVIRONMENT]
# Exemplo: ./deploy-hostinger.sh production

set -e  # Parar em caso de erro

# ============================================
# CONFIGURAÇÕES INICIAIS
# ============================================

ENVIRONMENT=${1:-production}
PROJECT_NAME="coinbitclub-enterprise"
APP_DIR="/home/usuario/$PROJECT_NAME"
BACKUP_DIR="/home/usuario/backups"
LOG_FILE="/tmp/deploy-${PROJECT_NAME}-$(date +%Y%m%d-%H%M%S).log"

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ============================================
# FUNÇÕES AUXILIARES
# ============================================

log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

success() {
    echo -e "${GREEN}✅ $1${NC}" | tee -a "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}❌ $1${NC}" | tee -a "$LOG_FILE"
    exit 1
}

# Verificar se comando existe
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# ============================================
# VERIFICAÇÕES PRÉ-DEPLOY
# ============================================

pre_deploy_checks() {
    log "🔍 Executando verificações pré-deploy..."
    
    # Verificar se está rodando como usuário correto
    if [ "$EUID" -eq 0 ]; then
        error "Não execute este script como root!"
    fi
    
    # Verificar Node.js
    if ! command_exists node; then
        error "Node.js não está instalado!"
    fi
    
    local node_version=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$node_version" -lt 18 ]; then
        error "Node.js versão 18+ é necessária. Versão atual: $(node --version)"
    fi
    
    # Verificar npm
    if ! command_exists npm; then
        error "npm não está instalado!"
    fi
    
    # Verificar PostgreSQL
    if ! command_exists psql; then
        warning "psql não encontrado. Instale postgresql-client se necessário."
    fi
    
    # Verificar arquivos essenciais
    if [ ! -f "package.json" ]; then
        error "package.json não encontrado! Execute o script na raiz do projeto."
    fi
    
    if [ ! -f "enterprise-orchestrator.js" ]; then
        error "enterprise-orchestrator.js não encontrado!"
    fi
    
    if [ ! -f "scripts/database/complete-database-schema.sql" ]; then
        error "Schema do banco não encontrado!"
    fi
    
    success "Verificações pré-deploy concluídas"
}

# ============================================
# CONFIGURAÇÃO DO AMBIENTE
# ============================================

setup_environment() {
    log "🔧 Configurando ambiente $ENVIRONMENT..."
    
    # Criar diretórios necessários
    mkdir -p "$BACKUP_DIR"
    mkdir -p logs
    mkdir -p tmp
    
    # Verificar se arquivo .env existe
    if [ ! -f ".env.production" ]; then
        if [ -f ".env.production.example" ]; then
            log "Copiando .env.production.example para .env.production"
            cp .env.production.example .env.production
            warning "Configure as variáveis em .env.production antes de continuar!"
            warning "Pressione ENTER após configurar as variáveis..."
            read
        else
            error "Arquivo .env.production não encontrado!"
        fi
    fi
    
    # Validar variáveis críticas
    if [ -f ".env.production" ]; then
        source .env.production
        
        if [ -z "$DATABASE_URL" ]; then
            error "DATABASE_URL não configurada em .env.production"
        fi
        
        if [ -z "$JWT_SECRET" ]; then
            error "JWT_SECRET não configurada em .env.production"
        fi
        
        if [ "$NODE_ENV" != "production" ]; then
            warning "NODE_ENV não está definido como 'production'"
        fi
    fi
    
    success "Ambiente configurado"
}

# ============================================
# INSTALAÇÃO DE DEPENDÊNCIAS
# ============================================

install_dependencies() {
    log "📦 Instalando dependências..."
    
    # Backup do package-lock.json se existir
    if [ -f "package-lock.json" ]; then
        cp package-lock.json "$BACKUP_DIR/package-lock.backup.$(date +%Y%m%d-%H%M%S).json"
    fi
    
    # Limpar cache do npm
    npm cache clean --force
    
    # Instalar dependências de produção
    if [ "$ENVIRONMENT" = "production" ]; then
        npm ci --only=production
    else
        npm install
    fi
    
    success "Dependências instaladas"
}

# ============================================
# CONFIGURAÇÃO DO BANCO DE DADOS
# ============================================

setup_database() {
    log "🗄️  Configurando banco de dados..."
    
    # Carregar variáveis de ambiente
    source .env.production
    
    # Extrair dados da DATABASE_URL
    # Formato: postgresql://usuario:senha@host:porta/database
    DB_HOST=$(echo "$DATABASE_URL" | sed -n 's/.*@\([^:]*\):.*/\1/p')
    DB_PORT=$(echo "$DATABASE_URL" | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
    DB_NAME=$(echo "$DATABASE_URL" | sed -n 's/.*\/\([^?]*\).*/\1/p')
    DB_USER=$(echo "$DATABASE_URL" | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
    DB_PASS=$(echo "$DATABASE_URL" | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')
    
    log "Conectando ao banco: $DB_HOST:$DB_PORT/$DB_NAME"
    
    # Testar conexão
    if ! PGPASSWORD="$DB_PASS" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT version();" >/dev/null 2>&1; then
        error "Falha ao conectar com o banco de dados. Verifique as configurações."
    fi
    
    # Fazer backup se o banco já existir
    log "Criando backup do banco..."
    PGPASSWORD="$DB_PASS" pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" > "$BACKUP_DIR/db-backup-$(date +%Y%m%d-%H%M%S).sql" 2>/dev/null || warning "Backup do banco falhou (banco pode estar vazio)"
    
    # Executar schema
    log "Executando schema do banco..."
    if PGPASSWORD="$DB_PASS" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "scripts/database/complete-database-schema.sql" >/dev/null 2>&1; then
        success "Schema do banco executado com sucesso"
    else
        warning "Erro ao executar schema (pode ser que já exista)"
    fi
    
    # Verificar se as tabelas foram criadas
    TABLE_COUNT=$(PGPASSWORD="$DB_PASS" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | tr -d ' ')
    
    if [ "$TABLE_COUNT" -ge 10 ]; then
        success "Banco configurado com $TABLE_COUNT tabelas"
    else
        error "Banco não foi configurado corretamente (apenas $TABLE_COUNT tabelas encontradas)"
    fi
}

# ============================================
# BUILD DA APLICAÇÃO
# ============================================

build_application() {
    log "🏗️  Fazendo build da aplicação..."
    
    # Se existir script de build
    if grep -q '"build"' package.json; then
        npm run build
    fi
    
    # Verificar arquivos críticos
    if [ ! -f "enterprise-orchestrator.js" ]; then
        error "Arquivo principal enterprise-orchestrator.js não encontrado!"
    fi
    
    # Verificar estrutura de diretórios
    if [ ! -d "src" ]; then
        error "Diretório src/ não encontrado!"
    fi
    
    success "Build concluído"
}

# ============================================
# CONFIGURAÇÃO DO PM2
# ============================================

setup_pm2() {
    log "⚙️  Configurando PM2..."
    
    # Instalar PM2 se não existir
    if ! command_exists pm2; then
        npm install -g pm2
    fi
    
    # Criar arquivo de configuração do PM2
    cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: '$PROJECT_NAME',
    script: 'enterprise-orchestrator.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: '$ENVIRONMENT',
      PORT: 3000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: 'logs/pm2-error.log',
    out_file: 'logs/pm2-out.log',
    log_file: 'logs/pm2.log',
    max_memory_restart: '2G',
    node_args: '--max-old-space-size=4096',
    watch: false,
    ignore_watch: ['node_modules', 'logs', 'tmp'],
    max_restarts: 10,
    min_uptime: '10s'
  }]
};
EOF
    
    success "PM2 configurado"
}

# ============================================
# DEPLOY DA APLICAÇÃO
# ============================================

deploy_application() {
    log "🚀 Fazendo deploy da aplicação..."
    
    # Parar aplicação se estiver rodando
    if pm2 list | grep -q "$PROJECT_NAME"; then
        log "Parando aplicação existente..."
        pm2 stop "$PROJECT_NAME" || true
        pm2 delete "$PROJECT_NAME" || true
    fi
    
    # Iniciar aplicação
    log "Iniciando aplicação..."
    pm2 start ecosystem.config.js --env "$ENVIRONMENT"
    
    # Salvar configuração do PM2
    pm2 save
    
    # Configurar auto-start
    pm2 startup systemd -u "$USER" --hp "$HOME" || warning "Falha ao configurar auto-start do PM2"
    
    success "Aplicação deployada com PM2"
}

# ============================================
# VERIFICAÇÕES PÓS-DEPLOY
# ============================================

post_deploy_checks() {
    log "🔍 Executando verificações pós-deploy..."
    
    # Aguardar aplicação iniciar
    sleep 10
    
    # Verificar se PM2 está rodando
    if ! pm2 list | grep -q "$PROJECT_NAME"; then
        error "Aplicação não está rodando no PM2!"
    fi
    
    # Verificar se a aplicação está respondendo
    local health_url="http://localhost:3000/health"
    local max_attempts=30
    local attempt=1
    
    log "Testando endpoint de saúde: $health_url"
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s -f "$health_url" >/dev/null 2>&1; then
            success "Aplicação está respondendo!"
            break
        fi
        
        if [ $attempt -eq $max_attempts ]; then
            error "Aplicação não está respondendo após $max_attempts tentativas"
        fi
        
        log "Tentativa $attempt/$max_attempts - aguardando..."
        sleep 2
        ((attempt++))
    done
    
    # Mostrar status da aplicação
    pm2 show "$PROJECT_NAME"
    
    success "Verificações pós-deploy concluídas"
}

# ============================================
# CONFIGURAÇÃO DE MONITORAMENTO
# ============================================

setup_monitoring() {
    log "📊 Configurando monitoramento..."
    
    # Configurar rotação de logs
    cat > logrotate.conf << EOF
logs/*.log {
    daily
    missingok
    rotate 30
    compress
    notifempty
    create 644 $USER $USER
    postrotate
        pm2 reload all
    endscript
}
EOF
    
    # Criar script de health check
    cat > health-check.sh << EOF
#!/bin/bash
URL="http://localhost:3000/health"
if ! curl -s -f "\$URL" >/dev/null 2>&1; then
    echo "\$(date): Health check failed for \$URL" >> logs/health-check.log
    pm2 restart $PROJECT_NAME
fi
EOF
    
    chmod +x health-check.sh
    
    # Adicionar ao crontab se não existir
    if ! crontab -l 2>/dev/null | grep -q "health-check.sh"; then
        (crontab -l 2>/dev/null; echo "*/5 * * * * $PWD/health-check.sh") | crontab -
        success "Health check adicionado ao crontab"
    fi
    
    success "Monitoramento configurado"
}

# ============================================
# LIMPEZA PÓS-DEPLOY
# ============================================

cleanup() {
    log "🧹 Fazendo limpeza..."
    
    # Limpar arquivos temporários
    rm -rf tmp/*
    
    # Limpar cache do npm
    npm cache clean --force
    
    # Compactar logs antigos
    find logs/ -name "*.log" -mtime +7 -exec gzip {} \;
    
    success "Limpeza concluída"
}

# ============================================
# FUNÇÃO PRINCIPAL
# ============================================

main() {
    log "🚀 Iniciando deploy do CoinBitClub Enterprise v6.0.0"
    log "Ambiente: $ENVIRONMENT"
    log "Log: $LOG_FILE"
    
    # Executar etapas do deploy
    pre_deploy_checks
    setup_environment
    install_dependencies
    setup_database
    build_application
    setup_pm2
    deploy_application
    post_deploy_checks
    setup_monitoring
    cleanup
    
    success "🎉 Deploy concluído com sucesso!"
    
    echo ""
    echo "==============================================="
    echo "🚀 CoinBitClub Enterprise Deploy Completo!"
    echo "==============================================="
    echo ""
    echo "📊 Status da Aplicação:"
    pm2 list
    echo ""
    echo "📝 Logs importantes:"
    echo "   - Deploy: $LOG_FILE"
    echo "   - Aplicação: logs/pm2.log"
    echo "   - Erros: logs/pm2-error.log"
    echo ""
    echo "🔗 URLs de teste:"
    echo "   - Health: http://localhost:3000/health"
    echo "   - API: http://localhost:3000/api/enterprise/status"
    echo "   - Dashboard: http://localhost:3000/dashboard"
    echo ""
    echo "⚙️  Comandos úteis:"
    echo "   - Ver logs: pm2 logs $PROJECT_NAME"
    echo "   - Restart: pm2 restart $PROJECT_NAME"
    echo "   - Status: pm2 show $PROJECT_NAME"
    echo "   - Monitoramento: pm2 monit"
    echo ""
    success "Sistema pronto para uso! 🎯"
}

# ============================================
# TRATAMENTO DE ERROS
# ============================================

trap 'error "Deploy interrompido"' INT TERM

# ============================================
# EXECUTAR SCRIPT
# ============================================

# Verificar se está na raiz do projeto
if [ ! -f "package.json" ] || [ ! -f "enterprise-orchestrator.js" ]; then
    error "Execute este script na raiz do projeto CoinBitClub Enterprise"
fi

# Executar deploy
main "$@"
