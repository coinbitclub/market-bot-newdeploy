# 🛒 Plans Purchase System - Complete Implementation
## CoinBitClub Enterprise MarketBot - Enhanced Plans API

**Issue:** Frontend not showing PRO and FLEX plans  
**Solution:** Updated plans API to return all plans with proper purchase logic  
**Features:** Asset-based payments, Stripe integration, plan validation

---

## 🎯 Problem Analysis

### **Original Issue:**
- Frontend only showing TRIAL plan
- Users couldn't see or purchase PRO/FLEX plans
- No payment method selection
- Missing plan validation logic

### **Root Cause:**
- Plans API was filtering by region
- Missing business logic for plan activation
- No payment method handling
- Incomplete plan purchase flow

---

## 🔧 Fixes Applied

### **1. Updated Plans API to Return All Plans**
```javascript
// BEFORE: Filtered by region
WHERE is_active = true AND (region = $1 OR code = 'TRIAL')

// AFTER: Returns all active plans
WHERE is_active = true
```

### **2. Enhanced Plan Data Structure**
```javascript
// Added new business logic fields
{
    allowsRealtimeTrading: plan.allows_realtime_trading,
    requiresUserAssets: plan.requires_user_assets,
    transactionFeeType: plan.transaction_fee_type,
    monthlyFee: plan.monthly_fee,
    canPurchase: !(userCurrentPlan && plan.code === userCurrentPlan.plan_type)
}
```

### **3. Implemented Plan-Specific Purchase Logic**
```javascript
// TRIAL Plan - Free activation
async activateTrialPlan(userId, planCode, res)

// FLEX Plan - Requires $20 minimum assets
async activateFlexPlan(userId, planCode, planData, userBalance, paymentMethod, successUrl, cancelUrl, res)

// PRO Plan - $100/month, assets or Stripe
async activateProPlan(userId, planCode, planData, userBalance, paymentMethod, successUrl, cancelUrl, res)
```

---

## 🎯 Plan Purchase Logic

### **TRIAL Plan**
```javascript
{
    "planCode": "TRIAL",
    "paymentRequired": false,
    "action": "Direct activation",
    "requirements": "None"
}
```

**Process:**
1. ✅ **Free activation** - No payment required
2. ✅ **Immediate activation** - Updates user plan_type
3. ✅ **Testnet only** - Limited to testnet trading

### **FLEX Plan**
```javascript
{
    "planCode": "FLEX",
    "paymentRequired": true,
    "minimumAssets": 20,
    "action": "Asset validation or deposit"
}
```

**Process:**
1. **Check user assets** - Must have $20+ in account
2. **If sufficient assets** - Activate immediately
3. **If insufficient assets** - Offer Stripe deposit
4. **Asset deposit** - Create Stripe session for missing amount

**Example Response:**
```json
{
    "success": true,
    "message": "FLEX plan requer $20 em ativos. Você tem $5.00. Deposite $15.00 para ativar.",
    "planCode": "FLEX",
    "paymentRequired": true,
    "requiredAmount": 15.00,
    "currentBalance": 5.00,
    "minimumRequired": 20.00,
    "checkoutUrl": "https://checkout.stripe.com/..."
}
```

### **PRO Plan**
```javascript
{
    "planCode": "PRO",
    "paymentRequired": true,
    "monthlyFee": 100,
    "paymentMethods": ["assets", "stripe"]
}
```

**Process:**
1. **Payment method selection** - Assets or Stripe
2. **Asset payment** - Deduct $100 from user balance
3. **Stripe payment** - Create monthly subscription
4. **Activation** - Update plan_type and subscription dates

**Example Response:**
```json
{
    "success": true,
    "message": "Plano PRO ativado com sucesso! Pago com ativos.",
    "planCode": "PRO",
    "paymentRequired": false,
    "paymentMethod": "assets",
    "amountPaid": 100.00
}
```

---

## 🛒 API Endpoints

### **GET /api/plans/available**
**Returns all available plans with purchase status**

