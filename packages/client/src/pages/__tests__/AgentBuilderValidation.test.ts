import { describe, expect, it } from "vitest";
import {
	isInstructionsSubmitBlocked,
	MIN_INSTRUCTIONS_LENGTH,
	validateBuilder,
} from "../agentBuilderValidation";

describe("AgentBuilder validation", () => {
	describe("name field", () => {
		it("shows no error before interaction", () => {
			const errors = validateBuilder({
				nameTouched: false,
				name: "",
				instructionsTouched: false,
				instructions: "",
				description: "",
			});
			expect(errors.name).toBeNull();
		});

		it("shows required error when touched and empty", () => {
			const errors = validateBuilder({
				nameTouched: true,
				name: "",
				instructionsTouched: false,
				instructions: "",
				description: "",
			});
			expect(errors.name).toBe("required");
		});

		it("shows no error when touched and filled", () => {
			const errors = validateBuilder({
				nameTouched: true,
				name: "My Agent",
				instructionsTouched: false,
				instructions: "",
				description: "",
			});
			expect(errors.name).toBeNull();
		});
	});

	describe("instructions field", () => {
		it("shows no error before interaction", () => {
			const errors = validateBuilder({
				nameTouched: false,
				name: "",
				instructionsTouched: false,
				instructions: "",
				description: "",
			});
			expect(errors.instructions).toBeNull();
		});

		it("shows required error when touched, empty, and description is also empty", () => {
			const errors = validateBuilder({
				nameTouched: false,
				name: "",
				instructionsTouched: true,
				instructions: "",
				description: "",
			});
			expect(errors.instructions).toBe("required");
		});

		it("shows no error when touched and empty but description has content", () => {
			const errors = validateBuilder({
				nameTouched: false,
				name: "",
				instructionsTouched: true,
				instructions: "",
				description: "Some description",
			});
			expect(errors.instructions).toBeNull();
		});

		it("shows no error when touched and has sufficiently long content", () => {
			const errors = validateBuilder({
				nameTouched: false,
				name: "",
				instructionsTouched: true,
				instructions: "## Role\nYou are a helpful agent assisting IT users.",
				description: "",
			});
			expect(errors.instructions).toBeNull();
		});

		it("shows tooShort error when touched with a single generic word like 'agent'", () => {
			const errors = validateBuilder({
				nameTouched: false,
				name: "",
				instructionsTouched: true,
				instructions: "agent",
				description: "",
			});
			expect(errors.instructions).toBe("tooShort");
		});

		it("shows tooShort error for short phrases below the minimum", () => {
			const errors = validateBuilder({
				nameTouched: false,
				name: "",
				instructionsTouched: true,
				instructions: "hi there",
				description: "",
			});
			expect(errors.instructions).toBe("tooShort");
		});

		it("shows tooShort error even when description is filled (user typed bad data)", () => {
			const errors = validateBuilder({
				nameTouched: false,
				name: "",
				instructionsTouched: true,
				instructions: "agent",
				description: "A helpful description that is long enough.",
			});
			expect(errors.instructions).toBe("tooShort");
		});

		it("treats whitespace-only instructions as empty, not tooShort", () => {
			const errors = validateBuilder({
				nameTouched: false,
				name: "",
				instructionsTouched: true,
				instructions: "                    ",
				description: "",
			});
			expect(errors.instructions).toBe("required");
		});

		it("accepts instructions at exactly the minimum length", () => {
			const exactlyMin = "a".repeat(MIN_INSTRUCTIONS_LENGTH);
			const errors = validateBuilder({
				nameTouched: false,
				name: "",
				instructionsTouched: true,
				instructions: exactlyMin,
				description: "",
			});
			expect(errors.instructions).toBeNull();
		});

		it("rejects instructions one character below the minimum", () => {
			const oneBelow = "a".repeat(MIN_INSTRUCTIONS_LENGTH - 1);
			const errors = validateBuilder({
				nameTouched: false,
				name: "",
				instructionsTouched: true,
				instructions: oneBelow,
				description: "",
			});
			expect(errors.instructions).toBe("tooShort");
		});

		it("exposes MIN_INSTRUCTIONS_LENGTH as 20", () => {
			expect(MIN_INSTRUCTIONS_LENGTH).toBe(20);
		});
	});
});

describe("isInstructionsSubmitBlocked", () => {
	it("blocks when both instructions and description are empty", () => {
		expect(isInstructionsSubmitBlocked("", "")).toBe(true);
	});

	it("does not block when instructions are empty but description has content", () => {
		expect(
			isInstructionsSubmitBlocked("", "A description with enough guidance."),
		).toBe(false);
	});

	it("blocks when instructions are below the minimum length", () => {
		expect(
			isInstructionsSubmitBlocked("a".repeat(MIN_INSTRUCTIONS_LENGTH - 1), ""),
		).toBe(true);
	});

	it("blocks below-min instructions even when description is filled", () => {
		expect(
			isInstructionsSubmitBlocked("short", "A long enough description."),
		).toBe(true);
	});

	it("does not block at exactly the minimum length", () => {
		expect(
			isInstructionsSubmitBlocked("a".repeat(MIN_INSTRUCTIONS_LENGTH), ""),
		).toBe(false);
	});

	it("treats whitespace-only instructions as empty", () => {
		expect(isInstructionsSubmitBlocked("                    ", "")).toBe(true);
	});
});
