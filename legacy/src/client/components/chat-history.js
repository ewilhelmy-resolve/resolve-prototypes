// Chat History Management Component
class ChatHistoryManager {
    constructor() {
        // Prevent multiple instances
        if (window.chatHistoryManagerInstance) {
            return window.chatHistoryManagerInstance;
        }
        
        this.currentConversationId = null;
        this.conversations = [];
        this.sessionToken = this.getSessionToken();
        this.refreshInterval = null;
        this.reloadTimeout = null;
        this.lastReloadTime = 0;
        this.lastConversationLoad = 0;
        this.isDestroyed = false;
        this.isRendering = false;
        this.isLoadingConversation = false;
        this.currentLoadingAbortController = null;
        this.pendingSSECleanup = null;
        this.activeRequests = new Map(); // Track active API requests
        this.requestQueue = new Map(); // Queue to prevent duplicate requests
        this.clickDebounceTimer = null; // Debounce timer for chat clicks
        this.pendingChatLoad = null; // Track pending chat to load
        this.uiUpdateQueue = []; // Queue for UI updates to prevent flashing
        this.domLocked = false; // Lock to prevent any DOM manipulation during critical operations
        
        // Store global reference
        window.chatHistoryManagerInstance = this;
        
        // Clean up on page unload
        window.addEventListener('beforeunload', () => this.destroy());
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

    async loadRecentConversations(force = false) {
        if (this.isDestroyed) {
            console.log('[Chat History] Instance destroyed, skipping load');
            return [];
        }
        
        // ULTRA PROTECTION: Block ANY reloading during ANY interaction
        if (this.domLocked || this.clickDebounceTimer || this.isLoadingConversation || this.isRendering) {
            console.log('[Chat History] BLOCKED: Interaction in progress, preventing reload');
            return this.conversations;
        }
        
        // Don't reload conversations while actively loading a conversation
        if (this.isLoadingConversation && !force) {
            console.log('[Chat History] BLOCKED: Currently loading a conversation');
            return this.conversations;
        }
        
        const requestKey = 'recent-conversations';
        
        // STRONGEST API PROTECTION: Check if request is already in progress
        if (this.activeRequests.has(requestKey)) {
            console.log('[Chat History] BLOCKED: Recent conversations request already in progress');
            return this.activeRequests.get(requestKey);
        }
        
        // Prevent rapid reloads unless forced (increased to 3 seconds)
        const now = Date.now();
        if (!force && (now - this.lastReloadTime) < 3000) {
            console.log('[Chat History] BLOCKED: Reload too soon (3s protection)');
            return this.conversations;
        }
        this.lastReloadTime = now;
        
        try {
            // Create abort controller for this request
            const abortController = new AbortController();
            
            // Load recent conversations with request tracking
            const requestPromise = fetch('/api/rag/recent-conversations?limit=20', {
                headers: {
                    'Authorization': `Bearer ${this.sessionToken}`
                },
                credentials: 'include',
                signal: abortController.signal
            });
            
            // Track this request
            this.activeRequests.set(requestKey, requestPromise);
            
            const response = await requestPromise;

            if (response.status === 401 || response.status === 403) {
                console.error('[Chat History] Authentication failed - stopping refresh');
                // Stop auto-refresh
                this.stopAutoRefresh();
                // Redirect to login
                window.location.href = '/signin';
                return [];
            }

            if (!response.ok) {
                throw new Error(`Failed to load conversations: ${response.status}`);
            }

            const data = await response.json();
            this.conversations = data.conversations || [];
            // Successfully loaded conversations
            
            // Check if current conversation is in the list
            if (this.currentConversationId) {
                const hasCurrentConv = this.conversations.some(c => c.conversation_id === this.currentConversationId);
                // Current conversation status checked
            }
            
            this.renderConversationList();
            return this.conversations;
        } catch (error) {
            if (error.name === 'AbortError') {
                console.log('[Chat History] Recent conversations request was cancelled');
                return this.conversations;
            }
            console.error('[Chat History] Error loading conversations:', error);
            return [];
        } finally {
            // Clean up request tracking
            this.activeRequests.delete(requestKey);
        }
    }

    renderConversationList() {
        if (this.isDestroyed) {
            console.log('[Chat History] Instance destroyed, skipping render');
            return;
        }
        
        const chatsSection = document.querySelector('.chats-section');
        if (!chatsSection) {
            console.warn('[Chat History] Chat section not found');
            return;
        }
        
        // Find or create the container for chat items
        let chatsList = chatsSection.querySelector('.chats-list');
        
        // CRITICAL: If chat list exists with items, ONLY update active states
        if (chatsList && chatsList.children.length > 0) {
            const existingItems = chatsList.querySelectorAll('.chat-item');
            existingItems.forEach(item => {
                const isActive = this.currentConversationId === item.dataset.conversationId;
                item.classList.toggle('active', isActive);
                
                // ENSURE click handlers are attached (they might have been lost)
                if (!item.hasAttribute('data-click-handler')) {
                    const conversationId = item.dataset.conversationId;
                    item.setAttribute('data-click-handler', 'true');
                    
                    // Remove any existing listeners first
                    const newItem = item.cloneNode(true);
                    item.parentNode.replaceChild(newItem, item);
                    
                    // Add the click handler
                    newItem.addEventListener('click', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        e.stopImmediatePropagation();
                        
                        if (!e.target.closest('.chat-delete-btn')) {
                            this.handleChatClickDebounced(conversationId, newItem);
                        }
                        return false;
                    }, true);
                    
                    // Re-attach delete button handler
                    const deleteBtn = newItem.querySelector('.chat-delete-btn');
                    if (deleteBtn) {
                        deleteBtn.onclick = (e) => {
                            e.stopPropagation();
                            this.deleteConversation(conversationId);
                        };
                    }
                }
            });
            console.log('[Chat History] Preserved DOM - only updated active states');
            return;
        }
        
        // Only create/populate list if it doesn't exist or is empty
        this.isRendering = true;
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

        // Only populate if the list is empty (initial load)
        if (this.conversations.length === 0) {
            // Show "No recent chats" if no conversations
            chatsList.innerHTML = '<div class="no-chats"><p>No recent chats</p></div>';
        } else if (chatsList.children.length === 0) {
            // Add all conversations on initial load
            this.conversations.forEach(conv => {
                const chatItem = this.createChatItem(conv);
                chatsList.appendChild(chatItem);
            });
            console.log(`[Chat History] Initial render - added ${this.conversations.length} chats`);
        }
        
        // Reset rendering flag
        this.isRendering = false;
    }

