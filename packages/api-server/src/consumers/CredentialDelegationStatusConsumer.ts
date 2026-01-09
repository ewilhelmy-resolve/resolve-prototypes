import type { Channel, ConsumeMessage } from 'amqplib';
import { logError, PerformanceTimer, queueLogger } from '../config/logger.js';
import { pool } from '../config/database.js';
import type { DelegationStatus } from '../types/credentialDelegation.js';

/**
 * Message structure from mock-service credential verification
 */
interface CredentialDelegationStatusMessage {
  type: 'credential_delegation_verification';
  delegation_id: string;
  tenant_id: string;
  status: 'verified' | 'failed';
  error: string | null;
  timestamp: string;
}

/**
 * RabbitMQ Consumer for Credential Delegation Status Updates
 * Listens for verification results from external ITSM credential verification service
 */
export class CredentialDelegationStatusConsumer {
  private readonly queueName: string;

  constructor() {
    this.queueName = process.env.CREDENTIAL_DELEGATION_STATUS_QUEUE || 'credential_delegation_status';
  }

  /**
   * Start consuming credential delegation status messages
   */
  async startConsumer(channel: Channel): Promise<void> {
    queueLogger.info({ queueName: this.queueName }, 'Starting Credential Delegation Status consumer...');

    // Assert queue exists
    await channel.assertQueue(this.queueName, {
      durable: true
    });

    // Start consuming messages
    await channel.consume(this.queueName, async (message: ConsumeMessage | null) => {
      if (!message) return;

      const timer = new PerformanceTimer(queueLogger, 'credential-delegation-status-processing');
      try {
        const content: CredentialDelegationStatusMessage = JSON.parse(message.content.toString());

        queueLogger.info({
          type: content.type,
          delegationId: content.delegation_id,
          tenantId: content.tenant_id,
          status: content.status
        }, 'Received credential delegation status message');

        await this.processVerificationStatus(content);

        // Acknowledge message
        channel.ack(message);
        timer.end({
          delegationId: content.delegation_id,
          status: content.status,
          success: true
        });
        queueLogger.info({
          delegationId: content.delegation_id
        }, 'Credential delegation status processed successfully');

      } catch (error) {
        timer.end({ success: false });
        logError(queueLogger, error as Error, { operation: 'credential-delegation-status-processing' });

        // Reject message and don't requeue to avoid infinite loops
        channel.nack(message, false, false);
      }
    });

    queueLogger.info({ queueName: this.queueName }, 'Credential Delegation Status consumer started successfully');
  }

  /**
   * Process verification status message
   */
  private async processVerificationStatus(payload: CredentialDelegationStatusMessage): Promise<void> {
    const { delegation_id, tenant_id, status, error } = payload;

    // Validate required fields
    if (!delegation_id || !status) {
      queueLogger.error({ payload }, 'Invalid credential delegation status payload: missing required fields');
      throw new Error('Invalid credential delegation status payload: missing required fields');
    }

    const messageLogger = queueLogger.child({
      delegationId: delegation_id,
      tenantId: tenant_id,
      status: status
    });

    messageLogger.info('Processing credential delegation verification status');

    // Map external status to DelegationStatus
    const newStatus: DelegationStatus = status === 'verified' ? 'verified' : 'failed';

    // Update the credential delegation token
    const client = await pool.connect();
    try {
      const updateResult = await client.query(
        `UPDATE credential_delegation_tokens
         SET status = $1,
             credentials_verified_at = CASE WHEN $1 = 'verified' THEN NOW() ELSE credentials_verified_at END,
             last_verification_error = $2
         WHERE id = $3
         RETURNING id, organization_id, admin_email, itsm_system_type`,
        [newStatus, error, delegation_id]
      );

      if (updateResult.rows.length === 0) {
        messageLogger.error('Delegation not found');
        throw new Error(`Delegation ${delegation_id} not found`);
      }

      const delegation = updateResult.rows[0];

      // Create audit log
      await client.query(
        `INSERT INTO audit_logs (
           organization_id, user_id, action, resource_type, resource_id, metadata
         ) VALUES ($1, NULL, $2, $3, $4, $5)`,
        [
          delegation.organization_id,
          status === 'verified' ? 'credential_delegation_verified' : 'credential_delegation_failed',
          'credential_delegation',
          delegation_id,
          JSON.stringify({
            admin_email: delegation.admin_email,
            itsm_system_type: delegation.itsm_system_type,
            error: error
          })
        ]
      );

      if (status === 'verified') {
        messageLogger.info({
          adminEmail: delegation.admin_email,
          itsmSystemType: delegation.itsm_system_type
        }, 'Credential delegation verified successfully');
      } else {
        messageLogger.warn({
          adminEmail: delegation.admin_email,
          itsmSystemType: delegation.itsm_system_type,
          error: error
        }, 'Credential delegation verification failed');
      }

    } finally {
      client.release();
    }

    messageLogger.info('Credential delegation status processing completed');
  }
}
