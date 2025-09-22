/**
 * 🔧 FIX AUTH DATABASE QUERIES
 * Script to fix all database queries in auth routes
 */

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/routes/auth.js');

// Read the file
let content = fs.readFileSync(filePath, 'utf8');

// Replace all instances of getConnection and db.query
content = content.replace(/const db = await this\.dbPoolManager\.getConnection\(\);[\s\S]*?const userResult = await db\.query\(/g, 
    'const userResult = await this.dbPoolManager.executeRead(');

content = content.replace(/const db = await this\.dbPoolManager\.getConnection\(\);[\s\S]*?const existingUser = await db\.query\(/g, 
    'const existingUser = await this.dbPoolManager.executeRead(');

content = content.replace(/const db = await this\.dbPoolManager\.getConnection\(\);[\s\S]*?const existingCode = await db\.query\(/g, 
    'const existingCode = await this.dbPoolManager.executeRead(');

content = content.replace(/const db = await this\.dbPoolManager\.getConnection\(\);[\s\S]*?const newUser = await db\.query\(/g, 
    'const newUser = await this.dbPoolManager.executeWrite(');

content = content.replace(/const db = await this\.dbPoolManager\.getConnection\(\);[\s\S]*?const sessionsResult = await db\.query\(/g, 
    'const sessionsResult = await this.dbPoolManager.executeRead(');

// Replace remaining db.query calls
content = content.replace(/await db\.query\(/g, 'await this.dbPoolManager.executeWrite(');

// Replace specific read operations
content = content.replace(/await this\.dbPoolManager\.executeWrite\(\s*'SELECT/g, 'await this.dbPoolManager.executeRead(\'SELECT');

// Write back to file
fs.writeFileSync(filePath, content);

console.log('✅ Fixed all database queries in auth routes');