    createChatItem(conv) {
        const chatItem = document.createElement('div');
        chatItem.className = 'chat-item';
        // Don't add active class unless explicitly set by user interaction
        if (this.currentConversationId && this.currentConversationId === conv.conversation_id) {
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
        
        // Mark that we've attached a click handler
        chatItem.setAttribute('data-click-handler', 'true');
        
        // Add click handler with addEventListener for better control
        chatItem.addEventListener('click', (e) => {
            // PREVENT ANY DEFAULT BEHAVIOR - NO NAVIGATION!
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            
            // Don't load conversation if clicking the delete button
            if (!e.target.closest('.chat-delete-btn')) {
                this.handleChatClickDebounced(conv.conversation_id, chatItem);
            }
            
            // Return false to be extra sure
            return false;
        }, true); // Use capture phase to intercept early
        
        // Add delete button handler
        const deleteBtn = chatItem.querySelector('.chat-delete-btn');
        deleteBtn.onclick = (e) => {
            e.stopPropagation();
            this.deleteConversation(conv.conversation_id);
        };
        
        return chatItem;
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

    handleChatClickDebounced(conversationId, chatItem) {
        // Simple click handling - no complex debouncing
        
        // 1. Same conversation already active - do nothing
        if (this.currentConversationId === conversationId) {
            console.log('[Chat History] Same conversation already active');
            return;
        }
        
        // 2. If already loading, ignore the click
        if (this.isLoadingConversation) {
            console.log('[Chat History] Already loading, ignoring click');
            return;
        }
        
        // 3. Update visual feedback immediately
        document.querySelectorAll('.chat-item').forEach(item => {
            item.classList.remove('active');
        });
        chatItem.classList.add('active');
        
        // 4. Load the conversation
        this.handleChatClick(conversationId, chatItem);
    }

    handleChatClick(conversationId, chatItem) {
        // Simple click handler
        
        // Set loading flag
        this.isLoadingConversation = true;
        this.currentConversationId = conversationId;
        
        // Cancel any previous loading operation
        if (this.currentLoadingAbortController) {
            this.currentLoadingAbortController.abort();
            this.currentLoadingAbortController = null;
        }
        
        // Load the conversation
        this.loadConversation(conversationId)
            .finally(() => {
                // Reset loading flag
                this.isLoadingConversation = false;
            });
    }

    async loadConversation(conversationId) {
        console.log(`[Chat History] Loading conversation: ${conversationId}`);
        
        const requestKey = `conversation-${conversationId}`;
        
        // STRONGEST API PROTECTION: Check if this specific conversation is already loading
        if (this.activeRequests.has(requestKey)) {
            console.log(`[Chat History] BLOCKED: Conversation ${conversationId} already loading`);
            return this.activeRequests.get(requestKey);
        }
        
        // Create abort controller for this operation
        this.currentLoadingAbortController = new AbortController();
        const { signal } = this.currentLoadingAbortController;
        
        try {
            // Check if operation was cancelled before we start
            if (signal.aborted) {
                console.log('[Chat History] Operation cancelled before start');
                return;
            }
            
            this.currentConversationId = conversationId;
            
            // Update active state in UI (only if not cancelled)
            if (!signal.aborted) {
                document.querySelectorAll('.chat-item').forEach(item => {
                    if (item.dataset.conversationId === conversationId) {
                        item.classList.add('active');
                    } else {
                        item.classList.remove('active');
                    }
                });
            }
            
            // Don't show loading overlay for same conversation or very quick loads
            // This prevents flickering
            
            // Load conversation history with timeout and abort support
            const requestPromise = fetch(`/api/rag/conversation/${conversationId}`, {
                headers: {
                    'Authorization': `Bearer ${this.sessionToken}`
                },
                signal, // Pass abort signal to fetch
                timeout: 10000 // 10 second timeout
            });
            
            // Track this request
            this.activeRequests.set(requestKey, requestPromise);
            
            const response = await requestPromise;
            
            if (!response.ok) {
                throw new Error('Failed to load conversation');
            }
            
            const data = await response.json();
            
            // No loading overlay to remove since we're not showing one
            
            // LIGHTWEIGHT conversation switching - minimal disruption
            if (window.chatInstance && window.chatInstance.chat && !signal.aborted) {
                
                // Only update conversation ID - don't clear everything
                const previousConversationId = window.chatInstance.conversationId;
                window.chatInstance.conversationId = conversationId;
                localStorage.setItem('currentConversationId', conversationId);
                
                // Only clear and reload if this is actually a different conversation
                if (previousConversationId !== conversationId) {
                    console.log(`[Chat History] Switching from ${previousConversationId} to ${conversationId}`);
                    
                    // Clear existing messages efficiently
                    if (window.chatInstance.chat.historyClear) {
                        window.chatInstance.chat.historyClear();
                    } else {
                        // Minimal fallback clearing
                        if (messagesArea) {
                            const messages = messagesArea.querySelectorAll('.message, .chat-message');
                            messages.forEach(msg => msg.remove());
                        }
                    }
                    
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
                    
                    // Handle SSE reconnection ONLY if conversation actually changed
                    if (window.chatInstance.eventSource) {
                        console.log('[Chat History] Closing existing SSE connection');
                        window.chatInstance.eventSource.close();
                        window.chatInstance.eventSource = null;
                    }
                    
                    // Delay SSE reconnection to prevent rapid connection spam
                    this.pendingSSECleanup = setTimeout(() => {
                        if (!signal.aborted && window.chatInstance && this.currentConversationId === conversationId) {
                            console.log('[Chat History] Reconnecting SSE after delay');
                            window.chatInstance.connectToSSE();
                        }
                        this.pendingSSECleanup = null;
                    }, 500); // Reduced delay since we're being more selective
                } else {
                    console.log(`[Chat History] Same conversation ${conversationId}, skipping reload`);
                }
            }
        } catch (error) {
            if (error.name === 'AbortError') {
                console.log('[Chat History] Conversation loading was cancelled');
                return;
            }
            console.error('[Chat History] Error loading conversation:', error);
            
            // Show error but don't clear chat content - just remove overlay
            const messagesArea = document.querySelector('.quikchat-messages-area');
            const loadingOverlay = messagesArea?.querySelector('.loading-overlay');
            if (loadingOverlay) {
                loadingOverlay.style.opacity = '0';
                setTimeout(() => loadingOverlay.remove(), 200);
            }
            
            // Show error notification instead of replacing content
            if (!signal.aborted) {
                this.showErrorMessage('Failed to load conversation. Please try again.');
            }
        } finally {
            // Clean up abort controller
            if (this.currentLoadingAbortController && this.currentLoadingAbortController.signal === signal) {
                this.currentLoadingAbortController = null;
            }
            
            // Clean up request tracking
            this.activeRequests.delete(requestKey);
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
            this.loadRecentConversations(true);
        }, 500);
    }
    
    // Method to be called when a new conversation is created
    onConversationCreated(conversationId) {
        console.log(`[Chat History] New conversation created: ${conversationId}`);
        this.currentConversationId = conversationId;
        
        // Reload the conversation list after a short delay to ensure it's saved
        setTimeout(() => {
            this.loadRecentConversations(true);
        }, 1500);
    }

    startAutoRefresh(interval = 30000) {
        // Clear existing interval if any (for compatibility)
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
        
        // Instead of polling, we rely on SSE for real-time updates
        // The QuikChatRAG component handles SSE connections
        // Real-time updates via SSE (no polling)
        
        // Listen for conversation updates from SSE
        if (!this.sseListenerAttached) {
            // Custom event that QuikChatRAG can dispatch
            window.addEventListener('rag-conversation-updated', (event) => {
                // Conversation updated via SSE
                // Don't reload if we're actively interacting with chats
                if (this.isLoadingConversation || this.clickDebounceTimer) {
                    console.log('[Chat History] Skipping SSE reload - interaction in progress');
                    return;
                }
                // Debounce the reload to avoid multiple rapid refreshes
                if (this.reloadTimeout) {
                    clearTimeout(this.reloadTimeout);
                }
                this.reloadTimeout = setTimeout(() => {
                    // Double-check we're not in an active state
                    if (!this.isLoadingConversation && !this.clickDebounceTimer) {
                        this.loadRecentConversations();
                    }
                }, 1000);
            });
            
            // Mark that we've attached the listener
            this.sseListenerAttached = true;
        }
        
        // Do one initial load
        this.loadRecentConversations();
    }

    stopAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
            console.log('[Chat History] Auto-refresh stopped');
        }
    }
    
    destroy() {
        if (this.isDestroyed) return;
        
        console.log('[Chat History] Destroying manager instance');
        this.isDestroyed = true;
        
        // Cancel any pending conversation loading
        if (this.currentLoadingAbortController) {
            console.log('[Chat History] Cancelling pending conversation load');
            this.currentLoadingAbortController.abort();
            this.currentLoadingAbortController = null;
        }
        
        // Cancel all active requests
        if (this.activeRequests.size > 0) {
            console.log(`[Chat History] Cancelling ${this.activeRequests.size} active requests`);
            this.activeRequests.clear();
        }
        
        // Clear request queue
        if (this.requestQueue.size > 0) {
            this.requestQueue.clear();
        }
        
        // Clear SSE cleanup timeout
        if (this.pendingSSECleanup) {
            clearTimeout(this.pendingSSECleanup);
            this.pendingSSECleanup = null;
        }
        
        // Clear debounce timer
        if (this.clickDebounceTimer) {
            clearTimeout(this.clickDebounceTimer);
            this.clickDebounceTimer = null;
        }
        
        // Clear pending chat load
        this.pendingChatLoad = null;
        
        // Reset loading flags
        this.isLoadingConversation = false;
        
        // Clear all timers
        this.stopAutoRefresh();
        if (this.reloadTimeout) {
            clearTimeout(this.reloadTimeout);
            this.reloadTimeout = null;
        }
        
        // Remove global reference
        if (window.chatHistoryManagerInstance === this) {
            window.chatHistoryManagerInstance = null;
        }
        
        // Reset SSE listener flag
        this.sseListenerAttached = false;
    }

    init() {
        // Initialize chat history
        
        // Check if we're coming from another page with a selected conversation
        const requestedConvId = localStorage.getItem('currentConversationId');
        if (requestedConvId) {
            // Show loading indicator immediately
            const messagesArea = document.querySelector('.quikchat-messages-area');
            if (messagesArea) {
                messagesArea.innerHTML = `
                    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; gap: 20px;">
                        <div style="width: 48px; height: 48px; border: 3px solid rgba(0, 102, 255, 0.2); border-top-color: #0066FF; border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
                        <div style="color: #6B7280; font-size: 16px; font-family: 'Season Sans', -apple-system, sans-serif;">Loading conversation...</div>
                    </div>
                    <style>
                        @keyframes spin {
                            to { transform: rotate(360deg); }
                        }
                    </style>
                `;
            }
            
            // Load the requested conversation
            this.currentConversationId = requestedConvId;
            // Clear it from localStorage so refreshes start with blank chat
            localStorage.removeItem('currentConversationId');
            
            // We'll load this conversation after conversations are loaded
            setTimeout(() => {
                this.loadConversation(requestedConvId);
            }, 500);
        } else {
            // Start with blank chat
            this.currentConversationId = null;
        }
        
        // Set up new chat button handler
        const newChatBtn = document.querySelector('.new-chat-btn');
        if (newChatBtn) {
            newChatBtn.addEventListener('click', () => this.handleNewChat());
        }
        
        // Start auto-refresh (which includes initial load)
        this.startAutoRefresh(30000); // Refresh every 30 seconds
        
        // Listen for new messages to refresh the list
        if (window.chatInstance) {
            const originalSendToRAG = window.chatInstance.sendToRAG.bind(window.chatInstance);
            window.chatInstance.sendToRAG = async (message) => {
                const result = await originalSendToRAG(message);
                // Don't reload here - let onConversationCreated handle it
                // This prevents duplicate reloads
                return result;
            };
        }
        
        // Initialization complete
    }
}

// Export for use in dashboard
window.ChatHistoryManager = ChatHistoryManager;