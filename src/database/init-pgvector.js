const { Pool } = require('pg');

const db = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://resolve_user:resolve_pass@postgres:5432/resolve_onboarding'
});

async function ensurePgvectorInstalled() {
    console.log('[PGVECTOR INIT] Checking pgvector installation...');
    
    let client;
    try {
        client = await db.connect();
        // First check if extension exists
        const extensionCheck = await db.query(
            "SELECT * FROM pg_extension WHERE extname = 'vector'"
        );
        
        if (extensionCheck.rows.length > 0) {
            console.log('[PGVECTOR INIT] ✓ pgvector extension already installed');
            return true;
        }
        
        // Try to create the extension
        console.log('[PGVECTOR INIT] Installing pgvector extension...');
        try {
            await db.query('CREATE EXTENSION IF NOT EXISTS vector');
            console.log('[PGVECTOR INIT] ✓ pgvector extension installed successfully');
            
            // Verify installation
            const verifyCheck = await db.query(
                "SELECT * FROM pg_extension WHERE extname = 'vector'"
            );
            
            if (verifyCheck.rows.length > 0) {
                console.log('[PGVECTOR INIT] ✓ Installation verified');
                return true;
            }
        } catch (installError) {
            // This might fail if user doesn't have superuser privileges
            console.error('[PGVECTOR INIT] ⚠ Could not install pgvector automatically:', installError.message);
            console.error('[PGVECTOR INIT] You may need to manually run as superuser:');
            console.error('[PGVECTOR INIT]   CREATE EXTENSION IF NOT EXISTS vector;');
            
            // Check if it works anyway (might be installed at database level)
            try {
                const testQuery = await db.query("SELECT '[1,2,3]'::vector as test");
                console.log('[PGVECTOR INIT] ✓ Vector operations work despite installation error');
                return true;
            } catch (testError) {
                console.error('[PGVECTOR INIT] ✗ Vector operations do not work');
                return false;
            }
        }
        
    } catch (error) {
        console.error('[PGVECTOR INIT] Error during pgvector check:', error.message);
        return false;
    } finally {
        if (client) {
            client.release();
        }
    }
}

// Also ensure error logging columns exist
async function ensureErrorLoggingColumns() {
    try {
        await db.query(`
            ALTER TABLE vector_search_logs 
            ADD COLUMN IF NOT EXISTS error_message TEXT,
            ADD COLUMN IF NOT EXISTS error_code VARCHAR(10)
        `);
        console.log('[PGVECTOR INIT] ✓ Error logging columns ensured');
    } catch (error) {
        console.error('[PGVECTOR INIT] Could not add error logging columns:', error.message);
    }
}

// Run initialization
async function initializePgvector() {
    const pgvectorReady = await ensurePgvectorInstalled();
    await ensureErrorLoggingColumns();
    
    if (!pgvectorReady) {
        console.error('═'.repeat(60));
        console.error('⚠️  PGVECTOR NOT AVAILABLE - VECTOR SEARCH WILL NOT WORK');
        console.error('═'.repeat(60));
        console.error('To fix this issue:');
        console.error('1. Connect to your PostgreSQL database as a superuser');
        console.error('2. Run: CREATE EXTENSION IF NOT EXISTS vector;');
        console.error('3. Restart the application');
        console.error('═'.repeat(60));
        
        // Set environment variable to indicate pgvector is not available
        process.env.PGVECTOR_AVAILABLE = 'false';
    } else {
        process.env.PGVECTOR_AVAILABLE = 'true';
        console.log('[PGVECTOR INIT] ✓ pgvector is ready for use');
    }
    
    return pgvectorReady;
}

module.exports = { initializePgvector, ensurePgvectorInstalled };