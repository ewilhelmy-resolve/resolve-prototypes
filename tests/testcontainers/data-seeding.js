const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');

class DataSeeder {
    constructor(containerSetup) {
        this.containerSetup = containerSetup;
        this.initSqlPath = path.join(__dirname, '../../src/database/01-init.sql');
    }

    /**
     * Initialize database schema using the production init script
     */
    async initializeSchema() {
        console.log('📋 Initializing database schema...');
        
        try {
            // Read the init SQL file
            if (!fs.existsSync(this.initSqlPath)) {
                throw new Error(`Init SQL file not found: ${this.initSqlPath}`);
            }
            
            const initSql = fs.readFileSync(this.initSqlPath, 'utf8');
            
            // Execute the init script
            await this.containerSetup.executeSQL(initSql);
            console.log('✅ Database schema initialized');
            
            // Verify critical tables exist
            await this.verifySchema();
            console.log('✅ Schema verification completed');
            
        } catch (error) {
            console.error('❌ Schema initialization failed:', error);
            throw error;
        }
    }

    /**
     * Verify that critical tables were created
     */
    async verifySchema() {
        const requiredTables = [
            'users',
            'sessions',
            'integrations',
            'tickets',
            'workflow_triggers',
            'admin_metrics',
            'webhook_traffic',
            'rag_tenant_tokens',
            'rag_documents',
            'rag_vectors',
            'rag_webhook_failures',
            'rag_conversations',
            'rag_messages'
        ];

        for (const table of requiredTables) {
            const result = await this.containerSetup.executeSQL(
                `SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = $1
                );`,
                [table]
            );
            
            if (!result.rows[0].exists) {
                throw new Error(`Required table '${table}' was not created`);
            }
        }

        // Verify pgvector extension
        const vectorResult = await this.containerSetup.executeSQL(
            "SELECT * FROM pg_extension WHERE extname = 'vector';"
        );
        
        if (vectorResult.rows.length === 0) {
            throw new Error('pgvector extension not found');
        }
    }

    /**
     * Seed test data for comprehensive testing
     */
    async seedTestData() {
        console.log('🌱 Seeding test data...');
        
        try {
            // Clear any existing data first
            await this.clearAllData();
            
            // Seed users
            const users = await this.seedUsers();
            console.log(`✅ Seeded ${users.length} users`);
            
            // Seed sessions
            const sessions = await this.seedSessions(users);
            console.log(`✅ Seeded ${sessions.length} sessions`);
            
            // Seed integrations
            const integrations = await this.seedIntegrations(users);
            console.log(`✅ Seeded ${integrations.length} integrations`);
            
            // Seed tickets
            const tickets = await this.seedTickets(users);
            console.log(`✅ Seeded ${tickets.length} tickets`);
            
            // Seed RAG data
            await this.seedRAGData(users);
            console.log('✅ Seeded RAG data');
            
            // Seed Redis data
            await this.seedRedisData(users, sessions);
            console.log('✅ Seeded Redis data');
            
            console.log('✅ Test data seeding completed');
            
            return {
                users,
                sessions,
                integrations,
                tickets
            };
            
        } catch (error) {
            console.error('❌ Data seeding failed:', error);
            throw error;
        }
    }

    /**
     * Clear all data from the database (for clean state between tests)
     */
    async clearAllData() {
        console.log('🧹 Clearing existing data...');
        
        const tables = [
            'rag_messages',
            'rag_conversations', 
            'rag_webhook_failures',
            'rag_vectors',
            'rag_documents',
            'rag_tenant_tokens',
            'webhook_traffic',
            'admin_metrics',
            'workflow_triggers',
            'tickets',
            'integrations',
            'sessions',
            'users'
        ];
        
        // Disable foreign key checks temporarily
        await this.containerSetup.executeSQL('SET session_replication_role = replica;');
        
        for (const table of tables) {
            await this.containerSetup.executeSQL(`TRUNCATE TABLE ${table} RESTART IDENTITY CASCADE;`);
        }
        
        // Re-enable foreign key checks
        await this.containerSetup.executeSQL('SET session_replication_role = DEFAULT;');
        
        // Clear Redis
        await this.containerSetup.executeRedisCommand('FLUSHDB');
        
        console.log('✅ All data cleared');
    }

