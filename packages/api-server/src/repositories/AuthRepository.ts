import type { Insertable } from "kysely";
import { db } from "../config/kysely.js";
import type { PendingUsers } from "../types/database.js";

export class AuthRepository {
	/**
	 * Check if user is active member of organization
	 * Used by authenticateUser middleware
	 */
	async getOrgMembershipStatus(
		organizationId: string,
		userId: string,
	): Promise<{ isActive: boolean } | null> {
		const result = await db
			.selectFrom("organization_members")
			.select("is_active")
			.where("organization_id", "=", organizationId)
			.where("user_id", "=", userId)
			.executeTakeFirst();

		if (!result) {
			return null;
		}

		return { isActive: result.is_active };
	}

	/**
	 * Get user's role in organization
	 * Used by requireRole middleware
	 */
	async getUserRole(
		organizationId: string,
		userId: string,
	): Promise<string | null> {
		const result = await db
			.selectFrom("organization_members")
			.select("role")
			.where("organization_id", "=", organizationId)
			.where("user_id", "=", userId)
			.executeTakeFirst();

		return result?.role ?? null;
	}

	// ===== User Profile Queries =====

	/**
	 * Check if user exists by email
	 */
	async getUserByEmail(email: string): Promise<{ userId: string } | null> {
		const result = await db
			.selectFrom("user_profiles")
			.select("user_id")
			.where("email", "=", email)
			.executeTakeFirst();

		return result ? { userId: result.user_id } : null;
	}

	/**
	 * Get user profile by user ID
	 */
	async getUserProfile(userId: string) {
		return await db
			.selectFrom("user_profiles")
			.select([
				"user_id",
				"email",
				"first_name",
				"last_name",
				"active_organization_id",
			])
			.where("user_id", "=", userId)
			.executeTakeFirst();
	}

	/**
	 * Update user profile (dynamic fields)
	 */
	async updateUserProfile(
		userId: string,
		data: { firstName?: string; lastName?: string },
	) {
		let query = db.updateTable("user_profiles").where("user_id", "=", userId);

		if (data.firstName !== undefined) {
			query = query.set("first_name", data.firstName);
		}
		if (data.lastName !== undefined) {
			query = query.set("last_name", data.lastName);
		}

		return await query
			.returning(["user_id", "email", "first_name", "last_name"])
			.executeTakeFirst();
	}

	// ===== Pending User Queries =====

	/**
	 * Check if pending user exists by email
	 */
	async getPendingUserByEmail(email: string) {
		return await db
			.selectFrom("pending_users")
			.select(["id", "first_name", "last_name", "company"])
			.where("email", "=", email)
			.executeTakeFirst();
	}

	/**
	 * Check if pending user exists (id only)
	 */
	async pendingUserExistsByEmail(
		email: string,
	): Promise<{ id: string } | null> {
		const result = await db
			.selectFrom("pending_users")
			.select("id")
			.where("email", "=", email)
			.executeTakeFirst();

		return result ? { id: result.id } : null;
	}

	/**
	 * Delete pending user by email
	 */
	async deletePendingUserByEmail(email: string): Promise<void> {
		await db.deleteFrom("pending_users").where("email", "=", email).execute();
	}

	/**
	 * Delete pending user by ID
	 */
	async deletePendingUserById(id: string): Promise<void> {
		await db.deleteFrom("pending_users").where("id", "=", id).execute();
	}

	/**
	 * Create pending user
	 */
	async createPendingUser(data: Insertable<PendingUsers>): Promise<string> {
		const result = await db
			.insertInto("pending_users")
			.values(data)
			.returning("id")
			.executeTakeFirstOrThrow();

		return result.id;
	}

	/**
	 * Update pending user verification token (only if status matches)
	 */
	async updatePendingUserToken(
		email: string,
		status: string,
		verificationToken: string,
		tokenExpiresAt: Date,
	): Promise<{ id: string } | null> {
		const result = await db
			.updateTable("pending_users")
			.set({
				verification_token: verificationToken,
				token_expires_at: tokenExpiresAt,
			})
			.where("email", "=", email)
			.where("status", "=", status)
			.returning("id")
			.executeTakeFirst();

		return result ? { id: result.id } : null;
	}

	/**
	 * Find pending user by verification token
	 */
	async getPendingUserByToken(token: string) {
		return await db
			.selectFrom("pending_users")
			.select(["id", "email", "first_name", "last_name", "token_expires_at"])
			.where("verification_token", "=", token)
			.executeTakeFirst();
	}

	/**
	 * Update pending user status
	 */
	async updatePendingUserStatus(id: string, status: string): Promise<void> {
		await db
			.updateTable("pending_users")
			.set({ status })
			.where("id", "=", id)
			.execute();
	}
}

// Singleton instance
export const authRepository = new AuthRepository();
