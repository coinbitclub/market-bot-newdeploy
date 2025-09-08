#!/bin/bash
# 🚀 COINBITCLUB ENTERPRISE - DEPLOY DIRETO DO GITHUB
# ============================================================================
# Este script clona o repositório GitHub e faz deploy no servidor Hostinger
# Repositório: https://github.com/coinbitclub/market-bot-newdeploy
# ============================================================================

echo "🚀 COINBITCLUB ENTERPRISE - DEPLOY FROM GITHUB"
echo "==============================================="

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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

# Verificar se já existe instalação
if [ -d "/opt/coinbitclub-enterprise" ]; then
    warning "Diretório já existe. Fazendo backup..."
    mv /opt/coinbitclub-enterprise /opt/coinbitclub-enterprise-backup-$(date +%Y%m%d_%H%M%S)
fi

# Atualizar sistema
log "Atualizando sistema..."
apt update && apt upgrade -y

# Instalar dependências
log "Instalando dependências..."
apt install -y git curl wget unzip

# Instalar Docker se não existir
if ! command -v docker &> /dev/null; then
    log "Instalando Docker..."
    curl -fsSL https://get.docker.com | sh
    systemctl enable docker
    systemctl start docker
    usermod -aG docker $USER
    success "Docker instalado"
else
    success "Docker já instalado"
fi

# Instalar Docker Compose se não existir
if ! command -v docker-compose &> /dev/null; then
    log "Instalando Docker Compose..."
    curl -L "https://github.com/docker/compose/releases/download/v2.24.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
    success "Docker Compose instalado"
else
    success "Docker Compose já instalado"
fi

# Clonar repositório GitHub
log "Clonando repositório do GitHub..."
cd /opt
git clone https://github.com/coinbitclub/market-bot-newdeploy.git coinbitclub-enterprise
cd coinbitclub-enterprise

success "Código clonado do GitHub"

# Verificar se arquivos existem
if [ ! -f "package.json" ]; then
    error "package.json não encontrado no repositório!"
fi

if [ ! -f "enterprise-orchestrator.js" ]; then
    warning "enterprise-orchestrator.js não encontrado, criando versão básica..."
    
    cat > enterprise-orchestrator.js << 'EOF'
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(helmet({ contentSecurityPolicy: false }));
app.use(compression());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));

// Health check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        version: '6.0.0',
        service: 'CoinBitClub Enterprise'
    });
});

// TradingView Webhook
app.post('/api/enterprise/trading/webhooks/signal', (req, res) => {
    console.log('📡 TradingView Signal Received:', {
        timestamp: new Date().toISOString(),
        signal: req.body
    });
    
    res.json({
        success: true,
        message: 'Signal received successfully',
        timestamp: new Date().toISOString()
    });
});

// Dashboard
app.get('/', (req, res) => {
    res.json({
        name: 'CoinBitClub Enterprise',
        version: '6.0.0',
        status: 'Online',
        webhookEndpoint: '/api/enterprise/trading/webhooks/signal',
        timestamp: new Date().toISOString()
    });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 CoinBitClub Enterprise v6.0.0 running on port ${PORT}`);
    console.log(`📡 TradingView Webhook: http://31.97.72.77/api/enterprise/trading/webhooks/signal`);
});
EOF
fi

# Criar .env.production se não existir
if [ ! -f ".env.production" ]; then
    log "Criando .env.production..."
    
    cat > .env.production << 'EOF'
# CoinBitClub Enterprise v6.0.0 - Production Environment
NODE_ENV=production
PORT=3000

# Database
DATABASE_URL=postgresql://coinbitclub:C0inB1tClub2024@postgres:5432/coinbitclub_enterprise
REDIS_URL=redis://redis:6379

# Security
JWT_SECRET=coinbitclub_enterprise_jwt_secret_2024_ultra_secure
ENCRYPTION_KEY=coinbitclub_ultra_secure_encryption_key_2024

# TradingView
TRADINGVIEW_WEBHOOK_TOKEN=coinbitclub_tv_webhook_2024_secure

# APIs (Sandbox inicialmente)
BINANCE_API_KEY=sandbox_key
BINANCE_SECRET_KEY=sandbox_secret
BINANCE_TESTNET=true

# System
DOMAIN=31.97.72.77
SSL_ENABLED=false
RATE_LIMIT_ENABLED=true
BACKUP_ENABLED=true
EOF

    success ".env.production criado"
fi

# Criar docker-compose.yml se não existir
if [ ! -f "docker-compose.yml" ] && [ ! -f "docker-compose.hostinger.yml" ]; then
    log "Criando docker-compose.yml..."
    
    cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: coinbitclub-enterprise
    ports:
      - "80:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
    restart: unless-stopped
    volumes:
      - ./logs:/app/logs
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  postgres:
    image: postgres:15-alpine
    container_name: coinbitclub-postgres
    environment:
      POSTGRES_DB: coinbitclub_enterprise
      POSTGRES_USER: coinbitclub
      POSTGRES_PASSWORD: C0inB1tClub2024
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    container_name: coinbitclub-redis
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    restart: unless-stopped
    ports:
      - "6379:6379"

