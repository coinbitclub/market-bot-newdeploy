@echo off
echo.
echo 🎯 EXECUTANDO TESTE COMPLETO DE ENDPOINTS
echo ==========================================
echo.

cd /d "c:\Nova pasta\coinbitclub-market-bot\backend"

echo 📋 Verificando arquivos necessários...
if not exist minimal-server-test.js (
    echo ❌ Arquivo minimal-server-test.js não encontrado
    pause
    exit /b 1
)

if not exist test-automatico.js (
    echo ❌ Arquivo test-automatico.js não encontrado
    pause
    exit /b 1
)

echo ✅ Arquivos encontrados
echo.

echo 🚀 Iniciando teste automatizado...
node test-automatico.js > resultado-teste.txt 2>&1

echo.
echo 📊 RESULTADO DO TESTE:
echo =====================
type resultado-teste.txt

echo.
echo 📝 Resultado salvo em: resultado-teste.txt
echo.

pause
