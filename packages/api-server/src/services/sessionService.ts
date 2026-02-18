import * as jose from "jose";
import { type Kysely, sql, type Transaction } from "kysely";
import { db } from "../config/kysely.js";
import { logger } from "../config/logger.js";
import type { DB } from "../types/database.js";
import {
	type CreateSessionData,
	destroySessionStore,
	getSessionStore,
	type Session,
	type SessionStore,
} from "./sessionStore.js";

export class UserProvisioningError extends Error {
	public readonly cause: unknown;
	constructor(message: string, cause: unknown) {
		super(message);
		this.name = "UserProvisioningError";
		this.cause = cause;
	}
}

// Keycloak configuration from environment variables (same as middleware)
const KEYCLOAK_URL = process.env.KEYCLOAK_URL || "http://localhost:8080";
const KEYCLOAK_REALM = process.env.KEYCLOAK_REALM || "rita-chat-realm";
const KEYCLOAK_ISSUER =
	process.env.KEYCLOAK_ISSUER || `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}`;
// jose handles JWKS caching and auto-refresh internally.
// Keys cached in memory; refreshed when unknown kid encountered or cache TTL expires.
const JWKS = jose.createRemoteJWKSet(
	new URL(
		`${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/certs`,
	),
);

export class SessionService {
	private sessionStore: SessionStore;
	private db: Kysely<DB>;

	constructor(deps?: { sessionStore?: SessionStore; db?: Kysely<DB> }) {
		this.sessionStore = deps?.sessionStore ?? getSessionStore();
		this.db = deps?.db ?? db;
	}

	/**
	 * Authenticate Keycloak token, provision user if first login, create session.
	 * Flow: JWT verify → findOrCreateUser → session + cookie
	 */
	async createSessionFromKeycloak(
		keycloakAccessToken: string,
		sessionDurationMs?: number,
	): Promise<{ session: Session; cookie: string }> {
		try {
			const { payload } = await jose.jwtVerify(keycloakAccessToken, JWKS, {
				issuer: KEYCLOAK_ISSUER,
			});

			if (!payload.sub || !payload.email) {
				throw new Error(
					"Invalid Keycloak token payload. Missing sub or email.",
				);
			}

			const user = await this.findOrCreateUser(payload);

			const sessionData: CreateSessionData = {
				userId: user.id,
				organizationId: user.activeOrganizationId,
				userEmail: user.email,
				firstName: user.firstName || undefined,
				lastName: user.lastName || undefined,
				sessionDurationMs,
			};

			const session = await this.sessionStore.createSession(sessionData);
			const cookie = this.generateSessionCookie(
				session.sessionId,
				sessionDurationMs,
			);

			logger.info(
				{ sessionId: session.sessionId, userId: user.id },
				"Session created successfully from Keycloak token",
			);

			return { session, cookie };
		} catch (error) {
			logger.error({ error }, "Failed to create session from Keycloak token");
			throw error;
		}
	}

	public async findOrCreateUser(tokenPayload: jose.JWTPayload): Promise<{
		id: string;
		email: string;
		activeOrganizationId: string;
		firstName: string | null;
		lastName: string | null;
	}> {
		// biome-ignore lint/style/noNonNullAssertion: must be non-null
		const keycloakId = tokenPayload.sub!;
		const email = tokenPayload.email as string; // validated non-null on L49
		const firstName = (tokenPayload.given_name as string) || null;
		const lastName = (tokenPayload.family_name as string) || null;

		const existingUser = await this.db
			.selectFrom("user_profiles")
			.select([
				"user_id",
				"active_organization_id",
				"email",
				"first_name",
				"last_name",
			])
			.where("keycloak_id", "=", keycloakId)
			.executeTakeFirst();

		if (existingUser) {
			await this.backfillUserNames(this.db, existingUser, firstName, lastName);
			if (!existingUser.active_organization_id) {
				throw new Error("User has no active organization");
			}
			return {
				id: existingUser.user_id,
				// biome-ignore lint/style/noNonNullAssertion: email is NOT NULL in DB
				email: existingUser.email!,
				activeOrganizationId: existingUser.active_organization_id,
				firstName: existingUser.first_name ?? firstName ?? null,
				lastName: existingUser.last_name ?? lastName ?? null,
			};
		}

		logger.info(
			{ keycloakId, email },
			"New user detected. Starting provisioning...",
		);

		try {
			return await this.db.transaction().execute((trx) =>
				this.provisionNewUser(trx, {
					email,
					keycloakId,
					firstName,
					lastName,
				}),
			);
		} catch (error) {
			logger.error({ error, keycloakId }, "Failed to provision new user");
			throw new UserProvisioningError("Failed to provision new user.", error);
		}
	}

