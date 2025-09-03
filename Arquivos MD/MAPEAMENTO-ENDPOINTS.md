# 🔍 MAPEAMENTO COMPLETO DE ENDPOINTS - COINBITCLUB

## 📊 CATEGORIAS DE ENDPOINTS IDENTIFICADAS

### 🔹 BÁSICOS E SAÚDE
- `GET /` - Página inicial
- `GET /health` - Health check do sistema
- `GET /status` - Status geral
- `GET /api/system/status` - Status detalhado do sistema
- `GET /api/current-mode` - Modo atual (produção/management)
- `GET /api/production-mode` - Status do modo produção

### 🔹 DASHBOARD E PAINÉIS
- `GET /dashboard` - Dashboard principal
- `GET /dashboard-production` - Dashboard de produção
- `GET /painel` - Painel executivo
- `GET /painel/executivo` - Painel executivo
- `GET /painel/fluxo` - Painel de fluxo
- `GET /painel/decisoes` - Painel de decisões
- `GET /painel/usuarios` - Painel de usuários
- `GET /painel/alertas` - Painel de alertas
- `GET /painel/diagnosticos` - Painel de diagnósticos

### 🔹 APIs DO DASHBOARD
- `GET /api/dashboard/summary` - Resumo do dashboard
- `GET /api/dashboard/realtime` - Dados em tempo real
- `GET /api/dashboard/signals` - Sinais de trading
- `GET /api/dashboard/orders` - Ordens de execução
- `GET /api/dashboard/users` - Performance dos usuários
- `GET /api/dashboard/balances` - Saldos reais
- `GET /api/dashboard/admin-logs` - Logs administrativos
- `GET /api/dashboard/ai-analysis` - Análise de IA

### 🔹 PAINEL EXECUTIVO (APIs)
- `GET /api/painel/executivo` - Dados executivos
- `GET /api/painel/fluxo` - Dados de fluxo
- `GET /api/painel/decisoes` - Dados de decisões
- `GET /api/painel/usuarios` - Dados de usuários
- `GET /api/painel/alertas` - Dados de alertas
- `GET /api/painel/diagnosticos` - Dados de diagnósticos
- `GET /api/painel/realtime` - Status tempo real
- `GET /api/painel/dados` - Dados adaptativos

### 🔹 WEBHOOKS E SINAIS
- `POST /webhook` - Webhook principal
- `POST /api/webhooks/signal` - Webhook de sinais
- `GET /webhook` - Info sobre webhook
- `GET /api/signals` - Lista de sinais
- `GET /api/trading/status` - Status do trading

### 🔹 TRADING E EXECUÇÃO
- `POST /api/trade/execute` - Executar trade
- `POST /api/trade/execute-all` - Executar todos os trades
- `POST /api/trade/validate` - Validar trade
- `GET /api/trade/status` - Status do trading
- `GET /api/trade/balances` - Saldos de trading
- `GET /api/trade/connections` - Conexões de trading
- `GET /api/trade/connection/:userId/:exchange/:environment` - Conexão específica
- `GET /api/executors/status` - Status dos executores
- `POST /api/executors/trade` - Executor de trade

### 🔹 EXCHANGES E CONEXÕES
- `GET /api/exchanges/status` - Status das exchanges
- `POST /api/exchanges/connect-user` - Conectar usuário à exchange
- `GET /api/exchanges/health` - Saúde das exchanges
- `GET /api/exchanges/balances` - Saldos das exchanges

### 🔹 VALIDAÇÃO E MONITORAMENTO
- `GET /api/validation/status` - Status de validação
- `POST /api/validation/run` - Executar validação
- `GET /api/validation/connections` - Conexões de validação
- `POST /api/validation/revalidate` - Revalidar
- `GET /api/monitor/status` - Status do monitor
- `POST /api/monitor/check` - Verificação do monitor
- `GET /api/systems/status` - Status dos sistemas

### 🔹 USUÁRIOS E GESTÃO
- `GET /api/users` - Lista de usuários
- `GET /api/user/:userId/balances` - Saldos do usuário
- `POST /api/register` - Registro de usuário
- `POST /api/login` - Login de usuário
- `GET /api/positions` - Posições dos usuários

### 🔹 FINANCEIRO E PAGAMENTOS
- `POST /api/stripe/recharge` - Recarga via Stripe
- `POST /api/admin/create-coupon` - Criar cupom
- `POST /api/user/use-coupon` - Usar cupom
- `POST /api/user/request-withdrawal` - Solicitar saque
- `POST /api/affiliate/convert-commission` - Converter comissão
- `GET /api/admin/financial-summary` - Resumo financeiro
- `GET /api/admin/generate-coupon-code` - Gerar código de cupom
- `GET /api/financial/summary` - Resumo financeiro
- `GET /api/balance` - Saldos gerais

### 🔹 COMISSÕES E AFILIADOS
- `POST /validate-position` - Validar posição
- `POST /calculate-commission` - Calcular comissão
- `GET /commission-plans` - Planos de comissão

### 🔹 DIAGNÓSTICOS E TESTES
- `GET /api/ip-diagnostic` - Diagnóstico de IP
- `POST /api/test/constraint-error` - Teste de erro de constraint
- `POST /api/test/api-key-error` - Teste de erro de API key
- `GET /api/error-handling/status` - Status de tratamento de erros
- `GET /api/test-connection` - Teste de conexão

### 🔹 MERCADO E DADOS
- `GET /api/market/data` - Dados de mercado
- `GET /api/dominance` - Dominância do Bitcoin

### 🔹 SALDOS E COLETA
- `GET /api/demo/saldos` - Demo de saldos
- `POST /api/saldos/coletar-real` - Coletar saldos reais
- `GET /demo-saldos` - Página demo de saldos

### 🔹 ATIVAÇÃO E CONFIGURAÇÃO
- `GET /ativar-chaves-reais` - Ativar chaves reais
- `GET /fix-database` - Corrigir banco de dados

## 📊 ESTATÍSTICAS DO MAPEAMENTO

**Total de Endpoints Identificados**: 85+

### Por Categoria:
- **Básicos**: 6 endpoints
- **Dashboard**: 15+ endpoints
- **Trading**: 12+ endpoints
- **Exchanges**: 4 endpoints
- **Validação**: 8+ endpoints
- **Usuários**: 5 endpoints
- **Financeiro**: 8+ endpoints
- **Diagnósticos**: 5+ endpoints
- **Webhooks**: 3 endpoints
- **Mercado**: 2 endpoints
- **Outros**: 15+ endpoints

### Por Método HTTP:
- **GET**: ~70% dos endpoints
- **POST**: ~30% dos endpoints
- **PUT/DELETE**: Poucos endpoints

## 🎯 ENDPOINTS CRÍTICOS PARA TESTE

### Alta Prioridade:
1. `/health` - Saúde do sistema
2. `/api/system/status` - Status do sistema
3. `/api/current-mode` - Modo atual
4. `/` - Página inicial
5. `POST /webhook` - Webhook principal

### Média Prioridade:
1. `/api/dashboard/summary` - Dashboard
2. `/api/exchanges/status` - Status exchanges
3. `/api/validation/status` - Validação
4. `/api/trading/status` - Trading

### Baixa Prioridade:
1. Endpoints de teste
2. Endpoints demo
3. Endpoints administrativos específicos
