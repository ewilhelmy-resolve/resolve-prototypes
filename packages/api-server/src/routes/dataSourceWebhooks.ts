import express from "express";
import { z } from "zod";
import { authenticateUser } from "../middleware/auth.js";
import { DataSourceService } from "../services/DataSourceService.js";
import { DataSourceWebhookService } from "../services/DataSourceWebhookService.js";
import type { AuthenticatedRequest } from "../types/express.js";

const router = express.Router();
const dataSourceService = new DataSourceService();
const webhookService = new DataSourceWebhookService();

// Validation schema for verify endpoint (credentials optional for auto-verify)
const verifyCredentialsSchema = z.object({
	credentials: z.record(z.string(), z.any()).optional(),
	settings: z.record(z.string(), z.any()).optional(),
	apply_to_related: z.boolean().optional(), // For ServiceNow: also apply credentials to KB/ITSM counterpart
});

// Validation schema for sync-tickets endpoint (ITSM Autopilot)
const syncTicketsSchema = z.object({
	time_range_days: z.number().int().min(1).max(365).default(30),
});

/**
 * POST /api/v1/data-sources/:id/verify
 * Verify credentials for a data source
 * - With credentials: Manual verification (first-time setup)
 * - Without credentials: Auto-verification with 10-minute throttle
 */
router.post("/:id/verify", authenticateUser, async (req, res) => {
	const authReq = req as AuthenticatedRequest;
	const { id } = req.params;

	try {
		// Validate request body
		const validated = verifyCredentialsSchema.parse(req.body);

		// Get data source
		const dataSource = await dataSourceService.getDataSource(
			id,
			authReq.user.activeOrganizationId,
		);

		if (!dataSource) {
			return res.status(404).json({ error: "Data source not found" });
		}

		// Validate apply_to_related is only allowed for ServiceNow types
		if (validated.apply_to_related) {
			if (!["servicenow", "servicenow_itsm"].includes(dataSource.type)) {
				return res.status(400).json({
					error: "Invalid request",
					message:
						"apply_to_related is only supported for ServiceNow connections",
				});
			}
		}

		// Lookup related connection if apply_to_related is true
		let relatedDataSource = null;
		if (validated.apply_to_related) {
			const relatedType =
				dataSource.type === "servicenow" ? "servicenow_itsm" : "servicenow";
			relatedDataSource = await dataSourceService.getDataSourceByType(
				authReq.user.activeOrganizationId,
				relatedType,
			);
			if (!relatedDataSource) {
				console.log(
					"[DataSourceWebhook] No related connection found for apply_to_related:",
					{
						primaryType: dataSource.type,
						relatedType,
						organizationId: authReq.user.activeOrganizationId,
					},
				);
			}
		}

		// Auto-verification mode (no credentials provided)
		if (!validated.credentials) {
			// Check throttle (10-minute minimum)
			const shouldVerify = await dataSourceService.shouldTriggerVerification(
				id,
				authReq.user.activeOrganizationId,
			);

			if (!shouldVerify) {
				return res.json({
					status: "skipped",
					message: "Verification throttled (10-minute minimum)",
					last_verification_at: dataSource.last_verification_at,
				});
			}
		}

		// Update status to 'verifying' before sending webhook
		await dataSourceService.updateDataSourceStatus(
			id,
			authReq.user.activeOrganizationId,
			"verifying" as any,
		);

		// Also update related connection status if apply_to_related
		if (relatedDataSource) {
			await dataSourceService.updateDataSourceStatus(
				relatedDataSource.id,
				authReq.user.activeOrganizationId,
				"verifying" as any,
			);
		}

		// Build webhook promises for parallel execution
		const webhookPromises: Promise<{ success: boolean; error?: string }>[] = [
			webhookService.sendVerifyEvent({
				organizationId: authReq.user.activeOrganizationId,
				userId: authReq.user.id,
				userEmail: authReq.user.email,
				connectionId: dataSource.id,
				connectionType: dataSource.type,
				credentials: validated.credentials || {},
				settings: validated.settings || dataSource.settings,
			}),
		];

		// Add related connection verification if exists
		if (relatedDataSource) {
			webhookPromises.push(
				webhookService.sendVerifyEvent({
					organizationId: authReq.user.activeOrganizationId,
					userId: authReq.user.id,
					userEmail: authReq.user.email,
					connectionId: relatedDataSource.id,
					connectionType: relatedDataSource.type,
					credentials: validated.credentials || {},
					settings: validated.settings || relatedDataSource.settings,
				}),
			);
		}

		// Execute webhooks in parallel
		const [primaryResponse, relatedResponse] =
			await Promise.all(webhookPromises);

		// Handle primary webhook failure - revert status
		if (!primaryResponse.success) {
			await dataSourceService.updateDataSourceStatus(
				id,
				authReq.user.activeOrganizationId,
				"idle",
				"failed",
			);

			// Also revert related if it was updated
			if (relatedDataSource) {
				await dataSourceService.updateDataSourceStatus(
					relatedDataSource.id,
					authReq.user.activeOrganizationId,
					"idle",
					"failed",
				);
			}

			return res.status(500).json({
				success: false,
				error: "Verification webhook failed",
				details: primaryResponse.error,
			});
		}

		// Log related connection result (don't fail primary if related fails)
		if (relatedDataSource && relatedResponse) {
			if (!relatedResponse.success) {
				console.warn(
					"[DataSourceWebhook] Related connection verification failed:",
					{
						relatedConnectionId: relatedDataSource.id,
						relatedType: relatedDataSource.type,
						error: relatedResponse.error,
					},
				);
				// Revert related status on failure
				await dataSourceService.updateDataSourceStatus(
					relatedDataSource.id,
					authReq.user.activeOrganizationId,
					"idle",
					"failed",
				);
			} else {
				// Update related connection settings with the same credentials
				// This syncs instanceUrl and username (password not stored in DB)
				if (validated.settings || validated.credentials) {
					const updatedSettings = {
						...relatedDataSource.settings,
						...(validated.settings || {}),
						// Copy username from credentials if provided
						...(validated.credentials?.username
							? { username: validated.credentials.username }
							: {}),
					};

					await dataSourceService.updateDataSource(
						relatedDataSource.id,
						authReq.user.activeOrganizationId,
						authReq.user.id,
						{ settings: updatedSettings, enabled: true },
					);

					console.log(
						"[DataSourceWebhook] Related connection settings synced:",
						{
							relatedConnectionId: relatedDataSource.id,
							relatedType: relatedDataSource.type,
							settings: updatedSettings,
						},
					);
				}

				console.log(
					"[DataSourceWebhook] Related connection verification started:",
					{
						relatedConnectionId: relatedDataSource.id,
						relatedType: relatedDataSource.type,
					},
				);
			}
		}

		// Return success - result will come via RabbitMQ/SSE
		res.json({
			status: "verifying",
			message: "Verification in progress",
		});
	} catch (error) {
		if (error instanceof z.ZodError) {
			return res.status(400).json({
				error: "Validation error",
				details: error.issues,
			});
		}

		console.error("[DataSourceWebhook] Error verifying credentials:", error);
		res.status(500).json({ error: "Failed to verify credentials" });
	}
});

