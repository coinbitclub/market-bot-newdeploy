# CoinBitClub Enterprise v6.0.0 - Deploy Instructions
Write-Host "COINBITCLUB ENTERPRISE v6.0.0 - DEPLOY INSTRUCTIONS" -ForegroundColor Green
Write-Host "=======================================================" -ForegroundColor Cyan

# Test connectivity
Write-Host "Testing server connectivity..." -ForegroundColor Yellow
$connection = Test-NetConnection -ComputerName 31.97.72.77 -Port 22 -WarningAction SilentlyContinue
if ($connection.TcpTestSucceeded) {
    Write-Host "SUCCESS: Server 31.97.72.77:22 is accessible!" -ForegroundColor Green
} else {
    Write-Host "ERROR: Server not accessible on port 22" -ForegroundColor Red
}

Write-Host ""
Write-Host "DEPLOY OPTIONS:" -ForegroundColor Yellow
Write-Host "===============" -ForegroundColor Cyan

Write-Host ""
Write-Host "OPTION 1: ONE-LINE COMMAND (RECOMMENDED)" -ForegroundColor Green
Write-Host "Connect via SSH and run this single command:" -ForegroundColor White
Write-Host ""
Write-Host "ssh root@31.97.72.77" -ForegroundColor Cyan
Write-Host ""
Write-Host "Then paste this ONE command:" -ForegroundColor Yellow
$oneLineCommand = "curl -sSL https://get.docker.com | sh && systemctl start docker && curl -L https://github.com/docker/compose/releases/download/v2.24.0/docker-compose-Linux-x86_64 -o /usr/local/bin/docker-compose && chmod +x /usr/local/bin/docker-compose && mkdir -p /opt/coinbitclub && cd /opt/coinbitclub && echo 'version: \"3.8\"" + "`n" + "services:" + "`n" + "  app:" + "`n" + "    image: node:18-alpine" + "`n" + "    working_dir: /app" + "`n" + "    command: sh -c \"npm init -y && npm install express && echo \\\"const express = require('express'); const app = express(); app.use(express.json()); app.get('/health', (req, res) => res.json({status: 'OK'})); app.post('/api/enterprise/trading/webhooks/signal', (req, res) => {console.log('Signal:', req.body); res.json({success: true})}); app.listen(3000, () => console.log('Running on 3000'));\\\" > server.js && node server.js\"" + "`n" + "    ports: [\"80:3000\"]" + "`n" + "    restart: unless-stopped' > docker-compose.yml && docker-compose up -d"
Write-Host $oneLineCommand -ForegroundColor Green

Write-Host ""
Write-Host "OPTION 2: MANUAL STEPS" -ForegroundColor Green
Write-Host "1. ssh root@31.97.72.77" -ForegroundColor Cyan
Write-Host "2. curl -sSL https://get.docker.com | sh" -ForegroundColor Cyan
Write-Host "3. systemctl start docker" -ForegroundColor Cyan
Write-Host "4. mkdir -p /opt/coinbitclub && cd /opt/coinbitclub" -ForegroundColor Cyan
Write-Host "5. Create docker-compose.yml with Node.js app" -ForegroundColor Cyan
Write-Host "6. docker-compose up -d" -ForegroundColor Cyan

Write-Host ""
Write-Host "EXPECTED RESULT:" -ForegroundColor Yellow
Write-Host "Application: http://31.97.72.77" -ForegroundColor Green
Write-Host "Health Check: http://31.97.72.77/health" -ForegroundColor Green
Write-Host "TradingView Webhook: http://31.97.72.77/api/enterprise/trading/webhooks/signal" -ForegroundColor Green

Write-Host ""
Write-Host "TRADINGVIEW WEBHOOK URL:" -ForegroundColor Red
Write-Host "http://31.97.72.77/api/enterprise/trading/webhooks/signal" -ForegroundColor Yellow

Write-Host ""
Write-Host "To execute: Use SSH to connect to the server and run the commands above." -ForegroundColor White
