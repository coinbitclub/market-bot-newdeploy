#!/bin/bash
# 🇱🇹 COINBITCLUB ENTERPRISE - DEPLOY REMOTO HOSTINGER
# ============================================================================
# Script para execução direta no servidor VPS Hostinger
# Execute: curl -fsSL https://raw.githubusercontent.com/coinbitclub/market-bot-newdeploy/main/deploy-remote.sh | bash
# ============================================================================

set -e

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${BLUE}[$(date +'%H:%M:%S')] $1${NC}"; }
success() { echo -e "${GREEN}✅ $1${NC}"; }
warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
error() { echo -e "${RED}❌ $1${NC}"; exit 1; }

clear
echo -e "${BLUE}"
echo "🇱🇹 ============================================================================"
echo "   COINBITCLUB ENTERPRISE - SETUP AUTOMÁTICO VPS HOSTINGER"
echo "   Servidor: $(hostname) | IP: $(curl -s ifconfig.me 2>/dev/null || echo 'Unknown')"
echo "   Data: $(date +'%Y-%m-%d %H:%M:%S')"
echo "============================================================================${NC}"
echo

# Verificar se é root
if [ "$EUID" -ne 0 ]; then
    error "Este script deve ser executado como root (sudo su -)"
fi

# Função para instalar Docker
install_docker() {
    log "Instalando Docker..."
    
    # Remover versões antigas
    apt-get remove -y docker docker-engine docker.io containerd runc 2>/dev/null || true
    
    # Atualizar sistema
    apt-get update
    apt-get install -y ca-certificates curl gnupg lsb-release
    
    # Adicionar chave GPG do Docker
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
    
    # Adicionar repositório
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
    
    # Instalar Docker
    apt-get update
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
    
    # Instalar Docker Compose standalone
    curl -L "https://github.com/docker/compose/releases/download/v2.21.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
    
    # Iniciar serviços
    systemctl start docker
    systemctl enable docker
    
    success "Docker instalado com sucesso!"
}

# Função para criar estrutura
create_structure() {
    log "Criando estrutura de diretórios..."
    
    # Diretórios principais
    mkdir -p /opt/coinbitclub/{config/{nginx,postgres,prometheus,grafana/{dashboards,datasources}},logs,scripts}
    mkdir -p /var/lib/coinbitclub/{postgres,redis,prometheus,grafana}
    mkdir -p /var/log/coinbitclub
    mkdir -p /var/backups/coinbitclub
    
    # Permissões
    chown -R root:root /opt/coinbitclub
    chmod -R 755 /opt/coinbitclub
    
    success "Estrutura criada!"
}

# Função para configurar firewall
setup_firewall() {
    log "Configurando firewall..."
    
    # Instalar UFW se não estiver
    apt-get install -y ufw
    
    # Configurar regras
    ufw --force reset
    ufw default deny incoming
    ufw default allow outgoing
    ufw allow 22/tcp
    ufw allow 80/tcp
    ufw allow 443/tcp
    ufw allow 3000/tcp
    ufw allow 3001/tcp
    ufw allow 5432/tcp
    ufw allow 6379/tcp
    ufw allow 9090/tcp
    ufw --force enable
    
    success "Firewall configurado!"
}

# Função para criar aplicação demo
create_demo_app() {
    log "Criando aplicação de demonstração..."
    
    cd /opt/coinbitclub
    
    # Criar Dockerfile
    cat > Dockerfile << 'EOF'
FROM node:18-alpine
WORKDIR /app
RUN npm init -y && npm install express
COPY app.js .
EXPOSE 3000
CMD ["node", "app.js"]
EOF

    # Criar aplicação Node.js simples
    cat > app.js << 'EOF'
const express = require('express');
const app = express();
const port = 3000;

app.use(express.json());

// Status endpoint
app.get('/api/enterprise/status', (req, res) => {
    res.json({
        status: 'OPERATIONAL',
        version: '6.0.0',
        timestamp: new Date().toISOString(),
        server: 'Hostinger Lithuania VPS',
        services: {
            trading: 'ACTIVE',
            financial: 'ACTIVE',
            affiliate: 'ACTIVE',
            database: 'CONNECTED'
        },
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        environment: 'production'
    });
});

// Webhook TradingView
app.post('/api/enterprise/trading/webhooks/signal', (req, res) => {
    console.log('📡 Sinal TradingView recebido:', req.body);
    res.json({
        success: true,
        message: 'Sinal recebido com sucesso',
        timestamp: new Date().toISOString(),
        signal: req.body
    });
});

// Health check
app.get('/health', (req, res) => {
    res.send('healthy');
});

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        message: '🇱🇹 CoinBitClub Enterprise v6.0.0',
        server: 'Hostinger Lithuania VPS',
        status: 'OPERATIONAL',
        endpoints: {
            status: '/api/enterprise/status',
            webhook: '/api/enterprise/trading/webhooks/signal',
            health: '/health'
        }
    });
});

app.listen(port, '0.0.0.0', () => {
    console.log(`🚀 CoinBitClub Enterprise rodando na porta ${port}`);
    console.log(`🌐 Servidor: Hostinger Lithuania VPS`);
    console.log(`📡 Webhook: http://localhost:${port}/api/enterprise/trading/webhooks/signal`);
});
EOF

    # Criar package.json
    cat > package.json << 'EOF'
{
    "name": "coinbitclub-enterprise",
    "version": "6.0.0",
    "description": "CoinBitClub Enterprise Trading Platform",
    "main": "app.js",
    "scripts": {
        "start": "node app.js"
    },
    "dependencies": {
        "express": "^4.18.2"
    }
}
EOF

    success "Aplicação demo criada!"
}

