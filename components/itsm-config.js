export class ItsmConfig {
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
            <div class="itsm-config">
                <div class="integration-cards-grid">
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
                                <span>Enterprise ITSM</span>
                            </div>
                            <div class="feature-item">
                                <div class="feature-icon"></div>
                                <span>Full automation</span>
                            </div>
                        </div>
                    </div>

                    <!-- BMC Helix -->
                    <div class="integration-card" data-source="bmc-helix">
                        <div class="left-section">
                            <div class="integration-logo bmc">
                                <svg width="24" height="24" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M16 4L4 16L16 28L28 16L16 4Z" stroke="white" stroke-width="2" fill="none"/>
                                    <circle cx="16" cy="16" r="4" fill="white"/>
                                </svg>
                            </div>
                            <h3>BMC Helix</h3>
                        </div>
                        <div class="divider"></div>
                        <div class="card-features">
                            <div class="feature-item">
                                <div class="feature-icon"></div>
                                <span>AI-powered ITSM</span>
                            </div>
                            <div class="feature-item">
                                <div class="feature-icon"></div>
                                <span>Cognitive automation</span>
                            </div>
                        </div>
                    </div>

                    <!-- Freshservice -->
                    <div class="integration-card" data-source="freshservice">
                        <div class="left-section">
                            <div class="integration-logo freshservice">
                                <svg width="24" height="24" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M16 3L6 8V17C6 22 10 26 16 28C22 26 26 22 26 17V8L16 3Z" stroke="white" stroke-width="2" fill="none"/>
                                    <path d="M12 16L15 19L20 14" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>
                            </div>
                            <h3>Freshservice</h3>
                        </div>
                        <div class="divider"></div>
                        <div class="card-features">
                            <div class="feature-item">
                                <div class="feature-icon"></div>
                                <span>Modern ITSM</span>
                            </div>
                            <div class="feature-item">
                                <div class="feature-icon"></div>
                                <span>Easy integration</span>
                            </div>
                        </div>
                    </div>

                    <!-- Zendesk -->
                    <div class="integration-card" data-source="zendesk">
                        <div class="left-section">
                            <div class="integration-logo zendesk">
                                <svg width="24" height="24" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M6 12C6 8.68629 8.68629 6 12 6H20C23.3137 6 26 8.68629 26 12V12C26 15.3137 23.3137 18 20 18H12C8.68629 18 6 15.3137 6 12V12Z" stroke="white" stroke-width="2"/>
                                    <circle cx="12" cy="20" r="6" stroke="white" stroke-width="2"/>
                                </svg>
                            </div>
                            <h3>Zendesk</h3>
                        </div>
                        <div class="divider"></div>
                        <div class="card-features">
                            <div class="feature-item">
                                <div class="feature-icon"></div>
                                <span>Customer service</span>
                            </div>
                            <div class="feature-item">
                                <div class="feature-icon"></div>
                                <span>Ticketing system</span>
                            </div>
                        </div>
                    </div>

                    <!-- Upload CSV -->
                    <div class="integration-card" data-source="upload-csv">
                        <div class="left-section">
                            <div class="integration-logo upload">
                                <svg width="24" height="24" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M16 6L16 20M16 6L11 11M16 6L21 11" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                    <path d="M6 24H26" stroke="white" stroke-width="2" stroke-linecap="round"/>
                                </svg>
                            </div>
                            <h3>Upload CSV</h3>
                        </div>
                        <div class="divider"></div>
                        <div class="card-features">
                            <div class="feature-item">
                                <div class="feature-icon"></div>
                                <span>Import tickets</span>
                            </div>
                            <div class="feature-item">
                                <div class="feature-icon"></div>
                                <span>Bulk upload</span>
                            </div>
                        </div>
                    </div>

                    <!-- Configure Later -->
                    <div class="integration-card" data-source="configure-later">
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
                                <span>Manual entry</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Upload Dialog (hidden by default) -->
                <div id="uploadItsmDialog" class="upload-dialog" style="display: none;">
                    <div class="dialog-content">
                        <h3>Upload ITSM Tickets</h3>
                        <p>Upload your ticket history in CSV format</p>
                        
                        <div class="upload-area" id="uploadItsmArea">
                            <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M24 8L24 32M24 8L16 16M24 8L32 16" stroke="#6366F1" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
                                <path d="M8 36H40C41.6569 36 43 37.3431 43 39V39C43 40.6569 41.6569 42 40 42H8C6.34315 42 5 40.6569 5 39V39C5 37.3431 6.34315 36 8 36Z" fill="#6366F1"/>
                            </svg>
                            <p>Drag and drop your file here, or <button type="button" class="btn-link" onclick="document.getElementById('itsmFileInput').click()">browse</button></p>
                            <input type="file" id="itsmFileInput" accept=".csv,.xlsx,.xls" style="display: none;">
                            <span class="file-info">Supported formats: CSV, Excel (XLS, XLSX)</span>
                        </div>

                        <div class="dialog-buttons">
                            <button type="button" class="btn btn-secondary" onclick="app.itsmConfig.closeUploadDialog()">Cancel</button>
                            <button type="button" class="btn btn-primary" onclick="app.itsmConfig.handleUpload()">Upload</button>
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
                if (this.selectedSource === 'upload-csv') {
                    this.showUploadDialog();
                } else if (this.selectedSource === 'configure-later') {
                    // Allow immediate continuation
                    if (this.onSubmit) {
                        this.onSubmit({ source: 'configure-later' });
                    }
                }
            });
        });

        // Handle file upload
        const fileInput = document.getElementById('itsmFileInput');
        const uploadArea = document.getElementById('uploadItsmArea');
        
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
        const dialog = document.getElementById('uploadItsmDialog');
        if (dialog) {
            dialog.style.display = 'flex';
        }
    }

    closeUploadDialog() {
        const dialog = document.getElementById('uploadItsmDialog');
        if (dialog) {
            dialog.style.display = 'none';
        }
    }

    handleFileSelect(file) {
        if (file) {
            const uploadArea = document.getElementById('uploadItsmArea');
            uploadArea.innerHTML = `
                <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="24" cy="24" r="20" fill="#10B981"/>
                    <path d="M16 24L21 29L32 18" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                <p class="file-name">${file.name}</p>
                <p class="file-size">${(file.size / 1024).toFixed(2)} KB</p>
                <button type="button" class="btn-link" onclick="app.itsmConfig.resetUpload()">Choose different file</button>
            `;
            this.uploadedFile = file;
        }
    }

    resetUpload() {
        this.uploadedFile = null;
        const uploadArea = document.getElementById('uploadItsmArea');
        uploadArea.innerHTML = `
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M24 8L24 32M24 8L16 16M24 8L32 16" stroke="#6366F1" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M8 36H40C41.6569 36 43 37.3431 43 39V39C43 40.6569 41.6569 42 40 42H8C6.34315 42 5 40.6569 5 39V39C5 37.3431 6.34315 36 8 36Z" fill="#6366F1"/>
            </svg>
            <p>Drag and drop your file here, or <button type="button" class="btn-link" onclick="document.getElementById('itsmFileInput').click()">browse</button></p>
            <input type="file" id="itsmFileInput" accept=".csv,.xlsx,.xls" style="display: none;">
            <span class="file-info">Supported formats: CSV, Excel (XLS, XLSX)</span>
        `;
        
        // Re-attach file input listener
        const fileInput = document.getElementById('itsmFileInput');
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
                    source: 'upload-csv',
                    file: this.uploadedFile
                });
            }
        }
    }

    validate() {
        return this.selectedSource !== null;
    }
}