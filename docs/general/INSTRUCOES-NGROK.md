📋 **INSTRUÇÕES PARA RESOLVER O AVISO DO NGROK**

## 🚨 Situação Atual:
- ✅ Sistema CoinBitClub funcionando
- ✅ Ngrok configurado com authtoken
- ❌ Aviso "Visit Site" aparece no navegador

## 🔧 **SOLUÇÕES:**

### 1. **MÉTODO RÁPIDO - Execute um dos scripts:**

**PowerShell (Recomendado):**
```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy Bypass -Force
cd "c:\Nova pasta\coinbitclub-market-bot\backend"
.\start-ngrok.ps1
```

**Batch:**
```cmd
cd "c:\Nova pasta\coinbitclub-market-bot\backend"
start-ngrok-bypass.bat
```

### 2. **COMANDO MANUAL:**
```bash
ngrok http 3000 --request-header-add "ngrok-skip-browser-warning:true" --authtoken 314SgsgTAORpH3gJ1enmVEEQnu3_3uXNyK3Q8uEAu8VZa7LFZ --region eu
```

### 3. **CONFIGURAÇÃO NO TRADINGVIEW:**

**URL do Webhook:**
```
https://[SEU-NGROK-URL]/webhook/tradingview
```

**Headers Obrigatórios:**
```
ngrok-skip-browser-warning: true
User-Agent: TradingView-Webhook
Content-Type: application/json
```

**JSON do Payload:**
```json
{
    "symbol": "{{ticker}}",
    "side": "{{strategy.order.action}}",
    "action": "signal",
    "price": "{{close}}",
    "time": "{{time}}"
}
```

### 4. **ALTERNATIVA - USAR RAILWAY (SEM AVISO):**
```
URL: https://coinbitclub-market-bot-backend-production.up.railway.app
```

## 🎯 **PRÓXIMOS PASSOS:**

1. **Execute um dos scripts acima**
2. **Copie a nova URL do Ngrok**  
3. **Configure no TradingView com os headers**
4. **Adicione IP no whitelist das exchanges:**
   - Bybit: https://www.bybit.com/app/user/api-management
   - Binance: https://www.binance.com/en/my/settings/api-management

## ⚡ **TESTE RÁPIDO:**
```bash
curl -X POST "https://[NGROK-URL]/webhook/tradingview" \
  -H "Content-Type: application/json" \
  -H "ngrok-skip-browser-warning: true" \
  -d '{"symbol":"BTCUSDT","side":"buy","action":"test"}'
```

🚀 **O sistema está 100% funcional, só precisa resolver o aviso do Ngrok!**
