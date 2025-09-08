Write-Host "==================================================" -ForegroundColor Green
Write-Host "  COINBITCLUB ENTERPRISE v6.0.0 - DEPLOY GUIDE  " -ForegroundColor Green  
Write-Host "==================================================" -ForegroundColor Green

Write-Host ""
Write-Host "Testing server connectivity..." -ForegroundColor Yellow
$result = Test-NetConnection -ComputerName 31.97.72.77 -Port 22 -WarningAction SilentlyContinue
if ($result.TcpTestSucceeded) {
    Write-Host "SUCCESS: Server is accessible!" -ForegroundColor Green
} else {
    Write-Host "ERROR: Cannot connect to server" -ForegroundColor Red
}

Write-Host ""
Write-Host "EXECUTION STEPS:" -ForegroundColor Yellow
Write-Host "1. Connect to server via SSH:" -ForegroundColor White
Write-Host "   ssh root@31.97.72.77" -ForegroundColor Cyan

Write-Host ""
Write-Host "2. Run this command to install Docker:" -ForegroundColor White
Write-Host "   curl -sSL https://get.docker.com | sh" -ForegroundColor Cyan

Write-Host ""
Write-Host "3. Start Docker service:" -ForegroundColor White
Write-Host "   systemctl start docker" -ForegroundColor Cyan

Write-Host ""
Write-Host "4. Create application directory:" -ForegroundColor White
Write-Host "   mkdir -p /opt/coinbitclub && cd /opt/coinbitclub" -ForegroundColor Cyan

Write-Host ""
Write-Host "5. Create simple Docker container:" -ForegroundColor White
Write-Host "   docker run -d -p 80:3000 --name coinbitclub node:18-alpine sh -c 'npm init -y && npm install express && echo ""const express = require(\"express\"); const app = express(); app.use(express.json()); app.get(\"/health\", (req, res) => res.json({status: \"OK\"})); app.post(\"/api/enterprise/trading/webhooks/signal\", (req, res) => {console.log(\"Signal:\", req.body); res.json({success: true})}); app.listen(3000);"" > server.js && node server.js'" -ForegroundColor Cyan

Write-Host ""
Write-Host "EXPECTED RESULTS:" -ForegroundColor Green
Write-Host "Application URL: http://31.97.72.77" -ForegroundColor Yellow
Write-Host "Health Check: http://31.97.72.77/health" -ForegroundColor Yellow
Write-Host "TradingView Webhook: http://31.97.72.77/api/enterprise/trading/webhooks/signal" -ForegroundColor Yellow

Write-Host ""
Write-Host "TRADINGVIEW CONFIGURATION:" -ForegroundColor Red
Write-Host "Use this webhook URL in TradingView:" -ForegroundColor White
Write-Host "http://31.97.72.77/api/enterprise/trading/webhooks/signal" -ForegroundColor Cyan

Write-Host ""
Write-Host "Ready to deploy! Connect via SSH and run the commands above." -ForegroundColor Green
