import { db } from "../config/kysely.js";
import type { MlModel } from "../types/mlModel.js";

export class MlModelService {
	/**
	 * Get the active ML model for an organization
	 * Returns null if no active model exists
	 */
	async getActiveModel(organizationId: string): Promise<MlModel | null> {
		const result = await db
			.selectFrom("ml_models")
			.select([
				"id",
				"organization_id",
				"model_name",
				"external_model_id",
				"active",
				"metadata",
				"training_start_date",
				"training_end_date",
				"created_at",
				"updated_at",
			])
			.where("organization_id", "=", organizationId)
			.where("active", "=", true)
			.limit(1)
			.executeTakeFirst();

		if (!result) {
			return null;
		}

		return result as MlModel;
	}
}
