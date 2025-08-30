class ArticleItem {
    constructor() {
        this.statusConfigs = {
            ready: {
                strokeColor: '#4ECDC4',
                statusText: 'READY',
                statusColor: '#4ECDC4',
                description: 'Ready',
                opacity: '1'
            },
            processing: {
                strokeColor: '#FFC107',
                statusText: 'PROCESSING',
                statusColor: '#FFC107',
                description: 'Processing...',
                opacity: '0.8'
            },
            failed: {
                strokeColor: '#FF6B6B',
                statusText: 'FAILED',
                statusColor: '#FF6B6B',
                description: 'Processing failed',
                opacity: '1'
            },
            uploading: {
                strokeColor: '#FFC107',
                statusText: 'PROCESSING',
                statusColor: '#FFC107',
                description: 'Uploading...',
                opacity: '0.8'
            }
        };
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    truncateFilename(filename, maxLength = 25) {
        if (!filename) return '';
        return filename.length > maxLength ? 
            filename.substring(0, maxLength - 3) + '...' : 
            filename;
    }

    createElement(config) {
        const {
            documentId,
            filename,
            status = 'ready',
            customDescription = null,
            showDeleteButton = true,
            showRetryButton = false,
            onDelete = null,
            onRetry = null,
            onClick = null
        } = config;

        const statusConfig = this.statusConfigs[status] || this.statusConfigs.ready;
        const displayName = this.truncateFilename(filename);
        const description = customDescription || statusConfig.description;

        const item = document.createElement('div');
        item.className = `article-item ${status}`;
        item.setAttribute('data-document-id', documentId);
        item.style.cssText = `
            cursor: pointer; 
            display: flex; 
            align-items: flex-start;
            opacity: ${statusConfig.opacity};
        `;

        if (onClick) {
            item.onclick = (e) => {
                if (!e.target.closest('button')) {
                    onClick(documentId, item);
                }
            };
        }

        let buttonsHtml = '';
        
        if (showRetryButton && status === 'failed') {
            buttonsHtml += `
                <button class="article-retry-btn" data-action="retry" style="
                    margin-left: 8px;
                    padding: 2px 8px;
                    background: #FF6B6B;
                    color: white;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 10px;
                    text-transform: uppercase;
                ">RETRY</button>
            `;
        }

        if (showDeleteButton) {
            buttonsHtml = `
                <button class="article-delete-btn" data-action="delete" style="
                    background: transparent;
                    border: none;
                    color: #FF6B6B;
                    cursor: pointer;
                    padding: 4px;
                    margin-left: 8px;
                    opacity: 0.7;
                    transition: opacity 0.2s;
                " onmouseover="this.style.opacity='1'" 
                   onmouseout="this.style.opacity='0.7'" 
                   title="Delete document">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14zM10 11v6M14 11v6" 
                              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path>
                    </svg>
                </button>
            `;
        }

        item.innerHTML = `
            <div class="article-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" 
                          stroke="${statusConfig.strokeColor}" stroke-width="2"></path>
                    <polyline points="14,2 14,8 20,8" 
                              stroke="${statusConfig.strokeColor}" stroke-width="2"></polyline>
                </svg>
            </div>
            <div class="article-content" style="flex: 1;">
                <h4 class="article-title" title="${this.escapeHtml(filename)}">
                    ${this.escapeHtml(displayName)}
                </h4>
                <p class="article-description">${description}</p>
                <div class="article-status" style="
                    margin-top: 4px; 
                    font-size: 10px; 
                    color: ${statusConfig.statusColor}; 
                    text-transform: uppercase;
                ">
                    ${statusConfig.statusText}
                    ${showRetryButton && status === 'failed' ? buttonsHtml : ''}
                </div>
            </div>
            ${showDeleteButton ? buttonsHtml : ''}
        `;

        // Attach event handlers
        const deleteBtn = item.querySelector('[data-action="delete"]');
        if (deleteBtn && onDelete) {
            deleteBtn.onclick = (e) => {
                e.stopPropagation();
                onDelete(documentId, item);
            };
        }

        const retryBtn = item.querySelector('[data-action="retry"]');
        if (retryBtn && onRetry) {
            retryBtn.onclick = (e) => {
                e.stopPropagation();
                onRetry(documentId, item);
            };
        }

        return item;
    }

    updateStatus(element, newStatus, customDescription = null) {
        if (!element || !this.statusConfigs[newStatus]) return;

        const statusConfig = this.statusConfigs[newStatus];
        
        // Update classes
        element.className = `article-item ${newStatus}`;
        element.style.opacity = statusConfig.opacity;

        // Update icon colors
        const svg = element.querySelector('.article-icon svg');
        if (svg) {
            svg.querySelectorAll('path, polyline').forEach(el => {
                el.setAttribute('stroke', statusConfig.strokeColor);
            });
        }

        // Update description
        const descriptionEl = element.querySelector('.article-description');
        if (descriptionEl) {
            descriptionEl.textContent = customDescription || statusConfig.description;
        }

        // Update status text
        const statusEl = element.querySelector('.article-status');
        if (statusEl) {
            statusEl.style.color = statusConfig.statusColor;
            
            // Handle retry button for failed status
            if (newStatus === 'failed') {
                const documentId = element.getAttribute('data-document-id');
                statusEl.innerHTML = `
                    ${statusConfig.statusText}
                    <button class="article-retry-btn" data-action="retry" style="
                        margin-left: 8px;
                        padding: 2px 8px;
                        background: #FF6B6B;
                        color: white;
                        border: none;
                        border-radius: 4px;
                        cursor: pointer;
                        font-size: 10px;
                    ">RETRY</button>
                `;
            } else {
                statusEl.textContent = statusConfig.statusText;
            }
        }
    }

    renderList(documents, container, options = {}) {
        const {
            onDelete = null,
            onRetry = null,
            onClick = null,
            emptyMessage = 'No documents available'
        } = options;

        // Clear container
        container.innerHTML = '';

        if (!documents || documents.length === 0) {
            container.innerHTML = `
                <div class="empty-state" style="
                    text-align: center;
                    padding: 40px;
                    color: #666;
                ">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" style="
                        margin: 0 auto 16px;
                        opacity: 0.3;
                    ">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" 
                              stroke="currentColor" stroke-width="2"></path>
                        <polyline points="14,2 14,8 20,8" 
                                  stroke="currentColor" stroke-width="2"></polyline>
                    </svg>
                    <p>${emptyMessage}</p>
                </div>
            `;
            return;
        }

        // Render each document
        documents.forEach(doc => {
            const item = this.createElement({
                documentId: doc.document_id || doc.id,
                filename: doc.original_filename || doc.filename || doc.document_id,
                status: doc.status || 'ready',
                customDescription: doc.description,
                showDeleteButton: true,
                showRetryButton: doc.status === 'failed',
                onDelete,
                onRetry,
                onClick
            });
            container.appendChild(item);
        });
    }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ArticleItem;
}

// Make available globally
window.ArticleItem = ArticleItem;