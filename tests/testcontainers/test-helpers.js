const { Client } = require('pg');
const redis = require('redis');

class TestHelpers {
    constructor(containerSetup) {
        this.containerSetup = containerSetup;
        this._pgClient = null;
        this._redisClient = null;
    }

    /**
     * Get database connection details
     */
    getDatabaseConfig() {
        if (!this.containerSetup.postgresContainer) {
            throw new Error('PostgreSQL container not initialized');
        }

        return {
            host: this.containerSetup.postgresContainer.getHost(),
            port: this.containerSetup.postgresContainer.getPort(),
            database: this.containerSetup.postgresContainer.getDatabase(),
            user: this.containerSetup.postgresContainer.getUsername(),
            password: this.containerSetup.postgresContainer.getPassword(),
            connectionString: `postgresql://${this.containerSetup.postgresContainer.getUsername()}:${this.containerSetup.postgresContainer.getPassword()}@${this.containerSetup.postgresContainer.getHost()}:${this.containerSetup.postgresContainer.getPort()}/${this.containerSetup.postgresContainer.getDatabase()}`
        };
    }

    /**
     * Get Redis connection details
     */
    getRedisConfig() {
        if (!this.containerSetup.redisContainer) {
            throw new Error('Redis container not initialized');
        }

        return {
            host: this.containerSetup.redisContainer.getHost(),
            port: this.containerSetup.redisContainer.getPort(),
            connectionString: `redis://${this.containerSetup.redisContainer.getHost()}:${this.containerSetup.redisContainer.getPort()}`
        };
    }

    /**
     * Get environment variables for test application
     */
    getTestEnvironment() {
        return this.containerSetup.getEnvironmentVariables();
    }

    /**
     * Get a persistent PostgreSQL client connection
     * Use this for tests that need to maintain state across multiple queries
     */
    async getPersistentPgClient() {
        if (!this._pgClient) {
            const config = this.getDatabaseConfig();
            this._pgClient = new Client({
                host: config.host,
                port: config.port,
                database: config.database,
                user: config.user,
                password: config.password,
            });
            await this._pgClient.connect();
        }
        return this._pgClient;
    }

    /**
     * Get a persistent Redis client connection
     * Use this for tests that need to maintain state across multiple operations
     */
    async getPersistentRedisClient() {
        if (!this._redisClient) {
            const config = this.getRedisConfig();
            this._redisClient = redis.createClient({
                socket: {
                    host: config.host,
                    port: config.port
                }
            });
            await this._redisClient.connect();
        }
        return this._redisClient;
    }

    /**
     * Close persistent connections (call in test cleanup)
     */
    async closePersistentConnections() {
        if (this._pgClient) {
            await this._pgClient.end();
            this._pgClient = null;
        }
        if (this._redisClient) {
            await this._redisClient.quit();
            this._redisClient = null;
        }
    }

    /**
     * Execute a single database query with automatic connection management
     */
    async executeQuery(sql, params = []) {
        return await this.containerSetup.executeSQL(sql, params);
    }

    /**
     * Execute multiple database queries in a transaction
     */
    async executeTransaction(queries) {
        const client = await this.getPersistentPgClient();
        
        try {
            await client.query('BEGIN');
            const results = [];
            
            for (const query of queries) {
                const result = await client.query(query.sql, query.params || []);
                results.push(result);
            }
            
            await client.query('COMMIT');
            return results;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        }
    }

    /**
     * Execute a Redis command with automatic connection management
     */
    async executeRedisCommand(command, ...args) {
        return await this.containerSetup.executeRedisCommand(command, ...args);
    }

    /**
     * Database helper methods
     */

    /**
     * Find user by email
     */
    async findUserByEmail(email) {
        const result = await this.executeQuery(
            'SELECT * FROM users WHERE email = $1',
            [email]
        );
        return result.rows[0];
    }

    /**
     * Find user by ID
     */
    async findUserById(userId) {
        const result = await this.executeQuery(
            'SELECT * FROM users WHERE id = $1',
            [userId]
        );
        return result.rows[0];
    }

    /**
     * Get user session by token
     */
    async getSessionByToken(token) {
        const result = await this.executeQuery(
            `SELECT s.*, u.email, u.full_name, u.tier, u.tenant_id 
             FROM sessions s 
             JOIN users u ON s.user_id = u.id 
             WHERE s.token = $1 AND s.expires_at > NOW()`,
            [token]
        );
        return result.rows[0];
    }

