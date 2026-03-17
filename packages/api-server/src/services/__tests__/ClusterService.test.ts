import { beforeEach, describe, expect, it, vi } from "vitest";
import { ClusterService } from "../ClusterService.js";

// Track execute calls to control main query vs totals query results
const mockExecute = vi.fn();
const mockExecuteTakeFirst = vi.fn();
const mockExecuteTakeFirstOrThrow = vi.fn();

/**
 * Generic fluent mock — returns `this` for any chained Kysely method,
 * with execute/executeTakeFirst/executeTakeFirstOrThrow as terminal operations.
 */
function createFluentMock() {
	const mock: Record<string, any> = {};
	const handler: ProxyHandler<any> = {
		get(_target, prop) {
			if (prop === "execute") return mockExecute;
			if (prop === "executeTakeFirst") return mockExecuteTakeFirst;
			if (prop === "executeTakeFirstOrThrow")
				return mockExecuteTakeFirstOrThrow;
			if (prop === "as") return () => `subquery_ref`;
			// All other methods return the proxy (fluent chaining)
			return (..._args: any[]) => new Proxy({}, handler);
		},
	};
	return new Proxy(mock, handler);
}

vi.mock("../../config/kysely.js", () => ({
	db: {
		selectFrom: () => createFluentMock(),
		insertInto: () => createFluentMock(),
		updateTable: () => createFluentMock(),
	},
}));

describe("ClusterService", () => {
	let service: ClusterService;
	const orgId = "org-111";

	beforeEach(() => {
		vi.clearAllMocks();
		service = new ClusterService();
	});

	describe("getClusters totals", () => {
		function setupMocks(clusterRows: any[], totalsRow: Record<string, any>) {
			// First execute() → main cluster query rows
			mockExecute.mockResolvedValueOnce(clusterRows);
			// executeTakeFirst() → totals query result
			mockExecuteTakeFirst.mockResolvedValueOnce(totalsRow);
		}

		it("returns total_automated_tickets from totals query", async () => {
			setupMocks([], {
				total_clusters: "5",
				total_tickets: "100",
				total_automated_tickets: "42",
			});

			const result = await service.getClusters(orgId);

			expect(result.totals).toEqual({
				total_clusters: 5,
				total_tickets: 100,
				total_automated_tickets: 42,
			});
		});

		it("defaults total_automated_tickets to 0 when null", async () => {
			setupMocks([], {
				total_clusters: "3",
				total_tickets: "10",
				total_automated_tickets: null,
			});

			const result = await service.getClusters(orgId);

			expect(result.totals.total_automated_tickets).toBe(0);
		});

		it("defaults all totals to 0 when query returns undefined", async () => {
			mockExecute.mockResolvedValueOnce([]);
			mockExecuteTakeFirst.mockResolvedValueOnce(undefined);

			const result = await service.getClusters(orgId);

			expect(result.totals).toEqual({
				total_clusters: 0,
				total_tickets: 0,
				total_automated_tickets: 0,
			});
		});

		it("coerces string values to numbers", async () => {
			setupMocks([], {
				total_clusters: "1",
				total_tickets: "3",
				total_automated_tickets: "1",
			});

			const result = await service.getClusters(orgId);

			expect(typeof result.totals.total_automated_tickets).toBe("number");
			expect(result.totals.total_automated_tickets).toBe(1);
		});

		it("maps cluster rows with correct types", async () => {
			const now = new Date();
			setupMocks(
				[
					{
						id: "c1",
						name: "Password Reset",
						subcluster_name: null,
						kb_status: "FOUND",
						config: { auto_respond: true },
						ticket_count: "42",
						needs_response_count: "5",
						created_at: now,
						updated_at: now,
					},
				],
				{
					total_clusters: "1",
					total_tickets: "42",
					total_automated_tickets: "10",
				},
			);

			const result = await service.getClusters(orgId);

			expect(result.clusters).toHaveLength(1);
			expect(result.clusters[0]).toEqual({
				id: "c1",
				name: "Password Reset",
				subcluster_name: null,
				kb_status: "FOUND",
				config: { auto_respond: true },
				ticket_count: 42,
				needs_response_count: 5,
				created_at: now,
				updated_at: now,
			});
			expect(result.totals.total_automated_tickets).toBe(10);
		});
	});

	describe("linkKbArticle", () => {
		const clusterId = "cluster-1";
		const blobId = "blob-1";
		const now = new Date("2024-06-01");

		it("inserts link, updates kb_status, and returns article metadata", async () => {
			// 1st execute() → insertInto cluster_kb_links
			mockExecute.mockResolvedValueOnce([]);
			// 2nd execute() → updateTable clusters (kb_status GAP→FOUND)
			mockExecute.mockResolvedValueOnce([]);
			// executeTakeFirstOrThrow() → select blob_metadata
			mockExecuteTakeFirstOrThrow.mockResolvedValueOnce({
				id: blobId,
				filename: "guide.pdf",
				file_size: 2048,
				mime_type: "application/pdf",
				status: "processed",
				created_at: now,
				updated_at: now,
			});

			const result = await service.linkKbArticle(clusterId, blobId, orgId);

			expect(result).toEqual({
				id: blobId,
				filename: "guide.pdf",
				file_size: 2048,
				mime_type: "application/pdf",
				status: "processed",
				created_at: now,
				updated_at: now,
			});
			// insert + update = 2 execute calls
			expect(mockExecute).toHaveBeenCalledTimes(2);
			expect(mockExecuteTakeFirstOrThrow).toHaveBeenCalledTimes(1);
		});

		it("throws when blob_metadata not found", async () => {
			mockExecute.mockResolvedValueOnce([]);
			mockExecute.mockResolvedValueOnce([]);
			mockExecuteTakeFirstOrThrow.mockRejectedValueOnce(new Error("no result"));

			await expect(
				service.linkKbArticle(clusterId, blobId, orgId),
			).rejects.toThrow("no result");
		});
	});
});
