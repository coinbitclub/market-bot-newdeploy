@echo off
echo "=== TESTE PROFISSIONAL COINBITCLUB ==="
cd /d "C:\Nova pasta\coinbitclub-market-bot\backend"
node app.js > debug-output.txt 2>&1
echo "Output capturado em debug-output.txt"
type debug-output.txt