    /**
     * Seed test users with different tiers and scenarios
     */
    async seedUsers() {
        const users = [
            {
                email: 'admin@test.com',
                password: await bcrypt.hash('admin123', 10),
                full_name: 'Admin User',
                company_name: 'Test Admin Corp',
                phone: '+1234567890',
                tier: 'admin'
            },
            {
                email: 'premium@test.com', 
                password: await bcrypt.hash('premium123', 10),
                full_name: 'Premium User',
                company_name: 'Premium Corp',
                phone: '+1234567891',
                tier: 'premium'
            },
            {
                email: 'free@test.com',
                password: await bcrypt.hash('free123', 10),
                full_name: 'Free User',
                company_name: 'Free Corp',
                phone: '+1234567892',
                tier: 'free'
            },
            {
                email: 'enterprise@test.com',
                password: await bcrypt.hash('enterprise123', 10),
                full_name: 'Enterprise User',
                company_name: 'Enterprise Corp',
                phone: '+1234567893',
                tier: 'enterprise'
            }
        ];

        const createdUsers = [];
        
        for (const user of users) {
            const result = await this.containerSetup.executeSQL(
                `INSERT INTO users (email, password, full_name, company_name, phone, tier)
                 VALUES ($1, $2, $3, $4, $5, $6) 
                 RETURNING *;`,
                [user.email, user.password, user.full_name, user.company_name, user.phone, user.tier]
            );
            createdUsers.push(result.rows[0]);
        }
        
        return createdUsers;
    }

    /**
     * Seed test sessions
     */
    async seedSessions(users) {
        const sessions = [];
        const now = new Date();
        const futureDate = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now
        
        for (const user of users) {
            const token = `test_token_${user.id}_${Date.now()}`;
            const result = await this.containerSetup.executeSQL(
                `INSERT INTO sessions (token, user_id, expires_at)
                 VALUES ($1, $2, $3)
                 RETURNING *;`,
                [token, user.id, futureDate]
            );
            sessions.push(result.rows[0]);
        }
        
        return sessions;
    }

    /**
     * Seed test integrations
     */
    async seedIntegrations(users) {
        const integrationTypes = ['jira', 'slack', 'github', 'trello'];
        const integrations = [];
        
        for (const user of users) {
            for (let i = 0; i < 2; i++) {
                const type = integrationTypes[i % integrationTypes.length];
                const config = {
                    api_key: `test_api_key_${type}_${user.id}`,
                    webhook_url: `https://test.example.com/webhook/${type}`,
                    settings: {
                        auto_sync: true,
                        priority: 'medium'
                    }
                };
                
                const result = await this.containerSetup.executeSQL(
                    `INSERT INTO integrations (user_id, type, config, enabled)
                     VALUES ($1, $2, $3, $4)
                     RETURNING *;`,
                    [user.id, type, JSON.stringify(config), true]
                );
                integrations.push(result.rows[0]);
            }
        }
        
        return integrations;
    }

    /**
     * Seed test tickets
     */
    async seedTickets(users) {
        const tickets = [];
        const statuses = ['open', 'in_progress', 'resolved', 'closed'];
        const priorities = ['low', 'medium', 'high', 'critical'];
        
        for (const user of users) {
            for (let i = 0; i < 3; i++) {
                const status = statuses[i % statuses.length];
                const priority = priorities[i % priorities.length];
                const metadata = {
                    source: 'test_suite',
                    category: 'automation',
                    tags: ['test', 'automated']
                };
                
                const result = await this.containerSetup.executeSQL(
                    `INSERT INTO tickets (user_id, external_id, title, description, status, priority, metadata)
                     VALUES ($1, $2, $3, $4, $5, $6, $7)
                     RETURNING *;`,
                    [
                        user.id,
                        `TEST-${user.id}-${i + 1}`,
                        `Test Ticket ${i + 1} for ${user.full_name}`,
                        `This is a test ticket with ${status} status and ${priority} priority`,
                        status,
                        priority,
                        JSON.stringify(metadata)
                    ]
                );
                tickets.push(result.rows[0]);
            }
        }
        
        return tickets;
    }