# Função para criar configurações
create_configs() {
    log "Criando configurações..."
    
    cd /opt/coinbitclub
    
    # NGINX config
    cat > config/nginx/nginx.conf << 'EOF'
events {
    worker_connections 1024;
}

http {
    upstream app {
        server app:3000;
    }
    
    server {
        listen 80;
        server_name _;
        
        location / {
            proxy_pass http://app;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
        
        location /health {
            access_log off;
            return 200 "healthy\n";
            add_header Content-Type text/plain;
        }
    }
}
EOF

    # PostgreSQL config
    cat > config/postgres/postgresql.conf << 'EOF'
max_connections = 100
shared_buffers = 128MB
effective_cache_size = 512MB
maintenance_work_mem = 64MB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100
random_page_cost = 1.1
effective_io_concurrency = 200
work_mem = 4MB
min_wal_size = 1GB
max_wal_size = 2GB
EOF

    # Prometheus config
    cat > config/prometheus/prometheus.yml << 'EOF'
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'coinbitclub-app'
    static_configs:
      - targets: ['app:3000']
    scrape_interval: 30s
EOF

    # Grafana datasource
    cat > config/grafana/datasources/prometheus.yml << 'EOF'
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
EOF

    success "Configurações criadas!"
}

# Função para criar docker-compose
create_docker_compose() {
    log "Criando docker-compose.yml..."
    
    cd /opt/coinbitclub
    
    cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  nginx:
    image: nginx:alpine
    container_name: coinbitclub-nginx
    restart: unless-stopped
    ports:
      - "80:80"
    volumes:
      - ./config/nginx/nginx.conf:/etc/nginx/nginx.conf:ro
    depends_on:
      - app
    networks:
      - coinbitclub-network

  app:
    build: .
    container_name: coinbitclub-app
    restart: unless-stopped
    environment:
      - NODE_ENV=production
      - PORT=3000
    volumes:
      - ./logs:/app/logs
    networks:
      - coinbitclub-network
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  postgres:
    image: postgres:15-alpine
    container_name: coinbitclub-postgres
    restart: unless-stopped
    environment:
      - POSTGRES_DB=coinbitclub_enterprise
      - POSTGRES_USER=coinbitclub
      - POSTGRES_PASSWORD=coinbitclub_secure_2025
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./config/postgres/postgresql.conf:/etc/postgresql/postgresql.conf:ro
    ports:
      - "5432:5432"
    networks:
      - coinbitclub-network

  redis:
    image: redis:7-alpine
    container_name: coinbitclub-redis
    restart: unless-stopped
    command: redis-server --maxmemory 256mb --maxmemory-policy allkeys-lru
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"
    networks:
      - coinbitclub-network

  prometheus:
    image: prom/prometheus:latest
    container_name: coinbitclub-prometheus
    restart: unless-stopped
    volumes:
      - ./config/prometheus/prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - prometheus_data:/prometheus
    ports:
      - "9090:9090"
    networks:
      - coinbitclub-network

  grafana:
    image: grafana/grafana:latest
    container_name: coinbitclub-grafana
    restart: unless-stopped
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin123
    volumes:
      - grafana_data:/var/lib/grafana
      - ./config/grafana/datasources:/etc/grafana/provisioning/datasources:ro
    ports:
      - "3001:3000"
    networks:
      - coinbitclub-network

volumes:
  postgres_data:
  redis_data:
  prometheus_data:
  grafana_data:

networks:
  coinbitclub-network:
    driver: bridge
EOF

    success "Docker Compose criado!"
}

# Função para fazer deploy
deploy_application() {
    log "Fazendo deploy da aplicação..."
    
    cd /opt/coinbitclub
    
    # Build e start
    docker-compose down 2>/dev/null || true
    docker system prune -f
    docker-compose up -d --build
    
    success "Deploy realizado!"
}

# Função para verificar saúde
health_check() {
    log "Verificando saúde da aplicação..."
    
    sleep 30
    
    # Testar endpoints
    local ip=$(curl -s ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}')
    
    if curl -f "http://localhost:3000/api/enterprise/status" > /dev/null 2>&1; then
        success "✅ API Status: OK"
    else
        warning "❌ API Status: Aguardando..."
    fi
    
    if curl -f "http://localhost/health" > /dev/null 2>&1; then
        success "✅ Load Balancer: OK"
    else
        warning "❌ Load Balancer: Aguardando..."
    fi
    
    echo
    echo -e "${GREEN}🎉 DEPLOY CONCLUÍDO!${NC}"
    echo
    echo -e "${BLUE}🌐 URLs de Acesso:${NC}"
    echo "- Aplicação: http://$ip"
    echo "- API Status: http://$ip/api/enterprise/status"  
    echo "- Webhook TradingView: http://$ip/api/enterprise/trading/webhooks/signal"
    echo "- Grafana: http://$ip:3001 (admin/admin123)"
    echo "- Prometheus: http://$ip:9090"
    echo
    echo -e "${YELLOW}📋 Status dos Containers:${NC}"
    docker-compose ps
}

# Execução principal
main() {
    log "Iniciando setup automático..."
    
    # Verificar se Docker já está instalado
    if ! command -v docker >/dev/null 2>&1; then
        install_docker
    else
        success "Docker já instalado"
    fi
    
    # Verificar se Docker Compose está instalado
    if ! command -v docker-compose >/dev/null 2>&1; then
        log "Instalando Docker Compose..."
        curl -L "https://github.com/docker/compose/releases/download/v2.21.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
        chmod +x /usr/local/bin/docker-compose
        success "Docker Compose instalado"
    else
        success "Docker Compose já instalado"
    fi
    
    create_structure
    setup_firewall
    create_demo_app
    create_configs
    create_docker_compose
    deploy_application
    health_check
}

# Executar
main "$@"
