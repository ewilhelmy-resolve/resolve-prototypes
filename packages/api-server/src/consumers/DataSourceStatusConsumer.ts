import type { Channel, ConsumeMessage } from "amqplib";
import { pool } from "../config/database.js";
import { logError, PerformanceTimer, queueLogger } from "../config/logger.js";
import { DataSourceService } from "../services/DataSourceService.js";
import { getSSEService } from "../services/sse.js";
import type { DelegationStatus } from "../types/credentialDelegation.js";
import type {
	DataSourceStatusMessage,
	DelegationVerificationMessage,
	IngestionStatusMessage,
	SyncStatusMessage,
	VerificationStatusMessage,
} from "../types/dataSource.js";

/**
 * Unified RabbitMQ Consumer for Data Source Status Updates
 * Handles both sync and verification events from a single queue
 * Discriminates message types via 'type' field
 */
export class DataSourceStatusConsumer {
	private readonly queueName: string;
	private dataSourceService: DataSourceService;

	constructor() {
		this.queueName =
			process.env.DATA_SOURCE_STATUS_QUEUE || "data_source_status";
		this.dataSourceService = new DataSourceService();
	}

	/**
	 * Start consuming data source status messages
	 */
	async startConsumer(channel: Channel): Promise<void> {
		queueLogger.info(
			{ queueName: this.queueName },
			"Starting Data Source Status consumer...",
		);

		// Assert queue exists
		await channel.assertQueue(this.queueName, {
			durable: true,
		});

		// Start consuming messages
		await channel.consume(
			this.queueName,
			async (message: ConsumeMessage | null) => {
				if (!message) return;

				const timer = new PerformanceTimer(
					queueLogger,
					"data-source-status-processing",
				);
				try {
					const content: DataSourceStatusMessage = JSON.parse(
						message.content.toString(),
					);

					queueLogger.info(
						{
							type: content.type,
							connectionId:
								"connection_id" in content ? content.connection_id : undefined,
							delegationId:
								"delegation_id" in content ? content.delegation_id : undefined,
							tenantId: content.tenant_id,
						},
						"Received data source status message",
					);

					// Discriminate based on type field
					if (content.type === "sync") {
						await this.processSyncStatus(content);
					} else if (content.type === "verification") {
						await this.processVerificationStatus(content);
					} else if (content.type === "ticket_ingestion") {
						await this.processTicketIngestionStatus(content);
					} else if (content.type === "credential_delegation_verification") {
						await this.processDelegationVerificationStatus(content);
					} else {
						throw new Error(`Unknown message type: ${(content as any).type}`);
					}

					// Acknowledge message
					channel.ack(message);
					timer.end({
						type: content.type,
						success: true,
					});
					queueLogger.info("Data source status processed successfully");
				} catch (error) {
					timer.end({ success: false });
					logError(queueLogger, error as Error, {
						operation: "data-source-status-processing",
					});

					// Reject message and don't requeue to avoid infinite loops
					channel.nack(message, false, false);
				}
			},
		);

		queueLogger.info(
			{ queueName: this.queueName },
			"Data Source Status consumer started successfully",
		);
	}

