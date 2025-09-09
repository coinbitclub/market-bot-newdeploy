# 🗄️ DATABASE SETUP - COINBITCLUB ENTERPRISE v6.0.0

**Sistema completo de banco de dados PostgreSQL para produção**
*Guia completo para configuração e deploy do banco de dados enterprise*

---

## 📋 VISÃO GERAL

Este diretório contém o **schema completo** do banco de dados CoinBitClub Enterprise v6.0.0, incluindo:
- **32 tabelas** para sistema completo
- **15 categorias** de funcionalidades
- **Sistema de trading** com IA integrada
- **Sistema financeiro** com 6 tipos de saldo
- **Sistema de afiliação** normal + VIP
- **Monitoramento** e métricas em tempo real
- **Compliance** e auditoria completa

---

## 🚀 SETUP RÁPIDO PARA PRODUÇÃO

### 1. **Preparação do Ambiente**

Certifique-se de ter PostgreSQL instalado e rodando:

```bash
# Verificar se PostgreSQL está rodando
psql --version

# Se necessário, instalar PostgreSQL
# Windows: Download do site oficial
# Ubuntu: sudo apt-get install postgresql postgresql-contrib
# MacOS: brew install postgresql
```

### 2. **Criar Banco de Dados**

```bash
# Conectar como usuário postgres
psql -U postgres

# Criar banco de dados
CREATE DATABASE coinbitclub_enterprise;

# Criar usuário específico (recomendado)
CREATE USER coinbitclub_user WITH PASSWORD 'sua_senha_segura_aqui';

# Conceder permissões
GRANT ALL PRIVILEGES ON DATABASE coinbitclub_enterprise TO coinbitclub_user;

# Sair do psql
\q
```

### 3. **Executar Schema Principal** 

⚠️ **COMANDO PRINCIPAL PARA O DESENVOLVEDOR:**

```bash
# Navegar até o diretório do projeto
cd "c:\Nova pasta\market-bot-newdeploy"

# Executar o script principal de criação das tabelas
psql -U coinbitclub_user -d coinbitclub_enterprise -f scripts/database/enterprise-complete-database-setup.sql
```

**OU usando variáveis de ambiente:**

```bash
# Configurar variáveis de ambiente primeiro
export DB_HOST=localhost
export DB_PORT=5432
export DB_NAME=coinbitclub_enterprise
export DB_USER=coinbitclub_user
export DB_PASSWORD=sua_senha_aqui

# Executar script
psql "postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME" -f scripts/database/enterprise-complete-database-setup.sql
```

### 4. **Verificar Instalação**

```sql
-- Conectar ao banco
psql -U coinbitclub_user -d coinbitclub_enterprise

-- Verificar se todas as tabelas foram criadas (deve retornar 32)
SELECT COUNT(*) as total_tables FROM information_schema.tables WHERE table_schema = 'public';

-- Listar todas as tabelas criadas
\dt

-- Verificar se o usuário admin foi criado
SELECT username, email, user_type FROM users WHERE username = 'admin';

-- Sair
\q
```

---

## 🏗️ ARQUITETURA DO BANCO DE DADOS

### 📊 **TABELAS POR CATEGORIA**

#### **CORE SYSTEM (4 tabelas)**
- `users` - Sistema principal de usuários
- `user_api_keys` - Chaves API das exchanges
- `notifications` - Sistema de notificações  
- `balances` - Saldos nas exchanges

#### **FINANCIAL SYSTEM (6 tabelas)**
- `transactions` - Histórico financeiro completo
- `commission_records` - Registros de comissão
- `withdrawal_requests` - Solicitações de saque
- `coupons` - Sistema de cupons promocionais
- `coupon_usage` - Controle de uso de cupons
- `commission_conversions` - Conversões de comissão

#### **TRADING SYSTEM (8 tabelas)**
- `trading_signals` - Sinais de IA do TradingView
- `trading_positions` - Posições de trading
- `trade_executions` - Execuções automáticas
- `active_positions` - Posições ativas
- `positions` - Histórico de posições
- `trades` - Histórico de trades
- `market_direction_history` - Direção do mercado
- `position_close_recommendations` - Recomendações IA

#### **AFFILIATE SYSTEM (4 tabelas)**
- `affiliate_requests` - Solicitações de parceria
- `affiliate_preferences` - Preferências de afiliados
- `affiliate_stats` - Estatísticas detalhadas
- `commission_payouts` - Pagamentos efetuados

#### **MONITORING SYSTEM (3 tabelas)**
- `signal_metrics_log` - Métricas de sinais
- `user_balance_monitoring` - Monitoramento de saldos
- `market_direction_alerts` - Alertas de mercado

#### **AGUIA NEWS SYSTEM (3 tabelas)**
- `aguia_news_radars` - Radares personalizados
- `aguia_news_articles` - Artigos capturados
- `aguia_news_alerts` - Alertas de notícias

#### **COMPLIANCE & AUDIT (4 tabelas)**
- `terms_versions` - Versões de termos
- `terms_acceptances` - Aceites de termos
- `activity_logs` - Logs de atividade
- `error_logs` - Logs de erro

---

## ⚙️ CONFIGURAÇÃO DO SISTEMA

### 1. **Configurar Conexão com Banco**

Edite o arquivo de configuração do banco: `config/database/connection-manager.js`

```javascript
// Configurações de produção
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'coinbitclub_enterprise',
    user: process.env.DB_USER || 'coinbitclub_user',
    password: process.env.DB_PASSWORD,
    max: 20, // pool de conexões
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
};
```

