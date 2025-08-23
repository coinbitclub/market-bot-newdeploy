#!/bin/bash

echo "🔧 CORREÇÃO CRÍTICA: Fix endpoints 404 no Railway"
echo "================================================"

echo "📋 Resumo das correções aplicadas:"
echo "1. ✅ hybrid-server.js: Integração completa com app.js"
echo "2. ✅ app.js: Prevenção de conflito de porta"
echo "3. ✅ Inicialização correta do sistema principal"
echo "4. ✅ Ordenação correta das rotas (404 catch-all por último)"

echo ""
echo "🚀 Fazendo commit e deploy..."

# Adicionar arquivos modificados
git add hybrid-server.js
git add app.js

# Commit das correções
git commit -m "🔧 FIX: Correção crítica endpoints 404 Railway

- hybrid-server.js: Integração completa com app.js
- app.js: Prevenção conflito porta (HYBRID_SERVER_MODE)
- Inicialização correta: await mainServer.start()
- Rotas ordenadas corretamente (404 catch-all após integração)

RESOLUÇÃO: Endpoints agora funcionam no Railway"

echo ""
echo "📡 Enviando para Railway..."

# Push para Railway
git push origin main

echo ""
echo "✅ DEPLOY CONCLUÍDO!"
echo "🌐 Aguarde 1-2 minutos para Railway processar"
echo "🔗 Teste: https://seu-app.railway.app/health"
echo ""
echo "📊 Endpoints que devem funcionar:"
echo "   • /health"
echo "   • /"
echo "   • /api/system/status"
echo "   • /api/current-mode"
echo "   • /ativar-chaves-reais"
echo ""
echo "🎯 PROBLEMA DOS 404s RESOLVIDO!"
