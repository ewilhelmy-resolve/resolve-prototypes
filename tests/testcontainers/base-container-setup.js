const { GenericContainer, Network, Wait } = require('testcontainers');
const { PostgreSqlContainer } = require('@testcontainers/postgresql');

class TestContainerSetup {
    constructor() {
        this.network = null;
        this.postgresContainer = null;
        this.redisContainer = null;
        this.containers = [];
    }

    /**
     * Initialize the complete container setup
     * @returns {Promise<{postgres: Object, redis: Object, network: Object}>}
     */
    async initialize() {
        try {
            console.log('🚀 Initializing test containers...');
            
            // Create dedicated test network
            this.network = await new Network().start();
            console.log('✅ Test network created');

            // Start PostgreSQL with pgvector extension
            this.postgresContainer = await this.createPostgresContainer();
            this.containers.push(this.postgresContainer);
            console.log('✅ PostgreSQL container started');

            // Start Redis container
            this.redisContainer = await this.createRedisContainer();
            this.containers.push(this.redisContainer);
            console.log('✅ Redis container started');

            // Wait for all services to be healthy
            await this.waitForHealthChecks();
            console.log('✅ All containers are healthy and ready');

            return {
                postgres: {
                    container: this.postgresContainer,
                    host: this.postgresContainer.getHost(),
                    port: this.postgresContainer.getPort(),
                    database: this.postgresContainer.getDatabase(),
                    username: this.postgresContainer.getUsername(),
                    password: this.postgresContainer.getPassword(),
                    connectionString: `postgresql://${this.postgresContainer.getUsername()}:${this.postgresContainer.getPassword()}@${this.postgresContainer.getHost()}:${this.postgresContainer.getPort()}/${this.postgresContainer.getDatabase()}`
                },
                redis: {
                    container: this.redisContainer,
                    host: this.redisContainer.getHost(),
                    port: this.redisContainer.getPort(),
                    connectionString: `redis://${this.redisContainer.getHost()}:${this.redisContainer.getPort()}`
                },
                network: this.network
            };
        } catch (error) {
            console.error('❌ Failed to initialize containers:', error);
            await this.cleanup();
            throw error;
        }
    }

    /**
     * Create PostgreSQL container with pgvector extension
     * @returns {Promise<PostgreSqlContainer>}
     */
    async createPostgresContainer() {
        const container = await new PostgreSqlContainer('pgvector/pgvector:pg16')
            .withDatabase('test_resolve_db')
            .withUsername('test_user')
            .withPassword('test_password')
            .withNetwork(this.network)
            .withNetworkAliases('postgres')
            .withExposedPorts(5432)
            .withEnvironment({
                'POSTGRES_INITDB_ARGS': '--encoding=UTF-8 --lc-collate=C --lc-ctype=C',
                'POSTGRES_HOST_AUTH_METHOD': 'trust'
            })
            .withWaitStrategy(
                Wait.forAll([
                    Wait.forListeningPorts(),
                    Wait.forLogMessage(/.*database system is ready to accept connections.*/, 2),
                    Wait.forHealthCheck()
                ]).withDeadline(60000)
            )
            .withHealthCheck({
                test: ['CMD-SHELL', 'pg_isready -U test_user -d test_resolve_db'],
                interval: 2000,
                timeout: 5000,
                retries: 10,
                startPeriod: 5000
            })
            .withStartupTimeout(60000)
            .start();

        // Verify pgvector extension is available
        await this.verifyPgvectorExtension(container);
        
        return container;
    }

    /**
     * Create Redis container
     * @returns {Promise<GenericContainer>}
     */
    async createRedisContainer() {
        const container = await new GenericContainer('redis:7.2-alpine')
            .withNetwork(this.network)
            .withNetworkAliases('redis')
            .withExposedPorts(6379)
            .withCommand(['redis-server', '--appendonly', 'yes'])
            .withWaitStrategy(
                Wait.forAll([
                    Wait.forListeningPorts(),
                    Wait.forLogMessage(/.*Ready to accept connections.*/)
                ]).withDeadline(30000)
            )
            .withHealthCheck({
                test: ['CMD', 'redis-cli', 'ping'],
                interval: 2000,
                timeout: 3000,
                retries: 5,
                startPeriod: 2000
            })
            .withStartupTimeout(30000)
            .start();

        return container;
    }

    /**
     * Verify pgvector extension is properly installed
     * @param {PostgreSqlContainer} container
     */
    async verifyPgvectorExtension(container) {
        const { Client } = require('pg');
        const client = new Client({
            host: container.getHost(),
            port: container.getPort(),
            database: container.getDatabase(),
            user: container.getUsername(),
            password: container.getPassword(),
        });

        try {
            await client.connect();
            
            // Create extension if not exists
            await client.query('CREATE EXTENSION IF NOT EXISTS vector;');
            
            // Verify extension is available
            const result = await client.query("SELECT * FROM pg_extension WHERE extname = 'vector';");
            if (result.rows.length === 0) {
                throw new Error('pgvector extension is not available');
            }
            
            console.log('✅ pgvector extension verified');
        } catch (error) {
            console.error('❌ pgvector verification failed:', error);
            throw error;
        } finally {
            await client.end();
        }
    }