    /**
     * Get user integrations
     */
    async getUserIntegrations(userId) {
        const result = await this.executeQuery(
            'SELECT * FROM integrations WHERE user_id = $1 ORDER BY created_at',
            [userId]
        );
        return result.rows;
    }

    /**
     * Get user tickets
     */
    async getUserTickets(userId) {
        const result = await this.executeQuery(
            'SELECT * FROM tickets WHERE user_id = $1 ORDER BY created_at DESC',
            [userId]
        );
        return result.rows;
    }

    /**
     * Get RAG documents for tenant
     */
    async getRAGDocuments(tenantId) {
        const result = await this.executeQuery(
            'SELECT * FROM rag_documents WHERE tenant_id = $1 ORDER BY created_at',
            [tenantId]
        );
        return result.rows;
    }

    /**
     * Get RAG vectors for document
     */
    async getRAGVectors(documentId) {
        const result = await this.executeQuery(
            'SELECT * FROM rag_vectors WHERE document_id = $1 ORDER BY chunk_index',
            [documentId]
        );
        return result.rows;
    }

    /**
     * Get conversation messages
     */
    async getConversationMessages(conversationId) {
        const result = await this.executeQuery(
            'SELECT * FROM rag_messages WHERE conversation_id = $1 ORDER BY created_at',
            [conversationId]
        );
        return result.rows;
    }

    /**
     * Count records in a table
     */
    async countRecords(tableName, whereClause = '', params = []) {
        let sql = `SELECT COUNT(*) as count FROM ${tableName}`;
        if (whereClause) {
            sql += ` WHERE ${whereClause}`;
        }
        const result = await this.executeQuery(sql, params);
        return parseInt(result.rows[0].count);
    }

    /**
     * Redis helper methods
     */

    /**
     * Get session data from Redis
     */
    async getRedisSession(token) {
        const sessionData = await this.executeRedisCommand('GET', `session:${token}`);
        return sessionData ? JSON.parse(sessionData) : null;
    }

    /**
     * Set session data in Redis
     */
    async setRedisSession(token, sessionData, expireSeconds = 86400) {
        await this.executeRedisCommand('SET', `session:${token}`, JSON.stringify(sessionData));
        await this.executeRedisCommand('EXPIRE', `session:${token}`, expireSeconds);
    }

    /**
     * Get user's last seen timestamp
     */
    async getUserLastSeen(userId) {
        return await this.executeRedisCommand('GET', `user:${userId}:last_seen`);
    }

    /**
     * Set user's last seen timestamp
     */
    async setUserLastSeen(userId, timestamp = new Date().toISOString()) {
        await this.executeRedisCommand('SET', `user:${userId}:last_seen`, timestamp);
        await this.executeRedisCommand('EXPIRE', `user:${userId}:last_seen`, 3600);
    }

    /**
     * Get rate limit count for user
     */
    async getRateLimitCount(email) {
        const count = await this.executeRedisCommand('GET', `rate_limit:${email}`);
        return count ? parseInt(count) : 0;
    }

    /**
     * Increment rate limit for user
     */
    async incrementRateLimit(email, expireSeconds = 3600) {
        const key = `rate_limit:${email}`;
        await this.executeRedisCommand('INCR', key);
        await this.executeRedisCommand('EXPIRE', key, expireSeconds);
    }

    /**
     * Get cached data
     */
    async getCachedData(key) {
        const data = await this.executeRedisCommand('GET', key);
        return data ? JSON.parse(data) : null;
    }

    /**
     * Set cached data
     */
    async setCachedData(key, data, expireSeconds = 1800) {
        await this.executeRedisCommand('SET', key, JSON.stringify(data));
        await this.executeRedisCommand('EXPIRE', key, expireSeconds);
    }

    /**
     * Clear all Redis data
     */
    async clearRedisData() {
        await this.executeRedisCommand('FLUSHDB');
    }

    /**
     * Test utility methods
     */

    /**
     * Wait for a condition to be true
     */
    async waitForCondition(conditionFn, timeoutMs = 10000, intervalMs = 100) {
        const startTime = Date.now();
        
        while (Date.now() - startTime < timeoutMs) {
            try {
                const result = await conditionFn();
                if (result) {
                    return result;
                }
            } catch (error) {
                // Condition function failed, continue waiting
            }
            
            await new Promise(resolve => setTimeout(resolve, intervalMs));
        }
        
        throw new Error(`Condition not met within ${timeoutMs}ms timeout`);
    }

