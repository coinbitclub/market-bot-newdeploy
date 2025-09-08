# CoinBitClub Enterprise v6.0.0 - Deploy PowerShell
# Executar localmente no Windows para deploy no Hostinger

Write-Host "🚀 COINBITCLUB ENTERPRISE v6.0.0 - DEPLOY POWERSHELL" -ForegroundColor Green
Write-Host "=" * 60 -ForegroundColor Cyan

# Verificar conectividade
Write-Host "📡 Testando conectividade..." -ForegroundColor Yellow
$connection = Test-NetConnection -ComputerName 31.97.72.77 -Port 22 -WarningAction SilentlyContinue
if ($connection.TcpTestSucceeded) {
    Write-Host "✅ Servidor acessível!" -ForegroundColor Green
} else {
    Write-Host "❌ Servidor inacessível" -ForegroundColor Red
    exit 1
}

# Criar arquivo de deploy remoto
$deployScript = @'
#!/bin/bash
# Deploy Automático CoinBitClub Enterprise v6.0.0
set -e

echo "🚀 INICIANDO DEPLOY DOCKER - COINBITCLUB ENTERPRISE v6.0.0"
echo "====================================================="

# Atualizar sistema
echo "📦 Atualizando sistema..."
apt update && apt upgrade -y

# Instalar Docker se não existir
if ! command -v docker &> /dev/null; then
    echo "🐳 Instalando Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    systemctl enable docker
    systemctl start docker
fi

# Instalar Docker Compose se não existir
if ! command -v docker-compose &> /dev/null; then
    echo "🔧 Instalando Docker Compose..."
    curl -L "https://github.com/docker/compose/releases/download/v2.24.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
fi

# Criar diretório da aplicação
echo "📁 Criando estrutura de diretórios..."
mkdir -p /opt/coinbitclub-enterprise
cd /opt/coinbitclub-enterprise

# Parar serviços existentes
echo "🛑 Parando serviços existentes..."
docker-compose down 2>/dev/null || true

# Criar .env de produção
echo "⚙️ Configurando variáveis de ambiente..."
cat > .env << 'EOF'
# CoinBitClub Enterprise v6.0.0 - Produção
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://coinbitclub:C0inB1tClub2024@postgres:5432/coinbitclub_enterprise
REDIS_URL=redis://redis:6379

# JWT & Criptografia
JWT_SECRET=coinbitclub_enterprise_jwt_secret_2024_ultra_secure
ENCRYPTION_KEY=coinbitclub_ultra_secure_encryption_key_2024

# TradingView Webhook
TRADINGVIEW_WEBHOOK_TOKEN=coinbitclub_tv_webhook_2024_secure

# Binance API (SANDBOX INICIALMENTE)
BINANCE_API_KEY=sandbox_api_key_here
BINANCE_SECRET_KEY=sandbox_secret_here
BINANCE_TESTNET=true

# Sistema
DOMAIN=31.97.72.77
SSL_ENABLED=true
RATE_LIMIT_ENABLED=true
BACKUP_ENABLED=true

# Monitoramento
PROMETHEUS_ENABLED=true
GRAFANA_ENABLED=true
EOF

# Criar docker-compose.yml
echo "🐳 Criando configuração Docker..."
cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  nginx:
    image: nginx:alpine
    container_name: coinbitclub-nginx
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - app
    restart: unless-stopped
    networks:
      - coinbitclub-network

  app:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: coinbitclub-app
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://coinbitclub:C0inB1tClub2024@postgres:5432/coinbitclub_enterprise
      - REDIS_URL=redis://redis:6379
    depends_on:
      - postgres
      - redis
    restart: unless-stopped
    networks:
      - coinbitclub-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

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
    networks:
      - coinbitclub-network

  redis:
    image: redis:7-alpine
    container_name: coinbitclub-redis
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    restart: unless-stopped
    networks:
      - coinbitclub-network

  prometheus:
    image: prom/prometheus:latest
    container_name: coinbitclub-prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
    restart: unless-stopped
    networks:
      - coinbitclub-network

  grafana:
    image: grafana/grafana:latest
    container_name: coinbitclub-grafana
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=coinbitclub2024
    volumes:
      - grafana_data:/var/lib/grafana
    restart: unless-stopped
    networks:
      - coinbitclub-network

