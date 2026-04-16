import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useConversationStarterGenerationStore } from "@/stores/conversationStarterGenerationStore";

// Track the data passed to the mutation
let lastMutationData: any = null;
const mockMutateAsync = vi.fn((data) => {
	lastMutationData = data;
	return Promise.resolve({ executionRequestId: "test-exec-id" });
});

vi.mock("./api/useAgents", () => ({
	useGenerateConversationStartersMutation: () => ({
		mutateAsync: mockMutateAsync,
		isPending: false,
	}),
}));

// Must import AFTER vi.mock
const { useGenerateConversationStarters } = await import(
	"./useGenerateConversationStarters"
);

describe("useGenerateConversationStarters", () => {
	beforeEach(() => {
		useConversationStarterGenerationStore.getState().reset();
		lastMutationData = null;
		mockMutateAsync.mockClear();
		mockMutateAsync.mockImplementation((data) => {
			lastMutationData = data;
			return Promise.resolve({ executionRequestId: "test-exec-id" });
		});
	});

	it("passes instructions to the mutation agentConfig", async () => {
		const { result } = renderHook(() => useGenerateConversationStarters());

		await act(async () => {
			await result.current.generate({
				name: "Test Agent",
				description: "A test agent",
				instructions: "## Role\nYou are a test assistant.",
				agentType: "knowledge",
				workflows: [],
				guardrails: [],
				knowledgeSources: [],
				capabilities: { webSearch: true },
			});
		});

		expect(lastMutationData).not.toBeNull();
		expect(lastMutationData.agentConfig.instructions).toBe(
			"## Role\nYou are a test assistant.",
		);
	});

	it("passes all agent config fields to the mutation", async () => {
		const { result } = renderHook(() => useGenerateConversationStarters());

		await act(async () => {
			await result.current.generate({
				name: "Sales Agent",
				description: "Helps with sales",
				instructions: "## Role\nSales assistant.",
				agentType: "workflow",
				workflows: ["CRM Lookup"],
				conversationStarters: ["Existing starter"],
				guardrails: ["No pricing info"],
				knowledgeSources: ["Product Catalog"],
				capabilities: { webSearch: true, imageGeneration: false },
			});
		});

		const config = lastMutationData.agentConfig;
		expect(config.name).toBe("Sales Agent");
		expect(config.description).toBe("Helps with sales");
		expect(config.instructions).toBe("## Role\nSales assistant.");
		expect(config.agentType).toBe("workflow");
		expect(config.workflows).toEqual(["CRM Lookup"]);
		expect(config.conversationStarters).toEqual(["Existing starter"]);
		expect(config.guardrails).toEqual(["No pricing info"]);
		expect(config.knowledgeSources).toEqual(["Product Catalog"]);
		expect(config.capabilities).toEqual({
			webSearch: true,
			imageGeneration: false,
		});
	});

	it("sets generationId from mutation response", async () => {
		const { result } = renderHook(() => useGenerateConversationStarters());

		await act(async () => {
			await result.current.generate({
				name: "Test",
				description: "",
				instructions: "some instructions",
			});
		});

		const store = useConversationStarterGenerationStore.getState();
		expect(store.generationId).toBe("test-exec-id");
		expect(store.status).toBe("generating");
	});

	it("transitions to error when mutation fails", async () => {
		mockMutateAsync.mockRejectedValueOnce(new Error("Network error"));

		const { result } = renderHook(() => useGenerateConversationStarters());

		await act(async () => {
			await result.current.generate({
				name: "Test",
				description: "",
				instructions: "instructions",
			});
		});

		const store = useConversationStarterGenerationStore.getState();
		expect(store.status).toBe("error");
		expect(store.error).toContain("Network error");
	});
});
