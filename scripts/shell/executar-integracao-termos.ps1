# 🚀 EXECUÇÃO AUTOMÁTICA - SISTEMA DE ACEITE DE TERMOS
# =========================================================
# Arquivo: executar-integracao-termos.ps1
# Versão: 1.0.0
# Data: 2025-08-22

# 🎯 INSTRUÇÕES PARA EXECUÇÃO IMEDIATA:

Write-Host "🚀 SISTEMA DE ACEITE DE TERMOS E POLÍTICAS" -ForegroundColor Cyan
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host ""

# 1️⃣ Executar integração automática
Write-Host "1️⃣ Executando integração automática..." -ForegroundColor Yellow
try {
    node integrador-sistema-termos.js
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Integração concluída com sucesso!" -ForegroundColor Green
        
        # 2️⃣ Executar testes de validação
        Write-Host ""
        Write-Host "2️⃣ Executando testes de validação..." -ForegroundColor Yellow
        node testar-sistema-termos.js
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Testes concluídos!" -ForegroundColor Green
        }
        
        # 3️⃣ Verificar arquivos criados
        Write-Host ""
        Write-Host "3️⃣ Verificando arquivos criados..." -ForegroundColor Yellow
        
        $createdFiles = @(
            "routes\terms-api.js",
            "migrate-terms-system.sql",
            "frontend\components\terms\TermsAcceptanceModal.jsx",
            "frontend\components\terms\TermsAdminManager.jsx",
            "frontend\components\terms\terms-config.json"
        )
        
        $foundFiles = 0
        foreach ($file in $createdFiles) {
            if (Test-Path $file) {
                Write-Host "  ✅ $file" -ForegroundColor Green
                $foundFiles++
            } else {
                Write-Host "  ❌ $file" -ForegroundColor Red
            }
        }
        
        Write-Host ""
        Write-Host "📊 Arquivos encontrados: $foundFiles/$($createdFiles.Count)" -ForegroundColor Cyan
        
        # 4️⃣ Verificar relatórios
        Write-Host ""
        Write-Host "4️⃣ Verificando relatórios..." -ForegroundColor Yellow
        
        if (Test-Path "terms-integration-report.json") {
            Write-Host "  ✅ Relatório de integração criado" -ForegroundColor Green
            
            # Ler estatísticas do relatório
            try {
                $report = Get-Content "terms-integration-report.json" | ConvertFrom-Json
                $statusText = if ($report.success) { "SUCESSO" } else { "FALHA" }
                $statusColor = if ($report.success) { "Green" } else { "Red" }
                Write-Host "  📊 Status: $statusText" -ForegroundColor $statusColor
                Write-Host "  📁 Arquivos criados: $($report.files.created.Count)" -ForegroundColor Cyan
                Write-Host "  🔗 APIs adicionadas: $($report.apis.endpoints_added.Count)" -ForegroundColor Cyan
            } catch {
                Write-Host "  ⚠️ Não foi possível ler estatísticas do relatório" -ForegroundColor Yellow
            }
        } else {
            Write-Host "  ❌ Relatório de integração não encontrado" -ForegroundColor Red
        }
        
        if (Test-Path "terms-integration-summary.txt") {
            Write-Host "  ✅ Resumo em texto criado" -ForegroundColor Green
        }
        
        # 5️⃣ Próximos passos
        Write-Host ""
        Write-Host "🎯 PRÓXIMOS PASSOS OBRIGATÓRIOS:" -ForegroundColor Yellow
        Write-Host "=================================" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "1. 🗄️ BANCO DE DADOS:" -ForegroundColor White
        Write-Host "   Execute o arquivo migrate-terms-system.sql no PostgreSQL:" -ForegroundColor Gray
        Write-Host "   psql -U seu_usuario -d sua_database -f migrate-terms-system.sql" -ForegroundColor Gray
        Write-Host ""
        Write-Host "2. 🔄 REINICIAR SERVIDOR:" -ForegroundColor White
        Write-Host "   npm restart" -ForegroundColor Gray
        Write-Host "   # ou" -ForegroundColor Gray
        Write-Host "   pm2 restart all" -ForegroundColor Gray
        Write-Host ""
        Write-Host "3. 🧪 TESTAR APIS:" -ForegroundColor White
        Write-Host "   GET http://localhost:3000/api/terms/current" -ForegroundColor Gray
        Write-Host "   GET http://localhost:3000/api/terms/health" -ForegroundColor Gray
        Write-Host ""
        Write-Host "4. ⚛️ CONFIGURAR FRONTEND:" -ForegroundColor White
        Write-Host "   Integre os componentes React na sua aplicação frontend" -ForegroundColor Gray
        Write-Host "   Arquivos: frontend/components/terms/*.jsx" -ForegroundColor Gray
        Write-Host ""
        Write-Host "5. ⚖️ COMPLIANCE:" -ForegroundColor White
        Write-Host "   Configure aceite obrigatório no cadastro de usuários" -ForegroundColor Gray
        Write-Host "   Implemente verificação automática no login" -ForegroundColor Gray
        Write-Host ""
        
        # 6️⃣ Status final
        if ($foundFiles -eq $createdFiles.Count) {
            Write-Host "🎉 SISTEMA DE ACEITE DE TERMOS INSTALADO! 🎉" -ForegroundColor Green
            Write-Host "✅ Todos os arquivos foram criados com sucesso" -ForegroundColor Green
            Write-Host "🔧 Execute os próximos passos para ativar o sistema" -ForegroundColor Cyan
        } else {
            Write-Host "⚠️ Instalação parcial - alguns arquivos não foram criados" -ForegroundColor Yellow
            Write-Host "🔍 Verifique os logs de erro acima" -ForegroundColor Yellow
        }
        
    } else {
        Write-Host "❌ Falha na integração!" -ForegroundColor Red
        Write-Host "🔍 Verifique os logs de erro para detalhes" -ForegroundColor Yellow
    }
    
} catch {
    Write-Host "❌ Erro durante a execução: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "💡 Verifique se o Node.js está instalado e funcionando" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "📋 Para mais detalhes, consulte:" -ForegroundColor Cyan
Write-Host "   • terms-integration-report.json (relatório completo)" -ForegroundColor Gray
Write-Host "   • terms-integration-summary.txt (resumo)" -ForegroundColor Gray
Write-Host "   • implementacoes-enterprise/02-sistema-termos/documentacao.md" -ForegroundColor Gray

Write-Host ""
Write-Host "🏁 Execução finalizada!" -ForegroundColor Magenta
Write-Host "===========================================" -ForegroundColor Magenta
