#!/bin/bash
# 🇱🇹 COINBITCLUB ENTERPRISE - DEPLOY HOSTINGER VPS
# ============================================================================
# Script de deploy automatizado para servidor Hostinger Lituânia
# VPS: 31.97.72.77 | Vilnius | Docker Swarm Mode
# Data: 2025-09-03
# ============================================================================

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Informações do servidor
VPS_IP="31.97.72.77"
VPS_USER="root"
VPS_HOST="srv987989.hstgr.cloud"
DOMAIN="coinbitclub.com"
APP_NAME="coinbitclub-enterprise"

# Função para logging
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}"
    exit 1
}

# Verificar se .env.production existe
check_env_file() {
    log "Verificando arquivo de ambiente..."
    
    if [ ! -f ".env.production" ]; then
        warning "Arquivo .env.production não encontrado!"
        log "Criando .env.production a partir do template..."
        
        if [ -f ".env.production.example" ]; then
            cp .env.production.example .env.production
            warning "Configure as variáveis em .env.production antes de continuar!"
            warning "Principalmente: POSTGRES_PASSWORD, JWT_SECRET, API KEYS"
            read -p "Pressione Enter após configurar o .env.production..."
        else
            error "Template .env.production.example não encontrado!"
        fi
    fi
    
    success "Arquivo .env.production encontrado"
}

# Verificar dependências locais
check_dependencies() {
    log "Verificando dependências..."
    
    command -v docker >/dev/null 2>&1 || error "Docker não está instalado!"
    command -v docker-compose >/dev/null 2>&1 || error "Docker Compose não está instalado!"
    command -v ssh >/dev/null 2>&1 || error "SSH não está instalado!"
    
    success "Todas as dependências estão instaladas"
}

# Preparar arquivos para deploy
prepare_files() {
    log "Preparando arquivos para deploy..."
    
    # Criar diretório de deploy
    mkdir -p deploy-package
    
    # Copiar arquivos essenciais
    cp -r src deploy-package/
    cp -r config deploy-package/
    cp -r scripts deploy-package/
    cp package*.json deploy-package/
    cp Dockerfile.production deploy-package/Dockerfile
    cp docker-compose.hostinger.yml deploy-package/docker-compose.yml
    cp .env.production deploy-package/
    cp enterprise-orchestrator.js deploy-package/
    
    # Criar arquivo de versão
    echo "6.0.0" > deploy-package/VERSION
    echo "$(date -u +%Y-%m-%dT%H:%M:%S)Z" > deploy-package/BUILD_DATE
    
    # Criar tar.gz para upload
    tar -czf coinbitclub-enterprise-v6.tar.gz -C deploy-package .
    
    success "Arquivos preparados: coinbitclub-enterprise-v6.tar.gz"
}

# Conectar ao servidor e preparar ambiente
setup_server() {
    log "Configurando servidor Hostinger..."
    
    ssh $VPS_USER@$VPS_IP << 'EOF'
        # Atualizar sistema
        apt update && apt upgrade -y
        
        # Instalar Docker e Docker Compose
        if ! command -v docker &> /dev/null; then
            curl -fsSL https://get.docker.com -o get-docker.sh
            sh get-docker.sh
            usermod -aG docker $USER
        fi
        
        if ! command -v docker-compose &> /dev/null; then
            curl -L "https://github.com/docker/compose/releases/download/v2.21.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
            chmod +x /usr/local/bin/docker-compose
        fi
        
        # Criar diretórios da aplicação
        mkdir -p /opt/coinbitclub
        mkdir -p /var/lib/coinbitclub/{postgres,redis,prometheus,grafana}
        mkdir -p /var/log/coinbitclub
        mkdir -p /var/backups/coinbitclub
        
        # Configurar firewall
        ufw allow 22/tcp
        ufw allow 80/tcp
        ufw allow 443/tcp
        ufw allow 3000/tcp
        ufw allow 5432/tcp
        ufw allow 6379/tcp
        ufw --force enable
        
        echo "✅ Servidor configurado com sucesso!"
EOF
    
    success "Servidor Hostinger configurado"
}