volumes:
  postgres_data:
  redis_data:
EOF

    success "docker-compose.yml criado"
fi

# Criar Dockerfile se não existir
if [ ! -f "Dockerfile" ] && [ ! -f "Dockerfile.production" ]; then
    log "Criando Dockerfile..."
    
    cat > Dockerfile << 'EOF'
FROM node:18-alpine

# Instalar dependências do sistema
RUN apk add --no-cache curl

# Criar diretório de trabalho
WORKDIR /app

# Copiar package.json
COPY package*.json ./

# Instalar dependências
RUN npm ci --only=production

# Copiar código da aplicação
COPY . .

# Criar usuário não-root
RUN addgroup -g 1001 -S nodejs && \
    adduser -S coinbitclub -u 1001

# Mudar ownership
RUN chown -R coinbitclub:nodejs /app
USER coinbitclub

# Expor porta
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Comando inicial
CMD ["node", "enterprise-orchestrator.js"]
EOF

    success "Dockerfile criado"
fi

# Parar containers existentes
log "Parando containers existentes..."
docker-compose down 2>/dev/null || true
docker stop coinbitclub 2>/dev/null || true
docker rm coinbitclub 2>/dev/null || true

# Limpar sistema Docker
log "Limpando sistema Docker..."
docker system prune -f

# Construir e iniciar aplicação
log "Construindo e iniciando aplicação..."
docker-compose up -d --build

# Aguardar inicialização
log "Aguardando inicialização..."
sleep 30

# Verificar status
log "Verificando status dos containers..."
docker-compose ps

# Verificar logs
log "Verificando logs..."
docker-compose logs --tail=20

# Testar endpoints
log "Testando endpoints..."

# Teste Health Check
if curl -f http://localhost/health >/dev/null 2>&1; then
    success "Health Check: OK"
else
    warning "Health Check: Falhou"
fi

# Teste Homepage
if curl -f http://localhost/ >/dev/null 2>&1; then
    success "Homepage: OK"
else
    warning "Homepage: Falhou"
fi

# Teste Webhook
if curl -X POST http://localhost/api/enterprise/trading/webhooks/signal \
   -H "Content-Type: application/json" \
   -d '{"test":"signal"}' >/dev/null 2>&1; then
    success "Webhook: OK"
else
    warning "Webhook: Falhou"
fi

# Configurar firewall
log "Configurando firewall..."
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# Criar script de atualização
log "Criando script de atualização..."
cat > update.sh << 'EOF'
#!/bin/bash
echo "🔄 Atualizando CoinBitClub Enterprise..."
cd /opt/coinbitclub-enterprise
git pull origin main
docker-compose down
docker-compose up -d --build
echo "✅ Atualização concluída!"
EOF

chmod +x update.sh

# Criar script de backup
log "Criando script de backup..."
cat > backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/var/backups/coinbitclub"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

# Backup PostgreSQL
docker exec coinbitclub-postgres pg_dump -U coinbitclub coinbitclub_enterprise > $BACKUP_DIR/postgres_$DATE.sql

# Backup Redis
docker exec coinbitclub-redis redis-cli BGSAVE
cp /var/lib/docker/volumes/coinbitclub-enterprise_redis_data/_data/dump.rdb $BACKUP_DIR/redis_$DATE.rdb 2>/dev/null || true

# Backup código
tar -czf $BACKUP_DIR/app_$DATE.tar.gz /opt/coinbitclub-enterprise

echo "✅ Backup concluído: $DATE"
EOF

chmod +x backup.sh

# Configurar cron para backup diário
(crontab -l 2>/dev/null; echo "0 2 * * * /opt/coinbitclub-enterprise/backup.sh") | crontab -

# Resultado final
echo
echo "🎉 ========================================"
echo "   DEPLOY CONCLUÍDO COM SUCESSO!"
echo "========================================"
echo
success "📋 Informações do Deploy:"
echo "  📁 Código fonte: /opt/coinbitclub-enterprise"
echo "  🐳 Containers: $(docker-compose ps --services | wc -l) serviços"
echo "  🔄 Script de atualização: ./update.sh"
echo "  💾 Script de backup: ./backup.sh"
echo
success "🌐 URLs da Aplicação:"
echo "  📱 Homepage: http://31.97.72.77"
echo "  🔍 Health Check: http://31.97.72.77/health"
echo "  📡 TradingView Webhook: http://31.97.72.77/api/enterprise/trading/webhooks/signal"
echo
success "📋 Comandos Úteis:"
echo "  🔍 Ver logs: docker-compose logs -f"
echo "  🔄 Atualizar: ./update.sh"
echo "  💾 Backup: ./backup.sh"
echo "  🛑 Parar: docker-compose down"
echo "  🚀 Reiniciar: docker-compose restart"
echo
warning "📝 Próximos Passos:"
echo "  1. Testar webhook no TradingView"
echo "  2. Configurar APIs reais (Binance, etc.)"
echo "  3. Configurar domínio (se necessário)"
echo "  4. Monitorar logs regularmente"
echo
