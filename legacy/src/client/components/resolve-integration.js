// Resolve Integration API Client
export class ResolveIntegration {
    constructor() {
        // All API calls should go through backend
        this.apiUrl = '/api/webhook'; // Backend endpoint
        this.source = 'Onboarding'; // Set source as Onboarding
    }

    /**
     * Send event to Resolve Actions API
     * @param {string} userEmail - User's email address
     * @param {string} action - Action to perform (e.g., 'learn_data', 'unlock_account')
     * @param {Object} additionalData - Any additional data to send
     * @returns {Promise} Response from the API
     */
    async sendEvent(userEmail, action = 'learn_data', additionalData = {}) {
        try {
            const payload = {
                source: this.source,
                user_email: userEmail,
                action: action,
                ...additionalData
            };

            console.log('Sending event to Resolve:', payload);

            // Send to backend endpoint
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error(`API error: ${response.status} ${response.statusText}`);
            }

            const data = await response.json().catch(() => ({}));
            console.log('API response:', data);
            return { success: true, data };
        } catch (error) {
            console.error('Failed to send event to Resolve:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Send learning data when user logs in or interacts
     * @param {string} userEmail - User's email
     * @param {Object} userData - User data to learn from
     */
    async sendLearningData(userEmail, userData = {}) {
        return await this.sendEvent(userEmail, 'learn_data', {
            timestamp: new Date().toISOString(),
            user_data: userData,
            session_info: {
                platform: 'web',
                version: 'v1.0.2',
                module: 'onboarding'
            }
        });
    }

    /**
     * Unlock user account
     * @param {string} userEmail - User's email to unlock
     */
    async unlockAccount(userEmail) {
        return await this.sendEvent(userEmail, 'unlock_account');
    }

    /**
     * Send automation event
     * @param {string} userEmail - User's email
     * @param {string} workflowType - Type of workflow being automated
     */
    async sendAutomationEvent(userEmail, workflowType) {
        return await this.sendEvent(userEmail, 'automate_workflow', {
            workflow_type: workflowType,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Check integration status
     */
    async checkStatus() {
        try {
            // Send a test event to check if integration is working
            const result = await this.sendEvent('test@resolve.io', 'health_check');
            return result.success;
        } catch (error) {
            console.error('Integration status check failed:', error);
            return false;
        }
    }
}

// Export singleton instance
export const resolveIntegration = new ResolveIntegration();