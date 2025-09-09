# 🚀 GUIA DO DESENVOLVEDOR - Setup do Banco de Dados

## ⚡ INÍCIO RÁPIDO (1 COMANDO)

```bash
npm run setup:database
```

**✅ Pronto! Em 1 comando você terá:**
- Banco PostgreSQL configurado
- 31 tabelas criadas automaticamente
- 46 índices de performance otimizados
- Usuário admin configurado
- Arquivo .env gerado
- Sistema pronto para rodar

---

## 📋 PASSO A PASSO DETALHADO

### 1. **Verificar Pré-requisitos**

```bash
# Verificar PostgreSQL
psql --version
# Deve retornar: psql (PostgreSQL) 12.x ou superior

# Verificar Node.js
node --version
# Deve retornar: v16.x ou superior

# Verificar npm
npm --version
# Deve retornar: 8.x ou superior
```

### 2. **Executar Setup do Banco**

```bash
# Navegar para o diretório do projeto
cd "c:\Nova pasta\market-bot-newdeploy"

# Executar setup automático
npm run setup:database
```

### 3. **Seguir Instruções na Tela**

O script irá solicitar:
1. **Senha do banco**: Digite uma senha forte (mínimo 8 caracteres)
2. **Confirmação**: Digite a mesma senha novamente
3. **Aguarde**: O processo leva 1-2 minutos

### 4. **Verificar Sucesso**

Ao final, você deve ver:
```
✅ SETUP CONCLUÍDO COM SUCESSO!
✅ 31 tabelas criadas
✅ 46 índices de performance criados
✅ Usuário admin configurado
✅ Sistema pronto para produção
```

---

## 🗄️ O QUE FOI CRIADO

### **Banco de Dados**
- **Nome**: `coinbitclub_enterprise`
- **Usuário**: `coinbitclub_user`
- **Host**: `localhost:5432`

### **31 Tabelas por Categoria (LISTA COMPLETA)**

#### 👥 **USUÁRIOS (3 tabelas)**
- `users` - Dados principais dos usuários
- `user_api_keys` - Chaves de API dos usuários  
- `user_balance_monitoring` - Monitoramento de saldos

#### 💹 **TRADING (8 tabelas)**
- `trading_positions` - Posições ativas de trading
- `trading_signals` - Sinais de trading gerados
- `active_positions` - Posições atualmente abertas
- `positions` - Todas as posições (históricas e ativas)
- `trades` - Histórico completo de trades
- `trade_executions` - Execuções detalhadas de trades
- `position_close_recommendations` - Recomendações de fechamento
- `signal_metrics_log` - Log de métricas dos sinais

#### 💰 **FINANCEIRO (4 tabelas)**
- `transactions` - Todas as transações financeiras
- `commission_records` - Registros de comissões
- `commission_conversions` - Conversões de comissões
- `withdrawal_requests` - Solicitações de saque

#### 🤝 **AFILIADOS (3 tabelas)**
- `affiliate_requests` - Solicitações de afiliação
- `affiliate_preferences` - Preferências dos afiliados
- `affiliate_stats` - Estatísticas de performance

#### ⚙️ **SISTEMA (5 tabelas)**
- `coupons` - Sistema de cupons e promoções
- `coupon_usage` - Histórico de uso de cupons
- `market_direction_alerts` - Alertas de direção do mercado
- `market_direction_history` - Histórico de análise de mercado
- `user_api_keys` - Gerenciamento de chaves de API

#### 📋 **OUTROS RECURSOS (9 tabelas)**
- `notifications` - Sistema de notificações
- `activity_logs` - Logs de atividades do sistema
- `error_logs` - Logs de erros e exceções
- `balances` - Saldos detalhados dos usuários
- `terms_versions` - Versões dos termos de uso
- `terms_acceptances` - Registro de aceites dos termos
- `aguia_news_articles` - Artigos do sistema Águia News
- `aguia_news_alerts` - Alertas do Águia News
- `aguia_news_radars` - Radares de análise Águia News

### **46 Índices de Performance (CRIADOS AUTOMATICAMENTE)**

O sistema cria automaticamente 46 índices para otimizar consultas e garantir alta performance:

#### 🔍 **ÍNDICES DE USUÁRIOS (7 índices)**
```sql
idx_users_email                 -- Busca rápida por email
idx_users_username              -- Busca rápida por username
idx_users_affiliate_code        -- Códigos de afiliação
idx_users_affiliate_id          -- IDs de afiliados
idx_users_user_type             -- Tipos de usuário
idx_users_is_active             -- Status ativo/inativo
idx_users_created_at            -- Ordenação por data
```

