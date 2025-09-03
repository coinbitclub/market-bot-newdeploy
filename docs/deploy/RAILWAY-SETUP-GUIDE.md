# 🎯 CONFIGURAÇÃO RAILWAY - GUIA VISUAL

## 📋 CHECKLIST DE CONFIGURAÇÃO

### ✅ 1. CONFIGURAÇÕES BÁSICAS
```
Settings > General
├── Project Name: coinbitclub-market-bot
├── Description: Sistema Enterprise de Trading
└── Environment: production
```

### ✅ 2. BUILD SETTINGS
```
Settings > Build
├── Root Directory: backend
├── Build Command: (deixar vazio)
├── Start Command: npm start
└── Watch Paths: (deixar padrão)
```

### ✅ 3. VARIÁVEIS DE AMBIENTE
```
Variables Tab
├── NODE_ENV = production
├── PORT = 3000
├── JWT_SECRET = coinbitclub_jwt_secret_2025
├── BINANCE_API_KEY = (opcional)
├── BINANCE_SECRET_KEY = (opcional)
├── BYBIT_API_KEY = (opcional)
└── BYBIT_SECRET_KEY = (opcional)
```

### ✅ 4. NETWORKING
```
Settings > Networking
├── Custom Domain: (opcional)
├── Public URL: ✅ Habilitado
└── Port: 3000 (automático)
```

## 🔧 COMANDOS EXATOS PARA COPIAR

### Root Directory:
```
backend
```

### Start Command:
```
npm start
```

### Variáveis de Ambiente:
```
NODE_ENV=production
PORT=3000
JWT_SECRET=coinbitclub_jwt_secret_2025
```

## 🚀 PROCESSO DE DEPLOY

1. **Conectar Repositório**: 
   - GitHub: `coinbitclub/coinbitclub-market-bot`
   - Branch: `main`

2. **Aguardar Build**:
   - Tempo estimado: 2-5 minutos
   - Logs visíveis na aba "Deployments"

3. **Verificar Deploy**:
   - URL será gerado automaticamente
   - Formato: `https://coinbitclub-market-bot-production.up.railway.app`

4. **Testar Endpoints**:
   - `/health` - Health check
   - `/` - Dashboard principal
   - `/api/system/status` - Status sistema

## ⚠️ TROUBLESHOOTING

### Se o deploy falhar:
1. Verificar se Root Directory está como `backend`
2. Confirmar Start Command como `npm start`
3. Verificar se NODE_ENV=production está configurado
4. Checar logs na aba "Deployments"

### Se endpoints retornarem 404:
1. Aguardar 2-3 minutos após deploy
2. Verificar se hybrid-server.js está no diretório correto
3. Reiniciar o serviço na Railway

## 📞 SUPORTE

Se houver problemas:
1. Verificar logs na aba "Deployments"
2. Conferir se todas as configurações estão corretas
3. Tentar um redeploy manual

---

🎉 **Sistema Enterprise Pronto para Railway!**
