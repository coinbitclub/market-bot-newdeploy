# ====================================================================
# SCRIPT DE PUSH SEGURO - COINBITCLUB TRADING BOT (PowerShell)
# ====================================================================
# Este script segue as regras de segurança para push em produção

Write-Host "🔒 INICIANDO PUSH SEGURO - COINBITCLUB TRADING BOT" -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Green

# 1. Criar backup de arquivos sensíveis
$backupDir = "safe-push-backup/safe-push-$(Get-Date -Format 'yyyy-MM-ddTHH-mm-ss-000Z')"
New-Item -Path $backupDir -ItemType Directory -Force | Out-Null

Write-Host ""
Write-Host "📦 Criando backup de arquivos sensíveis..." -ForegroundColor Yellow

# Backup do .env (arquivo sensível)
if (Test-Path ".env") {
    Copy-Item ".env" "$backupDir/.env.backup"
    Write-Host "   ✅ .env -> $backupDir/.env.backup" -ForegroundColor Green
}

# Backup de arquivos críticos
$criticalFiles = @(
    "dashboard-operacional-detalhado-fixed.js",
    "monitoramento-simples.js", 
    "limpeza-banco-completa.js",
    "test-new-connection.js"
)

foreach ($file in $criticalFiles) {
    if (Test-Path $file) {
        Copy-Item $file $backupDir
    }
}

Write-Host "   ✅ Arquivos principais backupeados" -ForegroundColor Green

# 2. Verificar status do Git
Write-Host ""
Write-Host "🔍 VERIFICANDO STATUS DO REPOSITÓRIO..." -ForegroundColor Yellow
git status --porcelain

# 3. Adicionar apenas arquivos seguros
Write-Host ""
Write-Host "📁 ADICIONANDO ARQUIVOS SEGUROS AO COMMIT..." -ForegroundColor Yellow

# Arquivos seguros para commit
$safeFiles = @(
    "dashboard-operacional-detalhado-fixed.js",
    "monitoramento-simples.js",
    "limpeza-banco-completa.js", 
    "test-new-connection.js",
    "corrigir-estrutura-tabelas.js",
    "*.md"
)

foreach ($file in $safeFiles) {
    if (Test-Path $file) {
        git add $file
        Write-Host "   ✅ Adicionado: $file" -ForegroundColor Green
    }
}

# 4. Verificar se .env não será commitado
$stagedFiles = git diff --cached --name-only
if ($stagedFiles -contains ".env") {
    Write-Host "   ⚠️ ATENÇÃO: .env estava sendo commitado! Removendo..." -ForegroundColor Red
    git reset .env
}

Write-Host "   ✅ Arquivos sensíveis protegidos" -ForegroundColor Green

# 5. Mostrar resumo do que será commitado
Write-Host ""
Write-Host "📋 RESUMO DO COMMIT:" -ForegroundColor Cyan
Write-Host "==================" -ForegroundColor Cyan
$stagedFiles = git diff --cached --name-only
foreach ($file in $stagedFiles) {
    Write-Host "   ✅ $file" -ForegroundColor Green
}

# 6. Solicitar confirmação
Write-Host ""
Write-Host "🚨 CONFIRMAÇÃO NECESSÁRIA" -ForegroundColor Red
Write-Host "========================" -ForegroundColor Red
Write-Host "Os arquivos listados acima serão commitados."
Write-Host "Verifique se não há dados sensíveis expostos."
Write-Host ""

$confirmation = Read-Host "Continuar com o commit? (y/N)"

if ($confirmation -eq "y" -or $confirmation -eq "Y") {
    # 7. Realizar commit
    Write-Host ""
    Write-Host "📝 Criando commit..." -ForegroundColor Yellow
    
    $commitMessage = @"
feat: 🚀 Sistema operacional atualizado

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

Sistema pronto para produção! 🚀
"@

    git commit -m $commitMessage

    Write-Host ""
    Write-Host "✅ COMMIT REALIZADO COM SUCESSO!" -ForegroundColor Green
    Write-Host "================================" -ForegroundColor Green
    Write-Host "📦 Backup salvo em: $backupDir" -ForegroundColor Cyan
    Write-Host "🔄 Para fazer push: git push origin main" -ForegroundColor Cyan  
    Write-Host "🌐 Dashboard ativo em: http://localhost:4001" -ForegroundColor Cyan
    
    # Perguntar sobre push
    Write-Host ""
    $pushConfirmation = Read-Host "Fazer push para o repositório remoto? (y/N)"
    
    if ($pushConfirmation -eq "y" -or $pushConfirmation -eq "Y") {
        Write-Host "🚀 Fazendo push..." -ForegroundColor Yellow
        git push origin main
        Write-Host "✅ PUSH REALIZADO COM SUCESSO!" -ForegroundColor Green
    }
    
} else {
    Write-Host ""
    Write-Host "❌ COMMIT CANCELADO" -ForegroundColor Red
    Write-Host "==================" -ForegroundColor Red
    Write-Host "Use 'git reset' para desfazer mudanças se necessário" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🔒 PUSH SEGURO FINALIZADO" -ForegroundColor Green
