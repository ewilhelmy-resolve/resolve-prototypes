export class IntegrationForm {
    constructor(containerId, onConnect) {
        this.container = document.getElementById(containerId);
        this.onConnect = onConnect;
        this.selectedIntegration = null;
        this.init();
    }

    init() {
        this.render();
        this.attachEventListeners();
    }

    render() {
        this.container.innerHTML = `
            <div class="integration-selector" id="integrationSelector">
                <div class="integration-option" data-integration="jira">
                    <div class="integration-badge">Popular Choice</div>
                    <div class="integration-icon">🎯</div>
                    <h3>Jira</h3>
                    <p>Connect to Jira Service Management</p>
                    <div class="integration-stats">
                        <span>⚡ 2-min setup</span>
                        <span>📊 Instant insights</span>
                    </div>
                </div>
                <div class="integration-option" data-integration="servicenow">
                    <div class="integration-badge">Enterprise</div>
                    <div class="integration-icon">❄️</div>
                    <h3>ServiceNow</h3>
                    <p>Connect to ServiceNow instance</p>
                    <div class="integration-stats">
                        <span>🏢 Full ITSM</span>
                        <span>🔧 Advanced features</span>
                    </div>
                </div>
            </div>
            
            ${this.renderJiraForm()}
            ${this.renderServiceNowForm()}
        `;
    }

    renderJiraForm() {
        return `
            <div id="jira-credentials" class="credential-form">
                <button class="btn btn-secondary integration-back-btn">← Change Integration</button>
                <div class="connection-header">
                    <h3>🎯 Complete Your Jira Connection</h3>
                    <p>Just need a few details to connect to your Jira instance</p>
                </div>
                
                <div class="form-group">
                    <label for="jira-url">
                        <span class="label-icon">🌐</span>
                        Jira Instance URL
                    </label>
                    <input type="text" id="jira-url" placeholder="https://company.atlassian.net">
                    <span class="error-message">Please enter a valid Jira URL</span>
                </div>
                <div class="form-group">
                    <label for="jira-email">
                        <span class="label-icon">📧</span>
                        Jira Email
                    </label>
                    <input type="email" id="jira-email" placeholder="admin@company.com">
                    <span class="error-message">Please enter your Jira email</span>
                </div>
                <div class="form-group">
                    <label for="jira-token">
                        <span class="label-icon">🔑</span>
                        API Token
                    </label>
                    <input type="password" id="jira-token" placeholder="••••••••••••••••">
                    <span class="error-message">API token is required</span>
                    <div class="help-tooltip">
                        <span class="tooltip-icon">💡</span>
                        <small>
                            <a href="#" class="token-help-link">
                                Click here to generate your API token
                            </a>
                        </small>
                    </div>
                </div>
            </div>
        `;
    }

    renderServiceNowForm() {
        return `
            <div id="snow-credentials" class="credential-form">
                <button class="btn btn-secondary integration-back-btn">← Change Integration</button>
                <div class="connection-header">
                    <h3>❄️ Complete Your ServiceNow Connection</h3>
                    <p>Enter your ServiceNow instance details below</p>
                </div>
                
                <div class="form-group">
                    <label for="snow-instance">
                        <span class="label-icon">🌐</span>
                        ServiceNow Instance
                    </label>
                    <input type="text" id="snow-instance" placeholder="company.service-now.com">
                    <span class="error-message">Please enter your ServiceNow instance</span>
                </div>
                <div class="form-group">
                    <label for="snow-username">
                        <span class="label-icon">👤</span>
                        Username
                    </label>
                    <input type="text" id="snow-username" placeholder="admin">
                    <span class="error-message">Username is required</span>
                </div>
                <div class="form-group">
                    <label for="snow-password">
                        <span class="label-icon">🔑</span>
                        Password
                    </label>
                    <input type="password" id="snow-password" placeholder="••••••••••••••••">
                    <span class="error-message">Password is required</span>
                </div>
            </div>
        `;
    }

    attachEventListeners() {
        // Integration selection
        const integrationOptions = this.container.querySelectorAll('.integration-option');
        integrationOptions.forEach(option => {
            option.addEventListener('click', (e) => {
                const integration = e.currentTarget.dataset.integration;
                this.selectIntegration(integration);
            });
        });

        // Back buttons
        const backButtons = this.container.querySelectorAll('.integration-back-btn');
        backButtons.forEach(btn => {
            btn.addEventListener('click', () => this.resetIntegrationSelection());
        });

        // Token help link
        const tokenHelpLink = this.container.querySelector('.token-help-link');
        if (tokenHelpLink) {
            tokenHelpLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.openTokenModal();
            });
        }

        // Remove error states on input
        const inputs = this.container.querySelectorAll('input');
        inputs.forEach(input => {
            input.addEventListener('input', () => {
                input.classList.remove('error');
                const errorMsg = input.nextElementSibling;
                if (errorMsg && errorMsg.classList.contains('error-message')) {
                    errorMsg.style.display = 'none';
                }
            });
        });
    }

    selectIntegration(type) {
        this.selectedIntegration = type;
        
        // Update UI
        const selector = this.container.querySelector('#integrationSelector');
        selector.classList.add('hidden');
        
        // Show appropriate form
        const jiraForm = this.container.querySelector('#jira-credentials');
        const snowForm = this.container.querySelector('#snow-credentials');
        
        if (type === 'jira') {
            jiraForm.classList.add('active');
            snowForm.classList.remove('active');
        } else {
            snowForm.classList.add('active');
            jiraForm.classList.remove('active');
        }
        
        // Update selection state
        const options = this.container.querySelectorAll('.integration-option');
        options.forEach(opt => opt.classList.remove('selected'));
        const selectedOption = this.container.querySelector(`[data-integration="${type}"]`);
        if (selectedOption) {
            selectedOption.classList.add('selected');
        }
        
        // Focus first input
        setTimeout(() => {
            const form = this.container.querySelector(`#${type === 'jira' ? 'jira' : 'snow'}-credentials`);
            const firstInput = form.querySelector('input');
            if (firstInput) firstInput.focus();
        }, 100);
    }

    resetIntegrationSelection() {
        this.selectedIntegration = null;
        
        // Show selector
        this.container.querySelector('#integrationSelector').classList.remove('hidden');
        
        // Hide forms
        this.container.querySelector('#jira-credentials').classList.remove('active');
        this.container.querySelector('#snow-credentials').classList.remove('active');
        
        // Remove selected state
        const options = this.container.querySelectorAll('.integration-option');
        options.forEach(opt => opt.classList.remove('selected'));
    }

    async validate() {
        if (!this.selectedIntegration) {
            alert('Please select an integration type');
            return false;
        }

        let isValid = true;
        
        if (this.selectedIntegration === 'jira') {
            const url = this.container.querySelector('#jira-url');
            const email = this.container.querySelector('#jira-email');
            const token = this.container.querySelector('#jira-token');
            
            // Clear previous errors
            [url, email, token].forEach(input => {
                input.classList.remove('error');
                const errorMsg = input.nextElementSibling;
                if (errorMsg && errorMsg.classList.contains('error-message')) {
                    errorMsg.style.display = 'none';
                }
            });
            
            // Validate URL
            if (!url.value) {
                this.showError(url, 'Jira URL is required');
                isValid = false;
            } else if (!url.value.includes('atlassian.net') && !url.value.includes('atlassian.com')) {
                this.showError(url, 'Please enter a valid Jira Cloud URL');
                isValid = false;
            }
            
            // Validate email
            if (!email.value || !email.value.includes('@')) {
                this.showError(email);
                isValid = false;
            }
            
            // Validate token
            if (!token.value) {
                this.showError(token);
                isValid = false;
            }
            
            if (isValid) {
                return {
                    type: 'jira',
                    url: url.value.replace(/\/$/, ''),
                    email: email.value,
                    token: token.value
                };
            }
        } else if (this.selectedIntegration === 'servicenow') {
            const instance = this.container.querySelector('#snow-instance');
            const username = this.container.querySelector('#snow-username');
            const password = this.container.querySelector('#snow-password');
            
            if (!instance.value || !instance.value.includes('.service-now.com')) {
                this.showError(instance);
                isValid = false;
            }
            if (!username.value) {
                this.showError(username);
                isValid = false;
            }
            if (!password.value) {
                this.showError(password);
                isValid = false;
            }
            
            if (isValid) {
                return {
                    type: 'servicenow',
                    instance: instance.value,
                    username: username.value,
                    password: password.value
                };
            }
        }
        
        return false;
    }

    showError(input, message) {
        input.classList.add('error');
        const errorMsg = input.nextElementSibling;
        if (errorMsg && errorMsg.classList.contains('error-message')) {
            if (message) {
                errorMsg.textContent = message;
            }
            errorMsg.style.display = 'block';
        }
    }

    openTokenModal() {
        // This will be handled by the parent component
        if (window.openTokenModal) {
            window.openTokenModal();
        }
    }

    getSelectedIntegration() {
        return this.selectedIntegration;
    }
}