# 📋 REFERÊNCIA RÁPIDA - Setup Database

## ⚡ COMANDO PRINCIPAL
```bash
npm run setup:database
```

## 🔧 PRÉ-REQUISITOS
- ✅ PostgreSQL instalado
- ✅ Node.js 16+
- ✅ npm 8+

## 📊 RESULTADO
- ✅ 31 tabelas criadas
- ✅ 46 índices de performance
- ✅ Usuário admin: `admin / admin123!@#`
- ✅ Arquivo .env configurado
- ✅ Banco: `coinbitclub_enterprise`

## 🛠️ TROUBLESHOOTING RÁPIDO

### PostgreSQL não encontrado:
```bash
# Windows: Baixar do site oficial
# Linux: sudo apt install postgresql
# Mac: brew install postgresql
```

### Erro de permissão:
```bash
# Windows: net start postgresql-x64-14
# Linux: sudo systemctl start postgresql
```

### Script não executa:
```bash
powershell -ExecutionPolicy Bypass -File setup-database.ps1
```

## 🔍 VERIFICAÇÃO
```bash
node verify-actual-schema.js     # Verificar tabelas
node verify-database-indexes.js  # Verificar índices
psql -U coinbitclub_user -d coinbitclub_enterprise  # Testar conexão
```

## 🎯 PRÓXIMOS PASSOS
1. ✅ Configurar APIs no .env
2. ✅ `npm install`
3. ✅ `npm start`
4. ✅ Acessar: http://localhost:3333
