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
    
    async checkForMissedMessages() {
        if (!this.conversationId) return;
        
        try {
            // For now, just get recent messages without checking what we already have
            const url = `/api/rag/conversation/${this.conversationId}/new-messages`;
                
            const response = await fetch(url, {
                headers: {
                    'Authorization': 'Bearer active'
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.messages && data.messages.length > 0) {
                    console.log(`%c📬 Found ${data.messages.length} messages in conversation`, 'color: #2196F3; font-weight: bold');
                    
                    // For now, we'll skip adding them automatically to avoid duplicates
                    // This is just to check if messages are being saved
                }
            }
        } catch (error) {
            console.error('Error checking for missed messages:', error);
        }
    }
    
    connectToSSE() {
        if (!this.conversationId) return;
        
        // Close existing connection if any
        if (this.eventSource) {
            this.eventSource.close();
        }
        
        console.log(`%c🔌 Connecting SSE for conversation: ${this.conversationId}`, 'color: #4CAF50; font-weight: bold');
        
        // Create new SSE connection
        this.eventSource = new EventSource(`/api/rag/chat-stream/${this.conversationId}`);
        
        // Handle successful connection
        this.eventSource.onopen = () => {
            console.log('%c✅ SSE Connected', 'color: #4CAF50; font-weight: bold');
            this.sseReconnectAttempts = 0;
            
            // Clear any message checking interval
            if (this.messageCheckInterval) {
                clearInterval(this.messageCheckInterval);
                this.messageCheckInterval = null;
            }
            
            // Check for any messages we might have missed
            this.checkForMissedMessages();
        };
        
        this.eventSource.onmessage = (event) => {
            const data = JSON.parse(event.data);
            
            if (data.type === 'chat-response' || data.type === 'test-message') {
                console.log('%c📨 Received SSE message:', 'color: #2196F3; font-weight: bold', data);
                
                // Update the chat with the AI response
                if (this.chat) {
                    // We can't check existing messages without the API, so just add the new one
                    // The chat library might handle duplicates internally
                    
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
            console.error('%c❌ SSE connection error', 'color: #f44336; font-weight: bold', error);
            
            // EventSource will auto-reconnect, but we can help it
            if (this.eventSource.readyState === EventSource.CLOSED) {
                console.log('%c🔄 SSE connection closed, attempting reconnect...', 'color: #FF9800; font-weight: bold');
                
                // Start checking for messages while SSE is down (every 3 seconds)
                if (!this.messageCheckInterval) {
                    console.log('%c📮 Starting message check interval while SSE is down', 'color: #FF9800');
                    this.messageCheckInterval = setInterval(() => {
                        this.checkForMissedMessages();
                    }, 3000);
                }
                
                // Exponential backoff for reconnection
                this.sseReconnectAttempts = (this.sseReconnectAttempts || 0) + 1;
                const delay = Math.min(1000 * Math.pow(2, this.sseReconnectAttempts - 1), 30000); // Max 30s
                
                console.log(`%c⏰ Reconnecting in ${delay/1000}s (attempt ${this.sseReconnectAttempts})`, 'color: #FF9800');
                
                setTimeout(() => {
                    if (this.conversationId && (!this.eventSource || this.eventSource.readyState === EventSource.CLOSED)) {
                        this.connectToSSE();
                    }
                }, delay);
            }
        };
    }

    async loadConversationHistory() {
        if (!this.conversationId) return [];
        
        // Also check for any missed messages
        this.checkForMissedMessages();

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