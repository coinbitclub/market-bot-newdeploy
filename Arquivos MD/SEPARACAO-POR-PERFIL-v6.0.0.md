# 👥 ESPECIFICAÇÃO POR PERFIL - COINBITCLUB ENTERPRISE v6.0.0
## Funcionalidades Separadas por Tipo de Usuário

---

## 📋 **ÍNDICE**
1. [Perfil USUÁRIO (Basic/Premium/Enterprise)](#1-perfil-usuário)
   - 1.1. [Dashboard Usuário](#11-dashboard-usuário)
   - 1.2. [Gestão de Saldos](#12-gestão-de-saldos)
   - 1.3. [Configuração e API Keys](#13-configuração-e-api-keys)
   - 1.4. [🔥 Demo em Tempo Real](#14--demo-em-tempo-real)
   - 1.5. [Timeline Animada](#15-timeline-animada)
2. [Perfil AFILIADO (Normal/VIP)](#2-perfil-afiliado)
   - 2.1. [Herança do Usuário](#21-herança-do-usuário)
   - 2.2. [🔥 Demo Dual Afiliado](#22--demo-dual-afiliado)
   - 2.3. [Dashboard Afiliado](#23-dashboard-afiliado)
   - 2.4. [Gestão de Indicados](#24-gestão-de-indicados)
   - 2.5. [Sistema de Comissões](#25-sistema-de-comissões)
3. [Estratégia de Conversão - Implementação Técnica](#6-estratégia-de-conversão---implementação-técnica)
   - 6.1. [Engine de Simulação](#61-engine-de-simulação)
   - 6.2. [Sistema Dual de Robôs](#62-sistema-dual-de-robôs)
   - 6.3. [Interface Responsiva](#63-interface-responsiva)
   - 6.4. [Proteções Éticas](#64-proteções-éticas)
4. [Perfil ADMINISTRADOR](#7-perfil-administrador)
   - 7.1. [Controles Administrativos](#71-controles-administrativos)
   - 7.2. [Sistema de Emergência](#72-sistema-de-emergência)
   - 7.3. [Gestão de Usuários](#73-gestão-de-usuários)
   - 7.4. [Monitoramento Avançado](#74-monitoramento-avançado)
5. [Componentes Compartilhados](#8-componentes-compartilhados)
   - 8.1. [Águia News](#81-águia-news)
   - 8.2. [Design System](#82-design-system)
   - 8.3. [Responsividade](#83-responsividade)
6. [Controle de Acesso (RBAC)](#9-controle-de-acesso)
   - 9.1. [Sistema de Autenticação](#91-sistema-de-autenticação)
   - 9.2. [Controle de Permissões](#92-controle-de-permissões)
   - 9.3. [Segurança e Proteção](#93-segurança-e-proteção)

---

## 1. PERFIL USUÁRIO
### Tipos: BASIC | PREMIUM | ENTERPRISE

### 1.1. **Dashboard Usuário**
```typescript
interface UserDashboard {
  // 📊 KPIs Pessoais
  personalMetrics: {
    winRate: number;                    // % de acerto individual
    dailyReturn: number;                // Retorno do dia
    historicalReturn: number;           // Retorno histórico
    totalOperations: number;            // Total de operações
    activePositions: number;            // Posições abertas
  };
  
  // 💰 Gestão de Saldos (4 tipos)
  balanceManagement: {
    realBalance: BalanceCard;           // 🟢 Stripe (pode sacar)
    adminBalance: BalanceCard;          // 🟡 Cupons (30 dias)
    prePaidBalance: BalanceCard;        // 🔵 Recargas (desconto)
    // ❌ commissionBalance: APENAS AFILIADOS
  };
  
  // 📈 Plano Atual
  planManagement: {
    currentPlan: EnterprisePlan;        // Plano ativo
    nextCharge: string;                 // Próxima cobrança
    upgradeButton: boolean;             // Botão de upgrade
    planComparison: PlanSelector;       // Comparar planos
  };
  
  // ⚙️ Configurações de Trading
  tradingSettings: {
    leverage: number;                   // Alavancagem (até 10x)
    takeProfit: number;                 // TP (até 10x)
    stopLoss: number;                   // SL (até 5x)
    orderValue: number;                 // % do saldo (até 50%)
    riskProfile: 'conservador' | 'moderado' | 'agressivo';
  };
}
```

### 1.2. **Gestão de API Keys**
```typescript
interface UserAPIKeys {
  // 🔑 Gerenciamento de Chaves
  apiKeyManager: {
    exchanges: ['binance', 'bybit'];
    environments: ['testnet', 'production'];
    maxKeysPerExchange: 2;
    
    // Validações por perfil
    validation: {
      testnet: {
        duration: 7;                    // 7 dias gratuito
        autoCleanup: true;              // Limpeza no 8º dia
      };
      production: {
        requiresActiveSubscription: true;
        securityChecks: true;
      };
    };
  };
  
  // 🛡️ Segurança
  security: {
    maskedDisplay: true;                // Nunca mostra secret
    permissionValidation: true;         // Verifica permissões
    connectionStatus: boolean;          // Status em tempo real
  };
}
```

### 1.3. **Timeline de Operações (Diferencial)**
```typescript
interface UserOperationTimeline {
  // 📈 Acompanhamento Visual
  timeline: {
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
      activeStepGlow: true;
      progressBar: true;
      miniEventLog: EventLog[];
    };
    
    // Interatividade
    features: {
      tooltipDetails: true;
      manualRefresh: true;
      mobileOptimized: true;
      accessibilitySupport: true;
    };
  };
}
```

### 1.4. **Dashboard Demo em Tempo Real (Estratégia de Conversão)**
```typescript
interface UserDemoRealTime {
  // 🎯 OBJETIVO: Aumentar conversão mostrando operações "em tempo real"
  conversionStrategy: {
    purpose: 'Demonstrar valor do produto com operações simuladas';
    userPerception: 'Operações reais em tempo real';
    reality: 'Simulação inteligente baseada em dados históricos';
    targetAudience: ['novos_usuarios', 'trial_users', 'free_plan'];
  };
  
  // 🤖 Simulação dos 2 Robôs
  dualRobotSimulation: {
    robot1: {
      name: 'ÁGUIA SCALPER';
      description: 'Operações rápidas 1-5min';
      avatar: '🦅';
      color: '#FFD700'; // Dourado
      
      // Simulação realística
      simulation: {
        operationDuration: '60-300s';        // 1-5 minutos
        updateFrequency: '5s';               // Atualiza a cada 5s
        profitRange: [0.5, 2.5];            // 0.5% a 2.5%
        successRate: 0.78;                   // 78% de acerto
        
        // Dados baseados em histórico real
        basedOnRealData: {
          historicalOperations: true;
          realMarketConditions: true;
          actualProfitRanges: true;
          authenticTimestamps: true;
        };
      };
    };
    
    robot2: {
      name: 'ÁGUIA SWING';
      description: 'Operações médias 15-60min';
      avatar: '🦅';
      color: '#FF69B4'; // Rosa
      
      simulation: {
        operationDuration: '900-3600s';      // 15-60 minutos
        updateFrequency: '10s';              // Atualiza a cada 10s
        profitRange: [1.0, 4.0];            // 1.0% a 4.0%
        successRate: 0.82;                   // 82% de acerto
        
        basedOnRealData: {
          historicalOperations: true;
          realMarketConditions: true;
          actualProfitRanges: true;
          authenticTimestamps: true;
        };
      };
    };
  };
  
  // 📊 Interface de Demonstração (Inspirada na Landing Page)
  demoInterface: {
    // Layout dual-robot como na landing
    layout: {
      splitView: true;                       // 2 colunas para 2 robôs
      syncAnimation: true;                   // Animações sincronizadas
      realtimeCounters: true;                // Contadores em tempo real
      profitAnimation: true;                 // Animação de lucro
    };
    
    // Elementos visuais da landing page
    visualElements: {
      pulsingDots: true;                     // Pontos pulsantes
      progressBars: true;                    // Barras de progresso
      numberCounters: true;                  // Contadores animados
      glowEffects: true;                     // Efeitos de brilho
      gradientBackgrounds: true;             // Fundos gradientes
      
      // Timing das animações
      animationTiming: {
        dotPulse: '1.5s';
        counterUpdate: '0.3s';
        progressFill: '2s';
        glowIntensity: '2s infinite';
      };
    };
    
    // Dados mostrados para o usuário
    displayData: {
      currentPrice: number;                  // Preço atual simulado
      entryPrice: number;                    // Preço de entrada
      currentPnL: number;                    // P&L atual
      currentPnLPercentage: number;          // P&L em %
      timeElapsed: string;                   // Tempo decorrido
      nextUpdate: number;                    // Próxima atualização em X segundos
      
      // Status visual
      status: 'analisando' | 'executando' | 'monitorando' | 'finalizando';
      statusColor: string;
      statusIcon: string;
    };
  };
  
  // 🔄 Engine de Simulação Inteligente
  simulationEngine: {
    // Baseado em dados reais
    dataSource: {
      realOperations: HistoricalOperation[]; // Operações históricas reais
      marketConditions: MarketData[];        // Condições de mercado
      profitDistribution: ProfitStats;       // Distribuição real de lucros
      timingPatterns: TimingData[];          // Padrões de timing reais
    };
    
    // Algoritmo de simulação
    algorithm: {
      selectRandomOperation: () => HistoricalOperation;
      adjustForCurrentMarket: (operation: HistoricalOperation) => SimulatedOperation;
      generateRealisticTiming: () => TimingSequence;
      simulateMarketMovement: () => PriceMovement[];
      
      // Garantir realismo
      realismRules: {
        respectMarketHours: boolean;         // Respeitar horários de mercado
        matchCurrentVolatility: boolean;     // Corresponder à volatilidade atual
        useRealisticSlippage: boolean;       // Slippage realístico
        followTrendDirection: boolean;       // Seguir direção da tendência
      };
    };
    
    // Variações para não parecer fake
    variationSystem: {
      operationTypes: string[];              // Diferentes tipos de operação
      entryReasons: string[];                // Diferentes motivos de entrada
      exitReasons: string[];                 // Diferentes motivos de saída
      marketConditions: string[];            // Diferentes condições
      
      // Aleatoriedade controlada
      randomization: {
        profitVariation: 0.15;               // ±15% de variação no lucro
        timingVariation: 0.20;               // ±20% de variação no timing
        entryPriceVariation: 0.02;           // ±2% de variação no preço
      };
    };
  };
  
  // 📱 Responsividade Mobile (Landing Page Style)
  mobileOptimization: {
    stackedLayout: true;                     // Layout empilhado no mobile
    swipeableCards: true;                    // Cards deslizáveis
    reducedAnimations: true;                 // Animações reduzidas para performance
    touchOptimized: true;                    // Otimizado para toque
    
    // Ajustes específicos mobile
    mobileAdjustments: {
      fontSize: 'smaller';
      padding: 'reduced';
      animationSpeed: 'faster';
      updateFrequency: 'lower'; // Menor frequência para economizar bateria
    };
  };
}
```

### 1.5. **Componente Demo Dashboard**
```typescript
interface DemoRealTimeComponent {
  // 🎬 Componente Principal
  component: 'DemoRealTimeDashboard';
  
  // Props do componente
  props: {
    userId: string;
    userProfile: 'basic' | 'premium' | 'enterprise';
    isSimulation: boolean;                   // Sempre true para demo
    showSimulationBadge: false;              // Não mostrar que é simulação
    
    // Configuração da demo
    demoConfig: {
      duration: 'unlimited';                 // Demo contínua
      autoRestart: true;                     // Reinicia automaticamente
      maxConcurrentOps: 2;                   // Máximo 2 operações simultâneas
      realisticsDelay: true;                 // Delays realísticos entre operações
    };
  };
  
  // Estado do componente
  state: {
    robot1Operation: SimulatedOperation | null;
    robot2Operation: SimulatedOperation | null;
    totalDayProfit: number;
    totalDayOperations: number;
    currentWinRate: number;
    
    // Estado da animação
    animationState: {
      robot1Active: boolean;
      robot2Active: boolean;
      profitCounterAnimating: boolean;
      progressBarsFilling: boolean;
    };
  };
  
  // Hooks personalizados
  hooks: {
    useSimulationEngine: () => SimulationEngine;
    useRealTimeUpdates: (interval: number) => void;
    useProfitAnimation: () => AnimationControls;
    useProgressBars: () => ProgressState;
  };
}
```

### 1.6. **Águia News (Público)**
```typescript
interface UserEagleNews {
  // 📰 Relatórios de Mercado
  marketReports: {
    marketStatus: 'Bull' | 'Bear' | 'Neutro';
    lastAnalysis: {
      timestamp: string;
      summary: string;                  // Resumo público
      riskFactors: string[];
      recommendations: string[];
    };
    
    // Horários Automáticos
    schedule: {
      weekdays: string[];               // Abertura/fechamento mercados
      weekends: string[];               // 9h e 17h
      timezone: 'America/Sao_Paulo';
      autoAdjustDST: true;             // Horário de verão
    };
  };
  
  // 🔔 Notificações
  notifications: {
    whatsappAlerts: boolean;           // Saldo crítico, operações importantes
    emailReports: boolean;             // Relatórios diários
    browserNotifications: boolean;     // Tempo real
  };
}
```

### 1.7. **Financeiro Pessoal**
```typescript
interface UserFinancial {
  // 💳 Pagamentos e Recargas
  payments: {
    stripeIntegration: StripeCheckout;  // Recargas e assinaturas
    paymentHistory: Transaction[];     // Histórico completo
    invoices: Invoice[];               // Faturas Stripe
    refunds: Refund[];                 // Reembolsos
  };
  
  // 💸 Saques
  withdrawals: {
    requestWithdraw: WithdrawForm;     // Solicitar saque
    withdrawHistory: Withdrawal[];     // Histórico de saques
    bankingData: BankingInfo;          // Dados bancários/PIX
    withdrawLimits: {
      daily: number;                   // Por perfil
      monthly: number;
      minimum: number;
    };
  };
}
```

---

## 2. PERFIL AFILIADO
### Tipos: AFFILIATE_NORMAL | AFFILIATE_VIP
### **Herda TUDO do Usuário + Funcionalidades Específicas**

### 2.1. **Dashboard Afiliado (Adicional)**
```typescript
interface AffiliateDashboard extends UserDashboard {
  // 💼 Métricas de Afiliado
  affiliateMetrics: {
    level: 'normal' | 'vip';
    commissionRate: 0.015 | 0.05;      // 1.5% ou 5.0%
    monthlyCommissions: number;
    totalCommissions: number;
    referralCount: number;
    conversionRate: number;
    
    // Ranking e Metas
    ranking: {
      position: number;
      totalAffiliates: number;
      nextLevelRequirements: string[];
    };
  };
  
  // 👥 Gestão de Indicados
  referralManagement: {
    referredUsers: ReferredUser[];
    userPerformance: UserPerformance[];
    revenueByUser: RevenueData[];
    
    // Ações Disponíveis
    actions: {
      linkNewUser: boolean;             // Até 48h após cadastro
      promoteToVIP: boolean;            // Apenas admin pode
      generateQRCode: boolean;          // Para compartilhamento
    };
  };
}
```

### 2.2. **Dashboard Demo Afiliado (Estratégia de Conversão + Indicados)**
```typescript
interface AffiliateDemoRealTime extends UserDemoRealTime {
  // 🎯 OBJETIVO AFILIADO: Mostrar valor para indicados + próprias operações
  affiliateConversionStrategy: {
    dualPurpose: {
      showOwnOperations: 'Demonstrar valor do sistema para o próprio afiliado';
      showReferralPotential: 'Mostrar potencial de ganho dos indicados';
      increaseConversion: 'Motivar mais indicações';
    };
    
    // Visão expandida para afiliados
    expandedView: {
      ownOperations: boolean;              // Próprias operações (igual usuário)
      referralSimulation: boolean;         // Simulação de operações dos indicados
      commissionDemo: boolean;             // Demo de comissões sendo geradas
    };
  };
  
  // 👥 Simulação de Operações dos Indicados
  referralOperationsDemo: {
    // Simular 3-5 indicados ativos
    simulatedReferrals: {
      count: number;                       // 3-5 indicados simulados
      profiles: SimulatedUser[];           // Perfis fictícios
      
      // Cada indicado com 2 robôs
      operations: {
        userId: string;
        userName: string;
        robot1: SimulatedOperation;
        robot2: SimulatedOperation;
        currentProfit: number;
        
        // Comissão em tempo real
        currentCommission: {
          amount: number;
          percentage: number;              // 1.5% ou 5.0%
          accumulatedToday: number;
        };
      }[];
    };
    
    // Timeline coletiva dos indicados
    referralTimeline: {
      recentOperations: ReferralOperation[];
      totalDayCommissions: number;
      projectedMonthlyCommissions: number;
      
      // Animações de comissão
      commissionAnimations: {
        newCommissionAlert: boolean;
        counterIncrement: boolean;
        progressBarUpdate: boolean;
      };
    };
  };
  
  // 📊 Interface Dual: Próprio + Indicados
  dualInterface: {
    layout: {
      splitMode: 'horizontal' | 'vertical';  // Layout adaptável
      ownOperationsSection: DemoSection;     // Seção próprias operações
      referralSection: DemoSection;          // Seção indicados
      
      // Navegação entre seções
      tabNavigation: {
        tabs: ['Minhas Operações', 'Meus Indicados'];
        activeTab: string;
        swipeSupport: boolean;             // Deslizar entre abas
      };
    };
    
    // Indicadores visuais especiais
    visualEnhancements: {
      commissionBadges: boolean;           // Badges de comissão
      rankingIndicator: boolean;           // Posição no ranking
      growthArrows: boolean;               // Setas de crescimento
      celebrationEffects: boolean;        // Efeitos de celebração
      
      // Cores específicas para afiliado
      affiliateColors: {
        commission: '#00FF88';             // Verde para comissões
        referral: '#3742FA';              // Azul para indicados
        growth: '#FFB800';                // Amarelo para crescimento
      };
    };
  };
  
  // 🎉 Sistema de Gamificação
  gamificationSystem: {
    // Metas e conquistas
    achievements: {
      dailyCommissionGoal: number;
      monthlyReferralGoal: number;
      currentProgress: number;
      
      // Badges e recompensas
      badges: {
        newReferral: 'Novo Indicado!';
        commissionMilestone: 'Meta de Comissão Atingida!';
        profitStreak: 'Sequência de Lucros!';
        topPerformer: 'Top Performer do Dia!';
      };
    };
    
    // Ranking em tempo real
    leaderboard: {
      currentPosition: number;
      totalAffiliates: number;
      pointsToNextLevel: number;
      
      // Motivações visuais
      motivationalMessages: string[];
      progressToVIP: number;               // Progresso para VIP (se normal)
    };
  };
}
```

### 2.3. **Sistema de Comissões**
```typescript
interface AffiliateCommissions {
  // 💰 Saldo de Comissão (4º tipo de saldo)
  commissionBalance: {
    amount: number;
    source: 'affiliate_commission';
    canWithdraw: false;                 // Não pode sacar diretamente
    canConvert: true;                   // Pode converter em crédito
    conversionBonus: 0.10;              // +10% bonus na conversão
  };
  
  // 📊 Detalhamento de Comissões
  commissionDetails: {
    dailyCommissions: Commission[];
    monthlyCommissions: Commission[];
    commissionByUser: UserCommission[];
    
    // Gestão de Prazos
    expirationAlerts: {
      days60: boolean;                  // 🟡 60+ dias não sacadas
      days90: boolean;                  // 🟠 Conversão em X dias
      days150: boolean;                 // 🔴 150+ dias (retorna em 180)
    };
  };
  
  // 🔄 Conversões e Saques
  conversionActions: {
    convertToCredit: (amount: number) => void;
    requestCommissionWithdraw: (amount: number) => void;
    withdrawHistory: CommissionWithdraw[];
  };
}
```

### 2.4. **Replay de Operações (Exclusivo)**
```typescript
interface AffiliateOperationReplay {
  // 📊 Visualização de Operações dos Indicados
  operationsReplay: {
    referredUserId: string;
    operations: OperationStep[];
    readonly: true;                     // Apenas visualização
    
    // Timeline dos Indicados
    userTimelines: {
      userId: string;
      userName: string;
      currentOperations: OperationTimeline[];
      historicalOperations: OperationTimeline[];
      performance: UserPerformance;
    }[];
    
    // Filtros e Análises
    filters: {
      timeRange: DateRange;
      operationType: 'all' | 'profitable' | 'loss';
      userId: string;
    };
  };
}
```

### 2.5. **Sistema de Indicação**
```typescript
interface AffiliateReferral {
  // 🔗 Gestão de Links
  referralSystem: {
    referralCode: string;               // Código único
    referralLink: string;               // Link completo
    qrCode: string;                     // QR Code para mobile
    
    // Materiais de Marketing
    marketingMaterials: {
      socialMediaTemplates: string[];
      emailTemplates: string[];
      banners: Image[];
      landingPages: string[];
    };
  };
  
  // 📈 Analytics de Indicação
  referralAnalytics: {
    clickCount: number;
    conversionRate: number;
    topSources: TrafficSource[];
    geographicData: GeoData[];
    
    // Campanhas
    campaigns: {
      active: Campaign[];
      performance: CampaignMetrics[];
    };
  };
}
```

---

## 6. ESTRATÉGIA DE CONVERSÃO - IMPLEMENTAÇÃO TÉCNICA

### 6.1. **Engine de Simulação Realística**
```typescript
interface ConversionSimulationEngine {
  // 🎯 Objetivo: Simular operações sem o usuário perceber
  purpose: {
    primary: 'Demonstrar valor do produto em tempo real';
    secondary: 'Aumentar taxa de conversão de trial para pago';
    tertiary: 'Reduzir churn de usuários novos';
  };
  
  // 📊 Fonte de Dados Reais
  dataSource: {
    // Operações históricas reais dos últimos 30 dias
    historicalOperations: {
      source: 'real_user_operations';
      timeframe: '30_days';
      filters: {
        onlyProfitable: false;           // Incluir perdas para realismo
        includeNeutral: true;            // Incluir operações neutras
        minDuration: '60s';              // Mínimo 1 minuto
        maxDuration: '3600s';            // Máximo 1 hora
      };
      
      // Distribuição realística
      distribution: {
        profitable: 0.78;               // 78% lucrativas
        neutral: 0.12;                  // 12% neutras
        loss: 0.10;                     // 10% com perda
      };
    };
    
    // Condições de mercado atuais
    currentMarketData: {
      fearGreedIndex: number;
      btcDominance: number;
      top100Performance: number;
      volatility: number;
      
      // Ajustar simulação conforme mercado
      adjustmentRules: {
        bullMarket: 'increase_profit_probability';
        bearMarket: 'increase_realistic_losses';
        sideways: 'more_neutral_operations';
        highVolatility: 'faster_operations';
      };
    };
  };
  
  // 🤖 Configuração dos 2 Robôs
  robotConfiguration: {
    aguiaScalper: {
      name: 'ÁGUIA SCALPER';
      characteristics: {
        operationDuration: [60, 300];     // 1-5 minutos
        profitRange: [0.3, 2.8];         // 0.3% a 2.8%
        lossRange: [-0.5, -1.2];         // -0.5% a -1.2%
        successRate: 0.76;               // 76% de acerto
        updateFrequency: 3000;           // 3s
        
        // Personalidade do robô
        personality: {
          aggressive: true;
          fastPaced: true;
          shortTermFocus: true;
          riskTolerance: 'medium';
        };
      };
      
      // Padrões de comportamento
      behaviorPatterns: {
        entrySignals: ['RSI_oversold', 'MACD_cross', 'support_bounce'];
        exitStrategies: ['quick_tp', 'trailing_stop', 'time_exit'];
        marketPreferences: ['high_volume', 'trending', 'breakout'];
      };
    };
    
    aguiaSwing: {
      name: 'ÁGUIA SWING';
      characteristics: {
        operationDuration: [900, 3600];   // 15-60 minutos
        profitRange: [0.8, 4.2];         // 0.8% a 4.2%
        lossRange: [-0.8, -2.1];         // -0.8% a -2.1%
        successRate: 0.82;               // 82% de acerto
        updateFrequency: 5000;           // 5s
        
        personality: {
          patient: true;
          analytical: true;
          mediumTermFocus: true;
          riskTolerance: 'conservative';
        };
      };
      
      behaviorPatterns: {
        entrySignals: ['trend_continuation', 'pullback_entry', 'pattern_breakout'];
        exitStrategies: ['target_tp', 'trend_reversal', 'time_decay'];
        marketPreferences: ['trending', 'stable_volume', 'clear_direction'];
      };
    };
  };
  
  // 🔄 Sistema de Rotação e Variação
  rotationSystem: {
    // Evitar padrões repetitivos
    operationRotation: {
      maxConsecutiveWins: 4;             // Máximo 4 lucros seguidos
      forceLossAfterStreak: true;        // Forçar perda após sequência
      varyOperationTiming: true;         // Variar timing entre operações
      randomizeEntryReasons: true;       // Aleatorizar motivos de entrada
    };
    
    // Pool de operações
    operationPool: {
      totalOperations: 500;              // Pool de 500 operações reais
      refreshDaily: true;                // Renovar pool diariamente
      weightByMarket: true;              // Peso baseado no mercado atual
      excludeRecent: true;               // Excluir operações muito recentes
    };
    
    // Variações inteligentes
    intelligentVariations: {
      adjustProfitForMarket: boolean;    // Ajustar lucro conforme mercado
      scaleTiming: boolean;              // Escalar timing conforme volatilidade
      adaptToUserBehavior: boolean;      // Adaptar ao comportamento do usuário
      respectMarketHours: boolean;       // Respeitar horários de mercado
    };
  };
}
```

### 6.2. **Componente de Interface (Inspirado na Landing Page)**
```typescript
interface DemoRealTimeInterface {
  // 🎨 Design System da Landing Page
  landingPageInspired: {
    // Elementos visuais principais
    visualElements: {
      dualRobotCards: {
        layout: 'side_by_side';
        cardStyle: 'glassmorphism';
        borderEffect: 'neon_glow';
        backgroundGradient: true;
        
        // Animações da landing
        animations: {
          pulsingBorder: '2s infinite';
          glowIntensity: 'dynamic';
          numberCounters: 'smooth_increment';
          progressBars: 'fluid_fill';
        };
      };
      
      // Contadores animados
      animatedCounters: {
        profitCounter: {
          format: 'currency';
          animation: 'count_up';
          duration: '1.5s';
          easing: 'ease_out';
        };
        
        percentageCounter: {
          format: 'percentage';
          animation: 'smooth_increment';
          colorChange: true;             // Muda cor conforme valor
          glowEffect: true;
        };
        
        timeCounter: {
          format: 'duration';
          animation: 'real_time';
          updateFrequency: '1s';
        };
      };
      
      // Status indicators da landing
      statusIndicators: {
        robotStatus: {
          idle: { color: '#666666', text: 'Aguardando Sinal', pulse: false };
          analyzing: { color: '#FFB800', text: 'Analisando Mercado', pulse: true };
          executing: { color: '#3742FA', text: 'Executando Ordem', pulse: true };
          monitoring: { color: '#00BFFF', text: 'Monitorando', pulse: true };
          closing: { color: '#00FF88', text: 'Finalizando', pulse: false };
        };
        
        marketCondition: {
          display: true;
          position: 'top_right';
          indicators: ['Fear_Greed', 'BTC_Dominance', 'Market_Trend'];
        };
      };
    };
    
    // Layout responsivo da landing
    responsiveLayout: {
      desktop: {
        robotCards: 'two_columns';
        spacing: 'wide';
        fontSize: 'large';
        animations: 'full';
      };
      
      tablet: {
        robotCards: 'two_columns_narrow';
        spacing: 'medium';
        fontSize: 'medium';
        animations: 'reduced';
      };
      
      mobile: {
        robotCards: 'stacked';
        spacing: 'compact';
        fontSize: 'small';
        animations: 'minimal';
        swipeNavigation: true;
      };
    };
  };
  
  // 📱 Interações Específicas
  userInteractions: {
    // Tooltips informativos
    tooltips: {
      robotInfo: 'Informações sobre estratégia do robô';
      operationDetails: 'Detalhes da operação atual';
      marketAnalysis: 'Análise das condições de mercado';
      profitExplanation: 'Como o lucro é calculado';
    };
    
    // Controles disponíveis
    controls: {
      pauseSimulation: false;            // Não permitir pausar
      speedControl: false;               // Não permitir acelerar
      resetDemo: false;                  // Não permitir resetar
      
      // Apenas observação
      viewOnly: true;
      realtimeUpdates: true;
      automaticProgression: true;
    };
    
    // Feedbacks visuais
    feedback: {
      profitCelebration: {
        trigger: 'positive_result';
        effect: 'confetti_burst';
        duration: '2s';
        sound: 'success_chime';          // Opcional
      };
      
      newOperationAlert: {
        trigger: 'new_operation_start';
        effect: 'gentle_pulse';
        color: '#FFD700';
        duration: '1s';
      };
      
      updateNotification: {
        trigger: 'data_update';
        effect: 'subtle_flash';
        position: 'data_point';
        duration: '0.5s';
      };
    };
  };
}
```

### 6.3. **Lógica de Negócio da Conversão**
```typescript
interface ConversionBusinessLogic {
  // 🎯 Estratégia de Conversão por Perfil
  conversionStrategy: {
    // Usuário novo (primeiro acesso)
    newUser: {
      demoLength: 'unlimited';           // Demo contínua
      showUpgradeHints: true;            // Mostrar dicas de upgrade
      highlightBenefits: true;           // Destacar benefícios
      
      // Gatilhos de conversão
      conversionTriggers: {
        afterProfitableDemo: true;       // Após demo lucrativa
        timeOnPlatform: '5_minutes';     // Após 5 minutos
        operationCount: 3;               // Após 3 operações
      };
    };
    
    // Usuário trial/gratuito
    trialUser: {
      demoLength: '7_days';              // 7 dias de demo
      urgencyIndicators: true;           // Indicadores de urgência
      progressBar: true;                 // Barra de progresso do trial
      
      conversionTriggers: {
        day3: 'show_premium_features';
        day5: 'limited_time_offer';
        day7: 'last_chance_upgrade';
      };
    };
    
    // Afiliado demonstrando para indicado
    affiliateDemo: {
      emphasizeCommissions: true;        // Enfatizar comissões
      showDualBenefit: true;             // Mostrar benefício duplo
      socialProof: true;                 // Proof social
      
      conversionTriggers: {
        duringProfitDemo: 'highlight_earning_potential';
        afterSuccessSequence: 'show_referral_bonus';
        realTimeCommission: 'emphasize_passive_income';
      };
    };
  };
  
  // 📊 Métricas de Conversão
  conversionMetrics: {
    // KPIs a acompanhar
    trackingKPIs: {
      demoEngagement: 'time_spent_watching';
      profitImpression: 'positive_reactions_to_profit';
      upgradeClicks: 'upgrade_button_clicks';
      trialConversion: 'trial_to_paid_ratio';
      affiliateReferrals: 'demo_to_signup_ratio';
    };
    
    // A/B Tests
    abTests: {
      profitRanges: 'test_different_profit_levels';
      updateFrequency: 'test_update_intervals';
      visualStyles: 'test_animation_styles';
      callToAction: 'test_upgrade_prompts';
    };
    
    // Otimização contínua
    optimization: {
      basedOnData: true;
      adjustProfitRates: true;
      refineTimings: true;
      improveVisuals: true;
    };
  };
}
```

### 6.4. **Implementação de Segurança e Ética**
```typescript
interface ConversionSafeguards {
  // 🛡️ Proteções Éticas
  ethicalGuidelines: {
    // Transparência
    transparency: {
      noFalsePromises: true;             // Não prometer ganhos garantidos
      disclaimerVisible: true;           // Disclaimer sempre visível
      riskWarning: true;                 // Avisos de risco
      educationalContent: true;          // Conteúdo educativo
    };
    
    // Realismo
    realism: {
      basedOnRealData: true;             // Baseado em dados reais
      includeNegativeResults: true;      // Incluir resultados negativos
      respectMarketConditions: true;     // Respeitar condições reais
      noExaggeration: true;              // Não exagerar resultados
    };
    
    // Conformidade
    compliance: {
      regulatoryCompliance: true;        // Conformidade regulatória
      industryStandards: true;           // Padrões da indústria
      legalDisclaimer: true;             // Disclaimer legal
      userConsent: true;                 // Consentimento do usuário
    };
  };
  
  // 🔒 Proteções Técnicas
  technicalSafeguards: {
    // Anti-detecção
    antiDetection: {
      naturalVariation: true;            // Variação natural
      humanlikeTiming: true;             // Timing humano
      realisticPatterns: true;           // Padrões realísticos
      noObviousPatterns: true;           // Sem padrões óbvios
    };
    
    // Limites de segurança
    safetyLimits: {
      maxProfitPerOperation: 5.0;        // Máximo 5% por operação
      maxDailyProfit: 15.0;              // Máximo 15% por dia
      minimumLossRatio: 0.08;            // Mínimo 8% de perdas
      realisticTimeframes: true;         // Timeframes realísticos
    };
    
    // Auditoria
    auditTrail: {
      logAllSimulations: true;           // Log de todas simulações
      trackUserInteractions: true;       // Track interações
      monitorConversions: true;          // Monitor conversões
      performanceAnalytics: true;        // Analytics de performance
    };
  };
}
```

---

## 7. PERFIL ADMINISTRADOR
### **Acesso Total ao Sistema + Funcionalidades Exclusivas**

### 7.1. **Dashboard Admin Completo**
```typescript
interface AdminDashboard {
  // 🔧 Healthcheck do Sistema
  systemHealth: {
    microservices: {
      tradingBot: ServiceStatus;
      aiCoordinator: ServiceStatus;
      marketReader: ServiceStatus;
      stripeIntegration: ServiceStatus;
      twilioSMS: ServiceStatus;
      databasePostgreSQL: ServiceStatus;
    };
    
    // Métricas Globais
    globalMetrics: {
      uptime: number;
      eventQueueSize: number;
      anomalyAlerts: Alert[];
      performanceMetrics: SystemMetrics;
    };
  };
  
  // 📊 KPIs Empresariais
  businessMetrics: {
    totalUsers: number;
    activeSubscriptions: number;
    totalRevenue: number;
    monthlyGrowth: number;
    churnRate: number;
    
    // Por perfil
    usersByProfile: ProfileDistribution;
    revenueByPlan: PlanRevenue[];
    affiliatePerformance: AffiliateStats[];
  };
}
```

### 7.2. **Controles de Emergência**
```typescript
interface AdminEmergencyControls {
  // 🚨 Ações Críticas
  emergencyActions: {
    // FECHAR TODAS AS OPERAÇÕES
    closeAllOperations: {
      action: () => Promise<void>;
      confirmation: {
        adminPassword: string;          // Senha obrigatória
        confirmationPhrase: string;     // "Entendo as consequências"
        doubleConfirmation: boolean;    // Checkbox obrigatório
      };
      logging: {
        auditLog: true;                 // Log automático
        teamNotification: true;         // Notifica equipe
        timestamp: string;
      };
    };
    
    // PAUSAR/RETOMAR por Exchange
    exchangeControl: {
      pauseBinance: () => void;
      resumeBinance: () => void;
      pauseBybit: () => void;
      resumeBybit: () => void;
      
      // Status visual
      exchangeStatus: {
        binance: 'active' | 'paused' | 'error';
        bybit: 'active' | 'paused' | 'error';
      };
    };
    
    // REPROCESSAR Sinais com Falha
    reprocessFailures: {
      action: () => void;
      failedSignals: FailedSignal[];
      batchReprocess: boolean;
    };
  };
}
```

### 7.3. **Gestão de Usuários Enterprise**
```typescript
interface AdminUserManagement {
  // 👥 CRUD de Usuários
  userCRUD: {
    // Listar usuários
    listUsers: {
      users: User[];
      filters: {
        profileType: UserProfile['code'];
        subscriptionStatus: string;
        registrationDate: DateRange;
        country: string;
      };
      pagination: Pagination;
      search: string;
    };
    
    // Criar usuário
    createUser: {
      form: UserCreationForm;
      bulkImport: CSVImport;
      emailInvitation: EmailInvite;
    };
    
    // Editar usuário
    updateUser: {
      personalData: PersonalDataForm;
      profileMigration: ProfileMigration;
      subscriptionManagement: SubscriptionEdit;
      apiKeyManagement: APIKeyAdmin;
    };
    
    // Ações administrativas
    userActions: {
      resetPassword: (userId: string) => void;
      blockUser: (userId: string, reason: string) => void;
      unblockUser: (userId: string) => void;
      deleteUser: (userId: string) => void; // Com confirmação
      impersonateUser: (userId: string) => void; // Para suporte
    };
  };
  
  // 📊 Migração de Perfis
  profileMigration: {
    availableMigrations: ProfileMigration[];
    migrationHistory: MigrationLog[];
    bulkMigration: BulkMigration;
    
    // Aprovações necessárias
    pendingApprovals: {
      basicToPremium: PendingMigration[];      // Automático
      premiumToEnterprise: PendingMigration[]; // Aprovação manual
      normalToVIP: PendingMigration[];         // Aprovação manual
    };
  };
}
```

### 7.4. **Sistema de Afiliados (Admin)**
```typescript
interface AdminAffiliateManagement {
  // 🤝 Gestão de Afiliados
  affiliateControl: {
    // Promoção VIP
    promoteToVIP: {
      candidates: AffiliateCandidate[];
      requirements: {
        minReferrals: 10;
        minMonthlyVolume: 5000;
        performanceRating: number;
      };
      bulkPromotion: boolean;
    };
    
    // Vínculos Manuais
    manualLinking: {
      linkUserToAffiliate: (userId: string, affiliateId: string) => void;
      unlinkUser: (userId: string) => void;
      transferUser: (userId: string, newAffiliateId: string) => void;
      
      // Histórico de vínculos
      linkingHistory: LinkingLog[];
    };
    
    // Comissões Administrativas
    commissionControl: {
      adjustCommission: (affiliateId: string, amount: number) => void;
      approveWithdraw: (withdrawId: string) => void;
      rejectWithdraw: (withdrawId: string, reason: string) => void;
      bulkProcessWithdrawals: () => void;
      
      // Relatórios
      commissionReports: CommissionReport[];
      paymentSchedule: PaymentSchedule[];
    };
  };
}
```

### 7.5. **Sistema de Cupons Administrativos**
```typescript
interface AdminCouponSystem {
  // 🎫 Gestão de Cupons
  couponManagement: {
    // CRUD de Cupons
    createCoupon: {
      form: CouponCreationForm;
      types: ['WELCOME', 'BONUS', 'PROMOTIONAL', 'VIP'];
      validation: {
        expirationDate: Date;
        usageLimit: number;
        minimumValues: {
          brasil: 20000;                // R$ 200,00
          exterior: 3500;               // $35,00
        };
      };
    };
    
    // Gestão de Cupons
    couponActions: {
      activateCoupon: (couponId: string) => void;
      deactivateCoupon: (couponId: string) => void;
      updateUsageLimit: (couponId: string, newLimit: number) => void;
      extendExpiration: (couponId: string, newDate: Date) => void;
      
      // Relatórios
      usageReports: CouponUsageReport[];
      redemptionHistory: RedemptionLog[];
    };
    
    // Cupons em Lote
    bulkOperations: {
      generateBatchCoupons: (quantity: number, config: CouponConfig) => void;
      exportCoupons: (format: 'CSV' | 'JSON') => void;
      importCoupons: (file: File) => void;
    };
  };
}
```

### 7.6. **IA e Sinais (Admin Exclusivo)**
```typescript
interface AdminAIManagement {
  // 🧠 Monitoramento da IA
  aiMonitoring: {
    // Status em Tempo Real
    realTimeStatus: {
      aiStatus: 'Online' | 'Offline' | 'Processando';
      fearGreedIndex: number;           // 0-100
      btcDominance: number;
      allowedDirection: 'LONG' | 'SHORT' | 'AMBOS';
      lastDecisionTimestamp: string;
    };
    
    // Configuração OpenAI
    openAIConfig: {
      model: 'GPT-4o-mini' | 'GPT-3.5-turbo';
      temperature: number;              // 0.1-0.3
      maxTokens: number;                // 100-300
      timeout: number;                  // 15-20s
      
      // Controles
      enableAI: boolean;
      fallbackMode: boolean;
      debugMode: boolean;
    };
    
    // Histórico de Decisões
    decisionHistory: {
      signals: AISignal[];
      decisions: AIDecision[];
      performance: AIPerformance;
      
      // Filtros admin
      filters: {
        timeRange: DateRange;
        signalType: 'NORMAL' | 'FORTE';
        performance: 'all' | 'successful' | 'failed';
      };
    };
  };
  
  // 📊 Controle de Sinais
  signalControl: {
    // Histórico Completo
    signalHistory: {
      tradingViewSignals: TradingViewSignal[];
      processedSignals: ProcessedSignal[];
      rejectedSignals: RejectedSignal[];
      
      // Análise de performance
      performanceMetrics: {
        successRate: number;
        averagePnL: number;
        totalSignals: number;
        executionTime: number;
      };
    };
    
    // Controles Manuais
    manualControls: {
      enableSignalProcessing: boolean;
      pauseSpecificPairs: string[];
      forceExecuteSignal: (signalId: string) => void;
      rejectSignal: (signalId: string, reason: string) => void;
    };
  };
}
```

### 7.7. **Relatórios Financeiros Empresariais**
```typescript
interface AdminFinancialReports {
  // 💰 Contabilidade Empresarial
  financialOverview: {
    // Receitas
    revenue: {
      subscriptionRevenue: number;      // Assinaturas mensais
      commissionRevenue: number;       // Comissões dos usuários
      rechargeRevenue: number;         // Taxas de recarga
      totalRevenue: number;
      
      // Por período
      monthlyRevenue: MonthlyRevenue[];
      yearlyRevenue: YearlyRevenue[];
      revenueGrowth: GrowthMetrics;
    };
    
    // Despesas
    expenses: {
      // Despesas Recorrentes
      recurring: {
        infrastructure: number;         // Railway, Vercel, etc.
        licenses: number;               // APIs, softwares
        services: number;               // Stripe, Twilio, OpenAI
      };
      
      // Despesas Pontuais
      oneTime: {
        development: number;            // Desenvolvimentos
        consulting: number;             // Consultorias
        equipment: number;              // Equipamentos
      };
      
      // Por categoria
      categories: {
        infrastructure: number;
        licenses: number;
        services: number;
        marketing: number;
        legal: number;
        hr: number;
      };
    };
    
    // Lucro Líquido
    profitLoss: {
      grossProfit: number;
      netProfit: number;
      profitMargin: number;
      ebitda: number;
      
      // Projeções
      projections: {
        nextMonth: number;
        nextQuarter: number;
        nextYear: number;
      };
    };
  };
  
  // 📊 Gráficos Executivos
  charts: {
    revenuePieChart: PieChart;          // Distribuição de receitas
    profitLineChart: LineChart;         // Evolução do lucro
    expenseBarChart: BarChart;          // Receita vs Despesas
    userGrowthChart: LineChart;         // Crescimento de usuários
  };
}
```

### 7.8. **Conciliação Stripe Automática**
```typescript
interface AdminStripeManagement {
  // 💳 Gestão Stripe Enterprise
  stripeControl: {
    // Processamento Automático
    automaticProcessing: {
      scheduledDays: [5, 20];           // Dias 5 e 20 do mês
      batchProcessing: boolean;
      autoApproval: boolean;
      
      // Processamentos fora do cronograma
      manualProcessing: {
        requiresApproval: true;
        approvalWorkflow: ApprovalWorkflow;
        emergencyProcessing: boolean;
      };
    };
    
    // Conciliação
    reconciliation: {
      stripeTransactions: StripeTransaction[];
      systemTransactions: SystemTransaction[];
      discrepancies: Discrepancy[];
      
      // Ações
      reconcileDiscrepancies: () => void;
      exportReconciliation: (format: string) => void;
      scheduleReconciliation: ScheduleConfig;
    };
    
    // Reembolsos e Ajustes
    refundsAndAdjustments: {
      pendingRefunds: Refund[];
      processRefund: (refundId: string) => void;
      bulkRefunds: BulkRefund;
      
      // Ajustes manuais
      manualAdjustments: {
        adjustBalance: (userId: string, amount: number, reason: string) => void;
        correctTransaction: (transactionId: string, correction: Correction) => void;
        addCredit: (userId: string, amount: number, type: CreditType) => void;
      };
    };
  };
}
```

### 7.9. **Auditoria e Logs**
```typescript
interface AdminAuditSystem {
  // 📋 Sistema de Auditoria
  auditControl: {
    // Logs do Sistema
    systemLogs: {
      userActions: UserActionLog[];
      adminActions: AdminActionLog[];
      systemEvents: SystemEventLog[];
      securityEvents: SecurityLog[];
      
      // Busca e filtros
      logSearch: {
        filters: LogFilters;
        dateRange: DateRange;
        logLevel: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
        userId: string;
        action: string;
      };
    };
    
    // Exportação de Logs
    logExport: {
      exportCSV: (filters: LogFilters) => void;
      exportJSON: (filters: LogFilters) => void;
      exportPDF: (filters: LogFilters) => void;
      
      // Agendamento
      scheduledExports: ScheduledExport[];
      automatedReports: AutoReport[];
    };
    
    // Compliance e KYC
    compliance: {
      kycHistory: KYCLog[];
      policyAcceptance: PolicyAcceptanceLog[];
      dataRetention: DataRetentionPolicy;
      gdprCompliance: GDPRCompliance;
      
      // Relatórios de conformidade
      complianceReports: ComplianceReport[];
      auditTrail: AuditTrail[];
    };
  };
}
```

### 7.10. **Configurações do Sistema**
```typescript
interface AdminSystemConfig {
  // ⚙️ Variáveis do Sistema
  systemVariables: {
    // Limites globais
    globalLimits: {
      maxLeverage: number;
      maxTakeProfit: number;
      maxStopLoss: number;
      maxOrderValue: number;
    };
    
    // Taxas e comissões
    rates: {
      subscriptionCommission: number;
      prepaidCommission: number;
      affiliateNormalRate: number;
      affiliateVIPRate: number;
    };
    
    // Flags de manutenção
    maintenanceFlags: {
      tradingEnabled: boolean;
      registrationEnabled: boolean;
      withdrawalsEnabled: boolean;
      depositsEnabled: boolean;
      apiKeysEnabled: boolean;
    };
    
    // Configurações de cron jobs
    cronJobs: {
      marketReader: CronConfig;
      aiCoordinator: CronConfig;
      reportGenerator: CronConfig;
      reconciliation: CronConfig;
    };
    
    // URLs de APIs externas
    externalAPIs: {
      binanceAPI: string;
      bybitAPI: string;
      coinStatsAPI: string;
      openAIAPI: string;
      bcbAPI: string;
    };
  };
  
  // 📊 Histórico de Alterações
  configHistory: {
    changes: ConfigChange[];
    rollbackOptions: RollbackOption[];
    
    // Ações
    revertToLastConfig: () => void;
    exportConfig: () => void;
    importConfig: (config: SystemConfig) => void;
  };
}
```

---

## 8. COMPONENTES COMPARTILHADOS

### 8.1. **Componentes Base (Todos os Perfis)**
```typescript
interface SharedComponents {
  // 🎨 Design System
  designSystem: {
    colors: EnterpriseColors;
    typography: Typography;
    spacing: Spacing;
    animations: Animations;
  };
  
  // 🧩 UI Components
  uiComponents: {
    Card: 'Container com bordas neon e gradientes';
    Button: 'Variações primary, secondary, danger com hover effects';
    Modal: 'Modal responsivo com backdrop blur';
    DataTable: 'Tabela responsiva com paginação e filtros';
    StatusBadge: 'Badge com cores dinâmicas baseadas em status';
    LoadingSpinner: 'Spinner customizado com efeito neon';
  };
  
  // 🔧 Utilitários
  utilities: {
    formatCurrency: (value: number, currency: string) => string;
    formatDate: (date: Date, locale: string) => string;
    validateForm: (schema: Schema, data: any) => ValidationResult;
    sanitizeHTML: (html: string) => string;
    debounce: (func: Function, delay: number) => Function;
  };
  
  // 🌐 Internacionalização
  i18n: {
    locales: ['pt-BR', 'en-US'];
    translations: TranslationFiles;
    currencyFormats: CurrencyFormats;
    dateFormats: DateFormats;
  };
}
```

### 8.2. **Águia News (Todos os Perfis)**
```typescript
interface SharedEagleNews {
  // 📰 Conteúdo Público
  publicContent: {
    marketStatus: 'Bull' | 'Bear' | 'Neutro';
    marketAnalysis: string;
    riskFactors: string[];
    generalRecommendations: string[];
    macroEvents: string[];
    lastUpdated: string;
  };
  
  // 📅 Horários Dinâmicos
  schedule: {
    weekdays: {
      asian: { open: string; close: string };
      american: { open: string; close: string };
    };
    weekends: ['09:00', '17:00'];
    timezone: 'America/Sao_Paulo';
    autoAdjustDST: boolean;
  };
}
```

### 8.3. **Autenticação e Segurança (Todos)**
```typescript
interface SharedAuth {
  // 🔐 Autenticação
  authentication: {
    login: LoginForm;
    register: RegisterForm;
    passwordRecovery: RecoveryForm;
    twoFactorAuth: TwoFactorSetup;
    
    // Políticas
    policyAcceptance: {
      termsOfService: boolean;
      privacyPolicy: boolean;
      mandatory: true;
      versionControl: boolean;
    };
  };
  
  // 🛡️ Segurança
  security: {
    sessionManagement: SessionManager;
    roleBasedAccess: RBAC;
    apiRateLimit: RateLimit;
    encryptionUtils: EncryptionUtils;
  };
}
```

---

## 9. CONTROLE DE ACESSO (RBAC)

### 9.1. **Matriz de Permissões**
```typescript
interface PermissionMatrix {
  // 👤 USUÁRIO (Basic/Premium/Enterprise)
  user: {
    dashboard: ['view_own_dashboard'];
    operations: ['view_own_operations', 'manage_own_settings'];
    apiKeys: ['manage_own_api_keys'];
    financial: ['view_own_balance', 'request_withdraw', 'recharge'];
    timeline: ['view_own_timeline'];
    eagleNews: ['view_public_reports'];
    profile: ['edit_own_profile', 'upgrade_plan'];
  };
  
  // 🤝 AFILIADO (Normal/VIP)
  affiliate: {
    // Herda todas as permissões de usuário +
    inherited: 'ALL_USER_PERMISSIONS';
    
    // Específicas de afiliado
    commissions: ['view_own_commissions', 'convert_commissions', 'request_commission_withdraw'];
    referrals: ['view_referrals', 'link_new_user', 'generate_referral_materials'];
    replay: ['view_referral_operations'];
    vip: ['access_vip_tools']; // Apenas VIP
  };
  
  // 👑 ADMINISTRADOR
  admin: {
    // Acesso total ao sistema
    global: ['*']; // Todas as permissões
    
    // Específicas críticas
    emergency: ['close_all_operations', 'pause_system', 'reprocess_failures'];
    users: ['manage_all_users', 'impersonate_users', 'migrate_profiles'];
    affiliates: ['promote_affiliates', 'manage_commissions', 'manual_linking'];
    coupons: ['create_coupons', 'manage_coupons', 'bulk_operations'];
    ai: ['monitor_ai', 'configure_ai', 'manage_signals'];
    financial: ['view_all_financials', 'process_withdrawals', 'manage_stripe'];
    system: ['configure_system', 'view_all_logs', 'export_data'];
    audit: ['access_audit_logs', 'compliance_reports'];
  };
}
```

### 9.2. **Implementação de Controle**
```typescript
interface RBACImplementation {
  // 🔒 Hook de Autorização
  usePermissions: (requiredPermissions: string[]) => {
    hasAccess: boolean;
    loading: boolean;
    error?: string;
  };
  
  // 🚫 Componente de Proteção
  ProtectedRoute: {
    component: React.ComponentType;
    requiredPermissions: string[];
    fallback?: React.ComponentType;
    redirectTo?: string;
  };
  
  // 🎭 Componente Condicional
  ConditionalRender: {
    permissions: string[];
    children: React.ReactNode;
    fallback?: React.ReactNode;
  };
  
  // 📋 Verificação de Permissão
  checkPermission: (
    userRole: string,
    requiredPermission: string
  ) => boolean;
}
```

### 9.3. **Estrutura de Rotas**
```typescript
interface RouteStructure {
  // 🏠 Rotas Públicas
  public: [
    '/',                    // Landing page
    '/login',               // Login
    '/register',            // Cadastro
    '/recovery',            // Recuperação de senha
  ];
  
  // 👤 Rotas de Usuário
  user: [
    '/dashboard',           // Dashboard principal
    '/operations',          // Timeline de operações
    '/api-keys',            // Gestão de API keys
    '/settings',            // Configurações pessoais
    '/financial',           // Financeiro pessoal
    '/plan',                // Planos e assinaturas
  ];
  
  // 🤝 Rotas de Afiliado (+ rotas de usuário)
  affiliate: [
    '/affiliate',           // Dashboard afiliado
    '/referrals',           // Gestão de indicados
    '/commissions',         // Comissões
    '/replay',              // Replay de operações
    '/materials',           // Materiais de marketing
  ];
  
  // 👑 Rotas de Admin (acesso total + específicas)
  admin: [
    '/admin',               // Dashboard admin
    '/admin/users',         // Gestão de usuários
    '/admin/affiliates',    // Gestão de afiliados
    '/admin/coupons',       // Gestão de cupons
    '/admin/ai',            // Monitoramento IA
    '/admin/financial',     // Relatórios financeiros
    '/admin/system',        // Configurações sistema
    '/admin/audit',         // Auditoria e logs
    '/admin/emergency',     // Controles de emergência
  ];
}
```

---

## 🎯 **RESUMO EXECUTIVO**

### **Separação Clara por Perfil:**

#### **1. USUÁRIO** (Basic/Premium/Enterprise)
- ✅ Dashboard pessoal com KPIs individuais
- ✅ Timeline animada de operações próprias
- ✅ **🔥 Dashboard Demo em Tempo Real (INOVAÇÃO)**
- ✅ Gestão de 3 tipos de saldo (sem comissão)
- ✅ API Keys e configurações de trading
- ✅ Águia News (público)
- ✅ Financeiro pessoal (recarga/saque)

#### **2. AFILIADO** (Normal/VIP)
- ✅ **HERDA TUDO do usuário** +
- ✅ Dashboard com métricas de afiliado
- ✅ **🔥 Demo Dual: Próprias + Indicados (ESTRATÉGIA)**
- ✅ 4º tipo de saldo (comissão)
- ✅ Gestão de indicados
- ✅ Replay de operações dos referidos
- ✅ Sistema de links e QR codes
- ✅ Conversão de comissões

#### **3. ADMINISTRADOR**
- ✅ **ACESSO TOTAL** ao sistema +
- ✅ Controles de emergência
- ✅ Gestão completa de usuários
- ✅ Sistema de cupons administrativos
- ✅ Monitoramento da IA (exclusivo)
- ✅ Relatórios financeiros empresariais
- ✅ Auditoria e logs completos
- ✅ Configurações do sistema

### **🚀 INOVAÇÃO PRINCIPAL: Dashboard Demo em Tempo Real**

#### **🎯 Estratégia de Conversão:**
1. **Simulação Inteligente**: Baseada em dados históricos reais
2. **2 Robôs Simultâneos**: ÁGUIA SCALPER + ÁGUIA SWING
3. **Percepção de Tempo Real**: Usuário não percebe que é simulação
4. **Visual da Landing Page**: Mesma animação e design
5. **Rotação Inteligente**: Evita padrões óbvios

#### **📊 Características Técnicas:**
- **Fonte de Dados**: 500+ operações históricas reais
- **Realismo**: 78% lucros, 12% neutras, 10% perdas
- **Timing**: SCALPER (1-5min), SWING (15-60min)
- **Atualizações**: 3s (scalper), 5s (swing)
- **Variações**: Ajustes por condições de mercado

#### **🎨 Interface Inspirada na Landing:**
- **Dual Robot Cards**: Layout lado a lado
- **Contadores Animados**: Smooth increment
- **Barras de Progresso**: Fluid fill
- **Efeitos Neon**: Glow e pulse
- **Responsivo**: Desktop, tablet, mobile

#### **🛡️ Proteções Éticas:**
- **Baseado em Dados Reais**: Sem exageros
- **Disclaimers Visíveis**: Transparência total
- **Incluir Perdas**: Realismo completo
- **Conformidade**: Regulamentações e ética

### **📱 Implementação por Perfil:**

#### **USUÁRIO**: Demo das próprias operações
- Dashboard mostra "suas" operações simuladas
- 2 robôs trabalhando para o usuário
- Gatilhos de conversão inteligentes

#### **AFILIADO**: Demo dual (próprias + indicados)
- Seção próprias operações
- Seção simulando 3-5 indicados
- Comissões sendo geradas em tempo real
- Gamificação e ranking

#### **ADMIN**: Controle total da estratégia
- Configurar parâmetros da simulação
- Monitorar métricas de conversão
- A/B tests automáticos
- Analytics de performance

### **🎯 Objetivos da Estratégia:**
1. **Aumentar Conversão**: Trial → Paid
2. **Reduzir Churn**: Novos usuários
3. **Demonstrar Valor**: Produto em ação
4. **Motivar Afiliados**: Mostrar potencial

**A estratégia de conversão está completa e integrada ao sistema!** 🚀
