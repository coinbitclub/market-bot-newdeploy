@echo off
echo.
echo ========================================
echo 🚀 COINBITCLUB - DASHBOARD PRODUCAO
echo ========================================
echo.

echo 🔧 Verificando Node.js...
node --version
if %errorlevel% neq 0 (
    echo ❌ Node.js nao encontrado! Instale o Node.js primeiro.
    pause
    exit /b 1
)

echo ✅ Node.js encontrado
echo.

echo 🔧 Verificando dependencias...
if not exist node_modules (
    echo 📦 Instalando dependencias...
    npm install
    if %errorlevel% neq 0 (
        echo ❌ Erro ao instalar dependencias
        pause
        exit /b 1
    )
    echo ✅ Dependencias instaladas
) else (
    echo ✅ Dependencias ja instaladas
)

echo.
echo 🚀 Iniciando CoinBitClub Dashboard Producao...
echo 🌐 Dashboard estara disponivel em:
echo    • Local: http://localhost:3000/dashboard-production
echo    • Producao: https://coinbitclub-market-bot.up.railway.app/dashboard-production
echo.
echo 🔄 Pressione Ctrl+C para parar o servidor
echo.

node start-dashboard.js

pause
