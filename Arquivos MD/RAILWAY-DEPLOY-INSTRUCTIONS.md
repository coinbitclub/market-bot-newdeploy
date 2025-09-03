# 🚀 INSTRUÇÕES DE DEPLOY RAILWAY - COINBITCLUB

## 1. CONFIGURAR VARIÁVEIS DE AMBIENTE NO RAILWAY

### Variáveis Obrigatórias:
```
DATABASE_URL=[REMOVIDO - DATABASE_URL]
OPENAI_API_KEY=sua_chave_openai_real
COINSTATS_API_KEY=sua_chave_coinstats_real
JWT_SECRET=chave-jwt-super-secreta-32-chars
ENCRYPTION_KEY=chave-criptografia-32-characters
NODE_ENV=production
PORT=3000
```

### Variáveis Opcionais (Trading):
```
BINANCE_API_KEY=sua_chave_binance
BINANCE_API_SECRET=sua_chave_secreta_binance
BYBIT_API_KEY=sua_chave_bybit
BYBIT_API_SECRET=sua_chave_secreta_bybit
```

## 2. COMANDOS DE DEPLOY

### Primeira vez:
```bash
# 1. Login no Railway
railway login

# 2. Linkar projeto
railway link

# 3. Configurar variáveis de ambiente
railway variables set DATABASE_URL="valor"
railway variables set OPENAI_API_KEY="valor"
railway variables set COINSTATS_API_KEY="valor"
railway variables set JWT_SECRET="valor"
railway variables set ENCRYPTION_KEY="valor"

# 4. Deploy
railway up
```

### Deploys subsequentes:
```bash
git add .
git commit -m "deploy: atualizações do sistema"
git push origin main
railway up
```

## 3. VERIFICAÇÕES PÓS-DEPLOY

### Teste endpoints críticos:
```
GET /health - Status do sistema
GET /api/dashboard/stats - Dashboard principal
POST /webhook/tradingview - Recebimento de sinais
```

### Monitorar logs:
```bash
railway logs
```

## 4. ROLLBACK (SE NECESSÁRIO)

```bash
# Ver deploys anteriores
railway deployments

# Fazer rollback para deploy específico
railway rollback [deployment-id]
```

## ⚠️ IMPORTANTE

- ✅ Todas as credenciais hardcoded foram removidas
- ✅ Backup de segurança foi criado
- ✅ .gitignore configurado para arquivos .env
- ✅ Sistema validado para deploy seguro

## 🔄 PROCESSO DE ATUALIZAÇÃO

1. Sempre fazer backup antes de alterações
2. Testar localmente primeiro
3. Usar git flow adequado
4. Monitorar logs após deploy
5. Ter plano de rollback pronto

---
Gerado automaticamente em: 2025-08-08T23:28:53.606Z
