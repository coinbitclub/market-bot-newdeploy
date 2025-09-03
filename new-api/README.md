# 🚀 Market Bot - New API

Ambiente de desenvolvimento local que replica fielmente a infraestrutura de produção do Market Bot, utilizando Docker e Prisma ORM.

## 📋 Pré-requisitos

- Node.js 18+ 
- Docker e Docker Compose
- npm ou yarn

## 🏗️ Estrutura do Projeto

```
new-api/
├── docker-compose.yml          # Infraestrutura Docker
├── init-scripts/
│   └── 01-init-database.sql   # Script de inicialização do banco
├── prisma/
│   ├── schema.prisma          # Schema do Prisma ORM
│   └── seed.ts               # Script de seed
├── generated/
│   └── prisma/               # Cliente Prisma gerado
├── .env                      # Variáveis de ambiente
└── package.json             # Dependências e scripts
```

## 🐳 Infraestrutura Docker

O `docker-compose.yml` inclui:

- **PostgreSQL 15**: Banco de dados principal
- **Redis 7**: Cache e sessões
- **pgAdmin 4**: Interface de administração do banco

### Serviços e Portas

| Serviço   | Porta | Credenciais |
|-----------|-------|-----------|
| PostgreSQL| 5432  | postgres:postgres123 |
| Redis     | 6379  | (sem senha) |
| pgAdmin   | 8080  | admin@marketbot.com:admin123 |

## 🚀 Início Rápido

### 1. Subir a Infraestrutura Docker

```bash
# Subir todos os serviços
docker-compose up -d

# Verificar status
docker-compose ps

# Ver logs
docker-compose logs -f postgres
```

### 2. Instalar Dependências

```bash
npm install
```

### 3. Configurar Banco de Dados

```bash
# Gerar cliente Prisma
npm run db:generate

# Sincronizar schema com o banco
npm run db:push

# Popular com dados de teste
npm run db:seed
```

**Ou usar o comando único:**

```bash
npm run setup
```

### 4. Iniciar Aplicação

```bash
npm start
# ou para desenvolvimento
npm run dev
```

## 🗄️ Estrutura do Banco de Dados

O projeto replica exatamente as **9 tabelas** do sistema de produção:

### 👥 **users**
- Gerenciamento completo de usuários
- Saldos financeiros (real, admin, comissão)
- Chaves API das exchanges
- Configurações de trading

### 📡 **signals** 
- Sinais de trading do TradingView
- Análise de IA integrada
- Configurações de stop loss/take profit

### 📈 **orders**
- Ordens de compra/venda
- Integração com exchanges
- Status de execução

### 🔑 **api_keys**
- Chaves API das exchanges (Binance, Bybit)
- Validação e permissões
- Modo testnet/live

### 💰 **transactions**
- Transações financeiras
- Recargas via Stripe
- Créditos administrativos

### 💼 **commission_records**
- Histórico de comissões
- Comissões de afiliados
- Comissões da empresa

### 🤝 **affiliate_requests**
- Solicitações de afiliação
- Aprovação de afiliados VIP
- Códigos de referência

### 😱 **fear_greed_index**
- Índice Fear & Greed
- Dados de mercado
- Dominância do Bitcoin

### 🏆 **top100_coins**
- Ranking das top 100 criptomoedas
- Preços e variações
- Market cap e volume

## 🌱 Dados de Teste (Seed)

O script de seed cria dados consistentes para desenvolvimento:

### Usuários Criados

| Usuário | Email | Senha | Tipo |
|---------|-------|-------|------|
| admin | admin@marketbot.com | admin123 | Administrador |
| trader_demo | trader@test.com | trader123 | Trader Premium |
| affiliate_vip | affiliate@test.com | affiliate123 | Afiliado VIP |

### Dados Inclusos

- ✅ 3 usuários com perfis diferentes
- ✅ 3 chaves API (Binance/Bybit)
- ✅ 3 sinais de trading (BTC, ETH, BNB)
- ✅ 3 ordens de exemplo
- ✅ 3 transações financeiras
- ✅ 2 registros de comissão
- ✅ 1 solicitação de afiliação
- ✅ 8 registros Fear & Greed (histórico)
- ✅ 5 moedas Top 100 (BTC, ETH, BNB, SOL, ADA)

## 🛠️ Scripts Disponíveis

```bash
# Desenvolvimento
npm start              # Iniciar aplicação
npm run dev           # Modo desenvolvimento (nodemon)

# Banco de Dados
npm run db:generate   # Gerar cliente Prisma
npm run db:push       # Sincronizar schema
npm run db:migrate    # Criar migração
npm run db:seed       # Popular dados de teste
npm run db:reset      # Resetar banco (cuidado!)
npm run db:studio     # Abrir Prisma Studio

# Setup Completo
npm run setup         # Configurar tudo de uma vez
```

## 🔧 Configurações

### Variáveis de Ambiente (.env)

