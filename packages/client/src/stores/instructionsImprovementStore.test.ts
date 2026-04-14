import { beforeEach, describe, expect, it } from "vitest";
import { useInstructionsImprovementStore } from "./instructionsImprovementStore";

describe("instructionsImprovementStore", () => {
	beforeEach(() => {
		useInstructionsImprovementStore.getState().reset();
	});

	it("starts in idle state", () => {
		const state = useInstructionsImprovementStore.getState();
		expect(state.status).toBe("idle");
		expect(state.improvementId).toBeNull();
		expect(state.progressSteps).toEqual([]);
	});

	it("transitions to improving on startImprovement", () => {
		const store = useInstructionsImprovementStore.getState();
		store.startImprovement("original instructions");

		const state = useInstructionsImprovementStore.getState();
		expect(state.status).toBe("improving");
		expect(state.originalInstructions).toBe("original instructions");
		expect(state.improvedInstructions).toBeNull();
	});

	it("sets improvement ID", () => {
		const store = useInstructionsImprovementStore.getState();
		store.startImprovement("inst");
		store.setImprovementId("test-id-123");

		expect(useInstructionsImprovementStore.getState().improvementId).toBe(
			"test-id-123",
		);
	});

	it("appends progress steps", () => {
		const store = useInstructionsImprovementStore.getState();
		store.startImprovement("inst");
		store.receiveProgress({
			stepType: "agent_start",
			stepLabel: "Processing",
			stepDetail: "Analyzing instructions...",
			timestamp: "2026-04-14T00:00:00Z",
		});
		store.receiveProgress({
			stepType: "task_end",
			stepLabel: "Done",
			stepDetail: "Analysis complete",
			timestamp: "2026-04-14T00:00:01Z",
		});

		const state = useInstructionsImprovementStore.getState();
		expect(state.progressSteps).toHaveLength(2);
		expect(state.progressSteps[0].stepDetail).toBe("Analyzing instructions...");
	});

	it("transitions to success on receiveResult", () => {
		const store = useInstructionsImprovementStore.getState();
		store.startImprovement("old inst");
		store.receiveResult({
			instructions: "improved instructions",
		});

		const state = useInstructionsImprovementStore.getState();
		expect(state.status).toBe("success");
		expect(state.improvedInstructions).toBe("improved instructions");
	});

	it("transitions to error on receiveError", () => {
		const store = useInstructionsImprovementStore.getState();
		store.startImprovement("inst");
		store.receiveError("Something went wrong");

		const state = useInstructionsImprovementStore.getState();
		expect(state.status).toBe("error");
		expect(state.error).toBe("Something went wrong");
	});

	it("transitions to error on timeout", () => {
		const store = useInstructionsImprovementStore.getState();
		store.startImprovement("inst");
		store.timeout();

		const state = useInstructionsImprovementStore.getState();
		expect(state.status).toBe("error");
		expect(state.error).toContain("timed out");
	});

	it("resets to idle state", () => {
		const store = useInstructionsImprovementStore.getState();
		store.startImprovement("inst");
		store.setImprovementId("test-id");
		store.receiveResult({
			instructions: "new",
		});
		store.reset();

		const state = useInstructionsImprovementStore.getState();
		expect(state.status).toBe("idle");
		expect(state.improvementId).toBeNull();
		expect(state.originalInstructions).toBeNull();
		expect(state.improvedInstructions).toBeNull();
		expect(state.progressSteps).toEqual([]);
	});
});
