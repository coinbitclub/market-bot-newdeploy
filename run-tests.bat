@echo off
echo 🧪 EXECUTANDO TESTES DO SISTEMA...
echo ==================================

REM Verificar se o servidor está rodando
echo 🔍 Verificando servidor...
curl -s http://localhost:3000/api/status >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo ❌ SERVIDOR OFFLINE!
    echo 🚀 Iniciando servidor em background...
    start /B node painel-completo-integrado.js
    echo ⏳ Aguardando 5 segundos para inicialização...
    timeout /t 5 /nobreak >nul
)

echo ✅ Servidor detectado
echo.

REM Executar testes
echo 🧪 Executando testes completos...
node test-sistema-completo-fixed.js

echo.
echo 🎯 Testes concluídos!
echo 📖 Consulte REVISAO-COMPLETA-ELIMINACAO-MOCK.md para detalhes
pause
