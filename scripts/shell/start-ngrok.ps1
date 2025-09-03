# 🚀 SCRIPT POWERSHELL - NGROK COM BYPASS
# ======================================

Write-Host "🔧 SOLUCIONANDO AVISO DO NGROK..." -ForegroundColor Green
Write-Host ""

# Verificar se Ngrok está instalado
if (!(Get-Command ngrok -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Ngrok não encontrado!" -ForegroundColor Red
    Write-Host "💡 Instale em: https://ngrok.com/download" -ForegroundColor Yellow
    exit 1
}

# Parar processos existentes
Write-Host "🔄 Parando processos Ngrok existentes..." -ForegroundColor Yellow
Get-Process -Name "ngrok" -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 2

# Navegar para o diretório
Set-Location "c:\Nova pasta\coinbitclub-market-bot\backend"

# Verificar se o servidor está rodando
Write-Host "🔍 Verificando servidor local..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/api/health" -TimeoutSec 5 -ErrorAction Stop
    Write-Host "✅ Servidor rodando na porta 3000" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Servidor pode não estar rodando na porta 3000" -ForegroundColor Yellow
    Write-Host "💡 Execute: node app.js" -ForegroundColor Cyan
}

# Iniciar Ngrok com bypass
Write-Host "📡 Iniciando Ngrok com bypass do aviso..." -ForegroundColor Green
Write-Host "🌍 Região: Europa (para melhor conectividade)" -ForegroundColor Cyan

$authtoken = "314SgsgTAORpH3gJ1enmVEEQnu3_3uXNyK3Q8uEAu8VZa7LFZ"

Write-Host ""
Write-Host "🎯 COMANDO EXECUTADO:" -ForegroundColor Magenta
Write-Host "ngrok http 3000 --request-header-add 'ngrok-skip-browser-warning:true' --authtoken $authtoken --region eu" -ForegroundColor White
Write-Host ""

# Executar comando
& ngrok http 3000 --request-header-add "ngrok-skip-browser-warning:true" --authtoken $authtoken --region eu

Write-Host ""
Write-Host "🏁 Ngrok finalizado" -ForegroundColor Green
