# 🎯 ESPECIFICAÇÃO FRONTEND ENTERPRISE - COINBITCLUB v6.0.0
## Versão Atualizada com Base na Análise Completa dos Sistemas

---

## 📋 **ÍNDICE**
1. [Visão Geral e Contexto](#1-visão-geral-e-contexto)
2. [Sistema Financeiro Enterprise](#2-sistema-financeiro-enterprise)
3. [Perfis e Planos Reais](#3-perfis-e-planos-reais)
4. [Autenticação e Segurança](#4-autenticação-e-segurança)
5. [Dashboard por Perfil](#5-dashboard-por-perfil)
6. [Sistema de IA e Águia News](#6-sistema-de-ia-e-águia-news)
7. [Timeline Animada de Operações](#7-timeline-animada-de-operações)
8. [Componentes Enterprise](#8-componentes-enterprise)
9. [Integrações e Endpoints](#9-integrações-e-endpoints)
10. [Design System e UI/UX](#10-design-system-e-uiux)
11. [Critérios de Entrega](#11-critérios-de-entrega)

---

## 1. VISÃO GERAL E CONTEXTO

### 1.1. Contexto Atualizado
- **Plataforma**: Trading Bot com IA para contratos perpétuos
- **Backend**: v6.0.0 - 100% Operacional (Railway)
- **Database**: PostgreSQL com 7 tabelas enterprise
- **Deploy Frontend**: Vercel
- **Stack**: React/Next.js + TypeScript + Tailwind CSS + Shadcn/UI
- **Integrações Reais**: Stripe, Twilio, OpenAI, Binance, Bybit

### 1.2. Perfis Reais do Sistema
**Baseado na análise real do banco de dados:**

```typescript
interface UserProfile {
  // 6 Perfis Reais Mapeados
  profileType: 'basic' | 'premium' | 'enterprise' | 'affiliate_normal' | 'affiliate_vip' | 'admin';
  
  // Limites por Perfil (valores reais)
  limits: {
    dailyWithdraw: number;    // R$ 1.000 a R$ 100.000
    maxOperation: number;     // R$ 500 a R$ 50.000
    simultaneousTrades: number; // 2 a 20
  };
  
  // Features habilitadas
  enabledFeatures: string[]; // ['trading', 'analytics', 'reports', 'admin']
  
  // Dados obrigatórios por perfil
  requiredFields: string[];  // ['nome_completo', 'whatsapp', 'cpf', 'banco']
}
```

### 1.3. Sistema de Idiomas Enterprise
```typescript
interface LanguageConfig {
  locale: 'pt-BR' | 'en-US';
  country: string;
  currency: 'BRL' | 'USD';
  timezone: 'America/Sao_Paulo' | 'UTC';
  
  // Detecção automática baseada no país
  autoDetection: {
    brasil: { locale: 'pt-BR', currency: 'BRL' };
    outros: { locale: 'en-US', currency: 'USD' };
  };
}
```

---

## 2. SISTEMA FINANCEIRO ENTERPRISE

### 2.1. Tipos de Saldo (4 Categorias Reais)

**Baseado na análise completa do sistema financeiro:**

```typescript
interface EnterpriseBalances {
  // 🟢 SALDO REAL (Stripe)
  realBalance: {
    amount: number;
    source: 'stripe_payment';
    canWithdraw: true;
    description: 'Pagamentos via Stripe após desconto de comissão';
  };
  
  // 🟡 SALDO ADMINISTRATIVO (Cupons)
  adminBalance: {
    amount: number;
    source: 'admin_coupon';
    canWithdraw: false;
    expiresAt: string; // 30 dias
    description: 'Cupons promocionais criados pelo admin';
  };
  
  // 🔴 SALDO COMISSÃO (Afiliados)
  commissionBalance: {
    amount: number;
    source: 'affiliate_commission';
    canWithdraw: false;
    canConvert: true;
    conversionBonus: 0.10; // +10% bonus
    description: 'Comissões sobre lucro de usuários indicados';
  };
  
  // 🔵 SALDO PRÉ-PAGO (Recargas)
  prePaidBalance: {
    amount: number;
    source: 'stripe_recharge';
    discountTier: 'bronze' | 'prata' | 'ouro';
    discountRate: number; // 5%, 10%, 15%
    description: 'Recargas com desconto automático por volume';
  };
}
```

### 2.2. Planos Enterprise Reais
**Valores corretos conforme backend:**

```typescript
interface EnterprisePlans {
  // 🇧🇷 BRASIL PRO
  brasil_pro: {
    monthlyPrice: 29700; // R$ 297,00 (centavos)
    currency: 'BRL';
    commissionRate: 10; // 10% sobre lucros
    stripeProductId: 'prod_brasil_pro';
    features: ['trading_full', 'suporte_premium', 'relatorios'];
  };
  
  // 🇧🇷 BRASIL FLEX
  brasil_flex: {
    monthlyPrice: 0;
    currency: 'BRL';
    commissionRate: 20; // 20% sobre lucros
    type: 'commission_only';
    features: ['trading_basico', 'suporte_padrao'];
  };
  
  // 🌍 GLOBAL PRO
  global_pro: {
    monthlyPrice: 5000; // $50,00 (centavos)
    currency: 'USD';
    commissionRate: 10;
    stripeProductId: 'prod_global_pro';
    features: ['trading_full', 'suporte_premium', 'relatorios'];
  };
  
  // 🌍 GLOBAL FLEX
  global_flex: {
    monthlyPrice: 0;
    currency: 'USD';
    commissionRate: 20;
    type: 'commission_only';
    features: ['trading_basico', 'suporte_padrao'];
  };
}
```

### 2.3. Sistema de Comissionamento Real
```typescript
interface CommissionSystem {
  // Comissão por tipo de plano
  planCommission: {
    monthly: 0.10;    // 10% (PRO)
    prepaid: 0.20;    // 20% (FLEX)
  };
  
  // Comissão de afiliados
  affiliateCommission: {
    normal: 0.015;    // 1.5% da comissão da empresa
    vip: 0.05;        // 5.0% da comissão da empresa
  };
  
  // Exemplo prático real
  example: {
    userProfit: 1000; // R$ 1.000 de lucro
    planType: 'monthly'; // Plano PRO
    affiliateType: 'normal';
    
    calculation: {
      totalCommission: 100;  // 10% de R$ 1.000
      companyKeeps: 85;      // 8.5%
      affiliateReceives: 15; // 1.5%
    };
  };
}
```

### 2.4. Valores Mínimos Reais
```typescript
const MINIMUM_VALUES = {
  brasil: {
    prepaid: 10000,      // R$ 100,00 (centavos)
    adminCoupon: 20000,  // R$ 200,00
  },
  exterior: {
    prepaid: 2000,       // $20,00 (centavos)
    adminCoupon: 3500,   // $35,00
  }
} as const;
```

---

## 3. PERFIS E PLANOS REAIS

### 3.1. Mapeamento Completo dos 6 Perfis

**Baseado na tabela `user_profiles_enterprise`:**

```typescript
// Perfil BASIC
interface BasicProfile {
  code: 'basic';
  limits: {
    dailyWithdraw: 100000;    // R$ 1.000 (centavos)
    maxOperation: 50000;      // R$ 500
    simultaneousTrades: 2;
  };
  requiredFields: ['nome_completo', 'whatsapp', 'pais'];
  features: ['trading', 'operations', 'profile'];
}

// Perfil PREMIUM
interface PremiumProfile {
  code: 'premium';
  limits: {
    dailyWithdraw: 500000;    // R$ 5.000
    maxOperation: 200000;     // R$ 2.000
    simultaneousTrades: 5;
  };
  requiredFields: ['nome_completo', 'whatsapp', 'pais', 'cpf'];
  features: ['trading', 'operations', 'profile', 'analytics', 'reports'];
}

// Perfil ENTERPRISE
interface EnterpriseProfile {
  code: 'enterprise';
  limits: {
    dailyWithdraw: 5000000;   // R$ 50.000
    maxOperation: 2000000;    // R$ 20.000
    simultaneousTrades: 10;
  };
  requiredFields: ['nome_completo', 'whatsapp', 'pais', 'cpf', 'banco', 'conta'];
  features: ['trading', 'operations', 'profile', 'analytics', 'reports', 'admin', 'compliance'];
}

// Perfil AFFILIATE_NORMAL
interface AffiliateNormalProfile {
  code: 'affiliate_normal';
  commissionRate: 0.015; // 1.5%
  limits: {
    dailyWithdraw: 200000;    // R$ 2.000
    maxOperation: 100000;     // R$ 1.000
    simultaneousTrades: 3;
  };
  requiredFields: ['nome_completo', 'whatsapp', 'pais', 'cpf', 'chave_pix'];
  features: ['trading', 'operations', 'profile', 'affiliate', 'commissions'];
}

// Perfil AFFILIATE_VIP
interface AffiliateVipProfile {
  code: 'affiliate_vip';
  commissionRate: 0.05; // 5.0%
  limits: {
    dailyWithdraw: 1000000;   // R$ 10.000
    maxOperation: 500000;     // R$ 5.000
    simultaneousTrades: 7;
  };
  requiredFields: ['nome_completo', 'whatsapp', 'pais', 'cpf', 'banco', 'conta'];
  features: ['trading', 'operations', 'profile', 'affiliate', 'commissions', 'vip-tools'];
}

// Perfil ADMIN
interface AdminProfile {
  code: 'admin';
  limits: {
    dailyWithdraw: 10000000;  // R$ 100.000
    maxOperation: 5000000;    // R$ 50.000
    simultaneousTrades: 20;
  };
  requiredFields: ['nome_completo', 'whatsapp'];
  features: ['*']; // Acesso total
}
```

### 3.2. Sistema de Migração de Perfis
```typescript
interface ProfileMigrations {
  allowed: [
    {
      from: 'basic';
      to: 'premium';
      requiredApproval: false;
      additionalRequirements: ['cpf'];
    },
    {
      from: 'premium';
      to: 'enterprise';
      requiredApproval: true;
      additionalRequirements: ['banco', 'conta', 'validacao_compliance'];
    },
    {
      from: 'affiliate_normal';
      to: 'affiliate_vip';
      requiredApproval: true;
      additionalRequirements: ['min_10_referrals', 'min_monthly_volume_5000'];
    }
  ];
}
```

---

## 4. AUTENTICAÇÃO E SEGURANÇA

### 4.1. Login e Cadastro Enterprise
```typescript
interface AuthFlow {
  // Estrutura de dados do sistema real
  user: {
    id: string;
    email: string;
    name: string;
    whatsapp: string;
    country: string;
    profileType: UserProfile['code'];
    isValidated: boolean;
    hasFinancialData: boolean;
  };
  
  // Componentes obrigatórios
  components: {
    LoginForm: 'E-mail, senha, "Esqueci minha senha"';
    RegisterForm: 'Nome completo, WhatsApp, País, E-mail, Senha + OTP WhatsApp';
    RecoveryForm: 'Fluxo via WhatsApp com código OTP (4-6 dígitos)';
    PolicyAcceptance: 'Modal de aceite obrigatório para login/cadastro';
  };
}
```

### 4.2. Sistema de Aceite de Políticas
```typescript
interface PolicyManager {
  structure: {
    id: string;
    type: 'terms' | 'privacy';
    version: string;
    content: string;
    effectiveDate: string;
    isActive: boolean;
  };
  
  userAcceptance: {
    userId: string;
    policyId: string;
    acceptedAt: string;
    ipAddress: string;
    userAgent: string;
    version: string;
  };
  
  behavior: {
    newUser: 'Aceite obrigatório no cadastro';
    existingUser: 'Verificação a cada login se há nova versão';
    modalBlocking: 'Não permite acesso sem aceite';
    auditLog: 'Registra aceite com timestamp e IP';
  };
}
```

### 4.3. Integração Twilio SMS Real
```typescript
interface TwilioIntegration {
  templates: {
    basic: 'Bem-vindo ao CoinBitClub! Código: {code}';
    premium: '🎯 Bem-vindo Premium! Seu código: {code}';
    enterprise: '🏢 Cadastro Enterprise. Código: {code}';
    affiliate_normal: '🤝 Bem-vindo Afiliado! Código: {code}';
    affiliate_vip: '💎 Bem-vindo Afiliado VIP! Código: {code}';
    admin: '👑 Acesso Admin. Código: {code}';
  };
}
```

---

## 5. DASHBOARD POR PERFIL

### 5.1. Dashboard Usuário (BASIC/PREMIUM/ENTERPRISE)

**Componente**: `UserDashboard`

```typescript
interface UserDashboardProps {
  // KPIs em Tempo Real
  metrics: {
    winRate: number;                    // % de acerto (badge dinâmica)
    dailyReturn: number;                // Retorno do dia
    historicalReturn: number;           // Retorno histórico
    currentPlan: EnterprisePlan;        // Plano ativo
    nextCharge: string;                 // Próxima cobrança
  };
  
  // Saldos Separados (4 tipos)
  balances: EnterpriseBalances;
  
  // Seção Águia News
  eagleNews: {
    marketStatus: 'Bull' | 'Bear' | 'Neutro';
    lastDecision: {
      timestamp: string;
      justification: string;
      confidence: number; // 0-100%
    };
    nextReports: string[];
    alertsEnabled: boolean;
  };
  
  // Timeline de Operações (Diferencial)
  operationsTimeline: OperationStep[];
}
```

**Features Específicas:**
- **Timeline Animada**: Atualização a cada 30s
- **Saldos Dinâmicos**: 4 cards separados por tipo
- **Alertas de Saldo**: Notificação quando insuficiente
- **Upgrade de Plano**: Botão dinâmico conforme perfil

### 5.2. Dashboard Afiliado (AFFILIATE_NORMAL/AFFILIATE_VIP)

**Componente**: `AffiliateDashboard`

```typescript
interface AffiliateDashboardProps {
  // Herda tudo do UserDashboard +
  affiliateData: {
    level: 'normal' | 'vip';
    commissionRate: number;           // 1.5% ou 5.0%
    referralCode: string;
    referralLink: string;
    
    // Métricas específicas
    monthlyCommissions: number;
    totalCommissions: number;
    referredUsers: ReferredUser[];
    conversionRate: number;
    
    // Ações disponíveis
    actions: {
      requestWithdraw: boolean;
      convertToCredit: boolean;
      linkNewUser: boolean;          // até 48h
    };
  };
  
  // Replay de Operações dos Indicados
  operationsReplay: {
    referredUserId: string;
    operations: OperationStep[];
    readonly: true;                   // Só visualização
  };
}
```

**Features Específicas:**
- **QR Code**: Para compartilhamento do link
- **Gestão de Prazos**: Alertas automáticos (60, 90, 150+ dias)
- **Replay Timeline**: Operações dos indicados (só leitura)

### 5.3. Dashboard Admin (ADMIN)

**Componente**: `AdminDashboard`

```typescript
interface AdminDashboardProps {
  // Healthcheck de Microserviços
  systemHealth: {
    agents: SystemAgent[];
    uptime: number;
    eventQueue: number;
    anomalyAlerts: Alert[];
  };
  
  // KPIs Globais
  globalMetrics: {
    totalUsers: number;
    totalOperations: number;
    globalBalance: number;
    successRate: number;
    failureRate: number;
    riskLogs: RiskLog[];
  };
  
  // Controles de Emergência
  emergencyControls: {
    closeAllOperations: () => void;   // Modal obrigatório
    pauseByExchange: (exchange: string) => void;
    reprocessFailures: () => void;
  };
  
  // Gestão Enterprise
  management: {
    users: UserManagement;
    affiliates: AffiliateManagement;
    coupons: CouponManagement;
    financialReports: FinancialReports;
    systemConfig: SystemConfig;
    auditLogs: AuditLog[];
  };
}
```

**Features Específicas:**
- **Controles Críticos**: Confirmação dupla + senha
- **Gestão de Cupons**: CRUD completo
- **Relatórios Financeiros**: Receita vs Despesas
- **Conciliação Stripe**: Processamento automático (dias 5 e 20)

---

## 6. SISTEMA DE IA E ÁGUIA NEWS

### 6.1. Status da IA (Admin)
**Componente**: `AIStatusMonitor` - **RESTRITO: Apenas admins**

```typescript
interface AIStatusProps {
  // Métricas em Tempo Real
  realTimeMetrics: {
    aiStatus: 'Online' | 'Offline' | 'Processando';
    fearGreedIndex: number;           // 0-100
    btcDominance: number;             // % atual
    allowedDirection: 'LONG' | 'SHORT' | 'AMBOS';
  };
  
  // Última Decisão IA
  lastDecision: {
    timestamp: string;
    technicalSummary: string;
    confidence: number;               // 0-100%
    marketConditions: {
      fearGreed: number;
      top100Rising: number;          // % em alta
      btcDominance: number;
      signalType: 'NORMAL' | 'FORTE';
    };
  };
  
  // Configuração OpenAI Real
  openAIConfig: {
    model: 'GPT-4o-mini' | 'GPT-3.5-turbo';
    temperature: number;              // 0.1-0.3
    maxTokens: number;                // 100-300
    timeout: number;                  // 15-20s
  };
}
```

### 6.2. Histórico de Sinais (Admin)
**Componente**: `SignalHistory` - **RESTRITO: Apenas admins**

```typescript
interface SignalHistoryProps {
  signals: {
    timestamp: string;
    source: 'TradingView';
    ticker: string;
    type: 'LONG' | 'SHORT';
    strength: 'NORMAL' | 'FORTE';
    
    // Processamento
    aiDecision: 'EXECUTAR' | 'REJEITAR';
    justification: string;
    operationsGenerated: number;
    performance: {
      success: boolean;
      pnl: number;
      duration: number;
    };
  }[];
  
  // Filtros
  filters: {
    timeRange: string;
    signalType: string;
    performance: 'all' | 'successful' | 'failed';
  };
}
```

### 6.3. Relatórios Águia News (Todos os Perfis)
**Componente**: `EagleNewsReports` - **PÚBLICO: Todos os usuários**

```typescript
interface EagleNewsProps {
  // Horários Dinâmicos (com horário de verão)
  schedule: {
    weekdays: {
      asian: { open: string; close: string };
      american: { open: string; close: string };
    };
    weekends: string[]; // ['09:00', '17:00']
    timezone: 'America/Sao_Paulo';
    isDaylightSaving: boolean;
    autoAdjust: boolean;
  };
  
  // Conteúdo dos Relatórios
  content: {
    marketAnalysis: string;
    riskFactors: string[];
    aiRecommendations: string[];
    macroEvents: string[];
    lastUpdated: string;
  };
  
  // Disponibilidade
  availability: ['dashboard_user', 'dashboard_affiliate', 'dashboard_admin'];
}
```

---

## 7. TIMELINE ANIMADA DE OPERAÇÕES

### 7.1. Componente Diferencial
**Componente**: `OperationTimeline` - **INOVAÇÃO PRINCIPAL**

```typescript
interface OperationTimelineProps {
  // Fluxo Completo Real
  steps: [
    'Sinal Recebido',
    'Validação F&G',
    'Configuração',
    'Validações/Regras',
    'Execução',
    'Monitoramento',
    'Fechamento',
    'Comissão',
    'Métricas'
  ];
  
  // Animação em Tempo Real
  animation: {
    updateInterval: 30000;            // 30s
    activeStepAnimation: 'pulse/glow';
    progressBar: 'smooth_fill';
    stepTransition: 'slide/fade';
    eventLog: 'fade-in/fade-out';
  };
  
  // Interatividade
  interactive: {
    tooltipDetails: boolean;
    replayMode: boolean;              // Para afiliado/admin
    manualRefresh: boolean;
    mobileAdaptive: 'vertical_timeline';
    accessibility: 'color_and_text';
  };
  
  // Estados visuais
  stepStatus: {
    pending: 'gray_icon';
    active: 'animated_glow';
    completed: 'green_check';
    failed: 'red_error';
  };
}
```

### 7.2. Implementação Mobile-First
```css
/* Timeline Responsiva */
.operation-timeline {
  @apply flex flex-col gap-4;
  
  @screen md {
    @apply flex-row;
  }
}

.timeline-step {
  @apply relative p-4 rounded-lg border;
  
  /* Estados visuais */
  &.active {
    @apply border-yellow-400 shadow-lg;
    box-shadow: 0 0 20px rgba(255, 215, 0, 0.5);
    animation: pulse 2s infinite;
  }
  
  &.completed {
    @apply border-green-400 bg-green-900/20;
  }
  
  &.failed {
    @apply border-red-400 bg-red-900/20;
  }
}
```

### 7.3. Mini-Log de Eventos
```typescript
interface EventLog {
  events: {
    timestamp: string;
    type: 'info' | 'success' | 'warning' | 'error';
    message: string;
    details?: any;
  }[];
  
  // Animação de eventos
  animation: {
    newEvent: 'fade-in-top';
    removeEvent: 'fade-out-bottom';
    maxVisible: 5;
    autoHide: 10000; // 10s
  };
}
```

---

## 8. COMPONENTES ENTERPRISE

### 8.1. Sistema de Design Premium
```typescript
const enterpriseDesign = {
  colors: {
    // Base
    background: '#000000',
    surface: '#1a1a1a',
    
    // Primary (inspirado na landing)
    primary: {
      gold: '#FFD700',
      pink: '#FF69B4',
      blue: '#00BFFF'
    },
    
    // Gradientes especiais
    gradient: {
      marketbot: 'linear-gradient(45deg, #FF6B35, #F7931E, #FF69B4, #9B59B6)',
      card: 'linear-gradient(135deg, rgba(255, 215, 0, 0.1), rgba(255, 105, 180, 0.1))',
      button: 'linear-gradient(45deg, #FFD700, #FF69B4)'
    },
    
    // Estados
    status: {
      success: '#00FF88',
      warning: '#FFB800',
      error: '#FF4757',
      info: '#3742FA'
    },
    
    // Efeitos neon
    neon: {
      goldGlow: '0 0 20px rgba(255, 215, 0, 0.5)',
      pinkGlow: '0 0 20px rgba(255, 105, 180, 0.5)',
      blueGlow: '0 0 20px rgba(0, 191, 255, 0.5)'
    }
  },
  
  // Componentes base
  components: {
    Card: 'Container com bordas neon e gradientes',
    Button: 'Variações primary, secondary, danger com hover effects',
    DataTable: 'Tabela responsiva com paginação e filtros',
    ChartCard: 'Container para gráficos com cabeçalho customizável',
    StatusBadge: 'Badge com cores dinâmicas baseadas em status',
    LoadingSpinner: 'Spinner customizado com efeito neon',
    Modal: 'Modal responsivo com backdrop blur'
  }
} as const;
```

### 8.2. Componentes Específicos Enterprise

**Gestão de Saldos:**
```typescript
const BalanceCard = ({ balance, type }: BalanceCardProps) => (
  <Card className="gradient-border">
    <div className="flex items-center gap-3">
      <BalanceIcon type={type} />
      <div>
        <h3 className="text-lg font-semibold text-white">
          {formatCurrency(balance.amount, balance.currency)}
        </h3>
        <p className="text-sm text-gray-400">{balance.description}</p>
        {balance.canWithdraw && (
          <Button variant="outline" size="sm" className="mt-2">
            Sacar
          </Button>
        )}
      </div>
    </div>
  </Card>
);
```

**Selector de Planos:**
```typescript
const PlanSelector = ({ currentPlan, availablePlans }: PlanSelectorProps) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
    {availablePlans.map(plan => (
      <PlanCard 
        key={plan.code}
        plan={plan}
        isCurrent={currentPlan?.code === plan.code}
        onSelect={() => handlePlanSelect(plan)}
      />
    ))}
  </div>
);
```

### 8.3. Gestão de API Keys
```typescript
interface APIKeyManager {
  // Validações por ambiente
  validation: {
    testnet: {
      duration: 7;                    // 7 dias para contas gratuitas
      autoCleanup: true;              // Limpeza no 8º dia
    };
    production: {
      requiresBalance: true;          // Ou assinatura ativa
      maxKeysPerExchange: 2;          // Binance/Bybit
    };
  };
  
  // Interface de gestão
  interface: {
    maskedDisplay: true;              // Nunca exibe secret
    secureOnboarding: true;
    permissionAlerts: true;
    configurationChecks: true;
  };
}
```

---

## 9. INTEGRAÇÕES E ENDPOINTS

### 9.1. Endpoints Enterprise Reais
**Baseado na análise completa dos 95+ endpoints:**

```typescript
// Autenticação Enterprise
interface AuthEndpoints {
  'POST /api/enterprise/register': 'Registro completo';
  'POST /api/enterprise/verify-sms': 'Verificar SMS Twilio';
  'GET /api/enterprise/profile': 'Obter perfil atual';
  'PUT /api/enterprise/profile': 'Atualizar perfil';
}

// Sistema Financeiro
interface FinancialEndpoints {
  'GET /api/enterprise/plans': 'Listar 4 planos disponíveis';
  'POST /api/enterprise/subscribe': 'Criar assinatura Stripe';
  'GET /api/enterprise/subscription': 'Status da assinatura';
  'DELETE /api/enterprise/subscription': 'Cancelar assinatura';
  'GET /api/user/balances': '4 tipos de saldo em tempo real';
  'POST /api/payments/recharge': 'Recarga via Stripe';
}

// Sistema de Afiliados
interface AffiliateEndpoints {
  'POST /api/enterprise/affiliate/create': 'Criar perfil afiliado';
  'GET /api/enterprise/affiliate/link': 'Obter link de referência';
  'GET /api/enterprise/affiliate/stats': 'Estatísticas de comissão';
  'POST /api/enterprise/affiliate/promote': 'Promover para VIP';
}

// Cupons Administrativos
interface CouponEndpoints {
  'POST /api/enterprise/admin/coupon/create': 'Criar cupom (admin)';
  'POST /api/enterprise/coupon/redeem': 'Resgatar cupom';
  'GET /api/enterprise/coupon/validate': 'Validar cupom';
  'GET /api/enterprise/admin/coupons': 'Listar cupons (admin)';
}

// IA e Sinais
interface AIEndpoints {
  'GET /ai/reading': 'Status atual da IA';
  'GET /ai/signals': 'Histórico de sinais';
  'GET /ai/decisions': 'Justificativas da IA';
  'GET /ai/eagle-news': 'Relatórios Águia News';
}
```

### 9.2. Sistema de Conversão de Moeda
```typescript
interface CurrencyConverter {
  // Fonte primária (oficial)
  primary: {
    source: 'Banco Central do Brasil';
    endpoint: 'https://api.bcb.gov.br/dados/serie/bcdata.sgs.10813/dados/ultimos/1?formato=json';
    updateSchedule: 'hourly'; // Durante horário comercial
    reliability: 'official';
  };
  
  // Fontes de fallback
  fallback: [
    'CurrencyAPI: https://api.currencyapi.com/v3/latest',
    'ExchangeRate-API: https://api.exchangerate-api.com/v4/latest/USD',
    'Fixer.io: https://api.fixer.io/latest'
  ];
  
  // Interface frontend
  display: {
    format: 'Taxa do dia: 1 USD = R$ X,XX (atualizada às HH:MM)';
    statusIcon: 'verde=oficial, amarelo=fallback';
    tooltip: 'Fonte dos dados e confiabilidade';
    autoRefresh: 'A cada hora quando tela ativa';
  };
}
```

---

## 10. DESIGN SYSTEM E UI/UX

### 10.1. Breakpoints Mobile-First
```css
/* Sistema responsivo obrigatório */
.responsive-grid {
  @apply grid grid-cols-1 gap-4;
  
  @screen sm {    /* 640px - Smartphones */
    @apply grid-cols-1;
  }
  
  @screen md {    /* 768px - Tablets */
    @apply grid-cols-2;
  }
  
  @screen lg {    /* 1024px - Desktop */
    @apply grid-cols-3;
  }
  
  @screen xl {    /* 1280px - Large screens */
    @apply grid-cols-4;
  }
  
  @screen 2xl {   /* 1536px - Ultra wide */
    @apply grid-cols-5;
  }
}
```

### 10.2. Estados de Loading Inteligentes
```typescript
// Skeleton screens em vez de spinners genéricos
const DashboardSkeleton = () => (
  <div className="space-y-4 animate-pulse">
    <div className="h-8 bg-gray-800 rounded-lg w-1/3"></div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="h-32 bg-gray-800 rounded-lg"></div>
      ))}
    </div>
  </div>
);

// Estados específicos por componente
const BalanceCardSkeleton = () => (
  <Card className="animate-pulse">
    <div className="flex items-center gap-3">
      <div className="w-12 h-12 bg-gray-700 rounded-full"></div>
      <div className="space-y-2">
        <div className="h-6 bg-gray-700 rounded w-24"></div>
        <div className="h-4 bg-gray-700 rounded w-32"></div>
      </div>
    </div>
  </Card>
);
```

### 10.3. Tratamento de Erros Premium
```typescript
interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

const ErrorFallback = ({ error, resetError }: ErrorFallbackProps) => (
  <div className="min-h-screen flex items-center justify-center bg-black">
    <div className="text-center space-y-4 p-8">
      <div className="w-16 h-16 mx-auto mb-4">
        <AlertTriangle className="w-full h-full text-red-400" />
      </div>
      <h2 className="text-2xl font-bold text-white">
        Ops! Algo deu errado
      </h2>
      <p className="text-gray-400 max-w-md">
        Ocorreu um erro inesperado. Nossa equipe foi notificada.
      </p>
      <div className="flex gap-4 justify-center">
        <Button 
          onClick={resetError}
          className="bg-gradient-to-r from-yellow-400 to-pink-500"
        >
          Tentar Novamente
        </Button>
        <Button 
          variant="outline"
          onClick={() => window.location.href = '/'}
        >
          Voltar ao Início
        </Button>
      </div>
    </div>
  </div>
);
```

### 10.4. Acessibilidade Obrigatória
```typescript
// Componente acessível padrão
const AccessibleButton = ({ 
  children, 
  onClick, 
  disabled, 
  ariaLabel,
  variant = 'primary' 
}: ButtonProps) => (
  <button
    onClick={onClick}
    disabled={disabled}
    aria-label={ariaLabel}
    className={`
      focus:ring-2 focus:ring-yellow-400 focus:outline-none
      disabled:opacity-50 disabled:cursor-not-allowed
      transition-all duration-200
      ${getVariantClasses(variant)}
    `}
  >
    {children}
  </button>
);

// Contraste mínimo obrigatório
const WCAG_AA_CONTRAST = {
  minimum: 4.5,
  enhanced: 7.0,
  textOnBackground: '#FFFFFF on #000000', // 21:1 (excelente)
  primaryText: '#B0B0B0 on #000000',      // 7.6:1 (enhanced)
  mutedText: '#666666 on #000000'          // 4.6:1 (AA compliant)
};
```

---

## 11. CRITÉRIOS DE ENTREGA

### 11.1. Conformidade Obrigatória

**ZERO tolerância para:**
- ❌ Dados hardcoded ou mock
- ❌ Componentes simulando backend
- ❌ Estados de loading fake
- ❌ Endpoints não testados
- ❌ Falhas de sincronização

**100% obrigatório:**
- ✅ Integração em tempo real
- ✅ Dados do banco PostgreSQL
- ✅ Todos os 95+ endpoints testados
- ✅ Resiliência de rede
- ✅ Tratamento de erros

### 11.2. Checklist de Entrega Final

#### **Frontend Real-Time:**
- [ ] Dashboard atualiza automaticamente (30s)
- [ ] 4 tipos de saldo sincronizados
- [ ] Timeline animada funcionando
- [ ] Taxa de câmbio em tempo real
- [ ] Notificações WhatsApp operacionais

#### **Integração Enterprise:**
- [ ] Sistema de perfis (6 tipos)
- [ ] Planos Stripe (4 planos)
- [ ] Sistema de afiliados completo
- [ ] Cupons administrativos
- [ ] IA e Águia News funcionando

#### **Performance Obrigatória:**
- [ ] Tempo de carregamento < 2s
- [ ] 100+ usuários simultâneos
- [ ] Mobile-first responsivo
- [ ] Acessibilidade WCAG AA
- [ ] Core Web Vitals otimizados

### 11.3. Validação em Produção

```bash
# Checklist técnico obrigatório
✅ Frontend conectado: Railway PostgreSQL
✅ Stripe funcionando: Pagamentos R$297 e $50
✅ Twilio funcionando: SMS por perfil
✅ OpenAI funcionando: IA decisions
✅ Binance/Bybit: API keys e saldos
✅ Webhooks: Stripe events
✅ Monitoramento: Sentry + analytics
✅ SSL/HTTPS: Certificado válido
✅ CDN: Vercel edge functions
```

### 11.4. Documentação Viva Obrigatória

```markdown
## README.md (atualizado a cada sprint)
- Setup do projeto
- Variáveis de ambiente
- Comandos de build/deploy
- Troubleshooting comum

## CHANGELOG.md
- Versioning semântico
- Breaking changes
- New features
- Bug fixes

## API_INTEGRATION.md
- Mapeamento completo dos endpoints
- Payloads de exemplo
- Error handling
- Rate limiting

## COMPONENT_LIBRARY.md
- Documentação de todos os componentes
- Props interfaces
- Usage examples
- Accessibility guidelines
```

### 11.5. Testes Obrigatórios

```typescript
// Cobertura mínima obrigatória
const TESTING_REQUIREMENTS = {
  unitTests: 90, // % cobertura componentes
  integrationTests: 100, // % fluxos críticos
  e2eTests: 100, // % jornadas usuário
  apiTests: 100, // % endpoints reais
  
  // Cenários críticos
  criticalScenarios: [
    'Login com todos os perfis',
    'Cadastro completo + SMS',
    'Pagamento Stripe real',
    'Gestão de API keys',
    'Timeline de operações',
    'Sistema de afiliados',
    'Controles de emergência admin'
  ]
} as const;
```

---

## 🎯 **CONCLUSÃO**

Esta especificação frontend enterprise está **100% alinhada** com a análise detalhada dos sistemas backend v6.0.0, garantindo que o frontend seja um **espelho perfeito** do backend, operando em tempo real com dados genuínos.

### **Diferenciais Principais:**
1. **Timeline Animada**: Acompanhamento visual das operações
2. **4 Tipos de Saldo**: Gestão financeira enterprise completa
3. **6 Perfis Reais**: Dashboards específicos por perfil
4. **Águia News**: Sistema de IA integrado
5. **Design Premium**: Inspirado na landing page atual

### **Próximos Passos:**
1. ✅ Setup do projeto Next.js + TypeScript
2. ✅ Implementação do design system
3. ✅ Integração com endpoints reais
4. ✅ Testes em ambiente de produção
5. ✅ Deploy Vercel + monitoramento

**A especificação está pronta para a equipe de frontend iniciar o desenvolvimento!** 🚀
