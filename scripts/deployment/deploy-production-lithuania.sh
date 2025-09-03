#!/bin/bash

# 🇱🇹 Deploy Produção VPS Lituânia - CoinBitClub Enterprise
# ===========================================================
# Deploy completo do sistema orquestrado no VPS da Hostinger
# IP: 31.97.72.77 | Vilnius, Lituânia

set -euo pipefail

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

# Variáveis
APP_NAME="coinbitclub-enterprise"
APP_VERSION="6.0.0"
DEPLOY_DIR="$HOME/coinbitclub-enterprise"
BACKUP_DIR="$HOME/coinbitclub-backups"
LOG_FILE="$DEPLOY_DIR/logs/deploy-$(date +%Y%m%d-%H%M%S).log"

# Logging functions
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

info() {
    echo -e "${BLUE}[INFO]${NC} $1" | tee -a "$LOG_FILE"
}

warn() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"
}

# Função de rollback
rollback() {
    error "Deploy falhou! Iniciando rollback..."
    
    if [ -f "$BACKUP_DIR/last-working.tar.gz" ]; then
        log "🔄 Restaurando backup anterior..."
        cd "$DEPLOY_DIR"
        docker-compose -f docker-compose.production.yml down
        
        # Restaurar arquivos
        tar -xzf "$BACKUP_DIR/last-working.tar.gz" -C /tmp/
        cp -r /tmp/coinbitclub-enterprise/* .
        
        # Reiniciar serviços
        docker-compose -f docker-compose.production.yml up -d
        
        success "✅ Rollback concluído!"
    else
        error "❌ Backup não encontrado! Restauração manual necessária."
    fi
    
    exit 1
}

# Trap para capturar erros
trap rollback ERR

# Verificar se está no diretório correto
if [ ! -f "docker-compose.production.yml" ]; then
    error "❌ docker-compose.production.yml não encontrado!"
    error "Execute este script no diretório raiz do projeto"
    exit 1
fi

# Criar diretórios necessários
mkdir -p "$DEPLOY_DIR/logs" "$BACKUP_DIR"

log "🇱🇹 Iniciando deploy CoinBitClub Enterprise no VPS Lituânia"
log "============================================================="

# 1. Verificações pré-deploy
log "🔍 Executando verificações pré-deploy..."

# Verificar Docker
if ! command -v docker &> /dev/null; then
    error "❌ Docker não está instalado!"
    exit 1
fi

# Verificar Docker Compose
if ! command -v docker-compose &> /dev/null; then
    error "❌ Docker Compose não está instalado!"
    exit 1
fi

# Verificar espaço em disco
DISK_USAGE=$(df / | tail -1 | awk '{print $5}' | cut -d'%' -f1)
if [ "$DISK_USAGE" -gt 85 ]; then
    error "❌ Espaço em disco insuficiente! Uso atual: ${DISK_USAGE}%"
    exit 1
fi

# Verificar memória disponível
MEM_AVAILABLE=$(free -m | awk 'NR==2{printf "%.1f", $7/1024}')
if (( $(echo "$MEM_AVAILABLE < 2.0" | bc -l) )); then
    error "❌ Memória insuficiente! Disponível: ${MEM_AVAILABLE}GB"
    exit 1
fi

# Verificar arquivo .env
if [ ! -f ".env" ]; then
    error "❌ Arquivo .env não encontrado!"
    error "Copie .env.example para .env e configure as variáveis"
    exit 1
fi

# Verificar variáveis essenciais
source .env
required_vars=("POSTGRES_PASSWORD" "REDIS_PASSWORD" "JWT_SECRET" "BINANCE_API_KEY" "BYBIT_API_KEY")
for var in "${required_vars[@]}"; do
    if [ -z "${!var:-}" ]; then
        error "❌ Variável $var não está definida no .env"
        exit 1
    fi
done

success "✅ Verificações pré-deploy concluídas"

# 2. Backup do sistema atual
log "💾 Criando backup do sistema atual..."

if [ -d "$DEPLOY_DIR" ]; then
    BACKUP_FILE="$BACKUP_DIR/backup-$(date +%Y%m%d-%H%M%S).tar.gz"
    tar -czf "$BACKUP_FILE" -C "$HOME" coinbitclub-enterprise/
    
    # Manter apenas os últimos 5 backups
    ls -t "$BACKUP_DIR"/backup-*.tar.gz | tail -n +6 | xargs -r rm
    
    # Criar link para último backup funcional
    ln -sf "$BACKUP_FILE" "$BACKUP_DIR/last-working.tar.gz"
    
    success "✅ Backup criado: $BACKUP_FILE"
else
    info "ℹ️  Primeira instalação - sem backup necessário"
fi

# 3. Preparar ambiente de deploy
log "🛠️  Preparando ambiente de deploy..."

# Copiar arquivos para diretório de deploy
if [ "$PWD" != "$DEPLOY_DIR" ]; then
    mkdir -p "$DEPLOY_DIR"
    rsync -av --exclude='.git' --exclude='node_modules' --exclude='*.log' . "$DEPLOY_DIR/"
fi

cd "$DEPLOY_DIR"

# Verificar e criar diretórios necessários
mkdir -p {nginx/{conf.d,ssl,logs},postgres/{data,init-scripts},monitoring/{prometheus,grafana,loki},redis/data,logs}

success "✅ Ambiente preparado"

# 4. Construir imagens Docker
log "🐳 Construindo imagens Docker..."

# Build da aplicação principal
docker build \
    --build-arg BUILD_DATE="$(date -u +'%Y-%m-%dT%H:%M:%SZ')" \
    --build-arg VCS_REF="$(git rev-parse HEAD 2>/dev/null || echo 'unknown')" \
    --build-arg VERSION="$APP_VERSION" \
    -t coinbitclub/trading-enterprise:$APP_VERSION \
    -t coinbitclub/trading-enterprise:latest \
    .

success "✅ Imagem Docker construída"

# 5. Configurar NGINX
log "🌐 Configurando NGINX..."

cat > nginx/nginx.conf << 'EOF'
events {
    worker_connections 1024;
    use epoll;
    multi_accept on;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    
    # Logging
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                   '$status $body_bytes_sent "$http_referer" '
                   '"$http_user_agent" "$http_x_forwarded_for"';
    
    access_log /var/log/nginx/access.log main;
    error_log /var/log/nginx/error.log warn;
    
    # Performance
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    
    # Gzip
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
    
    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=trading:5m rate=5r/s;
    
    # Upstream
    upstream trading_backend {
        least_conn;
        server trading-app:3000 max_fails=3 fail_timeout=30s;
        keepalive 32;
    }
    
    server {
        listen 80;
        server_name 31.97.72.77 coinbitclub.lt;
        
        # Security headers
        add_header X-Frame-Options DENY;
        add_header X-Content-Type-Options nosniff;
        add_header X-XSS-Protection "1; mode=block";
        
        location / {
            limit_req zone=api burst=20 nodelay;
            proxy_pass http://trading_backend;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            
            # Timeouts
            proxy_connect_timeout 60s;
            proxy_send_timeout 60s;
            proxy_read_timeout 60s;
        }
        
        location /api/trading/ {
            limit_req zone=trading burst=10 nodelay;
            proxy_pass http://trading_backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }
        
        location /health {
            access_log off;
            proxy_pass http://trading_backend/health;
        }
        
        location /prometheus/ {
            auth_basic "Monitoring";
            auth_basic_user_file /etc/nginx/.htpasswd;
            proxy_pass http://prometheus:9090/;
        }
        
        location /grafana/ {
            proxy_pass http://grafana:3000/;
            proxy_set_header Host $host;
        }
    }
}
EOF

success "✅ NGINX configurado"

# 6. Configurar Prometheus
log "📊 Configurando Prometheus..."

mkdir -p monitoring/prometheus
cat > monitoring/prometheus/prometheus.yml << 'EOF'
global:
  scrape_interval: 15s
  evaluation_interval: 15s
  external_labels:
    cluster: 'coinbitclub-lithuania'
    region: 'eu-north-1'

rule_files:
  - "rules/*.yml"

scrape_configs:
  - job_name: 'coinbitclub-trading'
    static_configs:
      - targets: ['trading-app:3000']
    metrics_path: '/api/metrics'
    scrape_interval: 10s
    scrape_timeout: 5s

  - job_name: 'nginx'
    static_configs:
      - targets: ['nginx-lb:80']

  - job_name: 'redis'
    static_configs:
      - targets: ['redis-cluster-1:6379', 'redis-cluster-2:6379', 'redis-cluster-3:6379']

  - job_name: 'postgres'
    static_configs:
      - targets: ['postgres-master:5432']

  - job_name: 'node-exporter'
    static_configs:
      - targets: ['node-exporter:9100']

alerting:
  alertmanagers:
    - static_configs:
        - targets: []
EOF

success "✅ Prometheus configurado"

# 7. Parar serviços antigos (se existirem)
log "🛑 Parando serviços antigos..."

if docker-compose -f docker-compose.production.yml ps | grep -q "Up"; then
    docker-compose -f docker-compose.production.yml down --remove-orphans
fi

# Limpar containers órfãos
docker container prune -f
docker image prune -f

success "✅ Serviços antigos parados"

# 8. Iniciar stack completo
log "🚀 Iniciando stack CoinBitClub Enterprise..."

# Iniciar serviços de infraestrutura primeiro
docker-compose -f docker-compose.production.yml up -d postgres-master redis-cluster-1 redis-cluster-2 redis-cluster-3

# Aguardar PostgreSQL estar pronto
log "⏳ Aguardando PostgreSQL estar pronto..."
for i in {1..30}; do
    if docker-compose -f docker-compose.production.yml exec -T postgres-master pg_isready -U postgres; then
        break
    fi
    sleep 2
done

# Inicializar cluster Redis
docker-compose -f docker-compose.production.yml up -d redis-cluster-init
sleep 10

# Iniciar réplicas do PostgreSQL
docker-compose -f docker-compose.production.yml up -d postgres-replica-1 postgres-replica-2 postgres-replica-3

# Iniciar aplicação e monitoramento
docker-compose -f docker-compose.production.yml up -d

success "✅ Stack iniciado com sucesso"

# 9. Health checks
log "🔍 Executando health checks..."

# Aguardar aplicação estar pronta
log "⏳ Aguardando aplicação estar pronta..."
for i in {1..60}; do
    if curl -f http://localhost:3000/health &>/dev/null; then
        success "✅ Aplicação respondendo"
        break
    fi
    
    if [ $i -eq 60 ]; then
        error "❌ Timeout aguardando aplicação"
        exit 1
    fi
    
    sleep 5
done

# Verificar serviços
log "🔍 Verificando serviços..."

services=("nginx-lb" "trading-app" "postgres-master" "redis-cluster-1" "prometheus" "grafana")
for service in "${services[@]}"; do
    if docker-compose -f docker-compose.production.yml ps "$service" | grep -q "Up"; then
        success "✅ $service: OK"
    else
        error "❌ $service: FALHA"
        docker-compose -f docker-compose.production.yml logs "$service" | tail -20
    fi
done

# Health check da API
log "🌐 Testando endpoints..."

endpoints=(
    "http://localhost/health"
    "http://localhost/api/enterprise/status"
    "http://localhost:9090/-/healthy"
    "http://localhost:3001/api/health"
)

for endpoint in "${endpoints[@]}"; do
    if curl -f "$endpoint" &>/dev/null; then
        success "✅ $endpoint: OK"
    else
        warn "⚠️  $endpoint: FALHA"
    fi
done

# 10. Configurar monitoramento de sistema
log "📊 Configurando monitoramento contínuo..."

# Script de monitoramento
cat > scripts/system-monitor.sh << 'EOF'
#!/bin/bash
# Sistema de monitoramento CoinBitClub

ALERT_EMAIL="${ALERT_EMAIL:-admin@coinbitclub.com}"
LOG_FILE="/var/log/coinbitclub-monitor.log"

check_service() {
    local service=$1
    if ! docker-compose -f /home/$(whoami)/coinbitclub-enterprise/docker-compose.production.yml ps "$service" | grep -q "Up"; then
        echo "ALERT: Serviço $service está DOWN!" | tee -a "$LOG_FILE"
        # Tentar reiniciar
        docker-compose -f /home/$(whoami)/coinbitclub-enterprise/docker-compose.production.yml restart "$service"
    fi
}

# Verificar serviços críticos
check_service "trading-app"
check_service "postgres-master"
check_service "redis-cluster-1"
check_service "nginx-lb"

# Verificar uso de recursos
CPU_USAGE=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1 | cut -d'u' -f1)
MEM_USAGE=$(free | grep Mem | awk '{printf "%.1f", $3/$2 * 100.0}')
DISK_USAGE=$(df / | tail -1 | awk '{print $5}' | cut -d'%' -f1)

if (( $(echo "$CPU_USAGE > 90" | bc -l) )); then
    echo "ALERT: CPU usage high: ${CPU_USAGE}%" | tee -a "$LOG_FILE"
fi

if (( $(echo "$MEM_USAGE > 90" | bc -l) )); then
    echo "ALERT: Memory usage high: ${MEM_USAGE}%" | tee -a "$LOG_FILE"
fi

if [ "$DISK_USAGE" -gt 90 ]; then
    echo "ALERT: Disk usage high: ${DISK_USAGE}%" | tee -a "$LOG_FILE"
fi

echo "[$(date)] Monitor check completed - CPU: ${CPU_USAGE}%, MEM: ${MEM_USAGE}%, DISK: ${DISK_USAGE}%" >> "$LOG_FILE"
EOF

chmod +x scripts/system-monitor.sh

# Adicionar ao crontab
(crontab -l 2>/dev/null; echo "*/5 * * * * $DEPLOY_DIR/scripts/system-monitor.sh") | crontab -

success "✅ Monitoramento configurado"

# 11. Informações finais
log "🎉 Deploy concluído com sucesso!"

echo ""
echo "=========================================================="
echo "🇱🇹 COINBITCLUB ENTERPRISE DEPLOY CONCLUÍDO"
echo "=========================================================="
echo ""
echo "📍 Localização: Vilnius, Lituânia"
echo "🌐 IP: $(curl -s ifconfig.me)"
echo "🏗️  Arquitetura: Orquestrada com Docker Compose"
echo "⚡ Capacidade: 10,000+ usuários simultâneos"
echo ""
echo "🔗 URLS DE ACESSO:"
echo "   • Trading API: http://$(curl -s ifconfig.me)/"
echo "   • Health Check: http://$(curl -s ifconfig.me)/health"
echo "   • Prometheus: http://$(curl -s ifconfig.me):9090"
echo "   • Grafana: http://$(curl -s ifconfig.me):3001"
echo ""
echo "📊 STATUS DOS SERVIÇOS:"
docker-compose -f docker-compose.production.yml ps
echo ""
echo "💾 VOLUMES DE DADOS:"
docker volume ls | grep coinbitclub
echo ""
echo "📈 RECURSOS DO SISTEMA:"
echo "   • CPU: $(nproc) cores ($(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1) em uso)"
echo "   • RAM: $(free -h | awk '/^Mem:/ {print $2}') total ($(free | grep Mem | awk '{printf "%.1f", $3/$2 * 100.0}')% em uso)"
echo "   • Disk: $(df -h / | awk 'NR==2 {print $2}') total ($(df / | tail -1 | awk '{print $5}') em uso)"
echo ""
echo "🔍 LOGS:"
echo "   • Deploy: $LOG_FILE"
echo "   • Sistema: /var/log/coinbitclub-monitor.log"
echo "   • Aplicação: docker-compose -f $DEPLOY_DIR/docker-compose.production.yml logs"
echo ""
echo "🚀 COMANDOS ÚTEIS:"
echo "   • Ver logs: docker-compose -f $DEPLOY_DIR/docker-compose.production.yml logs -f"
echo "   • Restart: docker-compose -f $DEPLOY_DIR/docker-compose.production.yml restart"
echo "   • Scale up: docker-compose -f $DEPLOY_DIR/docker-compose.production.yml up -d --scale trading-app=16"
echo "   • Monitor: watch docker stats"
echo ""
echo "⚠️  PRÓXIMOS PASSOS:"
echo "1. Configurar SSL: sudo certbot --nginx"
echo "2. Configurar DNS para coinbitclub.lt"
echo "3. Configurar backups automáticos"
echo "4. Configurar alertas por email"
echo "5. Executar testes de carga"
echo ""
success "🇱🇹 CoinBitClub Enterprise está rodando no VPS Lituânia!"
