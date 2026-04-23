import * as jose from "jose";
import { sql } from "kysely";
import { db } from "../config/kysely.js";
import { logger } from "../config/logger.js";
import {
	type CreateSessionData,
	getSessionStore,
	type Session,
} from "./sessionStore.js";

// Keycloak configuration from environment variables (same as middleware)
const KEYCLOAK_URL = process.env.KEYCLOAK_URL || "http://localhost:8080";
const KEYCLOAK_REALM = process.env.KEYCLOAK_REALM || "rita-chat-realm";
const KEYCLOAK_ISSUER =
	process.env.KEYCLOAK_ISSUER || `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}`;
const JWKS = jose.createRemoteJWKSet(
	new URL(
		`${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/certs`,
	),
);

const DEFAULT_SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

export class SessionService {
	private sessionStore = getSessionStore();

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

			// Query user_profiles to get first_name and last_name from database
			const userProfile = await db
				.selectFrom("user_profiles")
				.select(["first_name", "last_name"])
				.where("user_id", "=", user.id)
				.executeTakeFirst();

			const sessionData: CreateSessionData = {
				userId: user.id,
				organizationId: user.activeOrganizationId,
				userEmail: user.email,
				firstName: userProfile?.first_name || undefined,
				lastName: userProfile?.last_name || undefined,
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

	public async findOrCreateUser(
		tokenPayload: jose.JWTPayload,
	): Promise<{ id: string; email: string; activeOrganizationId: string }> {
		// biome-ignore lint/style/noNonNullAssertion: must be non-null
		const keycloakId = tokenPayload.sub!;
		const email = tokenPayload.email as string;

		// Extract names from Keycloak JWT token (single source of truth)
		const firstName = (tokenPayload.given_name as string) || null;
		const lastName = (tokenPayload.family_name as string) || null;

		const existingUser = await db
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
			const user = existingUser;

			// Backfill only missing names — never overwrite existing values
			const nameUpdates: Record<string, string> = {};
			if (!user.first_name && firstName) {
				nameUpdates.first_name = firstName;
			}
			if (!user.last_name && lastName) {
				nameUpdates.last_name = lastName;
			}
			if (Object.keys(nameUpdates).length > 0) {
				await db
					.updateTable("user_profiles")
					.set(nameUpdates)
					.where("user_id", "=", user.user_id)
					.execute();

				logger.info(
					{
						userId: user.user_id,
						email: user.email,
						backfilledFields: Object.keys(nameUpdates),
					},
					"Backfilled user names from Keycloak token",
				);
			}

			if (!user.active_organization_id) {
				throw new Error(`User ${user.user_id} has no active organization`);
			}

			return {
				id: user.user_id,
				email: user.email as string,
				activeOrganizationId: user.active_organization_id,
			};
		}

		logger.info(
			{ keycloakId, email },
			"New user detected. Starting provisioning...",
		);

		// Check pending_users for company name (signup flow only)
		const pendingUserResult = await db
			.selectFrom("pending_users")
			.select("company")
			.where("email", "=", email)
			.orderBy("created_at", "desc")
			.limit(1)
			.executeTakeFirst();

		const company = pendingUserResult?.company ?? null;

		// Check for accepted invitations FIRST (before creating anything)
		const invitations = await db
			.selectFrom("pending_invitations")
			.select(["id", "organization_id"])
			.where("email", "=", email)
			.where("status", "=", "accepted")
			.orderBy("created_at", "asc")
			.execute();

		// Log data sources for debugging
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

		try {
			return await db.transaction().execute(async (trx) => {
				// Generate UUID for new user and insert directly into user_profiles with names
				const newUserResult = await trx
					.insertInto("user_profiles")
					.values({
						user_id: sql`gen_random_uuid()`,
						email,
						keycloak_id: keycloakId,
						first_name: firstName,
						last_name: lastName,
					})
					.returning("user_id")
					.executeTakeFirstOrThrow();
				const newUserId = newUserResult.user_id;

				let activeOrganizationId: string;

				if (invitations.length > 0) {
					// User was invited - add to invited org(s), DON'T create personal org
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

					// Set first invited org as active
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
					// Normal signup flow - create personal organization
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

				return {
					id: newUserId,
					email: email,
					activeOrganizationId: activeOrganizationId,
				};
			});
		} catch (error) {
			logger.error({ error, keycloakId }, "Failed to provision new user");
			throw new Error("Failed to provision new user.");
		}
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

	/**
	 * Cookie names are namespaced to prevent cross-context clobbering (RG-838).
	 * Rita Go and iframe run on the same domain — without separate cookie names,
	 * opening an iframe tab overwrites the Rita Go session cookie.
	 */
	static readonly COOKIE_NAME = "rita_session";
	static readonly IFRAME_COOKIE_NAME = "rita_iframe_session";

	generateSessionCookie(
		sessionId: string,
		sessionDurationMs?: number,
		cookieName: string = SessionService.COOKIE_NAME,
	): string {
		const isProduction = process.env.NODE_ENV === "production";
		const domain = process.env.COOKIE_DOMAIN || undefined;
		const durationMs = sessionDurationMs || DEFAULT_SESSION_DURATION_MS;
		const maxAgeSeconds = Math.floor(durationMs / 1000);

		const cookieOptions = [
			`${cookieName}=${sessionId}`,
			`Max-Age=${maxAgeSeconds}`,
			"Path=/",
			"HttpOnly",
			"SameSite=Lax",
		];
		if (isProduction) cookieOptions.push("Secure");
		if (domain) cookieOptions.push(`Domain=${domain}`);
		return cookieOptions.join("; ");
	}

	generateDestroySessionCookie(
		cookieName: string = SessionService.COOKIE_NAME,
	): string {
		const isProduction = process.env.NODE_ENV === "production";
		const domain = process.env.COOKIE_DOMAIN || undefined;
		const cookieOptions = [
			`${cookieName}=`,
			"Max-Age=0",
			"Path=/",
			"HttpOnly",
			"SameSite=Lax",
		];
		if (isProduction) cookieOptions.push("Secure");
		if (domain) cookieOptions.push(`Domain=${domain}`);
		return cookieOptions.join("; ");
	}

	parseSessionIdFromCookie(
		cookieHeader: string | undefined,
		cookieName: string = SessionService.COOKIE_NAME,
	): string | null {
		if (!cookieHeader) return null;
		const regex = new RegExp(`${cookieName}=([^;]+)`);
		const match = cookieHeader.match(regex);
		return match ? match[1] : null;
	}

	async cleanupExpiredSessions(): Promise<number> {
		return this.sessionStore.cleanupExpiredSessions();
	}
}

let sessionService: SessionService;
export function getSessionService(): SessionService {
	if (!sessionService) {
		sessionService = new SessionService();
	}
	return sessionService;
}
