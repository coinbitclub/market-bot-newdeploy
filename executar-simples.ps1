# 🚀 SCRIPT SIMPLES - INTEGRAÇÃO SISTEMA DE AFILIAÇÃO
# ==================================================

Write-Host ""
Write-Host "🔧 Executando Sistema de Afiliação..." -ForegroundColor Cyan
Write-Host ""

# Executar integração
node integrador-sistema-afiliacao.js

Write-Host ""
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ INTEGRAÇÃO CONCLUÍDA COM SUCESSO!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📁 Arquivos criados:" -ForegroundColor Yellow
    Write-Host "   - affiliate-system-extended-schema.sql" -ForegroundColor White
    Write-Host "   - migrate-affiliate-system.sql" -ForegroundColor White
    Write-Host "   - routes/affiliate-api.js" -ForegroundColor White
    Write-Host "   - frontend/src/components/affiliate/*" -ForegroundColor White
    Write-Host "   - affiliate-system-config.json" -ForegroundColor White
    Write-Host ""
    Write-Host "🎯 PRÓXIMOS PASSOS:" -ForegroundColor Yellow
    Write-Host "   1. Executar migração SQL no seu banco" -ForegroundColor White
    Write-Host "   2. Reiniciar servidor: npm restart" -ForegroundColor White
    Write-Host "   3. Testar funcionalidades" -ForegroundColor White
    Write-Host ""
    Write-Host "🎉 SISTEMA PRONTO PARA USO!" -ForegroundColor Green
} else {
    Write-Host "❌ Falha na integração" -ForegroundColor Red
}

Write-Host ""
