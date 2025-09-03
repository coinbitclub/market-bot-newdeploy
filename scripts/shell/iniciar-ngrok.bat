@echo off
echo 🚀 INICIANDO NGROK COM BYPASS...
echo.

REM Verificar se ngrok existe
where ngrok >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Ngrok não encontrado!
    echo 💡 Baixe em: https://ngrok.com/download
    pause
    exit /b 1
)

REM Matar processos existentes
echo 🔄 Parando processos Ngrok...
taskkill /f /im ngrok.exe >nul 2>&1

REM Aguardar
timeout /t 2 /nobreak >nul

echo 📡 Iniciando Ngrok...
echo 🌍 Região: Europa
echo 🔧 Com bypass de aviso do navegador
echo.

REM Comando completo
ngrok http 3000 --request-header-add "ngrok-skip-browser-warning:true" --authtoken 314SgsgTAORpH3gJ1enmVEEQnu3_3uXNyK3Q8uEAu8VZa7LFZ --region eu

echo.
echo 🏁 Ngrok finalizado
pause
