/**
 * Training state values set by Workflow Platform in ml_models.metadata
 */
export type TrainingState =
	| "not_started"
	| "in_progress"
	| "failed"
	| "complete";

/**
 * ML Model metadata structure (stored as JSONB)
 */
export interface MlModelMetadata {
	training_state?: TrainingState;
	[key: string]: unknown;
}

/**
 * ML Model entity from database
 */
export interface MlModel {
	id: string;
	organization_id: string;
	model_name: string;
	external_model_id: string;
	active: boolean;
	metadata: MlModelMetadata | null;
	training_start_date: Date | null;
	training_end_date: Date | null;
	created_at: Date | null;
	updated_at: Date | null;
}

/**
 * API response for active model endpoint
 */
export interface ActiveModelResponse {
	data: MlModel | null;
}
