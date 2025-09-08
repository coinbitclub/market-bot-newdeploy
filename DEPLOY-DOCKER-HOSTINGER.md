# 🇱🇹 COINBITCLUB ENTERPRISE - GUIA DE DEPLOY DOCKER HOSTINGER
# ============================================================================
# Deploy automatizado com Docker no VPS Hostinger Lituânia
# Servidor: srv987989.hstgr.cloud (31.97.72.77)
# Data: 2025-09-03
# ============================================================================

## 🎯 **RESUMO DO DEPLOY**

Este guia implementa um deploy **totalmente automatizado** usando Docker no servidor Hostinger com:

- ✅ **Docker Compose** multi-container
- ✅ **PostgreSQL** com schema automático
- ✅ **Redis** para cache e sessões
- ✅ **NGINX** com SSL/TLS automático
- ✅ **Monitoramento** Prometheus + Grafana
- ✅ **Backup automático** diário
- ✅ **Health checks** e recovery automático

---

## 🚀 **DEPLOY EM 1 COMANDO**

### **Passo 1: Configurar Variáveis**
```bash
# Copiar template de configuração
cp .env.hostinger .env.production

# Editar com suas chaves reais
nano .env.production
```

**⚠️ IMPORTANTE:** Configure estas variáveis obrigatórias:
- `POSTGRES_PASSWORD` - Senha segura do PostgreSQL
- `BINANCE_API_KEY` / `BINANCE_SECRET_KEY` - APIs reais Binance
- `BYBIT_API_KEY` / `BYBIT_SECRET_KEY` - APIs reais Bybit  
- `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` - Stripe produção
- `OPENAI_API_KEY` - OpenAI GPT-4
- `JWT_SECRET` - Chave JWT ultra segura

### **Passo 2: Deploy Automático**
```bash
# Dar permissão de execução
chmod +x deploy-hostinger-docker.sh

# Executar deploy completo
./deploy-hostinger-docker.sh
```

**Isso vai automaticamente:**
1. ✅ Verificar dependências locais
2. ✅ Preparar arquivos de deploy
3. ✅ Configurar servidor Hostinger
4. ✅ Instalar Docker + Docker Compose
5. ✅ Fazer upload da aplicação
6. ✅ Configurar SSL com Let's Encrypt
7. ✅ Criar banco PostgreSQL com schema
8. ✅ Configurar NGINX com proxy reverso
9. ✅ Iniciar todos os containers
10. ✅ Configurar monitoramento e backup

---

## 🐳 **ARQUITETURA DOCKER**

### **Containers em Produção:**
```
┌─────────────────────────────────────────────────────────┐
│                    🌐 NGINX (80/443)                   │
│               SSL + Load Balancer + Cache              │
└─────────────────────┬───────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────┐
│              📱 CoinBitClub App (3000)                 │
│         Node.js 18 + Enterprise Orchestrator          │
└─────────────────────┬───────────────────────────────────┘
                      │
         ┌────────────┴────────────┐
         │                         │
┌────────▼─────────┐    ┌─────────▼──────────┐
│  🐘 PostgreSQL   │    │   📊 Redis Cache   │
│   (5432)         │    │      (6379)        │
│  Master + Schema │    │   Sessions + Data  │
└──────────────────┘    └────────────────────┘

            📈 Monitoramento
    ┌─────────────┬─────────────┐
    │ Prometheus  │   Grafana   │
    │   (9090)    │   (3001)    │
    └─────────────┴─────────────┘
```

### **Recursos Alocados:**
- **App Container:** 6GB RAM, 4 vCPU
- **PostgreSQL:** 8GB RAM, 4 vCPU  
- **Redis:** 2GB RAM, 1 vCPU
- **NGINX:** 512MB RAM, 0.5 vCPU
- **Monitoring:** 3GB RAM, 2 vCPU

---

## 🔧 **COMANDOS DE GERENCIAMENTO**

### **Conectar ao Servidor:**
```bash
ssh root@31.97.72.77
cd /opt/coinbitclub
```

### **Gerenciar Containers:**
```bash
# Ver status de todos os containers
docker-compose ps

# Ver logs da aplicação
docker-compose logs -f app

# Ver logs do PostgreSQL
docker-compose logs -f postgres

# Reiniciar aplicação
docker-compose restart app

# Parar tudo
docker-compose down

# Iniciar tudo novamente
docker-compose up -d
```

### **Monitorar Performance:**
```bash
# Uso de recursos
docker stats

# Logs em tempo real
docker-compose logs -f

# Health check manual
curl http://localhost:3000/api/enterprise/status
```

---

## 📊 **MONITORAMENTO E ACESSO**

### **URLs da Aplicação:**
- **🌐 Site Principal:** `https://coinbitclub.com`
- **📡 API Status:** `https://coinbitclub.com/api/enterprise/status`
- **🎯 Webhook TradingView:** `https://coinbitclub.com/api/enterprise/trading/webhooks/signal`

