# 🎯 SISTEMA INTEGRADO - ETAPAS 3 & 5

## 📊 ARQUITETURA DE COORDENAÇÃO IA

### 🤖 **PAPEL DA IA: COORDENAÇÃO E EXECUÇÃO AUTOMÁTICA**
```
┌─────────────────────────────────────────────────────────────┐
│                🧠 IA ORQUESTRADORA AUTOMÁTICA                │
├─────────────────────────────────────────────────────────────┤
│ ✅ Coordena todo o processo automaticamente                 │
│ ✅ Supervisiona métricas e sinais em tempo real            │
│ ✅ Valida condições de mercado                             │
│ ✅ EXECUTA abertura/fechamento SEM confirmação humana      │
│ ✅ TEM autonomia total para operações                      │
│ ✅ Monitoramento por ticker específico                     │
│ ✅ Preferência para sinais FORTE                           │
└─────────────────────────────────────────────────────────────┘
```

---

## 🌊 MÉTRICAS DE MERCADO INTEGRADAS

### **📈 Métrica TOP 100 Moedas + Fear & Greed**

#### **🎯 Índice de Movimento do Mercado (IMM):**
```javascript
IMM = (
  Subindo_24h_count * 2 +
  Subindo_7d_count * 1 +
  Volume_médio_variação +
  Market_cap_variação
) / 4

Faixas IMM:
  < 30: MERCADO_BAIXISTA 🔴
  30-70: MERCADO_NEUTRO 🟡  
  > 70: MERCADO_ALTISTA 🟢
```

#### **🧭 Direção Permitida (Fear & Greed + IMM):**
```
┌─────────────┬─────────────┬─────────────────────┐
│ Fear&Greed  │     IMM     │   Direção Permitida │
├─────────────┼─────────────┼─────────────────────┤
│    < 30     │   Qualquer  │    SOMENTE_LONG     │
│   30-80     │    < 30     │    SOMENTE_LONG     │
│   30-80     │   30-70     │    LONG_E_SHORT     │
│   30-80     │    > 70     │    SOMENTE_SHORT    │
│    > 80     │   Qualquer  │    SOMENTE_SHORT    │
└─────────────┴─────────────┴─────────────────────┘
```

---

## ⚡ FLUXO DE SINAIS TRADINGVIEW

### **📡 Recepção e Validação (30min ou critérios):**

#### **🎯 Tipos de Sinais:**
```
📊 ENTRADA:
  • SINAL_LONG      → Abre posição LONG
  • SINAL_LONG_FORTE → Abre posição LONG (+ agressiva)
  • SINAL_SHORT     → Abre posição SHORT  
  • SINAL_SHORT_FORTE → Abre posição SHORT (+ agressiva)

📊 SAÍDA:
  • FECHE_LONG  → Fecha todas posições LONG
  • FECHE_SHORT → Fecha todas posições SHORT
```

#### **⏱️ Janelas de Validade:**
```
🔄 Sinal recebido → 30s para validação inicial
✅ Sinal validado → 2min para execução de abertura
⚡ Sinal de fechamento → Execução imediata
```

---

## 📊 SISTEMA DE MONITORAMENTO AVANÇADO

### **🎛️ Métricas Contínuas:**

#### **1. 📈 Análise Top 100 (a cada 5min):**
```javascript
const marketMetrics = {
  coins_rising_24h: 0,      // Quantidade subindo 24h
  coins_rising_7d: 0,       // Quantidade subindo 7d
  avg_volume_change: 0,     // Mudança média de volume
  market_cap_change: 0,     // Mudança market cap total
  dominance_btc: 0,         // Dominância Bitcoin
  volatility_index: 0       // Índice de volatilidade
};
```

#### **2. 🎯 Monitoramento de Posições:**
```javascript
const positionMetrics = {
  pnl_unrealized: 0,        // P&L não realizado
  time_in_position: 0,      // Tempo em posição
  distance_to_tp: 0,        // Distância até TP
  distance_to_sl: 0,        // Distância até SL
  market_correlation: 0     // Correlação com mercado
};
```

#### **3. 🔥 Alertas Inteligentes:**
```
🚨 ATENÇÃO: Posição BTCUSDT há 45min sem movimento
📊 P&L: -2.3% | Mercado: -1.8% | Correlação: 87%
🎯 Sugestão IA: Monitorar próximos 15min para decisão
```

---

## ⚙️ VALIDAÇÕES PRÉ-EXECUÇÃO

### **🛡️ Sistema de Proteções:**

