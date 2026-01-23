import { randomBytes } from "crypto";

/**
 * Iframe webhook config from Valkey payload
 * Used for tenant-specific webhook auth in embedded iframe chat
 */
/**
 * Valkey payload config for iframe chat
 * Platform stores in camelCase (tenantId, userGuid, uiConfig)
 * Webhook sends snake_case copies for RabbitMQ routing (tenant_id, user_id)
 *
 * REQUIRED - core identity:
 *   tenantId, userGuid
 *
 * OPTIONAL - conversation handling:
 *   conversationId (omit for new, provide to resume)
 *
 * REQUIRED for webhook execution (Actions API auth):
 *   actionsApiBaseUrl, clientId, clientKey
 *
 * Pass-through to Actions API (not used by Rita):
 *   accessToken, refreshToken, tokenExpiry, tabInstanceId, chatSessionId
 *
 * OPTIONAL - metadata:
 *   tenantName (defaults to "Jarvis Tenant {id}")
 *   context (arbitrary metadata for Actions API)
 *   uiConfig (custom UI text)
 */
export interface IframeWebhookConfig {
	// REQUIRED - core identity
	tenantId: string;
	userGuid: string;

	// OPTIONAL - conversation handling (omit for new, provide to resume)
	conversationId?: string;

	// REQUIRED for webhook execution (Actions API auth)
	// Optional for iframe chat without webhooks
	actionsApiBaseUrl?: string;
	clientId?: string;
	clientKey?: string;

	// Pass-through to Actions API (not used by Rita)
	accessToken?: string;
	refreshToken?: string;
	tabInstanceId?: string;
	chatSessionId?: string;
	tokenExpiry?: number;

	// OPTIONAL - metadata
	tenantName?: string;
	/** Activity context from Jarvis (activityId used for conversation mapping) */
	context?: {
		designer?: string;
		activityId?: number;
		activityName?: string;
		[key: string]: unknown;
	};

	/** OPTIONAL - Custom UI text from Valkey ui_config object */
	uiConfig?: {
		/** Custom title (e.g., "Ask Workflow Designer" instead of "Ask RITA") */
		titleText?: string;
		/** Custom welcome/description text */
		welcomeText?: string;
		/** Custom input placeholder (e.g., "Describe your workflow...") */
		placeholderText?: string;
	};
}

export interface Session {
	sessionId: string;
	userId: string;
	organizationId: string;
	userEmail: string;
	firstName?: string;
	lastName?: string;
	expiresAt: Date;
	createdAt: Date;
	lastAccessedAt: Date;
	/** Iframe embed webhook config - only present for iframe sessions with hashkey */
	iframeWebhookConfig?: IframeWebhookConfig;
	/** Conversation ID for iframe sessions - used to route messages back */
	conversationId?: string;
	/** True if session created via iframe embed (determines webhook source) */
	isIframeSession?: boolean;
}

export interface CreateSessionData {
	userId: string;
	organizationId: string;
	userEmail: string;
	firstName?: string;
	lastName?: string;
	sessionDurationMs?: number; // Default: 24 hours
	iframeWebhookConfig?: IframeWebhookConfig;
	isIframeSession?: boolean;
}

export interface SessionStore {
	createSession(data: CreateSessionData): Promise<Session>;
	getSession(sessionId: string): Promise<Session | null>;
	updateSession(
		sessionId: string,
		updates: Partial<Session>,
	): Promise<Session | null>;
	deleteSession(sessionId: string): Promise<boolean>;
	deleteUserSessions(userId: string): Promise<number>;
	refreshSessionAccess(sessionId: string): Promise<Session | null>;
	cleanupExpiredSessions(): Promise<number>;
}

// In-memory session store for development
class InMemorySessionStore implements SessionStore {
	private sessions = new Map<string, Session>();
	private cleanupInterval: NodeJS.Timeout;

	constructor() {
		// Cleanup expired sessions every 5 minutes
		this.cleanupInterval = setInterval(
			() => {
				this.cleanupExpiredSessions();
			},
			5 * 60 * 1000,
		);
	}

	async createSession(data: CreateSessionData): Promise<Session> {
		const sessionId = this.generateSessionId();
		const now = new Date();
		const expiresAt = new Date(
			now.getTime() + (data.sessionDurationMs || 24 * 60 * 60 * 1000),
		); // 24 hours default

		const session: Session = {
			sessionId,
			userId: data.userId,
			organizationId: data.organizationId,
			userEmail: data.userEmail,
			firstName: data.firstName,
			lastName: data.lastName,
			expiresAt,
			createdAt: now,
			lastAccessedAt: now,
			iframeWebhookConfig: data.iframeWebhookConfig,
			isIframeSession: data.isIframeSession,
		};

		this.sessions.set(sessionId, session);
		return session;
	}

	async getSession(sessionId: string): Promise<Session | null> {
		const session = this.sessions.get(sessionId);

		if (!session) {
			return null;
		}

		// Check if session is expired
		if (session.expiresAt < new Date()) {
			this.sessions.delete(sessionId);
			return null;
		}

		return session;
	}

	async updateSession(
		sessionId: string,
		updates: Partial<Session>,
	): Promise<Session | null> {
		const session = await this.getSession(sessionId);

		if (!session) {
			return null;
		}

		const updatedSession = {
			...session,
			...updates,
			sessionId, // Ensure sessionId cannot be changed
			lastAccessedAt: new Date(),
		};

		this.sessions.set(sessionId, updatedSession);
		return updatedSession;
	}

	async deleteSession(sessionId: string): Promise<boolean> {
		return this.sessions.delete(sessionId);
	}

	async deleteUserSessions(userId: string): Promise<number> {
		let deletedCount = 0;

		for (const [sessionId, session] of this.sessions.entries()) {
			if (session.userId === userId) {
				this.sessions.delete(sessionId);
				deletedCount++;
			}
		}

		return deletedCount;
	}

	async refreshSessionAccess(sessionId: string): Promise<Session | null> {
		return this.updateSession(sessionId, {
			lastAccessedAt: new Date(),
		});
	}

	async cleanupExpiredSessions(): Promise<number> {
		const now = new Date();
		let cleanedCount = 0;

		for (const [sessionId, session] of this.sessions.entries()) {
			if (session.expiresAt < now) {
				this.sessions.delete(sessionId);
				cleanedCount++;
			}
		}

		if (cleanedCount > 0) {
			console.log(`Cleaned up ${cleanedCount} expired sessions`);
		}

		return cleanedCount;
	}

	private generateSessionId(): string {
		return randomBytes(32).toString("hex");
	}

	// For testing/debugging
	getSessionCount(): number {
		return this.sessions.size;
	}

	// Graceful shutdown
	destroy(): void {
		if (this.cleanupInterval) {
			clearInterval(this.cleanupInterval);
		}
		this.sessions.clear();
	}
}

// Session store factory
let sessionStore: SessionStore;

export function getSessionStore(): SessionStore {
	if (!sessionStore) {
		sessionStore = new InMemorySessionStore();
		console.log("Using in-memory session store");
	}

	return sessionStore;
}

// For graceful shutdown
export function destroySessionStore(): void {
	if (sessionStore && sessionStore instanceof InMemorySessionStore) {
		sessionStore.destroy();
	}
}
