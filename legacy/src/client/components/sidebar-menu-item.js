/**
 * Sidebar Menu Item Component
 * Reusable component for sidebar menu items in knowledge and user management pages
 */

class SidebarMenuItem {
    constructor() {
        this.init();
    }

    init() {
        // Register the custom element if not already registered
        if (!customElements.get('sidebar-menu-item')) {
            customElements.define('sidebar-menu-item', SidebarMenuItemElement);
        }
    }

    /**
     * Create a sidebar menu item element
     * @param {Object} options - Configuration options
     * @param {string} options.searchPlaceholder - Placeholder text for search input
     * @param {string} options.buttonText - Text for the action button
     * @param {string} options.sectionTitle - Title for the items section
     * @param {string} options.emptyMessage - Message when no items
     * @param {Function} options.onSearch - Search handler function
     * @param {Function} options.onButtonClick - Button click handler
     * @returns {HTMLElement} The sidebar element
     */
    static createSidebar(options = {}) {
        const {
            searchPlaceholder = 'Search',
            buttonText = 'New item',
            sectionTitle = 'Recent items',
            emptyMessage = 'No recent items',
            onSearch = () => {},
            onButtonClick = () => {}
        } = options;

        const sidebar = document.createElement('aside');
        sidebar.className = 'left-sidebar';
        
        // Search container
        const searchContainer = document.createElement('div');
        searchContainer.className = 'search-container';
        searchContainer.innerHTML = `
            <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none">
                <circle cx="11" cy="11" r="8" stroke="currentColor" stroke-width="2"></circle>
                <path d="M21 21L16.65 16.65" stroke="currentColor" stroke-width="2"></path>
            </svg>
            <input type="text" placeholder="${searchPlaceholder}" class="search-input">
        `;
        
        // Action button
        const actionButton = document.createElement('button');
        actionButton.className = 'action-btn action-btn-primary action-btn-medium action-btn-full new-chat-btn';
        actionButton.innerHTML = `
            <span class="action-btn-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path>
                </svg>
            </span>
            <span class="action-btn-text">${buttonText}</span>
        `;
        actionButton.onclick = onButtonClick;
        
        // Items section
        const itemsSection = document.createElement('div');
        itemsSection.className = 'chats-section';
        itemsSection.innerHTML = `
            <h3 class="section-title">${sectionTitle}</h3>
            <div class="no-chats">
                <p>${emptyMessage}</p>
            </div>
        `;
        
        // Attach search handler
        const searchInput = searchContainer.querySelector('.search-input');
        searchInput.addEventListener('input', (e) => onSearch(e.target.value));
        
        // Assemble sidebar
        sidebar.appendChild(searchContainer);
        sidebar.appendChild(actionButton);
        sidebar.appendChild(itemsSection);
        
        return sidebar;
    }

    /**
     * Update the items list in the sidebar
     * @param {HTMLElement} sidebar - The sidebar element
     * @param {Array} items - Array of items to display
     * @param {Function} renderItem - Function to render each item
     */
    static updateItems(sidebar, items, renderItem) {
        const itemsSection = sidebar.querySelector('.chats-section');
        const noItemsDiv = itemsSection.querySelector('.no-chats');
        
        if (!items || items.length === 0) {
            noItemsDiv.style.display = 'block';
            // Remove any existing items
            const existingItems = itemsSection.querySelectorAll('.chat-item');
            existingItems.forEach(item => item.remove());
        } else {
            noItemsDiv.style.display = 'none';
            
            // Clear existing items
            const existingItems = itemsSection.querySelectorAll('.chat-item');
            existingItems.forEach(item => item.remove());
            
            // Add new items
            items.forEach(item => {
                const itemElement = renderItem(item);
                if (itemElement) {
                    itemElement.classList.add('chat-item');
                    itemsSection.appendChild(itemElement);
                }
            });
        }
    }
}

// Custom element for advanced usage (optional)
class SidebarMenuItemElement extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    connectedCallback() {
        const searchPlaceholder = this.getAttribute('search-placeholder') || 'Search';
        const buttonText = this.getAttribute('button-text') || 'New item';
        const sectionTitle = this.getAttribute('section-title') || 'Recent items';
        const emptyMessage = this.getAttribute('empty-message') || 'No recent items';
        
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                    width: 100%;
                    height: 100%;
                }
                /* Import global styles */
                @import '/styles/dashboard-styles.css';
                @import '/styles/action-button.css';
            </style>
            <div class="sidebar-container"></div>
        `;
        
        const container = this.shadowRoot.querySelector('.sidebar-container');
        const sidebar = SidebarMenuItem.createSidebar({
            searchPlaceholder,
            buttonText,
            sectionTitle,
            emptyMessage,
            onSearch: (value) => {
                this.dispatchEvent(new CustomEvent('search', { detail: { value } }));
            },
            onButtonClick: () => {
                this.dispatchEvent(new CustomEvent('buttonclick'));
            }
        });
        
        container.appendChild(sidebar);
    }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SidebarMenuItem;
} else {
    window.SidebarMenuItem = SidebarMenuItem;
}