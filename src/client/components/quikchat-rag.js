// QuikChat RAG Integration Component
class QuikChatRAG {
    constructor(containerId) {
        this.containerId = containerId;
        this.container = document.querySelector(containerId);
        this.conversationId = null;
        this.chat = null;
        this.sessionToken = this.getSessionToken();
    }

    getSessionToken() {
        // Get session token from cookie
        const cookies = document.cookie.split(';');
        for (let cookie of cookies) {
            const [name, value] = cookie.trim().split('=');
            if (name === 'sessionToken') {
                return decodeURIComponent(value);
            }
        }
        return null;
    }

    async sendToRAG(message) {
        try {
            const response = await fetch('/api/rag/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.sessionToken}`
                },
                body: JSON.stringify({
                    message: message,
                    conversation_id: this.conversationId
                })
            });

            if (!response.ok) {
                throw new Error(`Chat API error: ${response.status}`);
            }

            const data = await response.json();
            
            // Store conversation ID and message ID
            if (data.conversation_id) {
                this.conversationId = data.conversation_id;
                
                // Log conversation ID for testing
                console.log('%c📋 Conversation ID:', 'color: #4CAF50; font-weight: bold', this.conversationId);
                console.log('%cUse this ID in the admin panel SSE test tool', 'color: #666;');
                
                // Store in localStorage for easy access
                localStorage.setItem('currentConversationId', this.conversationId);
                
                // Start SSE connection if not already connected
                if (!this.eventSource) {
                    this.connectToSSE();
                }
            }
            
