#!/usr/bin/env node

const { Pool } = require('pg');
require('dotenv').config();

async function checkConstraints() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });

    try {
        console.log('🔍 Checking table constraints...');

        // Get all constraints for user_api_keys table
        const constraints = await pool.query(`
            SELECT
                tc.constraint_name,
                tc.constraint_type,
                cc.check_clause
            FROM information_schema.table_constraints tc
            LEFT JOIN information_schema.check_constraints cc
                ON tc.constraint_name = cc.constraint_name
            WHERE tc.table_name = 'user_api_keys'
            AND tc.table_schema = 'public'
            ORDER BY tc.constraint_type, tc.constraint_name
        `);

        console.log('\n📋 Constraints on user_api_keys table:');
        console.table(constraints.rows);

        // Specifically look for the exchange constraint
        const exchangeConstraint = constraints.rows.find(c => c.constraint_name === 'chk_exchange');
        if (exchangeConstraint) {
            console.log('\n🔍 Exchange constraint details:');
            console.log('Constraint name:', exchangeConstraint.constraint_name);
            console.log('Check clause:', exchangeConstraint.check_clause);
        }

    } catch (error) {
        console.error('❌ Error checking constraints:', error.message);
    } finally {
        await pool.end();
    }
}

checkConstraints();