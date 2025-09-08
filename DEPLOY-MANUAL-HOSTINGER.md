# 🇱🇹 COINBITCLUB ENTERPRISE - DEPLOY MANUAL DOCKER HOSTINGER
# ============================================================================
# Guia passo-a-passo para deploy no servidor Hostinger
# VPS: 31.97.72.77 | srv987989.hstgr.cloud
# ============================================================================

## 🎯 **PREPARAÇÃO LOCAL (Executar no Windows)**

### **1. Verificar Arquivos Criados:**
```bash
# Verificar se todos os arquivos estão prontos
ls -la docker-compose.hostinger.yml
ls -la Dockerfile.production  
ls -la .env.production
ls -la deploy-hostinger-docker.sh
```

### **2. Preparar Package de Deploy:**
```bash
# Criar diretório de deploy
mkdir deploy-package

# Copiar arquivos essenciais
cp -r src deploy-package/
cp -r config deploy-package/ 2>/dev/null || echo "Criando config..."
cp -r scripts deploy-package/
cp package*.json deploy-package/
cp Dockerfile.production deploy-package/Dockerfile
cp docker-compose.hostinger.yml deploy-package/docker-compose.yml
cp .env.production deploy-package/
cp enterprise-orchestrator.js deploy-package/

# Criar arquivo de versão
echo "6.0.0" > deploy-package/VERSION
echo "$(date -u +%Y-%m-%dT%H:%M:%S)Z" > deploy-package/BUILD_DATE

# Criar pacote para upload
tar -czf coinbitclub-enterprise-v6.tar.gz -C deploy-package .
```

---

## 🌐 **CONECTAR AO SERVIDOR HOSTINGER**

### **Opção 1: Via SSH (Recomendado)**
```bash
ssh root@31.97.72.77
```

### **Opção 2: Via Painel Hostinger**
1. Acesse https://hpanel.hostinger.com
2. Vá em "VPS" → Seu VPS
3. Clique em "Manage" → "Terminal"

---

## 🐳 **CONFIGURAÇÃO DO SERVIDOR (Executar no VPS)**

### **1. Atualizar Sistema:**
```bash
apt update && apt upgrade -y
```

### **2. Instalar Docker:**
```bash
# Instalar Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Instalar Docker Compose
curl -L "https://github.com/docker/compose/releases/download/v2.21.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Verificar instalação
docker --version
docker-compose --version
```

### **3. Criar Estrutura de Diretórios:**
```bash
# Criar diretórios da aplicação
mkdir -p /opt/coinbitclub
mkdir -p /var/lib/coinbitclub/{postgres,redis,prometheus,grafana}
mkdir -p /var/log/coinbitclub
mkdir -p /var/backups/coinbitclub

# Definir permissões
chown -R root:root /opt/coinbitclub
chmod -R 755 /opt/coinbitclub
```

### **4. Configurar Firewall:**
```bash
# Configurar UFW
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw allow 3000/tcp  # App
ufw allow 5432/tcp  # PostgreSQL
ufw allow 6379/tcp  # Redis
ufw allow 9090/tcp  # Prometheus
ufw allow 3001/tcp  # Grafana
ufw --force enable

# Verificar status
ufw status
```

---

## 📁 **UPLOAD DOS ARQUIVOS**

### **Método 1: SCP (Se tiver SSH configurado):**
```bash
# Do seu computador local
scp coinbitclub-enterprise-v6.tar.gz root@31.97.72.77:/opt/coinbitclub/
```

### **Método 2: Manual via Terminal Hostinger:**
```bash
# No servidor, baixar do GitHub ou upload manual
cd /opt/coinbitclub
# Você precisará fazer upload manual dos arquivos
```

### **3. Extrair Arquivos:**
```bash
cd /opt/coinbitclub
tar -xzf coinbitclub-enterprise-v6.tar.gz
rm coinbitclub-enterprise-v6.tar.gz
chmod +x scripts/*.sh 2>/dev/null || echo "Scripts não encontrados"
```

---

## 🔧 **CONFIGURAÇÃO DOS SERVIÇOS**

### **1. Configurar PostgreSQL:**
```bash
cd /opt/coinbitclub
mkdir -p config/postgres

cat > config/postgres/postgresql.conf << 'EOF'
# PostgreSQL configuration for production
max_connections = 200
shared_buffers = 4GB
effective_cache_size = 12GB
maintenance_work_mem = 512MB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100
random_page_cost = 1.1
effective_io_concurrency = 200
work_mem = 20MB
min_wal_size = 1GB
max_wal_size = 4GB
max_worker_processes = 8
max_parallel_workers_per_gather = 4
max_parallel_workers = 8
max_parallel_maintenance_workers = 4
EOF

cat > config/postgres/init-db.sh << 'EOF'
#!/bin/bash
set -e
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
    CREATE EXTENSION IF NOT EXISTS "pgcrypto";
EOSQL
EOF

chmod +x config/postgres/init-db.sh
```

