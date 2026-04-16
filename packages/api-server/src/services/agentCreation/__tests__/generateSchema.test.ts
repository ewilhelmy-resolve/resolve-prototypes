// Re-export after openapi mock
import { describe, expect, it, vi } from "vitest";
// Import the real zod (not the openapi mock) for schema testing
import { AgentGenerateBodySchema } from "../../../schemas/agent.js";

vi.mock("../../../docs/openapi.js", async () => {
	const { extendZodWithOpenApi, OpenAPIRegistry } = await import(
		"@asteasolutions/zod-to-openapi"
	);
	const { z } = await import("zod");
	extendZodWithOpenApi(z);
	return { z, registry: new OpenAPIRegistry() };
});

describe("AgentGenerateBodySchema", () => {
	it("should accept valid generate params (name + optional fields)", () => {
		const result = AgentGenerateBodySchema.safeParse({
			name: "Test Agent",
			description: "A test",
			instructions: "Do stuff",
			iconId: "bot",
			iconColorId: "blue",
			conversationStarters: ["Hi"],
			guardrails: ["No spam"],
		});
		expect(result.success).toBe(true);
	});

	it("should NOT accept role field", () => {
		const shape = AgentGenerateBodySchema.shape;
		expect(shape).not.toHaveProperty("role");
	});

	it("should NOT accept agentType field", () => {
		const shape = AgentGenerateBodySchema.shape;
		expect(shape).not.toHaveProperty("agentType");
	});

	it("should NOT accept knowledgeSources field", () => {
		const shape = AgentGenerateBodySchema.shape;
		expect(shape).not.toHaveProperty("knowledgeSources");
	});

	it("should NOT accept tools field", () => {
		const shape = AgentGenerateBodySchema.shape;
		expect(shape).not.toHaveProperty("tools");
	});

	it("should NOT accept capabilities field", () => {
		const shape = AgentGenerateBodySchema.shape;
		expect(shape).not.toHaveProperty("capabilities");
	});
});
