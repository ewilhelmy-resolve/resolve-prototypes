import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Use vi.hoisted so mock pool is available when vi.mock factory runs
const { capturedQueries, mockPoolClient, mockPool } = vi.hoisted(() => {
	const capturedQueries: { sql: string; params: readonly unknown[] }[] = [];

	const mockPoolClient = {
		query: vi.fn().mockImplementation((sql: string, params?: unknown[]) => {
			capturedQueries.push({ sql, params: params || [] });
			return Promise.resolve({ rows: [], rowCount: 0, command: "SELECT" });
		}),
		release: vi.fn(),
	};

	const mockPool = {
		connect: vi.fn().mockResolvedValue(mockPoolClient),
		on: vi.fn().mockReturnThis(),
		end: vi.fn().mockResolvedValue(undefined),
	};

	return { capturedQueries, mockPoolClient, mockPool };
});

// Mock the Kysely db with a real Kysely instance using mock pool
vi.mock("../../config/kysely.js", async () => {
	const { Kysely, PostgresDialect } = await import("kysely");
	return {
		db: new Kysely({
			dialect: new PostgresDialect({ pool: mockPool as any }),
		}),
	};
});

// Mock logger to silence output
vi.mock("../../config/logger.js", () => ({
	logger: { info: vi.fn(), debug: vi.fn(), error: vi.fn(), warn: vi.fn() },
	dbLogger: { info: vi.fn(), debug: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

import { ClusterService } from "../ClusterService.js";

describe("ClusterService.getClusters - Offset Pagination", () => {
	let service: ClusterService;

	beforeEach(() => {
		service = new ClusterService();
		capturedQueries.length = 0;
		vi.clearAllMocks();

		mockPoolClient.query.mockImplementation(
			(sql: string, params?: unknown[]) => {
				capturedQueries.push({ sql, params: params || [] });
				return Promise.resolve({ rows: [], rowCount: 0, command: "SELECT" });
			},
		);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	const callGetClusters = async (
		options: {
			sort?: "volume" | "automation" | "recent";
			limit?: number;
			offset?: number;
		} = {},
	) => {
		try {
			await service.getClusters("org-1", options);
		} catch {
			// Ignore errors from mock db - we just need the SQL
		}
	};

	// Helper to find the main clusters SELECT query (not COUNT/totals)
	const getSelectQuery = (): string => {
		const selectQuery = capturedQueries.find((q) => {
			const lower = q.sql.toLowerCase();
			return (
				lower.includes("from") &&
				lower.includes("clusters") &&
				lower.includes("order by")
			);
		});
		return selectQuery?.sql || "";
	};

	describe("offset-based pagination for volume sort", () => {
		it("should use OFFSET when offset param is provided", async () => {
			await callGetClusters({ sort: "volume", limit: 12, offset: 12 });
			const sql = getSelectQuery();
			expect(sql).toMatch(/offset/i);
		});

		it("should not use cursor-based date_trunc filtering", async () => {
			await callGetClusters({ sort: "volume", limit: 12, offset: 24 });
			const sql = getSelectQuery();
			expect(sql).not.toMatch(/date_trunc/i);
		});
	});

	describe("stable sort with tiebreaker", () => {
		it("should include id as tiebreaker for volume sort", async () => {
			await callGetClusters({ sort: "volume" });
			const sql = getSelectQuery();
			expect(sql).toMatch(/order by.*ticket_count/i);
			expect(sql).toMatch(/order by.*"id"/i);
		});
	});

	describe("tickets-first query approach", () => {
		it("should not reference ml_models table", async () => {
			await callGetClusters({ sort: "recent" });
			const allSql = capturedQueries.map((q) => q.sql).join(" ");
			expect(allSql).not.toMatch(/ml_models/i);
		});

		it("should start from tickets subquery joined to clusters", async () => {
			await callGetClusters({ sort: "recent" });
			const sql = getSelectQuery();
			expect(sql).toMatch(/tickets/i);
			expect(sql).toMatch(/join.*clusters/i);
		});
	});
});

describe("ClusterService.getClusterTickets - Sorting", () => {
	let service: ClusterService;

	beforeEach(() => {
		service = new ClusterService();
		capturedQueries.length = 0;
		vi.clearAllMocks();

		// Default mock: return empty rows for all queries
		mockPoolClient.query.mockImplementation(
			(sql: string, params?: unknown[]) => {
				capturedQueries.push({ sql, params: params || [] });
				return Promise.resolve({ rows: [], rowCount: 0, command: "SELECT" });
			},
		);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	const callGetClusterTickets = async (
		options: {
			sort?: "created_at" | "external_id" | "subject";
			sort_dir?: "asc" | "desc";
			limit?: number;
			offset?: number;
		} = {},
	) => {
		try {
			await service.getClusterTickets("cluster-1", "org-1", options);
		} catch {
			// Ignore errors from mock db - we just need the SQL
		}
	};

	// Helper to find the main SELECT query (not COUNT)
	const getSelectQuery = (): string => {
		const selectQuery = capturedQueries.find(
			(q) =>
				q.sql.includes("from") &&
				!q.sql.includes("count(") &&
				!q.sql.includes("count(*"),
		);
		return selectQuery?.sql || "";
	};

	describe("case-insensitive sorting for text fields", () => {
		it("should use LOWER() when sorting by subject", async () => {
			await callGetClusterTickets({ sort: "subject", sort_dir: "asc" });
			const sql = getSelectQuery();
			expect(sql).toMatch(/order by.*lower\("subject"\)/i);
		});

		it("should use LOWER() when sorting by external_id", async () => {
			await callGetClusterTickets({
				sort: "external_id",
				sort_dir: "asc",
			});
			const sql = getSelectQuery();
			expect(sql).toMatch(/order by.*lower\("external_id"\)/i);
		});

		it("should NOT use LOWER() when sorting by created_at", async () => {
			await callGetClusterTickets({ sort: "created_at", sort_dir: "desc" });
			const sql = getSelectQuery();
			expect(sql).not.toMatch(/lower.*created_at/i);
			expect(sql).toMatch(/order by.*"created_at"/i);
		});
	});

	describe("stable sort with tiebreaker", () => {
		it("should include id as tiebreaker in ORDER BY for subject sort", async () => {
			await callGetClusterTickets({ sort: "subject", sort_dir: "asc" });
			const sql = getSelectQuery();
			// ORDER BY should end with "id" asc as tiebreaker
			expect(sql).toMatch(/order by.*,\s*"id"\s+asc/i);
		});

		it("should include id as tiebreaker in ORDER BY for created_at sort", async () => {
			await callGetClusterTickets({ sort: "created_at", sort_dir: "desc" });
			const sql = getSelectQuery();
			expect(sql).toMatch(/order by.*,\s*"id"\s+asc/i);
		});

		it("should include id as tiebreaker in ORDER BY for external_id sort", async () => {
			await callGetClusterTickets({
				sort: "external_id",
				sort_dir: "desc",
			});
			const sql = getSelectQuery();
			expect(sql).toMatch(/order by.*,\s*"id"\s+asc/i);
		});
	});

	describe("offset-based pagination", () => {
		it("should use OFFSET in query when offset is provided", async () => {
			await callGetClusterTickets({ limit: 20, offset: 40 });
			const sql = getSelectQuery();
			expect(sql).toMatch(/offset/i);
		});

		it("should return total count in pagination response", async () => {
			// First call returns ticket rows, second returns count
			mockPoolClient.query
				.mockImplementationOnce((sql: string, params?: unknown[]) => {
					capturedQueries.push({ sql, params: params || [] });
					return Promise.resolve({ rows: [], rowCount: 0, command: "SELECT" });
				})
				.mockImplementationOnce((sql: string, params?: unknown[]) => {
					capturedQueries.push({ sql, params: params || [] });
					return Promise.resolve({
						rows: [{ total: "42" }],
						rowCount: 1,
						command: "SELECT",
					});
				});

			const result = await service.getClusterTickets("cluster-1", "org-1", {
				limit: 20,
				offset: 0,
			});

			expect(result.pagination).toHaveProperty("total");
			expect((result.pagination as any).total).toBe(42);
		});

		it("should execute a COUNT query for total", async () => {
			await callGetClusterTickets({ limit: 20, offset: 0 });
			const countQuery = capturedQueries.find(
				(q) =>
					q.sql.toLowerCase().includes("count(") ||
					q.sql.toLowerCase().includes("count(*"),
			);
			expect(countQuery).toBeDefined();
		});
	});

	describe("sort direction", () => {
		it("should respect ASC sort direction for subject", async () => {
			await callGetClusterTickets({ sort: "subject", sort_dir: "asc" });
			const sql = getSelectQuery();
			expect(sql).toMatch(/order by.*lower\("subject"\)\s+asc/i);
		});

		it("should respect DESC sort direction for subject", async () => {
			await callGetClusterTickets({ sort: "subject", sort_dir: "desc" });
			const sql = getSelectQuery();
			expect(sql).toMatch(/order by.*lower\("subject"\)\s+desc/i);
		});
	});
});