    /**
     * Seed RAG (Retrieval-Augmented Generation) test data
     */
    async seedRAGData(users) {
        // Seed tenant tokens
        for (const user of users) {
            await this.containerSetup.executeSQL(
                `INSERT INTO rag_tenant_tokens (tenant_id, callback_token)
                 VALUES ($1, $2);`,
                [user.tenant_id, `callback_token_${user.id}`]
            );
        }

        // Seed documents and vectors
        for (const user of users) {
            for (let i = 0; i < 2; i++) {
                const docResult = await this.containerSetup.executeSQL(
                    `INSERT INTO rag_documents (tenant_id, callback_id, content, metadata, status, created_by)
                     VALUES ($1, $2, $3, $4, $5, $6)
                     RETURNING *;`,
                    [
                        user.tenant_id,
                        `test_doc_${user.id}_${i}`,
                        `This is test document ${i + 1} content for user ${user.full_name}. It contains important information for testing RAG functionality.`,
                        JSON.stringify({
                            title: `Test Document ${i + 1}`,
                            type: 'test_document',
                            tags: ['test', 'rag']
                        }),
                        'processed',
                        user.email
                    ]
                );
                
                const document = docResult.rows[0];
                
                // Create sample vectors (using random values for testing)
                const chunks = [
                    `Test document ${i + 1} chunk 1 content`,
                    `Test document ${i + 1} chunk 2 content`,
                    `Test document ${i + 1} chunk 3 content`
                ];
                
                for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
                    // Generate a random 1536-dimensional vector for testing
                    const embedding = Array.from({ length: 1536 }, () => Math.random() - 0.5);
                    const vectorString = '[' + embedding.join(',') + ']';
                    
                    await this.containerSetup.executeSQL(
                        `INSERT INTO rag_vectors (tenant_id, document_id, chunk_text, embedding, chunk_index, metadata)
                         VALUES ($1, $2, $3, $4, $5, $6);`,
                        [
                            user.tenant_id,
                            document.document_id,
                            chunks[chunkIndex],
                            vectorString,
                            chunkIndex,
                            JSON.stringify({
                                chunk_type: 'paragraph',
                                chunk_length: chunks[chunkIndex].length
                            })
                        ]
                    );
                }
            }
        }

