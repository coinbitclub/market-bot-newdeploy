# EXECUCAO AUTOMATICA - SISTEMA DE ACEITE DE TERMOS
# =========================================================

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "SISTEMA DE ACEITE DE TERMOS E POLITICAS" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Executar integracao automatica
Write-Host "1. Executando integracao automatica..." -ForegroundColor Yellow
node integrador-sistema-termos.js

if ($LASTEXITCODE -eq 0) {
    Write-Host "Integracao concluida com sucesso!" -ForegroundColor Green
    Write-Host ""
    
    # 2. Executar testes de validacao
    Write-Host "2. Executando testes de validacao..." -ForegroundColor Yellow
    node testar-sistema-termos.js
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Testes concluidos!" -ForegroundColor Green
    }
    
    # 3. Verificar arquivos criados
    Write-Host ""
    Write-Host "3. Verificando arquivos criados..." -ForegroundColor Yellow
    
    $arquivos = @(
        "routes\terms-api.js",
        "migrate-terms-system.sql",
        "frontend\components\terms\TermsAcceptanceModal.jsx",
        "frontend\components\terms\TermsAdminManager.jsx",
        "frontend\components\terms\terms-config.json"
    )
    
    $encontrados = 0
    foreach ($arquivo in $arquivos) {
        if (Test-Path $arquivo) {
            Write-Host "  ✅ $arquivo" -ForegroundColor Green
            $encontrados++
        } else {
            Write-Host "  ❌ $arquivo" -ForegroundColor Red
        }
    }
    
    Write-Host ""
    Write-Host "Arquivos encontrados: $encontrados/$($arquivos.Count)" -ForegroundColor Cyan
    
    # 4. Status final
    Write-Host ""
    Write-Host "PROXIMOS PASSOS OBRIGATORIOS:" -ForegroundColor Yellow
    Write-Host "=============================" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "1. Execute o arquivo migrate-terms-system.sql no PostgreSQL" -ForegroundColor White
    Write-Host "2. Reinicie o servidor: npm restart" -ForegroundColor White
    Write-Host "3. Teste: GET http://localhost:3000/api/terms/current" -ForegroundColor White
    Write-Host "4. Configure componentes React no frontend" -ForegroundColor White
    Write-Host "5. Configure aceite obrigatorio no cadastro" -ForegroundColor White
    Write-Host ""
    
    if ($encontrados -eq $arquivos.Count) {
        Write-Host "SISTEMA DE ACEITE DE TERMOS INSTALADO! " -ForegroundColor Green
        Write-Host "Todos os arquivos foram criados com sucesso" -ForegroundColor Green
    } else {
        Write-Host "Instalacao parcial - alguns arquivos nao foram criados" -ForegroundColor Yellow
    }
    
} else {
    Write-Host "Falha na integracao!" -ForegroundColor Red
    Write-Host "Verifique os logs de erro para detalhes" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Execucao finalizada!" -ForegroundColor Magenta
Write-Host "=========================================" -ForegroundColor Magenta
