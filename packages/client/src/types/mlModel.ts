/**
 * Training state values set by Workflow Platform in ml_models.metadata
 */
export type TrainingState =
	| "not_started"
	| "in_progress"
	| "failed"
	| "complete";

/**
 * Training state constants for type-safe comparisons
 */
export const TRAINING_STATES = {
	NOT_STARTED: "not_started",
	IN_PROGRESS: "in_progress",
	FAILED: "failed",
	COMPLETE: "complete",
} as const satisfies Record<string, TrainingState>;

/**
 * ML Model metadata structure
 */
export interface MlModelMetadata {
	training_state?: TrainingState;
	[key: string]: unknown;
}

/**
 * ML Model entity
 */
export interface MlModel {
	id: string;
	organization_id: string;
	model_name: string;
	external_model_id: string;
	active: boolean;
	metadata: MlModelMetadata | null;
	training_start_date: string | null;
	training_end_date: string | null;
	created_at: string | null;
	updated_at: string | null;
}

/**
 * API response for active model endpoint
 */
export interface ActiveModelResponse {
	data: MlModel | null;
}