### **2. Configurar NGINX:**
```bash
mkdir -p config/nginx

cat > config/nginx/nginx.conf << 'EOF'
events {
    worker_connections 1024;
}

http {
    upstream app {
        server app:3000;
    }
    
    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=trading:10m rate=5r/s;
    
    server {
        listen 80;
        server_name _;
        
        location / {
            proxy_pass http://app;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
        
        location /api/enterprise/trading/webhooks/ {
            limit_req zone=trading burst=10 nodelay;
            proxy_pass http://app;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }
        
        location /health {
            access_log off;
            return 200 "healthy\n";
            add_header Content-Type text/plain;
        }
    }
}
EOF
```

### **3. Configurar Monitoramento:**
```bash
mkdir -p config/prometheus config/grafana/{dashboards,datasources}

cat > config/prometheus/prometheus.yml << 'EOF'
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'coinbitclub-app'
    static_configs:
      - targets: ['app:3000']
    metrics_path: '/api/metrics'
    scrape_interval: 30s

  - job_name: 'postgresql'
    static_configs:
      - targets: ['postgres:5432']

  - job_name: 'redis'
    static_configs:
      - targets: ['redis:6379']
EOF

cat > config/grafana/datasources/prometheus.yml << 'EOF'
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
EOF
```

---

## 🚀 **EXECUTAR O DEPLOY**

### **1. Verificar Arquivo .env:**
```bash
cat .env.production
# Verifique se todas as variáveis estão corretas
```

### **2. Iniciar Containers:**
```bash
cd /opt/coinbitclub

# Parar containers existentes (se houver)
docker-compose down 2>/dev/null || echo "Nenhum container rodando"

# Limpar sistema
docker system prune -f

# Construir e iniciar
docker-compose up -d --build

# Aguardar inicialização
sleep 30

# Verificar status
docker-compose ps
```

### **3. Verificar Logs:**
```bash
# Ver logs da aplicação
docker-compose logs app

# Ver logs do PostgreSQL
docker-compose logs postgres

# Ver logs do Redis
docker-compose logs redis

# Ver todos os logs
docker-compose logs
```

---

## ✅ **VERIFICAÇÃO DE SAÚDE**

### **1. Testar Endpoints:**
```bash
# Status da aplicação
curl http://localhost:3000/api/enterprise/status

# Health check do load balancer
curl http://localhost/health

# Verificar PostgreSQL
docker-compose exec postgres pg_isready -U coinbitclub_user

# Verificar Redis
docker-compose exec redis redis-cli ping
```

### **2. Verificar Recursos:**
```bash
# Status dos containers
docker-compose ps

# Uso de recursos
docker stats --no-stream

# Logs em tempo real
docker-compose logs -f
```

---

## 🌐 **ACESSAR A APLICAÇÃO**

### **URLs Principais:**
- **🌐 Aplicação:** `http://31.97.72.77`
- **📡 API Status:** `http://31.97.72.77/api/enterprise/status`
- **🎯 Webhook TradingView:** `http://31.97.72.77/api/enterprise/trading/webhooks/signal`
- **📊 Grafana:** `http://31.97.72.77:3001`
- **📈 Prometheus:** `http://31.97.72.77:9090`

---

## 🔧 **COMANDOS ÚTEIS**

### **Gerenciar Containers:**
```bash
# Parar todos
docker-compose down

# Iniciar novamente
docker-compose up -d

# Reiniciar apenas a app
docker-compose restart app

# Ver logs em tempo real
docker-compose logs -f app

# Entrar no container da app
docker-compose exec app sh

# Backup do banco
docker-compose exec postgres pg_dump -U coinbitclub_user coinbitclub_enterprise > backup.sql
```

### **Monitoramento:**
```bash
# Status geral
docker-compose ps

# Uso de recursos
docker stats

# Espaço em disco
df -h
du -sh /var/lib/coinbitclub/*
```

---

## 🎯 **CONFIGURAR WEBHOOK TRADINGVIEW**

Após o deploy, use estas configurações no TradingView:

**URL:** `http://31.97.72.77/api/enterprise/trading/webhooks/signal`

**Headers:**
```
Content-Type: application/json
Authorization: Bearer TradingView_CoinBit_Webhook_Secret_2025
```

**Payload:**
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

## 🎉 **DEPLOY CONCLUÍDO!**

Se todos os passos foram executados com sucesso, sua aplicação CoinBitClub Enterprise v6.0.0 está rodando em produção no servidor Hostinger da Lituânia!

**Próximos passos:**
1. ✅ Configurar DNS para apontar seu domínio para o IP 31.97.72.77
2. ✅ Configurar SSL com Let's Encrypt (se necessário)
3. ✅ Testar webhook do TradingView
4. ✅ Configurar APIs reais (Binance, Bybit, Stripe, OpenAI)
5. ✅ Monitorar logs e performance
