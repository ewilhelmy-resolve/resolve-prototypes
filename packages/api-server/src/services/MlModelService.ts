import { pool } from "../config/database.js";
import type { MlModel } from "../types/mlModel.js";

export class MlModelService {
	/**
	 * Get the active ML model for an organization
	 * Returns null if no active model exists
	 */
	async getActiveModel(organizationId: string): Promise<MlModel | null> {
		const result = await pool.query<MlModel>(
			`SELECT
				id,
				organization_id,
				model_name,
				external_model_id,
				active,
				metadata,
				training_start_date,
				training_end_date,
				created_at,
				updated_at
			FROM ml_models
			WHERE organization_id = $1 AND active = true
			LIMIT 1`,
			[organizationId],
		);

		if (result.rows.length === 0) {
			return null;
		}

		return result.rows[0];
	}
}