### **Dashboards de Monitoramento:**
- **📈 Grafana:** `http://31.97.72.77:3001`
  - User: `admin`
  - Password: *valor da variável GRAFANA_PASSWORD*
- **📊 Prometheus:** `http://31.97.72.77:9090`

### **Acesso Direto aos Serviços:**
- **🐘 PostgreSQL:** `31.97.72.77:5432`
- **📊 Redis:** `31.97.72.77:6379`

---

## 🔒 **CONFIGURAÇÃO SSL AUTOMÁTICA**

O script configura automaticamente:
- ✅ **Let's Encrypt** para certificados gratuitos
- ✅ **Renovação automática** via cron
- ✅ **Redirect HTTP → HTTPS**
- ✅ **Headers de segurança**
- ✅ **Rate limiting** para APIs

---

## 💾 **SISTEMA DE BACKUP**

### **Backup Automático Diário (2:00 AM):**
- ✅ PostgreSQL dump completo
- ✅ Redis snapshot
- ✅ Arquivos da aplicação
- ✅ Retenção de 7 dias
- ✅ Compressão automática

### **Backup Manual:**
```bash
cd /opt/coinbitclub
./backup.sh
```

### **Restaurar Backup:**
```bash
# PostgreSQL
docker exec -i coinbitclub-postgres psql -U coinbitclub_user coinbitclub_enterprise < backup.sql

# Redis
docker cp backup.rdb coinbitclub-redis:/data/dump.rdb
docker-compose restart redis
```

---

## 🛠️ **CONFIGURAÇÃO DO TRADINGVIEW**

### **Webhook URL:**
```
https://coinbitclub.com/api/enterprise/trading/webhooks/signal
```

### **Headers:**
```
Content-Type: application/json
Authorization: Bearer SEU_TRADINGVIEW_WEBHOOK_SECRET
```

### **Payload Template:**
```json
{
    "action": "{{strategy.order.action}}",
    "symbol": "{{ticker}}",
    "strength": "FORTE",
    "price": {{close}},
    "timestamp": "{{time}}"
}
```

---

## 🚨 **SOLUÇÃO DE PROBLEMAS**

### **Container não inicia:**
```bash
# Ver logs detalhados
docker-compose logs container-name

# Verificar recursos
docker system df
docker system prune -f
```

### **Erro de conexão PostgreSQL:**
```bash
# Verificar status
docker-compose exec postgres pg_isready

# Conectar manualmente
docker-compose exec postgres psql -U coinbitclub_user coinbitclub_enterprise
```

### **Aplicação não responde:**
```bash
# Health check
curl -v http://localhost:3000/api/enterprise/status

# Reiniciar app
docker-compose restart app

# Ver utilização de recursos
docker stats coinbitclub-app
```

---

## 📞 **SUPORTE E MANUTENÇÃO**

### **Logs Importantes:**
- **Aplicação:** `/var/log/coinbitclub/app.log`
- **NGINX:** `/var/log/coinbitclub/nginx/`
- **Sistema:** `journalctl -f`

### **Atualizar Aplicação:**
1. Fazer backup: `./backup.sh`
2. Parar containers: `docker-compose down`
3. Atualizar código
4. Rebuild: `docker-compose up -d --build`

### **Escalabilidade:**
```bash
# Aumentar replicas da app
docker-compose up -d --scale app=3

# Monitorar carga
htop
iotop
```

---

## ✅ **CHECKLIST PÓS-DEPLOY**

- [ ] ✅ **Aplicação respondendo:** `https://coinbitclub.com/api/enterprise/status`
- [ ] ✅ **SSL ativo:** Certificado válido no browser
- [ ] ✅ **Webhook TradingView:** Teste com POST manual
- [ ] ✅ **Database Schema:** Tabelas criadas automaticamente
- [ ] ✅ **Grafana configurado:** Dashboards carregando
- [ ] ✅ **Backup funcionando:** Verificar `/var/backups/coinbitclub/`
- [ ] ✅ **APIs configuradas:** Testar Binance, Bybit, Stripe
- [ ] ✅ **DNS configurado:** Domínio apontando para VPS
- [ ] ✅ **Firewall configurado:** Portas adequadas abertas

---

## 🎉 **DEPLOY CONCLUÍDO!**

Sua aplicação CoinBitClub Enterprise v6.0.0 está agora rodando em produção no servidor Hostinger da Lituânia com:

- 🚀 **Performance otimizada** para 32GB RAM / 8 vCPU
- 🔒 **Segurança enterprise** com SSL e firewalls
- 📊 **Monitoramento completo** com alertas
- 💾 **Backup automático** e disaster recovery
- 🐳 **Docker** para fácil manutenção e atualizações

**A aplicação está pronta para receber sinais do TradingView e executar operações de trading em tempo real!**
