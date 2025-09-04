/**
 * Example test demonstrating Testcontainers infrastructure usage
 * 
 * This is a reference implementation showing how to use the no-mocks
 * testing infrastructure with real PostgreSQL and Redis containers.
 * 
 * Run with: npm test tests/testcontainers/example.test.js
 */

const { test, expect } = require('@playwright/test');
const { TestEnvironment } = require('./index');

test.describe('Testcontainers Infrastructure Example', () => {
    let testEnv;

    test.beforeAll(async () => {
        console.log('🚀 Setting up test environment...');
        testEnv = new TestEnvironment();
        
        // Initialize with default test data
        const result = await testEnv.initialize();
        console.log('✅ Test environment ready');
        console.log('Database:', result.connectionDetails.postgres.connectionString);
        console.log('Redis:', result.connectionDetails.redis.connectionString);
    });

    test.afterAll(async () => {
        console.log('🧹 Cleaning up test environment...');
        if (testEnv) {
            await testEnv.cleanup();
        }
        console.log('✅ Cleanup completed');
    });

    test.beforeEach(async () => {
        // Reset to clean state with fresh test data before each test
        await testEnv.reset({ seedData: true });
    });

    test('should have real PostgreSQL with pgvector extension', async () => {
        // Test basic database connectivity
        const result = await testEnv.helpers.executeQuery('SELECT version()');
        expect(result.rows).toHaveLength(1);
        expect(result.rows[0].version).toContain('PostgreSQL');

        // Test pgvector extension
        const vectorResult = await testEnv.helpers.executeQuery(
            "SELECT * FROM pg_extension WHERE extname = 'vector'"
        );
        expect(vectorResult.rows).toHaveLength(1);
        expect(vectorResult.rows[0].extname).toBe('vector');
    });

    test('should have real Redis connectivity', async () => {
        // Test basic Redis operations
        await testEnv.helpers.executeRedisCommand('SET', 'test_key', 'test_value');
        const value = await testEnv.helpers.executeRedisCommand('GET', 'test_key');
        expect(value).toBe('test_value');

        // Test expiration
        await testEnv.helpers.executeRedisCommand('SET', 'expire_test', 'value', 'EX', '1');
        const exists1 = await testEnv.helpers.executeRedisCommand('EXISTS', 'expire_test');
        expect(exists1).toBe(1);
        
        // Wait for expiration and verify
        await new Promise(resolve => setTimeout(resolve, 1100));
        const exists2 = await testEnv.helpers.executeRedisCommand('EXISTS', 'expire_test');
        expect(exists2).toBe(0);
    });

    test('should have seeded test users', async () => {
        // Test that our seeded users exist
        const adminUser = await testEnv.helpers.findUserByEmail('admin@test.com');
        expect(adminUser).toBeTruthy();
        expect(adminUser.tier).toBe('admin');
        expect(adminUser.full_name).toBe('Admin User');

        const premiumUser = await testEnv.helpers.findUserByEmail('premium@test.com');
        expect(premiumUser).toBeTruthy();
        expect(premiumUser.tier).toBe('premium');

        const freeUser = await testEnv.helpers.findUserByEmail('free@test.com');
        expect(freeUser).toBeTruthy();
        expect(freeUser.tier).toBe('free');

        const enterpriseUser = await testEnv.helpers.findUserByEmail('enterprise@test.com');
        expect(enterpriseUser).toBeTruthy();
        expect(enterpriseUser.tier).toBe('enterprise');
    });

    test('should have active sessions for test users', async () => {
        const adminUser = await testEnv.helpers.findUserByEmail('admin@test.com');
        const sessions = await testEnv.helpers.executeQuery(
            'SELECT * FROM sessions WHERE user_id = $1',
            [adminUser.id]
        );
        
        expect(sessions.rows).toHaveLength(1);
        const session = sessions.rows[0];
        expect(session.user_id).toBe(adminUser.id);
        expect(new Date(session.expires_at)).toBeGreaterThan(new Date());

        // Test Redis session data
        const redisSessionData = await testEnv.helpers.getRedisSession(session.token);
        expect(redisSessionData).toBeTruthy();
        expect(redisSessionData.userId).toBe(adminUser.id);
        expect(redisSessionData.email).toBe(adminUser.email);
    });

    test('should have RAG data with vector embeddings', async () => {
        const adminUser = await testEnv.helpers.findUserByEmail('admin@test.com');
        
        // Check RAG documents
        const documents = await testEnv.helpers.getRAGDocuments(adminUser.tenant_id);
        expect(documents.length).toBeGreaterThan(0);
        
        const document = documents[0];
        expect(document.tenant_id).toBe(adminUser.tenant_id);
        expect(document.content).toContain('test document');
        expect(document.status).toBe('processed');

        // Check vectors for the document
        const vectors = await testEnv.helpers.getRAGVectors(document.document_id);
        expect(vectors.length).toBeGreaterThan(0);
        
        const vector = vectors[0];
        expect(vector.tenant_id).toBe(adminUser.tenant_id);
        expect(vector.document_id).toBe(document.document_id);
        expect(vector.embedding).toBeTruthy();
        expect(typeof vector.embedding).toBe('string'); // PostgreSQL returns vectors as strings
    });

    test('should support database transactions', async () => {
        const testEmail = testEnv.helpers.generateTestEmail('transaction');
        
        try {
            // Test successful transaction
            await testEnv.helpers.executeTransaction([
                {
                    sql: 'INSERT INTO users (email, password, full_name, tier) VALUES ($1, $2, $3, $4)',
                    params: [testEmail, 'hashedpw', 'Transaction Test User', 'free']
                },
                {
                    sql: 'INSERT INTO sessions (token, user_id, expires_at) VALUES ($1, (SELECT id FROM users WHERE email = $2), $3)',
                    params: [`token_${Date.now()}`, testEmail, new Date(Date.now() + 86400000)]
                }
            ]);

            // Verify both records were created
            const user = await testEnv.helpers.findUserByEmail(testEmail);
            expect(user).toBeTruthy();
            
            const sessions = await testEnv.helpers.executeQuery(
                'SELECT * FROM sessions WHERE user_id = $1',
                [user.id]
            );
            expect(sessions.rows).toHaveLength(1);

        } catch (error) {
            throw error;
        }
    });

    test('should support wait conditions', async () => {
        const testEmail = testEnv.helpers.generateTestEmail('waitfor');
        
        // Insert user in background
        setTimeout(async () => {
            await testEnv.helpers.executeQuery(
                'INSERT INTO users (email, password, full_name, tier) VALUES ($1, $2, $3, $4)',
                [testEmail, 'hashedpw', 'Wait Test User', 'free']
            );
        }, 100);

        // Wait for the user to exist
        const user = await testEnv.helpers.waitForRecord(
            'users',
            'email = $1',
            [testEmail],
            2000
        );
        
        expect(user).toBeTruthy();
        expect(user.email).toBe(testEmail);
    });

    test('should support isolated test users', async () => {
        // Create an isolated user that won't interfere with other tests
        const isolatedUser = await testEnv.seeder.createIsolatedTestUser({
            tier: 'premium',
            full_name: 'Isolated Premium User'
        });

        expect(isolatedUser.tier).toBe('premium');
        expect(isolatedUser.full_name).toBe('Isolated Premium User');
        expect(isolatedUser.email).toContain('isolated_user_');
        
        // Should have a session
        expect(isolatedUser.session).toBeTruthy();
        expect(isolatedUser.session.user_id).toBe(isolatedUser.id);
    });

    test('should provide health check information', async () => {
        const health = await testEnv.healthCheck();
        
        expect(health.healthy).toBe(true);
        expect(health.postgres).toBe(true);
        expect(health.redis).toBe(true);
        expect(health.timestamp).toBeTruthy();
    });

    test('should provide resource usage information', async () => {
        const usage = await testEnv.getResourceUsage();
        
        expect(usage.database).toBeTruthy();
        expect(usage.database.size).toBeTruthy();
        expect(Array.isArray(usage.database.tables)).toBe(true);
        expect(usage.redis).toBeTruthy();
        expect(usage.timestamp).toBeTruthy();
    });

    test('should handle rate limiting in Redis', async () => {
        const testEmail = 'ratelimit@test.com';
        
        // Initial count should be 0
        let count = await testEnv.helpers.getRateLimitCount(testEmail);
        expect(count).toBe(0);
        
        // Increment rate limit
        await testEnv.helpers.incrementRateLimit(testEmail);
        count = await testEnv.helpers.getRateLimitCount(testEmail);
        expect(count).toBe(1);
        
        // Increment again
        await testEnv.helpers.incrementRateLimit(testEmail);
        count = await testEnv.helpers.getRateLimitCount(testEmail);
        expect(count).toBe(2);
    });

    test('should support caching operations', async () => {
        const cacheKey = 'test_cache_key';
        const cacheData = {
            message: 'Hello from cache',
            timestamp: Date.now(),
            nested: {
                value: 42,
                array: [1, 2, 3]
            }
        };

        // Set cache data
        await testEnv.helpers.setCachedData(cacheKey, cacheData, 3600);
        
        // Retrieve cache data
        const retrievedData = await testEnv.helpers.getCachedData(cacheKey);
        expect(retrievedData).toEqual(cacheData);
        expect(retrievedData.nested.value).toBe(42);
        expect(retrievedData.nested.array).toEqual([1, 2, 3]);
    });
});