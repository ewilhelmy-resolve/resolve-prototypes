import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
	mockCreateAgent,
	mockUpdateAgent,
	mockListAgents,
	mockFilterAgents,
	mockListTasks,
	mockGetAgent,
	mockGetAgentByName,
	mockDeleteAgent,
	mockAssertAgentOrg,
} = vi.hoisted(() => ({
	mockCreateAgent: vi.fn(),
	mockUpdateAgent: vi.fn(),
	mockListAgents: vi.fn(),
	mockFilterAgents: vi.fn(),
	mockListTasks: vi.fn(),
	mockGetAgent: vi.fn(),
	mockGetAgentByName: vi.fn(),
	mockDeleteAgent: vi.fn(),
	mockAssertAgentOrg: vi.fn(),
}));

vi.mock("../../services/AgenticService.js", () => ({
	AgenticService: class MockAgenticService {
		createAgent = mockCreateAgent;
		updateAgent = mockUpdateAgent;
		listAgents = mockListAgents;
		filterAgents = mockFilterAgents;
		listTasks = mockListTasks;
		getAgent = mockGetAgent;
		getAgentByName = mockGetAgentByName;
		deleteAgent = mockDeleteAgent;
		assertAgentOrg = mockAssertAgentOrg;
	},
}));

vi.mock("../../docs/openapi.js", async () => {
	const { extendZodWithOpenApi, OpenAPIRegistry } = await import(
		"@asteasolutions/zod-to-openapi"
	);
	const { z } = await import("zod");
	extendZodWithOpenApi(z);
	return {
		z,
		registry: new OpenAPIRegistry(),
	};
});

vi.mock("../../config/logger.js", () => ({
	logger: {
		info: vi.fn(),
		error: vi.fn(),
		warn: vi.fn(),
		debug: vi.fn(),
	},
	dbLogger: {
		info: vi.fn(),
		error: vi.fn(),
		warn: vi.fn(),
		debug: vi.fn(),
		fatal: vi.fn(),
	},
}));

vi.mock("../../services/agentCreation/index.js", () => ({
	getAgentCreationStrategy: vi.fn(),
}));

const mockMetaExecute = vi.fn();
vi.mock("../../services/metaAgentExecution/index.js", () => ({
	getMetaAgentStrategy: vi.fn(() => ({
		execute: mockMetaExecute,
		cancel: vi.fn(),
	})),
}));

vi.mock("../../config/database.js", () => ({
	pool: { query: vi.fn() },
	withOrgContext: vi.fn(),
}));

vi.mock("../../middleware/auth.js", () => ({
	authenticateUser: vi.fn((req: any, _res: any, next: any) => {
		req.user = {
			id: "test-user-id",
			activeOrganizationId: "test-org-id",
			email: "test@example.com",
			role: "owner",
		};
		next();
	}),
}));

import agentRoutes from "../agents.js";

function makeAgent(overrides: Record<string, unknown> = {}) {
	return {
		id: 1,
		eid: "eid-001",
		name: "Test Agent",
		description: "A test agent",
		active: true,
		tenant: "test-org-id",
		configs: {},
		markdown_text: "",
		sys_date_created: "2025-01-01T00:00:00Z",
		sys_date_updated: "2025-01-01T00:00:00Z",
		sys_created_by: "test@example.com",
		sys_updated_by: "test@example.com",
		...overrides,
	};
}

function make404Error() {
	const err: any = new Error("Agent not found");
	err.response = { status: 404 };
	return err;
}

