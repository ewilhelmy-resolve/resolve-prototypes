const crypto = require('crypto');

async function generateCallbackToken(db, tenantId) {
    const token = crypto.randomBytes(32).toString('hex');
    
    await db.query(
        `INSERT INTO rag_tenant_tokens (tenant_id, callback_token) 
         VALUES ($1, $2) 
         ON CONFLICT (tenant_id) 
         DO UPDATE SET callback_token = $2, updated_at = CURRENT_TIMESTAMP`,
        [tenantId, token]
    );
    
    return token;
}

module.exports = {
    generateCallbackToken
};