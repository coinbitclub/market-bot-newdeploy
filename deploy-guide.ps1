# CoinBitClub Enterprise v6.0.0 - Deploy Guide
# PowerShell Script para gerar instruções de deploy

Write-Host "🚀 COINBITCLUB ENTERPRISE v6.0.0 - DEPLOY GUIDE" -ForegroundColor Green
Write-Host "=" * 60 -ForegroundColor Cyan

# Verificar conectividade
Write-Host "📡 Testando conectividade com servidor..." -ForegroundColor Yellow
try {
    $connection = Test-NetConnection -ComputerName 31.97.72.77 -Port 22 -WarningAction SilentlyContinue -ErrorAction Stop
    if ($connection.TcpTestSucceeded) {
        Write-Host "✅ Servidor 31.97.72.77:22 acessível!" -ForegroundColor Green
    } else {
        Write-Host "❌ Servidor não acessível na porta 22" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Erro ao testar conectividade: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "📋 OPÇÕES DE DEPLOY DISPONÍVEIS:" -ForegroundColor Yellow
Write-Host "=" * 40 -ForegroundColor Cyan

Write-Host "🎯 OPÇÃO 1: COMANDO DIRETO (RECOMENDADO)" -ForegroundColor Green
Write-Host "Execute este comando único no servidor via SSH:" -ForegroundColor White
Write-Host ""
$quickDeploy = @"
curl -sSL https://get.docker.com | sh && systemctl enable docker && systemctl start docker && curl -L "https://github.com/docker/compose/releases/download/v2.24.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose && chmod +x /usr/local/bin/docker-compose && mkdir -p /opt/coinbitclub && cd /opt/coinbitclub && cat > docker-compose.yml << 'EOF'
version: '3.8'
services:
  nginx:
    image: nginx:alpine
    ports: ["80:80"]
    volumes: ["./nginx.conf:/etc/nginx/nginx.conf"]
    depends_on: [app]
    restart: unless-stopped
  app:
    image: node:18-alpine
    working_dir: /app
    command: sh -c "npm init -y && npm install express cors helmet && echo 'const express = require(\"express\"); const app = express(); app.use(express.json()); app.get(\"/health\", (req, res) => res.json({status: \"OK\", version: \"6.0.0\"})); app.post(\"/api/enterprise/trading/webhooks/signal\", (req, res) => {console.log(\"TradingView Signal:\", req.body); res.json({success: true})}); app.get(\"/\", (req, res) => res.json({name: \"CoinBitClub Enterprise\", webhook: \"/api/enterprise/trading/webhooks/signal\"})); app.listen(3000, () => console.log(\"🚀 CoinBitClub Enterprise v6.0.0 running on port 3000\"));' > server.js && node server.js"
    ports: ["3000:3000"]
    restart: unless-stopped
EOF
cat > nginx.conf << 'EOF'
events { worker_connections 1024; }
http {
  upstream app { server app:3000; }
  server {
    listen 80;
    location / {
      proxy_pass http://app;
      proxy_set_header Host $host;
      proxy_set_header X-Real-IP $remote_addr;
    }
  }
}
EOF
docker-compose up -d && sleep 15 && curl -f http://localhost/health && echo "✅ Deploy concluído! Webhook: http://31.97.72.77/api/enterprise/trading/webhooks/signal"
"@

Write-Host $quickDeploy -ForegroundColor Cyan

Write-Host ""
Write-Host "🔧 OPÇÃO 2: STEP-BY-STEP" -ForegroundColor Green
Write-Host "Execute os comandos abaixo um por vez:" -ForegroundColor White
Write-Host ""

$stepByStep = @"
# 1. Conectar ao servidor
ssh root@31.97.72.77

# 2. Instalar Docker
curl -sSL https://get.docker.com | sh
systemctl enable docker
systemctl start docker

# 3. Instalar Docker Compose
curl -L "https://github.com/docker/compose/releases/download/v2.24.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# 4. Criar aplicação
mkdir -p /opt/coinbitclub && cd /opt/coinbitclub

# 5. Criar docker-compose.yml
cat > docker-compose.yml << 'EOF'
version: '3.8'
services:
  nginx:
    image: nginx:alpine
    ports: ["80:80"]
    volumes: ["./nginx.conf:/etc/nginx/nginx.conf"]
    depends_on: [app]
    restart: unless-stopped
  app:
    image: node:18-alpine
    working_dir: /app
    command: sh -c "npm init -y && npm install express cors helmet && echo 'const express = require(\"express\"); const app = express(); app.use(express.json()); app.get(\"/health\", (req, res) => res.json({status: \"OK\", version: \"6.0.0\"})); app.post(\"/api/enterprise/trading/webhooks/signal\", (req, res) => {console.log(\"TradingView Signal:\", req.body); res.json({success: true})}); app.get(\"/\", (req, res) => res.json({name: \"CoinBitClub Enterprise\", webhook: \"/api/enterprise/trading/webhooks/signal\"})); app.listen(3000, () => console.log(\"CoinBitClub Enterprise v6.0.0 running\"));' > server.js && node server.js"
    ports: ["3000:3000"]
    restart: unless-stopped
EOF

# 6. Criar nginx.conf
cat > nginx.conf << 'EOF'
events { worker_connections 1024; }
http {
  upstream app { server app:3000; }
  server {
    listen 80;
    location / {
      proxy_pass http://app;
      proxy_set_header Host $host;
      proxy_set_header X-Real-IP $remote_addr;
    }
  }
}
EOF

# 7. Iniciar aplicação
docker-compose up -d

# 8. Verificar status
docker-compose ps
curl http://localhost/health
"@

Write-Host $stepByStep -ForegroundColor Yellow

Write-Host ""
Write-Host "🎯 RESULTADO ESPERADO:" -ForegroundColor Green
Write-Host "✅ Aplicação: http://31.97.72.77" -ForegroundColor Cyan
Write-Host "✅ Health Check: http://31.97.72.77/health" -ForegroundColor Cyan
Write-Host "✅ TradingView Webhook: http://31.97.72.77/api/enterprise/trading/webhooks/signal" -ForegroundColor Cyan

Write-Host ""
Write-Host "📱 TESTE TRADINGVIEW:" -ForegroundColor Yellow
Write-Host "No TradingView, configure o webhook com a URL:" -ForegroundColor White
Write-Host "http://31.97.72.77/api/enterprise/trading/webhooks/signal" -ForegroundColor Green

Write-Host ""
Write-Host "🏁 EXECUÇÃO RECOMENDADA:" -ForegroundColor Red
Write-Host "Use a OPÇÃO 1 (comando direto) para deploy em 1 minuto!" -ForegroundColor White
