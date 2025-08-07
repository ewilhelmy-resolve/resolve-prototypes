export class PremiumConfiguration {
    constructor(containerId, onComplete) {
        this.container = document.getElementById(containerId);
        this.onComplete = onComplete;
        this.selectedTicketing = null;
        this.selectedKnowledge = null;
        this.init();
    }

    init() {
        this.render();
        this.attachEventListeners();
    }

    render() {
        this.container.innerHTML = `
            <div class="premium-config-container">
                <div class="rita-welcome-banner">
                    <div class="rita-avatar">🤖</div>
                    <div class="rita-message">
                        <h4>Welcome to Premium! I'm Rita, your AI Service Desk Agent.</h4>
                        <p>Let's configure your systems so I can start automating your workflows.</p>
                    </div>
                </div>

                <div class="config-section">
                    <h3>
                        <span class="section-icon">🎯</span>
                        Select Your Ticketing System
                    </h3>
                    <p class="section-description">Choose the platform where your support tickets are managed</p>
                    
                    <div class="config-options" id="ticketingOptions">
                        <div class="config-option" data-ticketing="jira">
                            <div class="option-badge">Popular Choice</div>
                            <div class="option-icon">🎯</div>
                            <h4>Jira Service Management</h4>
                            <p>Atlassian's service desk solution</p>
                            <div class="option-features">
                                <span>✓ Full API access</span>
                                <span>✓ Real-time sync</span>
                            </div>
                        </div>
                        
                        <div class="config-option" data-ticketing="servicenow">
                            <div class="option-badge">Enterprise</div>
                            <div class="option-icon">❄️</div>
                            <h4>ServiceNow</h4>
                            <p>Enterprise IT service management</p>
                            <div class="option-features">
                                <span>✓ ITSM workflows</span>
                                <span>✓ Advanced automation</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="config-section">
                    <h3>
                        <span class="section-icon">📚</span>
                        Select Your Knowledge Base
                    </h3>
                    <p class="section-description">Where your documentation and knowledge articles are stored</p>
                    
                    <div class="config-options" id="knowledgeOptions">
                        <div class="config-option" data-knowledge="servicenow-kb">
                            <div class="option-icon">❄️</div>
                            <h4>ServiceNow Knowledge</h4>
                            <p>Integrated knowledge management</p>
                            <div class="option-features">
                                <span>✓ Native integration</span>
                                <span>✓ Article templates</span>
                            </div>
                        </div>
                        
                        <div class="config-option" data-knowledge="sharepoint">
                            <div class="option-icon">📄</div>
                            <h4>SharePoint</h4>
                            <p>Microsoft's collaboration platform</p>
                            <div class="option-features">
                                <span>✓ Document libraries</span>
                                <span>✓ Team sites</span>
                            </div>
                        </div>
                        
                        <div class="config-option" data-knowledge="later">
                            <div class="option-icon">⏰</div>
                            <h4>Configure Later</h4>
                            <p>Set up knowledge base after trial</p>
                            <div class="option-features">
                                <span>✓ No setup required</span>
                                <span>✓ Add anytime</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="config-summary" id="configSummary" style="display: none;">
                    <h4>Your Premium Configuration</h4>
                    <div class="summary-items">
                        <div class="summary-item">
                            <span class="summary-label">Ticketing System:</span>
                            <span class="summary-value" id="selectedTicketing">Not selected</span>
                        </div>
                        <div class="summary-item">
                            <span class="summary-label">Knowledge Base:</span>
                            <span class="summary-value" id="selectedKnowledge">Not selected</span>
                        </div>
                    </div>
                    <div class="rita-tip">
                        <span class="tip-icon">💡</span>
                        <p>Rita will use these systems to provide intelligent automation and instant answers to your team.</p>
                    </div>
                </div>
            </div>
        `;
    }

    attachEventListeners() {
        // Ticketing system selection
        const ticketingOptions = this.container.querySelectorAll('#ticketingOptions .config-option');
        ticketingOptions.forEach(option => {
            option.addEventListener('click', (e) => {
                const ticketing = e.currentTarget.dataset.ticketing;
                this.selectTicketing(ticketing);
            });
        });

        // Knowledge base selection
        const knowledgeOptions = this.container.querySelectorAll('#knowledgeOptions .config-option');
        knowledgeOptions.forEach(option => {
            option.addEventListener('click', (e) => {
                const knowledge = e.currentTarget.dataset.knowledge;
                this.selectKnowledge(knowledge);
            });
        });
    }

    selectTicketing(type) {
        this.selectedTicketing = type;
        
        // Update UI
        const options = this.container.querySelectorAll('#ticketingOptions .config-option');
        options.forEach(opt => opt.classList.remove('selected'));
        
        const selectedOption = this.container.querySelector(`#ticketingOptions [data-ticketing="${type}"]`);
        if (selectedOption) {
            selectedOption.classList.add('selected');
        }
        
        // Update summary
        this.updateSummary();
    }

    selectKnowledge(type) {
        this.selectedKnowledge = type;
        
        // Update UI
        const options = this.container.querySelectorAll('#knowledgeOptions .config-option');
        options.forEach(opt => opt.classList.remove('selected'));
        
        const selectedOption = this.container.querySelector(`#knowledgeOptions [data-knowledge="${type}"]`);
        if (selectedOption) {
            selectedOption.classList.add('selected');
        }
        
        // Update summary
        this.updateSummary();
    }

    updateSummary() {
        if (this.selectedTicketing && this.selectedKnowledge) {
            const summary = this.container.querySelector('#configSummary');
            summary.style.display = 'block';
            
            // Update ticketing display
            const ticketingDisplay = this.selectedTicketing === 'jira' ? 'Jira Service Management' : 
                                   this.selectedTicketing === 'servicenow' ? 'ServiceNow' : 'Not selected';
            document.getElementById('selectedTicketing').textContent = ticketingDisplay;
            
            // Update knowledge base display
            const knowledgeDisplay = this.selectedKnowledge === 'servicenow-kb' ? 'ServiceNow Knowledge' :
                                   this.selectedKnowledge === 'sharepoint' ? 'SharePoint' :
                                   this.selectedKnowledge === 'later' ? 'Configure Later' : 'Not selected';
            document.getElementById('selectedKnowledge').textContent = knowledgeDisplay;
            
            // Add animation
            summary.classList.add('fade-in');
        }
    }

    validate() {
        if (!this.selectedTicketing) {
            this.showError('Please select a ticketing system');
            return false;
        }
        
        if (!this.selectedKnowledge) {
            this.showError('Please select a knowledge base option');
            return false;
        }
        
        return {
            ticketing: this.selectedTicketing,
            knowledge: this.selectedKnowledge
        };
    }

    showError(message) {
        // Create temporary error message
        const errorDiv = document.createElement('div');
        errorDiv.className = 'config-error';
        errorDiv.innerHTML = `
            <span class="error-icon">⚠️</span>
            <span>${message}</span>
        `;
        
        // Insert at the beginning of container
        this.container.insertBefore(errorDiv, this.container.firstChild);
        
        // Remove after 3 seconds
        setTimeout(() => {
            errorDiv.remove();
        }, 3000);
        
        // Scroll to top
        this.container.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    getConfiguration() {
        return {
            ticketing: this.selectedTicketing,
            knowledge: this.selectedKnowledge
        };
    }
}