#### **📋 Checklist Obrigatório:**
```
✅ Máximo 2 posições ativas por usuário
✅ Valores mínimos respeitados
✅ Bloqueio 2h no ticker (após fechamento)
✅ Exchange operacional
✅ Saldo suficiente na conta
✅ TP/SL obrigatórios definidos
✅ Direção permitida pelo F&G + IMM
```

#### **💰 Cálculos de Risco:**
```javascript
// Parâmetros DEFAULT
const defaultParams = {
  leverage: 5,
  sl_factor: 2,    // SL = 2 × leverage = 10%
  tp_factor: 3,    // TP = 3 × leverage = 15%
  position_size: 0.30  // 30% do saldo
};

// Parâmetros CUSTOMIZADOS (limites)
const customLimits = {
  max_leverage: 10,
  max_sl_factor: 5,
  max_tp_factor: 6,
  max_position_size: 0.50  // 50% do saldo
};
```

---

## 🎯 SISTEMA DE FECHAMENTO INTELIGENTE

### **📊 Critérios de Fechamento Antecipado (100% AUTOMÁTICO):**

#### **🚨 Fechamento por Métricas:**
```javascript
const closeConditions = {
  // Tempo em posição sem progresso (CORRIGIDO: 120min)
  time_stagnation: {
    time_in_position: > 120, // 120min conforme solicitado
    pnl_progress: < 0.005    // < 0.5%
  },
  
  // Correlação com mercado CORRIGIDA (direção oposta)
  market_correlation_danger: {
    correlation: > 0.85,
    market_falling_with_long: true,  // Só fecha LONG se mercado caindo
    market_rising_with_short: true   // Só fecha SHORT se mercado subindo
  },
  
  // Volatilidade extrema CORRIGIDA (só direção oposta)
  volatility_spike: {
    volatility_index: > 0.8,
    opposite_direction: true  // Só fecha se volatilidade oposta à posição
  }
};
```

#### **⚡ Processo de Fechamento AUTOMÁTICO:**
```
1. 🎯 IA detecta condição de fechamento
2. 📊 Avalia métricas em tempo real
3. � EXECUTA FECHAMENTO AUTOMATICAMENTE
4. ✅ Registra motivo e atualiza dados
5. � Aplica bloqueio de 2h no ticker
6. 💰 Processa comissionamento se lucrativa
```

---

## 💰 COMISSIONAMENTO INTEGRADO

### **🧮 Cálculo Automatizado:**

#### **📊 Ao Fechar Posição Lucrativa:**
```javascript
const commission = {
  // Comissão base
  monthly_user: profit * 0.10,    // 10% mensal
  prepaid_user: profit * 0.20,    // 20% pré-pago
  
  // Distribuição afiliados
  normal_affiliate: commission * 0.015, // 1.5%
  vip_affiliate: commission * 0.05,     // 5%
  
  // Empresa
  company_share: commission - affiliate_share
};
```

#### **💳 Processamento Financeiro:**
```
✅ Operação fechada com lucro
💰 Comissão calculada automaticamente
📊 Saldo pré-pago debitado (se aplicável)
🎁 Crédito bônus aplicado (se aplicável)
📈 Dados financeiros atualizados em tempo real
```

---

## 🔄 JOBS E MANUTENÇÃO

### **⏰ Tarefas Agendadas:**

#### **🧹 Limpeza (a cada 3h):**
```
• Remove sinais antigos (> 6h)
• Limpa logs de métricas (> 24h)  
• Atualiza estatísticas de performance
• Redefine bloqueios expirados
```

#### **📊 Relatórios (diários):**
```
• Resumo de operações do dia
• Performance por usuário
• Métricas de mercado
• Alertas e sugestões IA
```

---

## 🎛️ PROPOSTA DE IMPLEMENTAÇÃO

### **🚀 Fases de Desenvolvimento:**

#### **FASE 1 - Base (7 dias):**
- ✅ Sistema Fear & Greed + TOP 100
- ✅ Webhook TradingView integrado
- ✅ Validações pré-execução
- ✅ Monitoramento básico

#### **FASE 2 - IA Coordenadora (10 dias):**
- ✅ Métricas avançadas de mercado
- ✅ Sistema de alertas inteligentes
- ✅ Fechamento antecipado por critérios
- ✅ Dashboard de supervisão

#### **FASE 3 - Otimização (5 dias):**
- ✅ Machine Learning para padrões
- ✅ Backtesting automático
- ✅ Relatórios avançados
- ✅ API completa para frontend

---

**🎯 Quer que eu implemente alguma fase específica primeiro?**
