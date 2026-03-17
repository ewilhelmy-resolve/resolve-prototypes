import { beforeEach, describe, expect, it, vi } from "vitest";
import { ClusterService } from "../ClusterService.js";

// Track execute calls to control main query vs totals query results
const mockExecute = vi.fn();
const mockExecuteTakeFirst = vi.fn();

/**
 * Generic fluent mock — returns `this` for any chained Kysely method,
 * with execute/executeTakeFirst as terminal operations.
 */
function createFluentMock() {
	const mock: Record<string, any> = {};
	const handler: ProxyHandler<any> = {
		get(_target, prop) {
			if (prop === "execute") return mockExecute;
			if (prop === "executeTakeFirst") return mockExecuteTakeFirst;
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
});
