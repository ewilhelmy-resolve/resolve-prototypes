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
	mockExecutePromptCompletion,
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
	mockExecutePromptCompletion: vi.fn(),
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
		executePromptCompletion = mockExecutePromptCompletion;
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

		it("combines tenant with state filter", async () => {
			mockFilterAgents.mockResolvedValue([]);

			await request(app).get("/api/agents?state=PUBLISHED").expect(200);

			const query = mockFilterAgents.mock.calls[0][0];
			expect(query).toContain('tenant__exact="test-org-id"');
			expect(query).toContain('state__exact="PUBLISHED"');
		});

		it("combines tenant + search + state", async () => {
			mockFilterAgents.mockResolvedValue([]);

			await request(app)
				.get("/api/agents?search=bot&state=PUBLISHED")
				.expect(200);

			const query = mockFilterAgents.mock.calls[0][0];
			expect(query).toContain('tenant__exact="test-org-id"');
			expect(query).toContain('name__icontains="bot"');
			expect(query).toContain('state__exact="PUBLISHED"');
		});
	});

	// ── Suite A2: GET /api/agents — admin_type scoping ─────────────
	// Builder list must exclude platform/system-owned agents (admin_type="system").

	describe('GET /api/agents - admin_type="user" scoping', () => {
		it('includes admin_type__exact="user" when no search param', async () => {
			mockFilterAgents.mockResolvedValue([]);

			await request(app).get("/api/agents").expect(200);

			const query = mockFilterAgents.mock.calls[0][0];
			expect(query).toContain('admin_type__exact="user"');
		});

		it('includes admin_type__exact="user" combined with state', async () => {
			mockFilterAgents.mockResolvedValue([]);

			await request(app).get("/api/agents?state=DRAFT").expect(200);

			const query = mockFilterAgents.mock.calls[0][0];
			expect(query).toContain('admin_type__exact="user"');
			expect(query).toContain('state__exact="DRAFT"');
			expect(query).toContain('tenant__exact="test-org-id"');
		});

		it('distributes admin_type__exact="user" across every OR branch when search is present', async () => {
			mockFilterAgents.mockResolvedValue([]);

			await request(app).get("/api/agents?search=bot").expect(200);

			const query = mockFilterAgents.mock.calls[0][0] as string;
			// Django-style filter has no parens — AND binds tighter than OR, so
			// admin_type must appear on both sides of the `|` to scope each branch.
			const branches = query.split("|");
			expect(branches.length).toBeGreaterThanOrEqual(2);
			for (const branch of branches) {
				expect(branch).toContain('admin_type__exact="user"');
			}
		});
	});

	// ── Suite A3: GET /api/agents — owner filter (server-side) ─────

	describe("GET /api/agents - owner filter", () => {
		it('owner=me emits sys_created_by__exact="<caller email>"', async () => {
			mockFilterAgents.mockResolvedValue([]);

			await request(app).get("/api/agents?owner=me").expect(200);

			const query = mockFilterAgents.mock.calls[0][0] as string;
			expect(query).toContain('sys_created_by__exact="test@example.com"');
			expect(query).not.toContain("^sys_created_by");
		});

		it('owner=others emits negated ^sys_created_by__exact="<caller email>"', async () => {
			mockFilterAgents.mockResolvedValue([]);

			await request(app).get("/api/agents?owner=others").expect(200);

			const query = mockFilterAgents.mock.calls[0][0] as string;
			expect(query).toContain('^sys_created_by__exact="test@example.com"');
		});

		it("no owner param → no sys_created_by clause", async () => {
			mockFilterAgents.mockResolvedValue([]);

			await request(app).get("/api/agents").expect(200);

			const query = mockFilterAgents.mock.calls[0][0] as string;
			expect(query).not.toContain("sys_created_by");
		});

		it("distributes owner filter across every OR branch when search is present", async () => {
			mockFilterAgents.mockResolvedValue([]);

			await request(app).get("/api/agents?search=bot&owner=me").expect(200);

			const query = mockFilterAgents.mock.calls[0][0] as string;
			const branches = query.split("|");
			expect(branches.length).toBeGreaterThanOrEqual(2);
			for (const branch of branches) {
				expect(branch).toContain('sys_created_by__exact="test@example.com"');
			}
		});

		it("ignores invalid owner value and does not add sys_created_by clause", async () => {
			// Zod enum rejects anything other than 'me'/'others'; route currently
			// 500s on validation error, so filterAgents must not be called with
			// a half-built query.
			mockFilterAgents.mockResolvedValue([]);

			await request(app).get("/api/agents?owner=bogus");

			if (mockFilterAgents.mock.calls.length > 0) {
				const query = mockFilterAgents.mock.calls[0][0] as string;
				expect(query).not.toContain("sys_created_by");
			}
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

		it("never sends tenant on PUT (LLM Service returns 500 if present) but forwards icon + starters + guardrails", async () => {
			mockAssertAgentOrg.mockResolvedValue(makeAgent());
			mockUpdateAgent.mockResolvedValue(makeAgent({ name: "Anime Agent" }));

			await request(app)
				.put("/api/agents/eid-001")
				.send({
					name: "Anime Agent",
					description: "",
					iconId: "rocket",
					iconColorId: "rose",
					conversationStarters: ["What's the latest anime news?"],
					guardrails: [],
				})
				.expect(200);

			const [calledEid, putPayload] = mockUpdateAgent.mock.calls[0];
			expect(calledEid).toBe("eid-001");
			expect(putPayload).not.toHaveProperty("tenant");
			expect(putPayload).toMatchObject({
				name: "Anime Agent",
				ui_configs: { icon: "rocket", icon_color: "rose" },
				conversation_starters: ["What's the latest anime news?"],
				guardrails: [],
				sys_updated_by: "test@example.com",
			});
		});

		it("does not leak defaulted fields when the client omits them (prevents PUBLISHED → DRAFT regression)", async () => {
			// The client sends an icon-only PUT and expects the agent's lifecycle
			// state, admin_type, and other create-time defaults to remain
			// untouched. AgentUpdateBodySchema must NOT resurrect .default(...)
			// values from AgentCreateBodySchema — they would silently flip a
			// PUBLISHED agent back to DRAFT.
			mockAssertAgentOrg.mockResolvedValue(
				makeAgent({ state: "PUBLISHED", admin_type: "user" }),
			);
			mockUpdateAgent.mockResolvedValue(
				makeAgent({ name: "Anime Agent", state: "PUBLISHED" }),
			);

			await request(app)
				.put("/api/agents/eid-001")
				.send({
					name: "Anime Agent",
					iconId: "rocket",
					iconColorId: "rose",
				})
				.expect(200);

			const [, putPayload] = mockUpdateAgent.mock.calls[0];
			expect(putPayload).not.toHaveProperty("state");
			expect(putPayload).not.toHaveProperty("admin_type");
		});

		it("forwards explicit state/adminType when the client does send them", async () => {
			mockAssertAgentOrg.mockResolvedValue(makeAgent());
			mockUpdateAgent.mockResolvedValue(makeAgent({ state: "PUBLISHED" }));

			await request(app)
				.put("/api/agents/eid-001")
				.send({ name: "Anime Agent", state: "PUBLISHED", adminType: "system" })
				.expect(200);

			const [, putPayload] = mockUpdateAgent.mock.calls[0];
			expect(putPayload.state).toBe("PUBLISHED");
			expect(putPayload.admin_type).toBe("system");
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

	// ── Suite G: POST /api/agents/generate — name+tenant uniqueness gate ──

	describe("POST /api/agents/generate - name+tenant uniqueness gate", () => {
		const mockStrategyCreate = vi.fn();

		beforeEach(async () => {
			const { getAgentCreationStrategy } = await import(
				"../../services/agentCreation/index.js"
			);
			(getAgentCreationStrategy as any).mockReturnValue({
				createAgent: mockStrategyCreate,
				sendInput: vi.fn(),
				cancel: vi.fn(),
			});
			mockStrategyCreate.mockResolvedValue({
				mode: "async",
				creationId: "creation-1",
			});
		});

		it("rejects with 409 when an agent with the same name exists in the caller's tenant", async () => {
			mockFilterAgents.mockResolvedValue([makeAgent({ name: "MyBot" })]);

			const res = await request(app)
				.post("/api/agents/generate")
				.send({ name: "MyBot" })
				.expect(409);

			expect(res.body.code).toBe("NAME_TAKEN");
			expect(mockStrategyCreate).not.toHaveBeenCalled();
			const query = mockFilterAgents.mock.calls[0][0];
			expect(query).toContain('name__exact="MyBot"');
			expect(query).toContain('tenant__exact="test-org-id"');
		});

		it("invokes the strategy when name is free in the caller's tenant", async () => {
			mockFilterAgents.mockResolvedValue([]);
			// CREATE always does shell-first now — route must write the shell
			// before invoking the strategy.
			mockCreateAgent.mockResolvedValue(
				makeAgent({ eid: "shell-from-route", name: "NewBot" }),
			);

			await request(app)
				.post("/api/agents/generate")
				.send({ name: "NewBot" })
				.expect(202);

			expect(mockStrategyCreate).toHaveBeenCalled();
		});

		it("skips the uniqueness check in UPDATE mode (targetAgentEid present)", async () => {
			// UPDATE mode patches an existing agent — name may stay the same.
			await request(app)
				.post("/api/agents/generate")
				.send({
					name: "MyBot",
					targetAgentEid: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
				})
				.expect(202);

			expect(mockFilterAgents).not.toHaveBeenCalled();
			expect(mockStrategyCreate).toHaveBeenCalled();
		});
	});

	// ── Suite H: POST /api/agents/generate — shell-first is the default/only path ──

	describe("POST /api/agents/generate - shell-first is default", () => {
		const mockStrategyCreate = vi.fn();

		beforeEach(async () => {
			const { getAgentCreationStrategy } = await import(
				"../../services/agentCreation/index.js"
			);
			(getAgentCreationStrategy as any).mockReturnValue({
				createAgent: mockStrategyCreate,
				sendInput: vi.fn(),
				cancel: vi.fn(),
			});
			mockStrategyCreate.mockResolvedValue({
				mode: "async",
				creationId: "creation-1",
			});
			mockFilterAgents.mockResolvedValue([]);
		});

		it("CREATE writes shell via POST /agents/metadata with cheap fields, then invokes strategy in UPDATE mode", async () => {
			mockCreateAgent.mockResolvedValue(
				makeAgent({ eid: "new-shell-eid", name: "NewBot" }),
			);

			await request(app)
				.post("/api/agents/generate")
				.send({
					name: "NewBot",
					description: "Triage bot",
					iconId: "bot",
					iconColorId: "slate",
					conversationStarters: ["Hi"],
					guardrails: ["No HR topics"],
				})
				.expect(202);

			expect(mockCreateAgent).toHaveBeenCalledTimes(1);
			const shellPayload = mockCreateAgent.mock.calls[0][0];
			expect(shellPayload.name).toBe("NewBot");
			expect(shellPayload.tenant).toBe("test-org-id");
			expect(shellPayload.state).toBe("DRAFT");
			expect(shellPayload.active).toBe(true);
			expect(shellPayload.admin_type).toBe("user");
			expect(shellPayload.conversation_starters).toEqual(["Hi"]);
			expect(shellPayload.guardrails).toEqual(["No HR topics"]);
			expect(shellPayload.ui_configs).toEqual({
				icon: "bot",
				icon_color: "slate",
			});
			expect(shellPayload.sys_created_by).toBe("test@example.com");
			expect(shellPayload.sys_updated_by).toBe("test@example.com");
			// Ships with the default LLM execution config so the agent is
			// executable immediately after shell creation.
			expect(shellPayload.configs).toEqual({
				llm_parameters: { model: "claude-opus-4-5-20251101" },
				verbose: false,
			});
			// CRITICAL: do NOT send instructions or tasks at shell time — those
			// are the meta-agent's job. Do NOT send an LLM-inferred prompt.
			expect(shellPayload).not.toHaveProperty("instructions");
			expect(shellPayload).not.toHaveProperty("tasks");

			expect(mockStrategyCreate).toHaveBeenCalledTimes(1);
			const strategyArgs = mockStrategyCreate.mock.calls[0][0];
			expect(strategyArgs.targetAgentEid).toBe("new-shell-eid");
			expect(strategyArgs.shellAlreadyCreated).toBe(true);
		});

		it("CREATE defaults empty arrays for starters/guardrails when client omits them", async () => {
			mockCreateAgent.mockResolvedValue(
				makeAgent({ eid: "shell-defaults", name: "NewBot" }),
			);

			await request(app)
				.post("/api/agents/generate")
				.send({ name: "NewBot" })
				.expect(202);

			const shellPayload = mockCreateAgent.mock.calls[0][0];
			expect(shellPayload.conversation_starters).toEqual([]);
			expect(shellPayload.guardrails).toEqual([]);
			expect(shellPayload.admin_type).toBe("user");
		});

		it("CREATE returns 502 when shell POST fails; strategy NOT invoked", async () => {
			const err: any = new Error("Upstream failed");
			err.response = { status: 500 };
			mockCreateAgent.mockRejectedValue(err);

			await request(app)
				.post("/api/agents/generate")
				.send({ name: "NewBot" })
				.expect(502);

			expect(mockStrategyCreate).not.toHaveBeenCalled();
		});

		it("UPDATE body (targetAgentEid present): bypasses shell create and forwards eid", async () => {
			mockUpdateAgent.mockResolvedValue(makeAgent({ eid: "existing-eid" }));

			await request(app)
				.post("/api/agents/generate")
				.send({
					name: "MyBot",
					targetAgentEid: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
				})
				.expect(202);

			expect(mockCreateAgent).not.toHaveBeenCalled();
			const strategyArgs = mockStrategyCreate.mock.calls[0][0];
			expect(strategyArgs.targetAgentEid).toBe(
				"3fa85f64-5717-4562-b3fc-2c963f66afa6",
			);
			expect(strategyArgs.shellAlreadyCreated).toBe(false);
		});

		it("UPDATE re-applies cheap fields directly via PUT before invoking the meta-agent", async () => {
			mockUpdateAgent.mockResolvedValue(makeAgent({ eid: "existing-eid" }));

			await request(app)
				.post("/api/agents/generate")
				.send({
					name: "RenamedBot",
					description: "updated desc",
					iconId: "wrench",
					iconColorId: "red",
					conversationStarters: ["hi there"],
					guardrails: ["no PII"],
					targetAgentEid: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
				})
				.expect(202);

			expect(mockUpdateAgent).toHaveBeenCalledTimes(1);
			const [calledEid, putPayload] = mockUpdateAgent.mock.calls[0];
			expect(calledEid).toBe("3fa85f64-5717-4562-b3fc-2c963f66afa6");
			expect(putPayload).toMatchObject({
				name: "RenamedBot",
				description: "updated desc",
				admin_type: "user",
				conversation_starters: ["hi there"],
				guardrails: ["no PII"],
				ui_configs: { icon: "wrench", icon_color: "red" },
				sys_updated_by: "test@example.com",
			});
			// Tenant must NOT be sent on PUT — LLM Service returns 500 if it is.
			expect(putPayload).not.toHaveProperty("tenant");
			// state/active/sys_created_by belong to CREATE only.
			expect(putPayload).not.toHaveProperty("state");
			expect(putPayload).not.toHaveProperty("active");
			expect(putPayload).not.toHaveProperty("sys_created_by");
		});

		it("UPDATE still invokes the meta-agent even if the cheap PUT fails (best-effort)", async () => {
			const err: any = new Error("PUT upstream failed");
			err.response = { status: 500 };
			mockUpdateAgent.mockRejectedValue(err);

			await request(app)
				.post("/api/agents/generate")
				.send({
					name: "MyBot",
					targetAgentEid: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
				})
				.expect(202);

			expect(mockUpdateAgent).toHaveBeenCalledTimes(1);
			expect(mockStrategyCreate).toHaveBeenCalledTimes(1);
		});

		// ── generateDescription flag — auto-generate description ──────
		describe("generateDescription flag", () => {
			const GENERATED_COMPLETION = {
				data: [
					"---INSTRUCTIONS---",
					"Do the thing",
					"---END_INSTRUCTIONS---",
					"",
					"---DESCRIPTION---",
					"Auto-generated description of the agent.",
					"---END_DESCRIPTION---",
				].join("\n"),
			};

			it("CREATE with generateDescription=true calls the improver prompt and writes the generated description to the shell", async () => {
				mockExecutePromptCompletion.mockResolvedValue(GENERATED_COMPLETION);
				mockCreateAgent.mockResolvedValue(
					makeAgent({ eid: "shell-gen", name: "NewBot" }),
				);

				await request(app)
					.post("/api/agents/generate")
					.send({
						name: "NewBot",
						description: "",
						instructions: "Handle IT tickets end-to-end.",
						generateDescription: true,
					})
					.expect(202);

				expect(mockExecutePromptCompletion).toHaveBeenCalledTimes(1);
				expect(mockExecutePromptCompletion).toHaveBeenCalledWith(
					expect.objectContaining({
						promptName: "prompt_improve_agent_instructions",
						promptParameters: expect.objectContaining({
							utterance: "Handle IT tickets end-to-end.",
						}),
					}),
				);

				const shellPayload = mockCreateAgent.mock.calls[0][0];
				expect(shellPayload.description).toBe(
					"Auto-generated description of the agent.",
				);
			});

			it("UPDATE with generateDescription=true uses the generated description in the cheap-fields PUT", async () => {
				mockExecutePromptCompletion.mockResolvedValue(GENERATED_COMPLETION);
				mockUpdateAgent.mockResolvedValue(makeAgent({ eid: "existing-eid" }));

				await request(app)
					.post("/api/agents/generate")
					.send({
						name: "MyBot",
						description: "stale desc",
						instructions: "Updated instructions prose.",
						targetAgentEid: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
						generateDescription: true,
					})
					.expect(202);

				expect(mockExecutePromptCompletion).toHaveBeenCalledTimes(1);
				const [, putPayload] = mockUpdateAgent.mock.calls[0];
				expect(putPayload.description).toBe(
					"Auto-generated description of the agent.",
				);
			});

			it("skips the prompt call when generateDescription is false or omitted", async () => {
				mockCreateAgent.mockResolvedValue(
					makeAgent({ eid: "shell-no-gen", name: "NewBot" }),
				);

				await request(app)
					.post("/api/agents/generate")
					.send({
						name: "NewBot",
						description: "user-written",
						instructions: "Handle IT tickets.",
					})
					.expect(202);

				expect(mockExecutePromptCompletion).not.toHaveBeenCalled();
				const shellPayload = mockCreateAgent.mock.calls[0][0];
				expect(shellPayload.description).toBe("user-written");
			});

			it("skips the prompt call when the flag is true but instructions is empty (nothing to generate from)", async () => {
				mockCreateAgent.mockResolvedValue(
					makeAgent({ eid: "shell-empty-instr", name: "NewBot" }),
				);

				await request(app)
					.post("/api/agents/generate")
					.send({
						name: "NewBot",
						description: "",
						instructions: "",
						generateDescription: true,
					})
					.expect(202);

				expect(mockExecutePromptCompletion).not.toHaveBeenCalled();
			});

			it("falls back to the client-supplied description when the prompt call fails", async () => {
				mockExecutePromptCompletion.mockRejectedValue(
					new Error("completion upstream failed"),
				);
				mockCreateAgent.mockResolvedValue(
					makeAgent({ eid: "shell-fallback", name: "NewBot" }),
				);

				await request(app)
					.post("/api/agents/generate")
					.send({
						name: "NewBot",
						description: "fallback desc",
						instructions: "Handle IT tickets.",
						generateDescription: true,
					})
					.expect(202);

				expect(mockExecutePromptCompletion).toHaveBeenCalledTimes(1);
				const shellPayload = mockCreateAgent.mock.calls[0][0];
				expect(shellPayload.description).toBe("fallback desc");
			});
		});
	});
});