#### 🔑 **ÍNDICES DE API KEYS (4 índices)**
```sql
idx_user_api_keys_user_id       -- Chaves por usuário
idx_user_api_keys_exchange      -- Chaves por exchange
idx_user_api_keys_active        -- Chaves ativas
idx_user_api_keys_valid         -- Chaves válidas
```

#### 💰 **ÍNDICES FINANCEIROS (8 índices)**
```sql
idx_transactions_user_id        -- Transações por usuário
idx_transactions_type           -- Tipos de transação
idx_transactions_status         -- Status das transações
idx_transactions_created_at     -- Ordenação temporal
idx_transactions_currency       -- Filtro por moeda
idx_commission_records_user_id  -- Comissões por usuário
idx_commission_records_type     -- Tipos de comissão
idx_commission_records_created_at -- Data das comissões
```

#### 📈 **ÍNDICES DE TRADING (11 índices)**
```sql
idx_trading_positions_user_id   -- Posições por usuário
idx_trading_positions_symbol    -- Posições por símbolo
idx_trading_positions_status    -- Status das posições
idx_trading_positions_opened_at -- Data de abertura
idx_trading_signals_symbol      -- Sinais por símbolo
idx_trading_signals_status      -- Status dos sinais
idx_trading_signals_received_at -- Data dos sinais
idx_trade_executions_user_id    -- Execuções por usuário
idx_trade_executions_position_id -- Execuções por posição
idx_trade_executions_signal_id  -- Execuções por sinal
idx_trade_executions_status     -- Status das execuções
```

#### 📊 **ÍNDICES DE SALDOS (3 índices)**
```sql
idx_balances_user_id            -- Saldos por usuário
idx_balances_asset              -- Saldos por ativo
idx_user_balance_monitoring_user_exchange -- Monitoramento por usuário/exchange
```

#### 🔔 **ÍNDICES DE NOTIFICAÇÕES (4 índices)**
```sql
idx_notifications_user_id       -- Notificações por usuário
idx_notifications_type          -- Tipos de notificação
idx_notifications_read          -- Status lido/não lido
idx_notifications_created_at    -- Ordenação temporal
```

#### 📰 **ÍNDICES DO ÁGUIA NEWS (4 índices)**
```sql
idx_aguia_news_radars_user_id   -- Radares por usuário
idx_aguia_news_radars_active    -- Radares ativos
idx_aguia_news_articles_published_at -- Artigos por data
idx_aguia_news_articles_sentiment    -- Artigos por sentimento
```

#### ⚙️ **ÍNDICES DO SISTEMA (5 índices)**
```sql
idx_market_direction_created_at -- Direção do mercado por data
idx_signal_metrics_ticker_time  -- Métricas por ticker/tempo
idx_signal_metrics_ai_approved  -- Sinais aprovados pela IA
idx_terms_versions_active       -- Versões ativas dos termos
idx_terms_acceptances_user_id   -- Aceites por usuário
```

> 🚀 **Performance**: Estes índices garantem que consultas complexas sejam executadas em milissegundos, mesmo com milhões de registros.

### **Arquivo .env Criado**
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=coinbitclub_enterprise
DB_USER=coinbitclub_user
DB_PASSWORD=sua_senha

NODE_ENV=production
PORT=3333
JWT_SECRET=chave_gerada_automaticamente
```

---

## 🔍 VERIFICAÇÃO E TESTES

### **1. Verificar Tabelas**
```bash
# Script de verificação
node verify-actual-schema.js

# Deve mostrar: 31 tabelas encontradas
```

### **2. Testar Conexão**
```bash
# Conectar manualmente
psql -U coinbitclub_user -d coinbitclub_enterprise

# Comandos úteis dentro do psql:
\dt                           # Listar tabelas
SELECT COUNT(*) FROM users;   # Verificar usuário admin
\q                           # Sair
```

### **3. Verificar Logs**
```bash
# Se algo deu errado, verificar logs
cat schema_install.log
```

---

## 🎯 PRÓXIMOS PASSOS

### **1. Configurar APIs**
Edite o arquivo `.env` e adicione suas chaves:
```env
# Binance
BINANCE_API_KEY=sua_chave_aqui
BINANCE_SECRET_KEY=sua_chave_secreta_aqui

# Bybit
BYBIT_API_KEY=sua_chave_aqui
BYBIT_SECRET_KEY=sua_chave_secreta_aqui

