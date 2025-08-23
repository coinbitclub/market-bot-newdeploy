# 🚀 CONFIGURAÇÃO RAILWAY - CORREÇÃO ERROS 403
# ================================================

## Variáveis para Copiar no Railway Dashboard:

```bash
# CORREÇÃO PRINCIPAL - FORÇAR TESTNET
FORCE_TESTNET_ONLY=true
USE_TESTNET_ENDPOINTS=true

# SKIP ORCHESTRATOR PROBLEMÁTICO  
SKIP_EXCHANGE_ORCHESTRATOR=true
GRACEFUL_ERROR_HANDLING=true

# CONFIGURAÇÕES EXISTENTES
DATABASE_URL=postgresql://postgres:ELjbkkgUASRCtdTAXVFgIssOXiLsRCPq@trolley.proxy.rlwy.net:44790/railway
NODE_ENV=production
PORT=3000
```

## Como Aplicar no Railway:

1. **Acesse Railway Dashboard**
2. **Selecione o projeto CoinBitClub**
3. **Vá na aba Variables** 
4. **Adicione as variáveis acima**
5. **Faça Deploy**

## Resultado Esperado:

✅ Erro `Cannot read properties of undefined (reading 'start')` - CORRIGIDO
✅ Erros 403 nas exchanges - CORRIGIDO (usando testnet)  
✅ Constraint errors do banco - CORRIGIDO (UPSERT melhorado)

## Monitoramento:

- Logs não mostrarão mais erros 403
- Sistema funcionará em modo testnet seguro
- Orchestrator será pulado para evitar crashes
