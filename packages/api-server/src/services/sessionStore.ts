import { randomBytes } from 'crypto';

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
}

export interface CreateSessionData {
  userId: string;
  organizationId: string;
  userEmail: string;
  firstName?: string;
  lastName?: string;
  sessionDurationMs?: number; // Default: 24 hours
}

export interface SessionStore {
  createSession(data: CreateSessionData): Promise<Session>;
  getSession(sessionId: string): Promise<Session | null>;
  updateSession(sessionId: string, updates: Partial<Session>): Promise<Session | null>;
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
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredSessions();
    }, 5 * 60 * 1000);
  }

  async createSession(data: CreateSessionData): Promise<Session> {
    const sessionId = this.generateSessionId();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + (data.sessionDurationMs || 24 * 60 * 60 * 1000)); // 24 hours default

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

  async updateSession(sessionId: string, updates: Partial<Session>): Promise<Session | null> {
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
    return randomBytes(32).toString('hex');
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
    console.log('Using in-memory session store');
  }

  return sessionStore;
}

// For graceful shutdown
export function destroySessionStore(): void {
  if (sessionStore && sessionStore instanceof InMemorySessionStore) {
    sessionStore.destroy();
  }
}