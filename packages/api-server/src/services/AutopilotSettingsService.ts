import { db } from "../config/kysely.js";

export interface AutopilotSettingsRow {
	id: string;
	organization_id: string;
	cost_per_ticket: number;
	avg_time_per_ticket_minutes: number;
	updated_by: string | null;
	created_at: Date;
	updated_at: Date;
}

export interface UpdateAutopilotSettingsData {
	cost_per_ticket?: number;
	avg_time_per_ticket_minutes?: number;
}

export class AutopilotSettingsService {
	/**
	 * Get autopilot settings for an org, lazily creating with defaults if missing.
	 * Uses INSERT ... ON CONFLICT DO NOTHING + SELECT pattern.
	 */
	async getOrCreate(organizationId: string): Promise<AutopilotSettingsRow> {
		// Attempt insert with defaults (no-op if exists)
		await db
			.insertInto("autopilot_settings")
			.values({ organization_id: organizationId })
			.onConflict((oc) => oc.column("organization_id").doNothing())
			.execute();

		const row = await db
			.selectFrom("autopilot_settings")
			.select([
				"id",
				"organization_id",
				"cost_per_ticket",
				"avg_time_per_ticket_minutes",
				"updated_by",
				"created_at",
				"updated_at",
			])
			.where("organization_id", "=", organizationId)
			.executeTakeFirstOrThrow();

		return {
			...row,
			cost_per_ticket: Number(row.cost_per_ticket),
			created_at: row.created_at as unknown as Date,
			updated_at: row.updated_at as unknown as Date,
		};
	}

	/**
	 * Update autopilot settings for an org. Only provided fields are updated.
	 * Lazily creates the row if it doesn't exist yet.
	 */
	async update(
		organizationId: string,
		data: UpdateAutopilotSettingsData,
		userId: string,
	): Promise<AutopilotSettingsRow> {
		// Ensure row exists first
		await db
			.insertInto("autopilot_settings")
			.values({ organization_id: organizationId })
			.onConflict((oc) => oc.column("organization_id").doNothing())
			.execute();

		// Build update
		const updateValues: Record<string, unknown> = {
			updated_by: userId,
		};

		if (data.cost_per_ticket !== undefined) {
			updateValues.cost_per_ticket = data.cost_per_ticket;
		}
		if (data.avg_time_per_ticket_minutes !== undefined) {
			updateValues.avg_time_per_ticket_minutes =
				data.avg_time_per_ticket_minutes;
		}

		await db
			.updateTable("autopilot_settings")
			.set(updateValues)
			.where("organization_id", "=", organizationId)
			.execute();

		// Return updated row
		const row = await db
			.selectFrom("autopilot_settings")
			.select([
				"id",
				"organization_id",
				"cost_per_ticket",
				"avg_time_per_ticket_minutes",
				"updated_by",
				"created_at",
				"updated_at",
			])
			.where("organization_id", "=", organizationId)
			.executeTakeFirstOrThrow();

		return {
			...row,
			cost_per_ticket: Number(row.cost_per_ticket),
			created_at: row.created_at as unknown as Date,
			updated_at: row.updated_at as unknown as Date,
		};
	}
}
