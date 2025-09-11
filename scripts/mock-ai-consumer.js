#!/usr/bin/env node

const { getRabbitMQInstance } = require('../src/services/rabbitmq');

class MockAIConsumer {
    constructor() {
        this.rabbitMQ = null;
        this.isRunning = false;
    }

    async start() {
        try {
            console.log('🤖 Starting Mock AI Consumer...');
            
            // Get RabbitMQ instance and connect
            this.rabbitMQ = getRabbitMQInstance();
            
            // Connect if not already connected
            if (!this.rabbitMQ.isConnected) {
                await this.rabbitMQ.connect();
            }
            
            console.log('✅ Connected to RabbitMQ');
            console.log('📊 RabbitMQ Management UI: http://localhost:15672 (admin/admin)');
            
            // Set prefetch count to process one message at a time
            await this.rabbitMQ.channel.prefetch(1);
            
            // Start consuming chat requests
            await this.rabbitMQ.channel.consume('chat.requests', this.handleChatRequest.bind(this));
            
            this.isRunning = true;
            console.log('🎧 Listening for chat requests on queue: chat.requests');
            console.log('💡 Send a chat message via the app to see this in action!');
            console.log('   curl -X POST http://localhost:5000/api/rag/chat -H "Content-Type: application/json" -d \'{"message":"Hello AI"}\'');
            
        } catch (error) {
            console.error('❌ Failed to start Mock AI Consumer:', error.message);
            process.exit(1);
        }
    }

    async handleChatRequest(message) {
        if (!message) return;

        try {
            const data = JSON.parse(message.content.toString());
            console.log(`\n📨 Processing chat request:`);
            console.log(`   Message ID: ${data.message_id}`);
            console.log(`   User Message: "${data.customer_message}"`);
            console.log(`   Tenant: ${data.tenantId}`);
            console.log(`   Conversation: ${data.conversation_id}`);

            // Simulate AI processing time
            const processingTime = Math.random() * 2000 + 500; // 500-2500ms
            console.log(`⏳ Simulating AI processing (${Math.round(processingTime)}ms)...`);
            
            await new Promise(resolve => setTimeout(resolve, processingTime));

            // Generate mock AI response
            const mockResponses = [
                `Mock AI: I received your message "${data.customer_message}". This is a simulated response for testing the RabbitMQ system.`,
                `Mock AI: Thank you for asking "${data.customer_message}". I'm a test AI consumer running locally to verify the message queue system.`,
                `Mock AI: Processing "${data.customer_message}". This response demonstrates the RabbitMQ chat flow working correctly.`,
                `Mock AI: I understand you said "${data.customer_message}". This is a mock response to test the queue-based chat system.`
            ];

            const aiResponse = mockResponses[Math.floor(Math.random() * mockResponses.length)];

            // Prepare response message
            const responseMessage = {
                message_id: data.message_id,
                conversation_id: data.conversation_id,
                tenant_id: data.tenantId,
                ai_response: aiResponse,
                sources: [
                    'Mock Knowledge Base - Document 1',
                    'Mock Knowledge Base - Document 2'
                ],
                processing_time_ms: Math.round(processingTime),
                model_used: 'mock-ai-v1.0',
                timestamp: new Date().toISOString()
            };

            // Publish response to chat.responses queue
            await this.rabbitMQ.channel.publish(
                'chat.exchange',
                'chat.response',
                Buffer.from(JSON.stringify(responseMessage)),
                {
                    persistent: true,
                    messageId: data.message_id,
                    headers: {
                        'tenant-id': data.tenantId,
                        'conversation-id': data.conversation_id
                    }
                }
            );

            console.log(`✅ Response published to chat.responses queue`);
            console.log(`   AI Response: "${aiResponse}"`);

            // Acknowledge the message
            this.rabbitMQ.channel.ack(message);

        } catch (error) {
            console.error('❌ Error processing chat request:', error);
            console.error('   Raw message:', message.content.toString());
            
            // Reject and requeue the message
            this.rabbitMQ.channel.nack(message, false, true);
        }
    }

    async stop() {
        console.log('\n🛑 Shutting down Mock AI Consumer...');
        this.isRunning = false;
        
        if (this.rabbitMQ) {
            await this.rabbitMQ.disconnect();
        }
        
        console.log('✅ Mock AI Consumer stopped');
        process.exit(0);
    }
}

// Handle graceful shutdown
const mockConsumer = new MockAIConsumer();

process.on('SIGINT', () => mockConsumer.stop());
process.on('SIGTERM', () => mockConsumer.stop());

// Start the consumer
mockConsumer.start().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});