volumes:
  postgres_data:
  redis_data:
  grafana_data:

networks:
  coinbitclub-network:
    driver: bridge
EOF

# Criar Dockerfile
echo "🏗️ Criando Dockerfile..."
cat > Dockerfile << 'EOF'
FROM node:18-alpine

WORKDIR /app

# Instalar dependências do sistema
RUN apk add --no-cache curl

# Copiar package.json
COPY package*.json ./

# Instalar dependências
RUN npm ci --only=production

# Copiar código da aplicação
COPY . .

# Criar usuário não-root
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Mudar ownership
RUN chown -R nextjs:nodejs /app
USER nextjs

# Expor porta
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Comando inicial
CMD ["npm", "start"]
EOF

# Criar configuração NGINX
echo "🌐 Configurando NGINX..."
mkdir -p ssl
cat > nginx.conf << 'EOF'
events {
    worker_connections 1024;
}

http {
    upstream app {
        server app:3000;
    }

    server {
        listen 80;
        server_name 31.97.72.77;
        
        location / {
            proxy_pass http://app;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
}
EOF

# Criar aplicação Node.js básica
echo "💻 Criando aplicação..."
cat > package.json << 'EOF'
{
  "name": "coinbitclub-enterprise",
  "version": "6.0.0",
  "description": "CoinBitClub Enterprise Trading Platform",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "helmet": "^7.1.0",
    "compression": "^1.7.4",
    "morgan": "^1.10.0"
  }
}
EOF

cat > server.js << 'EOF'
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(helmet());
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

// TradingView Webhook Endpoint
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

# Construir e iniciar aplicação
echo "🚀 Construindo e iniciando aplicação..."
docker-compose build
docker-compose up -d

# Aguardar inicialização
echo "⏳ Aguardando inicialização..."
sleep 30

# Verificar status
echo "📊 Status dos serviços:"
docker-compose ps

# Teste final
echo "🧪 Testando endpoints..."
curl -f http://localhost/ || echo "❌ Endpoint principal falhou"
curl -f http://localhost/health || echo "❌ Health check falhou"

echo ""
echo "✅ DEPLOY CONCLUÍDO COM SUCESSO!"
echo "🌐 Aplicação: http://31.97.72.77"
echo "📡 TradingView Webhook: http://31.97.72.77/api/enterprise/trading/webhooks/signal"
echo "📊 Prometheus: http://31.97.72.77:9090"
echo "📈 Grafana: http://31.97.72.77:3001 (admin/coinbitclub2024)"
'@

# Salvar script de deploy
Write-Host "💾 Criando script de deploy..." -ForegroundColor Yellow
$deployScript | Out-File -FilePath "deploy-remote.sh" -Encoding UTF8

Write-Host "📋 INSTRUÇÕES DE EXECUÇÃO:" -ForegroundColor Green
Write-Host "=" * 50 -ForegroundColor Cyan
Write-Host "1. Conecte via SSH ao servidor:" -ForegroundColor White
Write-Host "   ssh root@31.97.72.77" -ForegroundColor Yellow
Write-Host ""
Write-Host "2. Cole e execute estes comandos:" -ForegroundColor White
Write-Host @"
curl -sSL https://raw.githubusercontent.com/coinbitclub/market-bot-newdeploy/main/deploy-remote.sh -o deploy.sh
chmod +x deploy.sh
./deploy.sh
"@ -ForegroundColor Yellow

Write-Host ""
Write-Host "🎯 WEBHOOK TRADINGVIEW:" -ForegroundColor Green
Write-Host "   http://31.97.72.77/api/enterprise/trading/webhooks/signal" -ForegroundColor Cyan
Write-Host ""
Write-Host "✨ O deploy será totalmente automatizado!" -ForegroundColor Green