    /**
     * Wait for database record to exist
     */
    async waitForRecord(tableName, whereClause, params = [], timeoutMs = 5000) {
        return await this.waitForCondition(async () => {
            const result = await this.executeQuery(
                `SELECT * FROM ${tableName} WHERE ${whereClause} LIMIT 1`,
                params
            );
            return result.rows.length > 0 ? result.rows[0] : null;
        }, timeoutMs);
    }

    /**
     * Wait for Redis key to exist
     */
    async waitForRedisKey(key, timeoutMs = 5000) {
        return await this.waitForCondition(async () => {
            const exists = await this.executeRedisCommand('EXISTS', key);
            return exists === 1;
        }, timeoutMs);
    }

    /**
     * Generate test data helpers
     */

    /**
     * Generate a unique test email
     */
    generateTestEmail(prefix = 'test') {
        return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(7)}@test.com`;
    }

    /**
     * Generate a unique test token
     */
    generateTestToken(prefix = 'token') {
        return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    }

    /**
     * Generate test vector data
     */
    generateTestVector(dimensions = 1536) {
        const vector = Array.from({ length: dimensions }, () => Math.random() - 0.5);
        return '[' + vector.join(',') + ']';
    }

    /**
     * Database inspection helpers
     */

    /**
     * Get table schema information
     */
    async getTableSchema(tableName) {
        const result = await this.executeQuery(`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = $1
            ORDER BY ordinal_position
        `, [tableName]);
        return result.rows;
    }

    /**
     * Get table indexes
     */
    async getTableIndexes(tableName) {
        const result = await this.executeQuery(`
            SELECT indexname, indexdef
            FROM pg_indexes
            WHERE tablename = $1 AND schemaname = 'public'
        `, [tableName]);
        return result.rows;
    }

    /**
     * Get foreign key constraints
     */
    async getForeignKeys(tableName) {
        const result = await this.executeQuery(`
            SELECT
                kcu.column_name,
                ccu.table_name AS foreign_table_name,
                ccu.column_name AS foreign_column_name
            FROM information_schema.table_constraints AS tc
            JOIN information_schema.key_column_usage AS kcu
                ON tc.constraint_name = kcu.constraint_name
                AND tc.table_schema = kcu.table_schema
            JOIN information_schema.constraint_column_usage AS ccu
                ON ccu.constraint_name = tc.constraint_name
                AND ccu.table_schema = tc.table_schema
            WHERE tc.constraint_type = 'FOREIGN KEY' 
                AND tc.table_name = $1
                AND tc.table_schema = 'public'
        `, [tableName]);
        return result.rows;
    }

    /**
     * Health check methods
     */

    /**
     * Check if containers are healthy
     */
    async checkHealth() {
        const health = {
            postgres: false,
            redis: false,
            overall: false
        };

        try {
            // Check PostgreSQL
            await this.executeQuery('SELECT 1');
            health.postgres = true;
        } catch (error) {
            console.warn('PostgreSQL health check failed:', error.message);
        }

        try {
            // Check Redis
            await this.executeRedisCommand('PING');
            health.redis = true;
        } catch (error) {
            console.warn('Redis health check failed:', error.message);
        }

        health.overall = health.postgres && health.redis;
        return health;
    }

    /**
     * Get container resource usage
     */
    async getResourceUsage() {
        const usage = {
            database: {},
            redis: {},
            timestamp: new Date().toISOString()
        };

        try {
            // Get database size
            const dbSizeResult = await this.executeQuery(`
                SELECT pg_size_pretty(pg_database_size(current_database())) as size
            `);
            usage.database.size = dbSizeResult.rows[0].size;

            // Get table sizes
            const tableSizeResult = await this.executeQuery(`
                SELECT 
                    schemaname,
                    tablename,
                    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
                FROM pg_tables 
                WHERE schemaname = 'public'
                ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
            `);
            usage.database.tables = tableSizeResult.rows;

            // Get Redis memory info
            const redisInfo = await this.executeRedisCommand('MEMORY', 'USAGE', 'session:*');
            usage.redis.memory_usage = redisInfo;

        } catch (error) {
            console.warn('Resource usage collection failed:', error.message);
        }

        return usage;
    }
}

module.exports = TestHelpers;