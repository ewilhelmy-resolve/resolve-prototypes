// Modern Chat Enhancements for QuikChat
class ChatEnhancements {
    constructor() {
        this.initialized = false;
        this.textArea = null;
        this.messagesArea = null;
        this.inputArea = null;
        this.minHeight = 44; // Approx 2 lines
        this.maxHeight = 340; // Max height matching CSS
        this.lineHeight = 24; // 16px * 1.5 line-height
    }

    init() {
        // Wait for QuikChat to be fully loaded
        const initInterval = setInterval(() => {
            this.textArea = document.querySelector('.quikchat-input-textbox');
            this.messagesArea = document.querySelector('.quikchat-messages-area');
            this.inputArea = document.querySelector('.quikchat-input-area');
            
            if (this.textArea && this.messagesArea && this.inputArea) {
                clearInterval(initInterval);
                // Ensure initial styles are set
                this.textArea.style.height = `${this.minHeight}px`;
                this.textArea.style.overflowY = 'hidden';
                this.textArea.style.overflow = 'hidden';
                this.setupEnhancements();
                this.initialized = true;
            }
        }, 100);
    }

    setupEnhancements() {
        // 1. Auto-expanding textarea
        this.setupAutoExpand();
        
        // 2. Reverse scrolling (auto-scroll to bottom on new messages)
        this.setupReverseScrolling();
        
        // 3. Better keyboard handling
        this.setupKeyboardHandling();
        
        // 4. Modern styling adjustments
        this.applyModernStyling();
        
        // 5. Setup send button handler
        this.setupSendButtonHandler();
    }

    setupAutoExpand() {
        if (!this.textArea) return;
        
        // Set initial height and overflow
        this.textArea.style.height = `${this.minHeight}px`;
        this.textArea.style.overflowY = 'hidden';
        this.textArea.style.overflow = 'hidden';
        
        // Store original padding for accurate calculations
        const computedStyle = window.getComputedStyle(this.textArea);
        this.paddingTop = parseInt(computedStyle.paddingTop);
        this.paddingBottom = parseInt(computedStyle.paddingBottom);
        
        // Auto-expand on input
        this.textArea.addEventListener('input', () => {
            this.adjustTextAreaHeight();
        });
        
        // Also adjust on paste
        this.textArea.addEventListener('paste', () => {
            setTimeout(() => this.adjustTextAreaHeight(), 0);
        });
        
        // Watch for programmatic changes (when message is sent)
        // Check periodically if textarea was cleared
        let lastValue = this.textArea.value;
        setInterval(() => {
            if (this.textArea.value === '' && lastValue !== '') {
                this.resetTextAreaHeight();
            }
            lastValue = this.textArea.value;
        }, 100);
        
        // Initial adjustment in case there's pre-filled text
        this.adjustTextAreaHeight();
    }

    adjustTextAreaHeight() {
        if (!this.textArea) return;
        
        // Save scroll position
        const scrollPos = this.textArea.scrollTop;
        
        // Store current height before adjusting
        const currentHeight = parseInt(this.textArea.style.height) || this.minHeight;
        
        // Temporarily set to min height to get accurate scrollHeight
        this.textArea.style.height = `${this.minHeight}px`;
        
        // Get the actual content height (scrollHeight)
        let contentHeight = this.textArea.scrollHeight;
        
        // Calculate the new height:
        // - At least minHeight (2 lines)
        // - At most maxHeight (17 lines)
        // - Otherwise match content height
        let newHeight = Math.max(this.minHeight, Math.min(contentHeight, this.maxHeight));
        
        // Apply the new height
        this.textArea.style.height = `${newHeight}px`;
        
        // IMPORTANT: Explicitly set max-height to ensure CSS override
        this.textArea.style.maxHeight = `${this.maxHeight}px`;
        
        // Handle overflow:
        // - If content exceeds max height, enable scrollbar
        // - Otherwise hide scrollbar
        if (contentHeight > this.maxHeight) {
            this.textArea.style.overflowY = 'auto';
            this.textArea.style.overflow = 'auto'; // Also set general overflow
            // Restore scroll position when scrollbar appears
            this.textArea.scrollTop = scrollPos;
        } else {
            this.textArea.style.overflowY = 'hidden';
            this.textArea.style.overflow = 'hidden';
        }
        
        // Adjust the input area to grow upwards
        this.adjustInputAreaHeight(newHeight);
        
        // Debug log (can be removed in production)
        console.log(`TextArea Height: ${newHeight}px, Content: ${contentHeight}px, MaxHeight: ${this.maxHeight}px, Overflow: ${contentHeight > this.maxHeight ? 'auto' : 'hidden'}`);
    }
    
