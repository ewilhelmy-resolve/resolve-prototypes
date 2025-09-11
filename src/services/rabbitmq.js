const amqp = require('amqplib');

class RabbitMQService {
    constructor() {
        this.connection = null;
        this.channel = null;
        this.url = process.env.RABBITMQ_URL || 'amqp://admin:admin@localhost:5672';
        this.isConnected = false;
        this.exchanges = {
            chat: 'chat.exchange',
            document: 'document.exchange',
            dlx: 'dlx.exchange'
        };
        this.queues = {
            chatRequests: 'chat.requests',
            chatResponses: 'chat.responses',
            documentProcessing: 'document.processing',
            documentProcessed: 'document.processed',
            failedMessages: 'failed.messages'
        };
    }

    async connect() {
        try {
            console.log(`[RabbitMQ] Connecting to ${this.url}`);
            
            this.connection = await amqp.connect(this.url, {
                heartbeat: 60,
                clientProperties: {
                    application: 'resolve-onboarding',
                    version: process.env.APP_VERSION || '1.0.0'
                }
            });

            this.channel = await this.connection.createChannel();
            await this.setupTopology();
            this.setupEventHandlers();
            this.isConnected = true;
            
            console.log('[RabbitMQ] Connected successfully and topology setup complete');
        } catch (error) {
            console.error('[RabbitMQ] Connection failed:', error.message);
            this.isConnected = false;
            throw error;
        }
    }

    async setupTopology() {
        try {
            // Declare exchanges
            await this.channel.assertExchange(this.exchanges.chat, 'topic', { durable: true });
            await this.channel.assertExchange(this.exchanges.document, 'topic', { durable: true });
            await this.channel.assertExchange(this.exchanges.dlx, 'direct', { durable: true });

            // Queue configuration with dead letter setup
            const queueConfig = {
                durable: true,
                arguments: {
                    'x-dead-letter-exchange': this.exchanges.dlx,
                    'x-message-ttl': 300000  // 5 minutes TTL
                }
            };

            // Declare main queues
            await this.channel.assertQueue(this.queues.chatRequests, queueConfig);
            await this.channel.assertQueue(this.queues.chatResponses, queueConfig);
            await this.channel.assertQueue(this.queues.documentProcessing, queueConfig);
            await this.channel.assertQueue(this.queues.documentProcessed, queueConfig);
            
            // Dead letter queue (no TTL)
            await this.channel.assertQueue(this.queues.failedMessages, { durable: true });

            // Bind queues to exchanges
            await this.channel.bindQueue(this.queues.chatRequests, this.exchanges.chat, 'chat.process');
            await this.channel.bindQueue(this.queues.chatResponses, this.exchanges.chat, 'chat.response');
            await this.channel.bindQueue(this.queues.documentProcessing, this.exchanges.document, 'document.process');
            await this.channel.bindQueue(this.queues.documentProcessed, this.exchanges.document, 'document.response');
            await this.channel.bindQueue(this.queues.failedMessages, this.exchanges.dlx, 'failed');

            console.log('[RabbitMQ] Queue topology setup complete');
        } catch (error) {
            console.error('[RabbitMQ] Topology setup failed:', error.message);
            throw error;
        }
    }

    setupEventHandlers() {
        if (this.connection) {
            this.connection.on('error', (error) => {
                console.error('[RabbitMQ] Connection error:', error);
                this.isConnected = false;
            });

            this.connection.on('close', () => {
                console.warn('[RabbitMQ] Connection closed');
                this.isConnected = false;
                // Auto-reconnect could be implemented here
            });
        }
    }

