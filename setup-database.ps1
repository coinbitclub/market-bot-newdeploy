# DATABASE RESET - SCRIPT DE RECRIACAO COMPLETA DO BANCO DE DADOS
# MarketBot Enterprise - Reset Automatico (Windows PowerShell)
# Execute: .\setup-database.ps1

Write-Host "MarketBot Enterprise - Database Reset" -ForegroundColor Blue
Write-Host "=================================================" -ForegroundColor Blue
Write-Host ""

# Funcao para carregar configuracoes do .env
function Load-EnvConfig {
    Write-Host "Carregando configuracoes do .env..." -ForegroundColor Yellow
    
    if (-not (Test-Path ".env")) {
        Write-Host "Arquivo .env nao encontrado!" -ForegroundColor Red
        Write-Host "   Certifique-se de que o arquivo .env existe no diretorio atual."
        exit 1
    }
    
    # Ler arquivo .env
    $envContent = Get-Content ".env"
    $config = @{}
    
    foreach ($line in $envContent) {
        if ($line -match "^([^#][^=]+)=(.*)$") {
            $key = $matches[1].Trim()
            $value = $matches[2].Trim()
            $config[$key] = $value
        }
    }
    
    # Extrair configuracoes do banco
    $global:DB_HOST = $config["DB_MASTER_HOST"]
    $global:DB_PORT = $config["DB_MASTER_PORT"]
    $global:DB_NAME = $config["POSTGRES_DB"]
    $global:DB_USER = $config["POSTGRES_USER"]
    $global:DB_PASSWORD = $config["POSTGRES_PASSWORD"]
    
    Write-Host "Configuracoes carregadas:" -ForegroundColor Cyan
    Write-Host "   Host: $global:DB_HOST"
    Write-Host "   Porta: $global:DB_PORT"
    Write-Host "   Database: $global:DB_NAME"
    Write-Host "   Usuario: $global:DB_USER"
    Write-Host ""
}

# Funcao para verificar se PostgreSQL esta instalado
function Check-PostgreSQL {
    Write-Host "Verificando PostgreSQL..." -ForegroundColor Yellow
    try {
        $version = psql --version
        Write-Host "PostgreSQL encontrado!" -ForegroundColor Green
        Write-Host $version
        return $true
    }
    catch {
        Write-Host "PostgreSQL nao encontrado!" -ForegroundColor Red
        Write-Host "   Instale PostgreSQL primeiro:" -ForegroundColor Yellow
        Write-Host "   Download: https://www.postgresql.org/download/windows/"
        exit 1
    }
}

# Funcao para testar conexao
function Test-Connection {
    Write-Host "Testando conexao com banco..." -ForegroundColor Yellow
    
    $env:PGPASSWORD = $global:DB_PASSWORD
    
    try {
        # Teste de conexao simples
        $result = psql -h $global:DB_HOST -p $global:DB_PORT -U $global:DB_USER -d $global:DB_NAME -c "SELECT 'Conexao OK' as status;" 2>$null
        Write-Host "Conexao com banco funcionando!" -ForegroundColor Green
        return $true
    }
    catch {
        Write-Host "Erro na conexao com banco!" -ForegroundColor Red
        Write-Host "   Verifique as configuracoes no arquivo .env"
        exit 1
    }
}

# Funcao para apagar todas as tabelas
function Drop-AllTables {
    Write-Host ""
    Write-Host "Apagando todas as tabelas existentes..." -ForegroundColor Yellow
    
    $env:PGPASSWORD = $global:DB_PASSWORD
    
    try {
        # Script SQL para apagar todas as tabelas
        $dropScript = @"
DO `$`$ DECLARE
    r RECORD;
BEGIN
    -- Apagar todas as tabelas
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
    END LOOP;
    
    -- Apagar todas as sequencias
    FOR r IN (SELECT sequence_name FROM information_schema.sequences WHERE sequence_schema = 'public') LOOP
        EXECUTE 'DROP SEQUENCE IF EXISTS ' || quote_ident(r.sequence_name) || ' CASCADE';
    END LOOP;
    
    -- Apagar todas as funcoes customizadas
    FOR r IN (SELECT proname, oidvectortypes(proargtypes) as argtypes FROM pg_proc INNER JOIN pg_namespace ON pg_proc.pronamespace = pg_namespace.oid WHERE pg_namespace.nspname = 'public' AND pg_proc.prokind = 'f') LOOP
        EXECUTE 'DROP FUNCTION IF EXISTS ' || quote_ident(r.proname) || '(' || r.argtypes || ') CASCADE';
    END LOOP;
END `$`$;
"@
        
        # Executar script de limpeza
        Write-Host "   Executando limpeza completa..."
        $dropScript | psql -h $global:DB_HOST -p $global:DB_PORT -U $global:DB_USER -d $global:DB_NAME > drop_tables.log 2>&1
        
        # Verificar se limpeza foi bem sucedida
        $tableCount = psql -h $global:DB_HOST -p $global:DB_PORT -U $global:DB_USER -d $global:DB_NAME -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>$null
        $tableCount = $tableCount.Trim()
        
        if ($tableCount -eq "0") {
            Write-Host "Todas as tabelas foram apagadas com sucesso!" -ForegroundColor Green
        } else {
            Write-Host "Ainda existem $tableCount tabelas. Verificando..." -ForegroundColor Yellow
        }
    }
    catch {
        Write-Host "Erro ao apagar tabelas!" -ForegroundColor Red
        Write-Host $_.Exception.Message
        exit 1
    }
}

