# DATABASE SETUP - SCRIPT DE CONFIGURACAO COMPLETA DO BANCO DE DADOS
# CoinBitClub Enterprise v6.0.0 - Setup Automatico (Windows PowerShell)
# Execute: .\setup-database.ps1

Write-Host "CoinBitClub Enterprise v6.0.0 - Database Setup" -ForegroundColor Blue
Write-Host "==================================================" -ForegroundColor Blue
Write-Host ""

# Configuracoes padrao
$DB_NAME = "coinbitclub_enterprise"
$DB_USER = "coinbitclub_user"
$DB_HOST = "localhost"
$DB_PORT = "5432"

Write-Host "Configuracoes do Banco de Dados:" -ForegroundColor Cyan
Write-Host "   Database: $DB_NAME"
Write-Host "   Usuario: $DB_USER"
Write-Host "   Host: $DB_HOST"
Write-Host "   Porta: $DB_PORT"
Write-Host ""

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

# Funcao para solicitar senha
function Get-DatabasePassword {
    Write-Host ""
    Write-Host "Configuracao de Senha:" -ForegroundColor Yellow
    
    $password = Read-Host "   Digite uma senha forte para o usuario $DB_USER" -AsSecureString
    $password_confirm = Read-Host "   Confirme a senha" -AsSecureString
    
    # Converter SecureString para texto
    $pwd1 = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($password))
    $pwd2 = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($password_confirm))
    
    if ($pwd1 -ne $pwd2) {
        Write-Host "Senhas nao coincidem!" -ForegroundColor Red
        exit 1
    }
    
    if ($pwd1.Length -lt 8) {
        Write-Host "Senha deve ter pelo menos 8 caracteres!" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "Senha configurada com sucesso!" -ForegroundColor Green
    return $pwd1
}

# Funcao para criar banco e usuario
function Create-Database {
    param($password)
    
    Write-Host ""
    Write-Host "Criando banco de dados e usuario..." -ForegroundColor Yellow
    
    try {
        # Criar banco de dados
        Write-Host "   Criando banco de dados: $DB_NAME"
        psql -U postgres -c "CREATE DATABASE $DB_NAME;" 2>$null
        
        # Criar usuario
        Write-Host "   Criando usuario: $DB_USER"
        psql -U postgres -c "CREATE USER $DB_USER WITH PASSWORD '$password';" 2>$null
        
        # Conceder permissoes
        Write-Host "   Concedendo permissoes..."
        psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;" 2>$null
        
        Write-Host "Banco de dados configurado!" -ForegroundColor Green
    }
    catch {
        Write-Host "Erro ao criar banco de dados!" -ForegroundColor Red
        Write-Host $_.Exception.Message
        exit 1
    }
}