describe("Agent tenant isolation", () => {
	let app: express.Application;

	beforeEach(() => {
		app = express();
		app.use(express.json());
		app.use(
			"/api/agents",
			(req: any, _res: any, next: any) => {
				req.user = {
					id: "test-user-id",
					activeOrganizationId: "test-org-id",
					email: "test@example.com",
					role: "owner",
				};
				next();
			},
			agentRoutes,
		);
		vi.clearAllMocks();
		mockListTasks.mockResolvedValue([]);
	});

	// ── Suite A: GET /api/agents — tenant scoping ──────────────────

	describe("GET /api/agents - tenant scoping", () => {
		it("includes tenant__exact in search query", async () => {
			mockFilterAgents.mockResolvedValue([makeAgent({ name: "HR Bot" })]);

			await request(app).get("/api/agents?search=HR").expect(200);

			const query = mockFilterAgents.mock.calls[0][0];
			expect(query).toContain('tenant__exact="test-org-id"');
		});

		it("uses filterAgents with tenant scope when no search param", async () => {
			mockFilterAgents.mockResolvedValue([makeAgent()]);

			await request(app).get("/api/agents").expect(200);

			expect(mockFilterAgents).toHaveBeenCalled();
			expect(mockListAgents).not.toHaveBeenCalled();
			const query = mockFilterAgents.mock.calls[0][0];
			expect(query).toContain('tenant__exact="test-org-id"');
		});

		it("combines tenant with active filter", async () => {
			mockFilterAgents.mockResolvedValue([]);

			await request(app).get("/api/agents?active=true").expect(200);

			const query = mockFilterAgents.mock.calls[0][0];
			expect(query).toContain('tenant__exact="test-org-id"');
			expect(query).toContain("active__exact=true");
		});

		it("combines tenant + search + active", async () => {
			mockFilterAgents.mockResolvedValue([]);

			await request(app).get("/api/agents?search=bot&active=true").expect(200);

			const query = mockFilterAgents.mock.calls[0][0];
			expect(query).toContain('tenant__exact="test-org-id"');
			expect(query).toContain('name__icontains="bot"');
			expect(query).toContain("active__exact=true");
		});
	});

	// ── Suite B: GET /api/agents/check-name — tenant scoping ──────

	describe("GET /api/agents/check-name - tenant scoping", () => {
		it("uses filterAgents with name__exact and tenant__exact", async () => {
			mockFilterAgents.mockResolvedValue([]);

			await request(app).get("/api/agents/check-name?name=MyBot").expect(200);

			expect(mockFilterAgents).toHaveBeenCalled();
			expect(mockGetAgentByName).not.toHaveBeenCalled();
			const query = mockFilterAgents.mock.calls[0][0];
			expect(query).toContain('name__exact="MyBot"');
			expect(query).toContain('tenant__exact="test-org-id"');
		});

		it("returns available:true when no match in tenant", async () => {
			mockFilterAgents.mockResolvedValue([]);

			const res = await request(app)
				.get("/api/agents/check-name?name=MyBot")
				.expect(200);

			expect(res.body.available).toBe(true);
		});

		it("returns available:false when name exists in tenant", async () => {
			mockFilterAgents.mockResolvedValue([makeAgent({ name: "MyBot" })]);

			const res = await request(app)
				.get("/api/agents/check-name?name=MyBot")
				.expect(200);

			expect(res.body.available).toBe(false);
		});
	});

	// ── Suite C: GET /api/agents/:eid — ownership gate ─────────────

	describe("GET /api/agents/:eid - ownership gate", () => {
		it("returns agent when assertAgentOrg succeeds", async () => {
			mockAssertAgentOrg.mockResolvedValue(makeAgent());

			const res = await request(app).get("/api/agents/eid-001").expect(200);

			expect(mockAssertAgentOrg).toHaveBeenCalledWith("eid-001", "test-org-id");
			expect(res.body.name).toBe("Test Agent");
		});

		it("returns 404 when assertAgentOrg throws 404", async () => {
			mockAssertAgentOrg.mockRejectedValue(make404Error());

			const res = await request(app).get("/api/agents/eid-001").expect(404);

			expect(res.body).toEqual({ error: "Agent not found", code: "NOT_FOUND" });
		});
	});

	// ── Suite D: DELETE /api/agents/:eid — ownership gate ──────────

	describe("DELETE /api/agents/:eid - ownership gate", () => {
		it("calls assertAgentOrg before deleteAgent", async () => {
			mockAssertAgentOrg.mockResolvedValue(makeAgent());
			mockDeleteAgent.mockResolvedValue({
				success: true,
				message: "Deleted",
			});

			await request(app).delete("/api/agents/eid-001").expect(200);

			expect(mockAssertAgentOrg).toHaveBeenCalledWith("eid-001", "test-org-id");
			expect(mockDeleteAgent).toHaveBeenCalledWith("eid-001");
		});

		it("returns 404 without calling deleteAgent when org mismatch", async () => {
			mockAssertAgentOrg.mockRejectedValue(make404Error());

			const res = await request(app).delete("/api/agents/eid-001").expect(404);

			expect(mockDeleteAgent).not.toHaveBeenCalled();
			expect(res.body).toEqual({ error: "Agent not found", code: "NOT_FOUND" });
		});
	});

	// ── Suite E: PUT /api/agents/:eid — ownership gate ─────────────

	describe("PUT /api/agents/:eid - ownership gate", () => {
		it("calls assertAgentOrg before updateAgent", async () => {
			mockAssertAgentOrg.mockResolvedValue(makeAgent());
			mockUpdateAgent.mockResolvedValue(makeAgent({ name: "Updated" }));

			await request(app)
				.put("/api/agents/eid-001")
				.send({ name: "Updated" })
				.expect(200);

			expect(mockAssertAgentOrg).toHaveBeenCalledWith("eid-001", "test-org-id");
			expect(mockUpdateAgent).toHaveBeenCalled();
		});

		it("returns 404 without calling updateAgent when org mismatch", async () => {
			mockAssertAgentOrg.mockRejectedValue(make404Error());

			const res = await request(app)
				.put("/api/agents/eid-001")
				.send({ name: "Updated" })
				.expect(404);

			expect(mockUpdateAgent).not.toHaveBeenCalled();
			expect(res.body).toEqual({ error: "Agent not found", code: "NOT_FOUND" });
		});
	});

	// ── Suite F: POST /api/agents/:eid/execute — ownership gate ────

	describe("POST /api/agents/:eid/execute - ownership gate", () => {
		it("uses assertAgentOrg and executes when org matches", async () => {
			mockAssertAgentOrg.mockResolvedValue(makeAgent({ name: "TestAgent" }));
			mockMetaExecute.mockResolvedValue({
				executionRequestId: "exec-req-1",
			});

			const res = await request(app)
				.post("/api/agents/eid-001/execute")
				.send({ message: "Hello" })
				.expect(202);

			expect(mockAssertAgentOrg).toHaveBeenCalledWith("eid-001", "test-org-id");
			expect(res.body.executionRequestId).toBe("exec-req-1");
		});

		it("returns 404 when org mismatch on execute", async () => {
			mockAssertAgentOrg.mockRejectedValue(make404Error());

			const res = await request(app)
				.post("/api/agents/eid-001/execute")
				.send({ message: "Hello" })
				.expect(404);

			expect(mockMetaExecute).not.toHaveBeenCalled();
			expect(res.body).toEqual({ error: "Agent not found", code: "NOT_FOUND" });
		});
	});
});
