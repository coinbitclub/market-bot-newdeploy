@echo off
echo 🚀 INICIANDO NGROK COM BYPASS DE AVISO...
echo.

REM Matar processos existentes do Ngrok
echo 🔄 Parando processos existentes...
taskkill /f /im ngrok.exe 2>nul

REM Aguardar um momento
timeout /t 2 /nobreak >nul

echo 📡 Iniciando Ngrok com headers de bypass...
echo URL será gerada automaticamente...
echo.

REM Navegar para o diretório
cd /d "c:\Nova pasta\coinbitclub-market-bot\backend"

REM Iniciar Ngrok com bypass do aviso
ngrok http 3000 --request-header-add "ngrok-skip-browser-warning:true" --authtoken 314SgsgTAORpH3gJ1enmVEEQnu3_3uXNyK3Q8uEAu8VZa7LFZ

pause
