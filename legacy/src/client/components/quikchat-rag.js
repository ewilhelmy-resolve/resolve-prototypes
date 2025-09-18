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
                const isNewConversation = !this.conversationId;
                this.conversationId = data.conversation_id;
                
                // Store conversation ID for testing
                
                // Store in localStorage for easy access
                localStorage.setItem('currentConversationId', this.conversationId);
                
                // Update ChatHistoryManager when a new conversation is created
                if (window.chatHistoryManager) {
                    if (isNewConversation) {
                        window.chatHistoryManager.onConversationCreated(this.conversationId);
                    } else {
                        window.chatHistoryManager.currentConversationId = this.conversationId;
                    }
                }
                
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
        if (!this.conversationId || this.isAuthError) return;
        
        try {
            // For now, just get recent messages without checking what we already have
            const url = `/api/rag/conversation/${this.conversationId}/new-messages`;
                
            const response = await fetch(url, {
                headers: {
                    'Authorization': 'Bearer active'
                },
                credentials: 'include' // Include cookies for auth
            });
            
            if (response.status === 401 || response.status === 403) {
                console.error('%c🚫 Authentication failed - stopping message checks', 'color: #f44336; font-weight: bold');
                this.isAuthError = true;
                // Clear the interval
                if (this.messageCheckInterval) {
                    clearInterval(this.messageCheckInterval);
                    this.messageCheckInterval = null;
                }
                // Redirect to login
                window.location.href = '/signin';
                return;
            }
            
            if (response.ok) {
                const data = await response.json();
                if (data.messages && data.messages.length > 0) {
                    // Found messages in conversation
                    
                    // For now, we'll skip adding them automatically to avoid duplicates
                    // This is just to check if messages are being saved
                }
            }
        } catch (error) {
            console.error('Error checking for missed messages:', error);
        }
    }
    
    showLoadingIndicator(chatInstance) {
        // Create system-level loading indicator (not in a card)
        const loadingIndicator = document.createElement('div');
        loadingIndicator.className = 'system-loading-indicator';
        loadingIndicator.innerHTML = `
            <div class="loading-content">
                <span class="loading-text">Rita is thinking</span>
                <div class="loading-dots">
                    <span class="dot"></span>
                    <span class="dot"></span>
                    <span class="dot"></span>
                </div>
            </div>
        `;
        
        // Add to messages area but not as a QuikChat message
        const messagesArea = document.querySelector('.quikchat-messages-area');
        if (messagesArea) {
            messagesArea.appendChild(loadingIndicator);
            this.currentLoadingIndicator = loadingIndicator;
            
            // Scroll to show the indicator
            messagesArea.scrollTo({
                top: messagesArea.scrollHeight,
                behavior: 'smooth'
            });
        }
    }
    
    removeLoadingIndicator(chatInstance) {
        if (this.currentLoadingIndicator && this.currentLoadingIndicator.parentNode) {
            this.currentLoadingIndicator.remove();
            this.currentLoadingIndicator = null;
        }
    }
    
    stopSSE() {
        // Close the EventSource connection
        if (this.eventSource) {
            this.eventSource.close();
            this.eventSource = null;
        }
        
        // Clear any intervals
        if (this.messageCheckInterval) {
            clearInterval(this.messageCheckInterval);
            this.messageCheckInterval = null;
        }
        
        // Reset reconnection attempts
        this.sseReconnectAttempts = 0;
        
        // SSE connection stopped
    }
    
    connectToSSE() {
        if (!this.conversationId) {
            console.error('[SSE] ❌ Cannot connect - no conversation ID');
            return;
        }
        
        // Close existing connection if any
        if (this.eventSource) {
            this.eventSource.close();
        }
        
        console.log('[SSE] 🔌 Attempting to connect SSE for conversation:', this.conversationId);
        
        // Create new SSE connection
        const sseUrl = `/api/rag/chat-stream/${this.conversationId}`;
        console.log('[SSE] 📡 SSE URL:', sseUrl);
        
        try {
            // Add credentials to SSE connection
            this.eventSource = new EventSource(sseUrl, {
                withCredentials: true
            });
            console.log('[SSE] 🚀 EventSource created with credentials, readyState:', this.eventSource.readyState);
        } catch (error) {
            console.error('[SSE] ❌ Failed to create EventSource:', error);
            return;
        }
        
        // Handle successful connection
        this.eventSource.onopen = () => {
            console.log('[SSE] ✅ SSE connection opened successfully');
            console.log('[SSE] 🔗 Connection readyState:', this.eventSource.readyState);
            console.log('[SSE] 📍 Connection URL:', this.eventSource.url);
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
            console.log('[SSE] 📨 Received SSE message:', event.data);
            
            let data;
            try {
                data = JSON.parse(event.data);
                console.log('[SSE] 📋 Parsed SSE data:', data);
            } catch (error) {
                console.error('[SSE] ❌ Failed to parse SSE message:', error);
                return;
            }
            
            if (data.type === 'chat-response' || data.type === 'test-message') {
                console.log('[SSE] 🤖 Processing chat-response message');
                
                // Update the chat with the AI response
                if (this.chat) {
                    // Remove loading indicator first
                    this.removeLoadingIndicator(this.chat);
                    
                    // Add the response (use content for test messages, ai_response for regular)
                    const messageText = data.content || data.ai_response;
                    console.log('[SSE] 💬 Message text to display:', messageText);
                    
                    if (messageText) {
                        // Add test indicator if it's a test message
                        const displayText = data.is_test ? `🧪 [TEST] ${messageText}` : messageText;
                        console.log('[SSE] 📝 Adding message to chat:', displayText);
                        this.chat.messageAddNew(displayText, 'Assistant', 'left');
                        
                        // Emit event for chat history to update
                        window.dispatchEvent(new CustomEvent('rag-conversation-updated', {
                            detail: { 
                                conversationId: this.conversationId,
                                messageType: 'assistant',
                                message: messageText
                            }
                        }));
                    } else {
                        console.warn('[SSE] ⚠️ No message text found in SSE data');
                    }
                    
                    // Sources are available in data.sources but not displayed in chat
                    // to avoid cluttering the conversation
                    // if (data.sources && data.sources.length > 0) {
                    //     const sourcesText = 'Sources: ' + data.sources.join(', ');
                    //     this.chat.messageAddNew(sourcesText, 'System', 'left');
                    // }
                } else {
                    console.error('[SSE] ❌ Chat instance not available');
                }
            } else if (data.type === 'connected') {
                console.log('[SSE] ✅ Connected to chat stream');
            } else if (data.type === 'heartbeat') {
                console.log('[SSE] 💓 Heartbeat received');
            } else {
                console.log('[SSE] 🔍 Unknown message type:', data.type);
            }
        };
        
        this.eventSource.onerror = (error) => {
            console.error('%c❌ SSE connection error', 'color: #f44336; font-weight: bold', error);
            
            // Check if this is an authentication error
            if (this.isAuthError) {
                console.error('%c🚫 Authentication failed - stopping SSE reconnection attempts', 'color: #f44336; font-weight: bold');
                this.stopSSE();
                // Clear any intervals
                if (this.messageCheckInterval) {
                    clearInterval(this.messageCheckInterval);
                    this.messageCheckInterval = null;
                }
                // Redirect to login page
                window.location.href = '/signin';
                return;
            }
            
            // EventSource will auto-reconnect, but we can help it
            if (this.eventSource.readyState === EventSource.CLOSED) {
                // SSE connection closed, attempting reconnect
                
                // Start checking for messages while SSE is down (every 3 seconds)
                if (!this.messageCheckInterval && !this.isAuthError) {
                    // Starting message check interval while SSE is down
                    this.messageCheckInterval = setInterval(() => {
                        this.checkForMissedMessages();
                    }, 3000);
                }
                
                // Exponential backoff for reconnection
                this.sseReconnectAttempts = (this.sseReconnectAttempts || 0) + 1;
                const delay = Math.min(1000 * Math.pow(2, this.sseReconnectAttempts - 1), 30000); // Max 30s
                
                // Limit reconnection attempts
                if (this.sseReconnectAttempts > 5) {
                    console.error('%c⛔ Max SSE reconnection attempts reached', 'color: #f44336; font-weight: bold');
                    this.stopSSE();
                    return;
                }
                
                // Reconnecting with exponential backoff
                
                setTimeout(() => {
                    if (this.conversationId && (!this.eventSource || this.eventSource.readyState === EventSource.CLOSED) && !this.isAuthError) {
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
            
            // Show animated loading indicator immediately
            this.showLoadingIndicator(instance);
            
            // Send to RAG API
            const response = await this.sendToRAG(message);
            
            // Handle response
            if (response.success) {
                // Check if this is just a processing message
                if (response.message.includes('processing your message')) {
                    // Keep the loading indicator visible - it will be removed when real response arrives via SSE
                    console.log('Keeping loading indicator for processing message');
                } else {
                    // Real response received, remove loading indicator and show message
                    this.removeLoadingIndicator(instance);
                    instance.messageAddNew(response.message, 'Assistant', 'left');
                }
                
                // Sources are available in response.sources but not displayed in chat
                // to avoid cluttering the conversation
                // if (response.sources && response.sources.length > 0) {
                //     const sourcesText = 'Sources: ' + response.sources.join(', ');
                //     instance.messageAddNew(sourcesText, 'System', 'left');
                // }
                
                // Refresh chat history to show the new conversation or update existing
                if (window.chatHistoryManager) {
                    setTimeout(() => {
                        window.chatHistoryManager.loadRecentConversations();
                    }, 1000);
                }
            } else {
                // Error case - remove loading indicator and show error message
                this.removeLoadingIndicator(instance);
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
        let convId = urlParams.get('conversation');
        
        // If no URL param, check localStorage for last conversation
        if (!convId) {
            convId = localStorage.getItem('currentConversationId');
        }
        
        if (convId) {
            // Validate that this conversation ID actually exists before trying to connect
            try {
                const response = await fetch(`/api/rag/conversation/${convId}/validate`, {
                    method: 'GET',
                    credentials: 'include'
                });
                
                if (response.ok) {
                    this.conversationId = convId;
                    // Loading conversation from localStorage
                    
                    // Don't reload history here - let the ChatHistoryManager handle it
                    // Just set up the SSE connection
                    this.connectToSSE();
                } else {
                    // Invalid conversation ID, clear it
                    console.log('Invalid conversation ID, clearing from localStorage');
                    localStorage.removeItem('currentConversationId');
                    this.conversationId = null;
                }
            } catch (error) {
                console.error('Error validating conversation:', error);
                localStorage.removeItem('currentConversationId');
                this.conversationId = null;
            }
        } else {
            // No existing conversation, clear the greeting and show fresh one
            // No existing conversation found
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
            // Clear messages using historyClear
            if (this.chat.historyClear) {
                this.chat.historyClear();
                // Also clear the visual messages
                const messagesArea = document.querySelector('.quikchat-messages-area');
                if (messagesArea) {
                    messagesArea.innerHTML = '';
                }
            } else {
                // Fallback: manually clear the messages area
                const messagesArea = document.querySelector('.quikchat-messages-area');
                if (messagesArea) {
                    messagesArea.innerHTML = '';
                }
            }
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