	private async backfillUserNames(
		executor: Kysely<DB> | Transaction<DB>,
		user: {
			user_id: string;
			email: string | null;
			first_name: string | null;
			last_name: string | null;
		},
		firstName: string | null,
		lastName: string | null,
	): Promise<void> {
		if (user.first_name && user.last_name) return;

		const updates: Record<string, string> = {};
		if (!user.first_name && firstName) updates.first_name = firstName;
		if (!user.last_name && lastName) updates.last_name = lastName;
		if (Object.keys(updates).length === 0) return;

		await executor
			.updateTable("user_profiles")
			.set(updates)
			.where("user_id", "=", user.user_id)
			.execute();

		logger.info(
			{
				userId: user.user_id,
				email: user.email,
				hadFirstName: !!user.first_name,
				hadLastName: !!user.last_name,
			},
			"Backfilled user names from Keycloak token",
		);
	}

	private async provisionNewUser(
		trx: Transaction<DB>,
		params: {
			email: string;
			keycloakId: string;
			firstName: string | null;
			lastName: string | null;
		},
	): Promise<{
		id: string;
		email: string;
		activeOrganizationId: string;
		firstName: string | null;
		lastName: string | null;
	}> {
		const { email, keycloakId, firstName, lastName } = params;

		// Read inside transaction to prevent stale data from concurrent changes
		const pendingUserResult = await trx
			.selectFrom("pending_users")
			.select("company")
			.where("email", "=", email)
			.orderBy("created_at", "desc")
			.limit(1)
			.executeTakeFirst();
		const company = pendingUserResult?.company ?? null;

		const invitations = await trx
			.selectFrom("pending_invitations")
			.select(["id", "organization_id"])
			.where("email", "=", email)
			.where("status", "=", "accepted")
			.orderBy("created_at", "asc")
			.execute();

		logger.debug(
			{
				email,
				hasNames: !!(firstName && lastName),
				hasCompany: !!company,
				source: {
					names: "keycloak_jwt",
					company: company ? "pending_users" : "none",
				},
			},
			"User provisioning data sources",
		);

		// ON CONFLICT handles concurrent keycloak_id race
		const newUserResult = await trx
			.insertInto("user_profiles")
			.values({
				user_id: sql`gen_random_uuid()`,
				email,
				keycloak_id: keycloakId,
				first_name: firstName,
				last_name: lastName,
			})
			.onConflict((oc) => oc.column("keycloak_id").doNothing())
			.returning("user_id")
			.executeTakeFirst();

		// Lost race — another request already created this user
		if (!newUserResult) {
			const existing = await trx
				.selectFrom("user_profiles")
				.select([
					"user_id",
					"email",
					"active_organization_id",
					"first_name",
					"last_name",
				])
				.where("keycloak_id", "=", keycloakId)
				.executeTakeFirstOrThrow();

			if (!existing.active_organization_id) {
				throw new Error(
					"Race-lost user has no active_organization_id — winner transaction may not have committed yet",
				);
			}

			return {
				id: existing.user_id,
				// biome-ignore lint/style/noNonNullAssertion: email is NOT NULL in DB
				email: existing.email!,
				activeOrganizationId: existing.active_organization_id,
				firstName: existing.first_name ?? null,
				lastName: existing.last_name ?? null,
			};
		}

		const newUserId = newUserResult.user_id;
		let activeOrganizationId: string;

		if (invitations.length > 0) {
			logger.info(
				{ userId: newUserId, email, invitationCount: invitations.length },
				"User has accepted invitations. Adding to invited organization(s).",
			);

			for (const invitation of invitations) {
				await trx
					.insertInto("organization_members")
					.values({
						organization_id: invitation.organization_id,
						user_id: newUserId,
						role: "user",
					})
					.onConflict((oc) =>
						oc.columns(["organization_id", "user_id"]).doNothing(),
					)
					.execute();
			}

			activeOrganizationId = invitations[0].organization_id;
			await trx
				.updateTable("user_profiles")
				.set({ active_organization_id: activeOrganizationId })
				.where("user_id", "=", newUserId)
				.execute();

			logger.info(
				{ userId: newUserId, organizationId: activeOrganizationId },
				"Invited user provisioned successfully (no personal org created)",
			);
		} else {
			const organizationName = company || `${email}'s Organization`;
			const newOrgResult = await trx
				.insertInto("organizations")
				.values({ name: organizationName })
				.returning("id")
				.executeTakeFirstOrThrow();
			activeOrganizationId = newOrgResult.id;

			await trx
				.insertInto("organization_members")
				.values({
					organization_id: activeOrganizationId,
					user_id: newUserId,
					role: "owner",
				})
				.execute();

			await trx
				.updateTable("user_profiles")
				.set({ active_organization_id: activeOrganizationId })
				.where("user_id", "=", newUserId)
				.execute();

			logger.info(
				{ userId: newUserId, organizationId: activeOrganizationId },
				"New user provisioned successfully with personal organization",
			);
		}

		// Cleanup: Delete verified pending_users record (company name already used)
		if (company) {
			await trx
				.deleteFrom("pending_users")
				.where("email", "=", email)
				.where("status", "=", "verified")
				.execute();
			logger.debug(
				{ email },
				"Cleaned up verified pending_users record after user provisioning",
			);
		}

		return { id: newUserId, email, activeOrganizationId, firstName, lastName };
	}

