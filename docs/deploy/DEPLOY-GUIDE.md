# 🚀 GUIA COMPLETO DE DEPLOY - RAILWAY + IP FIXO
=====================================================

## 📋 PASSO A PASSO PARA DEPLOY SEM ERROS

### 1️⃣ **PREPARAÇÃO DO CÓDIGO**

✅ `package-lock.json` - **CRIADO**
✅ `Dockerfile` - **ATUALIZADO**
✅ `start.js` - **CRIADO** (novo sistema de inicialização)
✅ Scripts do `package.json` - **ATUALIZADOS**

### 2️⃣ **CONFIGURAÇÃO DO RAILWAY**

#### **A. Variáveis de Ambiente Obrigatórias**

Vá em Railway Dashboard > Settings > Environment:

```bash
# Database (automática)
DATABASE_URL=postgresql://... (configurada pelo Railway)

# Servidor
PORT=3000
NODE_ENV=production

# Trading
ENABLE_REAL_TRADING=false
POSITION_SAFETY_ENABLED=true

# IP FIXO (OBRIGATÓRIO)
NGROK_ENABLED=true
NGROK_AUTH_TOKEN=SEU_TOKEN_NGROK_AQUI
NGROK_SUBDOMAIN=coinbitclub-bot
NGROK_REGION=us
```

#### **B. Como obter o Ngrok Auth Token**

1. Acesse: https://dashboard.ngrok.com/get-started/your-authtoken
2. Faça login ou crie uma conta gratuita
3. Copie o token (formato: `2abc123...`)
4. Cole no Railway como `NGROK_AUTH_TOKEN`

### 3️⃣ **DEPLOY NO RAILWAY**

#### **Opção A: Via GitHub (Recomendado)**

1. Commit e push das alterações:
```bash
git add .
git commit -m "fix: corrigir build e adicionar IP fixo"
git push origin main
```

2. Railway fará deploy automático

#### **Opção B: Via Railway CLI**

```bash
railway login
railway link
railway up
```

### 4️⃣ **VERIFICAR DEPLOY**

#### **A. Logs do Deploy**
```bash
railway logs
```

Deve mostrar:
```
✅ npm ci executado com sucesso
✅ Ngrok iniciado
✅ Aplicação rodando na porta 3000
```

#### **B. Health Check**
```bash
curl https://seu-app.up.railway.app/health
```

Resposta esperada:
```json
{
  "status": "healthy",
  "timestamp": "2025-08-09T...",
  "version": "5.1.0"
}
```

### 5️⃣ **CONFIGURAÇÃO DO IP FIXO**

#### **A. Verificar URL do Ngrok**

Após deploy, acesse:
```
https://seu-app.up.railway.app/api/systems/status
```

Procure por:
```json
{
  "ngrok": {
    "url": "https://coinbitclub-bot.ngrok.io",
    "status": "active"
  }
}
```

#### **B. Whitelist nas Exchanges**

**BINANCE:**
1. Login > API Management
2. Edit API > IP Access Restriction
3. Adicionar: `IP do Ngrok`

**BYBIT:**
1. Login > API Management  
2. Modify > IP Restriction
3. Adicionar: `IP do Ngrok`

### 6️⃣ **TESTES FINAIS**

#### **A. Teste de Webhook**
```bash
curl -X POST https://coinbitclub-bot.ngrok.io/webhook \
  -H "Content-Type: application/json" \
  -d '{"symbol":"BTCUSDT","action":"BUY","price":45000}'
```

#### **B. Teste de Exchange**
```bash
curl https://coinbitclub-bot.ngrok.io/api/exchanges/health
```

### 🔧 **TROUBLESHOOTING**

#### **Erro: npm ci failed**
✅ **RESOLVIDO** - `package-lock.json` foi criado

#### **Erro: Ngrok não inicia**
- Verificar `NGROK_AUTH_TOKEN` no Railway
- Verificar `NGROK_SUBDOMAIN` disponível

#### **Erro: Database connection**
- Verificar `DATABASE_URL` no Railway
- Aguardar 1-2 minutos após deploy

#### **Erro: IP fixo não funciona**
```bash
# Verificar logs do Ngrok
railway logs --filter ngrok

# Verificar status
curl https://seu-app.up.railway.app/verificar-ip-fixo
```

### 📊 **MONITORAMENTO**

#### **URLs de Monitoramento**
- Health: `https://coinbitclub-bot.ngrok.io/health`
- Status: `https://coinbitclub-bot.ngrok.io/status`
- Dashboard: `https://coinbitclub-bot.ngrok.io/dashboard`
- IP Check: `https://coinbitclub-bot.ngrok.io/verificar-ip-fixo`

### 🎯 **PRÓXIMOS PASSOS**

1. ✅ Deploy com IP fixo funcionando
2. ⏳ Configurar whitelist nas exchanges
3. ⏳ Ativar trading real (`ENABLE_REAL_TRADING=true`)
4. ⏳ Configurar notificações WhatsApp
5. ⏳ Deploy do frontend

---

## 🆘 **SUPORTE**

Se algo der errado, execute:
```bash
railway logs --follow
```

E envie os logs para análise.

**Status**: 🟢 PRONTO PARA DEPLOY SEM ERROS!
