const express = require('express');
const router = express.Router();
const { Pool } = require('pg');

const db = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://resolve_user:resolve_pass@postgres:5432/resolve_onboarding'
});

// Admin authentication middleware
const requireAdmin = (req, res, next) => {
    // In production, implement proper admin authentication
    // For now, check for admin header or session token
    const adminToken = req.headers['x-admin-token'];
    const sessionToken = req.headers['authorization']?.replace('Bearer ', '');
    
    // Allow access with valid session token for now
    if (!adminToken && !sessionToken) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    
    next();
};

// Check pgvector installation and configuration
router.get('/pgvector-status', requireAdmin, async (req, res) => {
    const diagnostics = {
        timestamp: new Date().toISOString(),
        database: {
            host: process.env.DB_HOST || 'postgres',
            database: process.env.DB_NAME || 'resolve_onboarding'
        },
        checks: {}
    };
    
    try {
        // Check if pgvector extension exists
        const extensionCheck = await db.query(
            "SELECT * FROM pg_extension WHERE extname = 'vector'"
        );
        diagnostics.checks.extension_installed = extensionCheck.rows.length > 0;
        
        if (extensionCheck.rows.length > 0) {
            diagnostics.checks.extension_version = extensionCheck.rows[0].extversion;
        }
        
        // Check if vector type is available
        try {
            const typeCheck = await db.query(
                "SELECT typname FROM pg_type WHERE typname = 'vector'"
            );
            diagnostics.checks.vector_type_exists = typeCheck.rows.length > 0;
        } catch (err) {
            diagnostics.checks.vector_type_exists = false;
            diagnostics.checks.vector_type_error = err.message;
        }
        
        // Test vector operations
        try {
            const testVector = await db.query(
                "SELECT '[1,2,3]'::vector as test_vector"
            );
            diagnostics.checks.vector_operations_work = true;
            diagnostics.checks.test_vector_result = testVector.rows[0];
        } catch (err) {
            diagnostics.checks.vector_operations_work = false;
            diagnostics.checks.vector_operation_error = err.message;
        }
        
        // Check rag_vectors table
        try {
            const tableCheck = await db.query(
                `SELECT column_name, data_type 
                 FROM information_schema.columns 
                 WHERE table_name = 'rag_vectors' 
                 AND column_name IN ('embedding', 'embedding_vector')`
            );
            diagnostics.checks.vector_columns = tableCheck.rows;
        } catch (err) {
            diagnostics.checks.vector_columns_error = err.message;
        }
        
        // Count vectors by tenant
        try {
            const vectorCount = await db.query(
                `SELECT tenant_id, COUNT(*) as count 
                 FROM rag_vectors 
                 GROUP BY tenant_id 
                 ORDER BY count DESC 
                 LIMIT 10`
            );
            diagnostics.vector_statistics = {
                top_tenants: vectorCount.rows,
                total_tenants: vectorCount.rowCount
            };
        } catch (err) {
            diagnostics.vector_statistics_error = err.message;
        }
        
        // Recent vector search errors
        try {
            const recentErrors = await db.query(
                `SELECT tenant_id, error_code, error_message, created_at 
                 FROM vector_search_logs 
                 WHERE error_message IS NOT NULL 
                 ORDER BY created_at DESC 
                 LIMIT 10`
            );
            diagnostics.recent_errors = recentErrors.rows;
        } catch (err) {
            diagnostics.recent_errors = [];
            diagnostics.error_log_note = 'Error log table might not have error columns yet';
        }
        
        // Provide recommendations
        diagnostics.recommendations = [];
        
        if (!diagnostics.checks.extension_installed) {
            diagnostics.recommendations.push({
                severity: 'CRITICAL',
                issue: 'pgvector extension not installed',
                solution: 'Connect to database and run: CREATE EXTENSION IF NOT EXISTS vector;'
            });
        }
        
        if (!diagnostics.checks.vector_operations_work) {
            diagnostics.recommendations.push({
                severity: 'HIGH',
                issue: 'Vector operations failing',
                solution: 'Check pgvector installation and permissions'
            });
        }
        
        res.json(diagnostics);
        
    } catch (error) {
        diagnostics.error = {
            message: error.message,
            code: error.code,
            detail: error.detail
        };
        res.status(500).json(diagnostics);
    }
});