```env
# Database
DATABASE_URL="postgresql://postgres:postgres123@localhost:5432/market_bot_db?schema=public"

# Redis
REDIS_URL="redis://localhost:6379"

# Application
NODE_ENV="development"
PORT=3000

# JWT
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
JWT_EXPIRES_IN="7d"

# API Keys (desenvolvimento)
BINANCE_API_KEY=""
BINANCE_SECRET_KEY=""
BYBIT_API_KEY=""
BYBIT_SECRET_KEY=""
```

## 🎯 Prisma Studio

Para visualizar e editar dados graficamente:

```bash
npm run db:studio
```

Acesse: http://localhost:5555

## 🔍 pgAdmin

Para administração avançada do PostgreSQL:

1. Acesse: http://localhost:8080
2. Login: `admin@marketbot.com` / `admin123`
3. Adicionar servidor:
   - Host: `postgres` (nome do container)
   - Port: `5432`
   - Database: `market_bot_db`
   - Username: `postgres`
   - Password: `postgres123`

## 🧪 Testando a Conexão

Crie um arquivo de teste simples:

```javascript
// test-connection.js
const { PrismaClient } = require('./generated/prisma');

const prisma = new PrismaClient();

async function testConnection() {
  try {
    const users = await prisma.user.findMany();
    console.log('✅ Conexão OK! Usuários encontrados:', users.length);
    
    const signals = await prisma.signal.findMany();
    console.log('✅ Sinais encontrados:', signals.length);
    
    const orders = await prisma.order.findMany();
    console.log('✅ Ordens encontradas:', orders.length);
    
  } catch (error) {
    console.error('❌ Erro de conexão:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();
```

```bash
node test-connection.js
```

## 🚨 Troubleshooting

### Problema: Erro de conexão com PostgreSQL

```bash
# Verificar se o container está rodando
docker-compose ps

# Reiniciar serviços
docker-compose restart postgres

# Ver logs detalhados
docker-compose logs postgres
```

### Problema: Prisma Client não encontrado

```bash
# Regenerar cliente
npm run db:generate
```

### Problema: Tabelas não existem

```bash
# Sincronizar schema
npm run db:push

# Ou criar migração
npm run db:migrate
```

### Problema: Dados de teste ausentes

```bash
# Executar seed novamente
npm run db:seed
```

## 📚 Recursos Úteis

- [Documentação do Prisma](https://www.prisma.io/docs/)
- [Docker Compose Reference](https://docs.docker.com/compose/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Express.js Guide](https://expressjs.com/)

## 🎉 Próximos Passos

Após configurar o ambiente:

1. ✅ Infraestrutura Docker funcionando
2. ✅ Banco de dados sincronizado
3. ✅ Dados de teste populados
4. 🔄 Implementar endpoints da API
5. 🔄 Integrar com exchanges
6. 🔄 Implementar autenticação JWT
7. 🔄 Adicionar testes automatizados

---

**🚀 Ambiente pronto para desenvolvimento!**

Este setup replica fielmente a infraestrutura de produção, permitindo desenvolvimento local seguro e eficiente.

## 📚 Endpoints disponíveis

### Básicos
- `GET /` - Página inicial da API
- `GET /health` - Health check

### API Routes
- `GET /api` - Lista endpoints disponíveis
- `GET /api/users` - Lista todos os usuários
- `GET /api/users/:id` - Busca usuário por ID
- `POST /api/users` - Cria novo usuário
- `PUT /api/users/:id` - Atualiza usuário
- `DELETE /api/users/:id` - Remove usuário

## 📁 Estrutura do projeto

```
new-api/
├── app.js              # Arquivo principal
├── package.json        # Dependências e scripts
├── .env.example        # Exemplo de variáveis de ambiente
├── README.md          # Documentação
├── routes/            # Rotas da API
│   └── api.js         # Rotas principais
└── middleware/        # Middlewares personalizados
    └── auth.js        # Autenticação e validação
```

## 🔧 Middlewares incluídos

- **Helmet**: Segurança HTTP
- **CORS**: Cross-Origin Resource Sharing
- **Morgan**: Logs de requisições
- **Express.json()**: Parse de JSON
- **Express.urlencoded()**: Parse de dados de formulário
- **Rate Limiter**: Limitação de requisições
- **Auth Middleware**: Autenticação simples
- **Validation**: Validação de dados

## 🧪 Testando a API

### Usando curl

```bash
# Health check
curl http://localhost:3000/health

# Listar usuários
curl http://localhost:3000/api/users

# Criar usuário
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"name":"João","email":"joao@email.com"}'
```

### Usando Postman ou Insomnia

Importe as rotas ou teste manualmente os endpoints listados acima.

## 🔒 Autenticação

Para rotas protegidas, inclua o header:
```
Authorization: Bearer valid-token
```

## 📝 Próximos passos

- [ ] Integrar banco de dados (PostgreSQL/MongoDB)
- [ ] Implementar JWT real
- [ ] Adicionar testes unitários
- [ ] Configurar Docker
- [ ] Adicionar documentação Swagger
- [ ] Implementar cache (Redis)

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Push para a branch
5. Abra um Pull Request

## 📄 Licença

ISC License