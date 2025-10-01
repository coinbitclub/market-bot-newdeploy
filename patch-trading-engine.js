const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/trading/balance-based/balance-trading-engine.js');
const content = fs.readFileSync(filePath, 'utf8');

// Replace the test mode logic
const newContent = content.replace(
    /const isTestMode = process\.env\.NODE_ENV !== 'production';\s+if \(isTestMode\) \{\s+\/\/ Simulate trade execution in test mode\s+const simulatedResult = this\.simulateTradeExecution\(signal, aiDecision, positionSize\);\s+console\.log\(`🧪 TESTNET: Simulated trade for \$\{user\.username\}: \$\{simulatedResult\.message\}`\);\s+return simulatedResult;\s+\}/,
    `// Allow real API calls if ENABLE_REAL_TRADING is true OR if using testnet exchanges
            const isProductionMode = process.env.NODE_ENV === 'production';
            const enableRealTrading = process.env.ENABLE_REAL_TRADING === 'true';
            const usingTestnet = process.env.BYBIT_TESTNET === 'true' || process.env.BINANCE_TESTNET === 'true';

            const shouldSimulate = !isProductionMode && !enableRealTrading && !usingTestnet;

            if (shouldSimulate) {
                // Simulate trade execution only when not in production, real trading disabled, and not using testnet
                const simulatedResult = this.simulateTradeExecution(signal, aiDecision, positionSize);
                console.log(\`🧪 SIMULATED: Simulated trade for \${user.username}: \${simulatedResult.message}\`);
                return simulatedResult;
            }

            // Real trade execution using admin API keys (production OR testnet)
            console.log(\`🔥 REAL API CALL: Executing trade for \${user.username} on \${usingTestnet ? 'TESTNET' : 'PRODUCTION'}\`);`
);

fs.writeFileSync(filePath, newContent, 'utf8');
console.log('✅ Successfully patched balance-trading-engine.js');
