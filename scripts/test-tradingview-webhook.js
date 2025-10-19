#!/usr/bin/env node

/**
 * Test TradingView Webhook with different data formats
 */

const axios = require('axios');

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';
const WEBHOOK_URL = `${API_BASE_URL}/api/tradingview/signal`;

// Sample TradingView signal
const signalData = {
    action: 'buy',
    symbol: 'BTCUSDT',
    exchange: 'binance',
    price: 45000,
    timestamp: new Date().toISOString()
};

async function testWebhook() {
    console.log('\n===============================================');
    console.log(' TESTING TRADINGVIEW WEBHOOK - ALL FORMATS');
    console.log('===============================================\n');

    // Test 1: JSON object (application/json)
    console.log('Test 1: Sending as JSON object...');
    try {
        const response1 = await axios.post(WEBHOOK_URL, signalData, {
            headers: { 'Content-Type': 'application/json' }
        });
        console.log('✅ JSON object test passed:', response1.status);
    } catch (error) {
        console.log('❌ JSON object test failed:', error.response?.status, error.response?.data);
    }

    console.log('\n-----------------------------------------------\n');

    // Test 2: JSON string (text/plain)
    console.log('Test 2: Sending as JSON string (text/plain)...');
    try {
        const response2 = await axios.post(WEBHOOK_URL, JSON.stringify(signalData), {
            headers: { 'Content-Type': 'text/plain' }
        });
        console.log('✅ JSON string test passed:', response2.status);
    } catch (error) {
        console.log('❌ JSON string test failed:', error.response?.status, error.response?.data);
    }

    console.log('\n-----------------------------------------------\n');

    // Test 3: URL-encoded with text field
    console.log('Test 3: Sending as URL-encoded (text parameter)...');
    try {
        const params = new URLSearchParams();
        params.append('text', JSON.stringify(signalData));
        
        const response3 = await axios.post(WEBHOOK_URL, params.toString(), {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });
        console.log('✅ URL-encoded test passed:', response3.status);
    } catch (error) {
        console.log('❌ URL-encoded test failed:', error.response?.status, error.response?.data);
    }

    console.log('\n===============================================');
    console.log(' TEST COMPLETED');
    console.log('===============================================\n');
}

// Run tests
testWebhook().catch(console.error);


