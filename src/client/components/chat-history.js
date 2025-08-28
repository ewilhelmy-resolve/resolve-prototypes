// Chat History Management Component
class ChatHistoryManager {
    constructor() {
        this.currentConversationId = null;
        this.conversations = [];
        this.sessionToken = this.getSessionToken();
        this.refreshInterval = null;
    }

    getSessionToken() {
        const cookies = document.cookie.split(';');
        for (let cookie of cookies) {
            const [name, value] = cookie.trim().split('=');
            if (name === 'sessionToken') {
                return decodeURIComponent(value);
            }
        }
        return null;
    }

    async loadRecentConversations() {
        try {
            console.log('[Chat History] Loading recent conversations...');
            const response = await fetch('/api/rag/recent-conversations?limit=20', {
                headers: {
                    'Authorization': `Bearer ${this.sessionToken}`
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to load conversations: ${response.status}`);
            }

            const data = await response.json();
            this.conversations = data.conversations || [];
            console.log(`[Chat History] Loaded ${this.conversations.length} conversations`);
            
            this.renderConversationList();
            return this.conversations;
        } catch (error) {
            console.error('[Chat History] Error loading conversations:', error);
            return [];
        }
    }

    renderConversationList() {
        const chatsSection = document.querySelector('.chats-section');
        if (!chatsSection) {
            console.warn('[Chat History] Chat section not found');
            return;
        }

        // Find or create the container for chat items
        let chatsList = chatsSection.querySelector('.chats-list');
        if (!chatsList) {
            // Remove "No recent chats" message if it exists
            const noChatsMessage = chatsSection.querySelector('.no-chats');
            if (noChatsMessage) {
                noChatsMessage.classList.add('hidden');
            }

            // Create chat list container
            chatsList = document.createElement('div');
            chatsList.className = 'chats-list';
            chatsSection.appendChild(chatsList);
        }

        // Clear existing items
        chatsList.innerHTML = '';

        if (this.conversations.length === 0) {
            // Show "No recent chats" if no conversations
            const noChatsMessage = chatsSection.querySelector('.no-chats');
            if (noChatsMessage) {
                noChatsMessage.classList.remove('hidden');
            } else {
                chatsList.innerHTML = '<div class="no-chats"><p>No recent chats</p></div>';
            }
            return;
        }

        // Render each conversation
        this.conversations.forEach(conv => {
            const chatItem = document.createElement('div');
            chatItem.className = 'chat-item';
            if (this.currentConversationId === conv.conversation_id) {
                chatItem.classList.add('active');
            }
            chatItem.dataset.conversationId = conv.conversation_id;
            
            // Format the last message preview
            const lastMessage = conv.last_user_message || 'New conversation';
            const truncatedMessage = lastMessage.length > 50 
                ? lastMessage.substring(0, 47) + '...' 
                : lastMessage;
            
            // Format timestamp
            const timestamp = conv.last_message_time 
                ? this.formatTimestamp(conv.last_message_time)
                : '';
            
            chatItem.innerHTML = `
                <div class="chat-item-content">
                    <div class="chat-item-header">
                        <div class="chat-item-title">${truncatedMessage}</div>
                        <button class="chat-delete-btn" data-conversation-id="${conv.conversation_id}" title="Delete conversation">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14M10 11v6M14 11v6"/>
                            </svg>
                        </button>
                    </div>
                    <div class="chat-item-meta">
                        <span class="chat-item-time">${timestamp}</span>
                        <span class="chat-item-count">${conv.message_count || 0} messages</span>
                    </div>
                </div>
            `;
            
            // No inline styles - rely on CSS classes
            
            // Add click handler for the chat item (not the delete button)
            chatItem.onclick = (e) => {
                // Don't load conversation if clicking the delete button
                if (!e.target.closest('.chat-delete-btn')) {
                    this.loadConversation(conv.conversation_id);
                }
            };
            
            // Add delete button handler
            const deleteBtn = chatItem.querySelector('.chat-delete-btn');
            deleteBtn.onclick = (e) => {
                e.stopPropagation();
                this.deleteConversation(conv.conversation_id);
            };
            
            chatsList.appendChild(chatItem);
        });

        // Styles are now managed in CSS files
    }

    formatTimestamp(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;
        
        // Less than 1 minute
        if (diff < 60000) {
            return 'Just now';
        }
        // Less than 1 hour
        if (diff < 3600000) {
            const minutes = Math.floor(diff / 60000);
            return `${minutes}m ago`;
        }
        // Less than 24 hours
        if (diff < 86400000) {
            const hours = Math.floor(diff / 3600000);
            return `${hours}h ago`;
        }
        // Less than 7 days
        if (diff < 604800000) {
            const days = Math.floor(diff / 86400000);
            return `${days}d ago`;
        }
        // Default to date
        return date.toLocaleDateString();
    }

    showDeleteConfirmation(conversationId) {
        // Create modal overlay
        const modalOverlay = document.createElement('div');
        modalOverlay.className = 'modal-overlay';
        modalOverlay.innerHTML = `
            <div class="modal-content delete-modal">
                <div class="modal-header">
                    <h3 class="modal-title">Delete Conversation</h3>
                </div>
                <div class="modal-body">
                    <p class="delete-modal-text">
                        Are you sure you want to delete this conversation? This action cannot be undone.
                    </p>
                </div>
                <div class="modal-footer">
                    <button class="modal-btn secondary" data-action="cancel">Cancel</button>
                    <button class="modal-btn primary delete-btn" data-action="delete">
                        Delete
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modalOverlay);
        
        // Show modal with animation
        requestAnimationFrame(() => {
            modalOverlay.classList.add('show');
        });
        
        // Handle button clicks
        const handleClick = (e) => {
            const action = e.target.dataset.action;
            
            if (action === 'cancel') {
                modalOverlay.classList.remove('show');
                setTimeout(() => modalOverlay.remove(), 300);
            } else if (action === 'delete') {
                modalOverlay.classList.remove('show');
                setTimeout(() => modalOverlay.remove(), 300);
                this.performDeleteConversation(conversationId);
            }
        };
        
        modalOverlay.querySelectorAll('[data-action]').forEach(btn => {
            btn.addEventListener('click', handleClick);
        });
        
        // Close on overlay click
        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) {
                modalOverlay.classList.remove('show');
                setTimeout(() => modalOverlay.remove(), 300);
            }
        });
    }

