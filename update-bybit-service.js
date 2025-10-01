const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/services/exchange/bybit-service.js');
let content = fs.readFileSync(filePath, 'utf8');

// Replace the constructor section
const oldConstructor = `    constructor() {
        this.baseURL = 'https://api.bybit.com';
        this.testnetURL = 'https://api-testnet.bybit.com';
        this.isTestnet = process.env.BYBIT_TESTNET === 'true';
        this.apiKey = process.env.BYBIT_API_KEY;
        this.apiSecret = process.env.BYBIT_API_SECRET;

        this.currentURL = this.isTestnet ? this.testnetURL : this.baseURL;

        console.log(\`🔥 Bybit Service initialized - \${this.isTestnet ? 'TESTNET' : 'MAINNET'}\`);
    }`;

const newConstructor = `    constructor() {
        this.baseURL = 'https://api.bybit.com';
        this.testnetURL = 'https://api-testnet.bybit.com';
        this.isTestnet = process.env.BYBIT_TESTNET === 'true';

        // Use test credentials when in testnet mode
        if (this.isTestnet) {
            this.apiKey = process.env.BYBIT_TEST_API_KEY || process.env.BYBIT_API_KEY;
            this.apiSecret = process.env.BYBIT_TEST_API_SECRET || process.env.BYBIT_API_SECRET;
        } else {
            this.apiKey = process.env.BYBIT_API_KEY;
            this.apiSecret = process.env.BYBIT_API_SECRET;
        }

        this.currentURL = this.isTestnet ? this.testnetURL : this.baseURL;

        console.log(\`🔥 Bybit Service initialized - \${this.isTestnet ? 'TESTNET' : 'MAINNET'}\`);
        if (this.isTestnet && this.apiKey) {
            console.log(\`🔑 Using Bybit testnet API key: \${this.apiKey.substring(0, 8)}...\`);
        }
    }`;

content = content.replace(oldConstructor, newConstructor);

fs.writeFileSync(filePath, content, 'utf8');
console.log('✅ Updated bybit-service.js with testnet API key configuration');
