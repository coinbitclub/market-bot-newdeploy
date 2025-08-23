@echo off
echo.
echo ========================================
echo 🚀 DEPLOY DASHBOARD PARA PRODUCAO
echo ========================================
echo.

echo 📝 Fazendo commit das alteracoes...
git add .
git commit -m "feat: Adicionar dashboard de producao com dados reais integrado ao sistema principal - rotas /dashboard-production configuradas"

echo.
echo 🌐 Enviando para GitHub (Railway fara deploy automatico)...
git push origin main

echo.
echo ⏰ Aguarde alguns minutos para o Railway fazer o deploy automatico
echo 📊 Dashboard estara disponivel em:
echo    https://coinbitclub-market-bot.up.railway.app/dashboard-production
echo.

pause