    async deleteConversation(conversationId) {
        this.showDeleteConfirmation(conversationId);
    }
    
    async performDeleteConversation(conversationId) {
        try {
            console.log(`[Chat History] Deleting conversation: ${conversationId}`);
            
            const response = await fetch(`/api/rag/conversation/${conversationId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${this.sessionToken}`
                }
            });
            
            if (response.ok) {
                // Remove from local list
                this.conversations = this.conversations.filter(c => c.conversation_id !== conversationId);
                
                // If this was the active conversation, clear the chat
                if (this.currentConversationId === conversationId) {
                    this.handleNewChat();
                }
                
                // Re-render the list
                this.renderConversationList();
                
                console.log(`[Chat History] Conversation deleted successfully`);
            } else {
                console.error(`[Chat History] Failed to delete conversation: ${response.status}`);
                this.showErrorMessage('Failed to delete conversation. Please try again.');
            }
        } catch (error) {
            console.error('[Chat History] Error deleting conversation:', error);
            this.showErrorMessage('Failed to delete conversation. Please try again.');
        }
    }
    
    showErrorMessage(message) {
        // Create error notification without inline styles
        const notification = document.createElement('div');
        notification.className = 'error-notification';
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // Add show animation
        requestAnimationFrame(() => {
            notification.classList.add('show');
        });
        
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    async loadConversation(conversationId) {
        console.log(`[Chat History] Loading conversation: ${conversationId}`);
        this.currentConversationId = conversationId;
        
        // Update active state in UI
        document.querySelectorAll('.chat-item').forEach(item => {
            if (item.dataset.conversationId === conversationId) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
        
        try {
            // Load conversation history
            const response = await fetch(`/api/rag/conversation/${conversationId}`, {
                headers: {
                    'Authorization': `Bearer ${this.sessionToken}`
                }
            });
            
            if (!response.ok) {
                throw new Error('Failed to load conversation');
            }
            
            const data = await response.json();
            
            // Clear current chat and load messages
            if (window.chatInstance && window.chatInstance.chat) {
                // Clear existing messages using historyClear
                if (window.chatInstance.chat.historyClear) {
                    window.chatInstance.chat.historyClear();
                } else {
                    // Fallback: manually clear the messages area
                    const messagesArea = document.querySelector('.quikchat-messages-area');
                    if (messagesArea) {
                        messagesArea.innerHTML = '';
                    }
                }
                
                // Set the conversation ID in the chatInstance
                window.chatInstance.conversationId = conversationId;
                localStorage.setItem('currentConversationId', conversationId);
                
                // Reconnect SSE for this conversation
                if (window.chatInstance.eventSource) {
                    window.chatInstance.eventSource.close();
                }
                window.chatInstance.connectToSSE();
                
                // Load messages into chat
                if (data.messages && data.messages.length > 0) {
                    data.messages.forEach(msg => {
                        const alignment = msg.role === 'user' ? 'right' : 'left';
                        const author = msg.role === 'user' ? 'You' : 'Assistant';
                        window.chatInstance.chat.messageAddNew(msg.message, author, alignment);
                    });
                    console.log(`[Chat History] Loaded ${data.messages.length} messages`);
                } else {
                    // No messages in this conversation, show continuation message
                    window.chatInstance.chat.messageAddNew('Continue your conversation...', 'Assistant', 'left');
                    console.log('[Chat History] Loaded empty conversation');
                }
            }
        } catch (error) {
            console.error('[Chat History] Error loading conversation:', error);
        }
    }

    handleNewChat() {
        console.log('[Chat History] Creating new chat');
        this.currentConversationId = null;
        
        // Clear active states
        document.querySelectorAll('.chat-item').forEach(item => {
            item.classList.remove('active');
        });
        
        // Clear chat and reset conversation ID
        if (window.chatInstance) {
            // Close existing SSE connection
            if (window.chatInstance.eventSource) {
                window.chatInstance.eventSource.close();
                window.chatInstance.eventSource = null;
            }
            
            // Clear the conversation
            window.chatInstance.clearConversation();
            
            // Clear localStorage
            localStorage.removeItem('currentConversationId');
            
            console.log('[Chat History] New chat started');
        }
        
        // Reload conversations to refresh the list after a short delay
        setTimeout(() => {
            this.loadRecentConversations();
        }, 500);
    }

    startAutoRefresh(interval = 30000) {
        // Clear existing interval if any
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }
        
        // Set up new interval
        this.refreshInterval = setInterval(() => {
            this.loadRecentConversations();
        }, interval);
        
        console.log(`[Chat History] Auto-refresh started (every ${interval/1000}s)`);
    }

    stopAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
            console.log('[Chat History] Auto-refresh stopped');
        }
    }

    init() {
        console.log('[Chat History] Initializing...');
        
        // Check if there's a current conversation in localStorage
        const currentConvId = localStorage.getItem('currentConversationId');
        if (currentConvId) {
            this.currentConversationId = currentConvId;
            console.log(`[Chat History] Found current conversation: ${currentConvId}`);
        }
        
        // Load initial conversations
        this.loadRecentConversations();
        
        // Set up new chat button handler
        const newChatBtn = document.querySelector('.new-chat-btn');
        if (newChatBtn) {
            newChatBtn.addEventListener('click', () => this.handleNewChat());
        }
        
        // Start auto-refresh
        this.startAutoRefresh(30000); // Refresh every 30 seconds
        
        // Listen for new messages to refresh the list
        if (window.chatInstance) {
            const originalSendToRAG = window.chatInstance.sendToRAG.bind(window.chatInstance);
            window.chatInstance.sendToRAG = async (message) => {
                const result = await originalSendToRAG(message);
                // Refresh conversation list after sending a message
                setTimeout(() => {
                    this.loadRecentConversations();
                }, 2000);
                return result;
            };
        }
        
        console.log('[Chat History] Initialization complete');
    }
}

// Export for use in dashboard
window.ChatHistoryManager = ChatHistoryManager;