    adjustInputAreaHeight(textAreaHeight) {
        if (!this.inputArea) return;
        
        // Calculate total input area height (textarea + padding)
        const paddingHeight = 16; // Top and bottom padding
        const totalHeight = textAreaHeight + paddingHeight;
        
        // Set the input area height to match
        this.inputArea.style.height = `${totalHeight}px`;
        this.inputArea.style.minHeight = `${totalHeight}px`;
        
        // Ensure the messages area adjusts properly
        // The flex container will handle this automatically
    }

    resetTextAreaHeight() {
        if (!this.textArea) return;
        
        // Reset to minimum height (2 lines)
        this.textArea.style.height = `${this.minHeight}px`;
        this.textArea.style.maxHeight = `${this.maxHeight}px`;
        this.textArea.style.overflowY = 'hidden';
        this.textArea.style.overflow = 'hidden';
        this.textArea.scrollTop = 0;
        
        // Reset input area height as well
        this.adjustInputAreaHeight(this.minHeight);
        
        console.log('TextArea reset to minimum height');
    }

    adjustMessagesAreaHeight() {
        // Removed - let flex layout handle this automatically
        // The messages area should flex to fill available space
    }

    setupReverseScrolling() {
        if (!this.messagesArea) return;
        
        // Create mutation observer to watch for new messages
        const observer = new MutationObserver((mutations) => {
            const hasNewMessage = mutations.some(mutation => 
                mutation.type === 'childList' && mutation.addedNodes.length > 0
            );
            
            if (hasNewMessage) {
                this.scrollToBottom();
            }
        });
        
        observer.observe(this.messagesArea, {
            childList: true,
            subtree: true
        });
        
        // Initial scroll to bottom
        this.scrollToBottom();
    }

    scrollToBottom() {
        if (!this.messagesArea) return;
        
        // Smooth scroll to bottom
        requestAnimationFrame(() => {
            this.messagesArea.scrollTo({
                top: this.messagesArea.scrollHeight,
                behavior: 'smooth'
            });
        });
    }

    setupKeyboardHandling() {
        if (!this.textArea) return;
        
        this.textArea.addEventListener('keydown', (e) => {
            // Shift+Enter: New line (expand textarea)
            if (e.shiftKey && e.key === 'Enter') {
                // Allow default behavior (new line)
                // The input event will trigger auto-expand
                setTimeout(() => this.adjustTextAreaHeight(), 0);
                return true;
            }
            
            // Enter alone: Send message (if not empty)
            if (!e.shiftKey && e.key === 'Enter') {
                e.preventDefault();
                
                const trimmedValue = this.textArea.value.trim();
                if (trimmedValue) {
                    // Trigger send by simulating button click
                    const sendButton = document.querySelector('.quikchat-input-send-btn');
                    if (sendButton) {
                        sendButton.click();
                    }
                }
                return false;
            }
            
            // Cmd/Ctrl+Enter: Send message (alternative)
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                e.preventDefault();
                const sendButton = document.querySelector('.quikchat-input-send-btn');
                if (sendButton) {
                    sendButton.click();
                }
                return false;
            }
        });
    }

    applyModernStyling() {
        // Add smooth transitions
        if (this.messagesArea) {
            this.messagesArea.style.scrollBehavior = 'smooth';
        }
        
        // Add helpful placeholder on focus
        if (this.textArea) {
            const originalPlaceholder = this.textArea.placeholder || 'Type a message...';
            
            this.textArea.addEventListener('focus', () => {
                // Show hint when textarea has multiple lines
                const lines = (this.textArea.value.match(/\n/g) || []).length + 1;
                if (lines > 1 || this.textArea.clientHeight > this.minHeight) {
                    this.textArea.placeholder = 'Shift+Enter for new line, Enter to send...';
                }
            });
            
            this.textArea.addEventListener('blur', () => {
                this.textArea.placeholder = originalPlaceholder;
            });
        }
    }
    
    setupSendButtonHandler() {
        // Find the send button
        const sendButton = document.querySelector('.quikchat-input-send-btn');
        if (sendButton) {
            sendButton.addEventListener('click', () => {
                // Reset height after a small delay to allow message to be sent
                setTimeout(() => {
                    if (this.textArea && this.textArea.value === '') {
                        this.resetTextAreaHeight();
                    }
                }, 50);
            });
        }
    }

    // Public method to check if user is near bottom (for smart scrolling)
    isNearBottom(threshold = 100) {
        if (!this.messagesArea) return true;
        
        const { scrollTop, scrollHeight, clientHeight } = this.messagesArea;
        return scrollHeight - scrollTop - clientHeight < threshold;
    }

    // Public method to manually trigger scroll to bottom
    forceScrollToBottom() {
        this.scrollToBottom();
    }
}

// Initialize enhancements when DOM is ready
if (typeof window !== 'undefined') {
    window.ChatEnhancements = ChatEnhancements;
    
    // Auto-initialize on DOMContentLoaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.chatEnhancements = new ChatEnhancements();
            window.chatEnhancements.init();
        });
    } else {
        // DOM already loaded
        window.chatEnhancements = new ChatEnhancements();
        window.chatEnhancements.init();
    }
}