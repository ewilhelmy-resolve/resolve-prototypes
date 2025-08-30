const axios = require('axios');

class ResolveWebhook {
    constructor() {
        this.webhookUrl = process.env.AUTOMATION_WEBHOOK_URL || 
            'https://actions-api-staging.resolve.io/api/Webhooks/postEvent/00F4F67D-3B92-4FD2-A574-7BE22C6BE796';
        this.authHeader = process.env.AUTOMATION_AUTH || 
            'Basic RTE0NzMwRkEtRDFCNS00MDM3LUFDRTMtQ0Y5N0ZCQzY3NkMyOlZaSkQqSSYyWEAkXkQ5Sjk4Rk5PJShGUVpaQ0dRNkEj';
        this.timeout = 10000; // 10 seconds
    }

    /**
     * Send event to Resolve Actions API
     * @param {Object} payload - Event payload
     * @returns {Promise} Response from the API
     */
    async sendEvent(payload) {
        try {
            console.log(`[ResolveWebhook] Sending event with action: ${payload.action}`);
            console.log(`[ResolveWebhook] Payload:`, JSON.stringify(payload, null, 2));
            
            const response = await axios.post(
                this.webhookUrl,
                payload,
                {
                    headers: {
                        'Authorization': this.authHeader,
                        'Content-Type': 'application/json'
                    },
                    timeout: this.timeout
                }
            );
            
            console.log(`[ResolveWebhook] Response status: ${response.status}`);
            if (response.data) {
                console.log(`[ResolveWebhook] Response data:`, response.data);
            }
            
            return { success: true, data: response.data, status: response.status };
        } catch (error) {
            console.error(`[ResolveWebhook] Error sending event:`, error.message);
            if (error.response) {
                console.error(`[ResolveWebhook] Response status:`, error.response.status);
                console.error(`[ResolveWebhook] Response data:`, error.response.data);
            }
            throw error;
        }
    }

    /**
     * Send CSV upload event
     * @param {Object} params - Event parameters
     * @returns {Promise} Response from the API
     */
    async sendCsvUploadEvent({ userEmail, userId, tenantId, callbackUrl, callbackToken, csvContent, ticketsImported }) {
        const payload = {
            source: 'Onboarding',
            user_email: userEmail,
            user_id: userId,
            action: 'uploaded-csv',
            integration_type: 'csv',
            callbackUrl: callbackUrl,
            callbackToken: callbackToken,
            tenantToken: tenantId,
            metadata: {
                total_rows: csvContent.length,
                batch_size: 100,
                total_batches: Math.ceil(csvContent.length / 100),
                tickets_imported: ticketsImported
            }
        };

        return await this.sendEvent(payload);
    }

    /**
     * Send RAG ingest event
     * @param {Object} params - Event parameters
     * @returns {Promise} Response from the API
     */
    async sendRagIngestEvent({ tenantId, documentId, content, metadata, callbackUrl }) {
        const payload = {
            source: 'RAG_Ingest',
            action: 'vectorize-content',
            tenant_id: tenantId,
            document_id: documentId,
            content: content,
            metadata: metadata,
            callback_url: callbackUrl,
            expected_response_format: {
                vectors: [
                    {
                        chunk_text: "string",
                        embedding: "array of 1536 floats",
                        chunk_index: "number"
                    }
                ]
            }
        };

        return await this.sendEvent(payload);
    }

    /**
     * Send document processing event to actions platform
     * @param {Object} params - Event parameters
     * @returns {Promise} Response from the API
     */
    async sendDocumentProcessingEvent(params) {
        const payload = {
            source: params.source || 'onboarding',
            action: params.action || 'document-processing',
            tenant_id: params.tenant_id,
            document_id: params.document_id,
            document_url: params.document_url,
            // Support both legacy callback_url and new separate URLs
            callback_url: params.callback_url, // Keep for backward compatibility
            markdown_callback_url: params.markdown_callback_url || params.callback_url,
            vector_callback_url: params.vector_callback_url || params.callback_url?.replace('/document-callback/', '/callback/'),
            callback_token: params.callback_token,
            file_type: params.file_type,
            file_size: params.file_size,
            original_filename: params.original_filename
        };

        return await this.sendEvent(payload);
    }

    /**
     * Send RAG chat event
     * @param {Object} params - Event parameters
     * @returns {Promise} Response from the API
     */
    async sendRagChatEvent({ tenantId, conversationId, message, messageHistory, vectorSearchEndpoint, callbackToken, userEmail }) {
        const payload = {
            source: 'RAG_Chat',
            action: 'rag-response',
            tenant_id: tenantId,
            conversation_id: conversationId,
            user_email: userEmail,
            customer_message: message,  // Explicitly named to be clear this is the customer's message
            message: message,  // Keep for backward compatibility
            history: messageHistory,
            vector_search_endpoint: vectorSearchEndpoint,
            vector_search_auth: callbackToken,
            expected_response_format: {
                message: "AI response text",
                sources: ["optional array of source references"]
            }
        };

        return await this.sendEvent(payload);
    }

    /**
     * Send generic webhook proxy event
     * @param {Object} params - Event parameters
     * @returns {Promise} Response from the API
     */
    async sendProxyEvent({ source, action, userEmail, tenantId, ...additionalData }) {
        const payload = {
            source: source || 'Onboarding',
            user_email: userEmail,
            action: action,
            tenant_id: tenantId,
            ...additionalData
        };

        return await this.sendEvent(payload);
    }

    /**
     * Track action for monitoring/analytics
     * @param {Object} params - Action parameters
     */
    async trackAction({ action, source, userEmail, tenantId, metadata = {} }) {
        console.log(`[ResolveWebhook] Tracking action: ${action} from ${source} for user ${userEmail}`);
        
        // This can be extended to send tracking events to a separate analytics endpoint
        // or store in a metrics database
        const trackingPayload = {
            source: source,
            action: `track-${action}`,
            user_email: userEmail,
            tenant_id: tenantId,
            timestamp: new Date().toISOString(),
            metadata: metadata
        };

        // For now, we'll just log it, but this could send to a separate tracking endpoint
        console.log(`[ResolveWebhook] Tracking payload:`, JSON.stringify(trackingPayload, null, 2));
    }
}

module.exports = ResolveWebhook;