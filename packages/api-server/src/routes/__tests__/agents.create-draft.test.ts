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
} = vi.hoisted(() => ({
	mockCreateAgent: vi.fn(),
	mockUpdateAgent: vi.fn(),
	mockListAgents: vi.fn(),
	mockListTasks: vi.fn(),
	mockGetAgent: vi.fn(),
	mockGetAgentByName: vi.fn(),
	mockDeleteAgent: vi.fn(),
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
		// Simulate the authenticateUser middleware applied at mount in index.ts
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

	it("returns status 'draft' even when LLM Service returns active:true", async () => {
		// LLM Service ignores active:false and returns active:true
		mockCreateAgent.mockResolvedValue({
			eid: "agent-123",
			name: "Store Hours Manager",
			description: "",
			markdown_text: "",
			active: true,
			configs: {},
		});

		mockUpdateAgent.mockResolvedValue({
			eid: "agent-123",
			name: "Store Hours Manager",
			description: "",
			markdown_text: "",
			active: false,
			configs: {},
		});

		const res = await request(app)
			.post("/api/agents")
			.send({ name: "Store Hours Manager", status: "draft" })
			.expect(201);

		expect(res.body.status).toBe("draft");
	});

	it("does not call updateAgent when LLM Service respects active:false", async () => {
		mockCreateAgent.mockResolvedValue({
			eid: "agent-456",
			name: "Test Agent",
			description: "",
			markdown_text: "",
			active: false,
			configs: {},
		});

		const res = await request(app)
			.post("/api/agents")
			.send({ name: "Test Agent", status: "draft" })
			.expect(201);

		expect(res.body.status).toBe("draft");
		expect(mockUpdateAgent).not.toHaveBeenCalled();
	});

	it("sends sys_created_by AND sys_updated_by with user email on create", async () => {
		mockCreateAgent.mockResolvedValue({
			eid: "agent-789",
			name: "My Agent",
			description: "",
			markdown_text: "",
			active: false,
			sys_created_by: "test@example.com",
			sys_updated_by: "test@example.com",
			configs: {},
		});

		await request(app)
			.post("/api/agents")
			.send({ name: "My Agent", status: "draft" })
			.expect(201);

		// Both fields should be set to the authenticated user's email
		expect(mockCreateAgent).toHaveBeenCalledWith(
			expect.objectContaining({
				sys_created_by: "test@example.com",
				sys_updated_by: "test@example.com",
			}),
		);
	});

	it("sends sys_updated_by in corrective update when LLM Service returns active:true", async () => {
		mockCreateAgent.mockResolvedValue({
			eid: "agent-101",
			name: "Draft Agent",
			description: "",
			markdown_text: "",
			active: true,
			sys_created_by: "test@example.com",
			configs: {},
		});

		mockUpdateAgent.mockResolvedValue({
			eid: "agent-101",
			name: "Draft Agent",
			description: "",
			markdown_text: "",
			active: false,
			sys_created_by: "test@example.com",
			sys_updated_by: "test@example.com",
			configs: {},
		});

		await request(app)
			.post("/api/agents")
			.send({ name: "Draft Agent", status: "draft" })
			.expect(201);

		// Corrective update should include sys_updated_by
		expect(mockUpdateAgent).toHaveBeenCalledWith(
			"agent-101",
			expect.objectContaining({
				sys_updated_by: "test@example.com",
			}),
		);
	});
});
