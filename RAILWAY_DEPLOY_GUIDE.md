# 🚂 CONFIGURAÇÃO COMPLETA NO RAILWAY

## 🎯 SEU IP FIXO SERÁ: `https://coinbitclub-bot.ngrok.io`

### 📋 VARIÁVEIS OBRIGATÓRIAS NO RAILWAY

Copie e cole cada variável no Railway Dashboard:

```bash
# 1. IP FIXO - NGROK (PRINCIPAL)
NGROK_AUTH_TOKEN=314SgsgTA9RpH3gJJenmvEEOnu3_3uXNyK3QBwE4u8vZa7tFZ
NGROK_REGION=us
NGROK_SUBDOMAIN=coinbitclub-bot

# 2. BANCO DE DADOS (Railway fornece automaticamente)
DATABASE_URL=[Railway vai preencher automaticamente]

# 3. OPENAI (para IA)
OPENAI_API_KEY=[sua-chave-openai-sk-...]

# 4. SISTEMA
NODE_ENV=production
PORT=3000
```

### 🚀 PASSO A PASSO NO RAILWAY:

1. **Acesse:** https://railway.app/dashboard
2. **Selecione:** coinbitclub-market-bot
3. **Clique:** Settings > Variables
4. **Adicione cada variável:**
   - Nome: `NGROK_AUTH_TOKEN`
   - Valor: `314SgsgTA9RpH3gJJenmvEEOnu3_3uXNyK3QBwE4u8vZa7tFZ`
   - (repetir para todas)
5. **Configure Branch:** `clean-deploy`
6. **Clique:** Deploy

### 🌐 RESULTADO ESPERADO:

Após o deploy, seu sistema terá:
- ✅ **IP Fixo:** `https://coinbitclub-bot.ngrok.io`
- ✅ **Acesso 24/7** através deste endereço
- ✅ **Compatível** com whitelists das exchanges
- ✅ **Redirecionamento automático** para o Railway

### 🔒 CONFIGURAR NAS EXCHANGES:

**Bybit:**
1. API Management > Sua API Key
2. IP Restrictions > Add IP
3. Adicionar: `coinbitclub-bot.ngrok.io`

**Binance:**
1. API Management > Edit API
2. IP Access Restriction
3. Adicionar: `coinbitclub-bot.ngrok.io`

### ⚡ TESTE RÁPIDO:

Após deploy, teste:
```bash
curl https://coinbitclub-bot.ngrok.io/health
```

Deve retornar status do sistema! 🎯
