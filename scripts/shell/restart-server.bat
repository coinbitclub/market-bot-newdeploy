@echo off
echo "Parando processos Node.js..."
taskkill /f /im node.exe 2>nul
timeout /t 3 >nul
echo "Iniciando servidor corrigido..."
cd /d "c:\Nova pasta\coinbitclub-market-bot\backend"
node painel-completo-integrado.js
pause
