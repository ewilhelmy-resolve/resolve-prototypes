// Workflow response types

export interface WorkflowSnippet {
	id: string;
	description: string;
	code: string;
	input_example: string;
	output_keys: string;
	packages: string;
}

export interface WorkflowTask {
	task_id: string;
	description: string;
	inputs: string[];
	outputs: string[];
	action: "reuse" | "create" | "modify";
	snippet: WorkflowSnippet;
}

export interface WorkflowResponse {
	action: "workflow_created";
	workflow: WorkflowTask[];
	visualization: string;
	mappings: Record<string, Record<string, string>>;
}

export interface ChatMessage {
	id: string;
	role: "user" | "assistant";
	content: string;
	timestamp: Date;
	isError?: boolean;
	workflowData?: WorkflowResponse;
}

// Check if response is a workflow response
export function isWorkflowResponse(data: unknown): data is WorkflowResponse {
	return (
		typeof data === "object" &&
		data !== null &&
		"action" in data &&
		(data as WorkflowResponse).action === "workflow_created" &&
		"workflow" in data &&
		Array.isArray((data as WorkflowResponse).workflow)
	);
}

// Parse output_keys from JSON string
export function parseOutputKeys(outputKeys: string): string[] {
	try {
		return JSON.parse(outputKeys);
	} catch {
		return [];
	}
}

// Parse input from snippet input_example
export function parseInputKeys(inputExample: string): string[] {
	try {
		const parsed = JSON.parse(inputExample);
		return Object.keys(parsed);
	} catch {
		return [];
	}
}
