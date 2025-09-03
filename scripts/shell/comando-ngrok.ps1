# 🚀 COMANDO DIRETO NGROK COM BYPASS
# Execute este comando no PowerShell:

$comando = 'ngrok http 3000 --request-header-add "ngrok-skip-browser-warning:true" --authtoken 314SgsgTAORpH3gJ1enmVEEQnu3_3uXNyK3Q8uEAu8VZa7LFZ --region eu'

Write-Host "🔧 COMANDO PARA EXECUTAR:" -ForegroundColor Green
Write-Host $comando -ForegroundColor White
Write-Host ""
Write-Host "📋 COPIE E COLE ESTE COMANDO NO SEU POWERSHELL:" -ForegroundColor Yellow
Write-Host $comando -ForegroundColor Cyan

# Ou execute diretamente:
# Invoke-Expression $comando
