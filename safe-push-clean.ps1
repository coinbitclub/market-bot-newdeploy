# Script de Push Seguro - CoinBitClub Trading Bot
# Seguindo regras de seguranca para push em producao

Write-Host "INICIANDO PUSH SEGURO - COINBITCLUB TRADING BOT" -ForegroundColor Green
Write-Host "===============================================" -ForegroundColor Green

# Criar backup de arquivos sensiveis
$backupDir = "safe-push-backup/safe-push-$(Get-Date -Format 'yyyy-MM-ddTHH-mm-ss-000Z')"
New-Item -Path $backupDir -ItemType Directory -Force | Out-Null

Write-Host ""
Write-Host "Criando backup de arquivos sensiveis..." -ForegroundColor Yellow

# Backup do .env
if (Test-Path ".env") {
    Copy-Item ".env" "$backupDir/.env.backup"
    Write-Host "   .env -> $backupDir/.env.backup" -ForegroundColor Green
}

# Backup de arquivos criticos
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

Write-Host "   Arquivos principais backupeados" -ForegroundColor Green

# Adicionar arquivos seguros
Write-Host ""
Write-Host "Adicionando arquivos seguros ao commit..." -ForegroundColor Yellow

git add dashboard-operacional-detalhado-fixed.js
git add monitoramento-simples.js
git add limpeza-banco-completa.js
git add test-new-connection.js
git add corrigir-estrutura-tabelas.js

Write-Host "   Arquivos principais adicionados" -ForegroundColor Green

# Verificar se .env nao sera commitado
$stagedFiles = git diff --cached --name-only
if ($stagedFiles -contains ".env") {
    Write-Host "   ATENCAO: .env estava sendo commitado! Removendo..." -ForegroundColor Red
    git reset .env
}

Write-Host "   Arquivos sensiveis protegidos" -ForegroundColor Green

# Mostrar resumo
Write-Host ""
Write-Host "RESUMO DO COMMIT:" -ForegroundColor Cyan
Write-Host "=================" -ForegroundColor Cyan
$stagedFiles = git diff --cached --name-only
foreach ($file in $stagedFiles) {
    Write-Host "   $file" -ForegroundColor Green
}

# Confirmacao
Write-Host ""
Write-Host "CONFIRMACAO NECESSARIA" -ForegroundColor Red
Write-Host "======================" -ForegroundColor Red
Write-Host "Os arquivos listados acima serao commitados."
Write-Host ""

$confirmation = Read-Host "Continuar com o commit? (y/N)"

if ($confirmation -eq "y" -or $confirmation -eq "Y") {
    Write-Host ""
    Write-Host "Criando commit..." -ForegroundColor Yellow
    
    git commit -m "feat: Sistema operacional atualizado

- Dashboard operacional com queries corrigidas
- Monitoramento automatico de chaves API  
- Limpeza completa do banco de dados
- Estrutura de tabelas corrigida
- CSS melhorado com cores contrastantes

Componentes atualizados:
- dashboard-operacional-detalhado-fixed.js
- monitoramento-simples.js
- limpeza-banco-completa.js
- corrigir-estrutura-tabelas.js

Database: Conectado ao Railway PostgreSQL
Interface: Cores e responsividade melhoradas  
Monitoramento: Sistema automatico ativo

Sistema pronto para producao!"

    Write-Host ""
    Write-Host "COMMIT REALIZADO COM SUCESSO!" -ForegroundColor Green
    Write-Host "=============================" -ForegroundColor Green
    Write-Host "Backup salvo em: $backupDir" -ForegroundColor Cyan
    Write-Host "Para fazer push: git push origin main" -ForegroundColor Cyan  
    Write-Host "Dashboard ativo em: http://localhost:4001" -ForegroundColor Cyan
    
    # Perguntar sobre push
    Write-Host ""
    $pushConfirmation = Read-Host "Fazer push para o repositorio remoto? (y/N)"
    
    if ($pushConfirmation -eq "y" -or $pushConfirmation -eq "Y") {
        Write-Host "Fazendo push..." -ForegroundColor Yellow
        git push origin main
        Write-Host "PUSH REALIZADO COM SUCESSO!" -ForegroundColor Green
    }
    
} else {
    Write-Host ""
    Write-Host "COMMIT CANCELADO" -ForegroundColor Red
    Write-Host "================" -ForegroundColor Red
    Write-Host "Use 'git reset' para desfazer mudancas se necessario" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "PUSH SEGURO FINALIZADO" -ForegroundColor Green
