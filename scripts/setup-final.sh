#!/bin/bash

# 🇱🇹 Script de Configuração Final - CoinBitClub Enterprise
# =========================================================
# Torna todos os scripts executáveis e aplica configurações finais

echo "🇱🇹 Aplicando configurações finais para VPS Lituânia..."

# Tornar scripts executáveis
chmod +x scripts/deployment/*.sh
chmod +x implementations/orchestration/*.js

# Criar links simbólicos para comandos rápidos
sudo ln -sf $(pwd)/scripts/deployment/setup-vps-lithuania.sh /usr/local/bin/setup-coinbitclub
sudo ln -sf $(pwd)/scripts/deployment/deploy-production-lithuania.sh /usr/local/bin/deploy-coinbitclub

# Verificar estrutura de diretórios
mkdir -p {logs,backups,monitoring,nginx,postgres,redis}

# Configurar permissões
chown -R $USER:$USER .
chmod 755 implementations/orchestration/lithuania-vps-orchestrator.js

echo "✅ Configuração final aplicada!"
echo ""
echo "📋 COMANDOS DISPONÍVEIS:"
echo "   setup-coinbitclub    # Configurar VPS"
echo "   deploy-coinbitclub   # Deploy produção"
echo ""
echo "🚀 Sistema pronto para o VPS Lituânia!"