	/**
	 * Process sync status message
	 */
	private async processSyncStatus(payload: SyncStatusMessage): Promise<void> {
		const { connection_id, tenant_id, status, error_message } = payload;

		// Validate required fields
		if (!connection_id || !tenant_id || !status) {
			const messageLogger = queueLogger.child({
				connectionId: connection_id,
				tenantId: tenant_id,
				status: status,
			});
			messageLogger.error(
				{ payload },
				"Invalid sync status payload: missing required fields",
			);
			throw new Error("Invalid sync status payload: missing required fields");
		}

		const messageLogger = queueLogger.child({
			connectionId: connection_id,
			tenantId: tenant_id,
			status: status,
		});

		messageLogger.info("Processing sync status update");

		// Update data source status based on message type
		let updatedDataSource = null;

		switch (status) {
			case "sync_started":
				updatedDataSource = await this.dataSourceService.updateDataSourceStatus(
					connection_id,
					tenant_id,
					"syncing",
				);
				messageLogger.info("Data source status updated to syncing");
				break;

			case "sync_completed":
				updatedDataSource = await this.dataSourceService.updateDataSourceStatus(
					connection_id,
					tenant_id,
					"idle",
					"completed",
					true, // Update last_sync_at
					true, // Require status to be 'syncing' to prevent race condition
				);

				// If update failed (returned null), the sync was likely cancelled
				if (!updatedDataSource) {
					messageLogger.warn(
						{
							connection_id,
							tenant_id,
						},
						"Sync completed message ignored - sync may have been cancelled",
					);
					return; // Don't send SSE notification
				}

				messageLogger.info(
					{
						documentsProcessed: payload.documents_processed,
					},
					"Data source sync completed successfully",
				);
				break;

			case "sync_failed":
				updatedDataSource = await this.dataSourceService.updateDataSourceStatus(
					connection_id,
					tenant_id,
					"idle",
					"failed",
					true, // Update last_sync_at
				);
				messageLogger.error(
					{
						errorMessage: error_message,
					},
					"Data source sync failed",
				);
				break;

			case "sync_cancelled":
				updatedDataSource = await this.dataSourceService.updateDataSourceStatus(
					connection_id,
					tenant_id,
					"cancelled",
					"failed",
					true, // Update last_sync_at
				);
				messageLogger.info(
					{
						errorMessage: error_message || "Sync cancelled by user",
					},
					"Data source sync cancelled",
				);
				break;

			default:
				messageLogger.error({ status }, "Unknown sync status type");
				throw new Error(`Unknown sync status type: ${status}`);
		}

		if (!updatedDataSource) {
			messageLogger.error("Data source not found");
			throw new Error(
				`Data source ${connection_id} not found for organization ${tenant_id}`,
			);
		}

		// Send SSE event to notify frontend of status change
		try {
			const sseService = getSSEService();

			// Send to organization (all users in the org can see data source updates)
			sseService.sendToOrganization(tenant_id, {
				type: "data_source_update",
				data: {
					connection_id: connection_id,
					connection_type: updatedDataSource.type,
					status: updatedDataSource.status,
					last_sync_status: updatedDataSource.last_sync_status,
					last_sync_at: updatedDataSource.last_sync_at,
					last_sync_error: error_message,
					documents_processed: payload.documents_processed,
					timestamp: new Date().toISOString(),
				},
			});

			messageLogger.info(
				{ eventType: "data_source_update" },
				"SSE event sent to organization",
			);
		} catch (sseError) {
			messageLogger.warn(
				{
					error:
						sseError instanceof Error ? sseError.message : String(sseError),
				},
				"Failed to send SSE event",
			);
			// Don't throw here - SSE failure shouldn't prevent status processing
		}

		messageLogger.info("Sync status processing completed successfully");
	}

