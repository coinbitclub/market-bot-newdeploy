# 📖 User Guide: How to Connect Your Exchange API Keys

## 🎯 Overview

**CoinBitClub** uses a **personal API key** system. This means:
- ✅ You trade on **your own** Bybit or Binance account
- ✅ You maintain **full control** of your funds
- ✅ The platform provides trading **signals and automation**
- ✅ You see trades **directly on your exchange account**

**To use CoinBitClub, you MUST connect your own exchange API keys.**

---

## 🔑 What Are API Keys?

**API keys** are like passwords that allow CoinBitClub to execute trades on your behalf - BUT:
- ✅ Your funds stay in **your exchange account** (not with us)
- ✅ You can **disable withdrawals** for maximum security
- ✅ You can **revoke access** at any time
- ✅ We **never see** your funds or personal exchange data

---

## ⚡ Quick Start (3 Steps)

### Step 1: Create Exchange Account
Choose **Bybit** or **Binance** (or both):
- [Sign up for Bybit](https://www.bybit.com/)
- [Sign up for Binance](https://www.binance.com/)

### Step 2: Generate API Keys
Follow the detailed guides below for your chosen exchange

### Step 3: Connect to CoinBitClub
Paste your API keys in **User Settings → API Keys**

---

## 📘 Bybit API Keys - Step by Step

### 1. Login to Bybit
Go to [www.bybit.com](https://www.bybit.com/) and login

### 2. Navigate to API Management
- Click on your **profile icon** (top right)
- Select **API Management** from dropdown
- Or go directly to: https://www.bybit.com/app/user/api-management

### 3. Create New API Key
- Click **Create New Key**
- Choose **System-generated API Keys** (recommended)
- Complete **2FA verification** (Google Authenticator or SMS)

### 4. Configure API Permissions
**IMPORTANT**: Only enable these permissions:
- ✅ **Read-Write** or **Trading**
- ✅ **Unified Trading Account** (if available)
- ❌ **Withdrawals** - **NEVER** enable this
- ❌ **Transfer** - **NEVER** enable this

### 5. Set IP Restrictions (Optional but Recommended)
- For **maximum security**, add server IP whitelist
- For **easy setup**, leave unrestricted
- Contact support for server IP address if needed

### 6. Name Your API Key
- Give it a name like "CoinBitClub Trading Bot"
- Click **Submit**

### 7. Copy Your Keys
⚠️ **CRITICAL**: This is your ONLY chance to copy the API Secret!
- **API Key**: Starts with letters/numbers (20-30 characters)
- **API Secret**: Long string (40+ characters)
- Save both securely (password manager recommended)

### 8. Paste into CoinBitClub
- Go to **CoinBitClub → User Settings → API Keys**
- Select **Bybit** from dropdown
- Paste **API Key** and **API Secret**
- Click **Save & Verify**

---

## 📗 Binance API Keys - Step by Step

### 1. Login to Binance
Go to [www.binance.com](https://www.binance.com/) and login

### 2. Navigate to API Management
- Click on your **profile icon** (top right)
- Select **API Management**
- Or go to: https://www.binance.com/en/my/settings/api-management

### 3. Create New API Key
- Click **Create API**
- Choose **System Generated** (recommended)
- Give it a label like "CoinBitClub Bot"
- Complete **security verification** (2FA required)

### 4. Configure API Restrictions
**IMPORTANT**: Only enable these permissions:
- ✅ **Enable Reading** - YES
- ✅ **Enable Spot & Margin Trading** - YES
- ❌ **Enable Withdrawals** - **NEVER** enable this
- ❌ **Enable Futures** - Only if you trade futures
- ❌ **Enable Internal Transfer** - NO

### 5. Set IP Access Restriction
Binance **requires** IP whitelisting for security:
- Add **Unrestricted** for easy setup (less secure)
- OR add specific server IP (contact support for IP address)

### 6. Complete Verification
- Re-enter your **2FA code**
- Check your **email** for verification link
- Click the link to confirm

### 7. Copy Your Keys
⚠️ **CRITICAL**: You can only see the Secret Key once!
- **API Key**: Exactly **64 characters** (letters and numbers)
- **Secret Key**: Exactly **64 characters**
- Save both securely

### 8. Paste into CoinBitClub
- Go to **CoinBitClub → User Settings → API Keys**
- Select **Binance** from dropdown
- Paste **API Key** (64 characters)
- Paste **API Secret** (64 characters)
- Click **Save & Verify**

---

## ✅ Verify Your Connection

After saving your API keys:

1. **Status Check**: You should see ✅ **Verified** next to your exchange
2. **Test Balance**: Your exchange balance should appear
3. **Wait for Signal**: When TradingView sends a signal, trades will execute on your account

---

## 🔐 Security Best Practices

### ✅ DO:
- ✅ Use **2FA** (Google Authenticator) on your exchange
- ✅ Use a **strong, unique password**
- ✅ **Disable withdrawals** on API keys
- ✅ Use **IP whitelisting** if possible
- ✅ Store API secrets in a **password manager**
- ✅ Check your **exchange account** regularly

### ❌ DON'T:
- ❌ **NEVER** enable **withdrawal permissions**
- ❌ **NEVER** share your API keys with anyone
- ❌ **NEVER** reuse passwords from other sites
- ❌ **NEVER** store API keys in plain text files
- ❌ **NEVER** share screenshots with visible API secrets

---

## 💰 Fund Your Exchange Account

After connecting API keys, you need to **fund your exchange account**:

### For Bybit:
1. Go to **Assets → Deposit**
2. Choose cryptocurrency (USDT recommended)
3. Copy your deposit address
4. Send funds from your wallet
5. Wait for confirmation (usually 5-30 minutes)

### For Binance:
1. Go to **Wallet → Fiat and Spot**
2. Click **Deposit**
3. Choose cryptocurrency (USDT recommended)
4. Copy your deposit address
5. Send funds from your wallet
6. Wait for confirmation

**Minimum Recommended**: $100-500 USDT for testing

---

## 🧪 Test Your Setup

### Before Live Trading:
1. **Verify API keys** are connected (✅ green status)
2. **Check exchange balance** appears correctly
3. **Wait for test signal** (or request one from support)
4. **Monitor your exchange** - trade should appear there
5. **Check CoinBitClub dashboard** - trade should be logged

---

## 🔧 Troubleshooting

### "API Key Verification Failed"
- ✅ Check API key has **trading permissions** enabled
- ✅ Verify you **copied entire key** (no spaces)
- ✅ Check **IP whitelist** settings (try unrestricted)
- ✅ Wait 2-3 minutes and try again
- ✅ Regenerate API key on exchange and try again

### "Insufficient Balance"
- ✅ Fund your exchange account with USDT
- ✅ Wait for deposit confirmation
- ✅ Check you're on the correct trading account (Unified Trading for Bybit)

### "Timestamp Error"
- ✅ Exchange server time mismatch
- ✅ Usually resolves automatically
- ✅ Contact support if persists

### "Order Rejected"
- ✅ Check minimum order size on exchange
- ✅ Verify you have enough balance
- ✅ Check symbol is supported (BTCUSDT, ETHUSDT, etc.)

---

## 📞 Need Help?

### CoinBitClub Support:
- Email: support@coinbitclub.com
- Telegram: @CoinBitClubSupport
- Dashboard: Help Center

### Exchange Support:
- **Bybit**: https://www.bybit.com/en-US/help-center/
- **Binance**: https://www.binance.com/en/support

---

## 📚 FAQ

### Q: Do you hold my funds?
**A**: No. Your funds stay in **your exchange account**. We only execute trades via API.

### Q: Can you withdraw my funds?
**A**: No. API keys are configured with **withdrawals disabled** for security.

### Q: What if I lose my API keys?
**A**: Revoke old keys on exchange, generate new keys, update CoinBitClub settings.

### Q: Can I use multiple exchanges?
**A**: Yes! Connect both Bybit and Binance. System will use the preferred one.

### Q: What happens if I disable API keys?
**A**: Trading stops immediately. Re-enable keys to resume.

### Q: Are my API keys encrypted?
**A**: Yes. We use **AES-256-GCM encryption** (bank-level security).

### Q: Can I see trades on my exchange?
**A**: Yes! All trades appear in your Bybit/Binance account in real-time.

### Q: What if exchange is down?
**A**: Trade will fail gracefully. You'll see error in dashboard. Try again when exchange recovers.

---

## 🎯 Summary

**To start trading with CoinBitClub**:

1. ✅ Create **Bybit** or **Binance** account
2. ✅ Generate **API keys** (trading enabled, withdrawals disabled)
3. ✅ Connect keys in **CoinBitClub → User Settings**
4. ✅ Fund your **exchange account** with USDT
5. ✅ Wait for **trading signals** from TradingView
6. ✅ Monitor **your exchange account** for trades

**You maintain full control. We provide signals and automation. Win-win! 🚀**
