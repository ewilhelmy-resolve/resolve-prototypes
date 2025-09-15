const { getRabbitMQInstance } = require('../services/rabbitmq');

class ChatResponseConsumer {
    constructor(db) {
        this.db = db;
        this.rabbitMQ = null;
        this.isRunning = false;
    }

    async start() {
        try {
            console.log('[CHAT RESPONSE CONSUMER] Starting...');
            
            // Get RabbitMQ instance
            this.rabbitMQ = getRabbitMQInstance();
            
            // Connect if not already connected
            if (!this.rabbitMQ.isConnected) {
                await this.rabbitMQ.connect();
            }
            
            // Set prefetch count to process one message at a time
            await this.rabbitMQ.channel.prefetch(1);
            
            // Start consuming chat responses
            await this.rabbitMQ.channel.consume('chat.responses', this.handleChatResponse.bind(this));
            
            this.isRunning = true;
            console.log('[CHAT RESPONSE CONSUMER] ✅ Listening for chat responses');
            
        } catch (error) {
            console.error('[CHAT RESPONSE CONSUMER] ❌ Failed to start:', error.message);
            throw error;
        }
    }

    async handleChatResponse(message) {
        if (!message) return;

        let data;
        try {
            data = JSON.parse(message.content.toString());
        } catch (parseError) {
            console.error('[CHAT RESPONSE CONSUMER] ❌ Invalid JSON, discarding poison message:', {
                error: parseError.message,
                content: message.content.toString().substring(0, 200), // Log first 200 chars
                headers: message.properties.headers
            });
            // ACK to remove malformed message and prevent infinite loops
            this.rabbitMQ.channel.ack(message);
            return;
        }

        // Validate required fields
        const { message_id, conversation_id, tenant_id, ai_response } = data;
        if (!message_id || !conversation_id || !tenant_id || !ai_response) {
            console.error('[CHAT RESPONSE CONSUMER] ❌ Missing required fields, discarding poison message:', {
                message_id, conversation_id, tenant_id, 
                has_ai_response: !!ai_response,
                content: message.content.toString().substring(0, 200)
            });
            // ACK to remove invalid message and prevent infinite loops
            this.rabbitMQ.channel.ack(message);
            return;
        }

        try {
            console.log(`[CHAT RESPONSE CONSUMER] 📥 Processing response for message ${message_id}`);

            const { sources = [], processing_time_ms } = data;

            // Store AI response in database (same logic as current callback endpoint)
            await this.db.query(
                'INSERT INTO rag_messages (conversation_id, tenant_id, role, message, response_time_ms) VALUES ($1, $2, $3, $4, $5)',
                [conversation_id, tenant_id, 'assistant', ai_response, processing_time_ms || null]
            );

            console.log(`[CHAT RESPONSE CONSUMER] 💾 Stored AI response in database`);

            // Trigger SSE event (identical to current callback logic)
            if (global.sseClients && global.sseClients[tenant_id]) {
                const sseMessage = JSON.stringify({
                    type: 'chat-response',
                    conversation_id: conversation_id,
                    message_id: message_id,
                    ai_response: ai_response,
                    sources: sources,
                    timestamp: new Date().toISOString()
                });

                const clientCount = Object.keys(global.sseClients[tenant_id]).length;
                console.log(`[CHAT RESPONSE CONSUMER] 📡 Broadcasting to ${clientCount} SSE clients`);

                Object.values(global.sseClients[tenant_id]).forEach(client => {
                    try {
                        client.write(`data: ${sseMessage}\n\n`);
                    } catch (err) {
                        console.error(`[CHAT RESPONSE CONSUMER] Failed to send SSE:`, err.message);
                    }
                });
            } else {
                console.log(`[CHAT RESPONSE CONSUMER] ⚠️ No SSE clients for tenant ${tenant_id}`);
            }

            // Acknowledge the message
            this.rabbitMQ.channel.ack(message);
            console.log(`[CHAT RESPONSE CONSUMER] ✅ Response processing complete`);

        } catch (error) {
            console.error('[CHAT RESPONSE CONSUMER] ❌ Error processing valid message:', {
                error: error.message,
                message_id, conversation_id, tenant_id
            });
            
            // For valid structure but processing errors (DB issues, etc.), 
            // we could retry, but for now ACK to prevent infinite loops
            // In production you might want to check error.code for retryable errors
            this.rabbitMQ.channel.ack(message);
        }
    }

    async stop() {
        console.log('[CHAT RESPONSE CONSUMER] 🛑 Shutting down...');
        this.isRunning = false;
        
        if (this.rabbitMQ && this.rabbitMQ.channel) {
            try {
                await this.rabbitMQ.channel.cancel('chat.responses');
            } catch (error) {
                console.error('[CHAT RESPONSE CONSUMER] Error during shutdown:', error);
            }
        }
        
        console.log('[CHAT RESPONSE CONSUMER] ✅ Stopped');
    }
}

module.exports = ChatResponseConsumer;