// Get recent vector search logs
router.get('/vector-search-logs', requireAdmin, async (req, res) => {
    try {
        const { limit = 50, errors_only = false } = req.query;
        
        let query = `
            SELECT 
                id,
                tenant_id,
                result_count,
                threshold,
                execution_time_ms,
                error_message,
                error_code,
                created_at
            FROM vector_search_logs
        `;
        
        if (errors_only === 'true') {
            query += ' WHERE error_message IS NOT NULL';
        }
        
        query += ' ORDER BY created_at DESC LIMIT $1';
        
        const result = await db.query(query, [parseInt(limit)]);
        
        res.json({
            total: result.rowCount,
            logs: result.rows
        });
        
    } catch (error) {
        res.status(500).json({
            error: 'Failed to fetch logs',
            message: error.message
        });
    }
});

// Test vector search with detailed diagnostics
router.post('/test-vector-search', requireAdmin, async (req, res) => {
    const { tenant_id, use_zero_vector = true } = req.body;
    
    const testResults = {
        timestamp: new Date().toISOString(),
        tenant_id,
        tests: []
    };
    
    try {
        // Create test embedding
        const testEmbedding = use_zero_vector 
            ? new Array(1536).fill(0)
            : new Array(1536).fill(0).map(() => Math.random() - 0.5);
        
        const vectorString = `[${testEmbedding.join(',')}]`;
        
        // Test 1: Direct SQL query
        try {
            const directQuery = await db.query(
                `SELECT 
                    document_id,
                    chunk_text,
                    1 - (embedding <=> $1::vector) as similarity
                 FROM rag_vectors
                 WHERE tenant_id = $2
                 LIMIT 5`,
                [vectorString, tenant_id]
            );
            
            testResults.tests.push({
                test: 'Direct SQL Query',
                success: true,
                results: directQuery.rows.length,
                sample: directQuery.rows[0]
            });
        } catch (err) {
            testResults.tests.push({
                test: 'Direct SQL Query',
                success: false,
                error: err.message,
                code: err.code,
                detail: err.detail
            });
        }
        
        // Test 2: Check if tenant has vectors
        const countResult = await db.query(
            'SELECT COUNT(*) as count FROM rag_vectors WHERE tenant_id = $1',
            [tenant_id]
        );
        
        testResults.vector_count = countResult.rows[0].count;
        
        // Test 3: Check tenant token
        const tokenResult = await db.query(
            'SELECT callback_token FROM rag_tenant_tokens WHERE tenant_id = $1',
            [tenant_id]
        );
        
        testResults.has_token = tokenResult.rows.length > 0;
        
        res.json(testResults);
        
    } catch (error) {
        res.status(500).json({
            error: 'Test failed',
            message: error.message,
            code: error.code
        });
    }
});

// Fix pgvector installation (requires admin privileges)
router.post('/fix-pgvector', requireAdmin, async (req, res) => {
    const fixes = {
        timestamp: new Date().toISOString(),
        attempts: []
    };
    
    try {
        // Attempt 1: Create extension
        try {
            await db.query('CREATE EXTENSION IF NOT EXISTS vector');
            fixes.attempts.push({
                action: 'CREATE EXTENSION',
                success: true
            });
        } catch (err) {
            fixes.attempts.push({
                action: 'CREATE EXTENSION',
                success: false,
                error: err.message,
                note: 'May need superuser privileges'
            });
        }
        
        // Attempt 2: Add error columns to vector_search_logs if missing
        try {
            await db.query(`
                ALTER TABLE vector_search_logs 
                ADD COLUMN IF NOT EXISTS error_message TEXT,
                ADD COLUMN IF NOT EXISTS error_code VARCHAR(10)
            `);
            fixes.attempts.push({
                action: 'Add error logging columns',
                success: true
            });
        } catch (err) {
            fixes.attempts.push({
                action: 'Add error logging columns',
                success: false,
                error: err.message
            });
        }
        
        // Check final status
        const extensionCheck = await db.query(
            "SELECT * FROM pg_extension WHERE extname = 'vector'"
        );
        fixes.final_status = {
            pgvector_installed: extensionCheck.rows.length > 0
        };
        
        res.json(fixes);
        
    } catch (error) {
        res.status(500).json({
            error: 'Fix attempt failed',
            message: error.message,
            fixes
        });
    }
});

module.exports = router;