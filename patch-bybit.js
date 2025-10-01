const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/services/exchange/bybit-service.js');
const content = fs.readFileSync(filePath, 'utf8');

// Find and replace the specific lines
const newContent = content.replace(
    /this\.isTestnet = process\.env\.BYBIT_TESTNET === 'true';\s+this\.apiKey = process\.env\.BYBIT_API_KEY;\s+this\.apiSecret = process\.env\.BYBIT_API_SECRET;/,
    `this.isTestnet = process.env.BYBIT_TESTNET === 'true';

        // Use test credentials when in testnet mode
        if (this.isTestnet) {
            this.apiKey = process.env.BYBIT_TEST_API_KEY || process.env.BYBIT_API_KEY;
            this.apiSecret = process.env.BYBIT_TEST_API_SECRET || process.env.BYBIT_API_SECRET;
        } else {
            this.apiKey = process.env.BYBIT_API_KEY;
            this.apiSecret = process.env.BYBIT_API_SECRET;
        }`
);

// Add logging after the existing console.log
const finalContent = newContent.replace(
    /console\.log\(`🔥 Bybit Service initialized - \$\{this\.isTestnet \? 'TESTNET' : 'MAINNET'\}`\);/,
    `console.log(\`🔥 Bybit Service initialized - \${this.isTestnet ? 'TESTNET' : 'MAINNET'}\`);
        if (this.isTestnet && this.apiKey) {
            console.log(\`🔑 Using Bybit testnet API key: \${this.apiKey.substring(0, 8)}...\`);
        }`
);

fs.writeFileSync(filePath, finalContent, 'utf8');
console.log('✅ Successfully patched bybit-service.js');
