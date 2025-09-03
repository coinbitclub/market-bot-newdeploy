@echo off
echo ====================================
echo EXECUTANDO COLETA DE SALDOS REAIS
echo ====================================
echo.
echo Timestamp: %date% %time%
echo.

node replicar-conexao-real.js

echo.
echo ====================================
echo EXECUCAO FINALIZADA
echo ====================================
pause
