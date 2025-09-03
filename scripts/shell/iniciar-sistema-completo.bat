@echo off
title CoinBitClub - Servidor + Ngrok Gratuito
color 0A

echo.
echo ====================================================
echo     🚀 COINBITCLUB MARKET BOT - INICIO COMPLETO
echo ====================================================
echo.

REM Verificar Node.js
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js não encontrado!
    echo 💡 Instale em: https://nodejs.org
    pause
    exit /b 1
)

REM Verificar se package.json existe
if not exist package.json (
    echo ❌ package.json não encontrado!
    echo 💡 Execute na pasta do projeto
    pause
    exit /b 1
)

echo 📦 Instalando dependências...
npm install

echo.
echo 🚀 Iniciando servidor na porta 3000...
echo 💡 Pressione Ctrl+C para parar
echo.

REM Iniciar servidor em background
start /B npm start

REM Aguardar servidor subir
timeout /t 5 /nobreak >nul

echo.
echo 📡 Verificando se Ngrok está disponível...
where ngrok >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Ngrok não encontrado!
    echo 💡 Baixe em: https://ngrok.com/download
    echo 💡 Ou use: winget install ngrok
    echo.
    echo ✅ Servidor está rodando em: http://localhost:3000
    echo 🎯 Configure manualmente o tunnel
    pause
    exit /b 0
)

echo.
echo 🌐 Iniciando Ngrok GRATUITO (sem authtoken)...
echo 🔧 Com bypass de aviso do navegador
echo ⚠️  URL mudará a cada 2 horas (limitação gratuita)
echo.

REM Iniciar Ngrok sem authtoken
ngrok http 3000 --request-header-add "ngrok-skip-browser-warning:true"

echo.
echo 🏁 Sistema finalizado
pause
