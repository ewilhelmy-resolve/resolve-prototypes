import { IntegrationForm } from './integration-form.js';
import { apiClient } from './api-client.js';

export class JiraIntegration {
    constructor(containerId, onComplete) {
        this.container = document.getElementById(containerId);
        this.onComplete = onComplete;
        this.integrationForm = null;
        this.init();
    }

    init() {
        this.render();
        this.setupIntegrationForm();
    }

    render() {
        this.container.innerHTML = `
            <div class="jira-integration-wrapper">
                <div class="integration-header">
                    <button class="btn btn-secondary back-to-knowledge">← Back to Knowledge Sources</button>
                    <h2>Configure Jira Integration</h2>
                    <p>Connect your Jira instance to enable seamless ticket management</p>
                </div>
                <div id="jiraIntegrationForm"></div>
                <div class="integration-actions">
                    <button class="btn btn-primary test-connection" disabled>Test Connection</button>
                    <button class="btn btn-success save-integration" disabled>Save & Continue</button>
                </div>
                <div id="validationMessage" class="validation-message"></div>
            </div>
        `;
    }

    setupIntegrationForm() {
        // Initialize the integration form component
        this.integrationForm = new IntegrationForm('jiraIntegrationForm', (config) => {
            this.handleIntegrationConfig(config);
        });
        
        // Automatically select Jira
        setTimeout(() => {
            this.integrationForm.selectIntegration('jira');
        }, 100);

        // Setup event listeners
        this.attachEventListeners();
    }

    attachEventListeners() {
        // Back button
        const backBtn = this.container.querySelector('.back-to-knowledge');
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                if (this.onComplete) {
                    this.onComplete({ action: 'back' });
                }
            });
        }

        // Test connection button
        const testBtn = this.container.querySelector('.test-connection');
        if (testBtn) {
            testBtn.addEventListener('click', () => this.testConnection());
        }

        // Save button
        const saveBtn = this.container.querySelector('.save-integration');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.saveIntegration());
        }

        // Monitor form inputs to enable test button
        const container = document.getElementById('jiraIntegrationForm');
        if (container) {
            container.addEventListener('input', () => {
                this.checkFormValidity();
            });
        }
    }

    checkFormValidity() {
        const url = document.querySelector('#jira-url');
        const email = document.querySelector('#jira-email');
        const token = document.querySelector('#jira-token');
        const testBtn = this.container.querySelector('.test-connection');
        
        if (url && email && token && testBtn) {
            const isValid = url.value && email.value && token.value;
            testBtn.disabled = !isValid;
        }
    }

    async handleIntegrationConfig(config) {
        // This is called when the form is submitted
        if (config && config.type === 'jira') {
            this.currentConfig = config;
            await this.testConnection();
        }
    }

    async testConnection() {
        const validationMsg = document.getElementById('validationMessage');
        const testBtn = this.container.querySelector('.test-connection');
        const saveBtn = this.container.querySelector('.save-integration');
        
        // Get current form values
        const config = await this.integrationForm.validate();
        if (!config) {
            return;
        }

        // Show loading state
        testBtn.disabled = true;
        testBtn.innerHTML = 'Testing...';
        validationMsg.className = 'validation-message loading';
        validationMsg.innerHTML = 'Sending validation request to automation engine...';

        try {
            const response = await apiClient.request('/api/integrations/validate-jira', {
                method: 'POST',
                body: JSON.stringify({
                    url: config.url,
                    email: config.email,
                    token: config.token
                })
            });

            if (response.webhookId) {
                // Automation engine is processing - use SSE for status updates
                validationMsg.innerHTML = 'Validating connection with automation engine...';
                
                // Expose webhook ID for testing
                if (window.location.hostname === 'localhost') {
                    window.lastWebhookId = response.webhookId;
                }
                
                await this.subscribeToValidationStatus(response.webhookId, config);
            } else if (!response.success) {
                validationMsg.className = 'validation-message error';
                validationMsg.innerHTML = `❌ ${response.error || 'Connection failed'}`;
                saveBtn.disabled = true;
                this.validationSuccess = false;
            }
        } catch (error) {
            validationMsg.className = 'validation-message error';
            validationMsg.innerHTML = `❌ Connection failed: ${error.message}`;
            saveBtn.disabled = true;
            this.validationSuccess = false;
        } finally {
            testBtn.disabled = false;
            testBtn.innerHTML = 'Test Connection';
        }
    }

    subscribeToValidationStatus(webhookId, config) {
        return new Promise((resolve) => {
            const validationMsg = document.getElementById('validationMessage');
            const saveBtn = this.container.querySelector('.save-integration');
            
            // Get auth token for SSE connection
            const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
            
            // Create EventSource with authentication
            const eventSource = new EventSource(
                `/api/integrations/status-stream/${webhookId}?token=${encodeURIComponent(token)}`
            );
            
            let messageCount = 0;
            const animationInterval = setInterval(() => {
                const dots = '.'.repeat((messageCount % 3) + 1);
                if (!validationMsg.classList.contains('success') && !validationMsg.classList.contains('error')) {
                    validationMsg.innerHTML = `Validating connection with automation engine${dots}`;
                }
                messageCount++;
            }, 500);
            
            // Handle incoming messages
            eventSource.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    
                    if (data.completed) {
                        clearInterval(animationInterval);
                        eventSource.close();
                        
                        if (data.status === 'success') {
                            validationMsg.className = 'validation-message success';
                            validationMsg.innerHTML = `✅ Connection validated successfully! ${data.userData ? `Connected as: ${data.userData}` : ''}`;
                            saveBtn.disabled = false;
                            this.currentConfig = config;
                            this.validationSuccess = true;
                        } else {
                            validationMsg.className = 'validation-message error';
                            validationMsg.innerHTML = `❌ Validation failed: ${data.error || 'Unknown error'}`;
                            saveBtn.disabled = true;
                            this.validationSuccess = false;
                        }
                        resolve();
                    }
                } catch (error) {
                    console.error('SSE message error:', error);
                }
            };
            
            // Handle connection errors
            eventSource.onerror = (error) => {
                clearInterval(animationInterval);
                console.error('SSE connection error:', error);
                eventSource.close();
                
                validationMsg.className = 'validation-message error';
                validationMsg.innerHTML = '❌ Lost connection to validation service. Please try again.';
                saveBtn.disabled = true;
                this.validationSuccess = false;
                resolve();
            };
            
            // Set timeout for validation
            setTimeout(() => {
                if (eventSource.readyState !== EventSource.CLOSED) {
                    clearInterval(animationInterval);
                    eventSource.close();
                    validationMsg.className = 'validation-message error';
                    validationMsg.innerHTML = '❌ Validation timeout. Please try again.';
                    saveBtn.disabled = true;
                    this.validationSuccess = false;
                    resolve();
                }
            }, 60000); // 60 second timeout
        });
    }

    async saveIntegration() {
        if (!this.validationSuccess || !this.currentConfig) {
            alert('Please test the connection first');
            return;
        }

        const saveBtn = this.container.querySelector('.save-integration');
        saveBtn.disabled = true;
        saveBtn.innerHTML = 'Saving...';

        try {
            // The validation endpoint already saves the integration
            // So we just need to notify completion
            if (this.onComplete) {
                this.onComplete({ 
                    action: 'complete',
                    source: 'jira',
                    config: this.currentConfig
                });
            }
        } catch (error) {
            console.error('Error saving integration:', error);
            alert('Failed to save integration. Please try again.');
            saveBtn.disabled = false;
            saveBtn.innerHTML = 'Save & Continue';
        }
    }
}