class KnowledgeManagementGrid {
    constructor(container) {
        this.container = container;
        this.selectedDocuments = new Set();
        this.currentSort = { column: 'lastModified', direction: 'desc' };
        this.currentFilter = { status: 'all', type: 'all', search: '' };
        this.viewMode = 'grid';
        this.documents = [];
        this.vectorStats = null;
        // Start initialization but show loading state first
        this.showLoadingState();
        this.init();
    }

    showLoadingState() {
        this.container.innerHTML = `
            <div class="data-grid-container">
                <div style="padding: 40px; text-align: center;">
                    <h2>Loading Knowledge Base...</h2>
                </div>
            </div>
        `;
    }

    async init() {
        try {
            await this.loadDocuments();
            await this.loadVectorStats();
        } catch (error) {
            console.error('Error during initialization:', error);
            this.documents = [];
        }
        this.render();
        this.attachEventListeners();
        this.setupSSE();
    }

    async loadDocuments() {
        console.log('[KnowledgeGrid] Starting to load documents...');
        try {
            const response = await fetch('/api/rag/documents', {
                credentials: 'include'
            });
            
            console.log('[KnowledgeGrid] API Response status:', response.status);
            
            if (!response.ok) {
                console.error('Failed to load documents:', response.statusText);
                this.documents = [];
                return;
            }
            
            const data = await response.json();
            console.log('[KnowledgeGrid] Received data:', data);
            
            // Transform the real documents to match our display format
            this.documents = data.documents ? data.documents.map(doc => ({
                id: doc.document_id,
                name: doc.original_filename || 'Untitled Document',
                type: doc.file_type ? doc.file_type.toUpperCase() : 'UNKNOWN',
                status: doc.status || 'processing',
                chunks: 0, // Will be updated from vector stats
                size: this.formatFileSize(doc.file_size),
                sizeBytes: doc.file_size,
                queries: 0, // To be implemented with analytics
                accuracy: 0, // To be implemented with analytics
                lastModified: doc.updated_at || doc.created_at,
                hasMarkdown: doc.has_markdown,
                progress: doc.status === 'processing' ? 50 : undefined
            })) : [];
            
            console.log(`[KnowledgeGrid] Loaded ${this.documents.length} documents`);
            console.log('[KnowledgeGrid] Documents:', this.documents);
        } catch (error) {
            console.error('[KnowledgeGrid] Error loading documents:', error);
            // Fall back to empty array if load fails
            this.documents = [];
        }
    }

    async loadVectorStats() {
        try {
            const tenantId = localStorage.getItem('userTenantId') || localStorage.getItem('tenantId');
            if (!tenantId) {
                console.warn('No tenant ID found for vector stats');
                return;
            }
            
            const response = await fetch(`/api/rag/tenant/${tenantId}/vectors/stats`, {
                credentials: 'include'
            });
            
            if (!response.ok) {
                console.error('Failed to load vector stats:', response.statusText);
                return;
            }
            
            const data = await response.json();
            this.vectorStats = data;
            
            // Update document chunk counts if we have per-document stats
            if (data.documents) {
                data.documents.forEach(docStat => {
                    const doc = this.documents.find(d => d.id === docStat.document_id);
                    if (doc) {
                        doc.chunks = docStat.chunk_count || 0;
                    }
                });
            }
            
            console.log('Loaded vector stats:', data);
        } catch (error) {
            console.error('Error loading vector stats:', error);
        }
    }

    formatFileSize(bytes) {
        if (!bytes) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

    setupSSE() {
        // Setup Server-Sent Events for real-time updates
        const tenantId = localStorage.getItem('userTenantId') || localStorage.getItem('tenantId');
        if (!tenantId) return;
        
        const eventSource = new EventSource(`/api/rag/knowledge-stream`);
        
        eventSource.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                console.log('SSE update received:', data);
                
                if (data.type === 'document-uploaded' || data.type === 'processing-complete') {
                    // Reload documents when changes occur
                    this.loadDocuments().then(() => {
                        this.loadVectorStats().then(() => {
                            this.render();
                        });
                    });
                }
            } catch (error) {
                console.error('Error processing SSE message:', error);
            }
        };
        
