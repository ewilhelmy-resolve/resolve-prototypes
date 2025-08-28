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
                noChatsMessage.style.display = 'none';
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
                noChatsMessage.style.display = 'block';
            } else {
                chatsList.innerHTML = '<div class="no-chats"><p>No recent chats</p></div>';
            }
            return;
        }

        // Render each conversation
        this.conversations.forEach(conv => {
            const chatItem = document.createElement('div');
            chatItem.className = 'chat-item';
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
            
            // Style the chat item
            chatItem.style.cssText = `
                padding: 12px 16px;
                margin: 4px 8px;
                border-radius: 8px;
                cursor: pointer;
                transition: all 0.2s;
                border: 1px solid rgba(0, 0, 0, 0.08);
                background: rgba(255, 255, 255, 0.95);
                box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
                position: relative;
            `;
            
            // Add hover effect
            chatItem.onmouseover = () => {
                if (!chatItem.classList.contains('active')) {
                    chatItem.style.background = 'rgb(255, 255, 255)';
                    chatItem.style.border = '1px solid rgba(78, 205, 196, 0.2)';
                    chatItem.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.08)';
                    chatItem.style.transform = 'translateY(-1px)';
                }
            };
            chatItem.onmouseout = () => {
                if (chatItem.dataset.conversationId !== this.currentConversationId) {
                    chatItem.style.background = 'rgba(255, 255, 255, 0.95)';
                    chatItem.style.border = '1px solid rgba(0, 0, 0, 0.08)';
                    chatItem.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.04)';
                    chatItem.style.transform = 'translateY(0)';
                }
            };
            
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

        // Style the chat item content
        const style = document.createElement('style');
        style.textContent = `
            .chat-item-content {
                display: flex;
                flex-direction: column;
                gap: 6px;
                width: 100%;
            }
            .chat-item-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                gap: 8px;
            }
            .chat-item-title {
                font-size: 14px;
                color: rgb(26, 26, 26);
                font-weight: 500;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
                flex: 1;
                line-height: 1.3;
            }
            .chat-delete-btn {
                background: transparent;
                border: none;
                color: rgba(0, 0, 0, 0.4);
                cursor: pointer;
                padding: 4px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 4px;
                opacity: 0;
                transition: all 0.2s;
            }
            .chat-item:hover .chat-delete-btn {
                opacity: 1;
            }
            .chat-delete-btn:hover {
                background: rgba(239, 68, 68, 0.1);
                color: #EF4444;
            }
            .chat-item-meta {
                display: flex;
                justify-content: space-between;
                font-size: 12px;
                color: rgba(0, 0, 0, 0.6);
                margin-top: 2px;
            }
            .chat-item-count {
                color: rgba(0, 0, 0, 0.5);
                text-transform: uppercase;
                font-size: 10px;
                font-weight: 500;
            }
            .chat-item.active {
                background: rgb(255, 255, 255) !important;
                border: 1px solid rgba(78, 205, 196, 0.4) !important;
                box-shadow: 0 2px 8px rgba(78, 205, 196, 0.15) !important;
            }
            .chat-item.active .chat-item-title {
                color: rgb(26, 26, 26);
                font-weight: 600;
            }
        `;
        if (!document.querySelector('#chat-history-styles')) {
            style.id = 'chat-history-styles';
            document.head.appendChild(style);
        }
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
            <div class="modal-content" style="max-width: 420px;">
                <div class="modal-header">
                    <h3 class="modal-title">Delete Conversation</h3>
                </div>
                <div class="modal-body">
                    <p style="margin: 0; color: rgba(0, 0, 0, 0.7); font-size: 15px;">
                        Are you sure you want to delete this conversation? This action cannot be undone.
                    </p>
                </div>
                <div class="modal-footer">
                    <button class="modal-btn secondary" data-action="cancel">Cancel</button>
                    <button class="modal-btn primary" data-action="delete" style="background: linear-gradient(135deg, #dc2626, #ef4444);">
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
        // Create a styled error notification instead of alert
        const notification = document.createElement('div');
        notification.className = 'error-notification';
        notification.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: #ef4444;
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            font-size: 14px;
            z-index: 10000;
            animation: slideIn 0.3s ease;
        `;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
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
                item.style.background = 'rgb(255, 255, 255)';
                item.style.border = '1px solid rgba(78, 205, 196, 0.4)';
                item.style.boxShadow = '0 2px 8px rgba(78, 205, 196, 0.15)';
            } else {
                item.classList.remove('active');
                item.style.background = 'rgba(255, 255, 255, 0.95)';
                item.style.border = '1px solid rgba(0, 0, 0, 0.08)';
                item.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.04)';
                item.style.transform = 'translateY(0)';
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
                // Clear existing messages
                window.chatInstance.chat.messagesClear();
                
                // Set the conversation ID
                window.chatInstance.conversationId = conversationId;
                
                // Load messages into chat
                data.messages.forEach(msg => {
                    const alignment = msg.role === 'user' ? 'right' : 'left';
                    const author = msg.role === 'user' ? 'You' : 'Assistant';
                    window.chatInstance.chat.messageAddNew(msg.message, author, alignment);
                });
                
                console.log(`[Chat History] Loaded ${data.messages.length} messages`);
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
            item.style.background = 'transparent';
            item.style.border = '1px solid transparent';
        });
        
        // Clear chat and reset conversation ID
        if (window.chatInstance) {
            window.chatInstance.clearConversation();
        }
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