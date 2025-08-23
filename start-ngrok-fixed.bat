@echo off
echo 🔧 REINICIANDO NGROK SEM AVISO...
echo ========================================

echo 🛑 Parando processos existentes...
taskkill /f /im ngrok.exe >nul 2>&1

echo ⏳ Aguardando 3 segundos...
timeout /t 3 /nobreak >nul

echo 🚀 Iniciando Ngrok com bypass...
ngrok http 3000 --request-header-add "ngrok-skip-browser-warning:true" --log=stdout

pause