# Stripe
STRIPE_SECRET_KEY=sk_live_sua_chave_aqui
```

### **2. Instalar Dependências**
```bash
npm install
```

### **3. Iniciar o Sistema**
```bash
npm start
```

### **4. Acessar o Sistema**
- **URL**: http://localhost:3333
- **Login**: admin
- **Senha**: admin123!@#
- **⚠️ Altere a senha após primeiro login**

---

## 🛠️ RESOLUÇÃO DE PROBLEMAS

### **❌ "PostgreSQL não encontrado"**
```bash
# Windows - Instalar PostgreSQL
# 1. Baixar: https://www.postgresql.org/download/windows/
# 2. Instalar com configurações padrão
# 3. Anotar a senha do usuário postgres

# Linux
sudo apt update
sudo apt install postgresql postgresql-contrib

# MacOS
brew install postgresql
brew services start postgresql
```

### **❌ "Erro de permissão"**
```bash
# Verificar se PostgreSQL está rodando
# Windows:
net start postgresql-x64-14

# Linux/Mac:
sudo systemctl start postgresql
```

### **❌ "Comando npm não encontrado"**
```bash
# Verificar instalação do Node.js
node --version

# Se não estiver instalado:
# 1. Baixar: https://nodejs.org/
# 2. Instalar versão LTS
# 3. Reiniciar terminal
```

### **❌ "Script PowerShell não executa"**
```bash
# Executar com permissões
powershell -ExecutionPolicy Bypass -File setup-database.ps1

# Ou alterar política permanentemente (como admin):
Set-ExecutionPolicy RemoteSigned
```

### **❌ "Arquivo de schema não encontrado"**
```bash
# Verificar se está no diretório correto
pwd  # Deve mostrar: .../market-bot-newdeploy

# Verificar se arquivo existe
ls scripts/database/enterprise-complete-database-setup.sql
```

---

## 📚 COMANDOS ÚTEIS

### **Scripts Disponíveis**
```bash
npm run setup:database          # Setup completo
node verify-actual-schema.js    # Verificar tabelas
node verify-database-indexes.js # Verificar índices de performance
```

### **Comandos PostgreSQL**
```bash
# Conectar como admin
psql -U postgres

# Conectar ao banco do projeto
psql -U coinbitclub_user -d coinbitclub_enterprise

# Backup do banco
pg_dump -U coinbitclub_user coinbitclub_enterprise > backup.sql

# Restaurar backup
psql -U coinbitclub_user -d coinbitclub_enterprise < backup.sql
```

### **Comandos de Desenvolvimento**
```bash
# Resetar banco (CUIDADO!)
dropdb -U postgres coinbitclub_enterprise
npm run setup:database

# Verificar status do sistema
npm run status  # (se configurado)

# Logs em tempo real
tail -f logs/app.log  # (se configurado)
```

---

## 🔐 SEGURANÇA E BOAS PRÁTICAS

### **Senhas Seguras**
- ✅ Mínimo 12 caracteres
- ✅ Letras maiúsculas e minúsculas
- ✅ Números e símbolos
- ✅ Não use dados pessoais
- ❌ Não compartilhe senhas

### **Configuração de Produção**
```env
# Adicionar ao .env para produção
NODE_ENV=production
DB_SSL=true
FORCE_SSL=true
SESSION_SECRET=chave_unica_aleatoria
```

### **Backup Regular**
```bash
# Configurar backup automático (Linux/Mac)
crontab -e
# Adicionar linha:
0 2 * * * pg_dump -U coinbitclub_user coinbitclub_enterprise > /backup/db_$(date +\%Y\%m\%d).sql
```

---

## 📞 SUPORTE E DOCUMENTAÇÃO

### **Documentação Adicional**
- 📁 `scripts/database/README.md` - Documentação técnica completa
- 📁 `CHECK-TABELAS-BANCO-DADOS.md` - Análise 360° do sistema
- 📁 `RESOLUCAO-SETUP-DATABASE-COMPLETA.md` - Histórico de correções

### **Em Caso de Problemas**
1. ✅ Verificar pré-requisitos
2. ✅ Consultar seção troubleshooting
3. ✅ Executar scripts de verificação
4. ✅ Verificar logs de erro

---

**🎯 OBJETIVO**: Ter o banco funcionando em menos de 5 minutos  
**📅 Atualizado**: Setembro 9, 2025  
**✅ Status**: Testado e funcionando perfeitamente
