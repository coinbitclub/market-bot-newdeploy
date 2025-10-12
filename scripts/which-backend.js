#!/usr/bin/env node

/**
 * Check which backend the frontend is calling
 */

require('dotenv').config({ path: '../.env' });

console.log('\n===================================================');
console.log(' BACKEND CONFIGURATION CHECK');
console.log('===================================================\n');

const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';

console.log('Backend URL from .env:');
console.log('  NEXT_PUBLIC_API_URL =', backendUrl);
console.log();

if (backendUrl.includes('localhost') || backendUrl.includes('127.0.0.1')) {
    console.log('✅ Frontend is configured to call: LOCALHOST');
    console.log('   The test script and frontend are calling the SAME backend.');
    console.log();
    console.log('   If test script works but frontend doesn\'t:');
    console.log('   1. Check browser console for exact error');
    console.log('   2. Verify token is valid');
    console.log('   3. Check CORS settings');
    console.log();
} else {
    console.log('⚠️  Frontend is configured to call: PRODUCTION');
    console.log('   URL:', backendUrl);
    console.log();
    console.log('   IMPORTANT:');
    console.log('   ============================================');
    console.log('   The test script calls: LOCALHOST backend');
    console.log('   The frontend calls: PRODUCTION backend');
    console.log('   ============================================');
    console.log();
    console.log('   If test script works but frontend doesn\'t,');
    console.log('   it means:');
    console.log('   ✅ Localhost backend has the fixes');
    console.log('   ❌ Production backend needs to be updated');
    console.log();
    console.log('   SOLUTION:');
    console.log('   Deploy the updated backend code to production!');
    console.log('   (Render.com will auto-deploy on git push)');
    console.log();
}

console.log('===================================================\n');