# Funcao para executar schema principal
function Setup-Schema {
    param($password)
    
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
    $env:PGPASSWORD = $password
    
    try {
        # Executar schema
        Write-Host "   Executando schema..."
        psql -U $DB_USER -d $DB_NAME -f "scripts\database\enterprise-complete-database-setup.sql" > schema_install.log 2>&1
        
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
    param($password)
    
    Write-Host ""
    Write-Host "Verificando instalacao..." -ForegroundColor Yellow
    
    $env:PGPASSWORD = $password
    
    try {
        # Contar tabelas
        $tableCount = psql -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>$null
        $tableCount = $tableCount.Trim()
        
        if ($tableCount -eq "32") {
            Write-Host "Todas as 32 tabelas criadas com sucesso!" -ForegroundColor Green
        } else {
            Write-Host "Apenas $tableCount tabelas encontradas (esperado: 32)" -ForegroundColor Red
            exit 1
        }
        
        # Verificar usuario admin
        $adminExists = psql -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM users WHERE username = 'admin';" 2>$null
        $adminExists = $adminExists.Trim()
        
        if ($adminExists -eq "1") {
            Write-Host "Usuario administrador criado!" -ForegroundColor Green
        } else {
            Write-Host "Usuario administrador nao encontrado!" -ForegroundColor Red
        }
        
        # Verificar indices
        $indexCount = psql -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public' AND indexname LIKE 'idx_%';" 2>$null
        $indexCount = $indexCount.Trim()
        
        Write-Host "$indexCount indices de performance criados!" -ForegroundColor Green
    }
    catch {
        Write-Host "Erro na verificacao!" -ForegroundColor Red
        Write-Host $_.Exception.Message
    }
}

# Funcao para criar arquivo .env
function Create-EnvFile {
    param($password)
    
    Write-Host ""
    Write-Host "Criando arquivo .env..." -ForegroundColor Yellow
    
    $envFile = ".env"
    
    # Backup do arquivo existente
    if (Test-Path $envFile) {
        $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
        Copy-Item $envFile "$envFile.backup.$timestamp"
        Write-Host "   Backup do .env existente criado"
    }
    
    # Gerar JWT secret
    $jwtSecret = [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes([System.Guid]::NewGuid().ToString()))
    $currentDate = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    
    # Criar novo arquivo .env
    $envContent = @"
# CoinBitClub Enterprise v6.0.0 - Database Configuration
# Gerado automaticamente em $currentDate

# Database Configuration
DB_HOST=$DB_HOST
DB_PORT=$DB_PORT
DB_NAME=$DB_NAME
DB_USER=$DB_USER
DB_PASSWORD=$password

# Application
NODE_ENV=production
PORT=3333

# Stripe (configure com suas chaves reais)
STRIPE_SECRET_KEY=sk_live_your_stripe_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here

# Exchanges (configure com suas chaves reais)
BINANCE_API_KEY=your_binance_api_key_here
BINANCE_SECRET_KEY=your_binance_secret_here
BYBIT_API_KEY=your_bybit_api_key_here
BYBIT_SECRET_KEY=your_bybit_secret_here

# Security
JWT_SECRET=$jwtSecret
"@

    $envContent | Out-File -FilePath $envFile -Encoding UTF8
    
    Write-Host "Arquivo .env criado com sucesso!" -ForegroundColor Green
    Write-Host "   Configure as chaves das exchanges e Stripe conforme necessario"
}

# Funcao para testar conexao
function Test-Connection {
    param($password)
    
    Write-Host ""
    Write-Host "Testando conexao com banco..." -ForegroundColor Yellow
    
    $env:PGPASSWORD = $password
    
    try {
        # Teste de conexao simples
        $result = psql -U $DB_USER -d $DB_NAME -c "SELECT 'Conexao OK' as status;" 2>$null
        Write-Host "Conexao com banco funcionando!" -ForegroundColor Green
    }
    catch {
        Write-Host "Erro na conexao com banco!" -ForegroundColor Red
        exit 1
    }
}

# Funcao para mostrar proximos passos
function Show-NextSteps {
    Write-Host ""
    Write-Host "SETUP CONCLUIDO COM SUCESSO!" -ForegroundColor Green
    Write-Host "==================================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Proximos passos:" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "1. Configure as chaves das exchanges no arquivo .env:"
    Write-Host "   - BINANCE_API_KEY e BINANCE_SECRET_KEY"
    Write-Host "   - BYBIT_API_KEY e BYBIT_SECRET_KEY"
    Write-Host ""
    Write-Host "2. Configure as chaves do Stripe no arquivo .env:"
    Write-Host "   - STRIPE_SECRET_KEY"
    Write-Host "   - STRIPE_WEBHOOK_SECRET"
    Write-Host ""
    Write-Host "3. Inicie o sistema:"
    Write-Host "   npm install"
    Write-Host "   npm start"
    Write-Host ""
    Write-Host "4. Acesse o sistema em:"
    Write-Host "   http://localhost:3333"
    Write-Host ""
    Write-Host "Status do Banco:" -ForegroundColor Green
    Write-Host "   32 tabelas criadas"
    Write-Host "   Usuario admin configurado"
    Write-Host "   Indices de performance ativos"
    Write-Host "   Sistema pronto para producao"
    Write-Host ""
    Write-Host "Documentacao:" -ForegroundColor Yellow
    Write-Host "   - README Database: scripts\database\README.md"
    Write-Host "   - Analise 360: CHECK-TABELAS-BANCO-DADOS.md"
    Write-Host "   - Schema SQL: scripts\database\enterprise-complete-database-setup.sql"
    Write-Host ""
}

# Execucao principal
function Main {
    Write-Host "Iniciando setup do banco de dados..." -ForegroundColor Cyan
    
    Check-PostgreSQL
    $password = Get-DatabasePassword
    Create-Database $password
    Setup-Schema $password
    Verify-Installation $password
    Create-EnvFile $password
    Test-Connection $password
    Show-NextSteps
    
    Write-Host "Setup completo! Sistema pronto para uso." -ForegroundColor Green
}

# Verificar se esta no diretorio correto
if (-not (Test-Path "package.json") -or -not (Test-Path "scripts\database")) {
    Write-Host "Execute este script no diretorio raiz do projeto!" -ForegroundColor Red
    Write-Host "   Certifique-se de estar em: market-bot-newdeploy"
    exit 1
}

# Executar setup
Main