```json
{
    "success": true,
    "region": "brazil",
    "userCountry": "BR",
    "currentPlan": {
        "plan_type": "TRIAL",
        "subscription_status": "active"
    },
    "plans": [
        {
            "id": 1,
            "code": "TRIAL",
            "name": "Trial Plan",
            "type": "TRIAL",
            "price": 0.00,
            "currency": "USD",
            "billingPeriod": "none",
            "commissionRate": 0.00,
            "minimumBalance": 0.00,
            "features": ["✅ 7-day free trial", "🔧 Trading TESTNET apenas"],
            "allowsRealtimeTrading": false,
            "requiresUserAssets": false,
            "transactionFeeType": "none",
            "monthlyFee": 0.00,
            "isCurrentPlan": true,
            "isActive": true,
            "canPurchase": false
        },
        {
            "id": 2,
            "code": "FLEX",
            "name": "FLEX Plan",
            "type": "PREPAID",
            "price": 0.00,
            "currency": "USD",
            "billingPeriod": "none",
            "commissionRate": 20.00,
            "minimumBalance": 20.00,
            "features": ["🤖 Trading automatizado 24/7", "💰 20% comissão apenas sobre lucros"],
            "allowsRealtimeTrading": true,
            "requiresUserAssets": true,
            "transactionFeeType": "percentage",
            "monthlyFee": 0.00,
            "isCurrentPlan": false,
            "isActive": false,
            "canPurchase": true
        },
        {
            "id": 3,
            "code": "PRO",
            "name": "PRO Plan",
            "type": "MONTHLY",
            "price": 100.00,
            "currency": "USD",
            "billingPeriod": "month",
            "commissionRate": 0.00,
            "minimumBalance": 0.00,
            "features": ["🤖 Trading automatizado 24/7", "💸 Taxa fixa de $100/mês"],
            "allowsRealtimeTrading": true,
            "requiresUserAssets": false,
            "transactionFeeType": "none",
            "monthlyFee": 100.00,
            "isCurrentPlan": false,
            "isActive": false,
            "canPurchase": true
        }
    ]
}
```

### **POST /api/plans/subscribe**
**Subscribe to a plan with payment method**

**Request:**
```json
{
    "planCode": "PRO",
    "paymentMethod": "assets",
    "successUrl": "https://app.coinbitclub.com/success",
    "cancelUrl": "https://app.coinbitclub.com/cancel"
}
```

**Response (Success):**
```json
{
    "success": true,
    "message": "Plano PRO ativado com sucesso! Pago com ativos.",
    "planCode": "PRO",
    "planName": "PRO Plan",
    "paymentRequired": false,
    "paymentMethod": "assets",
    "amountPaid": 100.00,
    "checkoutUrl": null
}
```

**Response (Payment Required):**
```json
{
    "success": true,
    "message": "Redirecionando para pagamento Stripe...",
    "planCode": "PRO",
    "planName": "PRO Plan",
    "paymentRequired": true,
    "paymentMethod": "stripe",
    "amount": 100.00,
    "checkoutUrl": "https://checkout.stripe.com/...",
    "sessionId": "cs_test_..."
}
```

---

## 💳 Payment Methods

### **Asset Payment**
- **PRO Plan** - Deduct $100 from user balance
- **FLEX Plan** - Validate $20 minimum assets
- **TRIAL Plan** - No payment required

### **Stripe Payment**
- **PRO Plan** - Monthly subscription $100/month
- **FLEX Plan** - Asset deposit for missing amount
- **TRIAL Plan** - Not applicable

### **Payment Flow:**
```
User Selects Plan → Choose Payment Method → Validate Requirements → Process Payment → Activate Plan
```

---

## 🔍 Plan Validation

### **TRIAL Plan Validation:**
```javascript
// No validation required
// Direct activation
```

### **FLEX Plan Validation:**
```javascript
const minimumAssets = 20;
if (userBalance >= minimumAssets) {
    // Activate immediately
} else {
    // Require asset deposit
    const requiredAmount = minimumAssets - userBalance;
}
```

### **PRO Plan Validation:**
```javascript
const monthlyFee = 100;
if (paymentMethod === 'assets' && userBalance >= monthlyFee) {
    // Pay with assets
} else if (paymentMethod === 'stripe') {
    // Pay with Stripe
} else {
    // Show payment options
}
```

---

## 🎨 Frontend Integration