    async publishChatMessage(messageData, options = {}) {
        try {
            if (!this.isConnected || !this.channel) {
                throw new Error('RabbitMQ not connected');
            }

            const message = {
                message_id: messageData.message_id,
                conversation_id: messageData.conversation_id,
                tenant_id: messageData.tenant_id,
                user_email: messageData.user_email,
                user_message: messageData.user_message,
                timestamp: new Date().toISOString(),
                vector_search_endpoint: messageData.vector_search_endpoint,
                callback_auth: messageData.callback_auth,
                ...messageData
            };

            const publishOptions = {
                persistent: true,
                messageId: messageData.message_id,
                timestamp: Date.now(),
                headers: {
                    'tenant-id': messageData.tenant_id,
                    'conversation-id': messageData.conversation_id
                },
                ...options
            };

            const success = this.channel.publish(
                this.exchanges.chat,
                'chat.process',
                Buffer.from(JSON.stringify(message)),
                publishOptions
            );

            if (success) {
                console.log(`[RabbitMQ] Chat message published: ${messageData.message_id}`);
            } else {
                throw new Error('Failed to publish message to channel');
            }

            return { success: true, messageId: messageData.message_id };
        } catch (error) {
            console.error('[RabbitMQ] Failed to publish chat message:', error.message);
            throw error;
        }
    }

    async publishDocumentProcessing(documentData, options = {}) {
        try {
            if (!this.isConnected || !this.channel) {
                throw new Error('RabbitMQ not connected');
            }

            const message = {
                document_id: documentData.document_id,
                tenant_id: documentData.tenant_id,
                document_url: documentData.document_url,
                file_type: documentData.file_type,
                file_size: documentData.file_size,
                original_filename: documentData.original_filename,
                user_email: documentData.user_email,
                timestamp: new Date().toISOString(),
                ...documentData
            };

            const publishOptions = {
                persistent: true,
                messageId: documentData.document_id,
                headers: {
                    'tenant-id': documentData.tenant_id,
                    'document-type': documentData.file_type
                },
                ...options
            };

            const success = this.channel.publish(
                this.exchanges.document,
                'document.process',
                Buffer.from(JSON.stringify(message)),
                publishOptions
            );

            if (success) {
                console.log(`[RabbitMQ] Document processing message published: ${documentData.document_id}`);
            } else {
                throw new Error('Failed to publish document message to channel');
            }

            return { success: true, documentId: documentData.document_id };
        } catch (error) {
            console.error('[RabbitMQ] Failed to publish document processing message:', error.message);
            throw error;
        }
    }

    async getQueueInfo(queueName) {
        try {
            if (!this.isConnected || !this.channel) {
                throw new Error('RabbitMQ not connected');
            }

            const queueInfo = await this.channel.checkQueue(queueName);
            return {
                queue: queueName,
                messages: queueInfo.messageCount,
                consumers: queueInfo.consumerCount
            };
        } catch (error) {
            console.error(`[RabbitMQ] Failed to get queue info for ${queueName}:`, error.message);
            return {
                queue: queueName,
                error: error.message
            };
        }
    }

    async getHealthStatus() {
        try {
            if (!this.connection || !this.channel) {
                return { status: 'disconnected', error: 'No connection established' };
            }

            if (this.connection.connection && this.connection.connection.destroyed) {
                return { status: 'disconnected', error: 'Connection destroyed' };
            }

            // Try to get info about a queue to test if channel is working
            await this.channel.checkQueue(this.queues.chatRequests);
            
            return {
                status: 'healthy',
                connected: this.isConnected,
                url: this.url,
                queues: {
                    chatRequests: await this.getQueueInfo(this.queues.chatRequests),
                    chatResponses: await this.getQueueInfo(this.queues.chatResponses)
                }
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                error: error.message,
                connected: false
            };
        }
    }

    async disconnect() {
        try {
            if (this.channel) {
                await this.channel.close();
                this.channel = null;
            }
            if (this.connection) {
                await this.connection.close();
                this.connection = null;
            }
            this.isConnected = false;
            console.log('[RabbitMQ] Disconnected successfully');
        } catch (error) {
            console.error('[RabbitMQ] Error during disconnect:', error.message);
        }
    }
}

// Singleton instance
let rabbitMQInstance = null;

function getRabbitMQInstance() {
    if (!rabbitMQInstance) {
        rabbitMQInstance = new RabbitMQService();
    }
    return rabbitMQInstance;
}

module.exports = {
    RabbitMQService,
    getRabbitMQInstance
};