/**
 * POST /api/v1/data-sources/:id/sync
 * Trigger sync for a data source
 */
router.post("/:id/sync", authenticateUser, async (req, res) => {
	const authReq = req as AuthenticatedRequest;
	const { id } = req.params;

	try {
		// Get data source
		const dataSource = await dataSourceService.getDataSource(
			id,
			authReq.user.activeOrganizationId,
		);

		if (!dataSource) {
			return res.status(404).json({ error: "Data source not found" });
		}

		if (!dataSource.enabled) {
			return res.status(400).json({
				error: "Data source not configured",
				message: "Please configure the data source before triggering a sync",
			});
		}

		if (dataSource.status === "syncing") {
			return res.status(409).json({
				error: "Sync already in progress",
				message: "A sync is already running for this data source",
			});
		}

		// Update status to syncing
		await dataSourceService.updateDataSourceStatus(
			id,
			authReq.user.activeOrganizationId,
			"syncing",
		);

		// Send sync trigger webhook
		const webhookResponse = await webhookService.sendSyncTriggerEvent({
			organizationId: authReq.user.activeOrganizationId,
			userId: authReq.user.id,
			userEmail: authReq.user.email,
			connectionId: dataSource.id,
			connectionType: dataSource.type,
			settings: dataSource.settings,
		});

		if (!webhookResponse.success) {
			// Revert status to idle on failure
			await dataSourceService.updateDataSourceStatus(
				id,
				authReq.user.activeOrganizationId,
				"idle",
				"failed",
			);

			return res.status(500).json({
				success: false,
				error: "Sync trigger failed",
				details: webhookResponse.error,
			});
		}

		// Get updated data source to return in response
		const updatedDataSource = await dataSourceService.getDataSource(
			id,
			authReq.user.activeOrganizationId,
		);

		if (!updatedDataSource) {
			throw new Error("Data source not found after update");
		}

		res.json({
			data: {
				id: updatedDataSource.id,
				status: "syncing" as const,
				triggeredAt: new Date().toISOString(),
			},
		});
	} catch (error) {
		console.error("[DataSourceWebhook] Error triggering sync:", error);

		// Try to revert status on error
		try {
			await dataSourceService.updateDataSourceStatus(
				id,
				authReq.user.activeOrganizationId,
				"idle",
				"failed",
			);
		} catch (revertError) {
			console.error(
				"[DataSourceWebhook] Failed to revert status:",
				revertError,
			);
		}

		res.status(500).json({ error: "Failed to trigger sync" });
	}
});