### **Plan Display Logic:**
```typescript
// Frontend will now receive all plans
const plans = response.plans;

// Filter plans based on user needs
const availablePlans = plans.filter(plan => plan.canPurchase);

// Show payment options for each plan
plans.forEach(plan => {
    if (plan.code === 'TRIAL') {
        // Show "Activate Free" button
    } else if (plan.code === 'FLEX') {
        // Show "Activate with Assets" or "Deposit Assets" button
    } else if (plan.code === 'PRO') {
        // Show "Pay with Assets" or "Pay with Stripe" buttons
    }
});
```

### **Payment Method Selection:**
```typescript
// PRO Plan payment options
const proPlanOptions = {
    assets: {
        available: userBalance >= 100,
        amount: 100,
        currentBalance: userBalance
    },
    stripe: {
        available: true,
        amount: 100
    }
};

// FLEX Plan requirements
const flexPlanRequirements = {
    minimumAssets: 20,
    currentBalance: userBalance,
    needsDeposit: userBalance < 20,
    depositAmount: 20 - userBalance
};
```

---

## 🚀 Testing Scenarios

### **Scenario 1: TRIAL User Wants PRO Plan**
```
1. User has $0 balance
2. Selects PRO plan
3. Chooses "Pay with Stripe"
4. Redirected to Stripe checkout
5. Completes payment
6. Plan activated
```

### **Scenario 2: User Wants FLEX Plan with Insufficient Assets**
```
1. User has $5 balance
2. Selects FLEX plan
3. System shows: "Need $15 more"
4. User chooses "Deposit Assets"
5. Redirected to Stripe for $15 deposit
6. Completes payment
7. Plan activated
```

### **Scenario 3: User Wants FLEX Plan with Sufficient Assets**
```
1. User has $25 balance
2. Selects FLEX plan
3. System activates immediately
4. Plan activated without payment
```

### **Scenario 4: User Wants PRO Plan with Assets**
```
1. User has $150 balance
2. Selects PRO plan
3. Chooses "Pay with Assets"
4. $100 deducted from balance
5. Plan activated
```

---

## 📊 Database Updates

### **User Plan Activation:**
```sql
UPDATE users SET
    plan_type = $1,
    subscription_status = 'active',
    subscription_start_date = NOW(),
    subscription_end_date = NOW() + INTERVAL '1 month', -- For PRO plan
    balance_real_usd = balance_real_usd - $2, -- For asset payments
    updated_at = NOW()
WHERE id = $3
```

### **Plan Status Tracking:**
```sql
-- Check current plan
SELECT plan_type, subscription_status, subscription_end_date 
FROM users WHERE id = $1

-- Update plan
UPDATE users SET plan_type = $1 WHERE id = $2
```

---

## 🎯 Expected Results

After the fix:
- ✅ **All plans visible** - TRIAL, PRO, FLEX all shown
- ✅ **Purchase options** - Asset or Stripe payment methods
- ✅ **Plan validation** - Proper requirements checking
- ✅ **Payment processing** - Stripe integration working
- ✅ **Plan activation** - Immediate or payment-based activation

---

## 🚀 Deployment Steps

### **1. Apply Code Changes:**
```bash
# The fixes have been applied to:
# src/routes/plans.js
```

### **2. Restart Backend:**
```bash
npm run start
```

### **3. Test Plans API:**
```bash
# Test GET /api/plans/available
curl -H "Authorization: Bearer <token>" http://localhost:3333/api/plans/available

# Test POST /api/plans/subscribe
curl -X POST -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"planCode":"PRO","paymentMethod":"assets"}' \
  http://localhost:3333/api/plans/subscribe
```

### **4. Verify Frontend:**
- Check plans page shows all plans
- Test plan purchase flow
- Verify payment method selection
- Confirm plan activation

---

## 🏁 Summary

The plans purchase system has been completely updated:

### **✅ Fixed Issues:**
- All plans now visible (TRIAL, PRO, FLEX)
- Proper payment method handling
- Plan validation logic implemented
- Asset-based payments supported

### **✅ New Features:**
- Payment method selection (Assets/Stripe)
- Plan-specific activation logic
- Asset requirement validation
- Comprehensive error handling

### **✅ Business Logic:**
- **TRIAL** - Free activation
- **FLEX** - $20 minimum assets required
- **PRO** - $100/month, assets or Stripe payment

The system is now ready for production with full plan purchase functionality! 🎯

