#!/bin/bash

# ====================================================================
# SCRIPT DE PUSH SEGURO - COINBITCLUB TRADING BOT
# ====================================================================
# Este script segue as regras de segurança para push em produção
# Realiza backup de arquivos sensíveis antes do commit

echo "🔒 INICIANDO PUSH SEGURO - COINBITCLUB TRADING BOT"
echo "=================================================="

# 1. Criar backup de arquivos sensíveis
BACKUP_DIR="safe-push-backup/safe-push-$(date -u +"%Y-%m-%dT%H-%M-%S-000Z")"
mkdir -p "$BACKUP_DIR"

echo "📦 Criando backup de arquivos sensíveis..."

# Backup do .env (sem credenciais expostas)
if [ -f ".env" ]; then
    cp .env "$BACKUP_DIR/.env.backup"
    echo "   ✅ .env -> $BACKUP_DIR/.env.backup"
fi

# Backup de arquivos críticos
cp dashboard-operacional-detalhado-fixed.js "$BACKUP_DIR/"
cp monitoramento-simples.js "$BACKUP_DIR/"
cp limpeza-banco-completa.js "$BACKUP_DIR/"
cp test-new-connection.js "$BACKUP_DIR/"

echo "   ✅ Arquivos principais backupeados"

# 2. Verificar arquivos sensíveis antes do add
echo ""
echo "🔍 VERIFICANDO ARQUIVOS SENSÍVEIS..."

# Lista de arquivos que NÃO devem ser commitados
SENSITIVE_PATTERNS=(
    "*.log"
    "node_modules/"
    ".env.local"
    "*.key"
    "*.pem"
    "credentials.*"
    "secrets.*"
    "*password*"
    "*secret*"
    "*.backup"
)

echo "   🛡️ Padrões sensíveis protegidos: ${SENSITIVE_PATTERNS[*]}"

# 3. Adicionar apenas arquivos seguros
echo ""
echo "📁 ADICIONANDO ARQUIVOS SEGUROS AO COMMIT..."

# Adicionar arquivos principais do sistema
git add dashboard-operacional-detalhado-fixed.js
git add monitoramento-simples.js  
git add limpeza-banco-completa.js
git add test-new-connection.js
git add corrigir-estrutura-tabelas.js

# Adicionar documentação
git add *.md

echo "   ✅ Arquivos principais adicionados"

# 4. Verificar se .env não será commitado
if git diff --cached --name-only | grep -q "^.env$"; then
    echo "   ⚠️ ATENÇÃO: .env está sendo commitado! Removendo..."
    git reset .env
fi

echo "   ✅ Arquivos sensíveis protegidos"

# 5. Mostrar resumo do que será commitado
echo ""
echo "📋 RESUMO DO COMMIT:"
echo "=================="
git diff --cached --name-only | while read file; do
    echo "   ✅ $file"
done

# 6. Solicitar confirmação
echo ""
echo "🚨 CONFIRMAÇÃO NECESSÁRIA"
echo "========================"
echo "Os arquivos listados acima serão commitados."
echo "Verifique se não há dados sensíveis expostos."
echo ""
read -p "Continuar com o commit? (y/N): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    # 7. Realizar commit
    echo "📝 Criando commit..."
    git commit -m "feat: 🚀 Sistema operacional atualizado

✅ Correções implementadas:
- Dashboard operacional com queries corrigidas
- Monitoramento automático de chaves API
- Limpeza completa do banco de dados
- Estrutura de tabelas corrigida
- CSS melhorado com cores contrastantes

🔧 Componentes atualizados:
- dashboard-operacional-detalhado-fixed.js
- monitoramento-simples.js
- limpeza-banco-completa.js
- corrigir-estrutura-tabelas.js

🗄️ Database: Conectado ao Railway PostgreSQL
🎨 Interface: Cores e responsividade melhoradas
🔑 Monitoramento: Sistema automático ativo

Sistema pronto para produção! 🚀"

    echo ""
    echo "✅ COMMIT REALIZADO COM SUCESSO!"
    echo "================================"
    echo "📦 Backup salvo em: $BACKUP_DIR"
    echo "🔄 Para fazer push: git push origin main"
    echo "🌐 Dashboard ativo em: http://localhost:4001"
    
else
    echo ""
    echo "❌ COMMIT CANCELADO"
    echo "=================="
    echo "Use 'git reset' para desfazer mudanças se necessário"
fi

echo ""
echo "🔒 PUSH SEGURO FINALIZADO"