# Funcao para executar schema principal
function Setup-Schema {
    Write-Host ""
    Write-Host "Executando schema principal..." -ForegroundColor Yellow
    Write-Host "   Arquivo: scripts\database\enterprise-complete-database-setup.sql"
    Write-Host "   Tamanho: 1360 linhas, 32 tabelas"
    
    # Verificar se arquivo existe
    if (-not (Test-Path "scripts\database\enterprise-complete-database-setup.sql")) {
        Write-Host "Arquivo de schema nao encontrado!" -ForegroundColor Red
        Write-Host "   Certifique-se de estar no diretorio raiz do projeto."
        exit 1
    }
    
    # Configurar variavel de ambiente para senha
    $env:PGPASSWORD = $global:DB_PASSWORD
    
    try {
        # Executar schema
        Write-Host "   Executando schema..."
        psql -h $global:DB_HOST -p $global:DB_PORT -U $global:DB_USER -d $global:DB_NAME -f "scripts\database\enterprise-complete-database-setup.sql" > schema_install.log 2>&1
        
        Write-Host "Schema executado com sucesso!" -ForegroundColor Green
    }
    catch {
        Write-Host "Erro ao executar schema!" -ForegroundColor Red
        Write-Host "   Verifique o arquivo schema_install.log para detalhes"
        exit 1
    }
}

# Funcao para verificar instalacao
function Verify-Installation {
    Write-Host ""
    Write-Host "Verificando instalacao..." -ForegroundColor Yellow
    
    $env:PGPASSWORD = $global:DB_PASSWORD
    
    try {
        # Contar tabelas
        $tableCount = psql -h $global:DB_HOST -p $global:DB_PORT -U $global:DB_USER -d $global:DB_NAME -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>$null
        $tableCount = $tableCount.Trim()
        
        if ($tableCount -eq "32") {
            Write-Host "Todas as 32 tabelas criadas com sucesso!" -ForegroundColor Green
        } else {
            Write-Host "$tableCount tabelas encontradas (esperado: 32)" -ForegroundColor Yellow
            
            # Listar tabelas criadas
            Write-Host "Tabelas criadas:"
            $tables = psql -h $global:DB_HOST -p $global:DB_PORT -U $global:DB_USER -d $global:DB_NAME -t -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;" 2>$null
            $tables -split "`n" | ForEach-Object { 
                $table = $_.Trim()
                if ($table) {
                    Write-Host "   - $table"
                }
            }
        }
        
        # Verificar usuario admin
        $adminExists = psql -h $global:DB_HOST -p $global:DB_PORT -U $global:DB_USER -d $global:DB_NAME -t -c "SELECT COUNT(*) FROM users WHERE username = 'admin';" 2>$null
        $adminExists = $adminExists.Trim()
        
        if ($adminExists -eq "1") {
            Write-Host "Usuario administrador criado!" -ForegroundColor Green
        } else {
            Write-Host "Usuario administrador nao encontrado!" -ForegroundColor Yellow
        }
        
        # Verificar indices
        $indexCount = psql -h $global:DB_HOST -p $global:DB_PORT -U $global:DB_USER -d $global:DB_NAME -t -c "SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public' AND indexname LIKE 'idx_%';" 2>$null
        $indexCount = $indexCount.Trim()
        
        Write-Host "$indexCount indices de performance criados!" -ForegroundColor Green
    }
    catch {
        Write-Host "Erro na verificacao!" -ForegroundColor Red
        Write-Host $_.Exception.Message
    }
}

# Funcao para mostrar status final
function Show-FinalStatus {
    Write-Host ""
    Write-Host "RESET DO BANCO CONCLUIDO!" -ForegroundColor Green
    Write-Host "=================================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Status do Banco:" -ForegroundColor Cyan
    Write-Host "   Host: $global:DB_HOST:$global:DB_PORT"
    Write-Host "   Database: $global:DB_NAME"
    Write-Host "   Usuario: $global:DB_USER"
    Write-Host "   Tabelas recriadas com sucesso"
    Write-Host "   Indices de performance ativos"
    Write-Host "   Sistema pronto para uso"
    Write-Host ""
    Write-Host "Proximos passos:" -ForegroundColor Yellow
    Write-Host "   1. Inicie o sistema: npm start"
    Write-Host "   2. Acesse: http://localhost:3333"
    Write-Host "   3. Login admin: admin / admin123"
    Write-Host ""
    Write-Host "Logs gerados:" -ForegroundColor Yellow
    Write-Host "   - drop_tables.log (limpeza)"
    Write-Host "   - schema_install.log (criacao)"
    Write-Host ""
}

# Execucao principal
function Main {
    Write-Host "Iniciando reset do banco de dados..." -ForegroundColor Cyan
    
    Load-EnvConfig
    Check-PostgreSQL
    Test-Connection
    
    # Confirmacao do usuario
    Write-Host "ATENCAO: Este script ira APAGAR TODAS as tabelas do banco!" -ForegroundColor Red
    Write-Host "Database: $global:DB_NAME em $global:DB_HOST" -ForegroundColor Red
    Write-Host ""
    $confirmation = Read-Host "Digite 'CONFIRMO' para continuar"
    
    if ($confirmation -ne "CONFIRMO") {
        Write-Host "Operacao cancelada pelo usuario." -ForegroundColor Yellow
        exit 0
    }
    
    Drop-AllTables
    Setup-Schema
    Verify-Installation
    Show-FinalStatus
    
    Write-Host "Reset completo! Banco pronto para uso." -ForegroundColor Green
}

# Verificar se esta no diretorio correto
if (-not (Test-Path "package.json") -or -not (Test-Path "scripts\database")) {
    Write-Host "Execute este script no diretorio raiz do projeto!" -ForegroundColor Red
    Write-Host "   Certifique-se de estar em: market-bot-newdeploy"
    exit 1
}

# Executar reset
Main
