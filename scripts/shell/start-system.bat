@echo off
echo 🔄 REINICIANDO SERVIDOR DE TRADING...
echo =====================================

REM Parar todos os processos Node.js
echo 🛑 Parando processos existentes...
taskkill /f /im node.exe 2>nul

REM Aguardar 3 segundos
echo ⏳ Aguardando 3 segundos...
timeout /t 3 /nobreak >nul

REM Limpar a tela
cls

REM Mostrar informações do sistema
echo 🚀 COINBITCLUB TRADING SYSTEM
echo ==============================
echo.
echo 📍 Diretório: %~dp0
echo 📅 Data/Hora: %date% %time%
echo.

REM Verificar se o arquivo existe
if not exist "painel-completo-integrado.js" (
    echo ❌ ERRO: Arquivo painel-completo-integrado.js não encontrado!
    echo 📍 Diretório atual: %cd%
    pause
    exit /b 1
)

REM Verificar se o arquivo .env existe
if not exist ".env" (
    echo ⚠️ AVISO: Arquivo .env não encontrado!
    echo 📝 Criando .env básico...
    echo NODE_ENV=production > .env
    echo PORT=3000 >> .env
)

REM Iniciar o servidor
echo 🚀 Iniciando servidor...
echo.
node painel-completo-integrado.js

REM Se chegou aqui, o servidor parou
echo.
echo ⚠️ SERVIDOR PAROU!
echo 🔄 Pressione qualquer tecla para reiniciar ou feche esta janela
pause >nul

REM Reiniciar automaticamente
goto :eof
