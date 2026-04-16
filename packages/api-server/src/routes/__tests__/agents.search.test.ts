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
		configs: {},
		markdown_text: "",
		sys_date_created: "2025-01-01T00:00:00Z",
		sys_date_updated: "2025-01-01T00:00:00Z",
		sys_created_by: "test@example.com",
		sys_updated_by: "test@example.com",
		...overrides,
	};
}

describe("GET /api/agents - search", () => {
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

	it("uses filterAgents with tenant scope when no search param", async () => {
		mockFilterAgents.mockResolvedValue([makeAgent()]);

		const res = await request(app).get("/api/agents").expect(200);

		expect(mockFilterAgents).toHaveBeenCalled();
		expect(mockListAgents).not.toHaveBeenCalled();
		const query = mockFilterAgents.mock.calls[0][0];
		expect(query).toContain('tenant__exact="test-org-id"');
		expect(res.body.agents).toHaveLength(1);
	});

	it("uses filterAgents when search param present", async () => {
		mockFilterAgents.mockResolvedValue([makeAgent({ name: "HR Bot" })]);

		const res = await request(app).get("/api/agents?search=HR").expect(200);

		expect(mockFilterAgents).toHaveBeenCalled();
		expect(mockListAgents).not.toHaveBeenCalled();
		expect(res.body.agents).toHaveLength(1);
		expect(res.body.agents[0].name).toBe("HR Bot");
	});

	it("builds OR query for name and description", async () => {
		mockFilterAgents.mockResolvedValue([]);

		await request(app).get("/api/agents?search=hello").expect(200);

		const query = mockFilterAgents.mock.calls[0][0];
		expect(query).toContain('name__icontains="hello"');
		expect(query).toContain('description__icontains="hello"');
		expect(query).toContain("|");
	});

	it("combines search with active filter", async () => {
		mockFilterAgents.mockResolvedValue([]);

		await request(app).get("/api/agents?search=bot&active=true").expect(200);

		const query = mockFilterAgents.mock.calls[0][0];
		expect(query).toContain('name__icontains="bot"');
		expect(query).toContain('description__icontains="bot"');
		expect(query).toContain("active__exact=true");
		expect(query).toContain("&");
	});

	it("escapes double quotes in search param", async () => {
		mockFilterAgents.mockResolvedValue([]);

		await request(app).get('/api/agents?search=say "hello"').expect(200);

		const query = mockFilterAgents.mock.calls[0][0];
		expect(query).toContain('say \\"hello\\"');
	});

	it("passes limit and offset to filterAgents", async () => {
		mockFilterAgents.mockResolvedValue([]);

		await request(app)
			.get("/api/agents?search=test&limit=10&offset=20")
			.expect(200);

		const opts = mockFilterAgents.mock.calls[0][1];
		expect(opts).toEqual(expect.objectContaining({ limit: 10, offset: 20 }));
	});

	it("uses filterAgents with tenant scope for empty search string", async () => {
		mockFilterAgents.mockResolvedValue([]);

		await request(app).get("/api/agents?search=").expect(200);

		expect(mockFilterAgents).toHaveBeenCalled();
		expect(mockListAgents).not.toHaveBeenCalled();
		const query = mockFilterAgents.mock.calls[0][0];
		expect(query).toContain('tenant__exact="test-org-id"');
	});
});
