# 🚀 EXECUÇÃO AUTOMÁTICA DA INTEGRAÇÃO - SISTEMA DE AFILIAÇÃO
# =========================================================

# INSTRUÇÕES PARA EXECUÇÃO IMEDIATA:

# 1. Executar integração automática
Write-Host "🔧 Executando integração automática do Sistema de Afiliação..." -ForegroundColor Cyan
node integrador-sistema-afiliacao.js

# 2. Verificar se houve sucesso
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Integração concluída com sucesso!" -ForegroundColor Green
    
    # 3. Executar migração de database (se necessário)
    if (Test-Path "migrate-affiliate-system.sql") {
        Write-Host "🗄️ Script de migração encontrado. Execute manualmente conforme sua configuração de database." -ForegroundColor Yellow
    }
    
    # 4. Verificar arquivos criados
    Write-Host "📁 Arquivos criados durante a integração:" -ForegroundColor Cyan
    $affiliateFiles = Get-ChildItem -Path . -Filter "*affiliate*" -Recurse -ErrorAction SilentlyContinue
    if ($affiliateFiles) {
        $affiliateFiles | ForEach-Object { Write-Host "  - $($_.FullName)" -ForegroundColor Gray }
    } else {
        Write-Host "  - Nenhum arquivo específico encontrado" -ForegroundColor Gray
    }
    
    # 5. Mostrar próximos passos
    Write-Host ""
    Write-Host "🎯 PRÓXIMOS PASSOS:" -ForegroundColor Yellow
    Write-Host "1. Revisar o relatório: affiliate-integration-report.json" -ForegroundColor White
    Write-Host "2. Executar migração de database conforme sua configuração" -ForegroundColor White
    Write-Host "3. Reiniciar o servidor: npm restart ou pm2 restart" -ForegroundColor White
    Write-Host "4. Testar funcionalidades através da interface" -ForegroundColor White
    Write-Host "5. Configurar notificações de email" -ForegroundColor White
    
    Write-Host ""
    Write-Host "🎉 SISTEMA DE AFILIAÇÃO PRONTO PARA USO!" -ForegroundColor Green
} else {
    Write-Host "❌ Falha na integração. Verifique os logs para detalhes." -ForegroundColor Red
    Write-Host "💡 Dica: Verifique se o Node.js está instalado e se o arquivo integrador-sistema-afiliacao.js existe." -ForegroundColor Yellow
    exit 1
}