            // Return the processing message (fire-and-forget)
            return {
                success: true,
                message: data.message || 'Processing your message...',
                messageId: data.message_id,
                status: data.status,
                sources: data.sources || [],
                responseTime: data.response_time_ms
            };
        } catch (error) {
            console.error('RAG API error:', error);
            return {
                success: false,
                message: 'I apologize, but I\'m having trouble connecting to the AI service. Please try again.',
                error: error.message
            };
        }
    }
    
    connectToSSE() {
        if (!this.conversationId) return;
        
        // Close existing connection if any
        if (this.eventSource) {
            this.eventSource.close();
        }
        
        // Create new SSE connection
        this.eventSource = new EventSource(`/api/rag/chat-stream/${this.conversationId}`);
        
        this.eventSource.onmessage = (event) => {
            const data = JSON.parse(event.data);
            
            if (data.type === 'chat-response' || data.type === 'test-message') {
                console.log('%c📨 Received SSE message:', 'color: #2196F3; font-weight: bold', data);
                
                // Update the chat with the AI response
                if (this.chat) {
                    // Find and update the processing message
                    const messages = this.chat.messagesGet();
                    const lastMessage = messages[messages.length - 1];
                    
                    // If last message is processing, update it
                    if (lastMessage && lastMessage.text && lastMessage.text.includes('Processing')) {
                        this.chat.messageRemove(lastMessage.id);
                    }
                    
                    // Add the response (use content for test messages, ai_response for regular)
                    const messageText = data.content || data.ai_response;
                    if (messageText) {
                        // Add test indicator if it's a test message
                        const displayText = data.is_test ? `🧪 [TEST] ${messageText}` : messageText;
                        this.chat.messageAddNew(displayText, 'Assistant', 'left');
                    }
                    
                    // Add sources if available
                    if (data.sources && data.sources.length > 0) {
                        const sourcesText = 'Sources: ' + data.sources.join(', ');
                        this.chat.messageAddNew(sourcesText, 'System', 'left');
                    }
                }
            } else if (data.type === 'connected') {
                console.log('Connected to chat stream:', data.conversation_id);
            }
        };
        
        this.eventSource.onerror = (error) => {
            console.error('SSE connection error:', error);
            // Reconnect after 5 seconds
            setTimeout(() => {
                if (this.conversationId) {
                    this.connectToSSE();
                }
            }, 5000);
        };
    }

    async loadConversationHistory() {
        if (!this.conversationId) return [];

        try {
            const response = await fetch(`/api/rag/conversation/${this.conversationId}`, {
                headers: {
                    'Authorization': `Bearer ${this.sessionToken}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to load conversation history');
            }

            const data = await response.json();
            return data.messages || [];
        } catch (error) {
            console.error('Failed to load history:', error);
            return [];
        }
    }

    formatMessage(message, isUser = false) {
        // Format message with proper styling and metadata
        const messageClass = isUser ? 'user-message' : 'assistant-message';
        const author = isUser ? 'You' : 'Assistant';
        const timestamp = new Date().toLocaleTimeString();
        
        return {
            text: message,
            class: messageClass,
            author: author,
            timestamp: timestamp
        };
    }

    init() {
        if (!this.container) {
            console.error('QuikChat container not found:', this.containerId);
            return;
        }

        // Clear container
        this.container.innerHTML = '';
        
        // Create QuikChat instance with RAG integration
        this.chat = new quikchat(this.container, async (instance, message) => {
            // Add user message immediately
            instance.messageAddNew(message, 'You', 'right');
            
            // Show typing indicator
            const typingId = instance.messageAddNew('Thinking...', 'Assistant', 'left');
            
            // Send to RAG API
            const response = await this.sendToRAG(message);
            
            // Remove typing indicator
            instance.messageRemove(typingId);
            
            // Add assistant response
            if (response.success) {
                instance.messageAddNew(response.message, 'Assistant', 'left');
                
                // Add sources if available
                if (response.sources && response.sources.length > 0) {
                    const sourcesText = 'Sources: ' + response.sources.join(', ');
                    instance.messageAddNew(sourcesText, 'System', 'left');
                }
            } else {
                instance.messageAddNew(response.message, 'Assistant', 'left');
            }
        }, {
            placeholder: 'Ask me anything about your workflows...',
            sendButtonText: '',  // We'll use CSS for the arrow
            title: '',  // No title needed, dashboard has its own
            theme: '',  // We'll use custom CSS instead of theme
            inputAreaHeight: '80px',
            showTitle: false, // We have our own title in the dashboard
            allowHTML: false, // Security: prevent HTML injection
            autofocus: true,
            clearOnSend: true,
            alternateRows: false
        });

        // Load initial greeting
        this.chat.messageAddNew('Hello! I\'m your AI assistant. I can help you with workflow automation, answer questions about your data, and guide you through the platform. What would you like to know?', 'Assistant', 'left');
        
        // Load conversation history if exists
        this.loadHistoryIfExists();
    }

    async loadHistoryIfExists() {
        const urlParams = new URLSearchParams(window.location.search);
        const convId = urlParams.get('conversation');
        
        if (convId) {
            this.conversationId = convId;
            const history = await this.loadConversationHistory();
            
            history.forEach(msg => {
                const alignment = msg.role === 'user' ? 'right' : 'left';
                const author = msg.role === 'user' ? 'You' : 'Assistant';
                this.chat.messageAddNew(msg.message, author, alignment);
            });
        }
    }

    // Method to programmatically send a message
    async sendMessage(message) {
        if (this.chat) {
            // Trigger the chat as if user typed it
            this.chat.send(message);
        }
    }

    // Clear conversation
    clearConversation() {
        this.conversationId = null;
        if (this.chat) {
            this.chat.messagesClear();
            // Re-add greeting
            this.chat.messageAddNew('Hello! How can I help you today?', 'Assistant', 'left');
        }
    }

    // Get current conversation ID
    getConversationId() {
        return this.conversationId;
    }

    // Export conversation
    async exportConversation() {
        if (!this.conversationId) {
            return null;
        }

        const history = await this.loadConversationHistory();
        return {
            conversation_id: this.conversationId,
            messages: history,
            exported_at: new Date().toISOString()
        };
    }
}

// Export for use in dashboard
window.QuikChatRAG = QuikChatRAG;