        // Seed conversations and messages
        for (const user of users) {
            const convResult = await this.containerSetup.executeSQL(
                `INSERT INTO rag_conversations (tenant_id, user_email, status, context)
                 VALUES ($1, $2, $3, $4)
                 RETURNING *;`,
                [
                    user.tenant_id,
                    user.email,
                    'active',
                    JSON.stringify({
                        session_id: `test_session_${user.id}`,
                        preferences: {
                            response_style: 'detailed'
                        }
                    })
                ]
            );
            
            const conversation = convResult.rows[0];
            
            // Add sample messages
            const messages = [
                { role: 'user', message: 'Hello, I need help with test documentation' },
                { role: 'assistant', message: 'I can help you with test documentation. What specific information are you looking for?' },
                { role: 'user', message: 'Can you explain the testing process?' }
            ];
            
            for (const msg of messages) {
                await this.containerSetup.executeSQL(
                    `INSERT INTO rag_messages (conversation_id, tenant_id, role, message, response_time_ms)
                     VALUES ($1, $2, $3, $4, $5);`,
                    [
                        conversation.conversation_id,
                        user.tenant_id,
                        msg.role,
                        msg.message,
                        Math.floor(Math.random() * 1000) + 100 // Random response time 100-1100ms
                    ]
                );
            }
        }
    }

    /**
     * Seed Redis session and cache data
     */
    async seedRedisData(users, sessions) {
        // Seed session data
        for (let i = 0; i < sessions.length; i++) {
            const session = sessions[i];
            const user = users[i];
            
            const sessionData = {
                userId: user.id,
                email: user.email,
                fullName: user.full_name,
                tier: user.tier,
                tenantId: user.tenant_id,
                loginTime: new Date().toISOString(),
                lastActivity: new Date().toISOString()
            };
            
            // Store session data with expiration
            await this.containerSetup.executeRedisCommand('SET', `session:${session.token}`, JSON.stringify(sessionData));
            await this.containerSetup.executeRedisCommand('EXPIRE', `session:${session.token}`, 86400); // 24 hours
            
            // Store user activity cache
            await this.containerSetup.executeRedisCommand('SET', `user:${user.id}:last_seen`, new Date().toISOString());
            await this.containerSetup.executeRedisCommand('EXPIRE', `user:${user.id}:last_seen`, 3600); // 1 hour
        }
        
        // Seed rate limiting data
        for (const user of users) {
            const rateLimitKey = `rate_limit:${user.email}`;
            await this.containerSetup.executeRedisCommand('SET', rateLimitKey, '0');
            await this.containerSetup.executeRedisCommand('EXPIRE', rateLimitKey, 3600); // 1 hour
        }
        
        // Seed cache data
        const cacheData = {
            'system:stats': JSON.stringify({
                totalUsers: users.length,
                activeUsers: users.filter(u => u.tier !== 'free').length,
                lastUpdated: new Date().toISOString()
            }),
            'config:app': JSON.stringify({
                version: '1.0.0-test',
                environment: 'test',
                features: {
                    rag: true,
                    webhooks: true,
                    analytics: true
                }
            })
        };
        
        for (const [key, value] of Object.entries(cacheData)) {
            await this.containerSetup.executeRedisCommand('SET', key, value);
            await this.containerSetup.executeRedisCommand('EXPIRE', key, 1800); // 30 minutes
        }
    }

    /**
     * Get seeded test user by email
     */
    async getTestUser(email) {
        const result = await this.containerSetup.executeSQL(
            'SELECT * FROM users WHERE email = $1;',
            [email]
        );
        return result.rows[0];
    }

    /**
     * Get session token for a test user
     */
    async getTestUserSession(userId) {
        const result = await this.containerSetup.executeSQL(
            'SELECT * FROM sessions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1;',
            [userId]
        );
        return result.rows[0];
    }

    /**
     * Create a fresh test user for isolated testing
     */
    async createIsolatedTestUser(overrides = {}) {
        const timestamp = Date.now();
        const testUser = {
            email: overrides.email || `isolated_user_${timestamp}@test.com`,
            password: await bcrypt.hash(overrides.password || 'isolated123', 10),
            full_name: overrides.full_name || `Isolated User ${timestamp}`,
            company_name: overrides.company_name || 'Isolated Test Corp',
            phone: overrides.phone || `+123456${timestamp.toString().slice(-4)}`,
            tier: overrides.tier || 'free',
            ...overrides
        };

        const result = await this.containerSetup.executeSQL(
            `INSERT INTO users (email, password, full_name, company_name, phone, tier)
             VALUES ($1, $2, $3, $4, $5, $6) 
             RETURNING *;`,
            [testUser.email, testUser.password, testUser.full_name, testUser.company_name, testUser.phone, testUser.tier]
        );

        const user = result.rows[0];

        // Create session for the isolated user
        const token = `isolated_token_${user.id}_${timestamp}`;
        const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
        
        const sessionResult = await this.containerSetup.executeSQL(
            `INSERT INTO sessions (token, user_id, expires_at)
             VALUES ($1, $2, $3)
             RETURNING *;`,
            [token, user.id, futureDate]
        );

        user.session = sessionResult.rows[0];
        return user;
    }
}

module.exports = DataSeeder;