class FileUpload extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.uploadedFiles = [];
    this.apiKey = null;
  }

  connectedCallback() {
    this.render();
    this.setupEventListeners();
  }

  render() {
    this.shadowRoot.innerHTML = `
      <link rel="stylesheet" href="/styles/file-upload.css">
      <div class="file-upload-container">
        <div class="upload-area" id="upload-area">
          <svg class="upload-icon" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="17 8 12 3 7 8"></polyline>
            <line x1="12" y1="3" x2="12" y2="15"></line>
          </svg>
          <h3>Upload CSV or ZIP Files</h3>
          <p>Drag and drop files here or click to browse</p>
          <p class="file-info">Maximum file size: 50MB | Supported formats: CSV, ZIP</p>
          <input type="file" id="file-input" multiple accept=".csv,.zip" style="display: none;">
          <button class="browse-button" id="browse-button">Browse Files</button>
        </div>
        
        <div class="upload-progress" id="upload-progress" style="display: none;">
          <div class="progress-bar">
            <div class="progress-fill" id="progress-fill"></div>
          </div>
          <span class="progress-text" id="progress-text">Uploading...</span>
        </div>

        <div class="uploaded-files" id="uploaded-files" style="display: none;">
          <h4>Uploaded Files</h4>
          <div class="file-list" id="file-list"></div>
        </div>

        <div class="api-section" id="api-section" style="display: none;">
          <h4>API Access</h4>
          <div class="api-key-display">
            <label>Your API Key:</label>
            <div class="api-key-container">
              <input type="text" id="api-key-input" readonly class="api-key-input">
              <button class="copy-button" id="copy-api-key">Copy</button>
            </div>
          </div>
          <div class="api-example">
            <h5>Example API Call:</h5>
            <pre><code>GET /api/tickets/data
Headers: {
  "X-API-Key": "your-api-key",
  "Content-Type": "application/json"
}

Query Parameters:
  - start_date: YYYY-MM-DD
  - end_date: YYYY-MM-DD
  - status: open|closed|in_progress
  - category: string
  - page: number (default: 1)
  - limit: number (default: 100)</code></pre>
          </div>
        </div>

        <div class="error-message" id="error-message" style="display: none;"></div>
        <div class="success-message" id="success-message" style="display: none;"></div>
      </div>
    `;
  }

  setupEventListeners() {
    const uploadArea = this.shadowRoot.getElementById('upload-area');
    const fileInput = this.shadowRoot.getElementById('file-input');
    const browseButton = this.shadowRoot.getElementById('browse-button');
    const copyButton = this.shadowRoot.getElementById('copy-api-key');

    browseButton.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => this.handleFileSelect(e.target.files));

    uploadArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      uploadArea.classList.add('dragover');
    });

    uploadArea.addEventListener('dragleave', () => {
      uploadArea.classList.remove('dragover');
    });

    uploadArea.addEventListener('drop', (e) => {
      e.preventDefault();
      uploadArea.classList.remove('dragover');
      this.handleFileSelect(e.dataTransfer.files);
    });

    if (copyButton) {
      copyButton.addEventListener('click', () => this.copyApiKey());
    }
  }

  handleFileSelect(files) {
    const validFiles = [];
    const maxSize = 50 * 1024 * 1024; // 50MB

    for (const file of files) {
      if (!file.name.match(/\.(csv|zip)$/i)) {
        this.showError(`Invalid file type: ${file.name}. Only CSV and ZIP files are allowed.`);
        continue;
      }

      if (file.size > maxSize) {
        this.showError(`File too large: ${file.name}. Maximum size is 50MB.`);
        continue;
      }

      validFiles.push(file);
    }

    if (validFiles.length > 0) {
      this.uploadFiles(validFiles);
    }
  }

  async uploadFiles(files) {
    this.showProgress();
    
    for (const file of files) {
      const formData = new FormData();
      formData.append('file', file);

      try {
        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
          headers: {
            'X-User-Email': sessionStorage.getItem('userEmail') || 'anonymous'
          }
        });

        if (!response.ok) {
          throw new Error(`Upload failed: ${response.statusText}`);
        }

        const result = await response.json();
        this.uploadedFiles.push({
          name: file.name,
          size: file.size,
          uploadId: result.uploadId,
          timestamp: new Date().toISOString()
        });

        this.updateProgress(((this.uploadedFiles.length / files.length) * 100));
      } catch (error) {
        this.showError(`Failed to upload ${file.name}: ${error.message}`);
      }
    }

    this.hideProgress();
    this.showUploadedFiles();
    this.showSuccess(`Successfully uploaded ${this.uploadedFiles.length} file(s)`);
    
    if (!this.apiKey) {
      this.generateApiKey();
    }
  }

  async generateApiKey() {
    try {
      const response = await fetch('/api/generate-key', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Email': sessionStorage.getItem('userEmail') || 'anonymous'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to generate API key');
      }

      const result = await response.json();
      this.apiKey = result.apiKey;
      this.showApiSection();
    } catch (error) {
      console.error('Error generating API key:', error);
    }
  }

  showApiSection() {
    const apiSection = this.shadowRoot.getElementById('api-section');
    const apiKeyInput = this.shadowRoot.getElementById('api-key-input');
    
    if (apiSection && apiKeyInput && this.apiKey) {
      apiKeyInput.value = this.apiKey;
      apiSection.style.display = 'block';
    }
  }

  copyApiKey() {
    const apiKeyInput = this.shadowRoot.getElementById('api-key-input');
    if (apiKeyInput) {
      apiKeyInput.select();
      document.execCommand('copy');
      this.showSuccess('API key copied to clipboard!');
    }
  }

  showProgress() {
    const progressDiv = this.shadowRoot.getElementById('upload-progress');
    if (progressDiv) {
      progressDiv.style.display = 'block';
    }
  }

  hideProgress() {
    const progressDiv = this.shadowRoot.getElementById('upload-progress');
    if (progressDiv) {
      progressDiv.style.display = 'none';
    }
  }

  updateProgress(percentage) {
    const progressFill = this.shadowRoot.getElementById('progress-fill');
    const progressText = this.shadowRoot.getElementById('progress-text');
    
    if (progressFill) {
      progressFill.style.width = `${percentage}%`;
    }
    
    if (progressText) {
      progressText.textContent = `Uploading... ${Math.round(percentage)}%`;
    }
  }

  showUploadedFiles() {
    const uploadedFilesDiv = this.shadowRoot.getElementById('uploaded-files');
    const fileList = this.shadowRoot.getElementById('file-list');
    
    if (uploadedFilesDiv && fileList) {
      fileList.innerHTML = this.uploadedFiles.map(file => `
        <div class="file-item">
          <span class="file-name">${file.name}</span>
          <span class="file-size">${this.formatFileSize(file.size)}</span>
          <span class="file-status"> Uploaded</span>
        </div>
      `).join('');
      
      uploadedFilesDiv.style.display = 'block';
    }
  }

  formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  showError(message) {
    const errorDiv = this.shadowRoot.getElementById('error-message');
    if (errorDiv) {
      errorDiv.textContent = message;
      errorDiv.style.display = 'block';
      setTimeout(() => {
        errorDiv.style.display = 'none';
      }, 5000);
    }
  }

  showSuccess(message) {
    const successDiv = this.shadowRoot.getElementById('success-message');
    if (successDiv) {
      successDiv.textContent = message;
      successDiv.style.display = 'block';
      setTimeout(() => {
        successDiv.style.display = 'none';
      }, 3000);
    }
  }
}

customElements.define('file-upload', FileUpload);