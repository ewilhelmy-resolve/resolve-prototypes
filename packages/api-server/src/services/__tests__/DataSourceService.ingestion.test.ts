import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockQuery } = vi.hoisted(() => {
	const mockQuery = vi.fn();
	return { mockQuery };
});

vi.mock("../../config/database.js", () => ({
	pool: {
		query: mockQuery,
		connect: vi.fn(),
	},
}));

import { DataSourceService } from "../DataSourceService.js";

describe("DataSourceService — ingestion methods", () => {
	let service: DataSourceService;

	beforeEach(() => {
		vi.clearAllMocks();
		service = new DataSourceService();
	});

	// ========================================================================
	// createIngestionRun
	// ========================================================================

	describe("createIngestionRun", () => {
		it("should insert record and return id/status", async () => {
			mockQuery.mockResolvedValueOnce({
				rows: [{ id: "run-123", status: "pending" }],
			});

			const result = await service.createIngestionRun({
				organizationId: "org-1",
				dataSourceConnectionId: "ds-1",
				startedBy: "user-1",
				metadata: { time_range_days: 30 },
			});

			expect(result).toEqual({ id: "run-123", status: "pending" });
		});

		it("should return null when insert returns empty rows", async () => {
			mockQuery.mockResolvedValueOnce({ rows: [] });

			const result = await service.createIngestionRun({
				organizationId: "org-1",
				dataSourceConnectionId: "ds-1",
				startedBy: "user-1",
			});

			expect(result).toBeNull();
		});

		it("should return null on error", async () => {
			mockQuery.mockRejectedValueOnce(new Error("DB connection lost"));

			const result = await service.createIngestionRun({
				organizationId: "org-1",
				dataSourceConnectionId: "ds-1",
				startedBy: "user-1",
			});

			expect(result).toBeNull();
		});

		it("should pass correct SQL params", async () => {
			mockQuery.mockResolvedValueOnce({
				rows: [{ id: "run-1", status: "pending" }],
			});

			await service.createIngestionRun({
				organizationId: "org-1",
				dataSourceConnectionId: "ds-1",
				startedBy: "user-1",
				metadata: { time_range_days: 30 },
			});

			const params = mockQuery.mock.calls[0][1];
			expect(params).toEqual([
				"org-1",
				"ds-1",
				"user-1",
				JSON.stringify({ time_range_days: 30 }),
			]);
		});
	});

	// ========================================================================
	// updateIngestionRunStatus
	// ========================================================================

	describe("updateIngestionRunStatus", () => {
		it("should update status", async () => {
			mockQuery.mockResolvedValueOnce({ rows: [] });

			await service.updateIngestionRunStatus("run-1", "running");

			const sql = mockQuery.mock.calls[0][0] as string;
			expect(sql).toContain("status = $1");
			expect(mockQuery.mock.calls[0][1][0]).toBe("running");
		});

		it("should set completed_at for terminal states", async () => {
			for (const status of [
				"completed" as const,
				"failed" as const,
				"cancelled" as const,
			]) {
				mockQuery.mockResolvedValueOnce({ rows: [] });

				await service.updateIngestionRunStatus("run-1", status);

				const sql = mockQuery.mock.calls.at(-1)?.[0] as string;
				expect(sql).toContain("completed_at = NOW()");
			}
		});

		it("should include error_message when provided", async () => {
			mockQuery.mockResolvedValueOnce({ rows: [] });

			await service.updateIngestionRunStatus(
				"run-1",
				"failed",
				"Something broke",
			);

			const sql = mockQuery.mock.calls[0][0] as string;
			expect(sql).toContain("error_message");
			expect(mockQuery.mock.calls[0][1]).toContain("Something broke");
		});

		it("should include metadata merge when provided", async () => {
			mockQuery.mockResolvedValueOnce({ rows: [] });

			await service.updateIngestionRunStatus("run-1", "running", undefined, {
				extra: true,
			});

			const sql = mockQuery.mock.calls[0][0] as string;
			expect(sql).toContain("COALESCE(metadata");
			expect(mockQuery.mock.calls[0][1]).toContain(
				JSON.stringify({ extra: true }),
			);
		});
	});

	// ========================================================================
	// updateIngestionRunProgress
	// ========================================================================

	describe("updateIngestionRunProgress", () => {
		it("should update records_processed and records_failed", async () => {
			mockQuery.mockResolvedValueOnce({ rowCount: 1 });

			const result = await service.updateIngestionRunProgress("run-1", 50, 3);

			expect(result).toBe(true);
			const params = mockQuery.mock.calls[0][1];
			expect(params[0]).toBe(50);
			expect(params[1]).toBe(3);
		});

		it("should set total_estimated in metadata when provided", async () => {
			mockQuery.mockResolvedValueOnce({ rowCount: 1 });

			await service.updateIngestionRunProgress("run-1", 10, 0, 500);

			const sql = mockQuery.mock.calls[0][0] as string;
			expect(sql).toContain("jsonb_set");
			const params = mockQuery.mock.calls[0][1];
			expect(params[2]).toBe(JSON.stringify(500));
		});

		it("should return true when row updated", async () => {
			mockQuery.mockResolvedValueOnce({ rowCount: 1 });

			const result = await service.updateIngestionRunProgress("run-1", 10, 0);

			expect(result).toBe(true);
		});

		it("should return false when row not updated", async () => {
			mockQuery.mockResolvedValueOnce({ rowCount: 0 });

			const result = await service.updateIngestionRunProgress("run-1", 10, 0);

			expect(result).toBe(false);
		});
	});

	// ========================================================================
	// getLatestIngestionRun
	// ========================================================================

	describe("getLatestIngestionRun", () => {
		it("should return latest run", async () => {
			const mockRun = {
				id: "run-1",
				organization_id: "org-1",
				data_source_connection_id: "ds-1",
				status: "completed",
				records_processed: 100,
				records_failed: 2,
			};
			mockQuery.mockResolvedValueOnce({ rows: [mockRun] });

			const result = await service.getLatestIngestionRun("ds-1", "org-1");

			expect(result).toEqual(mockRun);
		});

		it("should return null when no runs exist", async () => {
			mockQuery.mockResolvedValueOnce({ rows: [] });

			const result = await service.getLatestIngestionRun("ds-1", "org-1");

			expect(result).toBeNull();
		});

		it("should query with correct connectionId and organizationId", async () => {
			mockQuery.mockResolvedValueOnce({ rows: [] });

			await service.getLatestIngestionRun("ds-99", "org-42");

			const params = mockQuery.mock.calls[0][1];
			expect(params).toEqual(["ds-99", "org-42"]);
		});
	});

	// ========================================================================
	// cancelIngestionRun
	// ========================================================================

	describe("cancelIngestionRun", () => {
		it("should return cancelled run", async () => {
			const mockRun = {
				id: "run-1",
				status: "cancelled",
				error_message: "Cancelled by user",
			};
			mockQuery.mockResolvedValueOnce({ rows: [mockRun] });

			const result = await service.cancelIngestionRun("ds-1", "org-1");

			expect(result).toEqual(mockRun);
		});

		it("should return null when no running/pending run", async () => {
			mockQuery.mockResolvedValueOnce({ rows: [] });

			const result = await service.cancelIngestionRun("ds-1", "org-1");

			expect(result).toBeNull();
		});

		it("should filter by running and pending status", async () => {
			mockQuery.mockResolvedValueOnce({ rows: [] });

			await service.cancelIngestionRun("ds-1", "org-1");

			const sql = mockQuery.mock.calls[0][0] as string;
			expect(sql).toContain("status IN ('running', 'pending')");
		});
	});
});