    /**
     * Wait for all containers to pass health checks
     */
    async waitForHealthChecks() {
        const maxAttempts = 30;
        const delayMs = 2000;
        
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                // Check PostgreSQL
                const pgHealth = await this.checkPostgresHealth();
                
                // Check Redis
                const redisHealth = await this.checkRedisHealth();
                
                if (pgHealth && redisHealth) {
                    console.log(`✅ All health checks passed on attempt ${attempt}`);
                    return;
                }
                
                console.log(`⏳ Health check attempt ${attempt}/${maxAttempts} - PostgreSQL: ${pgHealth ? '✅' : '❌'}, Redis: ${redisHealth ? '✅' : '❌'}`);
                
                if (attempt < maxAttempts) {
                    await new Promise(resolve => setTimeout(resolve, delayMs));
                }
            } catch (error) {
                console.log(`⏳ Health check attempt ${attempt}/${maxAttempts} failed:`, error.message);
                if (attempt < maxAttempts) {
                    await new Promise(resolve => setTimeout(resolve, delayMs));
                }
            }
        }
        
        throw new Error('Health checks failed after maximum attempts');
    }

    /**
     * Check PostgreSQL health
     */
    async checkPostgresHealth() {
        const { Client } = require('pg');
        const client = new Client({
            host: this.postgresContainer.getHost(),
            port: this.postgresContainer.getPort(),
            database: this.postgresContainer.getDatabase(),
            user: this.postgresContainer.getUsername(),
            password: this.postgresContainer.getPassword(),
            connectionTimeoutMillis: 5000,
        });

        try {
            await client.connect();
            await client.query('SELECT 1');
            await client.end();
            return true;
        } catch (error) {
            try {
                await client.end();
            } catch (e) {
                // Ignore cleanup errors
            }
            return false;
        }
    }

    /**
     * Check Redis health
     */
    async checkRedisHealth() {
        const redis = require('redis');
        const client = redis.createClient({
            socket: {
                host: this.redisContainer.getHost(),
                port: this.redisContainer.getPort(),
                connectTimeout: 5000
            }
        });

        try {
            await client.connect();
            await client.ping();
            await client.quit();
            return true;
        } catch (error) {
            try {
                await client.quit();
            } catch (e) {
                // Ignore cleanup errors
            }
            return false;
        }
    }

    /**
     * Get environment variables for the test application
     */
    getEnvironmentVariables() {
        if (!this.postgresContainer || !this.redisContainer) {
            throw new Error('Containers not initialized. Call initialize() first.');
        }

        return {
            // Database configuration
            POSTGRES_HOST: this.postgresContainer.getHost(),
            POSTGRES_PORT: this.postgresContainer.getPort().toString(),
            POSTGRES_DB: this.postgresContainer.getDatabase(),
            POSTGRES_USER: this.postgresContainer.getUsername(),
            POSTGRES_PASSWORD: this.postgresContainer.getPassword(),
            DATABASE_URL: `postgresql://${this.postgresContainer.getUsername()}:${this.postgresContainer.getPassword()}@${this.postgresContainer.getHost()}:${this.postgresContainer.getPort()}/${this.postgresContainer.getDatabase()}`,
            
            // Redis configuration
            REDIS_HOST: this.redisContainer.getHost(),
            REDIS_PORT: this.redisContainer.getPort().toString(),
            REDIS_URL: `redis://${this.redisContainer.getHost()}:${this.redisContainer.getPort()}`,
            
            // Test environment settings
            NODE_ENV: 'test',
            PORT: '0', // Let the system assign a port
            SESSION_SECRET: 'test-session-secret-key-for-testing-only'
        };
    }

    /**
     * Clean up all containers and networks
     */
    async cleanup() {
        console.log('🧹 Cleaning up test containers...');
        
        const cleanupPromises = [];
        
        // Stop all containers
        for (const container of this.containers) {
            if (container) {
                cleanupPromises.push(
                    container.stop().catch(error => {
                        console.warn('Warning: Failed to stop container:', error.message);
                    })
                );
            }
        }
        
        // Stop network
        if (this.network) {
            cleanupPromises.push(
                this.network.stop().catch(error => {
                    console.warn('Warning: Failed to stop network:', error.message);
                })
            );
        }
        
        await Promise.all(cleanupPromises);
        
        // Reset state
        this.containers = [];
        this.postgresContainer = null;
        this.redisContainer = null;
        this.network = null;
        
        console.log('✅ Cleanup completed');
    }

    /**
     * Execute SQL directly against the test database
     */
    async executeSQL(sql, params = []) {
        if (!this.postgresContainer) {
            throw new Error('PostgreSQL container not initialized');
        }

        const { Client } = require('pg');
        const client = new Client({
            host: this.postgresContainer.getHost(),
            port: this.postgresContainer.getPort(),
            database: this.postgresContainer.getDatabase(),
            user: this.postgresContainer.getUsername(),
            password: this.postgresContainer.getPassword(),
        });

        try {
            await client.connect();
            const result = await client.query(sql, params);
            return result;
        } finally {
            await client.end();
        }
    }

    /**
     * Execute Redis command
     */
    async executeRedisCommand(command, ...args) {
        if (!this.redisContainer) {
            throw new Error('Redis container not initialized');
        }

        const redis = require('redis');
        const client = redis.createClient({
            socket: {
                host: this.redisContainer.getHost(),
                port: this.redisContainer.getPort()
            }
        });

        try {
            await client.connect();
            const result = await client[command](...args);
            return result;
        } finally {
            await client.quit();
        }
    }
}

module.exports = TestContainerSetup;