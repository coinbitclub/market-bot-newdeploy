# 🇱🇹 COINBITCLUB ENTERPRISE - DEPLOY DOCKER EXECUTAR AGORA
# ============================================================================
# TODAS AS OPÇÕES DE DEPLOY PRONTAS
# ============================================================================

## 🎯 **OPÇÃO 1: DEPLOY AUTOMÁTICO (RECOMENDADO)**

### **Execute este comando no servidor Hostinger:**
```bash
curl -fsSL https://raw.githubusercontent.com/coinbitclub/market-bot-newdeploy/main/deploy-remote.sh | bash
```

**OU se não funcionar, conecte manualmente:**
```bash
# 1. Conectar ao servidor
ssh root@31.97.72.77

# 2. Baixar e executar
wget -O deploy.sh https://raw.githubusercontent.com/coinbitclub/market-bot-newdeploy/main/deploy-remote.sh
chmod +x deploy.sh
./deploy.sh
```

---

## 🎯 **OPÇÃO 2: DEPLOY MANUAL COM PACOTE PRONTO**

### **Arquivos Preparados Localmente:**
✅ `coinbitclub-enterprise-v6.tar.gz` (1.37MB) - Pacote completo
✅ `docker-compose.hostinger.yml` - Orquestração Docker
✅ `Dockerfile.production` - Build otimizado
✅ `.env.production` - Variáveis configuradas
✅ `DEPLOY-MANUAL-HOSTINGER.md` - Guia passo-a-passo

### **Como usar:**
```bash
# 1. Conectar ao servidor
ssh root@31.97.72.77

# 2. Fazer upload do pacote
scp coinbitclub-enterprise-v6.tar.gz root@31.97.72.77:/opt/

# 3. Seguir o guia manual
# Ver: DEPLOY-MANUAL-HOSTINGER.md
```

---

## 🎯 **OPÇÃO 3: TESTEI CONECTIVIDADE**

**Status da Conexão:**
```
🔍 Testando conectividade com 31.97.72.77...
❌ Servidor não acessível - verifique sua conexão
```

### **Possíveis Soluções:**
1. **Verificar VPN/Proxy** - Pode estar bloqueando
2. **Aguardar provisioning** - Servidor pode estar sendo configurado
3. **Verificar IP correto** - Confirmar no painel Hostinger
4. **Usar terminal web** - Acessar via painel Hostinger

---

## 🌐 **ACESSO VIA PAINEL HOSTINGER**

### **Método Alternativo (Sem SSH direto):**
1. Acesse: https://hpanel.hostinger.com
2. Vá em **VPS** → Seu VPS
3. Clique em **Manage** → **Terminal**
4. Execute o comando de deploy automático:
   ```bash
   curl -fsSL https://raw.githubusercontent.com/coinbitclub/market-bot-newdeploy/main/deploy-remote.sh | bash
   ```

---

## 📊 **O QUE O DEPLOY AUTOMÁTICO FAZ:**

✅ **Instala Docker** + Docker Compose
✅ **Configura Firewall** (UFW com portas necessárias)
✅ **Cria Estrutura** de diretórios
✅ **Deploy Completo** com todos os containers:
   - 🌐 **NGINX** (Load Balancer + Proxy)
   - 📱 **CoinBitClub App** (Node.js + API)
   - 🐘 **PostgreSQL** (Database)
   - 📊 **Redis** (Cache)
   - 📈 **Prometheus** (Métricas)
   - 📊 **Grafana** (Dashboards)

✅ **Webhook TradingView** funcionando
✅ **Monitoramento** ativo
✅ **Health Checks** automáticos

---

## 🎯 **URLS APÓS DEPLOY:**

**Aplicação Principal:**
- 🌐 **Site:** `http://31.97.72.77`
- 📡 **API Status:** `http://31.97.72.77/api/enterprise/status`
- 🎯 **Webhook TradingView:** `http://31.97.72.77/api/enterprise/trading/webhooks/signal`

**Monitoramento:**
- 📊 **Grafana:** `http://31.97.72.77:3001` (admin/admin123)
- 📈 **Prometheus:** `http://31.97.72.77:9090`

**Databases:**
- 🐘 **PostgreSQL:** `31.97.72.77:5432`
- 📊 **Redis:** `31.97.72.77:6379`

---

## 🚀 **EXECUTAR DEPLOY AGORA:**

### **Escolha uma opção:**

**🔥 RÁPIDO (Automático):**
```bash
# Conectar e executar em 1 linha
ssh root@31.97.72.77 "curl -fsSL https://raw.githubusercontent.com/coinbitclub/market-bot-newdeploy/main/deploy-remote.sh | bash"
```

**🔧 MANUAL (Controle total):**
```bash
# Usar o guia: DEPLOY-MANUAL-HOSTINGER.md
# Fazer upload: coinbitclub-enterprise-v6.tar.gz
```

**🌐 VIA PAINEL (Sem SSH):**
```bash
# Acessar hpanel.hostinger.com → Terminal
# Executar: curl -fsSL ... | bash
```

---

## ⚡ **APÓS O DEPLOY:**

1. ✅ **Testar Webhook:**
   ```bash
   curl -X POST http://31.97.72.77/api/enterprise/trading/webhooks/signal \
   -H "Content-Type: application/json" \
   -d '{"action":"BUY","symbol":"BTCUSDT","price":45000}'
   ```

2. ✅ **Configurar TradingView:**
   - URL: `http://31.97.72.77/api/enterprise/trading/webhooks/signal`
   - Headers: `Content-Type: application/json`

3. ✅ **Monitorar:**
   ```bash
   ssh root@31.97.72.77 "cd /opt/coinbitclub && docker-compose logs -f"
   ```

---

## 🎉 **TUDO PRONTO!**

O CoinBitClub Enterprise v6.0.0 está preparado para deploy no servidor Hostinger da Lituânia com Docker!

**Escolha seu método preferido e execute o deploy! 🚀**
