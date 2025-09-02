# New API - Express.js

API básica construída com Express.js, incluindo middlewares essenciais e estrutura organizada.

## 🚀 Funcionalidades

- ✅ Servidor Express.js configurado
- ✅ Middlewares de segurança (Helmet)
- ✅ CORS habilitado
- ✅ Logs com Morgan
- ✅ Rotas organizadas
- ✅ Middlewares personalizados
- ✅ Tratamento de erros
- ✅ Health check endpoint

## 📦 Instalação

1. Clone o repositório ou navegue até o diretório
2. Instale as dependências:

```bash
npm install
```

3. Configure as variáveis de ambiente:

```bash
cp .env.example .env
```

4. Edite o arquivo `.env` com suas configurações

## 🏃‍♂️ Como executar

### Desenvolvimento
```bash
npm run dev
```

### Produção
```bash
npm start
```

O servidor estará disponível em: `http://localhost:3000`

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