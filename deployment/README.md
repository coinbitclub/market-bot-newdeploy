# 🚀 CoinBitClub Enterprise v6.0.0 - Deploy Guide

## 📋 Estrutura Organizada do Projeto

```
market-bot-newdeploy/
├── deployment/                    # 🚀 Scripts e configs de deploy
│   ├── scripts/                   # Scripts de implantação
│   │   ├── deploy-github.sh      # Deploy direto do GitHub (PRINCIPAL)
│   │   ├── deploy-hostinger-docker.sh # Deploy completo com Docker
│   │   ├── deploy-hostinger-complete.sh # Deploy alternativo
│   │   └── comandos-terminal-hostinger.txt # Comandos para terminal
│   ├── docker/                    # Configurações Docker
│   │   ├── docker-compose.hostinger.yml # Docker Compose para Hostinger
│   │   ├── docker-compose.production.yml # Docker Compose produção
│   │   └── Dockerfile.production  # Dockerfile otimizado
│   └── configs/                   # Configurações de ambiente
│       └── .env.hostinger        # Variáveis de ambiente Hostinger
├── src/                          # 💻 Código fonte principal
├── scripts/                      # 🔧 Scripts utilitários
├── docs/                         # 📚 Documentação
├── config/                       # ⚙️ Configurações gerais
└── tests/                        # 🧪 Testes
```

## 🎯 Como Fazer Deploy

### 🚀 Opção 1: Deploy Automático do GitHub (RECOMENDADO)

1. **Conecte ao terminal Hostinger**
2. **Execute um comando:**

```bash
curl -sSL https://raw.githubusercontent.com/coinbitclub/market-bot-newdeploy/main/deployment/scripts/deploy-github.sh | bash
```

### 🔧 Opção 2: Deploy Manual

1. **Clone o repositório:**
```bash
git clone https://github.com/coinbitclub/market-bot-newdeploy.git
cd market-bot-newdeploy
```

2. **Execute o script de deploy:**
```bash
chmod +x deployment/scripts/deploy-hostinger-docker.sh
./deployment/scripts/deploy-hostinger-docker.sh
```

### 📋 Opção 3: Comandos Passo a Passo

Consulte: `deployment/scripts/comandos-terminal-hostinger.txt`

## 🌐 URLs Importantes

- **Aplicação:** http://31.97.72.77
- **TradingView Webhook:** http://31.97.72.77/api/enterprise/trading/webhooks/signal
- **Health Check:** http://31.97.72.77/health
- **Status API:** http://31.97.72.77/api/enterprise/status

## 📱 Configuração TradingView

Use esta URL no TradingView para webhooks:
```
http://31.97.72.77/api/enterprise/trading/webhooks/signal
```

## 🔄 Atualizações

Para atualizar o sistema após mudanças no código:

```bash
cd /opt/coinbitclub-enterprise
git pull origin main
docker-compose restart
```

## 📊 Monitoramento

```bash
# Ver logs
docker-compose logs -f

# Status dos containers
docker-compose ps

# Reiniciar aplicação
docker-compose restart
```

## 🛠️ Estrutura Limpa

- ✅ **Scripts organizados** em `deployment/`
- ✅ **Código fonte** em `src/`
- ✅ **Documentação** em `docs/`
- ✅ **Removidos arquivos duplicados**
- ✅ **Estrutura profissional**

---

**Desenvolvido por CoinBitClub Enterprise Team**