	/**
	 * Process verification status message
	 */
	private async processVerificationStatus(
		payload: VerificationStatusMessage,
	): Promise<void> {
		const { connection_id, tenant_id, status, options, error } = payload;

		// Validate required fields
		if (!connection_id || !tenant_id || !status) {
			const messageLogger = queueLogger.child({
				connectionId: connection_id,
				tenantId: tenant_id,
				status: status,
			});
			messageLogger.error(
				{ payload },
				"Invalid verification status payload: missing required fields",
			);
			throw new Error(
				"Invalid verification status payload: missing required fields",
			);
		}

		const messageLogger = queueLogger.child({
			connectionId: connection_id,
			tenantId: tenant_id,
			status: status,
		});

		messageLogger.info("Processing verification status update");

		// Update verification status in database
		const updatedDataSource =
			await this.dataSourceService.updateVerificationStatus(
				connection_id,
				tenant_id,
				status,
				options || undefined,
				error || undefined,
			);

		if (!updatedDataSource) {
			messageLogger.error("Data source not found");
			throw new Error(
				`Data source ${connection_id} not found for organization ${tenant_id}`,
			);
		}

		if (status === "success") {
			messageLogger.info(
				{
					hasOptions: !!options,
				},
				"Data source verification completed successfully",
			);
		} else {
			messageLogger.error(
				{
					errorMessage: error,
				},
				"Data source verification failed",
			);
		}

		// Send SSE event to notify frontend of verification result
		try {
			const sseService = getSSEService();

			// Send to organization (all users in the org can see data source updates)
			sseService.sendToOrganization(tenant_id, {
				type: "data_source_update",
				data: {
					connection_id: connection_id,
					status: updatedDataSource.status,
					last_verification_at: updatedDataSource.last_verification_at,
					last_verification_error: updatedDataSource.last_verification_error,
					latest_options: updatedDataSource.latest_options,
					timestamp: new Date().toISOString(),
				},
			});

			messageLogger.info(
				{ eventType: "data_source_update" },
				"SSE event sent to organization",
			);
		} catch (sseError) {
			messageLogger.warn(
				{
					error:
						sseError instanceof Error ? sseError.message : String(sseError),
				},
				"Failed to send SSE event",
			);
			// Don't throw here - SSE failure shouldn't prevent status processing
		}

		messageLogger.info("Verification status processing completed successfully");
	}

	/**
	 * Process ticket ingestion status message (ITSM Autopilot)
	 */
	private async processTicketIngestionStatus(
		payload: IngestionStatusMessage,
	): Promise<void> {
		const {
			ingestion_run_id,
			tenant_id,
			connection_id,
			status,
			records_processed,
			records_failed,
			total_estimated,
			error_message,
		} = payload;

		// Validate required fields
		if (!ingestion_run_id || !tenant_id || !status) {
			const messageLogger = queueLogger.child({
				ingestionRunId: ingestion_run_id,
				tenantId: tenant_id,
				status: status,
			});
			messageLogger.error(
				{ payload },
				"Invalid ticket ingestion payload: missing required fields",
			);
			throw new Error(
				"Invalid ticket ingestion payload: missing required fields",
			);
		}

		const messageLogger = queueLogger.child({
			ingestionRunId: ingestion_run_id,
			tenantId: tenant_id,
			status: status,
		});

		messageLogger.info("Processing ticket ingestion status update");

		// Handle progress updates vs final status
		if (status === "running") {
			// Progress update - only update records and total_estimated
			const updated = await this.dataSourceService.updateIngestionRunProgress(
				ingestion_run_id,
				records_processed ?? 0,
				records_failed ?? 0,
				total_estimated,
			);

			// Skip SSE if update was skipped (e.g., run was cancelled)
			if (!updated) {
				messageLogger.info(
					"Progress update skipped - ingestion run may have been cancelled",
				);
				return;
			}
		} else {
			// Final status (completed/failed) - update status and records
			await this.dataSourceService.updateIngestionRunStatus(
				ingestion_run_id,
				status,
				error_message,
			);

			if (records_processed !== undefined || records_failed !== undefined) {
				await this.dataSourceService.updateIngestionRunRecords(
					ingestion_run_id,
					records_processed,
					records_failed,
				);
			}
		}

		messageLogger.info(
			{
				recordsProcessed: records_processed,
				recordsFailed: records_failed,
				totalEstimated: total_estimated,
			},
			`Ticket ingestion ${status}`,
		);

		// Send SSE event to notify frontend (for all updates)
		try {
			const sseService = getSSEService();

			sseService.sendToOrganization(tenant_id, {
				type: "ingestion_run_update",
				data: {
					ingestion_run_id: ingestion_run_id,
					connection_id: connection_id,
					status: status,
					records_processed: records_processed,
					records_failed: records_failed,
					total_estimated: total_estimated,
					error_message: error_message,
					timestamp: new Date().toISOString(),
				},
			});

			messageLogger.info(
				{ eventType: "ingestion_run_update" },
				"SSE event sent to organization",
			);
		} catch (sseError) {
			messageLogger.warn(
				{
					error:
						sseError instanceof Error ? sseError.message : String(sseError),
				},
				"Failed to send SSE event",
			);
			// Don't throw here - SSE failure shouldn't prevent status processing
		}

		messageLogger.info(
			"Ticket ingestion status processing completed successfully",
		);
	}

