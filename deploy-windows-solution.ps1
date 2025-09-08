# CoinBitClub Enterprise v6.0.0 - Deploy Windows PowerShell
# Solução para deploy sem senha SSH usando comandos diretos

Write-Host "🚀 COINBITCLUB ENTERPRISE v6.0.0 - DEPLOY WINDOWS" -ForegroundColor Green
Write-Host "=" * 60 -ForegroundColor Cyan

Write-Host ""
Write-Host "PROBLEMA IDENTIFICADO:" -ForegroundColor Red
Write-Host "PowerShell não permite entrada de senha SSH interativa" -ForegroundColor Yellow

Write-Host ""
Write-Host "SOLUÇÕES DISPONÍVEIS:" -ForegroundColor Green
Write-Host "=" * 30 -ForegroundColor Cyan

Write-Host ""
Write-Host "OPÇÃO 1: USAR PUTTY (RECOMENDADO)" -ForegroundColor Green
Write-Host "1. Baixar PuTTY: https://www.putty.org/" -ForegroundColor White
Write-Host "2. Conectar: Host=31.97.72.77, Port=22, User=root" -ForegroundColor Cyan
Write-Host "3. Executar os comandos de deploy no terminal PuTTY" -ForegroundColor Cyan

Write-Host ""
Write-Host "OPÇÃO 2: WSL (Windows Subsystem for Linux)" -ForegroundColor Green
Write-Host "1. Instalar WSL: wsl --install" -ForegroundColor Cyan
Write-Host "2. Após reiniciar: wsl" -ForegroundColor Cyan
Write-Host "3. No Linux: ssh root@31.97.72.77" -ForegroundColor Cyan

Write-Host ""
Write-Host "OPÇÃO 3: USAR TERMINAL WEB HOSTINGER" -ForegroundColor Green
Write-Host "1. Acessar painel Hostinger" -ForegroundColor Cyan
Write-Host "2. Ir em VPS > Terminal Web" -ForegroundColor Cyan
Write-Host "3. Executar comandos diretamente no browser" -ForegroundColor Cyan

Write-Host ""
Write-Host "OPÇÃO 4: COMANDOS PARA QUALQUER TERMINAL" -ForegroundColor Green
Write-Host "Cole estes comandos em qualquer terminal SSH:" -ForegroundColor White

$commands = @"

# ===== COMANDOS PARA COLAR NO TERMINAL SSH =====

# 1. Instalar Docker
curl -sSL https://get.docker.com | sh
systemctl start docker
systemctl enable docker

# 2. Instalar Docker Compose
curl -L "https://github.com/docker/compose/releases/download/v2.24.0/docker-compose-Linux-x86_64" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# 3. Criar diretório
mkdir -p /opt/coinbitclub && cd /opt/coinbitclub

# 4. Criar docker-compose.yml
cat > docker-compose.yml << 'EOF'
version: '3.8'
services:
  app:
    image: node:18-alpine
    working_dir: /app
    command: |
      sh -c "
        npm init -y &&
        npm install express cors helmet morgan compression &&
        cat > server.js << 'SERVERJS'
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares de segurança
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

// Homepage
app.get('/', (req, res) => {
    res.json({
        name: 'CoinBitClub Enterprise',
        version: '6.0.0',
        status: 'Online',
        endpoints: {
            health: '/health',
            webhook: '/api/enterprise/trading/webhooks/signal',
            status: '/api/enterprise/status'
        },
        timestamp: new Date().toISOString()
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
        timestamp: new Date().toISOString(),
        webhook: 'active'
    });
});

// Status endpoint
app.get('/api/enterprise/status', (req, res) => {
    res.json({
        status: 'operational',
        version: '6.0.0',
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        timestamp: new Date().toISOString()
    });
});

// Iniciar servidor
app.listen(PORT, '0.0.0.0', () => {
    console.log('🚀 CoinBitClub Enterprise v6.0.0 running on port', PORT);
    console.log('📡 TradingView Webhook:', 'http://31.97.72.77/api/enterprise/trading/webhooks/signal');
    console.log('🌐 Application URL:', 'http://31.97.72.77');
});
SERVERJS
        node server.js
      "
    ports:
      - "80:3000"
    restart: unless-stopped
    environment:
      - NODE_ENV=production
EOF

# 5. Iniciar aplicação
docker-compose up -d

# 6. Aguardar inicialização
sleep 15

# 7. Verificar status
echo "🔍 Verificando status..."
docker-compose ps
curl -f http://localhost/health || echo "Aguardando inicialização..."
sleep 10
curl -f http://localhost/health && echo "✅ Aplicação funcionando!"

echo ""
echo "✅ DEPLOY CONCLUÍDO!"
echo "🌐 Aplicação: http://31.97.72.77"
echo "📡 TradingView Webhook: http://31.97.72.77/api/enterprise/trading/webhooks/signal"
echo "🔍 Health Check: http://31.97.72.77/health"
echo "📊 Status: http://31.97.72.77/api/enterprise/status"

"@

Write-Host $commands -ForegroundColor Cyan

Write-Host ""
Write-Host "TESTE LOCAL DE CONECTIVIDADE:" -ForegroundColor Yellow
$connection = Test-NetConnection -ComputerName 31.97.72.77 -Port 22 -WarningAction SilentlyContinue
if ($connection.TcpTestSucceeded) {
    Write-Host "✅ Servidor acessível na porta 22" -ForegroundColor Green
} else {
    Write-Host "❌ Servidor não acessível" -ForegroundColor Red
}

Write-Host ""
Write-Host "RECOMENDAÇÃO:" -ForegroundColor Red
Write-Host "Use PuTTY ou Terminal Web Hostinger para conectar e executar os comandos acima" -ForegroundColor White

Write-Host ""
Write-Host "RESULTADO ESPERADO:" -ForegroundColor Green
Write-Host "TradingView Webhook: http://31.97.72.77/api/enterprise/trading/webhooks/signal" -ForegroundColor Yellow
