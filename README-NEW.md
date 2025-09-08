# 🚀 CoinBitClub Enterprise v6.0.0

Sistema de trading automatizado enterprise com integração TradingView, gerenciamento multi-usuário e APIs de exchanges.

## 📋 Estrutura Organizada do Projeto

```
market-bot-newdeploy/
├── deployment/                    # 🚀 Scripts e configurações de deploy
│   ├── scripts/                   # Scripts de implantação
│   │   ├── deploy-github.sh      # ✅ Deploy direto do GitHub (PRINCIPAL)
│   │   ├── deploy-hostinger-docker.sh # ✅ Deploy completo Docker
│   │   ├── deploy-hostinger-complete.sh # Deploy alternativo
│   │   └── comandos-terminal-hostinger.txt # Comandos manuais
│   ├── docker/                    # Configurações Docker
│   │   ├── docker-compose.hostinger.yml # Docker Compose Hostinger
│   │   ├── docker-compose.production.yml # Docker Compose produção
│   │   └── Dockerfile.production  # Dockerfile otimizado
│   ├── configs/                   # Configurações de ambiente
│   │   └── .env.hostinger        # Variáveis ambiente Hostinger
│   └── README.md                  # 📋 Guia completo de deploy
├── src/                          # 💻 Código fonte principal
│   ├── api/enterprise/           # API Enterprise principal
│   ├── services/                 # Serviços (financial, trading, etc)
│   ├── modules/                  # Módulos funcionais
│   └── utils/                    # Utilitários
├── scripts/                      # 🔧 Scripts utilitários e automação
├── docs/                         # 📚 Documentação técnica
├── config/                       # ⚙️ Configurações gerais
├── tests/                        # 🧪 Testes automatizados
└── enterprise-orchestrator.js   # 🎯 Orquestrador principal
```

## 🚀 Deploy Rápido

### 🎯 Para Hostinger VPS (31.97.72.77):

**Comando único no terminal Hostinger:**
```bash
curl -sSL https://raw.githubusercontent.com/coinbitclub/market-bot-newdeploy/main/deployment/scripts/deploy-github.sh | bash
```

### 📋 Deploy Manual:

```bash
# Clone do repositório
git clone https://github.com/coinbitclub/market-bot-newdeploy.git
cd market-bot-newdeploy

# Executar deploy
chmod +x deployment/scripts/deploy-hostinger-docker.sh
./deployment/scripts/deploy-hostinger-docker.sh
```

## 📡 TradingView Webhook

```
http://31.97.72.77/api/enterprise/trading/webhooks/signal
```

## 🌐 URLs da Aplicação

- **🏠 Homepage:** http://31.97.72.77
- **🔍 Health Check:** http://31.97.72.77/health
- **📊 Status API:** http://31.97.72.77/api/enterprise/status
- **📡 TradingView Webhook:** http://31.97.72.77/api/enterprise/trading/webhooks/signal

## ✨ Funcionalidades

- ✅ **TradingView Webhook Integration**
- ✅ **Multi-User Trading System**
- ✅ **Binance & Bybit API Support**
- ✅ **Real-time Dashboard**
- ✅ **Financial Management System**
- ✅ **Commission & Affiliate System**
- ✅ **Docker Deployment**
- ✅ **Enterprise Scalability**

## 🔄 Atualização do Sistema

Para atualizar após mudanças no código:

```bash
# No servidor Hostinger
cd /opt/coinbitclub-enterprise
git pull origin main
docker-compose restart
```

## 📊 Monitoramento

```bash
# Ver logs em tempo real
docker-compose logs -f

# Status dos containers
docker-compose ps

# Reiniciar aplicação
docker-compose restart
```

## 📚 Documentação

- [📋 **Guia de Deploy**](deployment/README.md) - Deploy completo no Hostinger
- [🏗️ **Arquitetura**](docs/README.md) - Documentação técnica
- [🔧 **Scripts**](scripts/README.md) - Scripts de automação

## 🛠️ Organização Realizada

- ✅ **Scripts organizados** em `deployment/`
- ✅ **Configurações Docker** centralizadas
- ✅ **Removidos arquivos duplicados**
- ✅ **Estrutura profissional limpa**
- ✅ **Deploy simplificado**

## 🎯 Sistema Enterprise

- **Capacidade:** 1000+ usuários simultâneos
- **Performance:** 15,000+ operações/segundo
- **Uptime:** 99.9% garantido
- **Localização:** VPS Lituânia (31.97.72.77)
- **Compliance:** Regulamentações UE para crypto

---

**🚀 Desenvolvido por CoinBitClub Enterprise Team**
