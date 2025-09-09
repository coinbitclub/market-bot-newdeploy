# 🗄️ Database Setup - CoinBitClub Enterprise v6.0.0

## 📋 INSTRUÇÕES PARA DESENVOLVEDORES

### ⚡ EXECUÇÃO RÁPIDA (1 COMANDO)

```bash
# Execute este comando no diretório raiz do projeto
npm run setup:database
```

Este comando irá automaticamente:
- ✅ Verificar se PostgreSQL está instalado
- ✅ Criar banco de dados `coinbitclub_enterprise`
- ✅ Criar usuário `coinbitclub_user`
- ✅ Instalar todas as 31 tabelas
- ✅ Criar 46 índices de performance
- ✅ Inserir dados iniciais (usuário admin)
- ✅ Gerar arquivo `.env` configurado
- ✅ Testar conexão com o banco

---

## 🔧 PRÉ-REQUISITOS

### 1. PostgreSQL Instalado
```bash
# Verificar se está instalado
psql --version

# Se não estiver instalado:
# Windows: https://www.postgresql.org/download/windows/
# Ubuntu: sudo apt install postgresql postgresql-contrib
# MacOS: brew install postgresql
```

### 2. Node.js e npm
```bash
# Verificar versões
node --version  # Deve ser 16+
npm --version   # Deve ser 8+
```

---

## 🚀 PROCESSO DE SETUP

### Opção 1: Setup Automático (RECOMENDADO)

```bash
# 1. Navegar para o diretório do projeto
cd "c:\Nova pasta\market-bot-newdeploy"

# 2. Executar setup completo
npm run setup:database

# 3. Seguir as instruções na tela:
#    - Digite uma senha forte para o banco
#    - Confirme a senha
#    - Aguarde a criação das tabelas
```

### Opção 2: Execução Manual dos Scripts

#### Windows PowerShell:
```powershell
# Executar diretamente o script PowerShell
powershell -ExecutionPolicy Bypass -File setup-database.ps1
```

#### Linux/Mac Bash:
```bash
# Executar diretamente o script Bash
bash setup-database.sh
```

---

## 📊 ESTRUTURA DO BANCO CRIADA

### 🗃️ 31 Tabelas Organizadas por Categoria

#### 👥 **USUÁRIOS (3 tabelas)**
```sql
users                    -- Dados principais dos usuários
user_api_keys           -- Chaves de API dos usuários
user_balance_monitoring -- Monitoramento de saldos
```

#### 💹 **TRADING (8 tabelas)**
```sql
trading_positions           -- Posições ativas de trading
trading_signals            -- Sinais de trading gerados
active_positions           -- Posições atualmente abertas
position_close_recommendations -- Recomendações de fechamento
signal_metrics_log         -- Log de métricas dos sinais
trade_executions          -- Execuções de trades
trades                    -- Histórico de trades
positions                 -- Todas as posições
```

#### 💰 **FINANCEIRO (4 tabelas)**
```sql
transactions           -- Todas as transações financeiras
commission_records     -- Registros de comissões
commission_conversions -- Conversões de comissões
withdrawal_requests    -- Solicitações de saque
```

#### 🤝 **AFILIADOS (3 tabelas)**
```sql
affiliate_requests     -- Solicitações de afiliação
affiliate_preferences  -- Preferências dos afiliados
affiliate_stats       -- Estatísticas de afiliados
```

#### ⚙️ **SISTEMA (5 tabelas)**
```sql
coupons                   -- Sistema de cupons
coupon_usage             -- Uso de cupons
market_direction_history -- Histórico de direção do mercado
market_direction_alerts  -- Alertas de direção do mercado
user_api_keys           -- Chaves de API (compartilhada)
```

#### 📋 **OUTROS RECURSOS (9 tabelas)**
```sql
balances              -- Saldos dos usuários
notifications         -- Sistema de notificações
activity_logs         -- Logs de atividades
error_logs           -- Logs de erros
terms_versions       -- Versões dos termos de uso
terms_acceptances    -- Aceites dos termos
aguia_news_articles  -- Artigos do Águia News
aguia_news_alerts    -- Alertas do Águia News
aguia_news_radars    -- Radares do Águia News
```

---

## ✅ VERIFICAÇÃO DO SETUP

### 1. Verificar Tabelas Criadas
```bash
# Execute o script de verificação
node verify-actual-schema.js
```