	/**
	 * Process credential delegation verification status message
	 */
	private async processDelegationVerificationStatus(
		payload: DelegationVerificationMessage,
	): Promise<void> {
		const { delegation_id, tenant_id, status, error } = payload;

		// Validate required fields
		if (!delegation_id || !status) {
			queueLogger.error(
				{ payload },
				"Invalid credential delegation status payload: missing required fields",
			);
			throw new Error(
				"Invalid credential delegation status payload: missing required fields",
			);
		}

		const messageLogger = queueLogger.child({
			delegationId: delegation_id,
			tenantId: tenant_id,
			status: status,
		});

		messageLogger.info("Processing credential delegation verification status");

		// Map external status to DelegationStatus
		const newStatus: DelegationStatus =
			status === "verified" ? "verified" : "failed";

		// Update the credential delegation token
		const client = await pool.connect();
		try {
			const updateResult = await client.query(
				`UPDATE credential_delegation_tokens
         SET status = $1,
             credentials_verified_at = CASE WHEN $1 = 'verified' THEN NOW() ELSE credentials_verified_at END,
             last_verification_error = $2
         WHERE id = $3
         RETURNING id, organization_id, admin_email, itsm_system_type, created_by_user_id, submitted_settings`,
				[newStatus, error, delegation_id],
			);

			if (updateResult.rows.length === 0) {
				messageLogger.error("Delegation not found");
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
					status === "verified"
						? "credential_delegation_verified"
						: "credential_delegation_failed",
					"credential_delegation",
					delegation_id,
					JSON.stringify({
						admin_email: delegation.admin_email,
						itsm_system_type: delegation.itsm_system_type,
						error: error,
					}),
				],
			);

			if (status === "verified") {
				messageLogger.info(
					{
						adminEmail: delegation.admin_email,
						itsmSystemType: delegation.itsm_system_type,
					},
					"Credential delegation verified successfully",
				);

				// Update existing data_source_connections record with submitted settings
				const settings = delegation.submitted_settings || {};

				const connectionUpdateResult = await client.query(
					`UPDATE data_source_connections
           SET settings = $1,
               status = 'idle',
               enabled = true,
               last_verification_at = NOW(),
               last_verification_error = NULL,
               last_sync_status = NULL,
               updated_by = $2,
               updated_at = NOW()
           WHERE organization_id = $3 AND type = $4
           RETURNING id`,
					[
						JSON.stringify(settings),
						delegation.created_by_user_id,
						delegation.organization_id,
						delegation.itsm_system_type,
					],
				);

				if (connectionUpdateResult.rows.length === 0) {
					messageLogger.error(
						{
							organizationId: delegation.organization_id,
							type: delegation.itsm_system_type,
						},
						"No existing data_source_connection found to update",
					);
					throw new Error(
						"No existing data_source_connection found for delegation",
					);
				}

				const connectionId = connectionUpdateResult.rows[0].id;

				// Update delegation token with the connection_id
				await client.query(
					`UPDATE credential_delegation_tokens SET connection_id = $1 WHERE id = $2`,
					[connectionId, delegation_id],
				);

				messageLogger.info(
					{ connectionId, itsmSystemType: delegation.itsm_system_type },
					"Updated data_source_connection for delegation",
				);
				// Note: Success email is sent directly by the platform during credential verification
			} else {
				messageLogger.warn(
					{
						adminEmail: delegation.admin_email,
						itsmSystemType: delegation.itsm_system_type,
						error: error,
					},
					"Credential delegation verification failed",
				);
			}
		} finally {
			client.release();
		}

		messageLogger.info("Credential delegation status processing completed");
	}
}