### 2. **Configurar Variáveis de Ambiente**

Crie um arquivo `.env` na raiz do projeto:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=coinbitclub_enterprise
DB_USER=coinbitclub_user
DB_PASSWORD=sua_senha_aqui

# Application
NODE_ENV=production
PORT=3333

# Stripe (para sistema financeiro)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Exchanges (para trading)
BINANCE_API_KEY=
BINANCE_SECRET_KEY=
BYBIT_API_KEY=
BYBIT_SECRET_KEY=
```

### 3. **Testar Conexão**

```bash
# Testar conexão com o banco
node -e "
const { DatabaseConnectionManager } = require('./config/database/connection-manager');
const db = new DatabaseConnectionManager();
db.testConnection().then(result => {
    console.log('✅ Conexão com banco OK:', result);
    process.exit(0);
}).catch(err => {
    console.error('❌ Erro na conexão:', err);
    process.exit(1);
});
"
```

---

## 🔄 MIGRAÇÃO E ATUALIZAÇÃO

### **Migrar para Controllers Enterprise**

Se você está vindo de uma versão anterior:

```bash
# Executar migração para controllers enterprise
node src/api/enterprise/migrate-to-enterprise.js
```

### **Backup do Banco de Dados**

```bash
# Criar backup completo
pg_dump -U coinbitclub_user -d coinbitclub_enterprise > backup_$(date +%Y%m%d_%H%M%S).sql

# Restaurar backup
psql -U coinbitclub_user -d coinbitclub_enterprise < backup_arquivo.sql
```

---

## 🎯 INTEGRAÇÃO COM SISTEMA

### **Controllers Enterprise Compatíveis**

O schema é 100% compatível com os controllers enterprise:

- `src/api/enterprise/controllers/trading.controller.enterprise.js`
- `src/api/enterprise/controllers/financial.controller.enterprise.js` 
- `src/api/enterprise/controllers/affiliate.controller.enterprise.js`

### **Iniciar Sistema Completo**

```bash
# Instalar dependências
npm install

# Executar setup do banco (se ainda não fez)
psql -U coinbitclub_user -d coinbitclub_enterprise -f scripts/database/enterprise-complete-database-setup.sql

# Iniciar sistema enterprise
npm start

# Sistema estará rodando em http://localhost:3333
```

---

## 🔍 VALIDAÇÃO E TESTES

### **Validar Schema Completo**

```sql
-- Verificar todas as 32 tabelas
SELECT 
    table_name,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Verificar índices criados
SELECT indexname, tablename FROM pg_indexes WHERE schemaname = 'public';

-- Verificar funções criadas
SELECT proname FROM pg_proc WHERE proname IN (
    'update_updated_at_column', 
    'generate_affiliate_code', 
    'update_affiliate_stats_function'
);
```

### **Testar Funcionalidades**

```bash
# Testar endpoints do sistema
curl http://localhost:3333/api/health
curl http://localhost:3333/api/user/balance
curl http://localhost:3333/api/trading/signals
```

---

## 📚 DOCUMENTAÇÃO ADICIONAL

### **Schema Detalhado**
- **Arquivo Principal**: `enterprise-complete-database-setup.sql` (1360 linhas)
- **Análise Completa**: `CHECK-TABELAS-BANCO-DADOS.md`
- **Documentação Controllers**: `src/api/enterprise/`

### **Funcionalidades Implementadas**
- ✅ Sistema de usuários com 6 tipos de saldo
- ✅ Trading automático com IA (4 exchanges)
- ✅ Sistema de afiliação normal + VIP
- ✅ Sistema financeiro completo (Stripe integrado)
- ✅ Monitoramento e métricas em tempo real
- ✅ Sistema Águia News (IA de notícias)
- ✅ Compliance e auditoria completa
- ✅ Sistema de bônus e gamificação

---

## ⚠️ NOTAS IMPORTANTES

### **Segurança**
- ✅ Use senhas fortes para usuário do banco
- ✅ Configure firewall para PostgreSQL
- ✅ Use SSL em produção
- ✅ Faça backups regulares

### **Performance**
- ✅ Todos os índices necessários já criados
- ✅ Pool de conexões configurado
- ✅ Triggers otimizados
- ✅ Queries otimizadas nos controllers

### **Monitoramento**
- ✅ Logs de atividade automáticos
- ✅ Logs de erro detalhados
- ✅ Métricas de performance
- ✅ Alertas de sistema configurados

---

## 🆘 TROUBLESHOOTING

### **Problemas Comuns**

**1. Erro de conexão com banco:**
```bash
# Verificar se PostgreSQL está rodando
sudo systemctl status postgresql

# Verificar configurações de conexão
psql -U postgres -l
```

**2. Tabelas não criadas:**
```bash
# Verificar se há erros no log
psql -U coinbitclub_user -d coinbitclub_enterprise -f scripts/database/enterprise-complete-database-setup.sql > install.log 2>&1
cat install.log
```

**3. Controllers não funcionam:**
```bash
# Verificar se todas as tabelas existem
psql -U coinbitclub_user -d coinbitclub_enterprise -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';"
```

### **Suporte**
- 📧 Email: suporte@coinbitclub.com
- 📱 Telegram: @coinbitclub_dev
- 🌐 Documentação: https://docs.coinbitclub.com

---

**🚀 Sistema CoinBitClub Enterprise v6.0.0 - Pronto para Produção!**
*Última atualização: 09/09/2025*
