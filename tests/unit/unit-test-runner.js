/**
 * 🔬 TESTES UNITÁRIOS - TEMPLATE
 * Testes automáticos para validação de unidades
 */

const assert = require('assert');

class UnitTestRunner {
    constructor(serviceName) {
        this.serviceName = serviceName;
        this.tests = [];
        this.results = { passed: 0, failed: 0, errors: [] };
    }

    // Test framework básico
    test(description, testFunction) {
        this.tests.push({ description, testFunction });
    }

    async runAllTests() {
        console.log(`🔬 Executando testes unitários: ${this.serviceName}`);
        
        for (const test of this.tests) {
            try {
                await test.testFunction();
                this.results.passed++;
                console.log(`   ✅ ${test.description}`);
            } catch (error) {
                this.results.failed++;
                this.results.errors.push({
                    test: test.description,
                    error: error.message
                });
                console.log(`   ❌ ${test.description}: ${error.message}`);
            }
        }

        return {
            success: this.results.failed === 0,
            tests: this.results.passed,
            failures: this.results.failed,
            errors: this.results.errors
        };
    }

    // Assertions helpers
    assertEqual(actual, expected, message = '') {
        assert.strictEqual(actual, expected, message);
    }

    assertTrue(condition, message = '') {
        assert.ok(condition, message);
    }

    assertFalse(condition, message = '') {
        assert.ok(!condition, message);
    }

    async assertThrows(asyncFunction, expectedError = null) {
        try {
            await asyncFunction();
            throw new Error('Expected function to throw');
        } catch (error) {
            if (expectedError && !error.message.includes(expectedError)) {
                throw new Error(`Expected error containing '${expectedError}', got '${error.message}'`);
            }
        }
    }
}

module.exports = UnitTestRunner;