export class KnowledgeConfig {
    constructor(containerId, onSubmit) {
        this.container = document.getElementById(containerId);
        this.onSubmit = onSubmit;
        this.selectedSource = null;
        this.init();
    }

    init() {
        this.render();
        this.attachEventListeners();
    }

    render() {
        this.container.innerHTML = `
            <div class="knowledge-config">
                <div class="integration-cards-grid">
                    <!-- Jira -->
                    <div class="integration-card" data-source="jira">
                        <div class="left-section">
                            <div class="integration-logo jira">
                                <svg width="24" height="24" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M14.299 16.5697L7.6834 3.3386C7.5532 3.0521 7.423 3 7.2667 3C7.1365 3 6.9802 3.0521 6.8239 3.3125C5.8862 4.7971 5.4695 6.5161 5.4695 8.3133C5.4695 10.8136 6.7457 13.1577 8.621 16.9343C8.8294 17.351 8.9857 17.4292 9.3503 17.4292H13.9343C14.2729 17.4292 14.4552 17.299 14.4552 17.0385C14.4552 16.9083 14.4292 16.8301 14.299 16.5697ZM4.6882 10.3187C4.1673 9.5374 4.011 9.4853 3.8808 9.4853C3.7505 9.4853 3.6724 9.5374 3.438 10.0062L0.1302 16.6217C0.026 16.8301 0 16.9083 0 17.0125C0 17.2208 0.1823 17.4292 0.573 17.4292H5.2351C5.5477 17.4292 5.7821 17.1687 5.9123 16.6738C6.0686 16.0487 6.1207 15.5018 6.1207 14.8507C6.1207 13.0275 5.3133 11.2564 4.6882 10.3187Z" fill="white"/>
                                </svg>
                            </div>
                            <h3>Jira</h3>
                        </div>
                        <div class="divider"></div>
                        <div class="card-features">
                            <div class="feature-item">
                                <div class="feature-icon"></div>
                                <span>Full API access</span>
                            </div>
                            <div class="feature-item">
                                <div class="feature-icon"></div>
                                <span>Service Management</span>
                            </div>
                        </div>
                    </div>

                    <!-- SharePoint -->
                    <div class="integration-card" data-source="sharepoint">
                        <div class="left-section">
                            <div class="integration-logo sharepoint">
                                <svg width="24" height="24" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M20.5 14.5L16 10L11.5 14.5L16 19L20.5 14.5Z" fill="white"/>
                                    <path d="M16 2L2 16L16 30L30 16L16 2ZM16 23L9 16L16 9L23 16L16 23Z" fill="white" fill-opacity="0.9"/>
                                </svg>
                            </div>
                            <h3>SharePoint</h3>
                        </div>
                        <div class="divider"></div>
                        <div class="card-features">
                            <div class="feature-item">
                                <div class="feature-icon"></div>
                                <span>Microsoft 365</span>
                            </div>
                            <div class="feature-item">
                                <div class="feature-icon"></div>
                                <span>Document libraries</span>
                            </div>
                        </div>
                    </div>

                    <!-- ServiceNow -->
                    <div class="integration-card" data-source="servicenow">
                        <div class="left-section">
                            <div class="integration-logo servicenow">
                                <svg width="24" height="24" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M10 16L14 20L22 12" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>
                            </div>
                            <h3>ServiceNow</h3>
                        </div>
                        <div class="divider"></div>
                        <div class="card-features">
                            <div class="feature-item">
                                <div class="feature-icon"></div>
                                <span>ITSM workflows</span>
                            </div>
                            <div class="feature-item">
                                <div class="feature-icon"></div>
                                <span>Automation ready</span>
                            </div>
                        </div>
                    </div>

                    <!-- Upload Articles -->
                    <div class="integration-card" data-source="upload">
                        <div class="left-section">
                            <div class="integration-logo upload">
                                <svg width="24" height="24" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M16 6L16 20M16 6L11 11M16 6L21 11" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                    <path d="M6 24H26" stroke="white" stroke-width="2" stroke-linecap="round"/>
                                </svg>
                            </div>
                            <h3>Upload Articles</h3>
                        </div>
                        <div class="divider"></div>
                        <div class="card-features">
                            <div class="feature-item">
                                <div class="feature-icon"></div>
                                <span>CSV/Excel import</span>
                            </div>
                            <div class="feature-item">
                                <div class="feature-icon"></div>
                                <span>Bulk upload</span>
                            </div>
                        </div>
                    </div>

                    <!-- Configure Later -->
                    <div class="integration-card" data-source="later">
                        <div class="left-section">
                            <div class="integration-logo later">
                                <svg width="24" height="24" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <circle cx="16" cy="16" r="10" stroke="white" stroke-width="2"/>
                                    <path d="M16 11V16L19 19" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>
                            </div>
                            <h3>Configure Later</h3>
                        </div>
                        <div class="divider"></div>
                        <div class="card-features">
                            <div class="feature-item">
                                <div class="feature-icon"></div>
                                <span>Set up anytime</span>
                            </div>
                            <div class="feature-item">
                                <div class="feature-icon"></div>
                                <span>Use default knowledge</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Upload Dialog (hidden by default) -->
                <div id="uploadDialog" class="upload-dialog" style="display: none;">
                    <div class="dialog-content">
                        <h3>Upload Knowledge Articles</h3>
                        <p>Upload your knowledge base in CSV or Excel format</p>
                        
                        <div class="upload-area" id="uploadArea">
                            <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M24 8L24 32M24 8L16 16M24 8L32 16" stroke="#6366F1" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
                                <path d="M8 36H40C41.6569 36 43 37.3431 43 39V39C43 40.6569 41.6569 42 40 42H8C6.34315 42 5 40.6569 5 39V39C5 37.3431 6.34315 36 8 36Z" fill="#6366F1"/>
                            </svg>
                            <p>Drag and drop your file here, or <button type="button" class="btn-link" onclick="document.getElementById('fileInput').click()">browse</button></p>
                            <input type="file" id="fileInput" accept=".csv,.xlsx,.xls" style="display: none;">
                            <span class="file-info">Supported formats: CSV, Excel (XLS, XLSX)</span>
                        </div>

                        <div class="dialog-buttons">
                            <button type="button" class="btn btn-secondary" onclick="app.knowledgeConfig.closeUploadDialog()">Cancel</button>
                            <button type="button" class="btn btn-primary" onclick="app.knowledgeConfig.handleUpload()">Upload</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    attachEventListeners() {
        const cards = this.container.querySelectorAll('.integration-card');
        cards.forEach(card => {
            card.addEventListener('click', (e) => {
                // Remove previous selection
                cards.forEach(c => c.classList.remove('selected'));
                
                // Add selection to clicked card
                card.classList.add('selected');
                this.selectedSource = card.dataset.source;

                // Handle special cases
                if (this.selectedSource === 'upload') {
                    this.showUploadDialog();
                } else if (this.selectedSource === 'later') {
                    // Allow immediate continuation
                    if (this.onSubmit) {
                        this.onSubmit({ source: 'later' });
                    }
                } else if (this.selectedSource === 'jira' || this.selectedSource === 'servicenow') {
                    // Route to API integration form
                    if (this.onSubmit) {
                        this.onSubmit({ source: this.selectedSource, requiresApiConfig: true });
                    }
                }
            });
        });

        // Handle file upload
        const fileInput = document.getElementById('fileInput');
        const uploadArea = document.getElementById('uploadArea');
        
        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
                this.handleFileSelect(e.target.files[0]);
            });
        }

        if (uploadArea) {
            uploadArea.addEventListener('dragover', (e) => {
                e.preventDefault();
                uploadArea.classList.add('dragover');
            });

            uploadArea.addEventListener('dragleave', (e) => {
                e.preventDefault();
                uploadArea.classList.remove('dragover');
            });

            uploadArea.addEventListener('drop', (e) => {
                e.preventDefault();
                uploadArea.classList.remove('dragover');
                if (e.dataTransfer.files.length > 0) {
                    this.handleFileSelect(e.dataTransfer.files[0]);
                }
            });
        }
    }

    showUploadDialog() {
        const dialog = document.getElementById('uploadDialog');
        if (dialog) {
            dialog.style.display = 'flex';
        }
    }

    closeUploadDialog() {
        const dialog = document.getElementById('uploadDialog');
        if (dialog) {
            dialog.style.display = 'none';
        }
    }

    handleFileSelect(file) {
        if (file) {
            const uploadArea = document.getElementById('uploadArea');
            uploadArea.innerHTML = `
                <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="24" cy="24" r="20" fill="#10B981"/>
                    <path d="M16 24L21 29L32 18" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                <p class="file-name">${file.name}</p>
                <p class="file-size">${(file.size / 1024).toFixed(2)} KB</p>
                <button type="button" class="btn-link" onclick="app.knowledgeConfig.resetUpload()">Choose different file</button>
            `;
            this.uploadedFile = file;
        }
    }

    resetUpload() {
        this.uploadedFile = null;
        const uploadArea = document.getElementById('uploadArea');
        uploadArea.innerHTML = `
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M24 8L24 32M24 8L16 16M24 8L32 16" stroke="#6366F1" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M8 36H40C41.6569 36 43 37.3431 43 39V39C43 40.6569 41.6569 42 40 42H8C6.34315 42 5 40.6569 5 39V39C5 37.3431 6.34315 36 8 36Z" fill="#6366F1"/>
            </svg>
            <p>Drag and drop your file here, or <button type="button" class="btn-link" onclick="document.getElementById('fileInput').click()">browse</button></p>
            <input type="file" id="fileInput" accept=".csv,.xlsx,.xls" style="display: none;">
            <span class="file-info">Supported formats: CSV, Excel (XLS, XLSX)</span>
        `;
        
        // Re-attach file input listener
        const fileInput = document.getElementById('fileInput');
        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
                this.handleFileSelect(e.target.files[0]);
            });
        }
    }

    async handleUpload() {
        if (this.uploadedFile) {
            // Here you would typically upload the file to your server
            console.log('Uploading file:', this.uploadedFile);
            
            // Close dialog and proceed
            this.closeUploadDialog();
            if (this.onSubmit) {
                this.onSubmit({ 
                    source: 'upload',
                    file: this.uploadedFile
                });
            }
        }
    }

    validate() {
        return this.selectedSource !== null;
    }
}