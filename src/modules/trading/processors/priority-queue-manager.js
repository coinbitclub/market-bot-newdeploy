/**
 * 🎯 PRIORITY QUEUE MANAGER
 * Global priority queue system for managing trading operations
 * Management API keys get priority over Testnet keys
 */

const EventEmitter = require('events');

class PriorityQueueManager extends EventEmitter {
    constructor() {
        super();
        this.queue = [];
        this.processing = false;
        this.operationCounter = 0;

        // Priority levels
        this.PRIORITY_LEVELS = {
            CRITICAL: 1000,     // Emergency operations
            HIGH: 500,          // Management API operations
            MEDIUM: 100,        // Standard operations
            LOW: 50,            // Testnet operations
            VERY_LOW: 10        // Background tasks
        };

        console.log('🎯 Priority Queue Manager initialized');
        console.log('Priority levels:', this.PRIORITY_LEVELS);
    }

    /**
     * Add operation to priority queue
     * @param {Object} operation - Operation details
     * @returns {string} Operation ID
     */
    async addOperation(operation) {
        const operationId = `OP_${Date.now()}_${++this.operationCounter}`;

        const queueItem = {
            id: operationId,
            priority: this._calculatePriority(operation),
            operation: operation,
            createdAt: Date.now(),
            status: 'queued'
        };

        // Insert operation in priority order (higher priority first)
        const insertIndex = this.queue.findIndex(item => item.priority < queueItem.priority);
        if (insertIndex === -1) {
            this.queue.push(queueItem);
        } else {
            this.queue.splice(insertIndex, 0, queueItem);
        }

        console.log(`🎯 Operation queued: ${operationId} (priority: ${queueItem.priority})`);
        console.log(`📊 Queue size: ${this.queue.length}`);

        // Start processing if not already running
        if (!this.processing) {
            this.startProcessing();
        }

        return operationId;
    }

    /**
     * Calculate priority based on operation type and context
     */
    _calculatePriority(operation) {
        // Default priority
        let basePriority = this.PRIORITY_LEVELS.MEDIUM;

        // Determine priority based on operation type
        if (operation.type === 'emergency') {
            basePriority = this.PRIORITY_LEVELS.CRITICAL;
        } else if (operation.type === 'management_trade' || operation.user_type === 'MANAGEMENT') {
            basePriority = this.PRIORITY_LEVELS.HIGH;
        } else if (operation.type === 'testnet_trade' || operation.user_type === 'TESTNET') {
            basePriority = this.PRIORITY_LEVELS.LOW;
        } else if (operation.type === 'multi_user_signal_processing') {
            basePriority = this.PRIORITY_LEVELS.HIGH; // Multi-user signals are high priority
        }

        // Add time-based micro-adjustments (older operations get slight priority boost)
        const ageBonus = Math.min(50, Math.floor((Date.now() - (operation.created_at || Date.now())) / 1000));

        return basePriority + ageBonus;
    }

    /**
     * Start processing queue
     */
    async startProcessing() {
        if (this.processing) {
            console.log('⚠️ Queue processing already running');
            return;
        }

        this.processing = true;
        console.log('🚀 Starting queue processing...');

        while (this.queue.length > 0) {
            const queueItem = this.queue.shift(); // Get highest priority item (first in sorted array)

            try {
                console.log(`⚡ Processing operation: ${queueItem.id} (priority: ${queueItem.priority})`);
                queueItem.status = 'processing';

                // Execute the operation
                const result = await this._executeOperation(queueItem.operation);

                queueItem.status = 'completed';
                queueItem.result = result;
                queueItem.completedAt = Date.now();

                // Emit completion event
                this.emit('operation_completed', {
                    id: queueItem.id,
                    operation: queueItem.operation,
                    result: result,
                    duration: queueItem.completedAt - queueItem.createdAt
                });

                console.log(`✅ Operation completed: ${queueItem.id} (took ${queueItem.completedAt - queueItem.createdAt}ms)`);

            } catch (error) {
                console.error(`❌ Operation failed: ${queueItem.id}`, error.message);
                queueItem.status = 'failed';
                queueItem.error = error.message;

                this.emit('operation_failed', {
                    id: queueItem.id,
                    operation: queueItem.operation,
                    error: error.message
                });
            }

            // Small delay between operations to prevent overwhelming the system
            await this._delay(100);
        }

        this.processing = false;
        console.log('✅ Queue processing completed');
    }

    /**
     * Execute individual operation
     */
    async _executeOperation(operation) {
        // If operation has a processor, delegate to it
        if (operation.processor && typeof operation.processor.processSignal === 'function') {
            return await operation.processor.processSignal(operation.signal_data);
        }

        // If operation has a custom handler
        if (typeof operation.handler === 'function') {
            return await operation.handler(operation);
        }

        // Default: just log
        console.log('📊 Executing operation:', operation.type);
        return { success: true, message: 'Operation executed' };
    }

    /**
     * Get queue status
     */
    getQueueStatus() {
        return {
            queueSize: this.queue.length,
            processing: this.processing,
            operations: this.queue.map(item => ({
                id: item.id,
                type: item.operation.type,
                priority: item.priority,
                status: item.status,
                age: Date.now() - item.createdAt
            }))
        };
    }

    /**
     * Restart processing (if stopped)
     */
    restartProcessing() {
        if (!this.processing && this.queue.length > 0) {
            console.log('🔄 Restarting queue processing...');
            this.startProcessing();
        } else if (this.processing) {
            console.log('✅ Queue processing already running');
        } else {
            console.log('📭 Queue is empty, nothing to process');
        }
    }

    /**
     * Clear queue
     */
    clearQueue() {
        const cleared = this.queue.length;
        this.queue = [];
        console.log(`🗑️ Cleared ${cleared} operations from queue`);
        return cleared;
    }

    /**
     * Get operation by ID
     */
    getOperation(operationId) {
        return this.queue.find(item => item.id === operationId);
    }

    /**
     * Remove operation by ID
     */
    removeOperation(operationId) {
        const index = this.queue.findIndex(item => item.id === operationId);
        if (index !== -1) {
            const removed = this.queue.splice(index, 1)[0];
            console.log(`🗑️ Removed operation: ${operationId}`);
            return removed;
        }
        return null;
    }

    /**
     * Helper delay function
     */
    _delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = PriorityQueueManager;
