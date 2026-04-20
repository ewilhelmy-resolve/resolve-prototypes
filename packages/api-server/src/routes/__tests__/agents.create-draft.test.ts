import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
	mockCreateAgent,
	mockUpdateAgent,
	mockListAgents,
	mockListTasks,
	mockGetAgent,
	mockGetAgentByName,
	mockDeleteAgent,
	mockAssertAgentOrg,
} = vi.hoisted(() => ({
	mockCreateAgent: vi.fn(),
	mockUpdateAgent: vi.fn(),
	mockListAgents: vi.fn(),
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

describe("POST /api/agents - draft creation", () => {
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
	});

	it("forwards state verbatim and returns the LLM Service's persisted state", async () => {
		mockCreateAgent.mockResolvedValue({
			eid: "agent-123",
			name: "Store Hours Manager",
			description: "",
			markdown_text: "",
			active: true,
			state: "DRAFT",
			configs: {},
		});

		const res = await request(app)
			.post("/api/agents")
			.send({ name: "Store Hours Manager", state: "DRAFT" })
			.expect(201);

		expect(res.body.state).toBe("DRAFT");
		expect(mockCreateAgent).toHaveBeenCalledWith(
			expect.objectContaining({ state: "DRAFT" }),
		);
	});

	it("never follows the create with a corrective updateAgent", async () => {
		mockCreateAgent.mockResolvedValue({
			eid: "agent-456",
			name: "Test Agent",
			description: "",
			markdown_text: "",
			active: true,
			state: "DRAFT",
			configs: {},
		});

		await request(app)
			.post("/api/agents")
			.send({ name: "Test Agent", state: "DRAFT" })
			.expect(201);

		expect(mockUpdateAgent).not.toHaveBeenCalled();
	});

	it("sends sys_created_by AND sys_updated_by with user email on create", async () => {
		mockCreateAgent.mockResolvedValue({
			eid: "agent-789",
			name: "My Agent",
			description: "",
			markdown_text: "",
			active: true,
			state: "DRAFT",
			sys_created_by: "test@example.com",
			sys_updated_by: "test@example.com",
			configs: {},
		});

		await request(app)
			.post("/api/agents")
			.send({ name: "My Agent", state: "DRAFT" })
			.expect(201);

		expect(mockCreateAgent).toHaveBeenCalledWith(
			expect.objectContaining({
				sys_created_by: "test@example.com",
				sys_updated_by: "test@example.com",
			}),
		);
	});

	it("rejects unknown state values at the request boundary (never calls the LLM Service)", async () => {
		await request(app)
			.post("/api/agents")
			.send({ name: "Bad State", state: "weird" });

		expect(mockCreateAgent).not.toHaveBeenCalled();
	});

	it("ships the default LLM execution config so agents are executable out of the box", async () => {
		mockCreateAgent.mockResolvedValue({
			eid: "agent-cfg",
			name: "My Agent",
			description: "",
			markdown_text: "",
			active: true,
			state: "DRAFT",
			configs: {},
		});

		await request(app)
			.post("/api/agents")
			.send({ name: "My Agent" })
			.expect(201);

		expect(mockCreateAgent).toHaveBeenCalledWith(
			expect.objectContaining({
				configs: {
					llm_parameters: { model: "claude-opus-4-5-20251101" },
					verbose: false,
				},
			}),
		);
	});
});
