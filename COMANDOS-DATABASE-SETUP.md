# 🚀 COMANDOS RÁPIDOS - SETUP BANCO DE DADOS
**CoinBitClub Enterprise v6.0.0 - Guia Rápido para o Desenvolvedor**

---

## ⚡ SETUP AUTOMÁTICO (RECOMENDADO)

### **🖥️ Windows (PowerShell)**
```powershell
# Setup completo automático - Windows
.\setup-database.ps1

# OU usando npm
npm run setup:database
```

### **🐧 Linux/MacOS (Bash)**
```bash
# Setup completo automático - Linux/Mac
./setup-database.sh

# OU usando npm
npm run setup:database:bash
```

---

## 📋 SETUP MANUAL (Passo a Passo)

### **1. Criar Banco e Usuário**
```sql
-- Conectar como postgres
psql -U postgres

-- Criar banco
CREATE DATABASE coinbitclub_enterprise;

-- Criar usuário
CREATE USER coinbitclub_user WITH PASSWORD 'sua_senha_aqui';

-- Conceder permissões
GRANT ALL PRIVILEGES ON DATABASE coinbitclub_enterprise TO coinbitclub_user;

-- Sair
\q
```

### **2. Executar Schema Principal**
```bash
# COMANDO PRINCIPAL - Criar todas as 32 tabelas
psql -U coinbitclub_user -d coinbitclub_enterprise -f scripts/database/enterprise-complete-database-setup.sql

# OU usando npm
npm run db:install
```

### **3. Verificar Instalação**
```bash
# Verificar se todas as 32 tabelas foram criadas
npm run db:verify

# Verificar usuário admin
npm run db:admin

# Teste completo de conexão
npm run test:db
```

---

## 🔧 SCRIPTS DISPONÍVEIS (package.json)

```bash
# Setup automático completo
npm run setup:database              # PowerShell (Windows)
npm run setup:database:bash         # Bash (Linux/Mac)

# Comandos manuais do banco
npm run db:install                  # Instalar schema
npm run db:verify                   # Verificar tabelas
npm run db:admin                    # Verificar admin
npm run db:backup                   # Backup do banco

# Testes e verificação
npm run test:db                     # Teste de conexão
npm start                          # Iniciar sistema
```

---

## 📊 VERIFICAÇÃO RÁPIDA

### **Verificar se PostgreSQL está instalado:**
```bash
psql --version
```

### **Verificar se banco existe:**
```sql
psql -U postgres -l | grep coinbitclub_enterprise
```

### **Contar tabelas criadas:**
```sql
psql -U coinbitclub_user -d coinbitclub_enterprise -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';"
```

**Resultado esperado: 32 tabelas**

---

## 🎯 RESULTADO ESPERADO

Após executar o setup, você deve ter:

✅ **32 tabelas criadas** (sistema completo)
✅ **Usuário admin** configurado  
✅ **Índices de performance** ativos
✅ **Arquivo .env** configurado
✅ **Sistema pronto** para produção

---

## 🗃️ ESTRUTURA DO BANCO

### **📊 Categorias (32 tabelas total)**
- **Core System:** 4 tabelas (users, api_keys, notifications, balances)
- **Financial:** 6 tabelas (transactions, commissions, withdrawals, coupons)
- **Trading:** 8 tabelas (signals, positions, executions, market data)
- **Affiliate:** 4 tabelas (stats, preferences, requests, payouts)
- **Monitoring:** 3 tabelas (metrics, balance monitoring, alerts)  
- **Aguia News:** 3 tabelas (radars, articles, news alerts)
- **Compliance:** 4 tabelas (terms, acceptances, activity logs, error logs)

---

## ⚠️ TROUBLESHOOTING

### **Erro: "database does not exist"**
```bash
psql -U postgres -c "CREATE DATABASE coinbitclub_enterprise;"
```

### **Erro: "role does not exist"**
```bash
psql -U postgres -c "CREATE USER coinbitclub_user WITH PASSWORD 'senha';"
```

### **Erro: "permission denied"**
```bash
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE coinbitclub_enterprise TO coinbitclub_user;"
```

### **Arquivo .env não configurado:**
```bash
# Execute o setup automático que cria o .env
npm run setup:database
```

---

## 📚 DOCUMENTAÇÃO COMPLETA

- **[📖 README Database](scripts/database/README.md)** - Guia completo
- **[🔍 Análise 360°](CHECK-TABELAS-BANCO-DADOS.md)** - Verificação tabelas
- **[📄 Schema SQL](scripts/database/enterprise-complete-database-setup.sql)** - Arquivo principal

---

## 🚀 INICIAR SISTEMA

Após setup do banco:

```bash
# Instalar dependências
npm install

# Iniciar sistema enterprise
npm start

# Sistema estará em: http://localhost:3333
```

---

**✨ Sistema CoinBitClub Enterprise v6.0.0 - Pronto para Produção!**
