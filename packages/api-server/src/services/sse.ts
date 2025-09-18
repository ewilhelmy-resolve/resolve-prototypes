import { Response } from 'express';
import { logger, createChildLogger } from '../config/logger.js';

export interface SSEConnection {
  id: string;
  userId: string;
  organizationId: string;
  response: Response;
  lastHeartbeat: Date;
}

export interface MessageUpdateEvent {
  type: 'message_update';
  data: {
    messageId: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    responseContent?: string;
    errorMessage?: string;
    processedAt?: string;
  };
}

export interface NewMessageEvent {
  type: 'new_message';
  data: {
    messageId: string;
    content: string;
    userId: string;
    createdAt: string;
  };
}

export type SSEEvent = MessageUpdateEvent | NewMessageEvent;

export class SSEService {
  private connections: Map<string, SSEConnection> = new Map();
  private readonly sseLogger = createChildLogger('sse');
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startHeartbeat();
  }

  addConnection(connection: SSEConnection): void {
    this.connections.set(connection.id, connection);
    this.sseLogger.info({
      connectionId: connection.id,
      userId: connection.userId,
      organizationId: connection.organizationId,
      totalConnections: this.connections.size
    }, 'SSE connection added');

    // Set up connection close handlers
    connection.response.on('close', () => {
      this.removeConnection(connection.id);
    });

    connection.response.on('error', (error) => {
      this.sseLogger.error({
        connectionId: connection.id,
        userId: connection.userId,
        error: error.message
      }, 'SSE connection error');
      this.removeConnection(connection.id);
    });

    // Send initial connection event
    this.sendToConnection(connection.id, {
      type: 'connection',
      data: { status: 'connected', timestamp: new Date().toISOString() }
    });
  }

  removeConnection(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (connection) {
      this.connections.delete(connectionId);
      this.sseLogger.info({
        connectionId,
        userId: connection.userId,
        organizationId: connection.organizationId,
        totalConnections: this.connections.size
      }, 'SSE connection removed');

      try {
        if (!connection.response.headersSent) {
          connection.response.end();
        }
      } catch (error) {
        this.sseLogger.warn({
          connectionId,
          error: error instanceof Error ? error.message : String(error)
        }, 'Error closing SSE connection');
      }
    }
  }

  sendToUser(userId: string, organizationId: string, event: SSEEvent): void {
    const userConnections = Array.from(this.connections.values()).filter(
      conn => conn.userId === userId && conn.organizationId === organizationId
    );

    if (userConnections.length === 0) {
      this.sseLogger.debug({
        userId,
        organizationId,
        eventType: event.type
      }, 'No SSE connections found for user');
      return;
    }

    userConnections.forEach(connection => {
      this.sendToConnection(connection.id, event);
    });

    this.sseLogger.info({
      userId,
      organizationId,
      eventType: event.type,
      connectionCount: userConnections.length
    }, 'Event sent to user connections');
  }

  sendToOrganization(organizationId: string, event: SSEEvent): void {
    const orgConnections = Array.from(this.connections.values()).filter(
      conn => conn.organizationId === organizationId
    );

    if (orgConnections.length === 0) {
      this.sseLogger.debug({
        organizationId,
        eventType: event.type
      }, 'No SSE connections found for organization');
      return;
    }

    orgConnections.forEach(connection => {
      this.sendToConnection(connection.id, event);
    });

    this.sseLogger.info({
      organizationId,
      eventType: event.type,
      connectionCount: orgConnections.length
    }, 'Event sent to organization connections');
  }

  private sendToConnection(connectionId: string, event: any): void {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      this.sseLogger.warn({
        connectionId
      }, 'Attempted to send to non-existent connection');
      return;
    }

    try {
      const eventData = `data: ${JSON.stringify(event)}

`;
      connection.response.write(eventData);
      connection.lastHeartbeat = new Date();

      this.sseLogger.debug({
        connectionId,
        userId: connection.userId,
        eventType: event.type
      }, 'Event sent to connection');
    } catch (error) {
      this.sseLogger.error({
        connectionId,
        userId: connection.userId,
        error: error instanceof Error ? error.message : String(error)
      }, 'Failed to send SSE event');
      this.removeConnection(connectionId);
    }
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      const now = new Date();
      const staleConnections: string[] = [];

      this.connections.forEach((connection, connectionId) => {
        const timeSinceLastHeartbeat = now.getTime() - connection.lastHeartbeat.getTime();

        // Remove connections that haven't been active for 5 minutes
        if (timeSinceLastHeartbeat > 5 * 60 * 1000) {
          staleConnections.push(connectionId);
        } else {
          // Send heartbeat to active connections
          this.sendToConnection(connectionId, {
            type: 'heartbeat',
            data: { timestamp: now.toISOString() }
          });
        }
      });

      // Clean up stale connections
      staleConnections.forEach(connectionId => {
        this.sseLogger.info({ connectionId }, 'Removing stale SSE connection');
        this.removeConnection(connectionId);
      });

      if (this.connections.size > 0) {
        this.sseLogger.debug({
          activeConnections: this.connections.size,
          staleConnectionsRemoved: staleConnections.length
        }, 'SSE heartbeat completed');
      }
    }, 30000); // Heartbeat every 30 seconds
  }

  getConnectionStats(): {
    totalConnections: number;
    connectionsByOrg: Record<string, number>;
    connectionsByUser: Record<string, number>;
  } {
    const connectionsByOrg: Record<string, number> = {};
    const connectionsByUser: Record<string, number> = {};

    this.connections.forEach(connection => {
      connectionsByOrg[connection.organizationId] = (connectionsByOrg[connection.organizationId] || 0) + 1;
      connectionsByUser[connection.userId] = (connectionsByUser[connection.userId] || 0) + 1;
    });

    return {
      totalConnections: this.connections.size,
      connectionsByOrg,
      connectionsByUser
    };
  }

  shutdown(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    // Close all connections gracefully
    this.connections.forEach((connection, connectionId) => {
      this.sendToConnection(connectionId, {
        type: 'server_shutdown',
        data: { message: 'Server is shutting down', timestamp: new Date().toISOString() }
      });
      this.removeConnection(connectionId);
    });

    this.sseLogger.info('SSE service shutdown completed');
  }
}

// Singleton instance
let sseService: SSEService | null = null;

export const getSSEService = (): SSEService => {
  if (!sseService) {
    sseService = new SSEService();
  }
  return sseService;
};