### 2. Testar Conexão Manual
```bash
# Conectar ao banco (substitua pela sua senha)
psql -U coinbitclub_user -d coinbitclub_enterprise

# Dentro do psql, execute:
\dt                    -- Listar todas as tabelas
SELECT COUNT(*) FROM users;  -- Verificar se admin foi criado
\q                     -- Sair
```

### 3. Verificar Arquivo .env
```bash
# Verificar se o arquivo .env foi criado
cat .env

# Deve conter:
# DB_HOST=localhost
# DB_PORT=5432
# DB_NAME=coinbitclub_enterprise
# DB_USER=coinbitclub_user
# DB_PASSWORD=sua_senha
```

---

## 🎯 PRÓXIMOS PASSOS APÓS O SETUP

### 1. Configurar Chaves de API
Edite o arquivo `.env` e adicione suas chaves reais:
```env
# Exchanges
BINANCE_API_KEY=sua_chave_binance_aqui
BINANCE_SECRET_KEY=sua_chave_secreta_binance_aqui
BYBIT_API_KEY=sua_chave_bybit_aqui
BYBIT_SECRET_KEY=sua_chave_secreta_bybit_aqui

# Stripe
STRIPE_SECRET_KEY=sk_live_sua_chave_stripe_aqui
STRIPE_WEBHOOK_SECRET=whsec_seu_webhook_secret_aqui
```

### 2. Instalar Dependências e Iniciar
```bash
# Instalar todas as dependências do projeto
npm install

# Iniciar o sistema
npm start

# O sistema estará disponível em:
# http://localhost:3333
```

### 3. Login Inicial
- **Usuário**: `admin`
- **Senha**: `admin123!@#`
- **⚠️ Importante**: Altere a senha do admin após primeiro login

---

## 🛠️ TROUBLESHOOTING

### ❌ Erro: "PostgreSQL não encontrado"
```bash
# Verificar se PostgreSQL está rodando
# Windows:
net start postgresql-x64-14

# Linux:
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### ❌ Erro: "Permissão negada"
```bash
# Verificar se o usuário postgres existe e tem permissões
sudo -u postgres psql
\du  # Listar usuários
```

### ❌ Erro: "Arquivo de schema não encontrado"
```bash
# Verificar se você está no diretório correto
pwd  # Deve mostrar: .../market-bot-newdeploy
ls scripts/database/  # Deve mostrar: enterprise-complete-database-setup.sql
```

### ❌ Erro: "npm run setup:database command not found"
```bash
# Verificar se package.json existe e tem o script
cat package.json | grep "setup:database"

# Se não existir, adicione ao package.json:
"scripts": {
  "setup:database": "powershell -ExecutionPolicy Bypass -File setup-database.ps1"
}
```

---

## 📚 SCRIPTS AUXILIARES DISPONÍVEIS

### Verificação de Schema
```bash
node verify-actual-schema.js      # Verificar tabelas existentes
node verify-database-schema.js    # Verificação detalhada
```

### Comandos npm Configurados
```bash
npm run setup:database           # Setup completo automático
npm run test:database           # Testar conexão (se configurado)
```

### Scripts Diretos
```bash
# Windows
powershell -ExecutionPolicy Bypass -File setup-database.ps1

# Linux/Mac  
bash setup-database.sh
```

---

## 🔐 CONFIGURAÇÕES DE SEGURANÇA

### Senhas Recomendadas
- **Mínimo**: 12 caracteres
- **Incluir**: Letras maiúsculas, minúsculas, números, símbolos
- **Exemplo**: `MyS3cur3P@ssw0rd!2024`

### Configuração para Produção
```env
# Adicione ao .env para produção
DB_SSL=true
DB_SSL_REJECT_UNAUTHORIZED=false
NODE_ENV=production
```

---

## 📞 SUPORTE

### Em caso de problemas:
1. ✅ Verifique os pré-requisitos
2. ✅ Execute o script de verificação
3. ✅ Consulte a seção troubleshooting
4. ✅ Verifique os logs em `schema_install.log`

### Arquivos de Documentação:
- `CHECK-TABELAS-BANCO-DADOS.md` - Análise 360° do sistema
- `RESOLUCAO-SETUP-DATABASE-COMPLETA.md` - Histórico de correções
- `COMANDOS-DATABASE-SETUP.md` - Referência rápida

---

**📅 Última atualização**: Setembro 9, 2025  
**🏷️ Versão**: CoinBitClub Enterprise v6.0.0  
**✅ Status**: Totalmente funcional e testado