        eventSource.onerror = (error) => {
            console.error('SSE connection error:', error);
            // Reconnect will happen automatically
        };
        
        // Store reference for cleanup
        this.eventSource = eventSource;
    }

    render() {
        this.container.innerHTML = `
            <div class="data-grid-container">
                ${this.renderHeader()}
                ${this.renderStatsBar()}
                ${this.renderToolbar()}
                ${this.renderBulkActions()}
                ${this.renderDataGrid()}
                ${this.renderFooter()}
            </div>
        `;
    }

    renderHeader() {
        const uploadIcon = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
        `;
        
        return `
            <div class="km-header">
                <h1 class="km-title season-heading">Knowledge Base Management</h1>
                ${window.createActionButton ? 
                    window.createActionButton('Upload Documents', uploadIcon, 'kmGrid.handleUpload()', {
                        variant: 'primary',
                        size: 'medium',
                        className: 'km-upload-btn'
                    }) : 
                    `<button class="action-btn action-btn-primary action-btn-medium km-upload-btn" onclick="kmGrid.handleUpload()">
                        <span class="action-btn-icon">${uploadIcon}</span>
                        <span class="action-btn-text">Upload Documents</span>
                    </button>`
                }
            </div>
        `;
    }

    renderStatsBar() {
        const stats = this.calculateStats();
        return `
            <div class="km-stats-bar">
                <div class="km-stat-card">
                    <div class="km-stat-value">${stats.totalDocuments}</div>
                    <div class="km-stat-label">Total Documents</div>
                </div>
                <div class="km-stat-card">
                    <div class="km-stat-value">${stats.totalVectors}</div>
                    <div class="km-stat-label">Total Vectors</div>
                </div>
                <div class="km-stat-card">
                    <div class="km-stat-value">${stats.storageUsed}</div>
                    <div class="km-stat-label">Storage Used</div>
                </div>
                <div class="km-stat-card">
                    <div class="km-stat-value">${typeof stats.avgAccuracy === 'number' ? stats.avgAccuracy + '%' : stats.avgAccuracy}</div>
                    <div class="km-stat-label">Avg. Accuracy</div>
                </div>
                <div class="km-stat-card">
                    <div class="km-stat-value">${stats.queriesAnswered.toLocaleString()}</div>
                    <div class="km-stat-label">Queries Answered</div>
                </div>
            </div>
        `;
    }

    renderToolbar() {
        return `
            <div class="data-grid-toolbar">
                <div class="data-grid-toolbar-left">
                    <div class="data-grid-search-container">
                        <svg class="data-grid-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="11" cy="11" r="8"/>
                            <path d="M21 21l-4.35-4.35"/>
                        </svg>
                        <input type="text" class="data-grid-search-input" placeholder="Search documents..." onkeyup="kmGrid.handleSearch(this.value)">
                    </div>
                    <select class="data-grid-filter-select" onchange="kmGrid.handleStatusFilter(this.value)">
                        <option value="all">All Status</option>
                        <option value="ready">Ready</option>
                        <option value="processing">Processing</option>
                        <option value="error">Error</option>
                    </select>
                </div>
            </div>
        `;
    }

    renderBulkActions() {
        const selectedCount = this.selectedDocuments.size;
        return `
            <div class="data-grid-bulk-actions ${selectedCount > 0 ? 'active' : ''}">
                <span class="data-grid-bulk-count">${selectedCount} selected</span>
                <button class="data-grid-bulk-btn" onclick="kmGrid.bulkReprocess()">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="23 4 23 10 17 10"/>
                        <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
                    </svg>
                    Reprocess
                </button>
                <button class="data-grid-bulk-btn data-grid-bulk-btn-danger" onclick="kmGrid.bulkDelete()">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                    </svg>
                    Delete
                </button>
            </div>
        `;
    }

    renderDataGrid() {
        const filteredDocs = this.getFilteredDocuments();
        const sortedDocs = this.getSortedDocuments(filteredDocs);
        
        return `
            <div class="table-container">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th class="table-th table-th-checkbox">
                                <input type="checkbox" class="table-checkbox" onchange="kmGrid.toggleSelectAll(this.checked)">
                            </th>
                            <th class="table-th table-th-sortable" onclick="kmGrid.handleSort('name')" style="width: 40%; min-width: 200px;">
                                Document Name
                                ${this.renderSortIcon('name')}
                            </th>
                            <th class="table-th table-th-sortable" onclick="kmGrid.handleSort('status')" style="width: 15%; min-width: 100px;">
                                Status
                                ${this.renderSortIcon('status')}
                            </th>
                            <th class="table-th table-th-sortable" onclick="kmGrid.handleSort('size')" style="width: 15%; min-width: 80px;">
                                Size
                                ${this.renderSortIcon('size')}
                            </th>
                            <th class="table-th table-th-sortable" onclick="kmGrid.handleSort('queries')" style="width: 10%; min-width: 80px;">
                                Queries
                                ${this.renderSortIcon('queries')}
                            </th>
                            <th class="table-th table-th-sortable" onclick="kmGrid.handleSort('lastModified')" style="width: 15%; min-width: 120px;">
                                Last Modified
                                ${this.renderSortIcon('lastModified')}
                            </th>
                            <th class="table-th table-th-actions" style="width: 120px; min-width: 120px;">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${sortedDocs.map(doc => this.renderTableRow(doc)).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    renderTableRow(doc) {
        const isSelected = this.selectedDocuments.has(doc.id);
        return `
            <tr class="table-tr ${isSelected ? 'selected' : ''}" onclick="kmGrid.handleRowClick(event, '${doc.id}')">
                <td class="table-td table-td-checkbox">
                    <input type="checkbox" class="table-checkbox" ${isSelected ? 'checked' : ''} 
                           onclick="event.stopPropagation()" 
                           onchange="kmGrid.toggleDocumentSelection('${doc.id}')">
                </td>
                <td class="table-td table-td-primary" style="width: 40%; min-width: 200px;">
                    <div class="table-link" style="display: flex; align-items: center; gap: 8px;">
                        <span style="flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${doc.name}</span>
                        <span class="table-type-badge" style="font-size: 10px; padding: 2px 6px; flex-shrink: 0;">${doc.type}</span>
                    </div>
                </td>
                <td class="table-td" style="width: 15%; min-width: 100px;">
                    ${this.renderStatus(doc)}
                </td>
                <td class="table-td" style="width: 15%; min-width: 80px;">${doc.size}</td>
                <td class="table-td" style="width: 10%; min-width: 80px;">${doc.queries}</td>
                <td class="table-td" style="width: 15%; min-width: 120px;">${this.formatDate(doc.lastModified)}</td>
                <td class="table-td table-td-actions" style="width: 120px; min-width: 120px;">
                    <div class="table-actions">
                        <button class="table-action-btn" title="View" onclick="event.stopPropagation(); kmGrid.viewDocument('${doc.id}')">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                                <circle cx="12" cy="12" r="3"/>
                            </svg>
                        </button>
                        <button class="table-action-btn" title="Reprocess" onclick="event.stopPropagation(); kmGrid.reprocessDocument('${doc.id}')">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="23 4 23 10 17 10"/>
                                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
                            </svg>
                        </button>
                        <button class="table-action-btn table-action-btn-danger" title="Delete" onclick="event.stopPropagation(); kmGrid.deleteDocument('${doc.id}')">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="3 6 5 6 21 6"/>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                            </svg>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }

    renderStatus(doc) {
        if (doc.status === 'processing') {
            return `
                <div class="table-status-badge table-status-processing">
                    <span class="table-status-text">Processing</span>
                    <div class="table-progress-bar">
                        <div class="table-progress-fill" style="width: ${doc.progress || 0}%"></div>
                    </div>
                    <span class="table-progress-text">${doc.progress || 0}%</span>
                </div>
            `;
        }
        
        const statusClass = `table-status-${doc.status}`;
        const statusText = doc.status.charAt(0).toUpperCase() + doc.status.slice(1);
        return `<span class="table-status-badge ${statusClass}">${statusText}</span>`;
    }

    renderSortIcon(column) {
        if (this.currentSort.column !== column) {
            return '<svg class="table-sort-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 15l5 5 5-5"/><path d="M7 9l5-5 5 5"/></svg>';
        }
        
        if (this.currentSort.direction === 'asc') {
            return '<svg class="table-sort-icon active" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 14l5-5 5 5"/></svg>';
        } else {
            return '<svg class="table-sort-icon active" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 10l5 5 5-5"/></svg>';
        }
    }

    renderFooter() {
        const filteredCount = this.getFilteredDocuments().length;
        return `
            <div class="data-grid-footer">
                <div class="data-grid-footer-info">
                    Showing 1-${Math.min(8, filteredCount)} of ${filteredCount} documents
                </div>
                <div class="data-grid-pagination">
                    <button class="data-grid-pagination-btn" disabled>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="15 18 9 12 15 6"/>
                        </svg>
                    </button>
                    <span class="data-grid-pagination-info">Page 1</span>
                    <button class="data-grid-pagination-btn">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="9 18 15 12 9 6"/>
                        </svg>
                    </button>
                </div>
            </div>
        `;
    }

    calculateStats() {
        const totalBytes = this.documents.reduce((sum, doc) => sum + (doc.sizeBytes || 0), 0);
        const totalChunks = this.documents.reduce((sum, doc) => sum + doc.chunks, 0);
        const totalQueries = this.documents.reduce((sum, doc) => sum + doc.queries, 0);
        
        // Calculate average accuracy only if we have data
        let avgAccuracy = 0;
        const docsWithAccuracy = this.documents.filter(doc => doc.accuracy > 0);
        if (docsWithAccuracy.length > 0) {
            avgAccuracy = Math.round(docsWithAccuracy.reduce((sum, doc) => sum + doc.accuracy, 0) / docsWithAccuracy.length);
        }
        
        return {
            totalDocuments: this.documents.length,
            totalVectors: totalChunks,
            storageUsed: this.formatFileSize(totalBytes),
            avgAccuracy: avgAccuracy || 'N/A',
            queriesAnswered: totalQueries
        };
    }

    getFilteredDocuments() {
        return this.documents.filter(doc => {
            const matchesStatus = this.currentFilter.status === 'all' || doc.status === this.currentFilter.status;
            const matchesType = this.currentFilter.type === 'all' || doc.type === this.currentFilter.type;
            const matchesSearch = !this.currentFilter.search || 
                                  doc.name.toLowerCase().includes(this.currentFilter.search.toLowerCase());
            return matchesStatus && matchesType && matchesSearch;
        });
    }

    getSortedDocuments(docs) {
        return [...docs].sort((a, b) => {
            const aVal = a[this.currentSort.column];
            const bVal = b[this.currentSort.column];
            
            const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
            return this.currentSort.direction === 'asc' ? comparison : -comparison;
        });
    }

    formatDate(dateStr) {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }

    attachEventListeners() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.clearSelection();
            }
        });
    }

    handleSort(column) {
        if (this.currentSort.column === column) {
            this.currentSort.direction = this.currentSort.direction === 'asc' ? 'desc' : 'asc';
        } else {
            this.currentSort.column = column;
            this.currentSort.direction = 'asc';
        }
        this.render();
    }

    handleSearch(value) {
        this.currentFilter.search = value;
        this.render();
    }

    handleStatusFilter(value) {
        this.currentFilter.status = value;
        this.render();
    }

    handleTypeFilter(value) {
        this.currentFilter.type = value;
        this.render();
    }

    toggleSelectAll(checked) {
        if (checked) {
            this.getFilteredDocuments().forEach(doc => this.selectedDocuments.add(doc.id));
        } else {
            this.selectedDocuments.clear();
        }
        this.render();
    }

    toggleDocumentSelection(docId) {
        if (this.selectedDocuments.has(docId)) {
            this.selectedDocuments.delete(docId);
        } else {
            this.selectedDocuments.add(docId);
        }
        this.render();
    }

    handleRowClick(event, docId) {
        if (event.target.type !== 'checkbox' && !event.target.closest('.km-actions')) {
            this.toggleDocumentSelection(docId);
        }
    }

    clearSelection() {
        this.selectedDocuments.clear();
        this.render();
    }

    handleUpload() {
        // Create a file input element
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.pdf,.doc,.docx,.txt,.md,.html,.csv,.xls,.xlsx,.ppt,.pptx';
        input.multiple = false;
        
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            // Create FormData for file upload
            const formData = new FormData();
            formData.append('document', file);
            
            try {
                // Show uploading indicator
                const uploadingDoc = {
                    id: `uploading-${Date.now()}`,
                    name: file.name,
                    type: file.name.split('.').pop().toUpperCase(),
                    status: 'uploading',
                    chunks: 0,
                    size: this.formatFileSize(file.size),
                    sizeBytes: file.size,
                    queries: 0,
                    accuracy: 0,
                    lastModified: new Date().toISOString(),
                    progress: 0
                };
                this.documents.unshift(uploadingDoc);
                this.render();
                
                const response = await fetch('/api/rag/upload-document', {
                    method: 'POST',
                    body: formData,
                    credentials: 'include'
                });
                
                if (!response.ok) {
                    throw new Error(`Upload failed: ${response.statusText}`);
                }
                
                const result = await response.json();
                console.log('Upload successful:', result);
                
                // Reload documents to show the new one
                await this.loadDocuments();
                await this.loadVectorStats();
                this.render();
                
                // Show success message
                this.showNotification('Document uploaded successfully', 'success');
            } catch (error) {
                console.error('Upload error:', error);
                this.showNotification('Failed to upload document: ' + error.message, 'error');
                
                // Remove the uploading placeholder
                this.documents = this.documents.filter(d => !d.id.startsWith('uploading-'));
                this.render();
            }
        };
        
        // Trigger file selection
        input.click();
    }

    async viewDocument(docId) {
        try {
            // Fetch document content from API
            const response = await fetch(`/api/rag/document/${docId}/view`, {
                credentials: 'include'
            });
            
            if (!response.ok) {
                throw new Error('Failed to load document');
            }
            
            const data = await response.json();
            const doc = data.document;
            
            // Create modal overlay
            const modalOverlay = document.createElement('div');
            modalOverlay.id = 'documentViewerModal';
            modalOverlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.7);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
                animation: fadeIn 0.2s ease-out;
            `;
            
            // Create modal content
            const modal = document.createElement('div');
            modal.style.cssText = `
                background: white;
                border-radius: 12px;
                max-width: 900px;
                width: 90%;
                max-height: 80vh;
                display: flex;
                flex-direction: column;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                animation: slideUp 0.2s ease-out;
            `;
            
            // Format the date
            const createdDate = new Date(doc.created_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
            
            // Determine status color
            const statusColors = {
                ready: '#28a745',
                processing: '#ffc107',
                failed: '#dc3545',
                vectorized: '#17a2b8'
            };
            const statusColor = statusColors[doc.status] || '#6c757d';
            
            // Create modal HTML
            modal.innerHTML = `
                <div style="padding: 24px; border-bottom: 1px solid #e0e0e0;">
                    <div style="display: flex; justify-content: space-between; align-items: start;">
                        <div>
                            <h2 id="documentTitle" style="margin: 0; color: #333; font-size: 24px;">
                                ${doc.original_filename || 'Document'}
                            </h2>
                            <div id="documentMeta" style="margin-top: 8px; color: #666; font-size: 14px;">
                                <span style="
                                    background: ${statusColor}; 
                                    color: white; 
                                    padding: 2px 8px; 
                                    border-radius: 4px;
                                    font-size: 12px;
                                    margin-right: 10px;
                                ">${doc.status.toUpperCase()}</span>
                                ${doc.is_processed ? '<span style="color: #28a745;">✓ Processed</span> • ' : ''}
                                ${doc.file_type ? `<span>${doc.file_type}</span> • ` : ''}
                                <span>${createdDate}</span>
                            </div>
                        </div>
                        <button onclick="this.closest('#documentViewerModal').remove()" style="
                            background: transparent;
                            border: none;
                            font-size: 24px;
                            cursor: pointer;
                            color: #666;
                            padding: 0;
                            width: 32px;
                            height: 32px;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            border-radius: 4px;
                            transition: background 0.2s;
                        " onmouseover="this.style.background='#f0f0f0'" onmouseout="this.style.background='transparent'">
                            ×
                        </button>
                    </div>
                </div>
                <div id="documentContent" style="
                    padding: 24px;
                    overflow-y: auto;
                    flex: 1;
                    font-size: 15px;
                    line-height: 1.6;
                    color: #333;
                ">
                    ${this.formatDocumentContent(doc.display_content)}
                </div>
            `;
            
            modalOverlay.appendChild(modal);
            document.body.appendChild(modalOverlay);
            
            // Close on background click
            modalOverlay.addEventListener('click', (e) => {
                if (e.target === modalOverlay) {
                    modalOverlay.remove();
                }
            });
            
            // Close on Escape key
            const escapeHandler = (e) => {
                if (e.key === 'Escape') {
                    modalOverlay.remove();
                    document.removeEventListener('keydown', escapeHandler);
                }
            };
            document.addEventListener('keydown', escapeHandler);
            
        } catch (error) {
            console.error('Error viewing document:', error);
            this.showNotification('Failed to load document content', 'error');
        }
    }
    
    formatDocumentContent(content) {
        if (!content) return '<p style="color: #999;">No content available</p>';
        
        // Basic markdown-style formatting
        let formatted = content
            // Headers
            .replace(/^### (.*?)$/gm, '<h3 style="margin: 16px 0 8px 0; color: #333;">$1</h3>')
            .replace(/^## (.*?)$/gm, '<h2 style="margin: 20px 0 10px 0; color: #333;">$1</h2>')
            .replace(/^# (.*?)$/gm, '<h1 style="margin: 24px 0 12px 0; color: #333;">$1</h1>')
            // Bold
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            // Lists
            .replace(/^- (.*?)$/gm, '<li>$1</li>')
            .replace(/^(\d+)\. (.*?)$/gm, '<li>$2</li>')
            // Code blocks
            .replace(/```([\s\S]*?)```/g, '<pre style="background: #f5f5f5; padding: 12px; border-radius: 4px; overflow-x: auto;"><code>$1</code></pre>')
            // Inline code
            .replace(/`([^`]+)`/g, '<code style="background: #f5f5f5; padding: 2px 4px; border-radius: 2px;">$1</code>')
            // Line breaks
            .replace(/\n\n/g, '</p><p>')
            .replace(/\n/g, '<br>');
        
        // Wrap in paragraph tags if not already formatted
        if (!formatted.includes('<p>') && !formatted.includes('<h')) {
            formatted = `<p>${formatted}</p>`;
        }
        
        // Wrap consecutive <li> tags in <ul>
        formatted = formatted.replace(/(<li>.*?<\/li>\s*)+/g, (match) => {
            return `<ul style="margin: 8px 0; padding-left: 24px;">${match}</ul>`;
        });
        
        return formatted;
    }


    async reprocessDocument(docId) {
        try {
            const response = await fetch(`/api/rag/document-retry/${docId}`, {
                method: 'POST',
                credentials: 'include'
            });
            
            if (!response.ok) {
                throw new Error('Reprocess failed');
            }
            
            const result = await response.json();
            console.log('Reprocess initiated:', result);
            
            // Update document status
            const doc = this.documents.find(d => d.id === docId);
            if (doc) {
                doc.status = 'processing';
                doc.progress = 0;
                this.render();
            }
            
            this.showNotification('Document reprocessing started', 'success');
        } catch (error) {
            console.error('Reprocess error:', error);
            this.showNotification('Failed to reprocess document', 'error');
        }
    }

    async deleteDocument(docId) {
        this.showDeleteConfirmation(docId);
    }
    
    showDeleteConfirmation(docId) {
        // Find the document name for display
        const doc = this.documents.find(d => d.id === docId);
        const docName = doc ? doc.name : 'this document';
        
        // Create modal overlay
        const modalOverlay = document.createElement('div');
        modalOverlay.className = 'modal-overlay';
        modalOverlay.innerHTML = `
            <div class="modal-content delete-modal">
                <div class="modal-header">
                    <h3 class="modal-title">Delete Document</h3>
                </div>
                <div class="modal-body">
                    <p class="delete-modal-text">
                        Are you sure you want to delete "${docName}"? This will remove the document and all its associated vectors. This action cannot be undone.
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
                this.performDeleteDocument(docId);
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
        
        // Close on Escape key
        const escapeHandler = (e) => {
            if (e.key === 'Escape') {
                modalOverlay.classList.remove('show');
                setTimeout(() => modalOverlay.remove(), 300);
                document.removeEventListener('keydown', escapeHandler);
            }
        };
        document.addEventListener('keydown', escapeHandler);
    }
    
    async performDeleteDocument(docId) {
        try {
            const response = await fetch(`/api/rag/document/${docId}`, {
                method: 'DELETE',
                credentials: 'include'
            });
            
            if (!response.ok) {
                throw new Error('Delete failed');
            }
            
            // Remove from local list
            this.documents = this.documents.filter(d => d.id !== docId);
            this.selectedDocuments.delete(docId);
            this.render();
            
            this.showNotification('Document deleted', 'success');
        } catch (error) {
            console.error('Delete error:', error);
            this.showNotification('Failed to delete document', 'error');
        }
    }

    async bulkReprocess() {
        if (this.selectedDocuments.size === 0) return;
        
        const promises = Array.from(this.selectedDocuments).map(docId => 
            this.reprocessDocument(docId)
        );
        
        try {
            await Promise.all(promises);
            this.clearSelection();
        } catch (error) {
            console.error('Bulk reprocess error:', error);
        }
    }

    async bulkDelete() {
        if (this.selectedDocuments.size === 0) return;
        
        this.showBulkDeleteConfirmation();
    }
    
    showBulkDeleteConfirmation() {
        const count = this.selectedDocuments.size;
        
        // Create modal overlay
        const modalOverlay = document.createElement('div');
        modalOverlay.className = 'modal-overlay';
        modalOverlay.innerHTML = `
            <div class="modal-content delete-modal">
                <div class="modal-header">
                    <h3 class="modal-title">Delete ${count} Document${count > 1 ? 's' : ''}</h3>
                </div>
                <div class="modal-body">
                    <p class="delete-modal-text">
                        Are you sure you want to delete ${count} selected document${count > 1 ? 's' : ''}? 
                        This will permanently remove ${count > 1 ? 'these documents' : 'this document'} and all associated vectors. 
                        This action cannot be undone.
                    </p>
                </div>
                <div class="modal-footer">
                    <button class="modal-btn secondary" data-action="cancel">Cancel</button>
                    <button class="modal-btn primary delete-btn" data-action="delete">
                        Delete ${count} Document${count > 1 ? 's' : ''}
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
                this.performBulkDelete();
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
        
        // Close on Escape key
        const escapeHandler = (e) => {
            if (e.key === 'Escape') {
                modalOverlay.classList.remove('show');
                setTimeout(() => modalOverlay.remove(), 300);
                document.removeEventListener('keydown', escapeHandler);
            }
        };
        document.addEventListener('keydown', escapeHandler);
    }
    
    async performBulkDelete() {
        const promises = Array.from(this.selectedDocuments).map(docId => 
            this.performDeleteDocument(docId)
        );
        
        try {
            await Promise.all(promises);
            this.clearSelection();
        } catch (error) {
            console.error('Bulk delete error:', error);
        }
    }

    showNotification(message, type = 'info') {
        // Create a simple notification
        const notification = document.createElement('div');
        notification.className = `km-notification km-notification-${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            background: ${type === 'success' ? '#00D4FF' : type === 'error' ? '#FF3333' : '#0066FF'};
            color: white;
            border-radius: 4px;
            z-index: 10000;
            animation: slideIn 0.3s ease;
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }
}

// Initialize when DOM is ready
if (typeof window !== 'undefined') {
    window.KnowledgeManagementGrid = KnowledgeManagementGrid;
}