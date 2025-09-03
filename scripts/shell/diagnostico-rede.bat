@echo off
echo.
echo ========================================
echo DIAGNOSTICO DE CONECTIVIDADE - TRADING BOT
echo ========================================
echo.

echo [1/5] Testando conectividade basica...
ping google.com -n 2 > nul
if %errorlevel% == 0 (
    echo ✅ Internet: OK
) else (
    echo ❌ Internet: FALHOU
)

echo.
echo [2/5] Testando DNS Railway...
nslookup trolley.proxy.rlwy.net > nul 2>&1
if %errorlevel% == 0 (
    echo ✅ DNS Railway: OK
) else (
    echo ❌ DNS Railway: FALHOU
)

echo.
echo [3/5] Testando DNS Binance...
nslookup api.binance.com > nul 2>&1
if %errorlevel% == 0 (
    echo ✅ DNS Binance: OK
) else (
    echo ❌ DNS Binance: FALHOU
)

echo.
echo [4/5] Testando ping Railway...
ping trolley.proxy.rlwy.net -n 2 > nul 2>&1
if %errorlevel% == 0 (
    echo ✅ Ping Railway: OK
) else (
    echo ❌ Ping Railway: FALHOU
)

echo.
echo [5/5] Testando ping Binance...
ping api.binance.com -n 2 > nul 2>&1
if %errorlevel% == 0 (
    echo ✅ Ping Binance: OK
) else (
    echo ❌ Ping Binance: FALHOU
)

echo.
echo ========================================
echo CONFIGURACOES DE REDE:
echo ========================================
ipconfig | findstr "IPv4"
echo.
echo DNS Servers:
ipconfig /all | findstr "DNS"

echo.
echo ========================================
echo SOLUCOES SUGERIDAS:
echo ========================================
echo 1. Reiniciar roteador/modem
echo 2. Alterar DNS para 8.8.8.8 e 8.8.4.4
echo 3. Verificar firewall/antivirus
echo 4. Verificar proxy corporativo
echo 5. Verificar VPN ativa
echo ========================================