/**
 * POST /api/v1/data-sources/:id/cancel-sync
 * Cancel an ongoing sync operation
 *
 * Platform team implementation:
 * Platform team polls sync_cancellation_requests table for pending requests,
 * stops the running sync jobs, and updates status to 'completed' when done.
 */
router.post("/:id/cancel-sync", authenticateUser, async (req, res) => {
	const authReq = req as AuthenticatedRequest;
	const { id } = req.params;

	try {
		// Get data source
		const dataSource = await dataSourceService.getDataSource(
			id,
			authReq.user.activeOrganizationId,
		);

		if (!dataSource) {
			return res.status(404).json({ error: "Data source not found" });
		}

		// Check if sync is actually in progress
		if (dataSource.status !== "syncing") {
			return res.status(400).json({
				error: "No sync in progress",
				message: `Cannot cancel sync - current status is '${dataSource.status}'`,
			});
		}

		// Cancel the sync locally first (update database status)
		const updatedDataSource = await dataSourceService.cancelSync(
			id,
			authReq.user.activeOrganizationId,
		);

		if (!updatedDataSource) {
			throw new Error("Data source not found after cancel operation");
		}

		// Create cancellation request for platform team to process
		await dataSourceService.createCancellationRequest({
			tenantId: authReq.user.activeOrganizationId,
			userId: authReq.user.id,
			connectionId: dataSource.id,
			connectionType: dataSource.type,
			connectionUrl: dataSource.settings?.url || "",
			email: dataSource.settings?.email || "",
		});

		console.log("[DataSourceWebhook] Cancellation request created:", {
			connectionId: dataSource.id,
			tenantId: authReq.user.activeOrganizationId,
			connectionType: dataSource.type,
		});

		res.json({
			success: true,
			data: {
				id: updatedDataSource.id,
				status: updatedDataSource.status,
				last_sync_status: updatedDataSource.last_sync_status,
				last_sync_error: updatedDataSource.last_sync_error,
				cancelledAt: new Date().toISOString(),
			},
			message: "Sync cancelled successfully",
		});
	} catch (error) {
		console.error("[DataSourceWebhook] Error cancelling sync:", error);
		res.status(500).json({ error: "Failed to cancel sync" });
	}
});

/**
 * POST /api/v1/data-sources/:id/cancel-ingestion
 * Cancel an ongoing ticket sync (ingestion run)
 * UI-only: updates DB status, platform continues but UI shows cancelled
 */
router.post("/:id/cancel-ingestion", authenticateUser, async (req, res) => {
	const authReq = req as AuthenticatedRequest;
	const { id } = req.params;

	try {
		// Verify data source exists and belongs to org
		const dataSource = await dataSourceService.getDataSource(
			id,
			authReq.user.activeOrganizationId,
		);

		if (!dataSource) {
			return res.status(404).json({ error: "Data source not found" });
		}

		// Cancel the latest ingestion run (only if running/pending)
		const cancelledRun = await dataSourceService.cancelIngestionRun(
			id,
			authReq.user.activeOrganizationId,
		);

		if (!cancelledRun) {
			return res.status(400).json({
				error: "No ingestion in progress",
				message: "No running or pending ticket sync to cancel",
			});
		}

		console.log("[DataSourceWebhook] Ingestion run cancelled:", {
			ingestionRunId: cancelledRun.id,
			connectionId: id,
			tenantId: authReq.user.activeOrganizationId,
		});

		res.json({
			success: true,
			data: {
				ingestion_run_id: cancelledRun.id,
				status: cancelledRun.status,
				cancelledAt: new Date().toISOString(),
			},
			message: "Ticket sync cancelled",
		});
	} catch (error) {
		console.error("[DataSourceWebhook] Error cancelling ingestion:", error);
		res.status(500).json({ error: "Failed to cancel ticket sync" });
	}
});

