# CoinBitClub Enterprise - Teste Local Simples
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "CoinBitClub Enterprise - Teste Local" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan

# Verificar Docker
Write-Host "Verificando Docker..." -ForegroundColor Yellow
try {
    $dockerVersion = docker --version 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Docker encontrado: $dockerVersion" -ForegroundColor Green
        
        # Verificar se Docker está rodando
        docker info 2>$null | Out-Null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Docker esta rodando!" -ForegroundColor Green
            
            # Verificar se docker-compose existe
            if (Test-Path "docker-compose.production.yml") {
                Write-Host "Arquivo docker-compose.production.yml encontrado" -ForegroundColor Green
                
                # Tentar iniciar os serviços
                Write-Host "Iniciando servicos..." -ForegroundColor Yellow
                docker-compose -f docker-compose.production.yml up -d
                
                if ($LASTEXITCODE -eq 0) {
                    Write-Host "Servicos iniciados com sucesso!" -ForegroundColor Green
                    Write-Host "Aguardando 10 segundos..." -ForegroundColor Yellow
                    Start-Sleep 10
                    
                    # Mostrar status
                    Write-Host "Status dos containers:" -ForegroundColor Cyan
                    docker-compose -f docker-compose.production.yml ps
                    
                    Write-Host ""
                    Write-Host "URLs de acesso:" -ForegroundColor Cyan
                    Write-Host "- Aplicacao: http://localhost" -ForegroundColor White
                    Write-Host "- Grafana: http://localhost:3001" -ForegroundColor White
                    Write-Host "- Prometheus: http://localhost:9090" -ForegroundColor White
                    
                } else {
                    Write-Host "Erro ao iniciar servicos" -ForegroundColor Red
                }
            } else {
                Write-Host "Arquivo docker-compose.production.yml nao encontrado" -ForegroundColor Red
            }
        } else {
            Write-Host "Docker nao esta rodando. Por favor, inicie o Docker Desktop." -ForegroundColor Red
        }
    } else {
        Write-Host "Docker nao encontrado. Por favor, instale o Docker Desktop." -ForegroundColor Red
    }
}
catch {
    Write-Host "Erro ao verificar Docker: $($_.Exception.Message)" -ForegroundColor Red
}
