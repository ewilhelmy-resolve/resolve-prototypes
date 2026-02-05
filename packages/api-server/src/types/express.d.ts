import { Logger } from 'pino';
import { Request } from 'express';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        activeOrganizationId: string | null; // Can be null for JWT-only auth
      };
      session?: {
        sessionId: string;
      };
      log?: Logger;
    }
  }
}

// Type for authenticated requests where user and session are guaranteed to exist
export interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email: string;
    activeOrganizationId: string;
  };
  session: {
    sessionId: string;
  };
}