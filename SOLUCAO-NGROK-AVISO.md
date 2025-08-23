🔧 SOLUÇÃO PARA O AVISO DO NGROK

❌ PROBLEMA: Tela "Visit Site" aparece no Ngrok gratuito

✅ SOLUÇÕES:

1. 🔄 REINICIAR NGROK COM HEADER:
   Execute no PowerShell:
   
   taskkill /f /im ngrok.exe
   ngrok http 3000 --request-header-add "ngrok-skip-browser-warning:true"

2. 📡 USAR HEADERS NO TRADINGVIEW:
   Adicione estes headers no webhook:
   
   ngrok-skip-browser-warning: true
   User-Agent: TradingView-Webhook

3. 🧪 TESTAR COM CURL:
   
   curl -X POST "https://aa03e238ea55.ngrok-free.app/webhook/tradingview" \
     -H "Content-Type: application/json" \
     -H "ngrok-skip-browser-warning: true" \
     -H "User-Agent: TradingView-Webhook" \
     -d '{"symbol":"BTCUSDT","side":"buy","action":"test"}'

4. 🆙 UPGRADE PARA NGROK PAGO (Recomendado):
   - Remove todos os avisos
   - Domínio personalizado  
   - Maior estabilidade

📋 ALTERNATIVA: Usar diretamente o Railway
   URL: https://coinbitclub-market-bot-backend-production.up.railway.app

💡 O sistema funciona mesmo com o aviso, mas para produção é melhor usar Railway ou Ngrok pago.
