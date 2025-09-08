Write-Host "COINBITCLUB ENTERPRISE - DEPLOY SOLUTION" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Cyan

Write-Host ""
Write-Host "PROBLEMA IDENTIFICADO:" -ForegroundColor Red
Write-Host "PowerShell nao permite entrada de senha SSH" -ForegroundColor Yellow

Write-Host ""
Write-Host "SOLUCOES DISPONÍVEIS:" -ForegroundColor Green

Write-Host ""
Write-Host "OPCAO 1: PUTTY (MAIS FACIL)" -ForegroundColor Green
Write-Host "1. Baixar PuTTY: https://www.putty.org/" -ForegroundColor White
Write-Host "2. Configurar conexao:" -ForegroundColor White
Write-Host "   Host: 31.97.72.77" -ForegroundColor Cyan
Write-Host "   Port: 22" -ForegroundColor Cyan
Write-Host "   Username: root" -ForegroundColor Cyan

Write-Host ""
Write-Host "OPCAO 2: HOSTINGER WEB TERMINAL" -ForegroundColor Green
Write-Host "1. Acessar painel Hostinger" -ForegroundColor White
Write-Host "2. Ir em VPS > Terminal Web" -ForegroundColor White
Write-Host "3. Executar comandos diretamente no browser" -ForegroundColor White

Write-Host ""
Write-Host "COMANDOS PARA EXECUTAR (copie e cole):" -ForegroundColor Yellow
Write-Host "======================================" -ForegroundColor Cyan

Write-Host ""
Write-Host "# Passo 1: Instalar Docker"
Write-Host "curl -sSL https://get.docker.com | sh"
Write-Host "systemctl start docker"

Write-Host ""
Write-Host "# Passo 2: Criar diretorio"
Write-Host "mkdir -p /opt/coinbitclub && cd /opt/coinbitclub"

Write-Host ""
Write-Host "# Passo 3: Deploy simples (comando unico)"
Write-Host 'docker run -d -p 80:3000 --name coinbitclub node:18-alpine sh -c "npm init -y && npm install express && echo \"const express = require('\''express'\''); const app = express(); app.use(express.json()); app.get('\''/health'\'', (req, res) => res.json({status: '\''OK'\''})); app.post('\''/api/enterprise/trading/webhooks/signal'\'', (req, res) => {console.log('\''Signal:'\'', req.body); res.json({success: true})}); app.listen(3000);\" > server.js && node server.js"'

Write-Host ""
Write-Host "# Passo 4: Verificar status"
Write-Host "docker ps"
Write-Host "curl http://localhost/health"

Write-Host ""
Write-Host "RESULTADO ESPERADO:" -ForegroundColor Green
Write-Host "===================" -ForegroundColor Cyan
Write-Host "Aplicacao: http://31.97.72.77" -ForegroundColor Yellow
Write-Host "Health: http://31.97.72.77/health" -ForegroundColor Yellow
Write-Host "Webhook: http://31.97.72.77/api/enterprise/trading/webhooks/signal" -ForegroundColor Yellow

Write-Host ""
Write-Host "TESTE DE CONECTIVIDADE:" -ForegroundColor Green
$result = Test-NetConnection -ComputerName 31.97.72.77 -Port 22 -WarningAction SilentlyContinue
if ($result.TcpTestSucceeded) {
    Write-Host "Servidor ACESSIVEL - Pode prosseguir!" -ForegroundColor Green
} else {
    Write-Host "Servidor NAO ACESSIVEL" -ForegroundColor Red
}

Write-Host ""
Write-Host "PROXIMO PASSO:" -ForegroundColor Red
Write-Host "Use PuTTY ou Terminal Web Hostinger para executar os comandos" -ForegroundColor White