/**
 * POST /api/v1/data-sources/:id/sync-tickets
 * Trigger ITSM ticket sync for autopilot clustering
 * Creates ingestion_runs record, sends webhook, returns 202
 */
router.post("/:id/sync-tickets", authenticateUser, async (req, res) => {
	const authReq = req as AuthenticatedRequest;
	const { id } = req.params;

	try {
		// Validate request body
		const validated = syncTicketsSchema.parse(req.body);

		// Get data source
		const dataSource = await dataSourceService.getDataSource(
			id,
			authReq.user.activeOrganizationId,
		);

		if (!dataSource) {
			return res.status(404).json({ error: "Data source not found" });
		}

		if (!dataSource.enabled) {
			return res.status(400).json({
				error: "Data source not configured",
				message: "Please configure the data source before triggering a sync",
			});
		}

		// Only allow ITSM-specific connection types
		if (
			!["servicenow_itsm", "jira_itsm", "freshdesk"].includes(dataSource.type)
		) {
			return res.status(400).json({
				error: "Invalid data source type",
				message:
					"Ticket sync is only supported for ITSM connections (ServiceNow, Jira, Freshdesk)",
			});
		}

		// Create ingestion_runs record
		const ingestionRunResult = await dataSourceService.createIngestionRun({
			organizationId: authReq.user.activeOrganizationId,
			dataSourceConnectionId: dataSource.id,
			startedBy: authReq.user.id,
			metadata: {
				time_range_days: validated.time_range_days,
				connection_type: dataSource.type,
			},
		});

		if (!ingestionRunResult) {
			return res.status(500).json({ error: "Failed to create ingestion run" });
		}

		// Send sync tickets webhook
		const webhookResponse = await webhookService.sendSyncTicketsEvent({
			organizationId: authReq.user.activeOrganizationId,
			userId: authReq.user.id,
			userEmail: authReq.user.email,
			connectionId: dataSource.id,
			connectionType: dataSource.type,
			ingestionRunId: ingestionRunResult.id,
			settings: {
				...dataSource.settings,
				time_range_days: validated.time_range_days,
			},
		});

		if (!webhookResponse.success) {
			// Update ingestion run status to failed
			await dataSourceService.updateIngestionRunStatus(
				ingestionRunResult.id,
				"failed",
				webhookResponse.error || "Webhook request failed",
			);

			return res.status(500).json({
				success: false,
				error: "Sync tickets webhook failed",
				details: webhookResponse.error,
			});
		}

		// Update ingestion run status to running
		await dataSourceService.updateIngestionRunStatus(
			ingestionRunResult.id,
			"running",
		);

		// Return 202 Accepted - result will arrive via RabbitMQ/SSE
		res.status(202).json({
			ingestion_run_id: ingestionRunResult.id,
			status: "SYNCING",
			message: "Ticket sync in progress",
		});
	} catch (error) {
		if (error instanceof z.ZodError) {
			return res.status(400).json({
				error: "Validation error",
				details: error.issues,
			});
		}

		console.error("[DataSourceWebhook] Error triggering ticket sync:", error);
		res.status(500).json({ error: "Failed to trigger ticket sync" });
	}
});

/**
 * GET /api/v1/data-sources/:id/ingestion-runs/latest
 * Get the latest ingestion run for a data source (ITSM Autopilot)
 * Used by frontend to check if a ticket sync is in progress
 */
router.get("/:id/ingestion-runs/latest", authenticateUser, async (req, res) => {
	const authReq = req as AuthenticatedRequest;
	const { id } = req.params;

	try {
		// Verify data source exists and belongs to org
		const dataSource = await dataSourceService.getDataSource(
			id,
			authReq.user.activeOrganizationId,
		);

		if (!dataSource) {
			return res.status(404).json({ error: "Data source not found" });
		}

		// Get latest ingestion run
		const latestRun = await dataSourceService.getLatestIngestionRun(
			id,
			authReq.user.activeOrganizationId,
		);

		res.json({ data: latestRun });
	} catch (error) {
		console.error(
			"[DataSourceWebhook] Error fetching latest ingestion run:",
			error,
		);
		res.status(500).json({ error: "Failed to fetch latest ingestion run" });
	}
});

export default router;
