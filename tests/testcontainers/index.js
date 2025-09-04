/**
 * Testcontainers Infrastructure for No-Mocks Test Suite
 * 
 * This module provides a complete, containerized testing environment
 * using real PostgreSQL (with pgvector) and Redis instances.
 * 
 * Usage:
 * 
 * ```javascript
 * const { TestContainerSetup, DataSeeder, TestHelpers } = require('./tests/testcontainers');
 * 
 * // Initialize containers
 * const containerSetup = new TestContainerSetup();
 * const containers = await containerSetup.initialize();
 * 
 * // Initialize database schema and seed data
 * const seeder = new DataSeeder(containerSetup);
 * await seeder.initializeSchema();
 * const testData = await seeder.seedTestData();
 * 
 * // Use helpers for testing
 * const helpers = new TestHelpers(containerSetup);
 * const testUser = await helpers.findUserByEmail('admin@test.com');
 * 
 * // Clean up
 * await containerSetup.cleanup();
 * ```
 */

const TestContainerSetup = require('./base-container-setup');
const DataSeeder = require('./data-seeding');
const TestHelpers = require('./test-helpers');

/**
 * Complete test environment setup class
 * Combines container setup, data seeding, and helpers into a single interface
 */
class TestEnvironment {
    constructor() {
        this.containerSetup = new TestContainerSetup();
        this.seeder = null;
        this.helpers = null;
        this.isInitialized = false;
    }

    /**
     * Initialize the complete test environment
     * @param {Object} options - Configuration options
     * @param {boolean} options.seedData - Whether to seed test data (default: true)
     * @param {boolean} options.clearFirst - Whether to clear existing data first (default: true)
     * @returns {Promise<Object>} - Environment details and test data
     */
    async initialize(options = {}) {
        const { seedData = true, clearFirst = true } = options;

        if (this.isInitialized) {
            throw new Error('Test environment already initialized');
        }

        console.log('🚀 Initializing complete test environment...');

        try {
            // Start containers
            const containers = await this.containerSetup.initialize();
            console.log('✅ Containers started');

            // Initialize helpers and seeder
            this.helpers = new TestHelpers(this.containerSetup);
            this.seeder = new DataSeeder(this.containerSetup);

            // Initialize database schema
            await this.seeder.initializeSchema();
            console.log('✅ Database schema initialized');

            let testData = null;
            if (seedData) {
                testData = await this.seeder.seedTestData();
                console.log('✅ Test data seeded');
            } else if (clearFirst) {
                await this.seeder.clearAllData();
                console.log('✅ Database cleared');
            }

            this.isInitialized = true;
            console.log('🎉 Test environment ready');

            return {
                containers,
                testData,
                environment: this.helpers.getTestEnvironment(),
                connectionDetails: {
                    postgres: this.helpers.getDatabaseConfig(),
                    redis: this.helpers.getRedisConfig()
                }
            };

        } catch (error) {
            console.error('❌ Test environment initialization failed:', error);
            await this.cleanup();
            throw error;
        }
    }

    /**
     * Clean up the entire test environment
     */
    async cleanup() {
        console.log('🧹 Cleaning up test environment...');

        try {
            if (this.helpers) {
                await this.helpers.closePersistentConnections();
            }
        } catch (error) {
            console.warn('Warning: Failed to close helper connections:', error.message);
        }

        try {
            await this.containerSetup.cleanup();
        } catch (error) {
            console.warn('Warning: Failed to cleanup containers:', error.message);
        }

        this.seeder = null;
        this.helpers = null;
        this.isInitialized = false;
        console.log('✅ Test environment cleanup completed');
    }

    /**
     * Reset the test environment to a clean state
     * Clears all data and re-seeds if requested
     */
    async reset(options = { seedData: true }) {
        if (!this.isInitialized) {
            throw new Error('Test environment not initialized');
        }

        console.log('🔄 Resetting test environment...');

        await this.seeder.clearAllData();
        
        let testData = null;
        if (options.seedData) {
            testData = await this.seeder.seedTestData();
            console.log('✅ Test environment reset with fresh data');
        } else {
            console.log('✅ Test environment reset to clean state');
        }

        return testData;
    }

    /**
     * Check if the environment is healthy and ready for testing
     */
    async healthCheck() {
        if (!this.isInitialized || !this.helpers) {
            return { healthy: false, reason: 'Not initialized' };
        }

        try {
            const health = await this.helpers.checkHealth();
            return {
                healthy: health.overall,
                postgres: health.postgres,
                redis: health.redis,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            return {
                healthy: false,
                reason: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * Get resource usage statistics
     */
    async getResourceUsage() {
        if (!this.helpers) {
            throw new Error('Test environment not initialized');
        }
        return await this.helpers.getResourceUsage();
    }
}

module.exports = {
    TestContainerSetup,
    DataSeeder,
    TestHelpers,
    TestEnvironment
};