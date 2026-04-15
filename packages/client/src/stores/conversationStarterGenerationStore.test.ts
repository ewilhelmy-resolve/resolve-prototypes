import { beforeEach, describe, expect, it } from "vitest";
import { useConversationStarterGenerationStore } from "./conversationStarterGenerationStore";

describe("conversationStarterGenerationStore", () => {
	beforeEach(() => {
		useConversationStarterGenerationStore.getState().reset();
	});

	it("starts in idle state", () => {
		const state = useConversationStarterGenerationStore.getState();
		expect(state.status).toBe("idle");
		expect(state.generationId).toBeNull();
		expect(state.progressSteps).toEqual([]);
		expect(state.generatedStarters).toBeNull();
		expect(state.error).toBeNull();
	});

	it("transitions to generating on startGeneration", () => {
		const store = useConversationStarterGenerationStore.getState();
		store.startGeneration();

		const state = useConversationStarterGenerationStore.getState();
		expect(state.status).toBe("generating");
		expect(state.generationId).toBeNull();
		expect(state.generatedStarters).toBeNull();
	});

	it("sets generation ID", () => {
		const store = useConversationStarterGenerationStore.getState();
		store.startGeneration();
		store.setGenerationId("test-id-123");

		expect(useConversationStarterGenerationStore.getState().generationId).toBe(
			"test-id-123",
		);
	});

	it("appends progress steps", () => {
		const store = useConversationStarterGenerationStore.getState();
		store.startGeneration();
		store.receiveProgress({
			stepType: "agent_start",
			stepLabel: "Processing",
			stepDetail: "Generating starters...",
			timestamp: "2026-04-14T00:00:00Z",
		});
		store.receiveProgress({
			stepType: "task_end",
			stepLabel: "Done",
			stepDetail: "Generation complete",
			timestamp: "2026-04-14T00:00:01Z",
		});

		const state = useConversationStarterGenerationStore.getState();
		expect(state.progressSteps).toHaveLength(2);
		expect(state.progressSteps[0].stepDetail).toBe("Generating starters...");
	});

	it("transitions to success on receiveResult", () => {
		const store = useConversationStarterGenerationStore.getState();
		store.startGeneration();
		store.receiveResult({
			starters: ["Hello!", "How can you help?", "What do you do?"],
		});

		const state = useConversationStarterGenerationStore.getState();
		expect(state.status).toBe("success");
		expect(state.generatedStarters).toEqual([
			"Hello!",
			"How can you help?",
			"What do you do?",
		]);
	});

	it("transitions to error on receiveError", () => {
		const store = useConversationStarterGenerationStore.getState();
		store.startGeneration();
		store.receiveError("Something went wrong");

		const state = useConversationStarterGenerationStore.getState();
		expect(state.status).toBe("error");
		expect(state.error).toBe("Something went wrong");
	});

	it("transitions to error on timeout", () => {
		const store = useConversationStarterGenerationStore.getState();
		store.startGeneration();
		store.timeout();

		const state = useConversationStarterGenerationStore.getState();
		expect(state.status).toBe("error");
		expect(state.error).toContain("timed out");
	});

	it("resets to idle state", () => {
		const store = useConversationStarterGenerationStore.getState();
		store.startGeneration();
		store.setGenerationId("test-id");
		store.receiveResult({ starters: ["Hello"] });
		store.reset();

		const state = useConversationStarterGenerationStore.getState();
		expect(state.status).toBe("idle");
		expect(state.generationId).toBeNull();
		expect(state.generatedStarters).toBeNull();
		expect(state.progressSteps).toEqual([]);
		expect(state.error).toBeNull();
	});

	it("clears previous state when starting new generation", () => {
		const store = useConversationStarterGenerationStore.getState();
		store.startGeneration();
		store.receiveResult({ starters: ["Old starter"] });

		// Start a new generation
		store.startGeneration();

		const state = useConversationStarterGenerationStore.getState();
		expect(state.status).toBe("generating");
		expect(state.generatedStarters).toBeNull();
		expect(state.error).toBeNull();
		expect(state.progressSteps).toEqual([]);
	});
});
