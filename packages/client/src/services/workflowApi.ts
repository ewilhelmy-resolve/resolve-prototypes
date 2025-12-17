/**
 * Workflow API client
 *
 * Calls Actions API webhook to trigger workflow generation.
 * Response comes back via SSE 'dynamic_workflow' event.
 */

const ACTIONS_API_URL =
	import.meta.env.VITE_ACTIONS_API_URL ||
	"https://actions-api-staging.resolve.io";

// Workflow Creator webhook GUID - same endpoint as RitaGo
const WORKFLOW_CREATOR_GUID = "00F4F67D-3B92-4FD2-A574-7BE22C6BE796";

export interface GenerateWorkflowPayload {
	action: "generate_dynamic_workflow";
	tenant_id: string;
	user_email: string;
	user_id: string;
	query: string;
	index_name: string;
}

export const workflowApi = {
	/**
	 * Trigger workflow generation via webhook
	 * Response will arrive via SSE 'workflow_created' event
	 */
	generateWorkflow: async (payload: GenerateWorkflowPayload): Promise<void> => {
		const url = `${ACTIONS_API_URL}/api/Webhooks/postEvent/${WORKFLOW_CREATOR_GUID}`;

		const response = await fetch(url, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(payload),
		});

		if (!response.ok) {
			const errorText = await response.text().catch(() => "Unknown error");
			throw new Error(`Workflow webhook failed: ${response.status} - ${errorText}`);
		}
	},
};
