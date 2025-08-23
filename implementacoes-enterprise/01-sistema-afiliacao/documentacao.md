# 🤝 SISTEMA DE AFILIAÇÃO - ANÁLISE E IMPLEMENTAÇÃO

## 📋 **ANÁLISE DO SISTEMA EXISTENTE**

### ✅ **O QUE JÁ EXISTE:**

1. **Estrutura de Banco:**
   - Tabela `users` com campos `affiliate_code`, `affiliate_type`, `affiliate_id`
   - Tabela `commission_records` para histórico de comissões
   - Colunas de saldo separadas: `balance_commission_brl/usd`
   - Sistema de cálculo de comissões implementado

2. **Códigos de Afiliado:**
   - Geração automática: formato `CBC + 3 letras + 4 números`
   - Códigos únicos garantidos
   - Sistema de links personalizados

3. **Estrutura de Comissões:**
   - **AFFILIATE_NORMAL**: 1.5% da comissão da empresa (aprovação automática)
   - **AFFILIATE_VIP**: 5% da comissão da empresa (apenas admin nomeia)
   - Conversão BRL/USD implementada
   - Cálculo baseado no plano do usuário (com/sem assinatura)

4. **APIs Básicas:**
   - `/api/affiliate/:code/links` - Obter links de afiliado
   - `/api/affiliate/create` - Criar afiliado (admin)
   - Sistema de vinculação manual (até 48h após cadastro)

### ❌ **O QUE FALTA IMPLEMENTAR:**

1. **Solicitação Automática pelo Usuário**
   - Interface para usuário solicitar ser afiliado
   - **Aprovação automática para AFFILIATE_NORMAL**
   - Ativação imediata do sistema de afiliação
   - Notificações de confirmação

2. **Sistema de Nomeação VIP (Admin Exclusivo)**
   - Dashboard admin para nomear afiliados VIP
   - Interface exclusiva para administradores
   - Processo manual com justificativa
   - Log de todas as nomeações VIP

3. **Conversão de Comissões**
   - Interface para usuário converter comissões em créditos (+10% bônus)
   - Escolha entre saque ou conversão automática
   - Histórico de conversões

4. **Dashboard de Afiliados Completo**
   - Métricas em tempo real
   - Gestão de indicados
   - Performance analytics

## 🎯 **IMPLEMENTAÇÕES NECESSÁRIAS**

### 1. **Banco de Dados - Novas Tabelas**

```sql
-- Tabela de solicitações de afiliação
CREATE TABLE affiliate_requests (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    requested_level VARCHAR(20) NOT NULL DEFAULT 'normal', -- 'normal' ou 'vip'
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    reason TEXT, -- Motivo da solicitação
    admin_notes TEXT, -- Notas do administrador
    processed_by_admin_id INTEGER REFERENCES users(id),
    requested_at TIMESTAMP DEFAULT NOW(),
    processed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de conversões de comissão
CREATE TABLE commission_conversions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    commission_amount DECIMAL(15,2) NOT NULL,
    bonus_amount DECIMAL(15,2) NOT NULL, -- 10% bônus
    total_credit DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    conversion_rate DECIMAL(8,4) DEFAULT 1.0, -- Para conversões USD/BRL
    converted_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de preferências de afiliado
CREATE TABLE affiliate_preferences (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) UNIQUE,
    auto_convert_commissions BOOLEAN DEFAULT false,
    conversion_threshold DECIMAL(15,2) DEFAULT 0.00,
    preferred_currency VARCHAR(3) DEFAULT 'BRL',
    notification_email BOOLEAN DEFAULT true,
    notification_whatsapp BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### 2. **APIs Necessárias**

- `POST /api/affiliate/request` - Solicitar ser afiliado
- `GET /api/affiliate/requests` - Listar solicitações (admin)
- `PUT /api/affiliate/request/:id/approve` - Aprovar solicitação
- `PUT /api/affiliate/request/:id/reject` - Rejeitar solicitação
- `POST /api/affiliate/convert-commissions` - Converter comissões
- `GET /api/affiliate/dashboard` - Dashboard do afiliado
- `PUT /api/affiliate/preferences` - Atualizar preferências

### 3. **Componentes Frontend**

- `AffiliateRequestForm` - Formulário de solicitação
- `AffiliateRequestManagement` - Painel admin para aprovar
- `CommissionConverter` - Interface de conversão
- `AffiliateDashboard` - Dashboard completo
- `AffiliatePreferences` - Configurações

---

## 🔧 **ESPECIFICAÇÕES DETALHADAS**

### **Solicitação de Afiliação:**
1. Usuário acessa formulário de solicitação
2. Preenche motivo e nível desejado (apenas normal disponível)
3. Sistema valida: não pode já ser afiliado
4. Cria registro em `affiliate_requests`
5. Notifica administradores

### **Aprovação:**
1. Admin vê lista de solicitações pendentes
2. Pode aprovar/rejeitar com notas
3. Aprovação cria código de afiliado
4. Atualiza `users.affiliate_type`
5. Notifica usuário

### **Conversão de Comissões:**
1. Usuário vê saldo de comissões
2. Pode escolher converter com +10% bônus
3. Sistema converte para créditos operacionais
4. Registra em `commission_conversions`
5. Atualiza saldos do usuário

---

## 📊 **MÉTRICAS E RELATÓRIOS**

- Total de afiliados ativos
- Solicitações pendentes
- Conversões de comissão por período
- Performance de indicações
- Comissões pagas por afiliado

---

## 🚀 **CRONOGRAMA DE IMPLEMENTAÇÃO**

### **Fase 1 - Database Schema (1 dia)**
- Criar novas tabelas
- Migrar dados existentes
- Testes de integridade

### **Fase 2 - APIs Backend (2 dias)**
- Implementar endpoints
- Validações e regras de negócio
- Testes unitários

### **Fase 3 - Frontend (2 dias)**
- Componentes de interface
- Integração com APIs
- Testes de usabilidade

### **Fase 4 - Integração e Testes (1 dia)**
- Testes end-to-end
- Validação com dados reais
- Deploy em produção

---

**Total estimado: 6 dias de desenvolvimento**