	async getValidSession(sessionId: string): Promise<Session | null> {
		const session = await this.sessionStore.getSession(sessionId);
		if (!session) return null;
		await this.sessionStore.refreshSessionAccess(sessionId);
		return session;
	}

	async updateSession(
		sessionId: string,
		updates: Partial<Session>,
	): Promise<Session | null> {
		return this.sessionStore.updateSession(sessionId, updates);
	}

	async destroySession(sessionId: string): Promise<boolean> {
		const deleted = await this.sessionStore.deleteSession(sessionId);
		if (deleted) logger.info({ sessionId }, "Session destroyed");
		return deleted;
	}

	async destroyUserSessions(userId: string): Promise<number> {
		const deletedCount = await this.sessionStore.deleteUserSessions(userId);
		logger.info({ userId, deletedCount }, "All user sessions destroyed");
		return deletedCount;
	}

	generateSessionCookie(sessionId: string, maxAgeMs?: number): string {
		const isProduction = process.env.NODE_ENV === "production";
		const domain = process.env.COOKIE_DOMAIN || undefined;
		// Convert ms to seconds for Set-Cookie Max-Age (RFC 6265)
		const maxAgeSec = Math.floor((maxAgeMs ?? 24 * 60 * 60 * 1000) / 1000);

		const cookieOptions = [
			`rita_session=${sessionId}`,
			`Max-Age=${maxAgeSec}`,
			"Path=/",
			"HttpOnly",
			"SameSite=Lax",
		];
		if (isProduction) cookieOptions.push("Secure");
		if (domain) cookieOptions.push(`Domain=${domain}`);
		return cookieOptions.join("; ");
	}

	generateDestroySessionCookie(): string {
		const isProduction = process.env.NODE_ENV === "production";
		const domain = process.env.COOKIE_DOMAIN || undefined;
		const cookieOptions = [
			"rita_session=",
			"Max-Age=0",
			"Path=/",
			"HttpOnly",
			"SameSite=Lax",
		];
		if (isProduction) cookieOptions.push("Secure");
		if (domain) cookieOptions.push(`Domain=${domain}`);
		return cookieOptions.join("; ");
	}

	parseSessionIdFromCookie(cookieHeader: string | undefined): string | null {
		if (!cookieHeader) return null;
		const match = cookieHeader.match(/rita_session=([^;]+)/);
		return match ? match[1] : null;
	}

	async cleanupExpiredSessions(): Promise<number> {
		return this.sessionStore.cleanupExpiredSessions();
	}
}

let sessionService: SessionService | undefined;
export function getSessionService(): SessionService {
	if (!sessionService) {
		sessionService = new SessionService();
	}
	return sessionService;
}

export function destroySessionService(): void {
	sessionService = undefined;
	destroySessionStore();
}
