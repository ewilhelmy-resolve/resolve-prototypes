const axios = require('axios');

async function processWebhookRetryQueue(db) {
    try {
        // Get pending webhooks ready for retry
        const pendingWebhooks = await db.query(
            `SELECT * FROM rag_webhook_failures 
             WHERE status IN ('pending', 'retrying') 
             AND next_retry_at <= CURRENT_TIMESTAMP 
             AND retry_count < max_retries
             LIMIT 10`
        );
        
        for (const webhook of pendingWebhooks.rows) {
            // Update status to retrying
            await db.query(
                'UPDATE rag_webhook_failures SET status = $1, retry_count = retry_count + 1 WHERE id = $2',
                ['retrying', webhook.id]
            );
            
            try {
                const payload = JSON.parse(webhook.payload);
                
                // Check if this is a document processing webhook
                if (webhook.webhook_type === 'document-processing') {
                    console.log(`[WEBHOOK RETRY] Retrying document processing for document ${payload.document_id}`);
                }
                
                // Retry webhook
                await axios.post(
                    process.env.AUTOMATION_WEBHOOK_URL,
                    payload,
                    {
                        headers: {
                            'Authorization': process.env.AUTOMATION_AUTH,
                            'Content-Type': 'application/json'
                        },
                        timeout: 10000
                    }
                );
                
                // Mark as succeeded
                await db.query(
                    'UPDATE rag_webhook_failures SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
                    ['succeeded', webhook.id]
                );
                
            } catch (retryError) {
                // Calculate next retry time with exponential backoff
                const nextRetryDelay = Math.min(60000 * Math.pow(2, webhook.retry_count), 3600000); // Max 1 hour
                const nextRetryAt = new Date(Date.now() + nextRetryDelay);
                
                // Update with new retry time or mark as failed
                if (webhook.retry_count + 1 >= webhook.max_retries) {
                    await db.query(
                        'UPDATE rag_webhook_failures SET status = $1, last_error = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
                        ['failed', retryError.message, webhook.id]
                    );
                } else {
                    await db.query(
                        'UPDATE rag_webhook_failures SET status = $1, last_error = $2, next_retry_at = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4',
                        ['pending', retryError.message, nextRetryAt, webhook.id]
                    );
                }
            }
        }
    } catch (error) {
        console.error('Retry queue processing error:', error);
    }
}

module.exports = {
    processWebhookRetryQueue
};