# Fazer upload dos arquivos
upload_files() {
    log "Fazendo upload dos arquivos..."
    
    scp coinbitclub-enterprise-v6.tar.gz $VPS_USER@$VPS_IP:/opt/coinbitclub/
    
    ssh $VPS_USER@$VPS_IP << 'EOF'
        cd /opt/coinbitclub
        tar -xzf coinbitclub-enterprise-v6.tar.gz
        rm coinbitclub-enterprise-v6.tar.gz
        chown -R root:root /opt/coinbitclub
        chmod +x scripts/*.sh
EOF
    
    success "Arquivos enviados para o servidor"
}

# Configurar certificados SSL
setup_ssl() {
    log "Configurando certificados SSL..."
    
    ssh $VPS_USER@$VPS_IP << EOF
        cd /opt/coinbitclub
        
        # Instalar Certbot
        apt install -y certbot
        
        # Gerar certificados Let's Encrypt
        certbot certonly --standalone -d $DOMAIN -d www.$DOMAIN --email admin@$DOMAIN --agree-tos --non-interactive
        
        # Copiar certificados para diretório do Docker
        mkdir -p config/nginx/ssl
        cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem config/nginx/ssl/cert.pem
        cp /etc/letsencrypt/live/$DOMAIN/privkey.pem config/nginx/ssl/key.pem
        
        # Configurar renovação automática
        echo "0 12 * * * /usr/bin/certbot renew --quiet" | crontab -
EOF
    
    success "Certificados SSL configurados"
}

# Configurar base de dados
setup_database() {
    log "Configurando base de dados..."
    
    ssh $VPS_USER@$VPS_IP << 'EOF'
        cd /opt/coinbitclub
        
        # Criar configuração do PostgreSQL
        mkdir -p config/postgres
        
        cat > config/postgres/postgresql.conf << 'PGCONF'
# PostgreSQL configuration for production
max_connections = 200
shared_buffers = 4GB
effective_cache_size = 12GB
maintenance_work_mem = 512MB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100
random_page_cost = 1.1
effective_io_concurrency = 200
work_mem = 20MB
min_wal_size = 1GB
max_wal_size = 4GB
max_worker_processes = 8
max_parallel_workers_per_gather = 4
max_parallel_workers = 8
max_parallel_maintenance_workers = 4
PGCONF

        cat > config/postgres/init-db.sh << 'INITDB'
#!/bin/bash
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
    CREATE EXTENSION IF NOT EXISTS "pgcrypto";
EOSQL
INITDB

        chmod +x config/postgres/init-db.sh
EOF
    
    success "Configuração do PostgreSQL criada"
}

# Configurar NGINX
setup_nginx() {
    log "Configurando NGINX..."
    
    ssh $VPS_USER@$VPS_IP << 'EOF'
        cd /opt/coinbitclub
        mkdir -p config/nginx
        
        cat > config/nginx/nginx.conf << 'NGINXCONF'
events {
    worker_connections 1024;
}

http {
    upstream app {
        server app:3000;
    }
    
    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=trading:10m rate=5r/s;
    
    server {
        listen 80;
        server_name coinbitclub.com www.coinbitclub.com;
        return 301 https://$server_name$request_uri;
    }
    
    server {
        listen 443 ssl http2;
        server_name coinbitclub.com www.coinbitclub.com;
        
        ssl_certificate /etc/nginx/ssl/cert.pem;
        ssl_certificate_key /etc/nginx/ssl/key.pem;
        
        # Security headers
        add_header X-Frame-Options DENY;
        add_header X-Content-Type-Options nosniff;
        add_header X-XSS-Protection "1; mode=block";
        
        location / {
            proxy_pass http://app;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
        
        location /api/enterprise/trading/webhooks/ {
            limit_req zone=trading burst=10 nodelay;
            proxy_pass http://app;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }
        
        location /health {
            access_log off;
            return 200 "healthy\n";
            add_header Content-Type text/plain;
        }
    }
}
NGINXCONF
EOF
    
    success "Configuração do NGINX criada"
}

# Deploy da aplicação
deploy_application() {
    log "Fazendo deploy da aplicação..."
    
    ssh $VPS_USER@$VPS_IP << 'EOF'
        cd /opt/coinbitclub
        
        # Parar containers existentes
        docker-compose down || true
        
        # Remover imagens antigas
        docker system prune -f
        
        # Build e start dos containers
        docker-compose up -d --build
        
        # Aguardar inicialização
        sleep 30
        
        # Verificar status
        docker-compose ps
        
        # Verificar logs
        docker-compose logs --tail=50
EOF
    
    success "Aplicação deployada com sucesso!"
}

# Verificar saúde da aplicação
health_check() {
    log "Verificando saúde da aplicação..."
    
    # Aguardar 30 segundos para inicialização completa
    sleep 30
    
    # Testar endpoints principais
    if curl -f "http://$VPS_IP:3000/api/enterprise/status" > /dev/null 2>&1; then
        success "✅ API Status: OK"
    else
        error "❌ API Status: FALHOU"
    fi
    
    if curl -f "http://$VPS_IP/health" > /dev/null 2>&1; then
        success "✅ Load Balancer: OK"
    else
        error "❌ Load Balancer: FALHOU"
    fi
    
    ssh $VPS_USER@$VPS_IP << 'EOF'
        cd /opt/coinbitclub
        
        # Verificar containers
        echo "🐳 Status dos Containers:"
        docker-compose ps
        
        # Verificar logs por erros
        echo "📋 Últimos logs:"
        docker-compose logs --tail=20 app
        
        # Verificar uso de recursos
        echo "💻 Uso de Recursos:"
        docker stats --no-stream
EOF
    
    success "Health check concluído!"
}

# Configurar monitoramento
setup_monitoring() {
    log "Configurando monitoramento..."
    
    ssh $VPS_USER@$VPS_IP << 'EOF'
        cd /opt/coinbitclub
        mkdir -p config/prometheus config/grafana/{dashboards,datasources}
        
        # Prometheus config
        cat > config/prometheus/prometheus.yml << 'PROMCONF'
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'coinbitclub-app'
    static_configs:
      - targets: ['app:3000']
    metrics_path: '/api/metrics'
    scrape_interval: 30s

  - job_name: 'postgresql'
    static_configs:
      - targets: ['postgres:5432']

  - job_name: 'redis'
    static_configs:
      - targets: ['redis:6379']
PROMCONF

        # Grafana datasource
        cat > config/grafana/datasources/prometheus.yml << 'GRAFANADS'
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
GRAFANADS
EOF
    
    success "Monitoramento configurado"
}

# Criar script de backup
setup_backup() {
    log "Configurando sistema de backup..."
    
    ssh $VPS_USER@$VPS_IP << 'EOF'
        cd /opt/coinbitclub
        
        cat > backup.sh << 'BACKUPSCRIPT'
#!/bin/bash
# Backup automatizado CoinBitClub Enterprise

BACKUP_DIR="/var/backups/coinbitclub"
DATE=$(date +%Y%m%d_%H%M%S)

# Backup PostgreSQL
docker exec coinbitclub-postgres pg_dump -U coinbitclub_user coinbitclub_enterprise > $BACKUP_DIR/postgres_$DATE.sql

# Backup Redis
docker exec coinbitclub-redis redis-cli BGSAVE
cp /var/lib/coinbitclub/redis/dump.rdb $BACKUP_DIR/redis_$DATE.rdb

# Backup código
tar -czf $BACKUP_DIR/app_$DATE.tar.gz /opt/coinbitclub

# Limpar backups antigos (manter 7 dias)
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete
find $BACKUP_DIR -name "*.rdb" -mtime +7 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

echo "Backup concluído: $DATE"
BACKUPSCRIPT

        chmod +x backup.sh
        
        # Configurar cron para backup diário às 2:00
        echo "0 2 * * * /opt/coinbitclub/backup.sh" | crontab -
EOF
    
    success "Sistema de backup configurado"
}

# Função principal
main() {
    clear
    echo -e "${BLUE}"
    echo "🇱🇹 ============================================================================"
    echo "   COINBITCLUB ENTERPRISE - DEPLOY HOSTINGER VPS LITUÂNIA"
    echo "   Servidor: $VPS_HOST ($VPS_IP)"
    echo "   Versão: 6.0.0 | Data: $(date +'%Y-%m-%d %H:%M:%S')"
    echo "============================================================================${NC}"
    echo

    log "Iniciando processo de deploy..."
    
    # Executar etapas
    check_env_file
    check_dependencies
    prepare_files
    setup_server
    upload_files
    setup_ssl
    setup_database
    setup_nginx
    setup_monitoring
    setup_backup
    deploy_application
    health_check
    
    echo
    success "🎉 DEPLOY CONCLUÍDO COM SUCESSO!"
    echo
    echo -e "${GREEN}🌐 Aplicação disponível em: https://$DOMAIN${NC}"
    echo -e "${GREEN}📊 Grafana: http://$VPS_IP:3001${NC}"
    echo -e "${GREEN}📈 Prometheus: http://$VPS_IP:9090${NC}"
    echo -e "${GREEN}📋 API Status: https://$DOMAIN/api/enterprise/status${NC}"
    echo
    echo -e "${YELLOW}📝 Próximos passos:${NC}"
    echo "1. Configurar DNS para apontar $DOMAIN para $VPS_IP"
    echo "2. Testar webhook TradingView: https://$DOMAIN/api/enterprise/trading/webhooks/signal"
    echo "3. Configurar APIs reais (Binance, Bybit, Stripe, OpenAI)"
    echo "4. Monitorar logs: ssh $VPS_USER@$VPS_IP 'cd /opt/coinbitclub && docker-compose logs -f'"
    echo
}

# Executar
main "$@"
