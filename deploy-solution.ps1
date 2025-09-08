Write-Host "COINBITCLUB ENTERPRISE - DEPLOY SOLUTION" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Cyan

Write-Host ""
Write-Host "PROBLEMA: PowerShell nao permite senha SSH interativa" -ForegroundColor Red

Write-Host ""
Write-Host "SOLUCOES:" -ForegroundColor Yellow

Write-Host ""
Write-Host "1. PUTTY (RECOMENDADO):" -ForegroundColor Green
Write-Host "   - Baixar: https://www.putty.org/" -ForegroundColor White
Write-Host "   - Host: 31.97.72.77" -ForegroundColor Cyan
Write-Host "   - Port: 22" -ForegroundColor Cyan
Write-Host "   - User: root" -ForegroundColor Cyan

Write-Host ""
Write-Host "2. HOSTINGER WEB TERMINAL:" -ForegroundColor Green
Write-Host "   - Acessar painel Hostinger" -ForegroundColor White
Write-Host "   - VPS > Terminal Web" -ForegroundColor Cyan

Write-Host ""
Write-Host "3. WSL:" -ForegroundColor Green
Write-Host "   - wsl --install" -ForegroundColor Cyan
Write-Host "   - Reiniciar e usar: ssh root@31.97.72.77" -ForegroundColor Cyan

Write-Host ""
Write-Host "COMANDOS PARA EXECUTAR NO SERVIDOR:" -ForegroundColor Yellow
Write-Host "====================================" -ForegroundColor Cyan

Write-Host "# Instalar Docker" -ForegroundColor White
Write-Host "curl -sSL https://get.docker.com | sh && systemctl start docker" -ForegroundColor Green

Write-Host ""
Write-Host "# Criar aplicacao" -ForegroundColor White
Write-Host "mkdir -p /opt/coinbitclub && cd /opt/coinbitclub" -ForegroundColor Green

Write-Host ""
Write-Host "# Deploy rapido" -ForegroundColor White
Write-Host "docker run -d -p 80:3000 --name coinbitclub node:18-alpine sh -c 'npm init -y && npm install express && echo \"const express = require(\\\"express\\\"); const app = express(); app.use(express.json()); app.get(\\\"/health\\\", (req, res) => res.json({status: \\\"OK\\\"})); app.post(\\\"/api/enterprise/trading/webhooks/signal\\\", (req, res) => {console.log(\\\"Signal:\\\", req.body); res.json({success: true})}); app.listen(3000);\" > server.js && node server.js'" -ForegroundColor Green

Write-Host ""
Write-Host "RESULTADO:" -ForegroundColor Yellow
Write-Host "TradingView Webhook: http://31.97.72.77/api/enterprise/trading/webhooks/signal" -ForegroundColor Cyan

Write-Host ""
$connection = Test-NetConnection -ComputerName 31.97.72.77 -Port 22 -WarningAction SilentlyContinue
if ($connection.TcpTestSucceeded) {
    Write-Host "Servidor acessivel - Use PuTTY para conectar!" -ForegroundColor Green
} else {
    Write-Host "Erro de conectividade" -ForegroundColor Red
}
